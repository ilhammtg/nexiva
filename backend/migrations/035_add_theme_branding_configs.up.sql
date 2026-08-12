INSERT INTO app_configs (key, value, description) VALUES
  ('brand_primary_color', '#2563eb', 'Kode warna HEX primer untuk branding tenant (contoh: #2563eb)'),
  ('brand_secondary_color', '#4f46e5', 'Kode warna HEX sekunder untuk branding tenant (contoh: #4f46e5)'),
  ('brand_accent_color', '#f59e0b', 'Kode warna HEX aksen untuk branding tenant (contoh: #f59e0b)'),
  ('brand_favicon_url', '', 'URL atau path gambar favicon tenant. Kosongkan untuk default')
ON CONFLICT (key) DO NOTHING;
