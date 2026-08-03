package service

import (
	"context"

	"isp-platform/registration/pkg/mikrotik"
	provModel "isp-platform/registration/services/provisioning/model"
	"isp-platform/registration/services/registration/model"
	"isp-platform/registration/services/registration/repository"
)

// SubmitInput is the input for a new customer registration.
type SubmitInput struct {
	FullName         string
	NIK              string
	Phone            string
	Email            string
	Province         string
	City             string
	District         string
	Village          string
	RT               string
	RW               string
	AddressDetail    string
	MapsLat          *float64
	MapsLng          *float64
	PackageID         string
	KTPFilePath       string
	GoogleMapsLink    string
	ONTSerialNumber   string
	OLTPortConfigID   string
}

// ApproveInput is the input for CS admin approving a registration.
type ApproveInput struct {
	TechnicianID      string
	SurveyScheduledAt string
	Notes             string
}

// ConfirmPaymentInput is the input for CS admin confirming payment.
type ConfirmPaymentInput struct {
	PaymentAmount int64
	PaymentDate   string
	PaymentBank   string
	Notes         string
}

// ScheduleInstallationInput is the input for scheduling installation.
type ScheduleInstallationInput struct {
	TechnicianID            string
	InstallationScheduledAt string
	InstallationFee         int64
	PPPoEUsername           string
	Notes                   string
}

// SurveyResultInput is the input for the technician submitting survey results.
type SurveyResultInput struct {
	IsFeasible              *bool
	Status                  string // "feasible", "failed", "pending"
	CableLengthM            int
	Notes                   string
	InstallationFeeEstimate int64
}

// ActivateInput is the input for the technician triggering provisioning.
type ActivateInput struct {
	ONTSerialNumber string
	OLTPortConfigID string
	MapsLat         *float64
	MapsLng         *float64
	ODPInfo         string
	GoogleMapsLink  string
	ONTPhotoPath    string
	PPPoEUsername   string
	PPPoEPassword   string
}

