package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"

	"isp-platform/registration/infrastructure/database"
	infraredis "isp-platform/registration/infrastructure/redis"
	"isp-platform/registration/internal/config"
	"isp-platform/registration/internal/email"
	"isp-platform/registration/internal/middleware"
	"isp-platform/registration/internal/response"
	"isp-platform/registration/pkg/logger"

	authHandler "isp-platform/registration/services/auth/handler"
	authRepo "isp-platform/registration/services/auth/repository"
	authService "isp-platform/registration/services/auth/service"

	regHandler "isp-platform/registration/services/registration/handler"
	regRepo "isp-platform/registration/services/registration/repository"
	regService "isp-platform/registration/services/registration/service"

	provRepo "isp-platform/registration/services/provisioning/repository"
	provService "isp-platform/registration/services/provisioning/service"
	provWorker "isp-platform/registration/services/provisioning/worker"

	notifService "isp-platform/registration/services/notification/service"

	oltHandlerPkg "isp-platform/registration/pkg/olt/handler"

	"isp-platform/registration/internal/ws"

	"go.uber.org/zap"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: .env file not found, using environment variables")
	}

	// Load & validate config
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Fatal: config error: %v\n", err)
		os.Exit(1)
	}

	// Init logger
	log := logger.New(cfg.AppEnv)
	defer log.Sync() //nolint:errcheck

	log.Info("starting ISP Registration Service",
		zap.String("env", cfg.AppEnv),
		zap.Int("port", cfg.AppPort),
	)

	// Init DB
	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Run DB migrations automatically
	if err := runMigrations(cfg, log); err != nil {
		log.Fatal("failed to run migrations", zap.Error(err))
	}

	// Auto-seed active customers if database currently has none
	seedActiveCustomersIfEmpty(db.DB, log)

	// Init Redis
	rdb, err := infraredis.NewRedis(cfg)
	if err != nil {
		log.Fatal("failed to connect to redis", zap.Error(err))
	}
	defer rdb.Close()

	// --- Wire dependencies ---

	// Auth
	aRepo := authRepo.NewPostgresUserRepository(db)
	mailer := email.New(db, cfg)
	aSvc := authService.NewAuthService(aRepo, cfg, log, mailer)
	aHandler := authHandler.NewHandler(aSvc, log)

	// Real-time WebSocket Hub
	wsHub := ws.NewHub(cfg.JWTSecret, log)

	// Notification
	nSvc := notifService.NewNotificationService(db, cfg, log)

	// Provisioning
	pRepo := provRepo.NewPostgresProvisioningRepository(db)
	pSvc := provService.NewProvisioningService(pRepo, cfg, log)
	pWorker := provWorker.NewWorker(pSvc, pRepo, nSvc, cfg, log, wsHub)

	// Registration
	rRepo := regRepo.NewPostgresRegistrationRepository(db)
	rSvc := regService.NewRegistrationService(rRepo, pSvc, nSvc, cfg, log, wsHub)
	publicHandler := regHandler.NewPublicHandler(rSvc, log)
	csHandler := regHandler.NewCSAdminHandler(rSvc, aRepo, log)
	techHandler := regHandler.NewTechnicianHandler(rSvc, pWorker, log)
	ownerHandler := regHandler.NewOwnerHandler(rSvc, aRepo, log)
	oltHandler := oltHandlerPkg.NewOltHandler(rdb)

	// --- Start background worker ---
	workerCtx, cancelWorker := context.WithCancel(context.Background())
	go pWorker.Start(workerCtx)

	app := fiber.New(fiber.Config{
		AppName:      "ISP Registration API v1",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			errCode := "INTERNAL_ERROR"
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
				if code == fiber.StatusNotFound {
					errCode = "NOT_FOUND"
				}
			}
			return response.ErrorRaw(c, code, errCode, err.Error(), nil)
		},
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: false,
	}))
	app.Use(middleware.RequestID())

	// Serve static files from uploads folder
	app.Static("/uploads", "./uploads")

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "isp-registration"})
	})

	// --- Routes ---
	v1 := app.Group("/api/v1")

	// Public routes (no auth)
	v1.Get("/ws/dashboard", wsHub.Upgrade)
	v1.Post("/registrations", middleware.RateLimit(5, time.Hour, rdb), publicHandler.Submit)
	v1.Get("/registrations/status", publicHandler.CheckStatus)
	v1.Get("/registrations/public/:id", publicHandler.GetPublicRegistration)
	v1.Get("/packages", publicHandler.ListPackages)
	v1.Get("/public-configs", publicHandler.GetPublicConfigs)

	// Auth routes
	authGroup := v1.Group("/auth")
	authGroup.Post("/login", aHandler.Login)
	authGroup.Post("/refresh", aHandler.Refresh)
	authGroup.Post("/logout", middleware.Auth(cfg, db), aHandler.Logout)
	authGroup.Post("/forgot-password", aHandler.ForgotPassword)
	authGroup.Post("/reset-password", aHandler.ResetPassword)

	// Protected routes
	api := v1.Group("", middleware.Auth(cfg, db))

	// ── Self-service profile (all authenticated roles) ──────────────────────
	api.Get("/profile", aHandler.GetProfile)
	api.Put("/profile", aHandler.UpdateProfile)
	api.Put("/profile/password", aHandler.ChangePassword)

	// CS Admin, Owner, & Technician
	admin := api.Group("/admin", middleware.Role("cs_admin", "owner", "technician"))
	admin.Get("/registrations", csHandler.List)
	admin.Post("/registrations", publicHandler.Submit)
	admin.Get("/registrations/next-customer-number", csHandler.GetNextCustomerNumber)
	admin.Get("/registrations/:id", csHandler.Detail)
	admin.Patch("/registrations/:id/approve", csHandler.Approve)
	admin.Patch("/registrations/:id/reject", csHandler.Reject)
	admin.Patch("/registrations/:id/confirm-payment", csHandler.ConfirmPayment)
	admin.Patch("/registrations/:id/schedule-installation", csHandler.ScheduleInstallation)
	admin.Patch("/registrations/:id/internal-notes", csHandler.UpdateInternalNotes)
	admin.Post("/registrations/:id/resend-notif", csHandler.ResendNotification)
	admin.Post("/registrations/:id/provision-mikrotik", csHandler.ProvisionMikrotik)
	admin.Patch("/registrations/:id/activate", middleware.Role("owner"), csHandler.Activate)
	admin.Put("/registrations/:id", middleware.Role("owner"), csHandler.UpdateRegistration)
	admin.Delete("/registrations/:id", middleware.Role("owner"), csHandler.DeleteRegistration)
	admin.Get("/technicians", csHandler.ListTechnicians)
	admin.Get("/activity-logs", csHandler.ActivityLogs)
	admin.Get("/provisioning-logs/:registration_id", csHandler.ProvisioningLogs)

	// ODP Management (CS Admin, Owner, Technician)
	admin.Get("/odps", csHandler.ListODPs)
	admin.Post("/odps", csHandler.CreateODP)
	admin.Put("/odps/:id", csHandler.UpdateODP)
	admin.Delete("/odps/:id", csHandler.DeleteODP)

	// Additional ODP aliases
	admin.Get("/odps/", csHandler.ListODPs)
	admin.Post("/odps/", csHandler.CreateODP)

	// Technician
	tech := api.Group("/technician", middleware.Role("technician"))
	tech.Get("/schedule", techHandler.Schedule)
	tech.Patch("/registrations/:id/claim", techHandler.Claim)
	tech.Patch("/registrations/:id/survey-result", techHandler.SurveyResult)
	tech.Patch("/registrations/:id/activate", techHandler.Activate)

	// Retry provisioning (technician, owner)
	api.Patch("/registrations/:id/retry-provisioning",
		middleware.Role("technician", "owner"),
		techHandler.RetryProvisioning,
	)

	// Owner
	ownerGroup := api.Group("/owner", middleware.Role("owner"))
	ownerGroup.Get("/dashboard", ownerHandler.Dashboard)
	ownerGroup.Get("/registrations", ownerHandler.List)
	ownerGroup.Get("/activity-logs", ownerHandler.ActivityLogs)
	ownerGroup.Get("/export/registrations", ownerHandler.Export)
	ownerGroup.Post("/upload-logo", ownerHandler.UploadLogo)

	// Mikrotik Configs
	ownerGroup.Get("/mikrotik-configs", ownerHandler.ListMikrotikConfigs)
	ownerGroup.Get("/mikrotik-configs/:id", ownerHandler.GetMikrotikConfig)
	ownerGroup.Post("/mikrotik-configs", ownerHandler.CreateMikrotikConfig)
	ownerGroup.Put("/mikrotik-configs/:id", ownerHandler.UpdateMikrotikConfig)
	ownerGroup.Delete("/mikrotik-configs/:id", ownerHandler.DeleteMikrotikConfig)
	ownerGroup.Patch("/mikrotik-configs/:id/toggle", ownerHandler.ToggleMikrotikConfig)
	ownerGroup.Post("/mikrotik-configs/:id/test", ownerHandler.TestMikrotikConnection)

	// Live Mikrotik Operations
	ownerGroup.Get("/mikrotik-configs/:id/resources", ownerHandler.GetMikrotikResources)
	ownerGroup.Get("/mikrotik-configs/:id/active-connections", ownerHandler.GetMikrotikActiveConnections)
	ownerGroup.Get("/mikrotik-configs/:id/secrets", ownerHandler.GetMikrotikPPPSecrets)
	ownerGroup.Get("/mikrotik-configs/:id/traffic", ownerHandler.GetMikrotikTraffic)
	ownerGroup.Get("/mikrotik-configs/:id/logs", ownerHandler.GetMikrotikLogs)
	ownerGroup.Post("/mikrotik-configs/:id/active-connections/disconnect", ownerHandler.DisconnectMikrotikActiveConnection)
	ownerGroup.Post("/mikrotik-configs/:id/secrets/toggle", ownerHandler.ToggleMikrotikSecret)
	ownerGroup.Post("/mikrotik-configs/:id/secrets", ownerHandler.AddMikrotikSecret)

	// Packages CRUD
	packages := api.Group("/packages", middleware.Role("owner"))
	packages.Get("/all", publicHandler.ListAllPackages)
	packages.Post("/", ownerHandler.CreatePackage)
	packages.Put("/:id", ownerHandler.UpdatePackage)
	packages.Patch("/:id/toggle", ownerHandler.TogglePackage)

	// OLT Ports
	oltPorts := api.Group("/olt-ports")
	oltPorts.Get("/", middleware.Role("owner", "cs_admin", "technician"), ownerHandler.ListOLTPorts)
	oltPorts.Post("/", middleware.Role("owner"), ownerHandler.CreateOLTPort)
	oltPorts.Put("/:id", middleware.Role("owner"), ownerHandler.UpdateOLTPort)
	oltPorts.Delete("/:id", middleware.Role("owner"), ownerHandler.DeleteOLTPort)

	// OLT Real-Time Telemetry & Driver Scraping
	oltLive := api.Group("/olt")
	oltLive.Post("/ports", middleware.Role("owner", "cs_admin", "technician"), oltHandler.FetchPorts)
	oltLive.Post("/onus", middleware.Role("owner", "cs_admin", "technician"), oltHandler.FetchONUs)
	oltLive.Post("/unconfigured", middleware.Role("owner", "cs_admin", "technician"), oltHandler.FetchUnconfiguredONUs)
	oltLive.Post("/attenuation", middleware.Role("owner", "cs_admin", "technician"), oltHandler.FetchPowerAttenuation)
	oltLive.Post("/test-connection", middleware.Role("owner", "cs_admin", "technician"), oltHandler.TestConnection)

	// App Config
	configs := api.Group("/configs", middleware.Role("owner"))
	configs.Get("/", ownerHandler.ListConfigs)
	configs.Put("/:key", ownerHandler.UpdateConfig)

	// Users
	users := api.Group("/users", middleware.Role("owner"))
	users.Get("/", ownerHandler.ListUsers)
	users.Post("/", ownerHandler.CreateUser)
	users.Put("/:id", ownerHandler.UpdateUser)
	users.Patch("/:id/toggle", ownerHandler.ToggleUser)
	users.Put("/:id/password", ownerHandler.ResetPassword)

	// --- Graceful shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		addr := fmt.Sprintf(":%d", cfg.AppPort)
		log.Info("server listening", zap.String("addr", addr))
		if err := app.Listen(addr); err != nil {
			log.Error("server error", zap.Error(err))
		}
	}()

	<-quit
	log.Info("shutting down...")
	cancelWorker()

	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Error("shutdown error", zap.Error(err))
	}
	log.Info("server stopped")
}

