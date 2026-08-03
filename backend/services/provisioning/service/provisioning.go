package service

import (
	"context"
	"fmt"
	"sync"

	"go.uber.org/zap"

	"isp-platform/registration/internal/config"
	"isp-platform/registration/services/provisioning/model"
	"isp-platform/registration/services/provisioning/repository"
)

type provisioningService struct {
	repo   repository.ProvisioningRepository
	cfg    *config.Config
	logger *zap.Logger
	jobs   chan string // channel of registration IDs
}

// NewProvisioningService constructs a ProvisioningService.
func NewProvisioningService(repo repository.ProvisioningRepository, cfg *config.Config, log *zap.Logger) ProvisioningService {
	return &provisioningService{
		repo:   repo,
		cfg:    cfg,
		logger: log,
		jobs:   make(chan string, 100),
	}
}

// Dispatch sends a provisioning job to the internal channel.
func (s *provisioningService) Dispatch(ctx context.Context, registrationID string) error {
	select {
	case s.jobs <- registrationID:
		s.logger.Info("provisioning job dispatched", zap.String("registration_id", registrationID))
		return nil
	default:
		return fmt.Errorf("provisioning queue full, cannot dispatch job for %s", registrationID)
	}
}

// Retry re-dispatches a failed job.
func (s *provisioningService) Retry(ctx context.Context, registrationID string) error {
	return s.Dispatch(ctx, registrationID)
}

// Jobs returns the job channel for the worker to consume.
func (s *provisioningService) Jobs() <-chan string {
	return s.jobs
}

// RunJob executes the full provisioning sequence for a registration.
// Mikrotik and OLT are provisioned in parallel using sync.WaitGroup.
func (s *provisioningService) RunJob(ctx context.Context, job ProvisioningJob) error {
	var wg sync.WaitGroup
	errChan := make(chan error, 2)

	// Mikrotik PPPoE
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := s.provisionMikrotik(ctx, job); err != nil {
			errChan <- fmt.Errorf("mikrotik: %w", err)
		}
	}()

	// OLT ZTE
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := s.provisionOLT(ctx, job); err != nil {
			errChan <- fmt.Errorf("olt: %w", err)
		}
	}()

	wg.Wait()
	close(errChan)

	var errs []string
	for err := range errChan {
		errs = append(errs, err.Error())
	}
	if len(errs) > 0 {
		return fmt.Errorf("provisioning failed: %v", errs)
	}
	return nil
}

// provisionMikrotik calls the Mikrotik RouterOS REST API to create a PPPoE secret.
func (s *provisioningService) provisionMikrotik(ctx context.Context, job ProvisioningJob) error {
	s.logger.Info("provisioning mikrotik",
		zap.String("registration_id", job.RegistrationID),
		zap.String("pppoe_username", job.PPPoEUsername),
	)
	// TODO: wire infrastructure/mikrotik client
	return nil
}

// provisionOLT executes the OLT ZTE SSH command sequence to register the ONT.
func (s *provisioningService) provisionOLT(ctx context.Context, job ProvisioningJob) error {
	s.logger.Info("provisioning OLT",
		zap.String("registration_id", job.RegistrationID),
		zap.String("ont_serial", job.ONTSerialNumber),
	)
	// TODO: wire infrastructure/olt client
	return nil
}

func (s *provisioningService) GetLogs(ctx context.Context, registrationID string) ([]model.ProvisioningLog, error) {
	return s.repo.GetLogs(ctx, registrationID)
}
