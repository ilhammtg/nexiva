package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"

	"isp-platform/registration/internal/config"
	"isp-platform/registration/internal/email"
	"isp-platform/registration/services/registration/model"
)

type notificationService struct {
	db     *sqlx.DB
	cfg    *config.Config
	logger *zap.Logger
	client *http.Client
	mailer *email.Sender
}

// NewNotificationService constructs a NotificationService.
func NewNotificationService(db *sqlx.DB, cfg *config.Config, log *zap.Logger) NotificationService {
	return &notificationService{
		db:     db,
		cfg:    cfg,
		logger: log,
		client: &http.Client{Timeout: 10 * time.Second},
		mailer: email.New(db, cfg),
	}
}

func (s *notificationService) getTemplateValue(ctx context.Context, key string, defaultVal string) string {
	var val string
	err := s.db.GetContext(ctx, &val, "SELECT value FROM app_configs WHERE key = $1", key)
	if err != nil || val == "" {
		return defaultVal
	}
	return val
}

func formatMessage(tmpl string, placeholders map[string]string) string {
	result := tmpl
	for k, v := range placeholders {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}

// formatNumber formats an int64 with dot-separated thousands (Indonesian style).
func formatNumber(n int64) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var result []byte
	mod := len(s) % 3
	for i, c := range s {
		if i != 0 && (i-mod)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(c))
	}
	return string(result)
}

func (s *notificationService) SendNewRegistrationAlert(ctx context.Context, reg *model.Registration) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")
	defaultTmpl := "*[" + companyName + "] Konfirmasi Pendaftaran*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Terima kasih telah mendaftarkan layanan internet kepada kami. Permohonan Anda telah kami terima dan sedang dalam proses peninjauan.\n\n" +
		"*Detail Pendaftaran:*\n" +
		"• No. Registrasi : {{RegNumber}}\n" +
		"• Nomor HP       : {{Phone}}\n\n" +
		"Tim kami akan segera menghubungi Anda untuk informasi lebih lanjut.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_new_registration", defaultTmpl)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":  reg.FullName,
		"Phone":     reg.Phone,
		"RegNumber": reg.RegNumber,
	})

	return s.send(ctx, reg.Phone, msg)
}

func (s *notificationService) SendSurveyScheduled(ctx context.Context, reg *model.Registration) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")
	defaultTmpl := "*[" + companyName + "] Jadwal Survei Lokasi*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Kami dengan hormat menginformasikan bahwa tim survei kami akan melakukan kunjungan ke lokasi Anda untuk memastikan kelayakan pemasangan jaringan internet.\n\n" +
		"*Detail Registrasi:*\n" +
		"• No. Registrasi : {{RegNumber}}\n\n" +
		"Mohon pastikan ada yang menerima tim kami saat kunjungan berlangsung. Jika ada pertanyaan, silakan hubungi kami.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_survey_scheduled", defaultTmpl)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":  reg.FullName,
		"Phone":     reg.Phone,
		"RegNumber": reg.RegNumber,
	})

	return s.send(ctx, reg.Phone, msg)
}

func (s *notificationService) SendPaymentConfirmed(ctx context.Context, reg *model.Registration) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")
	defaultTmpl := "*[" + companyName + "] Konfirmasi Pembayaran Diterima*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Pembayaran Anda telah *berhasil dikonfirmasi*. Kami mengucapkan terima kasih atas kepercayaan Anda menggunakan layanan kami.\n\n" +
		"*Detail Pembayaran:*\n" +
		"• No. Registrasi : {{RegNumber}}\n" +
		"• Status         : Lunas\n\n" +
		"Bukti pembayaran dapat diakses melalui tautan berikut:\n" +
		"{{ReceiptURL}}\n\n" +
		"Tim teknisi kami akan segera menghubungi Anda untuk menjadwalkan pemasangan jaringan. Proses aktivasi akan dilakukan secepat mungkin.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_payment_confirmed", defaultTmpl)

	receiptURL := fmt.Sprintf("%s/receipt/%s", s.cfg.AppBaseURL, reg.ID)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":   reg.FullName,
		"Phone":      reg.Phone,
		"RegNumber":  reg.RegNumber,
		"ReceiptURL": receiptURL,
	})

	return s.send(ctx, reg.Phone, msg)
}

