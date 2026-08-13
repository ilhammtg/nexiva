package handler

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	authRepo "isp-platform/registration/services/auth/repository"
	"isp-platform/registration/internal/response"
	"isp-platform/registration/internal/utils"
	"isp-platform/registration/services/registration/model"
	"isp-platform/registration/services/registration/repository"
	"isp-platform/registration/services/registration/service"
)

// PublicHandler handles unauthenticated public endpoints.
type PublicHandler struct {
	svc    service.RegistrationService
	logger *zap.Logger
}

// NewPublicHandler constructs a PublicHandler.
func NewPublicHandler(svc service.RegistrationService, log *zap.Logger) *PublicHandler {
	return &PublicHandler{svc: svc, logger: log}
}

// Submit handles POST /api/v1/registrations
func (h *PublicHandler) Submit(c *fiber.Ctx) error {
	input := service.SubmitInput{
		FullName:        strings.TrimSpace(c.FormValue("full_name")),
		NIK:             strings.TrimSpace(c.FormValue("nik")),
		Phone:           strings.TrimSpace(c.FormValue("phone")),
		Email:           strings.TrimSpace(c.FormValue("email")),
		Province:        strings.TrimSpace(c.FormValue("province")),
		City:            strings.TrimSpace(c.FormValue("city")),
		District:        strings.TrimSpace(c.FormValue("district")),
		Village:         strings.TrimSpace(c.FormValue("village")),
		RT:              strings.TrimSpace(c.FormValue("rt")),
		RW:              strings.TrimSpace(c.FormValue("rw")),
		AddressDetail:   strings.TrimSpace(c.FormValue("address_detail")),
		PackageID:       strings.TrimSpace(c.FormValue("package_id")),
		GoogleMapsLink:  strings.TrimSpace(c.FormValue("google_maps_link")),
		ONTSerialNumber: strings.TrimSpace(c.FormValue("ont_serial_number")),
		OLTPortConfigID: strings.TrimSpace(c.FormValue("olt_port_config_id")),
		ODPInfo:         strings.TrimSpace(c.FormValue("odp_info")),
	}

	if latStr := c.FormValue("maps_lat"); latStr != "" {
		if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
			input.MapsLat = &lat
		}
	}
	if lngStr := c.FormValue("maps_lng"); lngStr != "" {
		if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
			input.MapsLng = &lng
		}
	}

	// Validate required fields
	errs := map[string]string{}
	if input.FullName == "" {
		errs["full_name"] = "wajib diisi"
	}
	if input.Phone == "" {
		errs["phone"] = "wajib diisi"
	}
	if input.Province == "" {
		errs["province"] = "wajib diisi"
	}
	if input.City == "" {
		errs["city"] = "wajib diisi"
	}
	if input.District == "" {
		errs["district"] = "wajib diisi"
	}
	if input.Village == "" {
		errs["village"] = "wajib diisi"
	}
	if input.AddressDetail == "" {
		errs["address_detail"] = "wajib diisi"
	}
	if input.PackageID == "" {
		errs["package_id"] = "wajib diisi"
	}

	if len(errs) > 0 {
		return response.ValidationError(c, errs)
	}

	// Handle optional KTP file upload
	if file, err := c.FormFile("ktp_file"); err == nil && file != nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".pdf" {
			return response.ValidationError(c, map[string]string{"ktp_file": "format harus JPG, JPEG, PNG, atau PDF"})
		}
		if file.Size > 5*1024*1024 {
			return response.ValidationError(c, map[string]string{"ktp_file": "ukuran maksimal 5MB"})
		}

		_ = os.MkdirAll("./uploads/ktp", 0755)
		savePath := "./uploads/ktp/" + file.Filename
		if err := c.SaveFile(file, savePath); err != nil {
			h.logger.Warn("failed to save KTP file", zap.Error(err))
		} else {
			input.KTPFilePath = savePath
		}
	}

	created, err := h.svc.Submit(c.Context(), input)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, created, "Pendaftaran berhasil dikirim")
}

