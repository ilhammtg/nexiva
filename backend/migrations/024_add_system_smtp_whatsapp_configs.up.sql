-- 024_add_system_smtp_whatsapp_configs.up.sql
-- Add configuration keys for verification method, SMTP, and WhatsApp Gateway.

INSERT INTO app_configs (key, value, description) VALUES
  ('verification_method', 'email', 'Metode verifikasi yang digunakan: email, whatsapp, atau both (keduanya)'),
  ('smtp_host', '', 'Host server SMTP email (contoh: smtp.mailtrap.io atau smtp.gmail.com)'),
  ('smtp_port', '587', 'Port server SMTP email (contoh: 587 atau 465)'),
  ('smtp_user', '', 'Username/Email otentikasi SMTP'),
  ('smtp_password', '', 'Password atau App Password untuk otentikasi SMTP'),
  ('smtp_from', '', 'Alamat email pengirim default (contoh: noreply@perusahaan.com)'),
  ('smtp_from_name', '', 'Nama pengirim email default (contoh: PT JSN Admin)'),
  ('wa_provider', 'fonnte', 'Provider WhatsApp gateway yang digunakan: fonnte, starsender, ruangwa, atau other'),
  ('wa_api_key', '', 'API Key / Token akses untuk layanan WhatsApp Gateway'),
  ('wa_api_url', 'https://api.fonnte.com/send', 'URL Endpoint API untuk mengirim pesan WhatsApp')
ON CONFLICT (key) DO NOTHING;
