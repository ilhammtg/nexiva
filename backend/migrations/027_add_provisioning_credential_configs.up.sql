INSERT INTO app_configs (key, value, description) VALUES
  ('customer_number_prefix', '2026', 'Prefix untuk Nomor Pelanggan / Layanan'),
  ('pppoe_domain_suffix', 'ptnat.net', 'Suffix domain untuk PPPoE Username')
ON CONFLICT (key) DO NOTHING;
