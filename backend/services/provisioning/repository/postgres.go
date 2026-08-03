package repository

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"

	"isp-platform/registration/services/provisioning/model"
)

type postgresProvisioningRepository struct {
	db *sqlx.DB
}

// NewPostgresProvisioningRepository constructs a PostgreSQL-backed ProvisioningRepository.
func NewPostgresProvisioningRepository(db *sqlx.DB) ProvisioningRepository {
	return &postgresProvisioningRepository{db: db}
}

func (r *postgresProvisioningRepository) InsertLog(ctx context.Context, log *model.ProvisioningLog) error {
	query := `
		INSERT INTO provisioning_logs
			(registration_id, target, action, status, error_message, duration_ms, attempt_number)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`
	if _, err := r.db.ExecContext(ctx, query,
		log.RegistrationID, log.Target, log.Action, log.Status,
		log.ErrorMessage, log.DurationMs, log.AttemptNumber,
	); err != nil {
		return fmt.Errorf("provRepo.InsertLog: %w", err)
	}
	return nil
}

func (r *postgresProvisioningRepository) GetLogs(ctx context.Context, registrationID string) ([]model.ProvisioningLog, error) {
	var logs []model.ProvisioningLog
	query := `SELECT id, registration_id, target, action, status, error_message, duration_ms, attempt_number, created_at FROM provisioning_logs WHERE registration_id = $1 ORDER BY created_at ASC`
	if err := r.db.SelectContext(ctx, &logs, query, registrationID); err != nil {
		return nil, fmt.Errorf("provRepo.GetLogs: %w", err)
	}
	return logs, nil
}

func (r *postgresProvisioningRepository) GetProvisioningDetails(ctx context.Context, registrationID string) (*model.ProvisioningDetails, error) {
	var details model.ProvisioningDetails
	query := `
		SELECT 
			r.id AS registration_id,
			r.pppoe_username,
			r.pppoe_password,
			COALESCE(r.ont_serial_number, '') AS ont_serial_number,
			COALESCE(p.mikrotik_profile, '') AS mikrotik_profile,
			COALESCE(p.vlan_id, 0) AS vlan_id,
			COALESCE(p.olt_line_profile_id, 0) AS olt_line_profile_id,
			COALESCE(p.olt_srv_profile_id, 0) AS olt_srv_profile_id,
			o.name AS olt_name,
			o.olt_host,
			o.olt_port_ssh,
			o.gpon_slot,
			o.gpon_port
		FROM registrations r
		LEFT JOIN packages p ON r.package_id = p.id
		LEFT JOIN olt_port_configs o ON r.olt_port_config_id = o.id
		WHERE r.id = $1`
	if err := r.db.GetContext(ctx, &details, query, registrationID); err != nil {
		return nil, fmt.Errorf("provRepo.GetProvisioningDetails: %w", err)
	}
	return &details, nil
}

func (r *postgresProvisioningRepository) GetActiveMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error) {
	var configs []model.MikrotikConfig
	query := `SELECT id, name, host, port, username, password_enc, is_active FROM mikrotik_configs WHERE is_active = true`
	if err := r.db.SelectContext(ctx, &configs, query); err != nil {
		return nil, fmt.Errorf("provRepo.GetActiveMikrotikConfigs: %w", err)
	}
	return configs, nil
}

func (r *postgresProvisioningRepository) UpdateRegistrationStatus(ctx context.Context, registrationID string, status string, notes string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("provRepo.UpdateRegistrationStatus begin tx: %w", err)
	}
	defer tx.Rollback()

	// Get current status
	var currentStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM registrations WHERE id = $1`, registrationID).Scan(&currentStatus); err != nil {
		currentStatus = "provisioning" // fallback
	}

	// Update registration status
	var query string
	if status == "active" || status == "provisioning_failed" {
		query = `UPDATE registrations SET status = $1, activated_at = COALESCE(activated_at, NOW()), updated_at = NOW() WHERE id = $2`
	} else {
		query = `UPDATE registrations SET status = $1, updated_at = NOW() WHERE id = $2`
	}
	if _, err := tx.ExecContext(ctx, query, status, registrationID); err != nil {
		return fmt.Errorf("provRepo.UpdateRegistrationStatus exec update: %w", err)
	}

	// Insert audit log using correct columns status_from and status_to
	logQuery := `
		INSERT INTO registration_logs (registration_id, status_from, status_to, changed_by, changed_by_role, reason)
		VALUES ($1, $2, $3, NULL, 'system', $4)`
	if _, err := tx.ExecContext(ctx, logQuery, registrationID, currentStatus, status, notes); err != nil {
		return fmt.Errorf("provRepo.UpdateRegistrationStatus exec log: %w", err)
	}

	return tx.Commit()
}
