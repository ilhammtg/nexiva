package service

import (
	"context"

	provModel "isp-platform/registration/services/provisioning/model"
	"isp-platform/registration/services/registration/model"
)

// ProvisioningService defines the contract for provisioning orchestration.
type ProvisioningService interface {
	// Dispatch queues a provisioning job for the given registration.
	Dispatch(ctx context.Context, registrationID string) error

	// Retry re-queues a failed provisioning job.
	Retry(ctx context.Context, registrationID string) error

	// Jobs returns a channel from which the worker reads registration IDs.
	Jobs() <-chan string

	// GetLogs returns all logs for a registration.
	GetLogs(ctx context.Context, registrationID string) ([]provModel.ProvisioningLog, error)
}

// ProvisioningJob holds all data needed to provision a customer.
type ProvisioningJob struct {
	RegistrationID  string
	PPPoEUsername   string
	PPPoEPassword   string // decrypted, used only for Mikrotik API call
	MikrotikProfile string
	ONTSerialNumber string
	OLTPortConfig   *model.OLTPortConfig
	OLTLineProfile  int
	OLTSrvProfile   int
	VlanID          int
}