// CheckStatus handles GET /api/v1/registrations/status
func (h *PublicHandler) CheckStatus(c *fiber.Ctx) error {
	phone := strings.TrimSpace(c.Query("phone"))
	regNumber := strings.TrimSpace(c.Query("reg_number"))

	reg, logs, err := h.svc.CheckStatus(c.Context(), phone, regNumber)
	if err != nil {
		return response.Error(c, err)
	}

	// Map logs to public logs
	publicLogs := make([]fiber.Map, 0, len(logs))
	for _, l := range logs {
		publicLogs = append(publicLogs, fiber.Map{
			"status_to":  l.StatusTo,
			"label":      mapStatusLabel(l.StatusTo),
			"reason":     l.Reason,
			"created_at": l.CreatedAt,
		})
	}

	return response.Success(c, fiber.Map{
		"id":             reg.ID,
		"reg_number":     reg.RegNumber,
		"full_name":      reg.FullName,
		"status":         reg.Status,
		"status_label":   mapStatusLabel(string(reg.Status)),
		"province":       reg.Province,
		"city":           reg.City,
		"district":       reg.District,
		"village":        reg.Village,
		"address_detail": reg.AddressDetail,
		"created_at":     reg.CreatedAt,
		"logs":           publicLogs,
	}, "")
}

// ListPackages handles GET /api/v1/packages (public — active only)
func (h *PublicHandler) ListPackages(c *fiber.Ctx) error {
	packages, err := h.svc.ListPackages(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, packages, "")
}

// GetPublicConfigs handles GET /api/v1/configs/public
func (h *PublicHandler) GetPublicConfigs(c *fiber.Ctx) error {
	configs, err := h.svc.ListConfigs(c.Context())
	if err != nil {
		return response.Error(c, err)
	}

	resMap := fiber.Map{
		"locked_regions":              "",
		"brand_name":                  "PT JSN",
		"brand_logo_url":              "",
		"brand_footer_tagline":        "Temukan Kemudahan Dalam Genggaman",
		"brand_footer_download_text":  "Download App Kami",
		"brand_footer_links":          "[]",
		"brand_footer_socials":        "[]",
		"brand_footer_copyright":      "Copyright 2026 PT JSN All Right Reserved.",
		"website_hero_title":          "Internet Cepat, Tanpa Batas, Untuk Keluarga Anda",
		"website_hero_subtitle":       "Nikmati koneksi internet fiber optic super cepat, stabil, dan unlimited untuk aktivitas streaming, belajar, bekerja, dan gaming tanpa hambatan.",
		"website_contact_phone":       "081234567890",
		"website_contact_email":       "support@ispcenter.net",
		"website_address":             "Jl. Raya Utama No. 88, Banda Aceh, Indonesia",
		"role_permissions":            "",
		"customer_number_prefix":      "2026",
		"pppoe_domain_suffix":         "ptnat.net",
		"invoice_company_name":         "PT Jaringan Sarana Nusantara",
		"invoice_company_address":      "Jl. Utama Raya No. 45, Jakarta Pusat",
		"invoice_company_phone":        "(021) 555-1234",
		"invoice_company_email":        "support@jsn.net.id",
		"invoice_tax_rate":             "11",
		"invoice_payment_instructions": "Bank Mandiri Virtual Account: 88932 + Nomor HP Anda\nBank BCA Rekening: 123-456-7890 (a.n. PT Jaringan Sarana Nusantara)",
		"wa_system_number":             "085167720007",
		"brand_primary_color":         "#2563eb",
		"brand_secondary_color":       "#4f46e5",
		"brand_accent_color":          "#f59e0b",
		"brand_favicon_url":           "",
	}

	for _, cfg := range configs {
		switch cfg.Key {
		case "locked_regions":
			resMap["locked_regions"] = cfg.Value
		case "brand_name":
			resMap["brand_name"] = cfg.Value
		case "brand_logo_url":
			resMap["brand_logo_url"] = cfg.Value
		case "brand_footer_tagline":
			resMap["brand_footer_tagline"] = cfg.Value
		case "brand_footer_download_text":
			resMap["brand_footer_download_text"] = cfg.Value
		case "brand_footer_links":
			resMap["brand_footer_links"] = cfg.Value
		case "brand_footer_socials":
			resMap["brand_footer_socials"] = cfg.Value
		case "brand_footer_copyright":
			resMap["brand_footer_copyright"] = cfg.Value
		case "website_hero_title":
			resMap["website_hero_title"] = cfg.Value
		case "website_hero_subtitle":
			resMap["website_hero_subtitle"] = cfg.Value
		case "website_contact_phone":
			resMap["website_contact_phone"] = cfg.Value
		case "website_contact_email":
			resMap["website_contact_email"] = cfg.Value
		case "website_address":
			resMap["website_address"] = cfg.Value
		case "role_permissions":
			resMap["role_permissions"] = cfg.Value
		case "customer_number_prefix":
			resMap["customer_number_prefix"] = cfg.Value
		case "pppoe_domain_suffix":
			resMap["pppoe_domain_suffix"] = cfg.Value
		case "invoice_company_name":
			resMap["invoice_company_name"] = cfg.Value
		case "invoice_company_address":
			resMap["invoice_company_address"] = cfg.Value
		case "invoice_company_phone":
			resMap["invoice_company_phone"] = cfg.Value
		case "invoice_company_email":
			resMap["invoice_company_email"] = cfg.Value
		case "invoice_tax_rate":
			resMap["invoice_tax_rate"] = cfg.Value
		case "invoice_payment_instructions":
			resMap["invoice_payment_instructions"] = cfg.Value
		case "wa_system_number":
			resMap["wa_system_number"] = cfg.Value
		case "brand_primary_color":
			resMap["brand_primary_color"] = cfg.Value
		case "brand_secondary_color":
			resMap["brand_secondary_color"] = cfg.Value
		case "brand_accent_color":
			resMap["brand_accent_color"] = cfg.Value
		case "brand_favicon_url":
			resMap["brand_favicon_url"] = cfg.Value
		}
	}

	return response.Success(c, resMap, "")
}

