-- ============================================================
-- 010_seed_dummy.up.sql
-- Password untuk semua user: Admin@123  (bcrypt hash di bawah)
-- bcrypt cost=10: $2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu
-- ============================================================

-- ─── USERS ────────────────────────────────────────────────────────────────────
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Owner ISP', 'owner@isp.dev', '081200000001',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'Andi CS Admin', 'andi@isp.dev', '081200000002',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'cs_admin', true),
  ('00000000-0000-0000-0000-000000000004', 'Rizky Technician', 'rizky@isp.dev', '081200000004',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'technician', true)
ON CONFLICT (phone) DO NOTHING;

-- ─── PACKAGES ─────────────────────────────────────────────────────────────────
INSERT INTO packages (id, name, description, price_monthly, price_installation, speed_down_mbps, speed_up_mbps, mikrotik_profile, olt_line_profile_id, olt_srv_profile_id, vlan_id, is_active, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Paket Lite 10 Mbps',   'Cocok untuk browsing dan streaming ringan', 150000, 300000, 10,  10,  'PKT-LITE-10',   1, 1, 100, true, 1),
  ('10000000-0000-0000-0000-000000000002', 'Paket Home 20 Mbps',   'Ideal untuk keluarga, streaming HD',         200000, 300000, 20,  20,  'PKT-HOME-20',   1, 1, 100, true, 2),
  ('10000000-0000-0000-0000-000000000003', 'Paket Home 50 Mbps',   'Nonton 4K & gaming online tanpa lag',        350000, 300000, 50,  50,  'PKT-HOME-50',   2, 2, 101, true, 3),
  ('10000000-0000-0000-0000-000000000004', 'Paket Pro 100 Mbps',   'Untuk kerja dari rumah & streaming 4K',      500000, 300000, 100, 100, 'PKT-PRO-100',   2, 2, 101, true, 4),
  ('10000000-0000-0000-0000-000000000005', 'Paket Bisnis 200 Mbps','Untuk usaha kecil dan kantor',               850000, 500000, 200, 100, 'PKT-BIZ-200',   3, 3, 102, true, 5),
  ('10000000-0000-0000-0000-000000000006', 'Paket Enterprise 1Gbps','Dedicated line untuk perusahaan',          2500000, 1000000,1000, 500, 'PKT-ENT-1G',   3, 3, 103, false, 6)
ON CONFLICT DO NOTHING;

-- ─── OLT PORT CONFIGS ─────────────────────────────────────────────────────────
INSERT INTO olt_port_configs (id, name, area_name, olt_host, olt_port_ssh, gpon_slot, gpon_port, max_ont, current_ont_count, is_active, notes) VALUES
  ('20000000-0000-0000-0000-000000000001', 'OLT-PUSAT-0/1/1',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 1, 64, 12, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000002', 'OLT-PUSAT-0/1/2',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 2, 64, 4, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000003', 'OLT-UTARA-0/1/1',  'Area Simpang 4',     '192.168.10.2', 22, 0, 1, 64, 8, true, '{"vendor":"vsol_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000004', 'OLT-SELATAN-0/2/1','Area Matang Glumpang','192.168.10.3', 22, 0, 1, 64, 2, true, '{"vendor":"huawei_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000005', 'OLT-TIMUR-0/1/1',  'Area Peusangan',     '192.168.10.4', 22, 0, 1, 64, 0, true, '{"vendor":"hioso_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000006', 'OLT-BARAT-0/1/1',  'Area Juli',          '192.168.10.5', 22, 0, 1, 64, 0, false,'{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  area_name = EXCLUDED.area_name,
  olt_host = EXCLUDED.olt_host,
  notes = EXCLUDED.notes;

-- ─── MIKROTIK CONFIGS ─────────────────────────────────────────────────────────
INSERT INTO mikrotik_configs (id, name, host, port, username, password_enc, is_active, is_online) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Mikrotik Utama',    '192.168.1.1',  443, 'admin', 'cGxhaW50ZXh0OkFkbWluQDEyMw==', true,  true),
  ('30000000-0000-0000-0000-000000000002', 'Mikrotik Cabang A', '192.168.2.1',  443, 'admin', 'cGxhaW50ZXh0OkFkbWluQDEyMw==', true,  true),
  ('30000000-0000-0000-0000-000000000003', 'Mikrotik Cabang B', '192.168.3.1',  8291,'admin', 'cGxhaW50ZXh0OkFkbWluQDEyMw==', true,  false),
  ('30000000-0000-0000-0000-000000000004', 'Mikrotik Backup',   '192.168.1.2',  443, 'admin', 'cGxhaW50ZXh0OkFkbWluQDEyMw==', false, false)
ON CONFLICT DO NOTHING;

-- ─── UPDATE APP CONFIGS ───────────────────────────────────────────────────────
UPDATE app_configs SET value = 'REG' WHERE key = 'reg_number_prefix';
UPDATE app_configs SET value = 'ISP' WHERE key = 'pppoe_username_prefix';
UPDATE app_configs SET value = 'true' WHERE key = 'notif_enabled';

INSERT INTO app_configs (key, value, description) VALUES
  ('role_permissions', '{"cs_admin":{"dashboard":true,"registrations":true,"customers":true,"packages":false,"olt_ports":false,"mikrotik":false,"users":false,"activity_log":true,"settings":false},"technician":{"dashboard":true,"registrations":false,"customers":false,"packages":false,"olt_ports":false,"mikrotik":false,"users":false,"activity_log":false,"settings":false}}', 'Role-based access control permissions')
ON CONFLICT (key) DO NOTHING;

