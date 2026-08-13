package repository

import (
	"context"

	"isp-platform/registration/internal/utils"
	"isp-platform/registration/services/registration/model"
)

// ListFilter holds all filter options for listing registrations.
type ListFilter struct {
	Status          string
	Search          string
	DateFrom        string
	DateTo          string
	PackageID       string
	OLTPortConfigID string
	Pagination      utils.PaginationParams
}

// RegistrationRepository defines the data access contract for registrations.
type RegistrationRepository interface {
	// Create inserts a new registration inside a transaction and logs the initial status.
	Create(ctx context.Context, reg *model.Registration) (*model.Registration, error)

	// GetByID fetches a registration with its package info.
	GetByID(ctx context.Context, id string) (*model.Registration, error)

	// GetByRegNumber fetches by the human-readable registration number.
	GetByRegNumber(ctx context.Context, regNumber string) (*model.Registration, error)

	// GetByPhone fetches by the customer phone (most recent non-deleted).
	GetByPhone(ctx context.Context, phone string) (*model.Registration, error)

	// GetByNIK fetches by the customer NIK.
	GetByNIK(ctx context.Context, nik string) (*model.Registration, error)

	// List returns a filtered, paginated list of registrations.
	List(ctx context.Context, filter ListFilter) ([]model.Registration, int, error)

	// UpdateStatus transitions the status and inserts an audit log atomically.
	UpdateStatus(ctx context.Context, id string, status model.Status, changedBy, changedByRole, reason string) error

	// UpdateFields updates arbitrary fields (survey result, payment, etc).
	// Only non-nil pointer fields in the patch map are updated.
	UpdateFields(ctx context.Context, id string, fields map[string]interface{}) error

	// Delete soft-deletes a registration.
	Delete(ctx context.Context, id string) error

	// GetLogs returns the audit trail for a registration.
	GetLogs(ctx context.Context, registrationID string) ([]model.RegistrationLog, error)

	// ListPackages returns all packages (active only or all).
	ListPackages(ctx context.Context, activeOnly bool) ([]model.Package, error)

	// GetPackageByID returns a package by its ID.
	GetPackageByID(ctx context.Context, id string) (*model.Package, error)

	// CreatePackage inserts a new package.
	CreatePackage(ctx context.Context, p *model.Package) (*model.Package, error)

	// UpdatePackage updates an existing package.
	UpdatePackage(ctx context.Context, p *model.Package) error

	// TogglePackage flips is_active for the given package.
	TogglePackage(ctx context.Context, id string) (bool, error)

	// ListOLTPorts returns all OLT port configs.
	ListOLTPorts(ctx context.Context) ([]model.OLTPortConfig, error)

	// CreateOLTPort inserts a new OLT port config.
	CreateOLTPort(ctx context.Context, p *model.OLTPortConfig) (*model.OLTPortConfig, error)

	// UpdateOLTPort updates an existing OLT port config.
	UpdateOLTPort(ctx context.Context, p *model.OLTPortConfig) error

	// DeleteOLTPort deletes an OLT port config.
	DeleteOLTPort(ctx context.Context, id string) error

	// GetOLTPortByID returns an OLT port config by ID.
	GetOLTPortByID(ctx context.Context, id string) (*model.OLTPortConfig, error)

	// ListConfigs returns all app config key-value pairs.
	ListConfigs(ctx context.Context) ([]model.AppConfig, error)

	// UpdateConfig sets a config value by key.
	UpdateConfig(ctx context.Context, key, value, updatedBy string) error

	// GetLastCustomerNumber returns the latest customer number matching a prefix.
	GetLastCustomerNumber(ctx context.Context, prefix string) (string, error)

	// GetAllCustomerNumbers returns all non-null customer numbers.
	GetAllCustomerNumbers(ctx context.Context) ([]string, error)

	// GetLastRegistrationNumber returns the latest registration number matching a prefix.
	GetLastRegistrationNumber(ctx context.Context, prefix string) (string, error)

	// GetLogs returns all registration_logs (activity log for owner).
	ListActivityLogs(ctx context.Context, filter ListFilter) ([]model.RegistrationLog, int, error)

	// CountByStatus returns a map of status → count for dashboard summary.
	CountByStatus(ctx context.Context, period string) (map[string]int, error)

	// MikrotikConfig CRUD
	ListMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error)
	GetMikrotikConfigByID(ctx context.Context, id string) (*model.MikrotikConfig, error)
	CreateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig) (*model.MikrotikConfig, error)
	UpdateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig) error
	DeleteMikrotikConfig(ctx context.Context, id string) error
	ToggleMikrotikConfig(ctx context.Context, id string) (bool, error)
	UpdateMikrotikStatus(ctx context.Context, id string, isOnline bool) error

	// ODP CRUD
	ListODPs(ctx context.Context) ([]model.ODP, error)
	CreateODP(ctx context.Context, req *model.CreateODPRequest) (*model.ODP, error)
	UpdateODP(ctx context.Context, id string, req *model.CreateODPRequest) (*model.ODP, error)
	DeleteODP(ctx context.Context, id string) error

	// Invoices management
	CreateInvoice(ctx context.Context, inv *model.Invoice) (*model.Invoice, error)
	ListInvoices(ctx context.Context, filter model.InvoiceFilter) ([]model.Invoice, int, error)
	GetInvoiceByID(ctx context.Context, id string) (*model.Invoice, error)
	UpdateInvoiceStatus(ctx context.Context, id string, status model.InvoiceStatus, paymentBank *string, confirmedBy *string) error
	GetActiveRegistrationsForBilling(ctx context.Context, day int) ([]model.Registration, error)
	GetOverdueInvoices(ctx context.Context) ([]model.Invoice, error)
}

