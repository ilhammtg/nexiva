-- 009_create_app_configs.up.sql
CREATE TABLE IF NOT EXISTS app_configs (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 010_seed_default_configs.up.sql
INSERT INTO app_configs (key, value, description) VALUES
  ('reg_number_prefix', 'REG', 'Prefix nomor registrasi'),
  ('pppoe_username_prefix', 'ISP', 'Prefix username PPPoE'),
  ('provisioning_timeout_sec', '30', 'Timeout per operasi provisioning (detik)'),
  ('provisioning_max_retry', '3', 'Maksimum retry jika provisioning gagal'),
  ('notif_webhook_url', '', 'URL webhook WhatsApp/SMS gateway'),
  ('notif_enabled', 'true', 'Aktifkan notifikasi')
ON CONFLICT (key) DO NOTHING;