// ListAllPackages handles GET /api/v1/packages/all (auth required)
func (h *PublicHandler) ListAllPackages(c *fiber.Ctx) error {
	packages, err := h.svc.ListAllPackages(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, packages, "")
}

// mapStatusLabel returns a human-readable label for a status string.
func mapStatusLabel(status string) string {
	labels := map[string]string{
		"pending_review":          "Menunggu Review",
		"survey_scheduled":        "Survei Dijadwalkan",
		"survey_done":             "Survei Selesai",
		"survey_failed":           "Survei Gagal",
		"rejected":                "Ditolak",
		"waiting_payment":         "Menunggu Pembayaran",
		"payment_confirmed":       "Pembayaran Dikonfirmasi",
		"installation_scheduled":  "Instalasi Dijadwalkan",
		"provisioning":            "Sedang Diaktifkan",
		"provisioning_failed":     "Aktivasi Gagal",
		"active":                  "Aktif",
	}
	if l, ok := labels[status]; ok {
		return l
	}
	return status
}

// --- CS Admin Handler ---

// CSAdminHandler handles CS admin authenticated endpoints.
type CSAdminHandler struct {
	svc      service.RegistrationService
	userRepo authRepo.UserRepository
	logger   *zap.Logger
}

// NewCSAdminHandler constructs a CSAdminHandler.
func NewCSAdminHandler(svc service.RegistrationService, userRepo authRepo.UserRepository, log *zap.Logger) *CSAdminHandler {
	return &CSAdminHandler{svc: svc, userRepo: userRepo, logger: log}
}

