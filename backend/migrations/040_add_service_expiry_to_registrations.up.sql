-- 040_add_service_expiry_to_registrations.up.sql
-- Tambah kolom masa aktif layanan untuk skema prepaid (prabayar)
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS service_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_registrations_service_expires_at
  ON registrations(service_expires_at)
  WHERE service_expires_at IS NOT NULL AND deleted_at IS NULL;
