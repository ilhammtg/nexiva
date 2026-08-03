package handler

import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"

	"isp-platform/registration/internal/response"
	"isp-platform/registration/services/auth/service"
)

// Handler handles HTTP requests for the auth service.
type Handler struct {
	svc    service.AuthService
	logger *zap.Logger
}

// NewHandler constructs an auth Handler.
func NewHandler(svc service.AuthService, log *zap.Logger) *Handler {
	return &Handler{svc: svc, logger: log}
}

type loginRequest struct {
	Identifier string `json:"identifier"`
	Phone      string `json:"phone"`
	Password   string `json:"password" validate:"required"`
}

// Login handles POST /api/v1/auth/login
func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	identity := req.Identifier
	if identity == "" {
		identity = req.Phone
	}
	if identity == "" || req.Password == "" {
		return response.ValidationError(c, fiber.Map{"identifier": "required", "password": "required"})
	}

	tokens, user, err := h.svc.Login(c.Context(), identity, req.Password)
	if err != nil {
		return response.Error(c, err)
	}

	h.logger.Info("user logged in",
		zap.String("user_id", user.ID),
		zap.String("role", string(user.Role)),
	)

	return response.Success(c, fiber.Map{
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_in":    tokens.ExpiresIn,
		"user": fiber.Map{
			"id":        user.ID,
			"full_name": user.FullName,
			"phone":     user.Phone,
			"role":      user.Role,
		},
	}, "Login berhasil")
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// Refresh handles POST /api/v1/auth/refresh
func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.RefreshToken == "" {
		return response.ValidationError(c, fiber.Map{"refresh_token": "required"})
	}

	accessToken, err := h.svc.Refresh(c.Context(), req.RefreshToken)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, fiber.Map{
		"access_token": accessToken,
		"expires_in":   3600 * 24,
	}, "Token diperbarui")
}

// Logout handles POST /api/v1/auth/logout
func (h *Handler) Logout(c *fiber.Ctx) error {
	// Stateless JWT — client discards tokens on their side.
	// Future: add token blacklist in Redis if needed.
	return response.Success(c, nil, "Logout berhasil")
}

// GetProfile handles GET /api/v1/profile
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	user, err := h.svc.GetProfile(c.Context(), userID)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user, "Profil berhasil diambil")
}

type updateProfileRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

// UpdateProfile handles PUT /api/v1/profile
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.FullName == "" {
		return response.ValidationError(c, fiber.Map{"full_name": "required"})
	}
	user, err := h.svc.UpdateProfile(c.Context(), userID, req.FullName, req.Email, req.Phone)
	if err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, user, "Profil berhasil diperbarui")
}

type changePasswordRequest struct {
	OldPassword     string `json:"old_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

// ChangePassword handles PUT /api/v1/profile/password
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.OldPassword == "" || req.NewPassword == "" || req.ConfirmPassword == "" {
		return response.ValidationError(c, fiber.Map{"password": "semua kolom password wajib diisi"})
	}
	if req.NewPassword != req.ConfirmPassword {
		return response.ValidationError(c, fiber.Map{"confirm_password": "konfirmasi password tidak cocok"})
	}
	if len(req.NewPassword) < 6 {
		return response.ValidationError(c, fiber.Map{"new_password": "password minimal 6 karakter"})
	}
	if err := h.svc.ChangePassword(c.Context(), userID, req.OldPassword, req.NewPassword); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Password berhasil diubah. Silakan login kembali.")
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword handles POST /api/v1/auth/forgot-password
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil || req.Email == "" {
		return response.ValidationError(c, fiber.Map{"email": "required"})
	}
	if err := h.svc.ForgotPassword(c.Context(), req.Email); err != nil {
		return response.ValidationError(c, fiber.Map{"email": err.Error()})
	}
	return response.Success(c, nil,
		"Instruksi reset password telah dikirim ke Email atau WhatsApp Anda.")
}

type resetPasswordRequest struct {
	Token           string `json:"token"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

// ResetPassword handles POST /api/v1/auth/reset-password
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ValidationError(c, nil)
	}
	if req.Token == "" {
		return response.ValidationError(c, fiber.Map{"token": "required"})
	}
	if req.NewPassword == "" || req.ConfirmPassword == "" {
		return response.ValidationError(c, fiber.Map{"password": "semua kolom password wajib diisi"})
	}
	if req.NewPassword != req.ConfirmPassword {
		return response.ValidationError(c, fiber.Map{"confirm_password": "konfirmasi password tidak cocok"})
	}
	if len(req.NewPassword) < 6 {
		return response.ValidationError(c, fiber.Map{"new_password": "password minimal 6 karakter"})
	}
	if err := h.svc.ResetPassword(c.Context(), req.Token, req.NewPassword); err != nil {
		return response.Error(c, err)
	}
	return response.Success(c, nil, "Password berhasil direset. Silakan login dengan password baru Anda.")
}
