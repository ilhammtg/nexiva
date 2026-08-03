package repository

import (
	"context"

	"isp-platform/registration/services/provisioning/model"
)

// ProvisioningRepository defines data access for provisioning logs.
type ProvisioningRepository interface {
	// InsertLog saves a provisioning log entry.
	InsertLog(ctx context.Context, log *model.ProvisioningLog) error

	// GetLogs returns all provisioning log entries for a registration.
	GetLogs(ctx context.Context, registrationID string) ([]model.ProvisioningLog, error)

	GetProvisioningDetails(ctx context.Context, registrationID string) (*model.ProvisioningDetails, error)
	GetActiveMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error)
	UpdateRegistrationStatus(ctx context.Context, registrationID string, status string, notes string) error
}
