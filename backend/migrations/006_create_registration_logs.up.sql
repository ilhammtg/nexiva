-- 006_create_registration_logs.up.sql
CREATE TABLE IF NOT EXISTS registration_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  status_from     TEXT,
  status_to       TEXT NOT NULL,
  changed_by      UUID REFERENCES users(id),
  changed_by_role TEXT,
  reason          TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_logs_registration ON registration_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_reg_logs_created ON registration_logs(created_at DESC);
