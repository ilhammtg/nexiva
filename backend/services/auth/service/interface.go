package service

import (
	"context"

	"isp-platform/registration/services/auth/model"
)

// AuthService defines the business logic contract for authentication.
type AuthService interface {
	// Login authenticates a user by identifier (phone or email)+password and returns JWT tokens.
	Login(ctx context.Context, identifier, password string) (*TokenPair, *model.User, error)

	// Refresh validates a refresh token and returns a new access token.
	Refresh(ctx context.Context, refreshToken string) (string, error)

	// ValidateToken validates an access token and returns the embedded claims.
	ValidateToken(tokenStr string) (*TokenClaims, error)

	// GetProfile returns the full profile of the currently authenticated user.
	GetProfile(ctx context.Context, userID string) (*model.User, error)

	// UpdateProfile updates editable fields (name, email, phone) for the given user.
	UpdateProfile(ctx context.Context, userID, fullName, email, phone string) (*model.User, error)

	// ChangePassword verifies the old password then sets a new one.
	ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error

	// ForgotPassword looks up the user by email or phone and sends a password-reset link.
	// Always returns nil even if not found (prevents enumeration).
	ForgotPassword(ctx context.Context, identifier string) error

	// ResetPassword validates the reset token, sets the new password, and invalidates the token.
	ResetPassword(ctx context.Context, token, newPassword string) error
}

// TokenPair holds an access token and a refresh token.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // seconds
}

// TokenClaims holds the parsed JWT payload.
type TokenClaims struct {
	UserID string
	Role   string
}
