package handler

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"isp-platform/registration/services/registration/service"
)

type mockRegistrationService struct {
	service.RegistrationService
	completeInstallationFn func(ctx context.Context, id, technicianID, role string, input service.ActivateInput) error
}

func (m *mockRegistrationService) CompleteInstallation(ctx context.Context, id, technicianID, role string, input service.ActivateInput) error {
	if m.completeInstallationFn != nil {
		return m.completeInstallationFn(ctx, id, technicianID, role, input)
	}
	return nil
}

type mockWorker struct{}

func (w *mockWorker) RetryProvisioning(ctx interface{}, registrationID string) error {
	return nil
}

func TestTechnicianHandler_Activate_JSON(t *testing.T) {
	app := fiber.New()
	
	var receivedInput service.ActivateInput
	mockSvc := &mockRegistrationService{
		completeInstallationFn: func(ctx context.Context, id, technicianID, role string, input service.ActivateInput) error {
			receivedInput = input
			return nil
		},
	}
	
	logger := zap.NewNop()
	h := NewTechnicianHandler(mockSvc, &mockWorker{}, logger)
	
	app.Patch("/technician/registrations/:id/activate", func(c *fiber.Ctx) error {
		c.Locals("user_id", "tech-123")
		c.Locals("role", "technician")
		return h.Activate(c)
	})
	
	jsonBody := `{"ont_serial_number":"SN123","maps_lat":-6.2,"maps_lng":106.8,"odp_info":"ODP-1","google_maps_link":"http://gmaps"}`
	req := httptest.NewRequest("PATCH", "/technician/registrations/reg-456/activate", strings.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to test: %v", err)
	}
	
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	
	if receivedInput.ONTSerialNumber != "SN123" {
		t.Errorf("expected SN123, got %s", receivedInput.ONTSerialNumber)
	}
	if receivedInput.MapsLat == nil || *receivedInput.MapsLat != -6.2 {
		t.Errorf("expected Lat -6.2, got %v", receivedInput.MapsLat)
	}
}

func TestTechnicianHandler_Activate_Multipart(t *testing.T) {
	app := fiber.New()
	
	var receivedInput service.ActivateInput
	mockSvc := &mockRegistrationService{
		completeInstallationFn: func(ctx context.Context, id, technicianID, role string, input service.ActivateInput) error {
			receivedInput = input
			return nil
		},
	}
	
	logger := zap.NewNop()
	h := NewTechnicianHandler(mockSvc, &mockWorker{}, logger)
	
	app.Patch("/technician/registrations/:id/activate", func(c *fiber.Ctx) error {
		c.Locals("user_id", "tech-123")
		c.Locals("role", "technician")
		return h.Activate(c)
	})
	
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	_ = writer.WriteField("ont_serial_number", "SN789Multipart")
	_ = writer.WriteField("maps_lat", "-6.3")
	_ = writer.WriteField("maps_lng", "106.9")
	_ = writer.WriteField("odp_info", "ODP-Multipart")
	_ = writer.WriteField("google_maps_link", "http://gmaps-multipart")
	
	// mock file upload
	hPart, _ := writer.CreateFormFile("ont_photo", "ont_label.png")
	_, _ = io.WriteString(hPart, "fake png content")
	_ = writer.Close()
	
	req := httptest.NewRequest("PATCH", "/technician/registrations/reg-789/activate", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to test: %v", err)
	}
	
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	
	if receivedInput.ONTSerialNumber != "SN789Multipart" {
		t.Errorf("expected SN789Multipart, got %s", receivedInput.ONTSerialNumber)
	}
	if !strings.HasPrefix(receivedInput.ONTPhotoPath, "uploads/ont/reg-789.png") && !strings.HasPrefix(receivedInput.ONTPhotoPath, "./uploads/ont/reg-789.png") {
		t.Errorf("expected photo path to be stored for reg-789, got %s", receivedInput.ONTPhotoPath)
	}
}