// RegistrationService defines the business logic contract for registrations.
type RegistrationService interface {
	// Submit creates a new registration from a customer's form.
	Submit(ctx context.Context, input SubmitInput) (*model.Registration, error)

	// CheckStatus retrieves public-facing status for a registration.
	CheckStatus(ctx context.Context, phone, regNumber string) (*model.Registration, []model.RegistrationLog, error)

	// ListPackages returns active packages for the public form.
	ListPackages(ctx context.Context) ([]model.Package, error)

	// ListAllPackages returns all packages including inactive (for admin).
	ListAllPackages(ctx context.Context) ([]model.Package, error)

	// GetPackageByID returns a single package by its ID.
	GetPackageByID(ctx context.Context, id string) (*model.Package, error)


	// AdminList returns filtered paginated registrations for CS/owner.
	AdminList(ctx context.Context, filter repository.ListFilter) ([]model.Registration, int, error)

	// GetDetail returns a full registration record with its logs.
	GetDetail(ctx context.Context, id string) (*model.Registration, []model.RegistrationLog, error)

	// Approve transitions status pending_review → survey_scheduled.
	Approve(ctx context.Context, id, approverID, approverRole string, input ApproveInput) error

	// Reject transitions status pending_review → rejected.
	Reject(ctx context.Context, id, rejectorID, role, reason string) error

	// ConfirmPayment transitions waiting_payment → payment_confirmed.
	ConfirmPayment(ctx context.Context, id, confirmedByID, role string, input ConfirmPaymentInput) error

	// ScheduleInstallation transitions payment_confirmed → installation_scheduled.
	ScheduleInstallation(ctx context.Context, id, scheduledByID, role string, input ScheduleInstallationInput) error

	// UpdateInternalNotes updates CS internal notes without status change.
	UpdateInternalNotes(ctx context.Context, id, notes string) error

	// UpdateRegistration updates any registration/customer fields directly.
	UpdateRegistration(ctx context.Context, id string, fields map[string]interface{}) error

	// Delete soft-deletes a registration.
	Delete(ctx context.Context, id string) error

	// TechnicianSchedule returns a technician's assigned tasks.
	TechnicianSchedule(ctx context.Context, technicianID, date, taskType string) ([]model.Registration, error)

	// ClaimTicket allows a technician to claim an unassigned registration ticket.
	ClaimTicket(ctx context.Context, id, technicianID, role string) error

	// UpdateSurveyResult transitions survey_scheduled → survey_done or survey_failed.
	UpdateSurveyResult(ctx context.Context, id, technicianID, role string, input SurveyResultInput) error

	// TriggerProvisioning transitions installation_scheduled → provisioning and dispatches job.
	TriggerProvisioning(ctx context.Context, id, technicianID, role string, input ActivateInput) error

	// GetNextCustomerNumber retrieves the next available customer number.
	GetNextCustomerNumber(ctx context.Context) (string, error)
	GetNextCustomerNumberForRegistration(ctx context.Context, registrationID string) (string, error)

	// CompleteInstallation transitions installation_scheduled → waiting_payment.
	CompleteInstallation(ctx context.Context, id, technicianID, role string, input ActivateInput) error

	// Dashboard returns summary counts for the owner.
	Dashboard(ctx context.Context, period string) (map[string]int, error)

	// CreatePackage creates a new internet package.
	CreatePackage(ctx context.Context, p *model.Package) (*model.Package, error)

	// UpdatePackage updates an existing internet package.
	UpdatePackage(ctx context.Context, p *model.Package) error

	// TogglePackage flips is_active for a package.
	TogglePackage(ctx context.Context, id string) (bool, error)

	// ListOLTPorts returns all OLT port configurations.
	ListOLTPorts(ctx context.Context) ([]model.OLTPortConfig, error)

	// CreateOLTPort creates a new OLT port configuration.
	CreateOLTPort(ctx context.Context, p *model.OLTPortConfig) (*model.OLTPortConfig, error)

	// UpdateOLTPort updates an existing OLT port configuration.
	UpdateOLTPort(ctx context.Context, p *model.OLTPortConfig) error

	// DeleteOLTPort deletes an OLT port configuration.
	DeleteOLTPort(ctx context.Context, id string) error

	// ListConfigs returns all app config entries.
	ListConfigs(ctx context.Context) ([]model.AppConfig, error)

	// UpdateConfig updates a single config value.
	UpdateConfig(ctx context.Context, key, value, updatedBy string) error

	// ListActivityLogs returns the audit trail (for owner).
	ListActivityLogs(ctx context.Context, filter repository.ListFilter) ([]model.RegistrationLog, int, error)

	// MikrotikConfig CRUD & Test
	ListMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error)
	GetMikrotikConfig(ctx context.Context, id string) (*model.MikrotikConfig, error)
	CreateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig, plainPassword string) (*model.MikrotikConfig, error)
	UpdateMikrotikConfig(ctx context.Context, id string, m *model.MikrotikConfig, plainPassword string) error
	DeleteMikrotikConfig(ctx context.Context, id string) error
	ToggleMikrotikConfig(ctx context.Context, id string) (bool, error)
	TestMikrotikConnection(ctx context.Context, id string) (bool, error)

	// Real Mikrotik Live Operations
	GetMikrotikResources(ctx context.Context, id string) (*mikrotik.ResourceInfo, error)
	GetMikrotikActiveConnections(ctx context.Context, id string) ([]mikrotik.ActiveConnection, error)
	GetMikrotikPPPSecrets(ctx context.Context, id string) ([]mikrotik.PPPSecret, error)
	GetMikrotikTraffic(ctx context.Context, id string) ([]mikrotik.InterfaceTraffic, error)
	GetMikrotikLogs(ctx context.Context, id string) ([]mikrotik.LogEntry, error)
	DisconnectMikrotikActiveConnection(ctx context.Context, id string, name string) error
	ToggleMikrotikSecret(ctx context.Context, id string, name string, disabled bool) error
	AddMikrotikSecret(ctx context.Context, id string, name, password, profile, service string) error

	// GetProvisioningLogs returns provisioning logs for a registration.
	GetProvisioningLogs(ctx context.Context, registrationID string) ([]provModel.ProvisioningLog, error)

	// ResendNotification sends WhatsApp & Email notifications again for a registration.
	ResendNotification(ctx context.Context, id string, notifType string) (*ResendNotifResult, error)

	// ODP Management
	ListODPs(ctx context.Context) ([]model.ODP, error)
	CreateODP(ctx context.Context, req *model.CreateODPRequest) (*model.ODP, error)
	UpdateODP(ctx context.Context, id string, req *model.CreateODPRequest) (*model.ODP, error)
	DeleteODP(ctx context.Context, id string) error
}

type ResendNotifResult struct {
	WASent     bool   `json:"wa_sent"`
	WAError    string `json:"wa_error,omitempty"`
	EmailSent  bool   `json:"email_sent"`
	EmailError string `json:"email_error,omitempty"`
	Message    string `json:"message"`
}
