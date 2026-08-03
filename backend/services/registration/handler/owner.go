package handler

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"isp-platform/registration/internal/response"
	"isp-platform/registration/internal/utils"
	authModel "isp-platform/registration/services/auth/model"
	authRepo "isp-platform/registration/services/auth/repository"
	"isp-platform/registration/services/registration/model"
	"isp-platform/registration/services/registration/repository"
	"isp-platform/registration/services/registration/service"
)

// OwnerHandler handles owner-specific authenticated endpoints.
type OwnerHandler struct {
	svc      service.RegistrationService
	userRepo authRepo.UserRepository
	logger   *zap.Logger
}

// NewOwnerHandler constructs an OwnerHandler.
func NewOwnerHandler(svc service.RegistrationService, uRepo authRepo.UserRepository, log *zap.Logger) *OwnerHandler {
	return &OwnerHandler{svc: svc, userRepo: uRepo, logger: log}
}

// Dashboard handles GET /owner/dashboard
func (h *OwnerHandler) Dashboard(c *fiber.Ctx) error {
	period := c.Query("period", "this_month")

	counts, err := h.svc.Dashboard(c.Context(), period)
	if err != nil {
		return response.Error(c, err)
	}

	// Compute derived totals
	inProgress := 0
	for _, s := range []string{
		"survey_scheduled", "survey_done", "waiting_payment",
		"payment_confirmed", "installation_scheduled", "provisioning",
	} {
		inProgress += counts[s]
	}

	return response.Success(c, fiber.Map{
		"period": period,
		"summary": fiber.Map{
			"total_registrations":  sumMap(counts),
			"pending_review":       counts["pending_review"],
			"in_progress":          inProgress,
			"active":               counts["active"],
			"rejected":             counts["rejected"],
			"provisioning_failed":  counts["provisioning_failed"],
		},
	}, "")
}

// List handles GET /owner/registrations
func (h *OwnerHandler) List(c *fiber.Ctx) error {
	pagination := utils.ParsePagination(c)
	filter := repository.ListFilter{
		Status:          c.Query("status"),
		Search:          c.Query("search"),
		DateFrom:        c.Query("date_from"),
		DateTo:          c.Query("date_to"),
		PackageID:       c.Query("package_id"),
		OLTPortConfigID: c.Query("olt_port_config_id"),
		Pagination:      pagination,
	}

	regs, total, err := h.svc.AdminList(c.Context(), filter)
	if err != nil {
		return response.Error(c, err)
	}


	return response.Paginated(c, regs, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: utils.TotalPages(total, pagination.PerPage),
	})
}

// ActivityLogs handles GET /owner/activity-logs
func (h *OwnerHandler) ActivityLogs(c *fiber.Ctx) error {
	pagination := utils.ParsePagination(c)
	filter := repository.ListFilter{Pagination: pagination}

	logs, total, err := h.svc.ListActivityLogs(c.Context(), filter)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Paginated(c, logs, &response.Meta{
		Page:       pagination.Page,
		PerPage:    pagination.PerPage,
		Total:      total,
		TotalPages: utils.TotalPages(total, pagination.PerPage),
	})
}

