-- 025_add_email_provider_configs.down.sql
-- Remove email provider configuration keys

DELETE FROM app_configs WHERE key IN ('email_provider', 'mailtrap_api_token', 'sendgrid_api_key');
