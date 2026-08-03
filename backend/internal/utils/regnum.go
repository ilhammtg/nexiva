package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// GenerateRegNumber generates a unique registration number in the format REG-YYYYMMDD-XXXX.
// It queries the DB for the current day's count to produce a sequential suffix.
func GenerateRegNumber(ctx context.Context, db *sqlx.DB) (string, error) {
	today := time.Now().Format("20060102")
	prefix := fmt.Sprintf("REG-%s-", today)

	var count int
	query := `SELECT COUNT(*) FROM registrations WHERE reg_number LIKE $1`
	if err := db.QueryRowContext(ctx, query, prefix+"%").Scan(&count); err != nil {
		return "", fmt.Errorf("regnum.GenerateRegNumber: %w", err)
	}

	// Zero-pad to 4 digits, start from 0001
	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}