func (s *notificationService) SendInvoiceLink(ctx context.Context, reg *model.Registration) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")

	// Format payment amount if available
	amountStr := "-"
	if reg.PaymentAmount != nil && *reg.PaymentAmount > 0 {
		amountStr = fmt.Sprintf("Rp %s", formatNumber(*reg.PaymentAmount))
	} else if reg.InstallationFee != nil && *reg.InstallationFee > 0 {
		amountStr = fmt.Sprintf("Rp %s", formatNumber(*reg.InstallationFee))
	}

	defaultTmpl := "*[" + companyName + "] Tagihan Biaya Pemasangan*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Proses pemasangan jaringan internet di lokasi Anda telah *selesai dilaksanakan*. Berikut adalah tagihan biaya yang perlu diselesaikan:\n\n" +
		"*Detail Tagihan:*\n" +
		"• No. Registrasi : {{RegNumber}}\n" +
		"• Total Tagihan  : {{Amount}}\n\n" +
		"Silakan lakukan pembayaran sesuai petunjuk pada invoice berikut:\n" +
		"{{InvoiceURL}}\n\n" +
		"Harap menyelesaikan pembayaran agar layanan internet Anda dapat segera diaktifkan. Apabila Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_invoice", defaultTmpl)

	invoiceURL := fmt.Sprintf("%s/invoice/%s", s.cfg.AppBaseURL, reg.ID)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":   reg.FullName,
		"Phone":      reg.Phone,
		"RegNumber":  reg.RegNumber,
		"InvoiceURL": invoiceURL,
		"Amount":     amountStr,
	})

	return s.send(ctx, reg.Phone, msg)
}

type invoiceEmailData struct {
	BrandName    string
	LogoURL      string
	FullName     string
	RegNumber    string
	CustomerNum  string
	InstFee      string
	PackageName  string
	PackageSpeed string
	PackagePrice string
	Subtotal     string
	Tax          string
	TaxRate      string
	Total        string
	InvoiceURL   string
	BankName     string
	BankAccount  string
	BankHolder   string
	Year         int
}

// SendInvoiceEmail sends a formal HTML invoice email to the customer.
func (s *notificationService) SendInvoiceEmail(ctx context.Context, reg *model.Registration, invoiceURL string) error {
	if reg.Email == nil || *reg.Email == "" {
		s.logger.Info("invoice email skipped: registration has no email address", zap.String("reg_id", reg.ID))
		return nil
	}

	brandName := s.getTemplateValue(ctx, "brand_name", "ISP Platform")
	logoURL := s.getTemplateValue(ctx, "brand_logo_url", "")
	if logoURL != "" && !strings.HasPrefix(logoURL, "http") {
		base := strings.TrimSuffix(s.cfg.AppBaseURL, "/")
		if !strings.HasPrefix(logoURL, "/") {
			logoURL = "/" + logoURL
		}
		logoURL = base + logoURL
	}
	taxRateStr := s.getTemplateValue(ctx, "invoice_tax_rate", "11")

	var taxRate float64
	fmt.Sscanf(taxRateStr, "%f", &taxRate) //nolint:errcheck

	instFee := int64(0)
	if reg.InstallationFee != nil {
		instFee = *reg.InstallationFee
	}
	packPrice := int64(0)
	pkgName := ""
	pkgSpeed := ""
	var pkgRow struct {
		Name          string `db:"name"`
		SpeedDownMbps int    `db:"speed_down_mbps"`
		PriceMonthly  int64  `db:"price_monthly"`
	}
	if err := s.db.GetContext(ctx, &pkgRow, `SELECT name, speed_down_mbps, price_monthly FROM packages WHERE id = $1`, reg.PackageID); err == nil {
		packPrice = pkgRow.PriceMonthly
		pkgName = pkgRow.Name
		pkgSpeed = fmt.Sprintf("%d", pkgRow.SpeedDownMbps)
	}

	total := instFee + packPrice
	subtotal := int64(float64(total) / (1 + taxRate/100))
	tax := total - subtotal

	bankName := s.getTemplateValue(ctx, "bank_name", "BCA")
	bankAccount := s.getTemplateValue(ctx, "bank_account", "1234567890")
	bankHolder := s.getTemplateValue(ctx, "bank_holder", brandName)

	customerNum := reg.RegNumber
	if reg.CustomerNumber != nil && *reg.CustomerNumber != "" {
		customerNum = *reg.CustomerNumber
	}

	data := invoiceEmailData{
		BrandName:    brandName,
		LogoURL:      logoURL,
		FullName:     reg.FullName,
		RegNumber:    reg.RegNumber,
		CustomerNum:  customerNum,
		InstFee:      "Rp " + formatNumber(instFee),
		PackageName:  pkgName,
		PackageSpeed: pkgSpeed,
		PackagePrice: "Rp " + formatNumber(packPrice),
		Subtotal:     "Rp " + formatNumber(subtotal),
		Tax:          "Rp " + formatNumber(tax),
		TaxRate:      taxRateStr,
		Total:        "Rp " + formatNumber(total),
		InvoiceURL:   invoiceURL,
		BankName:     bankName,
		BankAccount:  bankAccount,
		BankHolder:   bankHolder,
		Year:         time.Now().Year(),
	}

	body, err := renderInvoiceTemplate(data)
	if err != nil {
		return fmt.Errorf("notifSvc.SendInvoiceEmail: render: %w", err)
	}

	subject := fmt.Sprintf("[%s] Tagihan Biaya Pemasangan & Paket — %s", brandName, customerNum)
	if err := s.mailer.SendHTML(ctx, *reg.Email, reg.FullName, subject, body); err != nil {
		return fmt.Errorf("notifSvc.SendInvoiceEmail: send email: %w", err)
	}

	s.logger.Info("invoice email sent", zap.String("to", *reg.Email), zap.String("reg_id", reg.ID))
	return nil
}



