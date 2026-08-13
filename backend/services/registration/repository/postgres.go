package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	svcerr "isp-platform/registration/internal/errors"
	"isp-platform/registration/internal/utils"
	"isp-platform/registration/services/registration/model"
)

type postgresRegistrationRepository struct {
	db *sqlx.DB
}

// NewPostgresRegistrationRepository constructs a PostgreSQL-backed RegistrationRepository.
func NewPostgresRegistrationRepository(db *sqlx.DB) RegistrationRepository {
	return &postgresRegistrationRepository{db: db}
}

func (r *postgresRegistrationRepository) Create(ctx context.Context, reg *model.Registration) (*model.Registration, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("regRepo.Create: begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	query := `
		INSERT INTO registrations (
			reg_number, customer_id, full_name, nik, phone, email,
			province, city, district, village, rt, rw, address_detail,
			maps_lat, maps_lng, package_id, ktp_file_path, status, google_maps_link,
			ont_serial_number, olt_port_config_id, odp_info
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending_review',$18,$19,$20,$21
		) RETURNING *`

	var created model.Registration
	err = tx.QueryRowxContext(ctx, query,
		reg.RegNumber, reg.CustomerID, reg.FullName, reg.NIK, reg.Phone, reg.Email,
		reg.Province, reg.City, reg.District, reg.Village, reg.RT, reg.RW, reg.AddressDetail,
		reg.MapsLat, reg.MapsLng, reg.PackageID, reg.KTPFilePath, reg.GoogleMapsLink,
		reg.ONTSerialNumber, reg.OLTPortConfigID, reg.ODPInfo,
	).StructScan(&created)
	if err != nil {
		return nil, fmt.Errorf("regRepo.Create: insert: %w", err)
	}

	logQuery := `
		INSERT INTO registration_logs (registration_id, status_from, status_to, changed_by_role, reason)
		VALUES ($1, NULL, 'pending_review', 'system', 'Pendaftaran baru dibuat')`
	if _, err := tx.ExecContext(ctx, logQuery, created.ID); err != nil {
		return nil, fmt.Errorf("regRepo.Create: insert log: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("regRepo.Create: commit: %w", err)
	}

	return &created, nil
}

func (r *postgresRegistrationRepository) GetByID(ctx context.Context, id string) (*model.Registration, error) {
	var reg model.Registration
	query := `SELECT * FROM registrations WHERE id = $1 AND deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &reg, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetByID: %w", err)
	}
	return &reg, nil
}

func (r *postgresRegistrationRepository) GetByRegNumber(ctx context.Context, regNumber string) (*model.Registration, error) {
	var reg model.Registration
	query := `SELECT * FROM registrations WHERE reg_number = $1 AND deleted_at IS NULL`
	if err := r.db.GetContext(ctx, &reg, query, regNumber); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetByRegNumber: %w", err)
	}
	return &reg, nil
}

func (r *postgresRegistrationRepository) GetByPhone(ctx context.Context, phone string) (*model.Registration, error) {
	// Clean the phone number from non-digit characters
	var cleanSb strings.Builder
	for _, char := range phone {
		if char >= '0' && char <= '9' {
			cleanSb.WriteRune(char)
		}
	}
	cleanPhone := cleanSb.String()

	var reg model.Registration
	var query string

	// If phone length is long enough (e.g. min 9 digits), search by suffix
	if len(cleanPhone) >= 9 {
		suffix := cleanPhone[len(cleanPhone)-9:]
		query = `SELECT * FROM registrations WHERE (phone = $1 OR phone LIKE $2) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`
		if err := r.db.GetContext(ctx, &reg, query, phone, "%"+suffix); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, svcerr.ErrNotFound
			}
			return nil, fmt.Errorf("regRepo.GetByPhone: %w", err)
		}
	} else {
		query = `SELECT * FROM registrations WHERE phone = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`
		if err := r.db.GetContext(ctx, &reg, query, phone); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, svcerr.ErrNotFound
			}
			return nil, fmt.Errorf("regRepo.GetByPhone: %w", err)
		}
	}
	return &reg, nil
}

