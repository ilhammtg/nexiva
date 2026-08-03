-- 024_add_system_smtp_whatsapp_configs.down.sql
DELETE FROM app_configs WHERE key IN (
  'verification_method',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_password',
  'smtp_from',
  'smtp_from_name',
  'wa_provider',
  'wa_api_key',
  'wa_api_url'
);
