// Package errors defines sentinel errors used across the application.
// Handlers map these to HTTP responses via internal/response.
package errors

import "errors"

var (
	// ErrNotFound is returned when a requested resource does not exist.
	ErrNotFound = errors.New("resource tidak ditemukan")

	// ErrUnauthorized is returned when authentication is missing or invalid.
	ErrUnauthorized = errors.New("autentikasi diperlukan")

	// ErrForbidden is returned when the authenticated user lacks permission.
	ErrForbidden = errors.New("akses ditolak")

	// ErrConflict is returned when a resource already exists (e.g. duplicate phone).
	ErrConflict = errors.New("data sudah ada")

	// ErrInvalidTransition is returned when a status transition is not allowed.
	ErrInvalidTransition = errors.New("transisi status tidak valid")

	// ErrProvisioningFailed is returned when Mikrotik or OLT provisioning fails.
	ErrProvisioningFailed = errors.New("provisioning gagal")

	// ErrValidation is returned for input validation failures.
	ErrValidation = errors.New("data tidak valid")

	// ErrInvalidPassword is returned when the login password does not match.
	ErrInvalidPassword = errors.New("kata sandi salah")

	// ErrUserNotFound is returned when the user credentials identifier is not found.
	ErrUserNotFound = errors.New("pengguna tidak ditemukan")
)
