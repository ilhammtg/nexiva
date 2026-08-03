package database

import (
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver

	"isp-platform/registration/internal/config"
)

const (
	maxRetries    = 15
	retryInterval = 2 * time.Second
)

// NewPostgres initializes a PostgreSQL connection pool via sqlx.
// It retries up to maxRetries times to tolerate Docker startup ordering.
func NewPostgres(cfg *config.Config) (*sqlx.DB, error) {
	db, err := sqlx.Open("postgres", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("database.NewPostgres: open: %w", err)
	}

	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetimeMin) * time.Minute)

	// Retry ping — postgres container may not be ready yet
	for i := 1; i <= maxRetries; i++ {
		if err := db.Ping(); err == nil {
			return db, nil
		} else if i == maxRetries {
			return nil, fmt.Errorf("database.NewPostgres: failed to connect after %d attempts: %w", maxRetries, err)
		}
		fmt.Printf("⏳ Waiting for PostgreSQL... (attempt %d/%d)\n", i, maxRetries)
		time.Sleep(retryInterval)
	}

	return db, nil
}