func (s *notificationService) SendActivationSuccess(ctx context.Context, reg *model.Registration) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")
	username := "-"
	if reg.PPPoEUsername != nil && *reg.PPPoEUsername != "" {
		username = *reg.PPPoEUsername
	}
	defaultTmpl := "*[" + companyName + "] Layanan Internet Anda Telah Aktif*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Kami dengan bangga menginformasikan bahwa layanan internet Anda telah *berhasil diaktifkan* dan siap untuk digunakan.\n\n" +
		"*Informasi Akun Internet:*\n" +
		"• No. Pelanggan  : {{RegNumber}}\n" +
		"• Username PPPoE : {{PPPoEUsername}}\n" +
		"• Password       : (dikirim terpisah oleh teknisi)\n\n" +
		"Kami mengucapkan selamat menikmati layanan internet dari *" + companyName + "*. Jika Anda mengalami kendala teknis, tim support kami siap membantu.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_activation_success", defaultTmpl)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":      reg.FullName,
		"Phone":         reg.Phone,
		"RegNumber":     reg.RegNumber,
		"PPPoEUsername": username,
	})

	return s.send(ctx, reg.Phone, msg)
}

func (s *notificationService) SendProvisioningFailed(ctx context.Context, reg *model.Registration, errMsg string) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")
	defaultTmpl := "*[" + companyName + "] Informasi Kendala Aktivasi*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Kami mohon maaf atas ketidaknyamanan ini. Saat ini terdapat kendala teknis dalam proses aktivasi layanan internet Anda.\n\n" +
		"*Detail Registrasi:*\n" +
		"• No. Registrasi : {{RegNumber}}\n\n" +
		"Tim teknis kami sedang menangani permasalahan ini dan akan segera menghubungi Anda. Kami mohon kesabaran Anda.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_provisioning_failed", defaultTmpl)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":  reg.FullName,
		"Phone":     reg.Phone,
		"RegNumber": reg.RegNumber,
		"Error":     errMsg,
	})

	return s.send(ctx, reg.Phone, msg)
}

