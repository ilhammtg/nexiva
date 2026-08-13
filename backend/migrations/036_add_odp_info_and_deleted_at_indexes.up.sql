-- 036_add_odp_info_and_deleted_at_indexes.up.sql
CREATE INDEX IF NOT EXISTS idx_registrations_odp_info ON registrations(odp_info);
CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at ON registrations(deleted_at);