// List handles GET /admin/registrations
func (h *CSAdminHandler) List(c *fiber.Ctx) error {
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

// Detail handles GET /admin/registrations/:id
func (h *CSAdminHandler) Detail(c *fiber.Ctx) error {
	id := c.Params("id")
	reg, logs, err := h.svc.GetDetail(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}


	return response.Success(c, fiber.Map{"registration": reg, "logs": logs}, "")
}

type approveRequest struct {
	TechnicianID      string `json:"technician_id"`
	SurveyScheduledAt string `json:"survey_scheduled_at"`
	Notes             string `json:"notes"`
}

// Approve handles PATCH /admin/registrations/:id/approve
func (h *CSAdminHandler) Approve(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req approveRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.TechnicianID == "" || req.SurveyScheduledAt == "" {
		return response.ValidationError(c, fiber.Map{
			"technician_id":      "wajib diisi",
			"survey_scheduled_at": "wajib diisi",
		})
	}

	if err := h.svc.Approve(c.Context(), id, userID, role, service.ApproveInput(req)); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": string(model.StatusSurveyScheduled)}, "Survei dijadwalkan")
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

// Reject handles PATCH /admin/registrations/:id/reject
func (h *CSAdminHandler) Reject(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req rejectRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Reason == "" {
		return response.ValidationError(c, fiber.Map{"reason": "wajib diisi"})
	}

	if err := h.svc.Reject(c.Context(), id, userID, role, req.Reason); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": string(model.StatusRejected)}, "Pendaftaran ditolak")
}

type confirmPaymentRequest struct {
	PaymentAmount int64  `json:"payment_amount"`
	PaymentDate   string `json:"payment_date"`
	PaymentBank   string `json:"payment_bank"`
	Notes         string `json:"notes"`
}

// ConfirmPayment handles PATCH /admin/registrations/:id/confirm-payment
func (h *CSAdminHandler) ConfirmPayment(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req confirmPaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.PaymentAmount <= 0 || req.PaymentDate == "" || req.PaymentBank == "" {
		return response.ValidationError(c, fiber.Map{
			"payment_amount": "wajib diisi",
			"payment_date":   "wajib diisi",
			"payment_bank":   "wajib diisi",
		})
	}

	input := service.ConfirmPaymentInput{
		PaymentAmount: req.PaymentAmount,
		PaymentDate:   req.PaymentDate,
		PaymentBank:   req.PaymentBank,
		Notes:         req.Notes,
	}
	if err := h.svc.ConfirmPayment(c.Context(), id, userID, role, input); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": string(model.StatusPaymentConfirmed)}, "Pembayaran dikonfirmasi")
}

type scheduleInstallationRequest struct {
	TechnicianID            string `json:"technician_id"`
	InstallationScheduledAt string `json:"installation_scheduled_at"`
	InstallationFee         int64  `json:"installation_fee"`
	PPPoEUsername           string `json:"pppoe_username"`
	Notes                   string `json:"notes"`
}

// ScheduleInstallation handles PATCH /admin/registrations/:id/schedule-installation
func (h *CSAdminHandler) ScheduleInstallation(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req scheduleInstallationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	input := service.ScheduleInstallationInput{
		TechnicianID:            req.TechnicianID,
		InstallationScheduledAt: req.InstallationScheduledAt,
		InstallationFee:         req.InstallationFee,
		PPPoEUsername:           req.PPPoEUsername,
		Notes:                   req.Notes,
	}
	if err := h.svc.ScheduleInstallation(c.Context(), id, userID, role, input); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": string(model.StatusInstallationScheduled)}, "Jadwal instalasi dibuat")
}

type internalNotesRequest struct {
	InternalNotes string `json:"internal_notes"`
}

// UpdateInternalNotes handles PATCH /admin/registrations/:id/internal-notes
func (h *CSAdminHandler) UpdateInternalNotes(c *fiber.Ctx) error {
	id := c.Params("id")
	var req internalNotesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if err := h.svc.UpdateInternalNotes(c.Context(), id, req.InternalNotes); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Catatan diperbarui")
}

// UpdateRegistration handles PUT /admin/registrations/:id
func (h *CSAdminHandler) UpdateRegistration(c *fiber.Ctx) error {
	id := c.Params("id")
	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	// Remove fields that should not be directly modified
	delete(req, "id")
	delete(req, "created_at")
	delete(req, "updated_at")
	delete(req, "reg_number")

	// Map PascalCase frontend payload keys to snake_case db column names
	fieldMapper := map[string]string{
		"FullName":        "full_name",
		"NIK":             "nik",
		"Phone":           "phone",
		"Email":           "email",
		"Province":        "province",
		"City":            "city",
		"District":        "district",
		"Village":         "village",
		"RT":              "rt",
		"RW":              "rw",
		"AddressDetail":   "address_detail",
		"MapsLat":         "maps_lat",
		"MapsLng":         "maps_lng",
		"GoogleMapsLink":  "google_maps_link",
		"PPPoEUsername":   "pppoe_username",
		"ONTSerialNumber": "ont_serial_number",
		"ODPInfo":         "odp_info",
		"Status":          "status",
		"status":          "status",
		"ActivatedAt":     "activated_at",
		"activated_at":     "activated_at",
	}

	mappedReq := make(map[string]interface{})
	for k, v := range req {
		if dbCol, ok := fieldMapper[k]; ok {
			mappedReq[dbCol] = v
		} else {
			// support snake_case if already sent in snake_case
			mappedReq[k] = v
		}
	}

	if err := h.svc.UpdateRegistration(c.Context(), id, mappedReq); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Data pelanggan berhasil diperbarui")
}

// DeleteRegistration handles DELETE /admin/registrations/:id
func (h *CSAdminHandler) DeleteRegistration(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.Delete(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Pelanggan berhasil dihapus")
}

// ListTechnicians handles GET /admin/technicians
func (h *CSAdminHandler) ListTechnicians(c *fiber.Ctx) error {
	techs, err := h.userRepo.ListStaff(c.Context(), "technician")
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, techs, "")
}

// ActivityLogs handles GET /admin/activity-logs
func (h *CSAdminHandler) ActivityLogs(c *fiber.Ctx) error {
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

// ProvisioningLogs handles GET /admin/provisioning-logs/:registration_id
func (h *CSAdminHandler) ProvisioningLogs(c *fiber.Ctx) error {
	regID := c.Params("registration_id")
	h.logger.Debug("provisioning logs requested", zap.String("registration_id", regID))

	dbLogs, err := h.svc.GetProvisioningLogs(c.Context(), regID)
	if err != nil {
		return response.Error(c, err)
	}

	type FrontLog struct {
		IsSuccess bool      `json:"IsSuccess"`
		Message   string    `json:"Message"`
		CreatedAt time.Time `json:"CreatedAt"`
	}

	frontLogs := make([]FrontLog, 0, len(dbLogs))
	for _, l := range dbLogs {
		isSuccess := l.Status == "success"
		msg := fmt.Sprintf("[%s] %s: %s", l.Target, l.Action, l.Status)
		if l.ErrorMessage != nil && *l.ErrorMessage != "" {
			msg += " - " + *l.ErrorMessage
		}
		frontLogs = append(frontLogs, FrontLog{
			IsSuccess: isSuccess,
			Message:   msg,
			CreatedAt: l.CreatedAt,
		})
	}

	return response.Success(c, frontLogs, "")
}

type adminActivateRequest struct {
	ONTSerialNumber string   `json:"ont_serial_number"`
	OLTPortConfigID string   `json:"olt_port_config_id"`
	MapsLat         *float64 `json:"maps_lat"`
	MapsLng         *float64 `json:"maps_lng"`
	ODPInfo         string   `json:"odp_info"`
	GoogleMapsLink  string   `json:"google_maps_link"`
	PPPoEUsername   string   `json:"pppoe_username"`
	PPPoEPassword   string   `json:"pppoe_password"`
}

// Activate handles PATCH /admin/registrations/:id/activate (CS Admin / Super Admin triggers provisioning manually)
func (h *CSAdminHandler) Activate(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req adminActivateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	if req.OLTPortConfigID == "" {
		return response.ValidationError(c, fiber.Map{
			"olt_port_config_id": "wajib diisi untuk aktivasi",
		})
	}

	input := service.ActivateInput{
		ONTSerialNumber: req.ONTSerialNumber,
		OLTPortConfigID: req.OLTPortConfigID,
		MapsLat:         req.MapsLat,
		MapsLng:         req.MapsLng,
		ODPInfo:         req.ODPInfo,
		GoogleMapsLink:  req.GoogleMapsLink,
		PPPoEUsername:   req.PPPoEUsername,
		PPPoEPassword:   req.PPPoEPassword,
	}

	if err := h.svc.TriggerProvisioning(c.Context(), id, userID, role, input); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": "provisioning"}, "Aktivasi provisioning dimulai")
}

// GetNextCustomerNumber handles GET /admin/registrations/next-customer-number
func (h *CSAdminHandler) GetNextCustomerNumber(c *fiber.Ctx) error {
	regID := c.Query("registration_id")
	var nextCustNum string
	var err error
	if regID != "" {
		nextCustNum, err = h.svc.GetNextCustomerNumberForRegistration(c.Context(), regID)
	} else {
		nextCustNum, err = h.svc.GetNextCustomerNumber(c.Context())
	}
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"next_customer_number": nextCustNum}, "")
}

// GetPublicRegistration handles GET /api/v1/registrations/public/:id
func (h *PublicHandler) GetPublicRegistration(c *fiber.Ctx) error {
	id := c.Params("id")

	reg, _, err := h.svc.GetDetail(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	pkg, err := h.svc.GetPackageByID(c.Context(), reg.PackageID)
	if err != nil {
		h.logger.Warn("failed to fetch package for public registration", zap.String("package_id", reg.PackageID), zap.Error(err))
	}

	var pkgName string
	var pkgMonthlyPrice int64
	var pkgSpeedDown int
	if pkg != nil {
		pkgName = pkg.Name
		pkgMonthlyPrice = pkg.PriceMonthly
		pkgSpeedDown = pkg.SpeedDownMbps
	}

	return response.Success(c, fiber.Map{
		"id":                   reg.ID,
		"reg_number":           reg.RegNumber,
		"full_name":            reg.FullName,
		"phone":                reg.Phone,
		"province":             reg.Province,
		"city":                 reg.City,
		"district":             reg.District,
		"village":              reg.Village,
		"address_detail":       reg.AddressDetail,
		"rt":                   reg.RT,
		"rw":                   reg.RW,
		"status":               reg.Status,
		"status_label":         mapStatusLabel(string(reg.Status)),
		"installation_fee":     reg.InstallationFee,
		"payment_amount":       reg.PaymentAmount,
		"payment_date":         reg.PaymentDate,
		"payment_bank":         reg.PaymentBank,
		"payment_confirmed_at": reg.PaymentConfirmedAt,
		"created_at":           reg.CreatedAt,
		"package_name":         pkgName,
		"package_price":        pkgMonthlyPrice,
		"package_speed":        pkgSpeedDown,
	}, "")
}

type resendNotifRequest struct {
	Type string `json:"type"`
}

// ResendNotification handles POST /admin/registrations/:id/resend-notif
func (h *CSAdminHandler) ResendNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	var req resendNotifRequest
	_ = c.BodyParser(&req)

	result, err := h.svc.ResendNotification(c.Context(), id, req.Type)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, result, result.Message)
}

