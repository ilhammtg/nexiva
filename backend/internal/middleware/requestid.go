package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequestID injects a unique X-Request-ID header into every request.
// If the client already sends one, it is preserved.
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		reqID := c.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
		}
		c.Locals("request_id", reqID)
		c.Set("X-Request-ID", reqID)
		return c.Next()
	}
}
