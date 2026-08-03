package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"isp-platform/registration/pkg/olt/driver"
)

type OltFetchRequest struct {
	Brand    string `json:"brand"`
	IP       string `json:"ip"`
	Username string `json:"username"`
	Password string `json:"password"`
	Port     int    `json:"port"`
	Sync     bool   `json:"sync"`

	OnuIndex string `json:"onuIndex,omitempty"`
}

type OltHandler struct {
	rdb *redis.Client
}

func NewOltHandler(rdb *redis.Client) *OltHandler {
	return &OltHandler{rdb: rdb}
}

func defaultPortForBrand(brand string) int {
	switch strings.ToLower(strings.TrimSpace(brand)) {
	case "zte", "zte_c300", "zte_c600":
		return 22
	case "vsol", "vsol_gpon":
		return 80
	case "hioso", "hioso_gpon":
		return 80
	default:
		return 22
	}
}

func defaultUsernameForBrand(brand string) string {
	return "admin"
}

func (h *OltHandler) getDriver(c *fiber.Ctx) (driver.OLTDriver, *OltFetchRequest, error) {
	var req OltFetchRequest
	if err := c.BodyParser(&req); err != nil {
		return nil, nil, fmt.Errorf("invalid request body")
	}

	if req.IP == "" || req.Brand == "" {
		return nil, nil, fmt.Errorf("brand and ip are required")
	}

	if req.Port == 0 {
		req.Port = defaultPortForBrand(req.Brand)
	}

	if req.Username == "" {
		req.Username = defaultUsernameForBrand(req.Brand)
	}

	addr := fmt.Sprintf("%s:%d", req.IP, req.Port)
	drv, err := driver.NewOLTDriver(req.Brand, addr, req.Username, req.Password)
	if err != nil {
		return nil, nil, err
	}

	return drv, &req, nil
}

func (h *OltHandler) FetchPorts(c *fiber.Ctx) error {
	drv, req, err := h.getDriver(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}
	defer drv.Close()

	fetchCtx, fetchCancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer fetchCancel()

	ports, err := drv.FetchPorts(fetchCtx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("failed to fetch ports: %v", err),
		})
	}

	if h.rdb != nil {
		cacheKey := fmt.Sprintf("olt:ports:%s", req.IP)
		if serialized, err := json.Marshal(ports); err == nil {
			_ = h.rdb.Set(c.Context(), cacheKey, serialized, 5*time.Minute).Err()
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    ports,
	})
}

func (h *OltHandler) FetchONUs(c *fiber.Ctx) error {
	drv, _, err := h.getDriver(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}
	defer drv.Close()

	fetchCtx, fetchCancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer fetchCancel()

	onus, err := drv.FetchONUs(fetchCtx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("failed to fetch onus: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    onus,
	})
}

func (h *OltHandler) FetchUnconfiguredONUs(c *fiber.Ctx) error {
	drv, _, err := h.getDriver(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}
	defer drv.Close()

	fetchCtx, fetchCancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer fetchCancel()

	unconfigured, err := drv.FetchUnconfiguredONUs(fetchCtx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("failed to fetch unconfigured onus: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    unconfigured,
	})
}

func (h *OltHandler) FetchPowerAttenuation(c *fiber.Ctx) error {
	drv, req, err := h.getDriver(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}
	defer drv.Close()

	if req.OnuIndex == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "onuIndex is required",
		})
	}

	fetchCtx, fetchCancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer fetchCancel()

	oltRx, onuRx, err := drv.FetchPowerAttenuation(fetchCtx, req.OnuIndex)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("failed to fetch power attenuation: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"onuIndex":   req.OnuIndex,
		"oltRxPower": oltRx,
		"onuRxPower": onuRx,
	})
}

func (h *OltHandler) TestConnection(c *fiber.Ctx) error {
	drv, req, err := h.getDriver(c)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"success":   false,
			"connected": false,
			"message":   fmt.Sprintf("Koneksi Gagal: %v", err),
		})
	}
	defer drv.Close()

	fetchCtx, fetchCancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer fetchCancel()

	ports, err := drv.FetchPorts(fetchCtx)
	if err != nil {
		return c.JSON(fiber.Map{
			"success":   true,
			"connected": true,
			"message":   fmt.Sprintf("Terhubung ke OLT %s (%s:%d), namun gagal membaca port: %v", req.Brand, req.IP, req.Port, err),
			"portCount": 0,
		})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"connected": true,
		"message":   fmt.Sprintf("Berhasil terhubung ke %s OLT (%s:%d)! Terdeteksi %d Port GPON.", req.Brand, req.IP, req.Port, len(ports)),
		"portCount": len(ports),
		"ports":     ports,
	})
}
