-- 034_reset_and_reseed_peusangan.up.sql
-- Reset semua data dummy lama dan isi ulang dengan data nyata
-- Pelanggan Kec. Peusangan, Bireuen, Aceh — saling terkait dengan ODP & OLT

-- ─── 1. HAPUS LOGS LAMA (foreign key dulu) ───────────────────────────────────

DELETE FROM provisioning_logs
WHERE registration_id::text IN (
  '50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000008',
  '50000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012',
  '50000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000014',
  '50000000-0000-0000-0000-000000000015','50000000-0000-0000-0000-000000000016'
);

DELETE FROM registration_logs
WHERE registration_id::text IN (
  '50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000008',
  '50000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012',
  '50000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000014',
  '50000000-0000-0000-0000-000000000015','50000000-0000-0000-0000-000000000016'
);

DELETE FROM notification_logs
WHERE registration_id::text IN (
  '50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000008',
  '50000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012',
  '50000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000014',
  '50000000-0000-0000-0000-000000000015','50000000-0000-0000-0000-000000000016'
);

-- ─── 2. HAPUS REGISTRASI DUMMY LAMA ──────────────────────────────────────────

DELETE FROM registrations
WHERE id::text IN (
  '50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004',
  '50000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000007','50000000-0000-0000-0000-000000000008',
  '50000000-0000-0000-0000-000000000009','50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012',
  '50000000-0000-0000-0000-000000000013','50000000-0000-0000-0000-000000000014',
  '50000000-0000-0000-0000-000000000015','50000000-0000-0000-0000-000000000016'
);

-- ─── 3. HAPUS ODP DUMMY LAMA ─────────────────────────────────────────────────

DELETE FROM odps
WHERE id::text IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000004'
);

-- ─── 4. RESET ONT COUNT ──────────────────────────────────────────────────────

UPDATE olt_port_configs SET current_ont_count = 0
WHERE id::text IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005'
);

-- ─── 5. UPDATE OLT PORT → AREA PEUSANGAN ────────────────────────────────────
-- area_name mengandung angka 3-digit untuk cleanAreaCode backend
-- "Area Peusangan 197" → cleanAreaCode ambil "197"
-- "Area Peusangan 195" → cleanAreaCode ambil "195"

UPDATE olt_port_configs SET
  name      = 'OLT-PSN-0/1/1',
  area_name = 'Area Peusangan 197',
  olt_host  = '192.168.20.1'
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE olt_port_configs SET
  name      = 'OLT-PSN-0/1/2',
  area_name = 'Area Peusangan 195',
  olt_host  = '192.168.20.1'
WHERE id = '20000000-0000-0000-0000-000000000002';

-- ─── 6. SEED ODP BARU (KOORDINAT DARI USER) ──────────────────────────────────
--  ODP 1: 5.197059, 96.782974  → OLT Port 001
--  ODP 2: 5.195118, 96.782548  → OLT Port 002

INSERT INTO odps (id, code, name, olt_port_config_id, total_ports, latitude, longitude, address_notes)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'ODP-PSN-01',
    'ODP Peusangan 01 - Jl. Utama Ulee Jalan',
    '20000000-0000-0000-0000-000000000001',
    8,
    5.197059, 96.782974,
    'Tiang PLN di persimpangan Jl. Ulee Jalan, depan kedai kopi'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'ODP-PSN-02',
    'ODP Peusangan 02 - Gampong Ulee Jalan Selatan',
    '20000000-0000-0000-0000-000000000002',
    8,
    5.195118, 96.782548,
    'Tiang Telkom di gang kecil dekat mesjid gampong'
  );

-- ─── 7. SEED 4 PELANGGAN AKTIF ───────────────────────────────────────────────
--
-- Pola Customer Number: YEAR(2) + AREA(3) + SERIAL(4) + SUFFIX(2)
--   Pelanggan ODP-1 (area 197): 26 197 0001 01 = 261970001001
--   Pelanggan ODP-1 ke-2:       26 197 0002 01 = 261970002001
--   Pelanggan ODP-2 (area 195): 26 195 0001 01 = 261950001001
--   Pelanggan ODP-2 ke-2:       26 195 0002 01 = 261950002001
--
-- PPPoE username = {customer_number}@ptnat.net
-- Password = random kuat per pelanggan
-- Koordinat pelanggan didekatkan ke ODP masing-masing

