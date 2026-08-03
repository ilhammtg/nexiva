package model

import "time"

// MikrotikConfig represents a row in the mikrotik_configs table.
type MikrotikConfig struct {
	ID            string     `db:"id" json:"id"`
	Name          string     `db:"name" json:"name"`
	Host          string     `db:"host" json:"host"`
	Port          int        `db:"port" json:"port"`
	Username      string     `db:"username" json:"username"`
	PasswordEnc   string     `db:"password_enc" json:"-"` // never expose encrypted password in JSON
	IsActive      bool       `db:"is_active" json:"is_active"`
	LastCheckedAt *time.Time `db:"last_checked_at" json:"last_checked_at"`
	IsOnline      *bool      `db:"is_online" json:"is_online"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
}
