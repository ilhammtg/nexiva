-- 002_create_packages.up.sql
CREATE TABLE IF NOT EXISTS packages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  price_monthly         BIGINT NOT NULL,
  price_installation    BIGINT NOT NULL DEFAULT 0,
  speed_down_mbps       INT NOT NULL,
  speed_up_mbps         INT NOT NULL,
  mikrotik_profile      TEXT NOT NULL,
  olt_line_profile_id   INT NOT NULL,
  olt_srv_profile_id    INT NOT NULL,
  vlan_id               INT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
