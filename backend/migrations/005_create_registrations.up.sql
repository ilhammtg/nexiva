-- 005_create_registrations.up.sql
CREATE TABLE IF NOT EXISTS registrations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number                TEXT NOT NULL UNIQUE,
  customer_id               UUID REFERENCES users(id),
  full_name                 TEXT NOT NULL,
  nik                       TEXT,
  phone                     TEXT NOT NULL,
  email                     TEXT,
  province                  TEXT NOT NULL,
  city                      TEXT NOT NULL,
  district                  TEXT NOT NULL,
  village                   TEXT NOT NULL,
  rt                        TEXT,
  rw                        TEXT,
  address_detail            TEXT NOT NULL,
  maps_lat                  NUMERIC(10,7),
  maps_lng                  NUMERIC(10,7),
  package_id                UUID NOT NULL REFERENCES packages(id),
  status                    TEXT NOT NULL DEFAULT 'pending_review'
                              CHECK (status IN (
                                'pending_review','survey_scheduled','survey_done','survey_failed',
                                'rejected','waiting_payment','payment_confirmed',
                                'installation_scheduled','provisioning','provisioning_failed','active'
                              )),
  cs_user_id                UUID REFERENCES users(id),
  technician_id             UUID REFERENCES users(id),
  survey_scheduled_at       TIMESTAMPTZ,
  survey_done_at            TIMESTAMPTZ,
  installation_scheduled_at TIMESTAMPTZ,
  activated_at              TIMESTAMPTZ,
  installation_fee          BIGINT,
  payment_amount            BIGINT,
  payment_date              DATE,
  payment_bank              TEXT,
  payment_confirmed_by      UUID REFERENCES users(id),
  payment_confirmed_at      TIMESTAMPTZ,
  survey_notes              TEXT,
  survey_is_feasible        BOOLEAN,
  survey_cable_length_m     INT,
  pppoe_username            TEXT UNIQUE,
  pppoe_password            TEXT,
  ont_serial_number         TEXT,
  ont_index                 INT,
  olt_port_config_id        UUID REFERENCES olt_port_configs(id),
  ktp_file_path             TEXT,
  rejection_reason          TEXT,
  internal_notes            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);
CREATE INDEX IF NOT EXISTS idx_registrations_cs ON registrations(cs_user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_technician ON registrations(technician_id);
CREATE INDEX IF NOT EXISTS idx_registrations_reg_number ON registrations(reg_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations(created_at DESC);
