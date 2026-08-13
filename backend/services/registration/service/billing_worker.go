package service

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"isp-platform/registration/internal/config"
	"isp-platform/registration/pkg/crypto"
	"isp-platform/registration/pkg/mikrotik"
	notif "isp-platform/registration/services/notification/service"
	"isp-platform/registration/services/registration/model"
	"isp-platform/registration/services/registration/repository"
)

type BillingWorker struct {
	repo     repository.RegistrationRepository
	notifSvc notif.NotificationService
	cfg      *config.Config
	logger   *zap.Logger
}

func NewBillingWorker(
	repo repository.RegistrationRepository,
	notifSvc notif.NotificationService,
	cfg *config.Config,
	logger *zap.Logger,
) *BillingWorker {
	return &BillingWorker{
		repo:     repo,
		notifSvc: notifSvc,
		cfg:      cfg,
		logger:   logger,
	}
}

func (w *BillingWorker) Start(ctx context.Context) {
	w.logger.Info("Billing worker started")
	
	// Run immediately on startup
	w.RunDailyCheck(ctx)

	// Run every 24 hours
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("Billing worker stopped")
			return
		case <-ticker.C:
			w.RunDailyCheck(ctx)
		}
	}
}

func (w *BillingWorker) RunDailyCheck(ctx context.Context) {
	w.logger.Info("Running daily billing & suspension checks...")
	
	// 1. Generate Invoices
	w.generateMonthlyInvoices(ctx)

	// 2. Process Auto-Isolir (Suspensions)
	w.processAutoSuspensions(ctx)
}