// Export handles GET /owner/export/registrations — returns CSV
func (h *OwnerHandler) Export(c *fiber.Ctx) error {
	filter := repository.ListFilter{
		Status:          c.Query("status"),
		Search:          c.Query("search"),
		DateFrom:        c.Query("date_from"),
		DateTo:          c.Query("date_to"),
		PackageID:       c.Query("package_id"),
		OLTPortConfigID: c.Query("olt_port_config_id"),
		Pagination:      utils.PaginationParams{Page: 1, PerPage: 10000},
	}

	regs, _, err := h.svc.AdminList(c.Context(), filter)
	if err != nil {
		return response.Error(c, err)
	}

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=\"registrations.csv\"")

	var sb strings.Builder
	sb.WriteString("reg_number,customer_number,full_name,phone,status,package_id,city,district,village,maps_lat,maps_lng,odp_info,created_at\n")
	for _, reg := range regs {
		mapsLat := ""
		mapsLng := ""
		if reg.MapsLat != nil {
			mapsLat = fmt.Sprintf("%.7f", *reg.MapsLat)
		}
		if reg.MapsLng != nil {
			mapsLng = fmt.Sprintf("%.7f", *reg.MapsLng)
		}

		customerNumber := ""
		if reg.CustomerNumber != nil {
			customerNumber = *reg.CustomerNumber
		}

		odpInfo := ""
		if reg.ODPInfo != nil {
			odpInfo = *reg.ODPInfo
		}

		sb.WriteString(fmt.Sprintf("%q,%q,%q,%q,%q,%q,%q,%q,%q,%s,%s,%q,%q\n",
			reg.RegNumber,
			customerNumber,
			reg.FullName,
			reg.Phone,
			string(reg.Status),
			reg.PackageID,
			reg.City,
			reg.District,
			reg.Village,
			mapsLat,
			mapsLng,
			odpInfo,
			reg.CreatedAt.Format(time.RFC3339),
		))
	}

	return c.SendString(sb.String())
}

// --- Package CRUD ---

type createPackageRequest struct {
	Name                 string  `json:"Name"`
	Description          *string `json:"Description"`
	DeviceRecommendation *string `json:"DeviceRecommendation"`
	PriceMonthly         int64   `json:"PriceMonthly"`
	PriceInstallation    int64   `json:"PriceInstallation"`
	SpeedDownMbps        int     `json:"SpeedDownMbps"`
	SpeedUpMbps          int     `json:"SpeedUpMbps"`
	MikrotikProfile      string  `json:"MikrotikProfile"`
	OLTLineProfileID     int     `json:"OLTLineProfileID"`
	OLTSrvProfileID      int     `json:"OLTSrvProfileID"`
	VlanID               int     `json:"VlanID"`
	IsActive             *bool   `json:"IsActive"`
	SortOrder            int     `json:"SortOrder"`
	Terms                *string `json:"Terms"`
}