// send posts a message to the configured WhatsApp gateway provider.
func (s *notificationService) send(ctx context.Context, phone, message string) error {
	// 1. Check if notifications are enabled (DB config with env config fallback)
	notifEnabledVal := s.getTemplateValue(ctx, "notif_enabled", "")
	notifEnabled := s.cfg.NotifEnabled
	switch notifEnabledVal {
	case "false":
		notifEnabled = false
	case "true":
		notifEnabled = true
	}

	if !notifEnabled {
		s.logger.Debug("notification skipped (disabled in config)", zap.String("phone", phone))
		return nil
	}

	// 2. Load gateway details from DB with fallback
	provider := strings.ToLower(s.getTemplateValue(ctx, "wa_provider", "other"))
	apiKey := s.getTemplateValue(ctx, "wa_api_key", "")
	
	// Fallback to legacy webhook URL if wa_api_url not set or is empty
	apiURL := s.getTemplateValue(ctx, "wa_api_url", "")
	if apiURL == "" {
		// Try using notif_webhook_url
		apiURL = s.getTemplateValue(ctx, "notif_webhook_url", s.cfg.NotifWebhookURL)
	}

	if apiURL == "" {
		s.logger.Debug("notification skipped (no WhatsApp URL/webhook configured)", zap.String("phone", phone))
		return nil
	}

	var body []byte
	var req *http.Request
	var err error

	// 3. Format payload and request headers based on selected provider
	switch provider {
	case "fonnte":
		payload := map[string]string{
			"target":  phone,
			"message": message,
		}
		body, _ = json.Marshal(payload)
		req, err = http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			if apiKey != "" {
				req.Header.Set("Authorization", apiKey)
			}
		}

	case "ruangwa":
		payload := map[string]string{
			"token":   apiKey,
			"number":  phone,
			"message": message,
		}
		body, _ = json.Marshal(payload)
		req, err = http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
		}

	case "starsender":
		payload := map[string]string{
			"to":      phone,
			"message": message,
		}
		body, _ = json.Marshal(payload)
		req, err = http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			if apiKey != "" {
				req.Header.Set("Authorization", "Bearer "+apiKey)
			}
		}

	default: // "other" / generic webhook (legacy webhook fallback)
		payload := map[string]string{
			"phone":   phone,
			"message": message,
		}
		body, _ = json.Marshal(payload)
		req, err = http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			if apiKey != "" {
				req.Header.Set("X-API-Key", apiKey)
			}
		}
	}

	if err != nil {
		return fmt.Errorf("notifSvc.send: build request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("notifSvc.send: http post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("notifSvc.send: WhatsApp gateway returned status %d", resp.StatusCode)
	}

	s.logger.Info("notification sent via WhatsApp", zap.String("phone", phone), zap.String("provider", provider))
	return nil
}

// ── Receipt Email ──────────────────────────────────────────────────────────────

type receiptEmailData struct {
	BrandName    string
	LogoURL      string
	FullName     string
	RegNumber    string
	CustomerNum  string
	PaymentDate  string
	PaymentBank  string
	InstFee      string
	PackageName  string
	PackageSpeed string
	PackagePrice string
	Subtotal     string
	Tax          string
	TaxRate      string
	Total        string
	ReceiptURL   string
	Year         int
}

