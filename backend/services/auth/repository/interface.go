package repository

import (
	"context"

	"isp-platform/registration/services/auth/model"
)

// UserRepository defines the data access contract for users.
type UserRepository interface {
	// GetByPhone retrieves a non-deleted, active user by phone number.
	GetByPhone(ctx context.Context, phone string) (*model.User, error)

	// GetByEmail retrieves a non-deleted, active user by email.
	GetByEmail(ctx context.Context, email string) (*model.User, error)

	// GetByID retrieves a user by their UUID.
	GetByID(ctx context.Context, id string) (*model.User, error)

	// Create inserts a new user and returns the created row.
	Create(ctx context.Context, u *model.User) (*model.User, error)

	// UpdateLastLogin updates the last_login_at timestamp for the given user.
	UpdateLastLogin(ctx context.Context, id string) error

	// UpdatePassword updates the password_hash for the given user.
	UpdatePassword(ctx context.Context, id, passwordHash string) error

	// ListStaff returns all non-customer users, optionally filtered by role.
	ListStaff(ctx context.Context, role string) ([]model.User, error)

	// ToggleActive flips the is_active flag for the given user.
	ToggleActive(ctx context.Context, id string) (bool, error)

	// Update modifies user details (name, email, phone, role) for the given user.
	Update(ctx context.Context, u *model.User) (*model.User, error)

	// CreatePasswordResetToken stores a hashed reset token and returns the raw token.
	CreatePasswordResetToken(ctx context.Context, userID string) (string, error)

	// ConsumePasswordResetToken validates the token, marks it as used, and returns the owner user_id.
	// Returns ErrNotFound if the token is invalid/expired/already used.
	ConsumePasswordResetToken(ctx context.Context, token string) (string, error)

	// GetConfig retrieves a configuration value from the app_configs table.
	// Returns empty string if not found.
	GetConfig(ctx context.Context, key string) (string, error)
}
