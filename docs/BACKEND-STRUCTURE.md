# Backend Structure — Go (Fiber)

---

## Struktur Folder Lengkap

```
backend/
├── cmd/
│   └── server/
│       └── main.go                  ← Entry point, bootstrap app
│
├── internal/                        ← Kode yang TIDAK boleh diimport dari luar module
│   ├── config/
│   │   └── config.go                ← Load & validasi semua env variable
│   ├── middleware/
│   │   ├── auth.go                  ← JWT verify, inject user ke context
│   │   ├── role.go                  ← Role-based access control
│   │   ├── ratelimit.go             ← Rate limiter untuk endpoint publik
│   │   └── requestid.go             ← Inject X-Request-ID ke setiap request
│   ├── response/
│   │   └── response.go              ← Helper fungsi Success(), Error(), Paginated()
│   └── utils/
│       ├── pagination.go            ← Parse query param page & per_page
│       └── regnum.go                ← Generate nomor registrasi REG-YYYYMMDD-XXXX
│
├── pkg/                             ← Kode reusable yang BOLEH diimport dari luar
│   ├── logger/
│   │   └── logger.go                ← Inisialisasi zap logger
│   ├── crypto/
│   │   └── crypto.go                ← AES encrypt/decrypt untuk pppoe_password
│   └── validator/
│       └── validator.go             ← Custom validator rules
│
├── infrastructure/                  ← Koneksi ke sistem eksternal
│   ├── database/
│   │   └── postgres.go              ← Init koneksi PostgreSQL + sqlx
│   ├── redis/
│   │   └── redis.go                 ← Init koneksi Redis
│   ├── mikrotik/
│   │   ├── client.go                ← HTTP client ke RouterOS REST API
│   │   └── pppoe.go                 ← CreateSecret(), DeleteSecret(), GetSecret()
│   └── olt/
│       ├── client.go                ← SSH client ke OLT ZTE
│       └── ont.go                   ← RegisterONT(), RemoveONT(), GetONTStatus()
│
├── services/                        ← Satu folder per domain/service
│   │
│   ├── auth/
│   │   ├── model/
│   │   │   └── user.go              ← Struct User, Role constants
│   │   ├── repository/
│   │   │   ├── interface.go         ← Interface UserRepository
│   │   │   └── postgres.go          ← Implementasi query DB
│   │   ├── service/
│   │   │   ├── interface.go         ← Interface AuthService
│   │   │   └── auth.go              ← Login, RefreshToken, ValidateToken
│   │   └── handler/
│   │       └── handler.go           ← HTTP handler: POST /auth/login, /auth/refresh
│   │
│   ├── registration/
│   │   ├── model/
│   │   │   └── registration.go      ← Struct Registration, semua konstanta status
│   │   ├── dto/
│   │   │   ├── request.go           ← DTO: CreateRegistrationRequest, ApproveRequest, dll
│   │   │   └── response.go          ← DTO: RegistrationResponse, RegistrationListResponse
│   │   ├── repository/
│   │   │   ├── interface.go         ← Interface RegistrationRepository
│   │   │   └── postgres.go          ← Semua query: Create, GetByID, List, UpdateStatus
│   │   ├── service/
│   │   │   ├── interface.go         ← Interface RegistrationService
│   │   │   └── registration.go      ← Business logic, validasi transisi status
│   │   └── handler/
│   │       ├── public.go            ← Handler publik (tanpa auth): submit form, cek status
│   │       ├── cs_admin.go          ← Handler CS admin
│   │       ├── technician.go        ← Handler teknisi
│   │       └── owner.go             ← Handler owner
│   │
│   ├── provisioning/
│   │   ├── model/
│   │   │   └── provisioning.go      ← Struct ProvisioningJob, ProvisioningLog
│   │   ├── repository/
│   │   │   ├── interface.go
│   │   │   └── postgres.go          ← Insert log, update status
│   │   ├── service/
│   │   │   ├── interface.go
│   │   │   └── provisioning.go      ← Orchestrate Mikrotik + OLT secara paralel
│   │   ├── worker/
│   │   │   └── worker.go            ← Background worker: consume job, retry logic
│   │   └── handler/
│   │       └── handler.go           ← Handler: trigger, retry, lihat log
│   │
│   └── notification/
│       ├── service/
│       │   ├── interface.go
│       │   └── notification.go      ← Send via webhook, simpan log
│       └── template/
│           └── templates.go         ← Semua template pesan notifikasi
│
├── migrations/
│   ├── 001_create_users.up.sql
│   ├── 001_create_users.down.sql
│   ├── 002_create_packages.up.sql
│   └── ...                          ← Semua file migration berurutan
│
├── .env.example
├── .env                             ← TIDAK di-commit ke git
├── .gitignore
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

---

## Pola Kode Wajib

### 1. Dependency Injection — SELALU inject via constructor

```go
// ✅ BENAR
type RegistrationService struct {
    repo         RegistrationRepository
    provSvc      ProvisioningService
    notifSvc     NotificationService
    logger       *zap.Logger
}

func NewRegistrationService(
    repo RegistrationRepository,
    provSvc ProvisioningService,
    notifSvc NotificationService,
    logger *zap.Logger,
) *RegistrationService {
    return &RegistrationService{repo: repo, provSvc: provSvc, notifSvc: notifSvc, logger: logger}
}

