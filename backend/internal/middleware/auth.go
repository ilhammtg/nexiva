package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"

	"isp-platform/registration/internal/config"
	svcerr "isp-platform/registration/internal/errors"
	"isp-platform/registration/internal/response"
)

// Claims defines the JWT payload structure.
type Claims struct {
	UserID  string `json:"user_id"`
	Role    string `json:"role"`
	PwdHash string `json:"pwd_hash"`
	jwt.RegisteredClaims
}

// Auth is a Fiber middleware that validates the JWT Bearer token.
// It injects "user_id" and "role" into the request context locals.
func Auth(cfg *config.Config, db *sqlx.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return response.Error(c, svcerr.ErrUnauthorized)
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, svcerr.ErrUnauthorized
			}
			return []byte(cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			return response.Error(c, svcerr.ErrUnauthorized)
		}

		// Verify against DB to ensure user is active and password has not changed
		var dbUser struct {
			PasswordHash *string `db:"password_hash"`
			IsActive     bool    `db:"is_active"`
		}
		query := `SELECT password_hash, is_active FROM users WHERE id = $1 AND deleted_at IS NULL`
		if err := db.Get(&dbUser, query, claims.UserID); err != nil {
			return response.Error(c, svcerr.ErrUnauthorized)
		}

		if !dbUser.IsActive {
			return response.Error(c, svcerr.ErrUnauthorized)
		}

		if dbUser.PasswordHash != nil && *dbUser.PasswordHash != claims.PwdHash {
			return response.Error(c, svcerr.ErrUnauthorized)
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}

// Role is a Fiber middleware that restricts access to specific roles.
// Must be used after Auth middleware.
func Role(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok || role == "" {
			return response.Error(c, svcerr.ErrForbidden)
		}

		for _, allowed := range allowedRoles {
			if role == allowed {
				return c.Next()
			}
		}

		return response.Error(c, svcerr.ErrForbidden)
	}
}