func (r *postgresRegistrationRepository) GetByNIK(ctx context.Context, nik string) (*model.Registration, error) {
	var reg model.Registration
	query := `SELECT * FROM registrations WHERE nik = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`
	if err := r.db.GetContext(ctx, &reg, query, nik); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetByNIK: %w", err)
	}
	return &reg, nil
}

func (r *postgresRegistrationRepository) List(ctx context.Context, filter ListFilter) ([]model.Registration, int, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, "r.deleted_at IS NULL")

	if filter.Status != "" {
		if filter.Status == "active" {
			conditions = append(conditions, "(r.status = 'active' OR r.status = 'isolir' OR r.status = 'provisioning_failed' OR r.status = 'installed')")
		} else {
			conditions = append(conditions, fmt.Sprintf("r.status = $%d", argIdx))
			args = append(args, filter.Status)
			argIdx++
		}
	}
	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(r.full_name ILIKE $%d OR r.phone ILIKE $%d OR r.reg_number ILIKE $%d OR r.customer_number ILIKE $%d OR r.pppoe_username ILIKE $%d OR r.ont_serial_number ILIKE $%d OR r.village ILIKE $%d OR r.district ILIKE $%d OR r.city ILIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}
	if filter.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("r.created_at >= $%d", argIdx))
		args = append(args, filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("r.created_at <= $%d", argIdx))
		args = append(args, filter.DateTo+" 23:59:59")
		argIdx++
	}
	if filter.PackageID != "" {
		conditions = append(conditions, fmt.Sprintf("r.package_id = $%d", argIdx))
		args = append(args, filter.PackageID)
		argIdx++
	}
	if filter.OLTPortConfigID != "" {
		conditions = append(conditions, fmt.Sprintf("r.olt_port_config_id = $%d", argIdx))
		args = append(args, filter.OLTPortConfigID)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM registrations r WHERE %s`, where)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("regRepo.List count: %w", err)
	}

	listArgs := append(args, filter.Pagination.PerPage, filter.Pagination.Offset)
	listQuery := fmt.Sprintf(`
		SELECT r.* FROM registrations r
		WHERE %s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	var regs []model.Registration
	if err := r.db.SelectContext(ctx, &regs, listQuery, listArgs...); err != nil {
		return nil, 0, fmt.Errorf("regRepo.List: %w", err)
	}

	return regs, total, nil
}

func (r *postgresRegistrationRepository) UpdateStatus(ctx context.Context, id string, status model.Status, changedBy, changedByRole, reason string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("regRepo.UpdateStatus: begin tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	// Get current status
	var currentStatus string
	if err := tx.QueryRowContext(ctx, `SELECT status FROM registrations WHERE id = $1`, id).Scan(&currentStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return svcerr.ErrNotFound
		}
		return fmt.Errorf("regRepo.UpdateStatus: get current: %w", err)
	}

	// Update status
	if _, err := tx.ExecContext(ctx, `UPDATE registrations SET status = $1, updated_at = NOW() WHERE id = $2`, status, id); err != nil {
		return fmt.Errorf("regRepo.UpdateStatus: update: %w", err)
	}

	// Insert audit log
	logQuery := `
		INSERT INTO registration_logs (registration_id, status_from, status_to, changed_by, changed_by_role, reason)
		VALUES ($1, $2, $3, $4, $5, $6)`
	var changedByPtr *string
	if changedBy != "" && changedBy != "system" {
		changedByPtr = &changedBy
	}
	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}
	if _, err := tx.ExecContext(ctx, logQuery, id, currentStatus, status, changedByPtr, changedByRole, reasonPtr); err != nil {
		return fmt.Errorf("regRepo.UpdateStatus: insert log: %w", err)
	}

	return tx.Commit()
}