// CreatePackage handles POST /packages
func (h *OwnerHandler) CreatePackage(c *fiber.Ctx) error {
	var req createPackageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.MikrotikProfile == "" {
		return response.ValidationError(c, fiber.Map{"Name": "wajib diisi", "MikrotikProfile": "wajib diisi"})
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	pkg := &model.Package{
		Name:                 req.Name,
		Description:          req.Description,
		DeviceRecommendation: req.DeviceRecommendation,
		PriceMonthly:         req.PriceMonthly,
		PriceInstallation:    req.PriceInstallation,
		SpeedDownMbps:        req.SpeedDownMbps,
		SpeedUpMbps:          req.SpeedUpMbps,
		MikrotikProfile:      req.MikrotikProfile,
		OLTLineProfileID:     req.OLTLineProfileID,
		OLTSrvProfileID:      req.OLTSrvProfileID,
		VlanID:               req.VlanID,
		IsActive:             isActive,
		SortOrder:            req.SortOrder,
		Terms:                req.Terms,
	}

	created, err := h.svc.CreatePackage(c.Context(), pkg)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Created(c, fiber.Map{"id": created.ID, "name": created.Name}, "Paket berhasil dibuat")
}

// UpdatePackage handles PUT /packages/:id
func (h *OwnerHandler) UpdatePackage(c *fiber.Ctx) error {
	id := c.Params("id")
	var req createPackageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	pkg := &model.Package{
		ID:                   id,
		Name:                 req.Name,
		Description:          req.Description,
		DeviceRecommendation: req.DeviceRecommendation,
		PriceMonthly:         req.PriceMonthly,
		PriceInstallation:    req.PriceInstallation,
		SpeedDownMbps:        req.SpeedDownMbps,
		SpeedUpMbps:          req.SpeedUpMbps,
		MikrotikProfile:      req.MikrotikProfile,
		OLTLineProfileID:     req.OLTLineProfileID,
		OLTSrvProfileID:      req.OLTSrvProfileID,
		VlanID:               req.VlanID,
		IsActive:             isActive,
		SortOrder:            req.SortOrder,
		Terms:                req.Terms,
	}

	if err := h.svc.UpdatePackage(c.Context(), pkg); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Paket berhasil diperbarui")
}

// TogglePackage handles PATCH /packages/:id/toggle
func (h *OwnerHandler) TogglePackage(c *fiber.Ctx) error {
	id := c.Params("id")
	isActive, err := h.svc.TogglePackage(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	msg := "Paket dinonaktifkan"
	if isActive {
		msg = "Paket diaktifkan"
	}
	return response.Success(c, fiber.Map{"is_active": isActive}, msg)
}

// --- OLT Ports ---

// ListOLTPorts handles GET /olt-ports
func (h *OwnerHandler) ListOLTPorts(c *fiber.Ctx) error {
	ports, err := h.svc.ListOLTPorts(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, ports, "")
}

type createOLTPortRequest struct {
	Name       string  `json:"name"`
	AreaName   string  `json:"area_name"`
	OLTHost    string  `json:"olt_host"`
	OLTPortSSH int     `json:"olt_port_ssh"`
	GponSlot   int     `json:"gpon_slot"`
	GponPort   int     `json:"gpon_port"`
	MaxONT     int     `json:"max_ont"`
	Notes      *string `json:"notes"`
}

// CreateOLTPort handles POST /olt-ports
func (h *OwnerHandler) CreateOLTPort(c *fiber.Ctx) error {
	var req createOLTPortRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.OLTHost == "" {
		return response.ValidationError(c, fiber.Map{"name": "wajib diisi", "olt_host": "wajib diisi"})
	}

	port := &model.OLTPortConfig{
		Name:       req.Name,
		AreaName:   req.AreaName,
		OLTHost:    req.OLTHost,
		OLTPortSSH: req.OLTPortSSH,
		GponSlot:   req.GponSlot,
		GponPort:   req.GponPort,
		MaxONT:     req.MaxONT,
		Notes:      req.Notes,
	}
	if port.OLTPortSSH == 0 {
		port.OLTPortSSH = 22
	}
	if port.MaxONT == 0 {
		port.MaxONT = 64
	}

	created, err := h.svc.CreateOLTPort(c.Context(), port)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Created(c, fiber.Map{"id": created.ID}, "Port OLT berhasil ditambahkan")
}

// UpdateOLTPort handles PUT /olt-ports/:id
func (h *OwnerHandler) UpdateOLTPort(c *fiber.Ctx) error {
	id := c.Params("id")
	var req createOLTPortRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.OLTHost == "" {
		return response.ValidationError(c, fiber.Map{"name": "wajib diisi", "olt_host": "wajib diisi"})
	}

	port := &model.OLTPortConfig{
		ID:         id,
		Name:       req.Name,
		AreaName:   req.AreaName,
		OLTHost:    req.OLTHost,
		OLTPortSSH: req.OLTPortSSH,
		GponSlot:   req.GponSlot,
		GponPort:   req.GponPort,
		MaxONT:     req.MaxONT,
		Notes:      req.Notes,
	}
	if port.OLTPortSSH == 0 {
		port.OLTPortSSH = 22
	}
	if port.MaxONT == 0 {
		port.MaxONT = 64
	}

	if err := h.svc.UpdateOLTPort(c.Context(), port); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Port OLT berhasil diperbarui")
}

// DeleteOLTPort handles DELETE /olt-ports/:id
func (h *OwnerHandler) DeleteOLTPort(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.DeleteOLTPort(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Port OLT berhasil dihapus")
}

// --- App Configs ---

// ListConfigs handles GET /configs
func (h *OwnerHandler) ListConfigs(c *fiber.Ctx) error {
	configs, err := h.svc.ListConfigs(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, configs, "")
}

type updateConfigRequest struct {
	Value string `json:"value"`
}

// UpdateConfig handles PUT /configs/:key
func (h *OwnerHandler) UpdateConfig(c *fiber.Ctx) error {
	key := c.Params("key")
	userID := c.Locals("user_id").(string)

	var req updateConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	if err := h.svc.UpdateConfig(c.Context(), key, req.Value, userID); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Konfigurasi diperbarui")
}

// --- Users (real implementation using userRepo) ---

type createUserRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type updateUserRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

// ListUsers handles GET /users
func (h *OwnerHandler) ListUsers(c *fiber.Ctx) error {
	roleFilter := c.Query("role")
	if roleFilter == "all" {
		roleFilter = ""
	}
	h.logger.Debug("list users requested", zap.String("role_filter", roleFilter))
	users, err := h.userRepo.ListStaff(c.Context(), roleFilter)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, users, "")
}

// CreateUser handles POST /users
func (h *OwnerHandler) CreateUser(c *fiber.Ctx) error {
	var req createUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.FullName == "" || req.Phone == "" || req.Password == "" || req.Role == "" {
		return response.ValidationError(c, fiber.Map{"error": "Semua field wajib diisi"})
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, err)
	}
	passwordHash := string(hashedBytes)

	var email *string
	if req.Email != "" {
		email = &req.Email
	}

	u := &authModel.User{
		FullName:     req.FullName,
		Email:        email,
		Phone:        req.Phone,
		PasswordHash: &passwordHash,
		Role:         authModel.Role(req.Role),
		IsActive:     true,
	}

	created, err := h.userRepo.Create(c.Context(), u)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Created(c, created, "User berhasil dibuat")
}

// ToggleUser handles PATCH /users/:id/toggle
func (h *OwnerHandler) ToggleUser(c *fiber.Ctx) error {
	id := c.Params("id")
	isActive, err := h.userRepo.ToggleActive(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	msg := "User dinonaktifkan"
	if isActive {
		msg = "User diaktifkan"
	}
	return response.Success(c, fiber.Map{"is_active": isActive}, msg)
}

// ResetPassword handles PUT /users/:id/password
func (h *OwnerHandler) ResetPassword(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Password == "" {
		return response.ValidationError(c, fiber.Map{"password": "wajib diisi"})
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, err)
	}

	if err := h.userRepo.UpdatePassword(c.Context(), id, string(hashedBytes)); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Password berhasil diperbarui")
}

// UpdateUser handles PUT /users/:id
func (h *OwnerHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req updateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.FullName == "" || req.Phone == "" || req.Role == "" {
		return response.ValidationError(c, fiber.Map{"error": "Nama, No. Telepon, dan Peran wajib diisi"})
	}

	existing, err := h.userRepo.GetByID(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	if existing.Role == authModel.RoleOwner && req.Role != string(authModel.RoleOwner) {
		return response.ValidationError(c, fiber.Map{"error": "Peran owner tidak dapat diubah"})
	}

	var email *string
	if req.Email != "" {
		email = &req.Email
	}

	u := &authModel.User{
		ID:       id,
		FullName: req.FullName,
		Email:    email,
		Phone:    req.Phone,
		Role:     authModel.Role(req.Role),
	}

	updated, err := h.userRepo.Update(c.Context(), u)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, updated, "User berhasil diperbarui")
}

// --- Mikrotik Configs CRUD ---

type mikrotikConfigRequest struct {
	Name     string `json:"name"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	IsActive bool   `json:"is_active"`
}

// ListMikrotikConfigs handles GET /owner/mikrotik-configs
func (h *OwnerHandler) ListMikrotikConfigs(c *fiber.Ctx) error {
	configs, err := h.svc.ListMikrotikConfigs(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, configs, "")
}

// GetMikrotikConfig handles GET /owner/mikrotik-configs/:id
func (h *OwnerHandler) GetMikrotikConfig(c *fiber.Ctx) error {
	id := c.Params("id")
	config, err := h.svc.GetMikrotikConfig(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, config, "")
}

// CreateMikrotikConfig handles POST /owner/mikrotik-configs
func (h *OwnerHandler) CreateMikrotikConfig(c *fiber.Ctx) error {
	var req mikrotikConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.Host == "" || req.Username == "" || req.Password == "" {
		return response.ValidationError(c, fiber.Map{
			"name":     "wajib diisi",
			"host":     "wajib diisi",
			"username": "wajib diisi",
			"password": "wajib diisi",
		})
	}
	if req.Port == 0 {
		req.Port = 443
	}

	m := &model.MikrotikConfig{
		Name:     req.Name,
		Host:     req.Host,
		Port:     req.Port,
		Username: req.Username,
		IsActive: req.IsActive,
	}

	created, err := h.svc.CreateMikrotikConfig(c.Context(), m, req.Password)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Created(c, created, "Konfigurasi Mikrotik berhasil dibuat")
}

// UpdateMikrotikConfig handles PUT /owner/mikrotik-configs/:id
func (h *OwnerHandler) UpdateMikrotikConfig(c *fiber.Ctx) error {
	id := c.Params("id")
	var req mikrotikConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.Host == "" || req.Username == "" {
		return response.ValidationError(c, fiber.Map{
			"name":     "wajib diisi",
			"host":     "wajib diisi",
			"username": "wajib diisi",
		})
	}
	if req.Port == 0 {
		req.Port = 443
	}

	m := &model.MikrotikConfig{
		Name:     req.Name,
		Host:     req.Host,
		Port:     req.Port,
		Username: req.Username,
		IsActive: req.IsActive,
	}

	if err := h.svc.UpdateMikrotikConfig(c.Context(), id, m, req.Password); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Konfigurasi Mikrotik berhasil diperbarui")
}

// DeleteMikrotikConfig handles DELETE /owner/mikrotik-configs/:id
func (h *OwnerHandler) DeleteMikrotikConfig(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.DeleteMikrotikConfig(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Konfigurasi Mikrotik berhasil dihapus")
}

// ToggleMikrotikConfig handles PATCH /owner/mikrotik-configs/:id/toggle
func (h *OwnerHandler) ToggleMikrotikConfig(c *fiber.Ctx) error {
	id := c.Params("id")
	isActive, err := h.svc.ToggleMikrotikConfig(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	msg := "Konfigurasi Mikrotik dinonaktifkan"
	if isActive {
		msg = "Konfigurasi Mikrotik diaktifkan"
	}
	return response.Success(c, fiber.Map{"is_active": isActive}, msg)
}

// TestMikrotikConnection handles POST /owner/mikrotik-configs/:id/test
func (h *OwnerHandler) TestMikrotikConnection(c *fiber.Ctx) error {
	id := c.Params("id")
	isOnline, err := h.svc.TestMikrotikConnection(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	msg := "Koneksi Mikrotik offline/gagal"
	if isOnline {
		msg = "Koneksi Mikrotik online/berhasil"
	}
	return response.Success(c, fiber.Map{"is_online": isOnline}, msg)
}

// GetMikrotikResources handles GET /owner/mikrotik-configs/:id/resources
func (h *OwnerHandler) GetMikrotikResources(c *fiber.Ctx) error {
	id := c.Params("id")
	res, err := h.svc.GetMikrotikResources(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, res, "Berhasil mengambil resource Mikrotik")
}

// GetMikrotikActiveConnections handles GET /owner/mikrotik-configs/:id/active-connections
func (h *OwnerHandler) GetMikrotikActiveConnections(c *fiber.Ctx) error {
	id := c.Params("id")
	res, err := h.svc.GetMikrotikActiveConnections(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, res, "Berhasil mengambil koneksi aktif Mikrotik")
}

// GetMikrotikPPPSecrets handles GET /owner/mikrotik-configs/:id/secrets
func (h *OwnerHandler) GetMikrotikPPPSecrets(c *fiber.Ctx) error {
	id := c.Params("id")
	res, err := h.svc.GetMikrotikPPPSecrets(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, res, "Berhasil mengambil secrets PPP Mikrotik")
}

// GetMikrotikTraffic handles GET /owner/mikrotik-configs/:id/traffic
func (h *OwnerHandler) GetMikrotikTraffic(c *fiber.Ctx) error {
	id := c.Params("id")
	res, err := h.svc.GetMikrotikTraffic(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, res, "Berhasil mengambil trafik interface Mikrotik")
}

// GetMikrotikLogs handles GET /owner/mikrotik-configs/:id/logs
func (h *OwnerHandler) GetMikrotikLogs(c *fiber.Ctx) error {
	id := c.Params("id")
	res, err := h.svc.GetMikrotikLogs(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, res, "Berhasil mengambil log Mikrotik")
}

// DisconnectMikrotikActiveConnection handles POST /owner/mikrotik-configs/:id/active-connections/disconnect
func (h *OwnerHandler) DisconnectMikrotikActiveConnection(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" {
		return response.ValidationError(c, fiber.Map{"name": "wajib diisi"})
	}

	if err := h.svc.DisconnectMikrotikActiveConnection(c.Context(), id, req.Name); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Koneksi aktif PPPoE berhasil diputus")
}

// ToggleMikrotikSecret handles POST /owner/mikrotik-configs/:id/secrets/toggle
func (h *OwnerHandler) ToggleMikrotikSecret(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Name     string `json:"name"`
		Disabled bool   `json:"disabled"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" {
		return response.ValidationError(c, fiber.Map{"name": "wajib diisi"})
	}

	if err := h.svc.ToggleMikrotikSecret(c.Context(), id, req.Name, req.Disabled); err != nil {
		return response.Error(c, err)
	}
	msg := "PPP Secret diaktifkan"
	if req.Disabled {
		msg = "PPP Secret dinonaktifkan"
	}
	return response.Success(c, nil, msg)
}

