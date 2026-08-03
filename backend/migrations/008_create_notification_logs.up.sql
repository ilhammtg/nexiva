-- 008_create_notification_logs.up.sql
CREATE TABLE IF NOT EXISTS notification_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id),
  recipient_phone TEXT NOT NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  template_name   TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('sent','failed','pending')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_registration ON notification_logs(registration_id);
