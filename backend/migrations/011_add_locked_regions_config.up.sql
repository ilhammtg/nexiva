-- 011_add_locked_regions_config.up.sql
INSERT INTO app_configs (key, value, description) VALUES
  ('locked_regions', 'Bireuen, Aceh Utara', 'Daftar kabupaten/kota yang dikunci untuk pendaftaran (pisahkan dengan koma, kosongkan untuk membebaskan semua wilayah)')
ON CONFLICT (key) DO NOTHING;