// SendReceiptEmail sends a professional HTML payment receipt to the customer's email.
func (s *notificationService) SendReceiptEmail(ctx context.Context, reg *model.Registration, receiptURL string) error {
	if reg.Email == nil || *reg.Email == "" {
		s.logger.Debug("receipt email skipped: no email address", zap.String("reg_id", reg.ID))
		return nil
	}

	brandName := s.getTemplateValue(ctx, "brand_name", "ISP Platform")
	logoURL := s.getTemplateValue(ctx, "brand_logo_url", "")
	if logoURL != "" && !strings.HasPrefix(logoURL, "http") {
		base := strings.TrimSuffix(s.cfg.AppBaseURL, "/")
		if !strings.HasPrefix(logoURL, "/") {
			logoURL = "/" + logoURL
		}
		logoURL = base + logoURL
	}
	taxRateStr := s.getTemplateValue(ctx, "invoice_tax_rate", "11")

	var taxRate float64
	fmt.Sscanf(taxRateStr, "%f", &taxRate) //nolint:errcheck

	instFee := int64(0)
	if reg.InstallationFee != nil {
		instFee = *reg.InstallationFee
	}
	packPrice := int64(0)
	pkgName := ""
	pkgSpeed := ""
	var pkgRow struct {
		Name          string `db:"name"`
		SpeedDownMbps int    `db:"speed_down_mbps"`
		PriceMonthly  int64  `db:"price_monthly"`
	}
	if err := s.db.GetContext(ctx, &pkgRow, `SELECT name, speed_down_mbps, price_monthly FROM packages WHERE id = $1`, reg.PackageID); err == nil {
		packPrice = pkgRow.PriceMonthly
		pkgName = pkgRow.Name
		pkgSpeed = fmt.Sprintf("%d", pkgRow.SpeedDownMbps)
	}

	total := instFee + packPrice
	subtotal := int64(float64(total) / (1 + taxRate/100))
	tax := total - subtotal

	paymentDate := "-"
	if reg.PaymentDate != nil {
		paymentDate = reg.PaymentDate.Format("02 January 2006")
	} else if reg.PaymentConfirmedAt != nil {
		paymentDate = reg.PaymentConfirmedAt.Format("02 January 2006")
	}
	paymentBank := "TUNAI"
	if reg.PaymentBank != nil && *reg.PaymentBank != "" {
		paymentBank = strings.ToUpper(*reg.PaymentBank)
	}
	customerNum := reg.RegNumber
	if reg.CustomerNumber != nil && *reg.CustomerNumber != "" {
		customerNum = *reg.CustomerNumber
	}

	data := receiptEmailData{
		BrandName:    brandName,
		LogoURL:      logoURL,
		FullName:     reg.FullName,
		RegNumber:    reg.RegNumber,
		CustomerNum:  customerNum,
		PaymentDate:  paymentDate,
		PaymentBank:  paymentBank,
		InstFee:      "Rp " + formatNumber(instFee),
		PackageName:  pkgName,
		PackageSpeed: pkgSpeed,
		PackagePrice: "Rp " + formatNumber(packPrice),
		Subtotal:     "Rp " + formatNumber(subtotal),
		Tax:          "Rp " + formatNumber(tax),
		TaxRate:      taxRateStr,
		Total:        "Rp " + formatNumber(total),
		ReceiptURL:   receiptURL,
		Year:         time.Now().Year(),
	}

	body, err := renderReceiptTemplate(data)
	if err != nil {
		return fmt.Errorf("notifSvc.SendReceiptEmail: render: %w", err)
	}

	subject := fmt.Sprintf("[%s] Kuitansi Pembayaran — %s", brandName, customerNum)
	if err := s.mailer.SendHTML(ctx, *reg.Email, reg.FullName, subject, body); err != nil {
		return fmt.Errorf("notifSvc.SendReceiptEmail: send email: %w", err)
	}

	s.logger.Info("receipt email sent", zap.String("to", *reg.Email), zap.String("reg_id", reg.ID))
	return nil
}

