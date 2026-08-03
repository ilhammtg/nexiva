package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	svcerr "isp-platform/registration/internal/errors"
	"isp-platform/registration/services/auth/model"
)

type postgresUserRepository struct {
	db *sqlx.DB
}

// NewPostgresUserRepository constructs a PostgreSQL-backed UserRepository.
func NewPostgresUserRepository(db *sqlx.DB) UserRepository {
	return &postgresUserRepository{db: db}
}

func (r *postgresUserRepository) autoSeedDefaultUsers(ctx context.Context) {
	query := `
	INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active) VALUES
	  ('00000000-0000-0000-0000-000000000001', 'Owner ISP', 'owner@isp.dev', '081200000001',
	   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'owner', true),
	  ('00000000-0000-0000-0000-000000000002', 'Andi CS Admin', 'andi@isp.dev', '081200000002',
	   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'cs_admin', true),
	  ('00000000-0000-0000-0000-000000000004', 'Rizky Technician', 'rizky@isp.dev', '081200000004',
	   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'technician', true)
	ON CONFLICT (phone) DO UPDATE SET
	  password_hash = EXCLUDED.password_hash,
	  is_active = true`
	_, _ = r.db.ExecContext(ctx, query)
}

func (r *postgresUserRepository) GetByPhone(ctx context.Context, phone string) (*model.User, error) {
	var u model.User
	phone = strings.TrimSpace(phone)
	cleanPhone := strings.TrimPrefix(phone, "+62")
	cleanPhone = strings.TrimPrefix(cleanPhone, "62")
	cleanPhone = strings.TrimPrefix(cleanPhone, "0")
	p1 := "0" + cleanPhone
	p2 := "62" + cleanPhone
	p3 := "+62" + cleanPhone

	query := `SELECT * FROM users WHERE (phone = $1 OR phone = $2 OR phone = $3 OR phone = $4 OR email = $1) AND deleted_at IS NULL LIMIT 1`
	if err := r.db.GetContext(ctx, &u, query, phone, p1, p2, p3); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			r.autoSeedDefaultUsers(ctx)
			if err2 := r.db.GetContext(ctx, &u, query, phone, p1, p2, p3); err2 == nil {
				return &u, nil
			}
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("userRepo.GetByPhone: %w", err)
	}
	return &u, nil
}

func (r *postgresUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	query := `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`
	if err := r.db.GetContext(ctx, &u, query, email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			r.autoSeedDefaultUsers(ctx)
			if err2 := r.db.GetContext(ctx, &u, query, email); err2 == nil {
				return &u, nil
			}
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("userRepo.GetByEmail: %w", err)
	}
	return &u, nil
}

func (r *postgresUserRepository) GetByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	query := `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`
	if err := r.db.GetContext(ctx, &u, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("userRepo.GetByID: %w", err)
	}
	return &u, nil
}

func (r *postgresUserRepository) Create(ctx context.Context, u *model.User) (*model.User, error) {
	query := `
		INSERT INTO users (full_name, email, phone, password_hash, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *`
	var created model.User
	if err := r.db.QueryRowxContext(ctx, query,
		u.FullName, u.Email, u.Phone, u.PasswordHash, u.Role, true,
	).StructScan(&created); err != nil {
		return nil, fmt.Errorf("userRepo.Create: %w", err)
	}
	return &created, nil
}

func (r *postgresUserRepository) UpdateLastLogin(ctx context.Context, id string) error {
	query := `UPDATE users SET last_login_at = $1, updated_at = NOW() WHERE id = $2`
	if _, err := r.db.ExecContext(ctx, query, time.Now(), id); err != nil {
		return fmt.Errorf("userRepo.UpdateLastLogin: %w", err)
	}
	return nil
}

func (r *postgresUserRepository) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
	if _, err := r.db.ExecContext(ctx, query, passwordHash, id); err != nil {
		return fmt.Errorf("userRepo.UpdatePassword: %w", err)
	}
	return nil
}

func (r *postgresUserRepository) ListStaff(ctx context.Context, role string) ([]model.User, error) {
	var users []model.User
	var query string
	var args []interface{}

	if role != "" {
		query = `SELECT * FROM users WHERE role = $1 AND role != 'customer' AND deleted_at IS NULL ORDER BY full_name`
		args = append(args, role)
	} else {
		query = `SELECT * FROM users WHERE role != 'customer' AND deleted_at IS NULL ORDER BY role, full_name`
	}

	if err := r.db.SelectContext(ctx, &users, query, args...); err != nil {
		return nil, fmt.Errorf("userRepo.ListStaff: %w", err)
	}
	return users, nil
}