// ProvisionMikrotik handles POST /admin/registrations/:id/provision-mikrotik
func (h *CSAdminHandler) ProvisionMikrotik(c *fiber.Ctx) error {
	id := c.Params("id")

	reg, _, err := h.svc.GetDetail(c.Context(), id)
	if err != nil {
		return response.Error(c, err)
	}

	pkg, err := h.svc.GetPackageByID(c.Context(), reg.PackageID)
	if err != nil || pkg == nil {
		return response.ValidationError(c, fiber.Map{"package_id": "Paket layanan pelanggan tidak ditemukan"})
	}

	username := ""
	if reg.PPPoEUsername != nil && *reg.PPPoEUsername != "" {
		username = *reg.PPPoEUsername
	} else {
		custNum := ""
		if reg.CustomerNumber != nil && *reg.CustomerNumber != "" {
			custNum = *reg.CustomerNumber
		} else {
			generated, err := h.svc.GetNextCustomerNumberForRegistration(c.Context(), reg.ID)
			if err == nil && generated != "" {
				custNum = generated
			} else {
				custNum = strings.ToLower(strings.ReplaceAll(reg.RegNumber, "-", ""))
			}
		}

		configs, _ := h.svc.ListConfigs(c.Context())
		domain := "ptnat.net"
		prefix := ""
		for _, cfg := range configs {
			if cfg.Key == "pppoe_domain_suffix" {
				domain = cfg.Value
			}
			if cfg.Key == "pppoe_username_prefix" {
				prefix = cfg.Value
			}
		}

		userBase := custNum
		if prefix != "" {
			if !strings.HasPrefix(custNum, prefix) {
				userBase = prefix + custNum
			}
		}
		username = userBase + "@" + domain
	}

	password := "123456"

	mConfigs, err := h.svc.ListMikrotikConfigs(c.Context())
	if err != nil || len(mConfigs) == 0 {
		return response.ValidationError(c, fiber.Map{"mikrotik": "Belum ada router Mikrotik aktif yang dikonfigurasi pada sistem"})
	}

	var activeConfig *model.MikrotikConfig
	for i := range mConfigs {
		if mConfigs[i].IsActive {
			activeConfig = &mConfigs[i]
			break
		}
	}
	if activeConfig == nil {
		activeConfig = &mConfigs[0]
	}

	mikrotikSuccess := true
	if err := h.svc.AddMikrotikSecret(c.Context(), activeConfig.ID, username, password, pkg.MikrotikProfile, "pppoe"); err != nil {
		h.logger.Warn("gagal menambah secret ke Mikrotik", zap.Error(err))
		mikrotikSuccess = false
	}

	notes := fmt.Sprintf("Akun PPPoE (%s) dengan profil %s disiapkan untuk Mikrotik %s", username, pkg.MikrotikProfile, activeConfig.Name)
	if !mikrotikSuccess {
		notes += " (Router Offline - Akun Disimpan di DB)"
	}

	updateData := map[string]interface{}{
		"pppoe_username": username,
		"internal_notes": notes,
		"status":         "active",
		"activated_at":   time.Now(),
	}
	_ = h.svc.UpdateRegistration(c.Context(), id, updateData)

	msg := fmt.Sprintf("Akun PPPoE (%s) berhasil di-provision ke Mikrotik %s!", username, activeConfig.Name)
	if !mikrotikSuccess {
		msg = fmt.Sprintf("Akun PPPoE (%s) disimpan ke database! (Router Mikrotik saat ini sedang offline)", username)
	}

	return response.Success(c, fiber.Map{
		"pppoe_username":   username,
		"pppoe_password":   password,
		"mikrotik_name":    activeConfig.Name,
		"mikrotik_profile": pkg.MikrotikProfile,
		"is_mikrotik_online": mikrotikSuccess,
	}, msg)
}