const receiptEmailTmpl = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Kuitansi Pembayaran</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>{{if .LogoURL}}<img src="{{.LogoURL}}" alt="{{.BrandName}}" style="height:28px;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);"/>{{else}}<span style="font-size:18px;font-weight:800;color:#ffffff;">{{.BrandName}}</span>{{end}}</td>
        <td align="right"><div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 14px;"><span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">KUITANSI PEMBAYARAN</span></div></td>
      </tr></table>
    </td></tr>
    <!-- Paid banner -->
    <tr><td style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:12px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><span style="font-size:12px;color:#16a34a;font-weight:700;">&#10003; Pembayaran Telah Diverifikasi</span></td>
        <td align="right"><span style="border:2px solid #16a34a;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:800;color:#16a34a;letter-spacing:2px;">LUNAS</span></td>
      </tr></table>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:32px;">
      <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.6;">
        Yth. <strong style="color:#0f172a;">{{.FullName}}</strong>,<br/>
        Terima kasih atas kepercayaan Anda. Berikut adalah kuitansi resmi atas pembayaran yang telah kami terima.
      </p>
      <!-- Meta detail box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">No. Registrasi</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;font-family:monospace;">{{.RegNumber}}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">No. Pelanggan</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;font-family:monospace;">{{.CustomerNum}}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tanggal Bayar</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;">{{.PaymentDate}}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Metode Pembayaran</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;">{{.PaymentBank}}</td>
          </tr></table>
        </td></tr>
      </table>
      <!-- Items -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Deskripsi</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Jumlah</th>
        </tr></thead>
        <tbody>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px;font-size:13px;color:#334155;">Biaya Instalasi &amp; Penarikan Kabel FO</td>
            <td style="padding:12px;font-size:13px;color:#334155;text-align:right;font-weight:600;">{{.InstFee}}</td>
          </tr>
          {{if .PackageName}}<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px;font-size:13px;color:#334155;">Paket Internet {{.PackageName}} {{.PackageSpeed}} Mbps (Bulan ke-1)</td>
            <td style="padding:12px;font-size:13px;color:#334155;text-align:right;font-weight:600;">{{.PackagePrice}}</td>
          </tr>{{end}}
        </tbody>
        <tfoot>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Subtotal</td>
            <td style="padding:10px 12px;font-size:12px;color:#334155;text-align:right;font-weight:600;">{{.Subtotal}}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px;font-size:12px;color:#64748b;">PPN ({{.TaxRate}}%)</td>
            <td style="padding:4px 12px;font-size:12px;color:#334155;text-align:right;font-weight:600;">{{.Tax}}</td>
          </tr>
          <tr style="background:#f0fdf4;border-top:2px solid #bbf7d0;">
            <td style="padding:14px 12px;font-size:14px;font-weight:800;color:#15803d;">Total Pembayaran</td>
            <td style="padding:14px 12px;font-size:16px;font-weight:800;color:#15803d;text-align:right;">{{.Total}}</td>
          </tr>
        </tfoot>
      </table>
      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        <tr><td align="center">
          <a href="{{.ReceiptURL}}" style="display:inline-block;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:13px 32px;border-radius:10px;">Lihat Kuitansi Online</a>
        </td></tr>
      </table>
      <!-- Note -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;">
          <strong>Catatan:</strong> Kuitansi ini merupakan bukti pembayaran resmi yang diterbitkan secara digital oleh <strong>{{.BrandName}}</strong>. Harap simpan dokumen ini sebagai arsip Anda.
        </p>
      </div>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">Jika Anda memiliki pertanyaan, silakan hubungi tim support kami.<br/>Terima kasih telah mempercayakan layanan kepada kami.</p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
        Email ini dikirim secara otomatis oleh <strong>{{.BrandName}}</strong>.<br/>
        &copy; {{.Year}} {{.BrandName}}. Hak cipta dilindungi undang-undang.
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`

func renderReceiptTemplate(data receiptEmailData) (string, error) {
	t, err := template.New("receipt").Parse(receiptEmailTmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

const invoiceEmailTmpl = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Tagihan Pemasangan &amp; Paket Internet</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>{{if .LogoURL}}<img src="{{.LogoURL}}" alt="{{.BrandName}}" style="height:28px;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);"/>{{else}}<span style="font-size:18px;font-weight:800;color:#ffffff;">{{.BrandName}}</span>{{end}}</td>
        <td align="right"><div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 14px;"><span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">INVOICE TAGIHAN</span></div></td>
      </tr></table>
    </td></tr>
    <!-- Unpaid banner -->
    <tr><td style="background:#fff1f2;border-bottom:2px solid #fecdd3;padding:12px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><span style="font-size:12px;color:#e11d48;font-weight:700;">&#9888; Menunggu Pembayaran</span></td>
        <td align="right"><span style="border:2px solid #e11d48;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:800;color:#e11d48;letter-spacing:2px;">BELUM BAYAR</span></td>
      </tr></table>
    </td></tr>
    <!-- Body -->
    <tr><td style="padding:32px;">
      <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.6;">
        Yth. <strong style="color:#0f172a;">{{.FullName}}</strong>,<br/>
        Proses instalasi jaringan internet Anda telah selesai. Berikut adalah rincian tagihan pembayaran biaya instalasi &amp; paket internet bulan pertama.
      </p>
      <!-- Meta detail box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">No. Registrasi</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;font-family:monospace;">{{.RegNumber}}</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:13px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">No. Pelanggan</td>
            <td align="right" style="font-size:13px;color:#0f172a;font-weight:700;font-family:monospace;">{{.CustomerNum}}</td>
          </tr></table>
        </td></tr>
      </table>
      <!-- Items -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Deskripsi Item</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Jumlah</th>
        </tr></thead>
        <tbody>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px;font-size:13px;color:#334155;">Biaya Instalasi &amp; Penarikan Kabel FO</td>
            <td style="padding:12px;font-size:13px;color:#334155;text-align:right;font-weight:600;">{{.InstFee}}</td>
          </tr>
          {{if .PackageName}}<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px;font-size:13px;color:#334155;">Paket Internet {{.PackageName}} {{.PackageSpeed}} Mbps (Bulan ke-1)</td>
            <td style="padding:12px;font-size:13px;color:#334155;text-align:right;font-weight:600;">{{.PackagePrice}}</td>
          </tr>{{end}}
        </tbody>
        <tfoot>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">Subtotal</td>
            <td style="padding:10px 12px;font-size:12px;color:#334155;text-align:right;font-weight:600;">{{.Subtotal}}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px;font-size:12px;color:#64748b;">PPN ({{.TaxRate}}%)</td>
            <td style="padding:4px 12px;font-size:12px;color:#334155;text-align:right;font-weight:600;">{{.Tax}}</td>
          </tr>
          <tr style="background:#fff1f2;border-top:2px solid #fecdd3;">
            <td style="padding:14px 12px;font-size:14px;font-weight:800;color:#9f1239;">Total Tagihan</td>
            <td style="padding:14px 12px;font-size:16px;font-weight:800;color:#9f1239;text-align:right;">{{.Total}}</td>
          </tr>
        </tfoot>
      </table>
      <!-- Bank Account Box -->
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Transfer Ke Rekening Pembayaran:</p>
        <p style="margin:0;font-size:14px;font-weight:800;color:#0c4a6e;">Bank {{.BankName}}: <span style="font-family:monospace;">{{.BankAccount}}</span></p>
        <p style="margin:4px 0 0;font-size:12px;color:#0369a1;">a.n. {{.BankHolder}}</p>
      </div>
      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
        <tr><td align="center">
          <a href="{{.InvoiceURL}}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:13px 32px;border-radius:10px;">Lihat &amp; Konfirmasi Invoice Online</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">Setelah melakukan pembayaran, silakan konfirmasikan bukti transfer melalui tautan invoice di atas atau hubungi CS kami.<br/>Terima kasih.</p>
    </td></tr>
    <!-- Footer -->
    <tr><td style="background:#f8fafc;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
        Email ini dikirim secara otomatis oleh <strong>{{.BrandName}}</strong>.<br/>
        &copy; {{.Year}} {{.BrandName}}. Hak cipta dilindungi undang-undang.
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`