func (r *postgresRegistrationRepository) UpdateFields(ctx context.Context, id string, fields map[string]interface{}) error {
	if len(fields) == 0 {
		return nil
	}

	if val, ok := fields["olt_port_config_id"]; ok && val != nil {
		strVal := fmt.Sprintf("%v", val)
		if strVal == "" || strVal == "<nil>" || strVal == "null" {
			fields["olt_port_config_id"] = nil
		} else {
			var exists bool
			_ = r.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM olt_port_configs WHERE id = $1)`, strVal)
			if !exists {
				fields["olt_port_config_id"] = nil
			}
		}
	}

	setClauses := make([]string, 0, len(fields))
	args := make([]interface{}, 0, len(fields)+1)
	idx := 1

	for col, val := range fields {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, val)
		idx++
	}
	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)

	query := fmt.Sprintf("UPDATE registrations SET %s WHERE id = $%d", strings.Join(setClauses, ", "), idx)
	if _, err := r.db.ExecContext(ctx, query, args...); err != nil {
		return fmt.Errorf("regRepo.UpdateFields: %w", err)
	}
	return nil
}

func (r *postgresRegistrationRepository) GetLogs(ctx context.Context, registrationID string) ([]model.RegistrationLog, error) {
	var logs []model.RegistrationLog
	query := `SELECT * FROM registration_logs WHERE registration_id = $1 ORDER BY created_at ASC`
	if err := r.db.SelectContext(ctx, &logs, query, registrationID); err != nil {
		return nil, fmt.Errorf("regRepo.GetLogs: %w", err)
	}
	return logs, nil
}

func (r *postgresRegistrationRepository) ListPackages(ctx context.Context, activeOnly bool) ([]model.Package, error) {
	var packages []model.Package
	query := `SELECT * FROM packages`
	if activeOnly {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY sort_order, name`
	if err := r.db.SelectContext(ctx, &packages, query); err != nil {
		return nil, fmt.Errorf("regRepo.ListPackages: %w", err)
	}
	return packages, nil
}

func (r *postgresRegistrationRepository) GetPackageByID(ctx context.Context, id string) (*model.Package, error) {
	var p model.Package
	if err := r.db.GetContext(ctx, &p, `SELECT * FROM packages WHERE id = $1`, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetPackageByID: %w", err)
	}
	return &p, nil
}

func (r *postgresRegistrationRepository) CreatePackage(ctx context.Context, p *model.Package) (*model.Package, error) {
	query := `
		INSERT INTO packages (name, description, device_recommendation, price_monthly, price_installation, speed_down_mbps, speed_up_mbps,
			mikrotik_profile, olt_line_profile_id, olt_srv_profile_id, vlan_id, sort_order, terms)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`
	var created model.Package
	if err := r.db.QueryRowxContext(ctx, query,
		p.Name, p.Description, p.DeviceRecommendation, p.PriceMonthly, p.PriceInstallation, p.SpeedDownMbps, p.SpeedUpMbps,
		p.MikrotikProfile, p.OLTLineProfileID, p.OLTSrvProfileID, p.VlanID, p.SortOrder, p.Terms,
	).StructScan(&created); err != nil {
		return nil, fmt.Errorf("regRepo.CreatePackage: %w", err)
	}
	return &created, nil
}

func (r *postgresRegistrationRepository) UpdatePackage(ctx context.Context, p *model.Package) error {
	query := `
		UPDATE packages SET name=$1, description=$2, device_recommendation=$3, price_monthly=$4, price_installation=$5,
			speed_down_mbps=$6, speed_up_mbps=$7, mikrotik_profile=$8, olt_line_profile_id=$9,
			olt_srv_profile_id=$10, vlan_id=$11, sort_order=$12, is_active=$13, terms=$14, updated_at=NOW()
		WHERE id=$15`
	if _, err := r.db.ExecContext(ctx, query,
		p.Name, p.Description, p.DeviceRecommendation, p.PriceMonthly, p.PriceInstallation, p.SpeedDownMbps, p.SpeedUpMbps,
		p.MikrotikProfile, p.OLTLineProfileID, p.OLTSrvProfileID, p.VlanID, p.SortOrder, p.IsActive, p.Terms, p.ID,
	); err != nil {
		return fmt.Errorf("regRepo.UpdatePackage: %w", err)
	}
	return nil
}

func (r *postgresRegistrationRepository) TogglePackage(ctx context.Context, id string) (bool, error) {
	var isActive bool
	query := `UPDATE packages SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING is_active`
	if err := r.db.QueryRowContext(ctx, query, id).Scan(&isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, svcerr.ErrNotFound
		}
		return false, fmt.Errorf("regRepo.TogglePackage: %w", err)
	}
	return isActive, nil
}

