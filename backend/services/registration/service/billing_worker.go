package service

import (
	"context"
	"fmt"
	"strconv"
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

	// Read billing scheme from DB config
	scheme, err := w.repo.GetConfigValue(ctx, "billing_scheme")
	if err != nil {
		w.logger.Warn("failed to read billing_scheme config, defaulting to postpaid", zap.Error(err))
		scheme = "postpaid"
	}

	switch scheme {
	case "prepaid":
		w.logger.Info("Billing scheme: PREPAID")
		w.processPrepaidExpirations(ctx)
		w.sendPrepaidReminders(ctx)
	default:
		w.logger.Info("Billing scheme: POSTPAID")
		w.generatePostpaidInvoices(ctx)
		w.processPostpaidSuspensions(ctx)
		w.sendPostpaidReminders(ctx)
	}
}

// ─── POSTPAID ────────────────────────────────────────────────────────────────

func (w *BillingWorker) generatePostpaidInvoices(ctx context.Context) {
	now := time.Now()

	// Read billing_due_day config (default: 5)
	dueDayStr, _ := w.repo.GetConfigValue(ctx, "billing_due_day")
	dueDay, err := strconv.Atoi(dueDayStr)
	if err != nil || dueDay < 1 || dueDay > 28 {
		dueDay = 5
	}

	// Only generate invoices on the configured due day
	if now.Day() != dueDay {
		w.logger.Info("generatePostpaidInvoices: not the billing due day, skipping",
			zap.Int("today", now.Day()), zap.Int("due_day", dueDay))
		return
	}

	// Read grace period (for setting the due date on the invoice)
	graceDaysStr, _ := w.repo.GetConfigValue(ctx, "billing_grace_period_days")
	graceDays, err := strconv.Atoi(graceDaysStr)
	if err != nil || graceDays < 0 {
		graceDays = 7
	}

	// Get all active customers
	registrations, err := w.repo.GetActiveRegistrationsForBilling(ctx, 0)
	if err != nil {
		w.logger.Error("failed to get active registrations for billing", zap.Error(err))
		return
	}

	period := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	for _, reg := range registrations {
		// Skip if activated this month (prevent immediate double-billing)
		if reg.ActivatedAt != nil && reg.ActivatedAt.Year() == now.Year() && reg.ActivatedAt.Month() == now.Month() {
			continue
		}

		// Check if invoice already generated for this period
		filter := model.InvoiceFilter{RegistrationID: reg.ID}
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

		pkg, err := w.repo.GetPackageByID(ctx, reg.PackageID)
		if err != nil {
			w.logger.Error("failed to get package for invoice", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}

		taxAmount, subtotal := w.calcTax(ctx, pkg.PriceMonthly)
		dueDate := now.AddDate(0, 0, graceDays)
		invNum := fmt.Sprintf("INV/%s/%04d", now.Format("20060102"), now.UnixNano()%10000)

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

		w.logger.Info("generated postpaid invoice",
			zap.String("inv_number", createdInv.InvoiceNumber),
			zap.String("customer", reg.FullName),
		)
		w.sendInvoiceNotification(ctx, &reg, createdInv)
	}
}

func (w *BillingWorker) processPostpaidSuspensions(ctx context.Context) {
	// Grace period: suspend only after due_date + grace_period_days
	graceDaysStr, _ := w.repo.GetConfigValue(ctx, "billing_grace_period_days")
	graceDays, err := strconv.Atoi(graceDaysStr)
	if err != nil || graceDays < 0 {
		graceDays = 7
	}
	// Cutoff = today minus grace period days (invoices due before this date are overdue)
	cutoff := time.Now().AddDate(0, 0, -graceDays)

	overdueInvoices, err := w.repo.GetOverdueInvoices(ctx, cutoff)
	if err != nil {
		w.logger.Error("failed to list overdue invoices", zap.Error(err))
		return
	}

	for _, inv := range overdueInvoices {
		reg, err := w.repo.GetByID(ctx, inv.RegistrationID)
		if err != nil {
			continue
		}

		if reg.Status == model.StatusIsolir {
			if inv.Status == model.InvoiceStatusUnpaid {
				_ = w.repo.UpdateInvoiceStatus(ctx, inv.ID, model.InvoiceStatusOverdue, nil, nil)
			}
			continue
		}

		err = w.repo.UpdateStatus(ctx, reg.ID, model.StatusIsolir, "system", "system",
			fmt.Sprintf("Akun terisolir otomatis — tagihan %s melewati jatuh tempo + %d hari toleransi", inv.InvoiceNumber, graceDays))
		if err != nil {
			w.logger.Error("failed to isolate registration", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}
		_ = w.repo.UpdateInvoiceStatus(ctx, inv.ID, model.InvoiceStatusOverdue, nil, nil)
		w.applyMikrotikIsolation(ctx, reg)
	}
}

func (w *BillingWorker) sendPostpaidReminders(ctx context.Context) {
	reminderDaysStr, _ := w.repo.GetConfigValue(ctx, "billing_reminder_days_before")
	reminderDays, err := strconv.Atoi(reminderDaysStr)
	if err != nil || reminderDays <= 0 {
		reminderDays = 3
	}

	// Find unpaid invoices whose due_date is exactly reminderDays days from today
	reminderDate := time.Now().AddDate(0, 0, reminderDays)
	targetDate := time.Date(reminderDate.Year(), reminderDate.Month(), reminderDate.Day(), 0, 0, 0, 0, time.UTC)

	invoices, _, err := w.repo.ListInvoices(ctx, model.InvoiceFilter{})
	if err != nil {
		return
	}

	for _, inv := range invoices {
		if inv.Status != model.InvoiceStatusUnpaid {
			continue
		}
		dueDay := time.Date(inv.DueDate.Year(), inv.DueDate.Month(), inv.DueDate.Day(), 0, 0, 0, 0, time.UTC)
		if !dueDay.Equal(targetDate) {
			continue
		}
		reg, err := w.repo.GetByID(ctx, inv.RegistrationID)
		if err != nil {
			continue
		}
		invoiceURL := fmt.Sprintf("%s/billing-invoice/%s", w.cfg.AppBaseURL, inv.ID)
		periodStr := inv.Period.Format("January 2006")
		total := inv.Amount + inv.TaxAmount
		_ = w.notifSvc.SendMonthlyInvoiceLink(ctx, reg, inv.InvoiceNumber, total, periodStr, invoiceURL)
		w.logger.Info("sent postpaid payment reminder",
			zap.String("customer", reg.FullName),
			zap.String("inv", inv.InvoiceNumber),
		)
	}
}

// ─── PREPAID ─────────────────────────────────────────────────────────────────

func (w *BillingWorker) processPrepaidExpirations(ctx context.Context) {
	expired, err := w.repo.GetExpiredPrepaidRegistrations(ctx)
	if err != nil {
		w.logger.Error("failed to get expired prepaid registrations", zap.Error(err))
		return
	}

	for _, reg := range expired {
		err = w.repo.UpdateStatus(ctx, reg.ID, model.StatusIsolir, "system", "system",
			"Akun terisolir otomatis — masa aktif layanan prabayar telah berakhir")
		if err != nil {
			w.logger.Error("failed to isolate expired prepaid customer", zap.String("reg_id", reg.ID), zap.Error(err))
			continue
		}
		w.applyMikrotikIsolation(ctx, &reg)
		w.logger.Info("prepaid service expired — customer isolated",
			zap.String("customer", reg.FullName),
			zap.Timep("expired_at", reg.ServiceExpiresAt),
		)
	}
}

func (w *BillingWorker) sendPrepaidReminders(ctx context.Context) {
	reminderDaysStr, _ := w.repo.GetConfigValue(ctx, "billing_reminder_days_before")
	reminderDays, err := strconv.Atoi(reminderDaysStr)
	if err != nil || reminderDays <= 0 {
		reminderDays = 3
	}

	expiring, err := w.repo.GetExpiringPrepaidRegistrations(ctx, reminderDays)
	if err != nil {
		w.logger.Error("failed to get expiring prepaid registrations", zap.Error(err))
		return
	}

	for _, reg := range expiring {
		if reg.ServiceExpiresAt == nil {
			continue
		}
		expiryStr := reg.ServiceExpiresAt.Format("02 January 2006")
		msg := fmt.Sprintf(
			"Halo %s, masa aktif layanan internet Anda akan berakhir pada *%s*. Segera lakukan perpanjangan agar layanan tidak terputus.",
			reg.FullName, expiryStr,
		)
		_ = w.notifSvc.SendCustomMessage(ctx, reg.Phone, msg)
		w.logger.Info("sent prepaid expiry reminder",
			zap.String("customer", reg.FullName),
			zap.String("expires", expiryStr),
		)
	}
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// calcTax returns (taxAmount, subtotal) given inclusive total price.
func (w *BillingWorker) calcTax(ctx context.Context, totalPrice int64) (taxAmount, subtotal int64) {
	taxRateStr, _ := w.repo.GetConfigValue(ctx, "invoice_tax_rate")
	var taxRate float64
	fmt.Sscanf(taxRateStr, "%f", &taxRate)
	if taxRate <= 0 {
		taxRate = 11
	}
	subtotal = int64(float64(totalPrice) / (1 + taxRate/100))
	taxAmount = totalPrice - subtotal
	return
}

// sendInvoiceNotification sends WA + Email for a newly created invoice.
func (w *BillingWorker) sendInvoiceNotification(ctx context.Context, reg *model.Registration, inv *model.Invoice) {
	invoiceURL := fmt.Sprintf("%s/billing-invoice/%s", w.cfg.AppBaseURL, inv.ID)
	periodStr := inv.Period.Format("January 2006")
	total := inv.Amount + inv.TaxAmount

	if err := w.notifSvc.SendMonthlyInvoiceLink(ctx, reg, inv.InvoiceNumber, total, periodStr, invoiceURL); err != nil {
		w.logger.Error("failed to send WA invoice link", zap.String("inv_id", inv.ID), zap.Error(err))
	}
	if err := w.notifSvc.SendMonthlyInvoiceEmail(ctx, reg, inv.InvoiceNumber, total, periodStr, invoiceURL); err != nil {
		w.logger.Error("failed to send email invoice", zap.String("inv_id", inv.ID), zap.Error(err))
	}
}

// applyMikrotikIsolation disconnects a customer's PPPoE session via Mikrotik.
func (w *BillingWorker) applyMikrotikIsolation(ctx context.Context, reg *model.Registration) {
	if reg.PPPoEUsername == nil || *reg.PPPoEUsername == "" {
		return
	}
	mConfigs, err := w.repo.ListMikrotikConfigs(ctx)
	if err != nil {
		return
	}
	var activeConfig *model.MikrotikConfig
	for _, m := range mConfigs {
		if m.IsActive {
			activeConfig = &m
			break
		}
	}
	if activeConfig == nil {
		return
	}
	plainPassword, err := crypto.Decrypt(activeConfig.PasswordEnc, w.cfg.AppSecretKey)
	if err != nil {
		return
	}
	client := mikrotik.NewClient(activeConfig.Host, activeConfig.Port, activeConfig.Username, plainPassword)
	if err := client.UpdateSecretProfile(*reg.PPPoEUsername, "Isolir"); err != nil {
		w.logger.Warn("failed to set Isolir profile, disabling secret instead",
			zap.String("username", *reg.PPPoEUsername), zap.Error(err))
		_ = client.ToggleSecret(*reg.PPPoEUsername, true)
	}
	_ = client.DisconnectActiveConnection(*reg.PPPoEUsername)
	w.logger.Info("applied Mikrotik isolation", zap.String("username", *reg.PPPoEUsername))
}
