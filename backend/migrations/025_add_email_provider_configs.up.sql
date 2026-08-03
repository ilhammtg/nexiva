-- 025_add_email_provider_configs.up.sql
-- Add configuration keys for flexible email providers (SMTP, Mailtrap, Sendgrid)

INSERT INTO app_configs (key, value, description) VALUES
  ('email_provider', 'smtp', 'Penyedia pengiriman email yang aktif: smtp, mailtrap (API), atau sendgrid (API)'),
  ('mailtrap_api_token', '', 'API Token untuk pengiriman email menggunakan Mailtrap API'),
  ('sendgrid_api_key', '', 'API Key untuk pengiriman email menggunakan SendGrid API')
ON CONFLICT (key) DO NOTHING;
