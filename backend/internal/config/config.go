package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// App
	AppEnv       string
	AppPort      int
	AppSecretKey string

	// Database
	DBHost                string
	DBPort                int
	DBName                string
	DBUser                string
	DBPassword            string
	DBMaxOpenConns        int
	DBMaxIdleConns        int
	DBConnMaxLifetimeMin  int

	// Redis
	RedisHost     string
	RedisPort     int
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret              string
	JWTExpiryHours         int
	JWTRefreshExpiryDays   int

	// Mikrotik
	MikrotikHost        string
	MikrotikPort        int
	MikrotikUser        string
	MikrotikPassword    string
	MikrotikPPPoEPrefix string

	// OLT ZTE
	OLTSSHHost       string
	OLTSSHPort       int
	OLTSSHUser       string
	OLTSSHPassword   string
	OLTSSHTimeoutSec int

	// NATS
	NATSUrl string

	// Notification
	NotifWebhookURL string
	NotifEnabled    bool

	// Upload
	UploadMaxSizeMB int
	UploadPath      string

	// Provisioning
	ProvisioningTimeoutSec    int
	ProvisioningMaxRetry      int
	ProvisioningRetryInterval int

	// SMTP / Email (for forgot password, etc.)
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	SMTPFromName string

	// App public base URL (used in email links)
	AppBaseURL string
}

// Load reads all environment variables and returns a validated Config.
func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:       getEnvStr("APP_ENV", "development"),
		AppPort:      getEnvInt("APP_PORT", 8080),
		AppSecretKey: os.Getenv("APP_SECRET_KEY"),

		DBHost:               getEnvStr("DB_HOST", "localhost"),
		DBPort:               getEnvInt("DB_PORT", 5432),
		DBName:               getEnvStr("DB_NAME", "isp_registration"),
		DBUser:               os.Getenv("DB_USER"),
		DBPassword:           os.Getenv("DB_PASSWORD"),
		DBMaxOpenConns:       getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:       getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetimeMin: getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 15),

		RedisHost:     getEnvStr("REDIS_HOST", "localhost"),
		RedisPort:     getEnvInt("REDIS_PORT", 6379),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		JWTSecret:            os.Getenv("JWT_SECRET"),
		JWTExpiryHours:       getEnvInt("JWT_EXPIRY_HOURS", 24),
		JWTRefreshExpiryDays: getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 7),

		MikrotikHost:        os.Getenv("MIKROTIK_HOST"),
		MikrotikPort:        getEnvInt("MIKROTIK_PORT", 443),
		MikrotikUser:        os.Getenv("MIKROTIK_USER"),
		MikrotikPassword:    os.Getenv("MIKROTIK_PASSWORD"),
		MikrotikPPPoEPrefix: getEnvStr("MIKROTIK_PPPOE_PREFIX", "ISP"),

		OLTSSHHost:       os.Getenv("OLT_SSH_HOST"),
		OLTSSHPort:       getEnvInt("OLT_SSH_PORT", 22),
		OLTSSHUser:       os.Getenv("OLT_SSH_USER"),
		OLTSSHPassword:   os.Getenv("OLT_SSH_PASSWORD"),
		OLTSSHTimeoutSec: getEnvInt("OLT_SSH_TIMEOUT_SEC", 30),

		NATSUrl: getEnvStr("NATS_URL", "nats://localhost:4222"),

		NotifWebhookURL: os.Getenv("NOTIF_WEBHOOK_URL"),
		NotifEnabled:    getEnvBool("NOTIF_ENABLED", true),

		UploadMaxSizeMB: getEnvInt("UPLOAD_MAX_SIZE_MB", 5),
		UploadPath:      getEnvStr("UPLOAD_PATH", "./uploads"),

		ProvisioningTimeoutSec:    getEnvInt("PROVISIONING_TIMEOUT_SEC", 30),
		ProvisioningMaxRetry:      getEnvInt("PROVISIONING_MAX_RETRY", 3),
		ProvisioningRetryInterval: getEnvInt("PROVISIONING_RETRY_INTERVAL_SEC", 10),

		SMTPHost:     getEnvStr("SMTP_HOST", "smtp.mailtrap.io"),
		SMTPPort:     getEnvInt("SMTP_PORT", 587),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:     getEnvStr("SMTP_FROM", "noreply@isp.local"),
		SMTPFromName: getEnvStr("SMTP_FROM_NAME", "ISP Platform"),

		AppBaseURL: getEnvStr("APP_BASE_URL", "http://localhost:5173"),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if len(c.AppSecretKey) < 32 {
		return fmt.Errorf("APP_SECRET_KEY must be at least 32 characters")
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	if c.DBUser == "" {
		return fmt.Errorf("DB_USER is required")
	}
	return nil
}

// DSN returns the PostgreSQL connection string.
func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d dbname=%s user=%s password=%s sslmode=disable",
		c.DBHost, c.DBPort, c.DBName, c.DBUser, c.DBPassword,
	)
}

// --- helpers ---

func getEnvStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}
