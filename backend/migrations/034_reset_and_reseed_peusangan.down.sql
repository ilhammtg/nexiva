-- 034_reset_and_reseed_peusangan.down.sql
-- Rollback: hapus data Peusangan baru, kembalikan OLT port seperti semula

-- Hapus logs baru
DELETE FROM registration_logs WHERE registration_id IN (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000004'
);

-- Hapus registrasi baru
DELETE FROM registrations WHERE id IN (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000004'
);

-- Hapus ODP baru
DELETE FROM odps WHERE id IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
);

-- Reset OLT port ke nama semula
UPDATE olt_port_configs SET
  name      = 'OLT-PUSAT-0/1/1',
  area_name = 'Area Bireuen Kota',
  olt_host  = '192.168.10.1'
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE olt_port_configs SET
  name      = 'OLT-PUSAT-0/1/2',
  area_name = 'Area Bireuen Kota',
  olt_host  = '192.168.10.1'
WHERE id = '20000000-0000-0000-0000-000000000002';

-- Reset ONT count
UPDATE olt_port_configs SET current_ont_count = 0
WHERE id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);
