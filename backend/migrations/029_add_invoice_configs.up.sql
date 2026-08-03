-- 029_add_invoice_configs.up.sql
INSERT INTO app_configs (key, value, description) VALUES
  ('invoice_company_name', 'PT Jaringan Sarana Nusantara', 'Nama perusahaan yang tertera di invoice/kuitansi'),
  ('invoice_company_address', 'Jl. Utama Raya No. 45, Jakarta Pusat', 'Alamat operasional perusahaan di invoice'),
  ('invoice_company_phone', '(021) 555-1234', 'Nomor telepon operasional di invoice'),
  ('invoice_company_email', 'support@jsn.net.id', 'Alamat email dukungan pelanggan di invoice'),
  ('invoice_tax_rate', '11', 'Persentase PPN (%)'),
  ('invoice_payment_instructions', 'Bank Mandiri Virtual Account: 88932 + Nomor HP Anda\nBank BCA Rekening: 123-456-7890 (a.n. PT Jaringan Sarana Nusantara)', 'Metode/instruksi pembayaran pada invoice'),
  ('wa_system_number', '085167720007', 'Nomor WhatsApp resmi pengirim notifikasi sistem')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;
