-- 004_create_mikrotik_configs.up.sql
CREATE TABLE IF NOT EXISTS mikrotik_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  host            TEXT NOT NULL,
  port            INT NOT NULL DEFAULT 443,
  username        TEXT NOT NULL,
  password_enc    TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  is_online       BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
