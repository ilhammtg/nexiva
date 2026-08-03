package response

import (
	"github.com/gofiber/fiber/v2"
)

// SuccessResponse is the standard success response envelope.
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// PaginatedResponse is the standard paginated response envelope.
type PaginatedResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    *Meta       `json:"meta"`
}

// Meta holds pagination metadata.
type Meta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// ErrorResponse is the standard error response envelope.
type ErrorResponse struct {
	Success bool       `json:"success"`
	Error   *ErrorBody `json:"error"`
}

// ErrorBody holds error details.
type ErrorBody struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Success sends a 200 OK success response.
func Success(c *fiber.Ctx, data interface{}, message string) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

// Created sends a 201 Created success response.
func Created(c *fiber.Ctx, data interface{}, message string) error {
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

// Paginated sends a paginated success response.
func Paginated(c *fiber.Ctx, data interface{}, meta *Meta) error {
	return c.Status(fiber.StatusOK).JSON(PaginatedResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

// Error sends an error response derived from a Go error.
// It maps known sentinel errors to specific HTTP codes.
func Error(c *fiber.Ctx, err error) error {
	code, errCode, message := mapError(err)
	return ErrorRaw(c, code, errCode, message, nil)
}

// ErrorRaw sends an error response with explicit parameters.
func ErrorRaw(c *fiber.Ctx, httpStatus int, errCode, message string, details interface{}) error {
	return c.Status(httpStatus).JSON(ErrorResponse{
		Success: false,
		Error: &ErrorBody{
			Code:    errCode,
			Message: message,
			Details: details,
		},
	})
}

// ValidationError sends a 400 Validation error with field-level details.
func ValidationError(c *fiber.Ctx, details interface{}) error {
	return ErrorRaw(c, fiber.StatusBadRequest, "VALIDATION_ERROR", "Data tidak valid", details)
}
