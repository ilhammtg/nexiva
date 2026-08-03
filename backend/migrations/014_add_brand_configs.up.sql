INSERT INTO app_configs (key, value, description) VALUES
  ('brand_name', 'PT JSN', 'Nama brand/merk ISP yang akan tampil di header dan halaman utama'),
  ('brand_logo_url', '', 'URL atau path gambar logo brand. Kosongkan untuk menggunakan logo icon default'),
  ('brand_footer_tagline', 'Temukan Kemudahan Dalam Genggaman', 'Teks tagline yang muncul di sebelah kiri footer'),
  ('brand_footer_download_text', 'Download App Kami', 'Teks promosi download aplikasi pada footer'),
  ('brand_footer_links', '[{"label": "Contact us", "url": "/contact"}, {"label": "Syarat & Ketentuan", "url": "/terms"}, {"label": "Kebijakan Privasi", "url": "/privacy"}, {"label": "Announcements", "url": "/announcements"}]', 'Tautan (links) menu tambahan pada footer dalam format JSON array'),
  ('brand_footer_socials', '[{"platform": "facebook", "url": "https://facebook.com"}, {"platform": "instagram", "url": "https://instagram.com"}, {"platform": "twitter", "url": "https://twitter.com"}, {"platform": "youtube", "url": "https://youtube.com"}]', 'Akun sosial media pada footer dalam format JSON array'),
  ('brand_footer_copyright', 'Copyright 2026 PT JSN All Right Reserved.', 'Pernyataan hak cipta (copyright) di bagian paling bawah footer')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
