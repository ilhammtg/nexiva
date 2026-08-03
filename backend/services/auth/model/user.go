package model

import "time"

// Role constants — must match CHECK constraint in DB.
type Role string

const (
	RoleCustomer   Role = "customer"
	RoleCSAdmin    Role = "cs_admin"
	RoleTechnician Role = "technician"
	RoleOwner      Role = "owner"
)

// User represents a row in the users table.
type User struct {
	ID           string     `db:"id"`
	FullName     string     `db:"full_name"`
	Email        *string    `db:"email"`
	Phone        string     `db:"phone"`
	PasswordHash *string    `db:"password_hash"`
	Role         Role       `db:"role"`
	IsActive     bool       `db:"is_active"`
	LastLoginAt  *time.Time `db:"last_login_at"`
	CreatedAt    time.Time  `db:"created_at"`
	UpdatedAt    time.Time  `db:"updated_at"`
	DeletedAt    *time.Time `db:"deleted_at"`
}
