package response

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	svcerr "isp-platform/registration/internal/errors"
)

// mapError maps domain errors to HTTP status codes and error codes.
func mapError(err error) (httpStatus int, errCode string, message string) {
	switch {
	case errors.Is(err, svcerr.ErrNotFound):
		return fiber.StatusNotFound, "NOT_FOUND", "Resource tidak ditemukan"
	case errors.Is(err, svcerr.ErrInvalidPassword):
		return fiber.StatusUnauthorized, "INVALID_PASSWORD", "Kata sandi salah"
	case errors.Is(err, svcerr.ErrUserNotFound):
		return fiber.StatusUnauthorized, "USER_NOT_FOUND", "Email atau Nomor HP salah"
	case errors.Is(err, svcerr.ErrUnauthorized):
		return fiber.StatusUnauthorized, "UNAUTHORIZED", "Autentikasi diperlukan"
	case errors.Is(err, svcerr.ErrForbidden):
		return fiber.StatusForbidden, "FORBIDDEN", "Akses ditolak"
	case errors.Is(err, svcerr.ErrConflict):
		return fiber.StatusConflict, "CONFLICT", err.Error()
	case errors.Is(err, svcerr.ErrInvalidTransition):
		return fiber.StatusUnprocessableEntity, "INVALID_STATUS_TRANSITION", err.Error()
	case errors.Is(err, svcerr.ErrValidation):
		return fiber.StatusBadRequest, "VALIDATION_ERROR", err.Error()
	case errors.Is(err, svcerr.ErrProvisioningFailed):
		return fiber.StatusBadGateway, "PROVISIONING_ERROR", err.Error()
	default:
		// Log the actual error for developer debugging
		println("[INTERNAL ERROR]:", err.Error())
		return fiber.StatusInternalServerError, "INTERNAL_ERROR", "Terjadi kesalahan internal"
	}
}