// runMigrations applies all pending UP migrations from the ./migrations directory.
func runMigrations(cfg *config.Config, log *zap.Logger) error {
	dsn := fmt.Sprintf(
		"postgresql://%s:%s@%s:%d/%s?sslmode=disable",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)

	m, err := migrate.New("file://migrations", dsn)
	if err != nil {
		return fmt.Errorf("runMigrations: init: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("runMigrations: up: %w", err)
	}

	if err == migrate.ErrNoChange {
		log.Info("migrations: no changes")
	} else {
		log.Info("migrations: applied successfully")
	}
	return nil
}

func seedActiveCustomersIfEmpty(db *sql.DB, log *zap.Logger) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM registrations WHERE status = 'active' AND deleted_at IS NULL").Scan(&count)
	if err != nil {
		log.Warn("seedActiveCustomersIfEmpty: failed to count active registrations", zap.Error(err))
		return
	}
	if count > 0 {
		log.Info("active customers already populated in DB", zap.Int("count", count))
		return
	}

	seedSQL := `
	INSERT INTO registrations (
		reg_number, customer_number, full_name, nik, phone, email,
		province, city, district, village, rt, rw, address_detail,
		package_id, status, pppoe_username, pppoe_password,
		maps_lat, maps_lng, google_maps_link, activated_at, created_at, updated_at
	)
	SELECT
		v.reg_number, REPLACE(v.reg_number, 'REG-', 'CUST-'), v.full_name, v.nik, v.phone, v.email,
		v.province, v.city, v.district, v.village, v.rt, v.rw, v.address_detail,
		p.id, 'active', v.pppoe_username, 'secret123',
		v.maps_lat::numeric, v.maps_lng::numeric, v.google_maps_link, NOW() - (v.days_offset || ' days')::INTERVAL, NOW() - (v.days_offset || ' days')::INTERVAL, NOW()
	FROM (
		VALUES
		('REG-20260713-0001', 'Budi Santoso', '3171011503850001', '081234567890', 'budi.santoso@email.com', 'Aceh', 'Bireuen', 'Kota Juang', 'Bireuen Meunasah Capa', '01', '02', 'Jl. T. Umar No. 12', 'budi_santoso', '5.2014', '96.7011', 'https://maps.google.com/?q=5.2014,96.7011', 30),
		('REG-20260713-0002', 'Siti Aminah', '3171015011900002', '082198765432', 'siti.aminah@email.com', 'Aceh', 'Bireuen', 'Peusangan', 'Matang Glumpang Dua', '03', '01', 'Jl. Medan-Banda Aceh Km 220', 'siti_aminah', '5.1850', '96.7820', 'https://maps.google.com/?q=5.1850,96.7820', 25),
		('REG-20260713-0003', 'Ahmad Dahlan', '3171011208880003', '085211223344', 'ahmad.dahlan@email.com', 'Aceh', 'Bireuen', 'Juli', 'Juli Meunasah Seutuy', '02', '04', 'Jl. Bireuen-Takengon Km 5', 'ahmad_dahlan', '5.1620', '96.6940', 'https://maps.google.com/?q=5.1620,96.6940', 20),
		('REG-20260713-0004', 'Dewi Lestari', '3171016504920004', '081399887766', 'dewi.lestari@email.com', 'Aceh', 'Bireuen', 'Kota Juang', 'Geudong Geudong', '04', '03', 'Jl. Elang No. 8', 'dewi_lestari', '5.2080', '96.7090', 'https://maps.google.com/?q=5.2080,96.7090', 18),
		('REG-20260713-0005', 'Rudi Hermawan', '3171012010860005', '087855443322', 'rudi.h@email.com', 'Aceh', 'Bireuen', 'Kuala', 'Kuala Raja', '01', '01', 'Jl. Pelabuhan Kuala Raja No. 15', 'rudi_hermawan', '5.2310', '96.7300', 'https://maps.google.com/?q=5.2310,96.7300', 15),
		('REG-20260713-0006', 'Eka Putri', '3171014809940006', '089677889900', 'eka.putri@email.com', 'Aceh', 'Bireuen', 'Peusangan', 'Paya Cut', '02', '02', 'Jl. Teupin Mane No. 3', 'eka_putri', '5.1790', '96.7710', 'https://maps.google.com/?q=5.1790,96.7710', 12),
		('REG-20260713-0007', 'Hendra Wijaya', '3171010506820007', '081122334455', 'hendra.w@email.com', 'Aceh', 'Bireuen', 'Kota Juang', 'Pulo Kiton', '03', '05', 'Jl. Mayjen T. Hamzah Bendahara No. 45', 'hendra_wijaya', '5.2030', '96.7050', 'https://maps.google.com/?q=5.2030,96.7050', 10),
		('REG-20260713-0008', 'Maya Sari', '3171015512960008', '082233445566', 'maya.sari@email.com', 'Aceh', 'Bireuen', 'Samalanga', 'Keude Samalanga', '01', '01', 'Jl. Masjid Jamik Samalanga No. 2', 'maya_sari', '5.2380', '96.3720', 'https://maps.google.com/?q=5.2380,96.3720', 8),
		('REG-20260713-0009', 'Fajar Nugraha', '3171011803910009', '083344556677', 'fajar.n@email.com', 'Aceh', 'Bireuen', 'Jeunieb', 'Keude Jeunieb', '02', '03', 'Jl. Pasar Jeunieb No. 10', 'fajar_nugraha', '5.2300', '96.4890', 'https://maps.google.com/?q=5.2300,96.4890', 6),
		('REG-20260713-0010', 'Rina Marlina', '3171016207930010', '085566778899', 'rina.m@email.com', 'Aceh', 'Bireuen', 'Gandapura', 'Geurugok', '05', '02', 'Jl. Stasiun Geurugok No. 7', 'rina_marlina', '5.1910', '96.8450', 'https://maps.google.com/?q=5.1910,96.8450', 4)
	) AS v(reg_number, full_name, nik, phone, email, province, city, district, village, rt, rw, address_detail, pppoe_username, maps_lat, maps_lng, google_maps_link, days_offset)
	CROSS JOIN (SELECT id FROM packages WHERE is_active = true ORDER BY price_monthly DESC LIMIT 1) p
	ON CONFLICT (reg_number) DO UPDATE SET status = 'active', activated_at = NOW();
	`

	_, err = db.Exec(seedSQL)
	if err != nil {
		log.Error("seedActiveCustomersIfEmpty: failed to insert seed records", zap.Error(err))
	} else {
		log.Info("seedActiveCustomersIfEmpty: successfully seeded active customer records into database")
	}
}

