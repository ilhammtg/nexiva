-- 040_add_service_expiry_to_registrations.down.sql
DROP INDEX IF EXISTS idx_registrations_service_expires_at;
ALTER TABLE registrations DROP COLUMN IF EXISTS service_expires_at;