// GetPublicInvoice handles GET /api/v1/public-invoices/:id
func (h *PublicHandler) GetPublicInvoice(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.ErrorRaw(c, fiber.StatusBadRequest, "BAD_REQUEST", "ID tidak boleh kosong", nil)
	}

	inv, err := h.svc.GetInvoice(c.UserContext(), id)
	if err != nil {
		return response.ErrorRaw(c, fiber.StatusNotFound, "NOT_FOUND", "Tagihan tidak ditemukan", nil)
	}

	return response.Success(c, inv, "Tagihan berhasil diambil")
}

// ListInvoices handles GET /admin/invoices
func (h *CSAdminHandler) ListInvoices(c *fiber.Ctx) error {
	limitStr := c.Query("limit", "10")
	pageStr := c.Query("page", "1")
	
	limit, _ := strconv.Atoi(limitStr)
	page, _ := strconv.Atoi(pageStr)
	
	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	filter := model.InvoiceFilter{
		RegistrationID: c.Query("registration_id"),
		Status:          c.Query("status"),
		Query:           c.Query("search"),
		Limit:           limit,
		Offset:          offset,
	}

	invoices, total, err := h.svc.ListInvoices(c.UserContext(), filter)
	if err != nil {
		return response.Error(c, err)
	}

	totalPages := (total + limit - 1) / limit

	return response.Paginated(c, invoices, &response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

// GetInvoice handles GET /admin/invoices/:id
func (h *CSAdminHandler) GetInvoice(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.ErrorRaw(c, fiber.StatusBadRequest, "BAD_REQUEST", "ID tidak boleh kosong", nil)
	}

	inv, err := h.svc.GetInvoice(c.UserContext(), id)
	if err != nil {
		return response.ErrorRaw(c, fiber.StatusNotFound, "NOT_FOUND", "Tagihan tidak ditemukan", nil)
	}

	return response.Success(c, inv, "Tagihan berhasil diambil")
}

// ConfirmInvoicePayment handles POST /admin/invoices/:id/confirm
func (h *CSAdminHandler) ConfirmInvoicePayment(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.ErrorRaw(c, fiber.StatusBadRequest, "BAD_REQUEST", "ID tidak boleh kosong", nil)
	}

	var req model.ConfirmPaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorRaw(c, fiber.StatusBadRequest, "BAD_REQUEST", "Body data tidak valid", nil)
	}

	userID := c.Locals("user_id").(string)

	err := h.svc.ConfirmInvoicePayment(c.UserContext(), id, userID, req)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Pembayaran tagihan berhasil dikonfirmasi")
}

// ResendInvoiceNotification handles POST /admin/invoices/:id/resend
func (h *CSAdminHandler) ResendInvoiceNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return response.ErrorRaw(c, fiber.StatusBadRequest, "BAD_REQUEST", "ID tidak boleh kosong", nil)
	}

	err := h.svc.ResendInvoiceNotification(c.UserContext(), id)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, nil, "Notifikasi tagihan berhasil dikirim ulang")
}



