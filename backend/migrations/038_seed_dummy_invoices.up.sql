-- 038_seed_dummy_invoices.up.sql

-- 1. Budi Santoso (Status: active, Package: Home 20 Mbps - Rp 200.000 + Rp 22.000 PPN = Rp 222.000)
-- Tagihan periode Juli 2026 yang sudah LUNAS
INSERT INTO invoices (id, invoice_number, registration_id, period, amount, tax_amount, due_date, status, paid_at, payment_bank, payment_confirmed_at, payment_confirmed_by, created_at, updated_at)
VALUES (
  '70000000-0000-0000-0000-000000000001',
  'INV/20260701/0001',
  '50000000-0000-0000-0000-000000000001',
  '2026-07-01',
  200000,
  22000,
  '2026-07-08',
  'paid',
  '2026-07-07 10:30:00+07',
  'BNI',
  '2026-07-07 11:00:00+07',
  '00000000-0000-0000-0000-000000000002',
  '2026-07-01 08:00:00+07',
  '2026-07-07 11:00:00+07'
) ON CONFLICT (invoice_number) DO NOTHING;

-- 2. Siti Rahmi (Status: active, Package: Home 50 Mbps - Rp 350.000 + Rp 38.500 PPN = Rp 388.500)
-- Tagihan periode Agustus 2026 yang BELUM BAYAR (belum jatuh tempo)
INSERT INTO invoices (id, invoice_number, registration_id, period, amount, tax_amount, due_date, status, created_at, updated_at)
VALUES (
  '70000000-0000-0000-0000-000000000002',
  'INV/20260801/0002',
  '50000000-0000-0000-0000-000000000002',
  '2026-08-01',
  350000,
  38500,
  CURRENT_DATE + INTERVAL '5 days',
  'unpaid',
  '2026-08-01 08:00:00+07',
  '2026-08-01 08:00:00+07'
) ON CONFLICT (invoice_number) DO NOTHING;

-- 3. Muhammad Iqbal (Status: isolir, Package: Home 20 Mbps - Rp 200.000 + Rp 22.000 PPN = Rp 222.000)
-- Tagihan periode Juli 2026 yang OVERDUE (lewat jatuh tempo)
INSERT INTO invoices (id, invoice_number, registration_id, period, amount, tax_amount, due_date, status, created_at, updated_at)
VALUES (
  '70000000-0000-0000-0000-000000000003',
  'INV/20260701/0003',
  '50000000-0000-0000-0000-000000000003',
  '2026-07-01',
  200000,
  22000,
  '2026-07-08',
  'overdue',
  '2026-07-01 08:00:00+07',
  '2026-07-01 08:00:00+07'
) ON CONFLICT (invoice_number) DO NOTHING;

-- Sinkronisasi status Muhammad Iqbal di tabel registrations menjadi 'isolir'
UPDATE registrations SET status = 'isolir' WHERE id = '50000000-0000-0000-0000-000000000003';

-- 4. Nurhayati (Status: isolir, Package: Lite 10 Mbps - Rp 150.000 + Rp 16.500 PPN = Rp 166.500)
-- Tagihan periode Juli 2026 yang OVERDUE (lewat jatuh tempo)
INSERT INTO invoices (id, invoice_number, registration_id, period, amount, tax_amount, due_date, status, created_at, updated_at)
VALUES (
  '70000000-0000-0000-0000-000000000004',
  'INV/20260701/0004',
  '50000000-0000-0000-0000-000000000004',
  '2026-07-01',
  150000,
  16500,
  '2026-07-08',
  'overdue',
  '2026-07-01 08:00:00+07',
  '2026-07-01 08:00:00+07'
) ON CONFLICT (invoice_number) DO NOTHING;

-- Sinkronisasi status Nurhayati di tabel registrations menjadi 'isolir'
UPDATE registrations SET status = 'isolir' WHERE id = '50000000-0000-0000-0000-000000000004';