// AddMikrotikSecret handles POST /owner/mikrotik-configs/:id/secrets
func (h *OwnerHandler) AddMikrotikSecret(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Name     string `json:"name"`
		Password string `json:"password"`
		Profile  string `json:"profile"`
		Service  string `json:"service"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Name == "" || req.Password == "" {
		return response.ValidationError(c, fiber.Map{"name": "wajib diisi", "password": "wajib diisi"})
	}

	if err := h.svc.AddMikrotikSecret(c.Context(), id, req.Name, req.Password, req.Profile, req.Service); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "PPP Secret berhasil ditambahkan ke Mikrotik")
}

// UploadLogo handles POST /owner/upload-logo
func (h *OwnerHandler) UploadLogo(c *fiber.Ctx) error {
	file, err := c.FormFile("logo")
	if err != nil {
		return response.ValidationError(c, map[string]string{"logo": "file logo wajib disertakan"})
	}

	// Buat folder uploads/brand jika belum ada
	_ = os.MkdirAll("./uploads/brand", 0755)

	// Validasi tipe file
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".svg" {
		return response.ValidationError(c, map[string]string{"logo": "format logo harus PNG, JPG, JPEG, atau SVG"})
	}

	// Validasi ukuran (maksimal 2MB untuk logo)
	if file.Size > 2*1024*1024 {
		return response.ValidationError(c, map[string]string{"logo": "ukuran logo maksimal 2MB"})
	}

	// Simpan file
	filename := fmt.Sprintf("logo_%d%s", time.Now().UnixNano(), ext)
	savePath := "./uploads/brand/" + filename
	if err := c.SaveFile(file, savePath); err != nil {
		return response.Error(c, err)
	}

	// Return relative URL
	logoURL := "/uploads/brand/" + filename

	return response.Success(c, fiber.Map{
		"url": logoURL,
	}, "Logo berhasil diunggah")
}

// --- helpers ---

func sumMap(m map[string]int) int {
	total := 0
	for _, v := range m {
		total += v
	}
	return total
}
