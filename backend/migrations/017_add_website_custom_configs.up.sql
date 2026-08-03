INSERT INTO app_configs (key, value, description) VALUES
  ('website_hero_title', 'Internet Cepat, Tanpa Batas, Untuk Keluarga Anda', 'Judul utama di halaman pendaftaran online'),
  ('website_hero_subtitle', 'Nikmati koneksi internet fiber optic super cepat, stabil, dan unlimited untuk aktivitas streaming, belajar, bekerja, dan gaming tanpa hambatan.', 'Deskripsi sub-judul di halaman pendaftaran online'),
  ('website_contact_phone', '081234567890', 'Nomor kontak WhatsApp/Telepon untuk bantuan / informasi'),
  ('website_contact_email', 'support@ispcenter.net', 'Alamat email bantuan pelanggan'),
  ('website_address', 'Jl. Raya Utama No. 88, Banda Aceh, Indonesia', 'Alamat kantor operasional ISP')
ON CONFLICT (key) DO NOTHING;