func (r *postgresRegistrationRepository) ListOLTPorts(ctx context.Context) ([]model.OLTPortConfig, error) {
	var ports []model.OLTPortConfig
	if err := r.db.SelectContext(ctx, &ports, `SELECT * FROM olt_port_configs ORDER BY area_name, name`); err != nil {
		return nil, fmt.Errorf("regRepo.ListOLTPorts: %w", err)
	}

	if len(ports) == 0 {
		seedQuery := `
		INSERT INTO olt_port_configs (id, name, area_name, olt_host, olt_port_ssh, gpon_slot, gpon_port, max_ont, current_ont_count, is_active, notes) VALUES
		  ('20000000-0000-0000-0000-000000000001', 'OLT-PUSAT-0/1/1',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 1, 64, 12, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
		  ('20000000-0000-0000-0000-000000000002', 'OLT-PUSAT-0/1/2',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 2, 64, 4, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
		  ('20000000-0000-0000-0000-000000000003', 'OLT-UTARA-0/1/1',  'Area Simpang 4',     '192.168.10.2', 22, 0, 1, 64, 8, true, '{"vendor":"vsol_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
		  ('20000000-0000-0000-0000-000000000004', 'OLT-SELATAN-0/2/1','Area Matang Glumpang','192.168.10.3', 22, 0, 1, 64, 2, true, '{"vendor":"huawei_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
		  ('20000000-0000-0000-0000-000000000005', 'OLT-TIMUR-0/1/1',  'Area Peusangan',     '192.168.10.4', 22, 0, 1, 64, 0, true, '{"vendor":"hioso_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
		  ('20000000-0000-0000-0000-000000000006', 'OLT-BARAT-0/1/1',  'Area Juli',          '192.168.10.5', 22, 0, 1, 64, 0, false,'{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}')
		ON CONFLICT (id) DO UPDATE SET
		  name = EXCLUDED.name,
		  area_name = EXCLUDED.area_name,
		  olt_host = EXCLUDED.olt_host,
		  notes = EXCLUDED.notes`
		_, _ = r.db.ExecContext(ctx, seedQuery)
		_ = r.db.SelectContext(ctx, &ports, `SELECT * FROM olt_port_configs ORDER BY area_name, name`)
	}

	return ports, nil
}

func (r *postgresRegistrationRepository) CreateOLTPort(ctx context.Context, p *model.OLTPortConfig) (*model.OLTPortConfig, error) {
	query := `
		INSERT INTO olt_port_configs (name, area_name, olt_host, olt_port_ssh, gpon_slot, gpon_port, max_ont, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`
	var created model.OLTPortConfig
	if err := r.db.QueryRowxContext(ctx, query,
		p.Name, p.AreaName, p.OLTHost, p.OLTPortSSH, p.GponSlot, p.GponPort, p.MaxONT, p.Notes,
	).StructScan(&created); err != nil {
		return nil, fmt.Errorf("regRepo.CreateOLTPort: %w", err)
	}
	return &created, nil
}

func (r *postgresRegistrationRepository) UpdateOLTPort(ctx context.Context, p *model.OLTPortConfig) error {
	query := `
		UPDATE olt_port_configs
		SET name = $1, area_name = $2, olt_host = $3, olt_port_ssh = $4, gpon_slot = $5, gpon_port = $6, max_ont = $7, notes = $8, updated_at = NOW()
		WHERE id = $9`
	if _, err := r.db.ExecContext(ctx, query,
		p.Name, p.AreaName, p.OLTHost, p.OLTPortSSH, p.GponSlot, p.GponPort, p.MaxONT, p.Notes, p.ID,
	); err != nil {
		return fmt.Errorf("regRepo.UpdateOLTPort: %w", err)
	}
	return nil
}

