-- 032_seed_olt_ports.up.sql
-- Seed dummy OLT devices and port configurations, and ensure default users are valid

INSERT INTO olt_port_configs (id, name, area_name, olt_host, olt_port_ssh, gpon_slot, gpon_port, max_ont, current_ont_count, is_active, notes) VALUES
  ('20000000-0000-0000-0000-000000000001', 'OLT-PUSAT-0/1/1',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 1, 64, 12, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000002', 'OLT-PUSAT-0/1/2',  'Area Bireuen Kota',  '192.168.10.1', 22, 0, 2, 64, 4, true, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000003', 'OLT-UTARA-0/1/1',  'Area Simpang 4',     '192.168.10.2', 22, 0, 1, 64, 8, true, '{"vendor":"vsol_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000004', 'OLT-SELATAN-0/2/1','Area Matang Glumpang','192.168.10.3', 22, 0, 1, 64, 2, true, '{"vendor":"huawei_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000005', 'OLT-TIMUR-0/1/1',  'Area Peusangan',     '192.168.10.4', 22, 0, 1, 64, 0, true, '{"vendor":"hioso_gpon","username":"admin","password":"adminpassword","snmp_community":"public"}'),
  ('20000000-0000-0000-0000-000000000006', 'OLT-BARAT-0/1/1',  'Area Juli',          '192.168.10.5', 22, 0, 1, 64, 0, false, '{"vendor":"zte_c300","username":"admin","password":"adminpassword","snmp_community":"public"}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  area_name = EXCLUDED.area_name,
  olt_host = EXCLUDED.olt_host,
  notes = EXCLUDED.notes;

INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Owner ISP', 'owner@isp.dev', '081200000001',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'Andi CS Admin', 'andi@isp.dev', '081200000002',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'cs_admin', true),
  ('00000000-0000-0000-0000-000000000004', 'Rizky Technician', 'rizky@isp.dev', '081200000004',
   '$2a$10$5vZKMMatEimVb8oAlj8iq.xVaVXNMZnEb72YA/3hUY/nYzXhzpxgu', 'technician', true)
ON CONFLICT (phone) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true;