INSERT INTO registrations (
  id, reg_number, customer_number,
  full_name, nik, phone, email,
  province, city, district, village, rt, rw, address_detail,
  maps_lat, maps_lng, google_maps_link,
  package_id, status,
  pppoe_username, pppoe_password,
  ont_serial_number, ont_index,
  olt_port_config_id, odp_info,
  technician_id, cs_user_id,
  survey_is_feasible,
  survey_scheduled_at, survey_done_at,
  installation_scheduled_at, activated_at,
  installation_fee,
  payment_amount, payment_date, payment_bank,
  internal_notes
)
VALUES

-- ── Pelanggan 1 ─ ODP-PSN-01 (koordinat dari link user) ──────────────────────
(
  '50000000-0000-0000-0000-000000000001',
  'REG-260803-0001', '261970001001',
  'Budi Santoso',
  '1101060504030001', '08116470001', 'budi.santoso@gmail.com',
  'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', '003', '001',
  'Jl. Ulee Jalan No. 12, dekat warung kopi Pak Umar',
  5.197512, 96.782990,                           -- ~50m utara ODP-PSN-01
  'https://maps.app.goo.gl/Hn6JVLqwxu9sRzhu7',
  '10000000-0000-0000-0000-000000000002',         -- Paket Home 20 Mbps
  'active',
  '261970001001@ptnat.net', 'Bud!@2601',
  'ZTEGC8547D01', 1,
  '20000000-0000-0000-0000-000000000001', 'ODP-PSN-01/P1',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  true,
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '10 days', NOW() - INTERVAL '7 days',
  300000,
  200000, CURRENT_DATE - 7, 'BNI',
  'Akun PPPoE (261970001001@ptnat.net) profil PKT-HOME-20. (Router Offline - Akun Disimpan di DB)'
),

-- ── Pelanggan 2 ─ ODP-PSN-01 (koordinat dari link user) ──────────────────────
(
  '50000000-0000-0000-0000-000000000002',
  'REG-260803-0002', '261970002001',
  'Siti Rahmi',
  '1101060504030002', '08116470002', 'siti.rahmi@gmail.com',
  'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', '004', '001',
  'Lr. Mesjid Ulee Jalan, samping balai desa',
  5.197041, 96.782551,                           -- ~40m barat ODP-PSN-01
  'https://maps.app.goo.gl/sN1h5LeG1HzgD58p7',
  '10000000-0000-0000-0000-000000000003',         -- Paket Home 50 Mbps
  'active',
  '261970002001@ptnat.net', 'S!ti@2602',
  'ZICG298E6B02', 2,
  '20000000-0000-0000-0000-000000000001', 'ODP-PSN-01/P2',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  true,
  NOW() - INTERVAL '14 days', NOW() - INTERVAL '11 days',
  NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days',
  300000,
  350000, CURRENT_DATE - 6, 'BRI',
  'Akun PPPoE (261970002001@ptnat.net) profil PKT-HOME-50. (Router Offline - Akun Disimpan di DB)'
),

-- ── Pelanggan 1 ─ ODP-PSN-02 (koordinat dari link user) ──────────────────────
(
  '50000000-0000-0000-0000-000000000003',
  'REG-260803-0003', '261950001001',
  'Muhammad Iqbal',
  '1101060504030003', '08116470003', 'miqbal.psn@gmail.com',
  'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', '002', '002',
  'Jl. Gampong Selatan No. 5, dekat TK Ceria',
  5.194780, 96.782560,                           -- ~37m selatan ODP-PSN-02
  'https://maps.app.goo.gl/hUAjwjuxbiTFvkgu5',
  '10000000-0000-0000-0000-000000000002',         -- Paket Home 20 Mbps
  'active',
  '261950001001@ptnat.net', 'Iqb@l2603',
  'ZICG2768D103', 1,
  '20000000-0000-0000-0000-000000000002', 'ODP-PSN-02/P1',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  true,
  NOW() - INTERVAL '13 days', NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days',
  300000,
  200000, CURRENT_DATE - 5, 'Mandiri',
  'Akun PPPoE (261950001001@ptnat.net) profil PKT-HOME-20. (Router Offline - Akun Disimpan di DB)'
),

