-- 026_seed_dummy_clients.up.sql

INSERT INTO registrations (
  id, reg_number, customer_number, full_name, nik, phone, email,
  province, city, district, village, address_detail,
  package_id, status, pppoe_username, ont_serial_number, ont_index, olt_port_config_id,
  odp_info, google_maps_link
) VALUES
  (
    '50000000-0000-0000-0000-000000000001', 'REG-20260713-0001', 'CUST-20260713-0001',
    'REPEATER_ULEE_JALAN', '1101010101010001', '081234560001', 'repeater.ulee@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Syiah Kuala No. 12',
    '10000000-0000-0000-0000-000000000003', 'active', 'jsn_repeater_ulee', 'ZTEGC8547D68', 1,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-01/04', 'https://maps.google.com/?q=5.201,96.701'
  ),
  (
    '50000000-0000-0000-0000-000000000002', 'REG-20260713-0002', 'CUST-20260713-0002',
    'SDN3_ULEE_JALAN_PEUSANGAN_SELATAN', '1101010101010002', '081234560002', 'sdn3.peusangan@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Selatan No. 45',
    '10000000-0000-0000-0000-000000000004', 'active', 'jsn_sdn3_ulee', 'ZICG298E6BB4', 2,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-01/08', 'https://maps.google.com/?q=5.202,96.702'
  ),
  (
    '50000000-0000-0000-0000-000000000003', 'REG-20260713-0003', 'CUST-20260713-0003',
    'WARUNG_M_RIZAL_ULEE_JALAN', '1101010101010003', '081234560003', 'warung.rizal@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Gampong No. 3',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_rizal_ulee', 'ZICG2768D187', 3,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-02/02', 'https://maps.google.com/?q=5.203,96.703'
  ),
  (
    '50000000-0000-0000-0000-000000000004', 'REG-20260713-0004', 'CUST-20260713-0004',
    'YUSNIDAR_ULEE_JALAN', '1101010101010004', '081234560004', 'yusnidar@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Lorong Melati No. 8',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_yusnidar_ulee', 'ZICGA05C0EE8', 4,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-02/04', 'https://maps.google.com/?q=5.204,96.704'
  ),
  (
    '50000000-0000-0000-0000-000000000005', 'REG-20260713-0005', 'CUST-20260713-0005',
    'TEST_MODEM_CHINA_5G_BARU', '1101010101010005', '081234560005', 'test.china@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Medan-Banda Aceh KM 105',
    '10000000-0000-0000-0000-000000000005', 'active', 'jsn_test_china', 'ZTEGD078FD6F', 5,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-03/01', 'https://maps.google.com/?q=5.205,96.705'
  ),
  (
    '50000000-0000-0000-0000-000000000006', 'REG-20260713-0006', 'CUST-20260713-0006',
    'TEST_MODEM_F663_NEW', '1101010101010006', '081234560006', 'test.f663@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Utama Krueng Mane',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_test_f663', 'ZICG2961FC8F', 6,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-03/04', 'https://maps.google.com/?q=5.206,96.706'
  ),
  (
    '50000000-0000-0000-0000-000000000007', 'REG-20260713-0007', 'CUST-20260713-0007',
    'TEST_MODEM_GM220NEW', '1101010101010007', '081234560007', 'test.gm220@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Cot Girek No. 1',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_test_gm220', 'ZICG278CFF03', 7,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-03/08', 'https://maps.google.com/?q=5.207,96.707'
  ),
  (
    '50000000-0000-0000-0000-000000000008', 'REG-20260713-0008', 'CUST-20260713-0008',
    'TEST_F660V8_NEW', '1101010101010008', '081234560008', 'test.f660@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Elak No. 12',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_test_f660', 'ZICG9B07899', 8,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-04/01', 'https://maps.google.com/?q=5.208,96.708'
  ),
  (
    '50000000-0000-0000-0000-000000000009', 'REG-20260713-0009', 'CUST-20260713-0009',
    'TEST_SERVER_HIOSO_F670', '1101010101010009', '081234560009', 'test.hioso@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Kopelma Darussalam Bireuen',
    '10000000-0000-0000-0000-000000000003', 'active', 'jsn_test_hioso', 'ZTEGC8643450', 9,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-04/04', 'https://maps.google.com/?q=5.209,96.709'
  ),
  (
    '50000000-0000-0000-0000-000000000010', 'REG-20260713-0010', 'CUST-20260713-0010',
    'TEST_GM_630_5G', '1101010101010010', '081234560010', 'test.gm630@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Ulee Jalan', 'Jl. Gayo KM 2',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_test_gm630', 'CIOT26235698', 10,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-04/08', 'https://maps.google.com/?q=5.210,96.710'
  ),
  (
    '50000000-0000-0000-0000-000000000011', 'REG-20260713-0011', 'CUST-20260713-0011',
    'TEST_M22X_BLANG_DALAM', '1101010101010011', '081234560011', 'test.m22x@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Blang Dalam', 'Jl. Blang Dalam Raya',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_m22x_blang', 'ZICG276ABBEE', 11,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-05/01', 'https://maps.google.com/?q=5.211,96.711'
  ),
  (
    '50000000-0000-0000-0000-000000000012', 'REG-20260713-0012', 'CUST-20260713-0012',
    'TEST_MODEM_M69X', '1101010101010012', '081234560012', 'test.m69x@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Blang Dalam', 'Jl. Masjid Taqwa',
    '10000000-0000-0000-0000-000000000001', 'active', 'jsn_test_m69x', 'ZICG275D0615', 12,
    '20000000-0000-0000-0000-000000000001', 'ODP-PSN-05/04', 'https://maps.google.com/?q=5.212,96.712'
  ),
  -- Additional clients on other ports to allow multi-port filtering checks
  (
    '50000000-0000-0000-0000-000000000013', 'REG-20260713-0013', 'CUST-20260713-0013',
    'KANTOR_DESA_PEUSANGAN_SELATAN', '1101010101010013', '081234560013', 'desa.peusangan@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Peusangan Selatan', 'Jl. Kantor Camat No. 1',
    '10000000-0000-0000-0000-000000000003', 'active', 'jsn_kantor_desa', 'ZTEGC9001234', 1,
    '20000000-0000-0000-0000-000000000002', 'ODP-PSN2-01/01', 'https://maps.google.com/?q=5.213,96.713'
  ),
  (
    '50000000-0000-0000-0000-000000000014', 'REG-20260713-0014', 'CUST-20260713-0014',
    'WARKOP_DIDI_PEUSANGAN', '1101010101010014', '081234560014', 'warkop.didi@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Peusangan Selatan', 'Simpang Empat Peusangan',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_warkop_didi', 'ZTEGC9005678', 2,
    '20000000-0000-0000-0000-000000000002', 'ODP-PSN2-01/02', 'https://maps.google.com/?q=5.214,96.714'
  ),
  (
    '50000000-0000-0000-0000-000000000015', 'REG-20260713-0015', 'CUST-20260713-0015',
    'KLINIK_KESEHATAN_UTARA', '1101010101010015', '081234560015', 'klinik.utara@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Utara Gampong', 'Jl. Lintas Pantai Utara',
    '10000000-0000-0000-0000-000000000004', 'active', 'jsn_klinik_utara', 'ZTEGC9900221', 1,
    '20000000-0000-0000-0000-000000000003', 'ODP-UTR-01/01', 'https://maps.google.com/?q=5.215,96.715'
  ),
  (
    '50000000-0000-0000-0000-000000000016', 'REG-20260713-0016', 'CUST-20260713-0016',
    'KAFE_KUTA_BARO_UTARA', '1101010101010016', '081234560016', 'kafe.kuta@jsn.net',
    'Aceh', 'Bireuen', 'Peusangan', 'Utara Gampong', 'Pantai Rekreasi Ujong Blang',
    '10000000-0000-0000-0000-000000000002', 'active', 'jsn_kafe_kuta', 'ZTEGC9900222', 2,
    '20000000-0000-0000-0000-000000000003', 'ODP-UTR-01/02', 'https://maps.google.com/?q=5.216,96.716'
  )
ON CONFLICT (id) DO NOTHING;

-- Update current ONT count metrics on OLT Port Configs to match dummy clients
UPDATE olt_port_configs SET current_ont_count = 12 WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE olt_port_configs SET current_ont_count = 2 WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE olt_port_configs SET current_ont_count = 2 WHERE id = '20000000-0000-0000-0000-000000000003';