func (r *postgresRegistrationRepository) DeleteOLTPort(ctx context.Context, id string) error {
	query := `DELETE FROM olt_port_configs WHERE id = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("regRepo.DeleteOLTPort: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return svcerr.ErrNotFound
	}
	return nil
}

func (r *postgresRegistrationRepository) GetOLTPortByID(ctx context.Context, id string) (*model.OLTPortConfig, error) {
	var port model.OLTPortConfig
	query := `SELECT * FROM olt_port_configs WHERE id = $1`
	if err := r.db.GetContext(ctx, &port, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetOLTPortByID: %w", err)
	}
	return &port, nil
}

func (r *postgresRegistrationRepository) ListConfigs(ctx context.Context) ([]model.AppConfig, error) {
	var configs []model.AppConfig
	if err := r.db.SelectContext(ctx, &configs, `SELECT * FROM app_configs ORDER BY key`); err != nil {
		return nil, fmt.Errorf("regRepo.ListConfigs: %w", err)
	}
	return configs, nil
}

func (r *postgresRegistrationRepository) UpdateConfig(ctx context.Context, key, value, updatedBy string) error {
	var updatedByVal *string
	if updatedBy != "" && updatedBy != "00000000-0000-0000-0000-000000000000" {
		updatedByVal = &updatedBy
	}

	query := `
		INSERT INTO app_configs (key, value, updated_by, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (key) DO UPDATE 
		SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`
	_, err := r.db.ExecContext(ctx, query, key, value, updatedByVal)
	if err != nil {
		return fmt.Errorf("regRepo.UpdateConfig upsert: %w", err)
	}
	return nil
}

func (r *postgresRegistrationRepository) ListActivityLogs(ctx context.Context, filter ListFilter) ([]model.RegistrationLog, int, error) {
	// Simplified implementation — returns recent registration_logs joined with registration data
	var logs []model.RegistrationLog
	query := `SELECT * FROM registration_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	if err := r.db.SelectContext(ctx, &logs, query, filter.Pagination.PerPage, filter.Pagination.Offset); err != nil {
		return nil, 0, fmt.Errorf("regRepo.ListActivityLogs: %w", err)
	}

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM registration_logs`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("regRepo.ListActivityLogs count: %w", err)
	}

	return logs, total, nil
}

func (r *postgresRegistrationRepository) CountByStatus(ctx context.Context, _ string) (map[string]int, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT status, COUNT(*) FROM registrations WHERE deleted_at IS NULL GROUP BY status`)
	if err != nil {
		return nil, fmt.Errorf("regRepo.CountByStatus: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("regRepo.CountByStatus scan: %w", err)
		}
		result[status] = count
	}
	return result, rows.Err()
}

// Ensure interface is satisfied at compile time.
var _ RegistrationRepository = (*postgresRegistrationRepository)(nil)

func (r *postgresRegistrationRepository) ListMikrotikConfigs(ctx context.Context) ([]model.MikrotikConfig, error) {
	var configs []model.MikrotikConfig
	query := `SELECT * FROM mikrotik_configs ORDER BY name`
	if err := r.db.SelectContext(ctx, &configs, query); err != nil {
		return nil, fmt.Errorf("regRepo.ListMikrotikConfigs: %w", err)
	}
	return configs, nil
}

func (r *postgresRegistrationRepository) GetMikrotikConfigByID(ctx context.Context, id string) (*model.MikrotikConfig, error) {
	var config model.MikrotikConfig
	query := `SELECT * FROM mikrotik_configs WHERE id = $1`
	if err := r.db.GetContext(ctx, &config, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, svcerr.ErrNotFound
		}
		return nil, fmt.Errorf("regRepo.GetMikrotikConfigByID: %w", err)
	}
	return &config, nil
}