-- ── Pelanggan 2 ─ ODP-PSN-02 (koordinat dari link user) ──────────────────────
(
  '50000000-0000-0000-0000-000000000004',
  'REG-260803-0004', '261950002001',
  'Nurhayati',
  '1101060504030004', '08116470004', 'nurhayati.psn@gmail.com',
  'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', '001', '002',
  'Jl. Ujung Gampong No. 9, Peusangan',
  5.195180, 96.782901,                           -- ~35m timur ODP-PSN-02
  'https://maps.app.goo.gl/hKpU4TAJMGn6bZZZ6',
  '10000000-0000-0000-0000-000000000001',         -- Paket Lite 10 Mbps
  'active',
  '261950002001@ptnat.net', 'Nur@h2604',
  'ZICGA05C0E04', 2,
  '20000000-0000-0000-0000-000000000002', 'ODP-PSN-02/P2',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  true,
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '7 days', NOW() - INTERVAL '4 days',
  300000,
  150000, CURRENT_DATE - 4, 'BSI',
  'Akun PPPoE (261950002001@ptnat.net) profil PKT-LITE-10. (Router Offline - Akun Disimpan di DB)'
);

-- ─── 8. UPDATE ONT COUNT ─────────────────────────────────────────────────────

UPDATE olt_port_configs SET current_ont_count = 2
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE olt_port_configs SET current_ont_count = 2
WHERE id = '20000000-0000-0000-0000-000000000002';

-- ─── 9. SEED REGISTRATION LOGS (kolom yang benar) ────────────────────────────
-- Skema: registration_id, status_from, status_to, changed_by, changed_by_role, reason

INSERT INTO registration_logs
  (registration_id, status_from, status_to, changed_by, changed_by_role, reason, created_at)
