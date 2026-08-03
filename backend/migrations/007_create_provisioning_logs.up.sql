-- 007_create_provisioning_logs.up.sql
CREATE TABLE IF NOT EXISTS provisioning_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  target          TEXT NOT NULL CHECK (target IN ('mikrotik','olt_zte')),
  action          TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('started','success','failed')),
  request_payload JSONB,
  response_payload JSONB,
  error_message   TEXT,
  duration_ms     INT,
  attempt_number  INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prov_logs_registration ON provisioning_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_prov_logs_created ON provisioning_logs(created_at DESC);