func renderInvoiceTemplate(data invoiceEmailData) (string, error) {
	t, err := template.New("invoice").Parse(invoiceEmailTmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (s *notificationService) SendMonthlyInvoiceLink(ctx context.Context, reg *model.Registration, invoiceNumber string, amount int64, period string, invoiceURL string) error {
	companyName := s.getTemplateValue(ctx, "brand_name", "Tim Kami")

	defaultTmpl := "*[" + companyName + "] Tagihan Internet Bulanan*\n" +
		"━━━━━━━━━━━━━━━━━━━━━\n" +
		"Yth. *{{FullName}}*,\n\n" +
		"Tagihan internet bulanan Anda untuk periode *{{Period}}* telah diterbitkan.\n\n" +
		"*Detail Tagihan:*\n" +
		"• No. Tagihan    : {{InvoiceNumber}}\n" +
		"• Total Tagihan  : Rp {{Amount}}\n" +
		"• Link Tagihan   : {{InvoiceURL}}\n\n" +
		"Silakan lakukan pembayaran sesuai petunjuk pada invoice di atas sebelum tanggal jatuh tempo.\n\n" +
		"Hormat kami,\n" +
		"*" + companyName + "*"
	tmpl := s.getTemplateValue(ctx, "notif_tmpl_monthly_invoice", defaultTmpl)

	msg := formatMessage(tmpl, map[string]string{
		"FullName":      reg.FullName,
		"Phone":         reg.Phone,
		"Period":        period,
		"InvoiceNumber": invoiceNumber,
		"Amount":        formatNumber(amount),
		"InvoiceURL":    invoiceURL,
	})

	return s.send(ctx, reg.Phone, msg)
}

func (s *notificationService) SendMonthlyInvoiceEmail(ctx context.Context, reg *model.Registration, invoiceNumber string, amount int64, period string, invoiceURL string) error {
	if reg.Email == nil || *reg.Email == "" {
		s.logger.Info("monthly invoice email skipped: registration has no email address", zap.String("reg_id", reg.ID))
		return nil
	}

	brandName := s.getTemplateValue(ctx, "brand_name", "ISP Platform")
	logoURL := s.getTemplateValue(ctx, "brand_logo_url", "")
	if logoURL != "" && !strings.HasPrefix(logoURL, "http") {
		base := strings.TrimSuffix(s.cfg.AppBaseURL, "/")
		if !strings.HasPrefix(logoURL, "/") {
			logoURL = "/" + logoURL
		}
		logoURL = base + logoURL
	}
	taxRateStr := s.getTemplateValue(ctx, "invoice_tax_rate", "11")

	var taxRate float64
	fmt.Sscanf(taxRateStr, "%f", &taxRate) //nolint:errcheck

	pkgPrice := amount
	pkgName := ""
	pkgSpeed := ""
	var pkgRow struct {
		Name          string `db:"name"`
		SpeedDownMbps int    `db:"speed_down_mbps"`
	}
	if err := s.db.GetContext(ctx, &pkgRow, `SELECT name, speed_down_mbps FROM packages WHERE id = $1`, reg.PackageID); err == nil {
		pkgName = pkgRow.Name
		pkgSpeed = fmt.Sprintf("%d", pkgRow.SpeedDownMbps)
	}

	subtotal := int64(float64(amount) / (1 + taxRate/100))
	tax := amount - subtotal

	bankName := s.getTemplateValue(ctx, "bank_name", "BCA")
	bankAccount := s.getTemplateValue(ctx, "bank_account", "1234567890")
	bankHolder := s.getTemplateValue(ctx, "bank_holder", brandName)

	customerNum := reg.RegNumber
	if reg.CustomerNumber != nil && *reg.CustomerNumber != "" {
		customerNum = *reg.CustomerNumber
	}

	data := invoiceEmailData{
		BrandName:    brandName,
		LogoURL:      logoURL,
		FullName:     reg.FullName,
		RegNumber:    invoiceNumber, // Use invoice number here
		CustomerNum:  customerNum,
		InstFee:      "Rp 0", // No installation fee for monthly recurring
		PackageName:  pkgName,
		PackageSpeed: pkgSpeed,
		PackagePrice: "Rp " + formatNumber(pkgPrice),
		Subtotal:     "Rp " + formatNumber(subtotal),
		Tax:          "Rp " + formatNumber(tax),
		TaxRate:      taxRateStr,
		Total:        "Rp " + formatNumber(amount),
		InvoiceURL:   invoiceURL,
		BankName:     bankName,
		BankAccount:  bankAccount,
		BankHolder:   bankHolder,
		Year:         time.Now().Year(),
	}

	body, err := renderInvoiceTemplate(data)
	if err != nil {
		return fmt.Errorf("notifSvc.SendMonthlyInvoiceEmail: render: %w", err)
	}

	subject := fmt.Sprintf("[%s] Tagihan Internet Bulanan Periode %s — %s", brandName, period, customerNum)
	if err := s.mailer.SendHTML(ctx, *reg.Email, reg.FullName, subject, body); err != nil {
		return fmt.Errorf("notifSvc.SendMonthlyInvoiceEmail: send email: %w", err)
	}

	s.logger.Info("monthly invoice email sent", zap.String("to", *reg.Email), zap.String("reg_id", reg.ID))
	return nil
}