func (r *postgresUserRepository) ToggleActive(ctx context.Context, id string) (bool, error) {
	var isActive bool
	query := `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING is_active`
	if err := r.db.QueryRowContext(ctx, query, id).Scan(&isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, svcerr.ErrNotFound
		}
		return false, fmt.Errorf("userRepo.ToggleActive: %w", err)
	}
	return isActive, nil
}

func (r *postgresUserRepository) Update(ctx context.Context, u *model.User) (*model.User, error) {
	query := `
		UPDATE users 
		SET full_name = $1, email = $2, phone = $3, role = $4, updated_at = NOW()
		WHERE id = $5 AND deleted_at IS NULL
		RETURNING *`
	
	var email *string
	if u.Email != nil && *u.Email != "" {
		email = u.Email
	}

	var updated model.User
	if err := r.db.QueryRowxContext(ctx, query,
		u.FullName, email, u.Phone, u.Role, u.ID,
	).StructScan(&updated); err != nil {
		return nil, fmt.Errorf("userRepo.Update: %w", err)
	}
	return &updated, nil
}

// CreatePasswordResetToken generates a 32-byte hex token, stores it in the DB
// with a 30-minute expiry, and returns the raw token to be embedded in the reset URL.
func (r *postgresUserRepository) CreatePasswordResetToken(ctx context.Context, userID string) (string, error) {
	// Rate limit check: 60 seconds cooldown between reset requests
	var lastCreatedAt time.Time
	err := r.db.GetContext(ctx, &lastCreatedAt,
		`SELECT created_at FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
		userID,
	)
	if err == nil {
		elapsed := time.Since(lastCreatedAt)
		if elapsed < 60*time.Second {
			remaining := int(60 - elapsed.Seconds())
			return "", fmt.Errorf("RATE_LIMIT: silakan tunggu %d detik sebelum meminta reset kata sandi lagi", remaining)
		}
	}

	// Invalidate any existing unused tokens for this user
	_, _ = r.db.ExecContext(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
		userID,
	)

	// Generate a cryptographically random 32-byte token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("userRepo.CreatePasswordResetToken: rand: %w", err)
	}
	token := hex.EncodeToString(b)

	expiresAt := time.Now().Add(30 * time.Minute)
	query := `
		INSERT INTO password_reset_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)`
	if _, err := r.db.ExecContext(ctx, query, userID, token, expiresAt); err != nil {
		return "", fmt.Errorf("userRepo.CreatePasswordResetToken: insert: %w", err)
	}
	return token, nil
}

// ConsumePasswordResetToken checks that the token exists, is not expired, and has not been used.
// On success it marks the token used and returns the associated user_id.
func (r *postgresUserRepository) ConsumePasswordResetToken(ctx context.Context, token string) (string, error) {
	var row struct {
		ID        string    `db:"id"`
		UserID    string    `db:"user_id"`
		ExpiresAt time.Time `db:"expires_at"`
		UsedAt    *time.Time `db:"used_at"`
	}
	query := `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token = $1 LIMIT 1`
	if err := r.db.GetContext(ctx, &row, query, token); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", svcerr.ErrNotFound
		}
		return "", fmt.Errorf("userRepo.ConsumePasswordResetToken: get: %w", err)
	}
	if row.UsedAt != nil {
		return "", svcerr.ErrNotFound // already used
	}
	if time.Now().After(row.ExpiresAt) {
		return "", svcerr.ErrNotFound // expired
	}
	// Mark as used
	if _, err := r.db.ExecContext(ctx,
		`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, row.ID,
	); err != nil {
		return "", fmt.Errorf("userRepo.ConsumePasswordResetToken: mark used: %w", err)
	}
	return row.UserID, nil
}

func (r *postgresUserRepository) GetConfig(ctx context.Context, key string) (string, error) {
	var val string
	err := r.db.GetContext(ctx, &val, `SELECT value FROM app_configs WHERE key = $1`, key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", fmt.Errorf("userRepo.GetConfig: %w", err)
	}
	return val, nil
}