func (r *postgresRegistrationRepository) CreateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig) (*model.MikrotikConfig, error) {
	query := `
		INSERT INTO mikrotik_configs (name, host, port, username, password_enc, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING *`
	var created model.MikrotikConfig
	if err := r.db.QueryRowxContext(ctx, query,
		m.Name, m.Host, m.Port, m.Username, m.PasswordEnc, m.IsActive,
	).StructScan(&created); err != nil {
		return nil, fmt.Errorf("regRepo.CreateMikrotikConfig: %w", err)
	}
	return &created, nil
}

func (r *postgresRegistrationRepository) UpdateMikrotikConfig(ctx context.Context, m *model.MikrotikConfig) error {
	query := `
		UPDATE mikrotik_configs
		SET name = $1, host = $2, port = $3, username = $4, password_enc = $5, is_active = $6, updated_at = NOW()
		WHERE id = $7`
	if _, err := r.db.ExecContext(ctx, query,
		m.Name, m.Host, m.Port, m.Username, m.PasswordEnc, m.IsActive, m.ID,
	); err != nil {
		return fmt.Errorf("regRepo.UpdateMikrotikConfig: %w", err)
	}
	return nil
}

func (r *postgresRegistrationRepository) DeleteMikrotikConfig(ctx context.Context, id string) error {
	query := `DELETE FROM mikrotik_configs WHERE id = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("regRepo.DeleteMikrotikConfig: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return svcerr.ErrNotFound
	}
	return nil
}

func (r *postgresRegistrationRepository) ToggleMikrotikConfig(ctx context.Context, id string) (bool, error) {
	var isActive bool
	query := `UPDATE mikrotik_configs SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING is_active`
	if err := r.db.QueryRowContext(ctx, query, id).Scan(&isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, svcerr.ErrNotFound
		}
		return false, fmt.Errorf("regRepo.ToggleMikrotikConfig: %w", err)
	}
	return isActive, nil
}

func (r *postgresRegistrationRepository) UpdateMikrotikStatus(ctx context.Context, id string, isOnline bool) error {
	query := `UPDATE mikrotik_configs SET last_checked_at = NOW(), is_online = $1 WHERE id = $2`
	res, err := r.db.ExecContext(ctx, query, isOnline, id)
	if err != nil {
		return fmt.Errorf("regRepo.UpdateMikrotikStatus: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return svcerr.ErrNotFound
	}
	return nil
}

func (r *postgresRegistrationRepository) GetLastCustomerNumber(ctx context.Context, prefix string) (string, error) {
	var lastCustNum string
	query := `SELECT customer_number FROM registrations WHERE customer_number LIKE $1 ORDER BY customer_number DESC LIMIT 1`
	err := r.db.GetContext(ctx, &lastCustNum, query, prefix+"%")
	if err != nil {
		return "", err
	}
	return lastCustNum, nil
}

func (r *postgresRegistrationRepository) GetAllCustomerNumbers(ctx context.Context) ([]string, error) {
	var list []string
	query := `SELECT customer_number FROM registrations WHERE customer_number IS NOT NULL AND deleted_at IS NULL`
	err := r.db.SelectContext(ctx, &list, query)
	if err != nil {
		// If no rows found or other err (Select returns empty slice if no rows, so err is DB connection or schema issues)
		return nil, err
	}
	return list, nil
}

func (r *postgresRegistrationRepository) GetLastRegistrationNumber(ctx context.Context, prefix string) (string, error) {
	var lastRegNum string
	query := `SELECT reg_number FROM registrations WHERE reg_number LIKE $1 ORDER BY reg_number DESC LIMIT 1`
	err := r.db.GetContext(ctx, &lastRegNum, query, prefix+"%")
	if err != nil {
		return "", err
	}
	return lastRegNum, nil
}

func (r *postgresRegistrationRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE registrations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("regRepo.Delete: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("regRepo.Delete rows affected: %w", err)
	}
	if n == 0 {
		return svcerr.ErrNotFound
	}
	return nil
}

func (r *postgresRegistrationRepository) ListODPs(ctx context.Context) ([]model.ODP, error) {
	query := `
		SELECT o.id, o.code, o.name, o.olt_port_config_id, o.total_ports, o.latitude, o.longitude, o.address_notes, o.created_at, o.updated_at,
		       COALESCE((SELECT COUNT(*) FROM registrations r WHERE r.odp_info = o.code AND r.deleted_at IS NULL), 0) AS used_ports
		FROM odps o
		ORDER BY o.code ASC`

	var odps []model.ODP
	if err := r.db.SelectContext(ctx, &odps, query); err != nil {
		return nil, fmt.Errorf("regRepo.ListODPs: %w", err)
	}
	if odps == nil {
		odps = []model.ODP{}
	}
	return odps, nil
}

func (r *postgresRegistrationRepository) CreateODP(ctx context.Context, req *model.CreateODPRequest) (*model.ODP, error) {
	if req.OLTPortConfigID != nil {
		var exists bool
		_ = r.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM olt_port_configs WHERE id = $1)`, *req.OLTPortConfigID)
		if !exists {
			req.OLTPortConfigID = nil
		}
	}

	if req.Code != "" {
		var existingID string
		_ = r.db.GetContext(ctx, &existingID, `SELECT id FROM odps WHERE code = $1 LIMIT 1`, req.Code)
		if existingID != "" {
			req.Code = fmt.Sprintf("%s-%d", req.Code, time.Now().Unix()%1000)
		}
	}

	query := `
		INSERT INTO odps (code, name, olt_port_config_id, total_ports, latitude, longitude, address_notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, code, name, olt_port_config_id, total_ports, 0 AS used_ports, latitude, longitude, address_notes, created_at, updated_at`

	var created model.ODP
	err := r.db.QueryRowxContext(ctx, query, req.Code, req.Name, req.OLTPortConfigID, req.TotalPorts, req.Latitude, req.Longitude, req.AddressNotes).StructScan(&created)
	if err != nil {
		return nil, fmt.Errorf("regRepo.CreateODP: %w", err)
	}
	return &created, nil
}

