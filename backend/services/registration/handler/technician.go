package handler

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"isp-platform/registration/internal/response"
	"isp-platform/registration/services/registration/service"
)

// TechnicianHandler handles technician-specific authenticated endpoints.
type TechnicianHandler struct {
	svc    service.RegistrationService
	worker interface{ RetryProvisioning(ctx interface{}, registrationID string) error }
	logger *zap.Logger
}

// NewTechnicianHandler constructs a TechnicianHandler.
func NewTechnicianHandler(svc service.RegistrationService, worker interface{ RetryProvisioning(ctx interface{}, registrationID string) error }, log *zap.Logger) *TechnicianHandler {
	return &TechnicianHandler{svc: svc, worker: worker, logger: log}
}

// Schedule handles GET /technician/schedule
func (h *TechnicianHandler) Schedule(c *fiber.Ctx) error {
	techID := c.Locals("user_id").(string)
	date := c.Query("date")
	taskType := c.Query("type", "all")

	regs, err := h.svc.TechnicianSchedule(c.Context(), techID, date, taskType)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, regs, "")
}

type surveyResultRequest struct {
	IsFeasible              *bool  `json:"is_feasible"`
	Status                  string `json:"status"` // "feasible", "failed", "pending"
	CableLengthM            int    `json:"cable_length_m"`
	Notes                   string `json:"notes"`
	InstallationFeeEstimate int64  `json:"installation_fee_estimate"`
}

// SurveyResult handles PATCH /technician/registrations/:id/survey-result
func (h *TechnicianHandler) SurveyResult(c *fiber.Ctx) error {
	id := c.Params("id")
	techID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req surveyResultRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}

	input := service.SurveyResultInput{
		IsFeasible:              req.IsFeasible,
		Status:                  req.Status,
		CableLengthM:            req.CableLengthM,
		Notes:                   req.Notes,
		InstallationFeeEstimate: req.InstallationFeeEstimate,
	}

	if err := h.svc.UpdateSurveyResult(c.Context(), id, techID, role, input); err != nil {
		return response.Error(c, err)
	}

	statusStr := req.Status
	if statusStr == "" {
		if req.IsFeasible != nil {
			if *req.IsFeasible {
				statusStr = "feasible"
			} else {
				statusStr = "failed"
			}
		} else {
			statusStr = "pending"
		}
	}

	nextStatus := "installation_scheduled"
	switch statusStr {
	case "failed":
		nextStatus = "survey_failed"
	case "pending":
		nextStatus = "survey_pending"
	}

	return response.Success(c, fiber.Map{"status": nextStatus}, "Hasil survei berhasil disimpan")
}

type activateRequest struct {
	ONTSerialNumber string   `json:"ont_serial_number"`
	OLTPortConfigID string   `json:"olt_port_config_id"`
	MapsLat         *float64 `json:"maps_lat"`
	MapsLng         *float64 `json:"maps_lng"`
	ODPInfo         string   `json:"odp_info"`
	GoogleMapsLink  string   `json:"google_maps_link"`
}

// Activate handles PATCH /technician/registrations/:id/activate (now completes installation and sets status to waiting_payment)
func (h *TechnicianHandler) Activate(c *fiber.Ctx) error {
	id := c.Params("id")
	techID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	var req activateRequest
	var ontPhotoPath string

	if strings.Contains(c.Get("Content-Type"), "multipart/form-data") {
		req.ONTSerialNumber = c.FormValue("ont_serial_number")
		req.OLTPortConfigID = c.FormValue("olt_port_config_id")
		req.ODPInfo = c.FormValue("odp_info")
		req.GoogleMapsLink = c.FormValue("google_maps_link")
		if latStr := c.FormValue("maps_lat"); latStr != "" {
			if lat, err := strconv.ParseFloat(latStr, 64); err == nil {
				req.MapsLat = &lat
			}
		}
		if lngStr := c.FormValue("maps_lng"); lngStr != "" {
			if lng, err := strconv.ParseFloat(lngStr, 64); err == nil {
				req.MapsLng = &lng
			}
		}

		// Handle ONT photo upload
		if file, err := c.FormFile("ont_photo"); err == nil && file != nil {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
				return response.ValidationError(c, map[string]string{"ont_photo": "format harus JPG, JPEG, atau PNG"})
			}
			if file.Size > 5*1024*1024 {
				return response.ValidationError(c, map[string]string{"ont_photo": "ukuran maksimal 5MB"})
			}

			_ = os.MkdirAll("./uploads/ont", 0755)
			savePath := "./uploads/ont/" + id + ext
			if err := c.SaveFile(file, savePath); err != nil {
				h.logger.Warn("failed to save ONT photo file", zap.Error(err))
			} else {
				ontPhotoPath = savePath
			}
		}
	} else {
		if err := c.BodyParser(&req); err != nil {
			return response.ValidationError(c, nil)
		}
	}

	if req.ONTSerialNumber == "" {
		return response.ValidationError(c, fiber.Map{
			"ont_serial_number": "wajib diisi",
		})
	}

	input := service.ActivateInput{
		ONTSerialNumber: req.ONTSerialNumber,
		OLTPortConfigID: req.OLTPortConfigID,
		MapsLat:         req.MapsLat,
		MapsLng:         req.MapsLng,
		ODPInfo:         req.ODPInfo,
		GoogleMapsLink:  req.GoogleMapsLink,
		ONTPhotoPath:    ontPhotoPath,
	}

	if err := h.svc.CompleteInstallation(c.Context(), id, techID, role, input); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{
		"status":  "waiting_payment",
		"message": "Instalasi selesai dipasang. Menunggu pembayaran pelanggan.",
	}, "Instalasi diselesaikan")
}

// Claim handles PATCH /technician/registrations/:id/claim
func (h *TechnicianHandler) Claim(c *fiber.Ctx) error {
	id := c.Params("id")
	techID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	if err := h.svc.ClaimTicket(c.Context(), id, techID, role); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": "survey_scheduled"}, "Tiket berhasil diambil")
}

// RetryProvisioning handles PATCH /registrations/:id/retry-provisioning
func (h *TechnicianHandler) RetryProvisioning(c *fiber.Ctx) error {
	id := c.Params("id")
	techID := c.Locals("user_id").(string)
	role := c.Locals("role").(string)

	// Transition provisioning_failed → provisioning
	input := service.ActivateInput{}
	if err := h.svc.TriggerProvisioning(c.Context(), id, techID, role, input); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{"status": "provisioning"}, "Retry provisioning dimulai")
}