VALUES
  -- Pelanggan 1 (ODP-PSN-01)
  ('50000000-0000-0000-0000-000000000001', NULL,                'pending_review',       '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Registrasi baru masuk dari pelanggan',                NOW() - INTERVAL '15 days'),
  ('50000000-0000-0000-0000-000000000001', 'pending_review',    'survey_scheduled',     '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Survei lapangan dijadwalkan',                         NOW() - INTERVAL '14 days'),
  ('50000000-0000-0000-0000-000000000001', 'survey_scheduled',  'survey_done',          '00000000-0000-0000-0000-000000000004', 'technician', 'Survei selesai. Lokasi layak, kabel ±25m dari ODP',   NOW() - INTERVAL '12 days'),
  ('50000000-0000-0000-0000-000000000001', 'survey_done',       'waiting_payment',      '00000000-0000-0000-0000-000000000004', 'technician', 'Instalasi ONT selesai, menunggu pembayaran biaya pasang', NOW() - INTERVAL '10 days'),
  ('50000000-0000-0000-0000-000000000001', 'waiting_payment',   'payment_confirmed',    '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Pembayaran Rp300.000 dikonfirmasi via BNI',           NOW() - INTERVAL '8 days'),
  ('50000000-0000-0000-0000-000000000001', 'payment_confirmed', 'active',               '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Akun PPPoE aktif. Provisioning selesai (offline mode)', NOW() - INTERVAL '7 days'),

  -- Pelanggan 2 (ODP-PSN-01)
  ('50000000-0000-0000-0000-000000000002', NULL,                'pending_review',       '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Registrasi baru masuk',                              NOW() - INTERVAL '14 days'),
  ('50000000-0000-0000-0000-000000000002', 'pending_review',    'survey_scheduled',     '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Survei dijadwalkan',                                 NOW() - INTERVAL '13 days'),
  ('50000000-0000-0000-0000-000000000002', 'survey_scheduled',  'survey_done',          '00000000-0000-0000-0000-000000000004', 'technician', 'Survei selesai, lokasi layak',                       NOW() - INTERVAL '11 days'),
  ('50000000-0000-0000-0000-000000000002', 'survey_done',       'waiting_payment',      '00000000-0000-0000-0000-000000000004', 'technician', 'Instalasi selesai, menunggu pembayaran',             NOW() - INTERVAL '9 days'),
  ('50000000-0000-0000-0000-000000000002', 'waiting_payment',   'payment_confirmed',    '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Pembayaran Rp300.000 dikonfirmasi via BRI',          NOW() - INTERVAL '7 days'),
  ('50000000-0000-0000-0000-000000000002', 'payment_confirmed', 'active',               '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Akun PPPoE aktif (offline mode)',                    NOW() - INTERVAL '6 days'),

  -- Pelanggan 1 (ODP-PSN-02)
  ('50000000-0000-0000-0000-000000000003', NULL,                'pending_review',       '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Registrasi baru masuk',                              NOW() - INTERVAL '13 days'),
  ('50000000-0000-0000-0000-000000000003', 'pending_review',    'survey_scheduled',     '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Survei dijadwalkan',                                 NOW() - INTERVAL '12 days'),
  ('50000000-0000-0000-0000-000000000003', 'survey_scheduled',  'survey_done',          '00000000-0000-0000-0000-000000000004', 'technician', 'Survei selesai, jarak kabel ±30m',                  NOW() - INTERVAL '10 days'),
  ('50000000-0000-0000-0000-000000000003', 'survey_done',       'waiting_payment',      '00000000-0000-0000-0000-000000000004', 'technician', 'Instalasi ONT selesai',                              NOW() - INTERVAL '8 days'),
  ('50000000-0000-0000-0000-000000000003', 'waiting_payment',   'payment_confirmed',    '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Pembayaran Rp300.000 dikonfirmasi via Mandiri',     NOW() - INTERVAL '6 days'),
  ('50000000-0000-0000-0000-000000000003', 'payment_confirmed', 'active',               '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Akun PPPoE aktif (offline mode)',                    NOW() - INTERVAL '5 days'),

  -- Pelanggan 2 (ODP-PSN-02)
  ('50000000-0000-0000-0000-000000000004', NULL,                'pending_review',       '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Registrasi baru masuk',                              NOW() - INTERVAL '12 days'),
  ('50000000-0000-0000-0000-000000000004', 'pending_review',    'survey_scheduled',     '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Survei dijadwalkan',                                 NOW() - INTERVAL '11 days'),
  ('50000000-0000-0000-0000-000000000004', 'survey_scheduled',  'survey_done',          '00000000-0000-0000-0000-000000000004', 'technician', 'Survei selesai',                                     NOW() - INTERVAL '9 days'),
  ('50000000-0000-0000-0000-000000000004', 'survey_done',       'waiting_payment',      '00000000-0000-0000-0000-000000000004', 'technician', 'Instalasi selesai',                                  NOW() - INTERVAL '7 days'),
  ('50000000-0000-0000-0000-000000000004', 'waiting_payment',   'payment_confirmed',    '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Pembayaran Rp300.000 dikonfirmasi via BSI',          NOW() - INTERVAL '5 days'),
  ('50000000-0000-0000-0000-000000000004', 'payment_confirmed', 'active',               '00000000-0000-0000-0000-000000000002', 'cs_admin',   'Akun PPPoE aktif (offline mode)',                    NOW() - INTERVAL '4 days');

-- ─── 10. UPDATE FORMAT ID PELANGGAN ──────────────────────────────────────────

INSERT INTO app_configs (key, value) VALUES
  ('cust_number_format',    'YEAR,AREA,SERIAL,SUFFIX'),
  ('cust_number_start',     '1'),
  ('cust_number_reset',     'NEVER'),
  ('cust_number_separator', 'none')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
