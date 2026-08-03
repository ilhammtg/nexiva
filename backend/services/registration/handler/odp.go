package handler

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"isp-platform/registration/internal/response"
	"isp-platform/registration/services/registration/model"
)

// ListODPs handles GET /admin/odps
func (h *CSAdminHandler) ListODPs(c *fiber.Ctx) error {
	odps, err := h.svc.ListODPs(c.Context())
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, odps, "")
}

type rawODPRequest struct {
	Code            string      `json:"code"`
	Name            string      `json:"name"`
	OLTPortConfigID interface{} `json:"olt_port_config_id"`
	TotalPorts      int         `json:"total_ports"`
	Latitude        interface{} `json:"latitude"`
	Longitude       interface{} `json:"longitude"`
	AddressNotes    string      `json:"address_notes"`
}

func parseRawODPRequest(raw rawODPRequest) model.CreateODPRequest {
	req := model.CreateODPRequest{
		Code:         strings.TrimSpace(raw.Code),
		Name:         strings.TrimSpace(raw.Name),
		TotalPorts:   raw.TotalPorts,
		AddressNotes: strings.TrimSpace(raw.AddressNotes),
	}

	if req.Code == "" {
		req.Code = fmt.Sprintf("ODP-%d", time.Now().Unix())
	}
	if req.Name == "" {
		req.Name = req.Code
	}
	if req.TotalPorts <= 0 {
		req.TotalPorts = 8
	}

	// Parse OLTPortConfigID safely
	if raw.OLTPortConfigID != nil {
		strVal := fmt.Sprintf("%v", raw.OLTPortConfigID)
		strVal = strings.TrimSpace(strVal)
		if strVal != "" && strVal != "<nil>" && strVal != "null" && strVal != "undefined" {
			if parsed, err := uuid.Parse(strVal); err == nil && parsed != uuid.Nil {
				req.OLTPortConfigID = &parsed
			}
		}
	}

	// Parse Latitude
	if raw.Latitude != nil {
		switch v := raw.Latitude.(type) {
		case float64:
			req.Latitude = v
		case int:
			req.Latitude = float64(v)
		case string:
			clean := strings.ReplaceAll(strings.TrimSpace(v), ",", ".")
			if f, err := strconv.ParseFloat(clean, 64); err == nil {
				req.Latitude = f
			}
		}
	}

	// Parse Longitude
	if raw.Longitude != nil {
		switch v := raw.Longitude.(type) {
		case float64:
			req.Longitude = v
		case int:
			req.Longitude = float64(v)
		case string:
			clean := strings.ReplaceAll(strings.TrimSpace(v), ",", ".")
			if f, err := strconv.ParseFloat(clean, 64); err == nil {
				req.Longitude = f
			}
		}
	}

	return req
}



// CreateODP handles POST /admin/odps
func (h *CSAdminHandler) CreateODP(c *fiber.Ctx) error {
	var raw rawODPRequest
	if err := c.BodyParser(&raw); err != nil {
		return response.ValidationError(c, nil)
	}

	req := parseRawODPRequest(raw)
	created, err := h.svc.CreateODP(c.Context(), &req)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, created, "Titik ODP berhasil ditambahkan")
}

// UpdateODP handles PUT /admin/odps/:id
func (h *CSAdminHandler) UpdateODP(c *fiber.Ctx) error {
	id := c.Params("id")
	var raw rawODPRequest
	if err := c.BodyParser(&raw); err != nil {
		return response.ValidationError(c, nil)
	}

	req := parseRawODPRequest(raw)
	updated, err := h.svc.UpdateODP(c.Context(), id, &req)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, updated, "Data ODP berhasil diperbarui")
}

// DeleteODP handles DELETE /admin/odps/:id
func (h *CSAdminHandler) DeleteODP(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.svc.DeleteODP(c.Context(), id); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, fiber.Map{"deleted": true}, "ODP berhasil dihapus")
}