func (w *BillingWorker) generateMonthlyInvoices(ctx context.Context) {
	now := time.Now()
	day := now.Day()
	
	// Get all customers whose activation day matches today
	registrations, err := w.repo.GetActiveRegistrationsForBilling(ctx, day)
	if err != nil {
		w.logger.Error("failed to get active registrations for billing", zap.Error(err))
		return
	}

	for _, reg := range registrations {
		// Skip if activated in the current month/year to prevent immediate double-billing
		if reg.ActivatedAt != nil && reg.ActivatedAt.Year() == now.Year() && reg.ActivatedAt.Month() == now.Month() {
			continue
		}

		period := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		
		// Check if invoice already generated for this period and customer
		filter := model.InvoiceFilter{
			RegistrationID: reg.ID,
		}
		invoices, _, err := w.repo.ListInvoices(ctx, filter)
		if err == nil {
			alreadyExists := false
			for _, inv := range invoices {
				if inv.Period.Year() == period.Year() && inv.Period.Month() == period.Month() {
					alreadyExists = true
					break
				}
			}
			if alreadyExists {
				continue
			}
		}

		// Fetch package to get package price
		pkg, err := w.repo.GetPackageByID(ctx, reg.PackageID)
		if err != nil {
			w.logger.Error("failed to get package for invoice", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}

		// Calculate Tax (default 11%)
		taxRateStr := "11"
		var taxRate float64
		fmt.Sscanf(taxRateStr, "%f", &taxRate)
		
		// Invoices are tax-inclusive by default
		amount := pkg.PriceMonthly
		subtotal := int64(float64(amount) / (1 + taxRate/100))
		taxAmount := amount - subtotal

		// Generate Invoice Number
		dateStr := now.Format("20060102")
		randomSerial := now.UnixNano() % 10000
		invNum := fmt.Sprintf("INV/%s/%04d", dateStr, randomSerial)

		// Due date: default 7 days from now
		dueDate := now.AddDate(0, 0, 7)

		inv := &model.Invoice{
			InvoiceNumber:  invNum,
			RegistrationID: reg.ID,
			Period:         period,
			Amount:         subtotal,
			TaxAmount:      taxAmount,
			DueDate:        dueDate,
			Status:         model.InvoiceStatusUnpaid,
		}

		createdInv, err := w.repo.CreateInvoice(ctx, inv)
		if err != nil {
			w.logger.Error("failed to create monthly invoice", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}

		w.logger.Info("generated monthly invoice",
			zap.String("inv_number", createdInv.InvoiceNumber),
			zap.String("customer", reg.FullName),
		)

		// Send notification
		invoiceURL := fmt.Sprintf("%s/billing-invoice/%s", w.cfg.AppBaseURL, createdInv.ID)
		periodStr := period.Format("January 2006")
		totalAmount := createdInv.Amount + createdInv.TaxAmount

		// Send WhatsApp
		err = w.notifSvc.SendMonthlyInvoiceLink(ctx, &reg, createdInv.InvoiceNumber, totalAmount, periodStr, invoiceURL)
		if err != nil {
			w.logger.Error("failed to send monthly invoice WA link", zap.String("inv_id", createdInv.ID), zap.Error(err))
		}

		// Send Email
		err = w.notifSvc.SendMonthlyInvoiceEmail(ctx, &reg, createdInv.InvoiceNumber, totalAmount, periodStr, invoiceURL)
		if err != nil {
			w.logger.Error("failed to send monthly invoice email", zap.String("inv_id", createdInv.ID), zap.Error(err))
		}
	}
}

func (w *BillingWorker) processAutoSuspensions(ctx context.Context) {
	// Find unpaid invoices past their due date
	overdueInvoices, err := w.repo.GetOverdueInvoices(ctx)
	if err != nil {
		w.logger.Error("failed to list overdue invoices", zap.Error(err))
		return
	}

	for _, inv := range overdueInvoices {
		reg, err := w.repo.GetByID(ctx, inv.RegistrationID)
		if err != nil {
			w.logger.Error("failed to get registration for overdue invoice", zap.String("reg_id", inv.RegistrationID), zap.Error(err))
			continue
		}

		// Skip if already in isolir status
		if reg.Status == model.StatusIsolir {
			// Update invoice status to overdue if not already
			if inv.Status == model.InvoiceStatusUnpaid {
				_ = w.repo.UpdateInvoiceStatus(ctx, inv.ID, model.InvoiceStatusOverdue, nil, nil)
			}
			continue
		}

		// Update registration status to 'isolir'
		err = w.repo.UpdateStatus(ctx, reg.ID, model.StatusIsolir, "system", "system", "Akun terisolir otomatis karena keterlambatan pembayaran")
		if err != nil {
			w.logger.Error("failed to transition registration status to isolir", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}

		// Update invoice status to overdue
		_ = w.repo.UpdateInvoiceStatus(ctx, inv.ID, model.InvoiceStatusOverdue, nil, nil)

		// Mikrotik Suspension Action
		if reg.PPPoEUsername != nil && *reg.PPPoEUsername != "" {
			mConfigs, err := w.repo.ListMikrotikConfigs(ctx)
			if err == nil {
				var activeConfig *model.MikrotikConfig
				for _, m := range mConfigs {
					if m.IsActive {
						activeConfig = &m
						break
					}
				}

				if activeConfig != nil {
					plainPassword, err := crypto.Decrypt(activeConfig.PasswordEnc, w.cfg.AppSecretKey)
					if err == nil {
						client := mikrotik.NewClient(activeConfig.Host, activeConfig.Port, activeConfig.Username, plainPassword)
						
						// Change profile to 'Isolir'
						err = client.UpdateSecretProfile(*reg.PPPoEUsername, "Isolir")
						if err != nil {
							// If change profile fails, fall back to disabling the secret
							w.logger.Warn("failed to set Isolir profile, disabling secret instead", zap.String("username", *reg.PPPoEUsername), zap.Error(err))
							_ = client.ToggleSecret(*reg.PPPoEUsername, true)
						}

						// Force disconnect the active session so the isolation speed profile (or disable state) is applied instantly
						_ = client.DisconnectActiveConnection(*reg.PPPoEUsername)

						w.logger.Info("applied auto-isolation (isolir) for customer",
							zap.String("username", *reg.PPPoEUsername),
							zap.String("inv_number", inv.InvoiceNumber),
						)
					}
				}
			}
		}
	}
}
