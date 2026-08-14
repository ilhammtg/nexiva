-- 039_add_billing_scheme_configs.up.sql
INSERT INTO app_configs (key, value, description) VALUES
  ('billing_scheme',              'postpaid', 'Skema billing universal: postpaid (pascabayar) atau prepaid (prabayar)'),
  ('billing_due_day',             '5',        '(Postpaid) Tanggal jatuh tempo tiap bulan (1-28)'),
  ('billing_grace_period_days',   '7',        'Toleransi hari setelah jatuh tempo sebelum isolasi otomatis'),
  ('billing_reminder_days_before','3',        'Kirim WA reminder H-N sebelum jatuh tempo (postpaid) atau expired (prepaid)'),
  ('billing_prepaid_period_days', '30',       '(Prepaid) Durasi masa aktif layanan per periode pembayaran (hari)')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;
