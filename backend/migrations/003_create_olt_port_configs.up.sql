-- 003_create_olt_port_configs.up.sql
CREATE TABLE IF NOT EXISTS olt_port_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  area_name         TEXT NOT NULL,
  olt_host          TEXT NOT NULL,
  olt_port_ssh      INT NOT NULL DEFAULT 22,
  gpon_slot         INT NOT NULL,
  gpon_port         INT NOT NULL,
  max_ont           INT NOT NULL DEFAULT 64,
  current_ont_count INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