// ❌ SALAH — jangan buat instance langsung di dalam struct lain
type RegistrationService struct {
    repo *PostgresRegistrationRepo  // jangan hardcode implementasi
}
```

### 2. Repository Pattern — Handler → Service → Repository

```go
// Handler hanya terima request, validasi, panggil service
func (h *Handler) ApproveRegistration(c *fiber.Ctx) error {
    id := c.Params("id")
    userID := c.Locals("user_id").(string)

    if err := h.service.Approve(c.Context(), id, userID); err != nil {
        return response.Error(c, err)
    }
    return response.Success(c, nil, "Pendaftaran disetujui")
}

// Service berisi business logic
func (s *RegistrationService) Approve(ctx context.Context, id, approvedBy string) error {
    reg, err := s.repo.GetByID(ctx, id)
    if err != nil { return err }

    if reg.Status != model.StatusPendingReview {
        return ErrInvalidStatusTransition
    }
    // ... business logic lainnya
    return s.repo.UpdateStatus(ctx, id, model.StatusSurveyScheduled, approvedBy, "")
}
```

### 3. Error Handling — Selalu wrap error

```go
// ✅ BENAR — beri konteks pada error
if err := db.QueryRowContext(ctx, query, id).Scan(&reg); err != nil {
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound
    }
    return nil, fmt.Errorf("registration.GetByID: %w", err)
}

// ❌ SALAH — return error tanpa konteks
if err != nil {
    return nil, err
}
```

### 4. Context — Wajib di semua operasi I/O

```go
// ✅ BENAR — semua fungsi DB dan HTTP wajib terima context
func (r *PostgresRepo) GetByID(ctx context.Context, id string) (*Registration, error) {
    var reg Registration
    err := r.db.GetContext(ctx, &reg, "SELECT * FROM registrations WHERE id=$1", id)
    return &reg, err
}

// ❌ SALAH — tanpa context
func (r *PostgresRepo) GetByID(id string) (*Registration, error) { ... }
```

### 5. Status Transition — Validasi di service layer

```go
// Peta transisi yang valid — hardcode di model/registration.go
var validTransitions = map[Status][]Status{
    StatusPendingReview:       {StatusSurveyScheduled, StatusRejected},
    StatusSurveyScheduled:     {StatusSurveyDone, StatusSurveyFailed},
    StatusSurveyDone:          {StatusWaitingPayment},
    StatusWaitingPayment:      {StatusPaymentConfirmed},
    StatusPaymentConfirmed:    {StatusInstallationScheduled},
    StatusInstallationScheduled: {StatusProvisioning},
    StatusProvisioning:        {StatusActive, StatusProvisioningFailed},
}

func (s Status) CanTransitionTo(next Status) bool {
    allowed, ok := validTransitions[s]
    if !ok { return false }
    for _, a := range allowed {
        if a == next { return true }
    }
    return false
}
```

### 6. Provisioning — Paralel dengan WaitGroup

```go
func (s *ProvisioningService) Run(ctx context.Context, job ProvisioningJob) error {
    var wg sync.WaitGroup
    errChan := make(chan error, 2)

    wg.Add(1)
    go func() {
        defer wg.Done()
        if err := s.mikrotik.CreatePPPoESecret(ctx, job); err != nil {
            errChan <- fmt.Errorf("mikrotik: %w", err)
        }
    }()

    wg.Add(1)
    go func() {
        defer wg.Done()
        if err := s.olt.RegisterONT(ctx, job); err != nil {
            errChan <- fmt.Errorf("olt: %w", err)
        }
    }()

    wg.Wait()
    close(errChan)

    var errs []string
    for err := range errChan {
        errs = append(errs, err.Error())
    }
    if len(errs) > 0 {
        return fmt.Errorf("provisioning failed: %s", strings.Join(errs, "; "))
    }
    return nil
}
```

---

## Routing Structure

```go
// cmd/server/main.go
app := fiber.New()

// Publik — tanpa auth
public := app.Group("/api/v1")
public.Post("/registrations", registrationHandler.Submit)
public.Get("/registrations/status", registrationHandler.CheckStatus)
public.Get("/packages", packageHandler.List)

// Auth
auth := app.Group("/api/v1/auth")
auth.Post("/login", authHandler.Login)
auth.Post("/refresh", authHandler.Refresh)

// Protected — semua butuh JWT
api := app.Group("/api/v1", middleware.Auth())

// CS Admin
cs := api.Group("/admin", middleware.Role("cs_admin", "owner"))
cs.Get("/registrations", registrationHandler.AdminList)
cs.Get("/registrations/:id", registrationHandler.AdminDetail)
cs.Patch("/registrations/:id/approve", registrationHandler.Approve)
cs.Patch("/registrations/:id/reject", registrationHandler.Reject)
cs.Patch("/registrations/:id/schedule-survey", registrationHandler.ScheduleSurvey)
cs.Patch("/registrations/:id/confirm-payment", registrationHandler.ConfirmPayment)
cs.Patch("/registrations/:id/schedule-installation", registrationHandler.ScheduleInstallation)

// Teknisi
tech := api.Group("/technician", middleware.Role("technician"))
tech.Get("/schedule", registrationHandler.TechnicianSchedule)
tech.Patch("/registrations/:id/survey-result", registrationHandler.UpdateSurveyResult)
tech.Patch("/registrations/:id/activate", provisioningHandler.Trigger)

// Owner
owner := api.Group("/owner", middleware.Role("owner"))
owner.Get("/dashboard", dashboardHandler.Summary)
owner.Get("/registrations", registrationHandler.OwnerList)

// WebSocket
app.Get("/ws", websocket.New(wsHandler.Handle))
```