func (r *postgresRegistrationRepository) UpdateODP(ctx context.Context, id string, req *model.CreateODPRequest) (*model.ODP, error) {
	if req.OLTPortConfigID != nil {
		var exists bool
		_ = r.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM olt_port_configs WHERE id = $1)`, *req.OLTPortConfigID)
		if !exists {
			req.OLTPortConfigID = nil
		}
	}

	query := `
		WITH updated AS (
			UPDATE odps
			SET code = COALESCE(NULLIF($1, ''), code),
			    name = COALESCE(NULLIF($2, ''), name),
			    olt_port_config_id = $3,
			    total_ports = GREATEST(1, $4),
			    latitude = $5,
			    longitude = $6,
			    address_notes = $7,
			    updated_at = NOW()
			WHERE id = $8
			RETURNING id, code, name, olt_port_config_id, total_ports, latitude, longitude, address_notes, created_at, updated_at
		)
		SELECT u.id, u.code, u.name, u.olt_port_config_id, u.total_ports, u.latitude, u.longitude, u.address_notes, u.created_at, u.updated_at,
		       COALESCE((SELECT COUNT(*) FROM registrations r WHERE (r.odp_info = u.code OR r.odp_info = u.name) AND r.deleted_at IS NULL), 0) AS used_ports
		FROM updated u`

	var updated model.ODP
	err := r.db.QueryRowxContext(ctx, query, req.Code, req.Name, req.OLTPortConfigID, req.TotalPorts, req.Latitude, req.Longitude, req.AddressNotes, id).StructScan(&updated)
	if err != nil {
		return nil, fmt.Errorf("regRepo.UpdateODP: %w", err)
	}
	return &updated, nil
}

func (r *postgresRegistrationRepository) DeleteODP(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM odps WHERE id = $1`, id)
	return err
}

// Keep import for pagination utils
var _ = utils.PaginationParams{}
