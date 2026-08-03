-- Parse coordinates for seeded dummy clients
UPDATE registrations SET maps_lat = 5.201, maps_lng = 96.701 WHERE id = '50000000-0000-0000-0000-000000000001';
UPDATE registrations SET maps_lat = 5.202, maps_lng = 96.702 WHERE id = '50000000-0000-0000-0000-000000000002';
UPDATE registrations SET maps_lat = 5.203, maps_lng = 96.703 WHERE id = '50000000-0000-0000-0000-000000000003';
UPDATE registrations SET maps_lat = 5.204, maps_lng = 96.704 WHERE id = '50000000-0000-0000-0000-000000000004';
UPDATE registrations SET maps_lat = 5.205, maps_lng = 96.705 WHERE id = '50000000-0000-0000-0000-000000000005';
UPDATE registrations SET maps_lat = 5.206, maps_lng = 96.706 WHERE id = '50000000-0000-0000-0000-000000000006';
UPDATE registrations SET maps_lat = 5.207, maps_lng = 96.707 WHERE id = '50000000-0000-0000-0000-000000000007';
UPDATE registrations SET maps_lat = 5.208, maps_lng = 96.708 WHERE id = '50000000-0000-0000-0000-000000000008';
UPDATE registrations SET maps_lat = 5.209, maps_lng = 96.709 WHERE id = '50000000-0000-0000-0000-000000000009';
UPDATE registrations SET maps_lat = 5.210, maps_lng = 96.710 WHERE id = '50000000-0000-0000-0000-000000000010';
UPDATE registrations SET maps_lat = 5.211, maps_lng = 96.711 WHERE id = '50000000-0000-0000-0000-000000000011';
UPDATE registrations SET maps_lat = 5.212, maps_lng = 96.712 WHERE id = '50000000-0000-0000-0000-000000000012';

-- Seed dummy ODP nodes matching dummy client ODPs
INSERT INTO odps (id, code, name, olt_port_config_id, total_ports, latitude, longitude, address_notes)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'ODP-PSN-01/04', 'ODP Simpang Peusangan 01', '20000000-0000-0000-0000-000000000001', 8, 5.2005, 96.7005, 'Tiang PLN Depan Masjid Peusangan'),
  ('60000000-0000-0000-0000-000000000002', 'ODP-PSN-01/08', 'ODP Ulee Jalan 02', '20000000-0000-0000-0000-000000000001', 8, 5.2018, 96.7018, 'Tiang Telkom samping SDN 3'),
  ('60000000-0000-0000-0000-000000000003', 'ODP-PSN-02/02', 'ODP Gampong Ulee Jalan', '20000000-0000-0000-0000-000000000001', 8, 5.2028, 96.7028, 'Tiang JSN Depan Warung M Rizal'),
  ('60000000-0000-0000-0000-000000000004', 'ODP-PSN-03/01', 'ODP Krueng Mane Utama', '20000000-0000-0000-0000-000000000001', 16, 5.2048, 96.7048, 'Tiang Utama Lintas Banda Aceh')
ON CONFLICT (id) DO NOTHING;
