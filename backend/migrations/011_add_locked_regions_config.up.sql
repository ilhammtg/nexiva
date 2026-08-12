-- 011_add_locked_regions_config.up.sql
INSERT INTO app_configs (key, value, description) VALUES
  ('locked_regions', '', 'Daftar kabupaten/kota yang dikunci untuk pendaftaran (pisahkan dengan koma, kosongkan untuk membebaskan semua wilayah)')
ON CONFLICT (key) DO NOTHING;
