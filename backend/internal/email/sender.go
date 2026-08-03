// Package email provides a lightweight SMTP email sender.
// Configure via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM env vars.
// For dev/testing use Mailtrap (https://mailtrap.io) — free sandbox that captures
// outbound emails without actually delivering them.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	"isp-platform/registration/internal/config"
)

// JSON payloads for Mailtrap and SendGrid API drivers
type mailtrapAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type mailtrapPayload struct {
	From    mailtrapAddress   `json:"from"`
	To      []mailtrapAddress `json:"to"`
	Subject string            `json:"subject"`
	HTML    string            `json:"html"`
}

type sendgridAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type sendgridContent struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type sendgridPersonalization struct {
	To []sendgridAddress `json:"to"`
}

type sendgridPayload struct {
	Personalizations []sendgridPersonalization `json:"personalizations"`
	From             sendgridAddress           `json:"from"`
	Subject          string                    `json:"subject"`
	Content          []sendgridContent         `json:"content"`
}

// Sender sends transactional emails via SMTP or REST APIs.
type Sender struct {
	db  *sqlx.DB
	cfg *config.Config
}

// New returns a Sender configured from db and cfg.
func New(db *sqlx.DB, cfg *config.Config) *Sender {
	return &Sender{db: db, cfg: cfg}
}

// SendPasswordReset sends a password-reset link to the given address.
func (s *Sender) SendPasswordReset(toEmail, toName, resetURL string) error {
	ctx := context.Background()
	brandName := s.getDBConfig(ctx, "brand_name", "ISP Platform")
	brandLogo := s.getDBConfig(ctx, "brand_logo_url", "")

	if brandLogo != "" && !strings.HasPrefix(brandLogo, "http://") && !strings.HasPrefix(brandLogo, "https://") {
		baseURL := strings.TrimSuffix(s.cfg.AppBaseURL, "/")
		if !strings.HasPrefix(brandLogo, "/") {
			brandLogo = "/" + brandLogo
		}
		brandLogo = baseURL + brandLogo
	}

	subject := fmt.Sprintf("[%s] Reset Kata Sandi Akun Anda", brandName)
	body, err := renderResetTemplate(resetTemplateData{
		Name:      toName,
		URL:       resetURL,
		BrandName: brandName,
		LogoURL:   brandLogo,
		Year:      time.Now().Year(),
	})
	if err != nil {
		return fmt.Errorf("email.SendPasswordReset: render: %w", err)
	}
	return s.send(ctx, toEmail, subject, body)
}

// SendHTML sends an arbitrary HTML email. Used by the notification service for receipts, etc.
func (s *Sender) SendHTML(ctx context.Context, toEmail, toName, subject, htmlBody string) error {
	_ = toName // available for future use in From name personalisation
	return s.send(ctx, toEmail, subject, htmlBody)
}


// send is the low-level dispatcher. It queries configurations from db first.
func (s *Sender) send(ctx context.Context, toEmail, subject, htmlBody string) error {
	// Query dynamic settings from db
	provider := s.getDBConfig(ctx, "email_provider", "smtp")
	from := s.getDBConfig(ctx, "smtp_from", s.cfg.SMTPFrom)
	fromName := s.getDBConfig(ctx, "smtp_from_name", s.cfg.SMTPFromName)

	if provider == "mailtrap" {
		apiToken := s.getDBConfig(ctx, "mailtrap_api_token", "")
		if apiToken == "" {
			return fmt.Errorf("email.send: mailtrap_api_token is empty")
		}
		url := "https://send.api.mailtrap.io/api/send"
		payload := mailtrapPayload{
			From:    mailtrapAddress{Email: from, Name: fromName},
			To:      []mailtrapAddress{{Email: toEmail}},
			Subject: subject,
			HTML:    htmlBody,
		}
		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return fmt.Errorf("email.send: mailtrap http request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+apiToken)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("email.send: mailtrap dispatch error: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			return fmt.Errorf("email.send: mailtrap API error status: %d", resp.StatusCode)
		}
		return nil
	}

	if provider == "sendgrid" {
		apiKey := s.getDBConfig(ctx, "sendgrid_api_key", "")
		if apiKey == "" {
			return fmt.Errorf("email.send: sendgrid_api_key is empty")
		}
		url := "https://api.sendgrid.com/v3/mail/send"
		payload := sendgridPayload{
			Personalizations: []sendgridPersonalization{
				{To: []sendgridAddress{{Email: toEmail}}},
			},
			From:    sendgridAddress{Email: from, Name: fromName},
			Subject: subject,
			Content: []sendgridContent{
				{Type: "text/html", Value: htmlBody},
			},
		}
		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			return fmt.Errorf("email.send: sendgrid http request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("email.send: sendgrid dispatch error: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			return fmt.Errorf("email.send: sendgrid API error status: %d", resp.StatusCode)
		}
		return nil
	}

	// Default to SMTP
	host := s.getDBConfig(ctx, "smtp_host", s.cfg.SMTPHost)
	portStr := s.getDBConfig(ctx, "smtp_port", strconv.Itoa(s.cfg.SMTPPort))
	user := s.getDBConfig(ctx, "smtp_user", s.cfg.SMTPUser)
	pass := s.getDBConfig(ctx, "smtp_password", s.cfg.SMTPPassword)

	port, err := strconv.Atoi(portStr)
	if err != nil || port == 0 {
		port = 587
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	fromFormatted := fmt.Sprintf("%s <%s>", fromName, from)
	msg := []byte(
		"MIME-version: 1.0;\r\n" +
			"Content-Type: text/html; charset=\"UTF-8\";\r\n" +
			"From: " + fromFormatted + "\r\n" +
			"To: " + toEmail + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"\r\n" +
			htmlBody + "\r\n",
	)

	var auth smtp.Auth
	if user != "" {
		auth = smtp.PlainAuth("", user, pass, host)
	}

	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, msg); err != nil {
		return fmt.Errorf("email.send: smtp: %w", err)
	}
	return nil
}

func (s *Sender) getDBConfig(ctx context.Context, key, fallback string) string {
	var val string
	err := s.db.GetContext(ctx, &val, "SELECT value FROM app_configs WHERE key = $1", key)
	if err != nil || val == "" {
		return fallback
	}
	return val
}


// ── HTML template ──────────────────────────────────────────────────────────────

type resetTemplateData struct {
	Name      string
	URL       string
	BrandName string
	LogoURL   string
	Year      int
}

const resetTmpl = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Atur Ulang Kata Sandi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Content Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Logo / Brand Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                {{if .LogoURL}}
                  <img src="{{.LogoURL}}" alt="{{.BrandName}}" style="height: 32px; max-width: 140px; object-fit: contain;" />
                {{else}}
                  <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">{{.BrandName}}</span>
                {{end}}
              </div>

              <!-- Message -->
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 750; color: #0f172a; letter-spacing: -0.5px; text-align: center;">Atur Ulang Kata Sandi</h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
                Halo <strong>{{.Name}}</strong>, kami menerima permintaan untuk mereset kata sandi akun Anda di {{.BrandName}}. Klik tombol di bawah ini untuk membuat kata sandi baru.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="{{.URL}}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 12px 28px; border-radius: 8px; border: 1px solid #0f172a; transition: background-color 0.2s ease;">
                      Buat Kata Sandi Baru
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning / Details -->
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #334155;">ℹ️ Informasi Keamanan</p>
                <p style="margin: 0; font-size: 11.5px; line-height: 1.5; color: #64748b;">
                  Tautan ini hanya berlaku selama <strong>30 menit</strong>. Jika Anda tidak meminta pengaturan ulang kata sandi ini, silakan abaikan email ini dengan aman.
                </p>
              </div>

              <!-- Raw Link -->
              <p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8; text-align: center;">Atau salin tautan berikut ke browser Anda:</p>
              <p style="margin: 0; font-size: 11px; word-break: break-all; color: #2563eb; text-align: center; line-height: 1.4;">{{.URL}}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Email ini dikirim secara otomatis oleh <strong>{{.BrandName}}</strong>.<br/>
                © {{.Year}} {{.BrandName}}. Hak cipta dilindungi undang-undang.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

func renderResetTemplate(data resetTemplateData) (string, error) {
	t, err := template.New("reset").Parse(resetTmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
