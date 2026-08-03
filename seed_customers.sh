#!/bin/bash
# seed_customers.sh
# Script untuk menyuntikkan data pelanggan aktif langsung ke database
# tanpa tergantung golang-migrate

set -e

# Cari nama container postgres yang sedang berjalan
PG_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i 'postgres\|pg\|isp' | head -1)

if [ -z "$PG_CONTAINER" ]; then
  echo "ERROR: Tidak menemukan container PostgreSQL yang aktif."
  echo "Jalankan: docker ps"
  exit 1
fi

echo "Menggunakan container: $PG_CONTAINER"
echo ""

SQL=$(cat << 'ENDSQL'
-- Cek paket tersedia
DO $$ 
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM packages WHERE is_active = true;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Tidak ada paket aktif di tabel packages. Jalankan seed paket dulu.';
  END IF;
END $$;

-- Seed data pelanggan aktif (idempotent - aman dijalankan berkali-kali)
INSERT INTO registrations (
  id, reg_number, customer_number, full_name, nik, phone, email,
  province, city, district, village, address_detail,
  package_id, status, pppoe_username, ont_serial_number, ont_index, olt_port_config_id,
  odp_info, google_maps_link, activated_at, created_at, updated_at
)
SELECT
  v.id::uuid, v.reg_number, v.customer_number, v.full_name, v.nik, v.phone, v.email,
  v.province, v.city, v.district, v.village, v.address_detail,
  p.id, 'active', v.pppoe_username, v.ont_serial_number, v.ont_index::int,
  (SELECT id FROM olt_port_configs LIMIT 1),
  v.odp_info, v.google_maps_link, NOW() - (v.days_ago || ' days')::interval,
  NOW() - (v.days_ago || ' days')::interval, NOW()
FROM (
  VALUES
    ('50000000-0000-0000-0000-000000000001','REG-20260713-0001','CUST-20260713-0001','Nanda Riansyah','3171011503850001','082163243451','nanda@jsn.net','Aceh','Bireuen','Peusangan','Paya Cut','Jl. Alam Belakang Pasar Ikan','jsn_nanda01','ZTEGC8547D68','1','ODP-PSN-01/04','https://maps.google.com/?q=5.201,96.701',30),
    ('50000000-0000-0000-0000-000000000002','REG-20260713-0002','CUST-20260713-0002','Ahmad Fauzi','3171011503850002','081234560002','fauzi@jsn.net','Aceh','Bireuen','Peusangan','Ulee Jalan','Jl. Selatan No. 45','jsn_fauzi02','ZICG298E6BB4','2','ODP-PSN-01/08','https://maps.google.com/?q=5.202,96.702',28),
    ('50000000-0000-0000-0000-000000000003','REG-20260713-0003','CUST-20260713-0003','Siti Rahma','3171015011900003','081234560003','siti@jsn.net','Aceh','Bireuen','Peusangan','Ulee Jalan','Jl. Gampong No. 3','jsn_siti03','ZICG2768D187','3','ODP-PSN-02/02','https://maps.google.com/?q=5.203,96.703',25),
    ('50000000-0000-0000-0000-000000000004','REG-20260713-0004','CUST-20260713-0004','Yusnidar Hanum','3171016504920004','081234560004','yusnidar@jsn.net','Aceh','Bireuen','Peusangan','Ulee Jalan','Lorong Melati No. 8','jsn_yusnidar04','ZICGA05C0EE8','4','ODP-PSN-02/04','https://maps.google.com/?q=5.204,96.704',22),
    ('50000000-0000-0000-0000-000000000005','REG-20260713-0005','CUST-20260713-0005','Rudi Hermawan','3171012010860005','081234560005','rudi@jsn.net','Aceh','Bireuen','Peusangan','Ulee Jalan','Jl. Medan-Banda Aceh KM 105','jsn_rudi05','ZTEGD078FD6F','5','ODP-PSN-03/01','https://maps.google.com/?q=5.205,96.705',20),
    ('50000000-0000-0000-0000-000000000006','REG-20260713-0006','CUST-20260713-0006','Dewi Lestari','3171014809940006','081234560006','dewi@jsn.net','Aceh','Bireuen','Peusangan','Paya Cut','Jl. Teupin Mane No. 3','jsn_dewi06','ZICG2961FC8F','6','ODP-PSN-03/04','https://maps.google.com/?q=5.206,96.706',18),
    ('50000000-0000-0000-0000-000000000007','REG-20260713-0007','CUST-20260713-0007','Hendra Wijaya','3171010506820007','081234560007','hendra@jsn.net','Aceh','Bireuen','Kota Juang','Pulo Kiton','Jl. T. Hamzah Bendahara No. 45','jsn_hendra07','ZICG278CFF03','7','ODP-KJ-01/01','https://maps.google.com/?q=5.207,96.707',15),
    ('50000000-0000-0000-0000-000000000008','REG-20260713-0008','CUST-20260713-0008','Maya Sari','3171015512960008','081234560008','maya@jsn.net','Aceh','Bireuen','Samalanga','Keude Samalanga','Jl. Masjid Jamik No. 2','jsn_maya08','ZICG9B07899','8','ODP-SML-01/01','https://maps.google.com/?q=5.208,96.708',12),
    ('50000000-0000-0000-0000-000000000009','REG-20260713-0009','CUST-20260713-0009','Fajar Nugraha','3171011803910009','081234560009','fajar@jsn.net','Aceh','Bireuen','Jeunieb','Keude Jeunieb','Jl. Pasar Jeunieb No. 10','jsn_fajar09','ZTEGC8643450','9','ODP-JNB-01/01','https://maps.google.com/?q=5.209,96.709',10),
    ('50000000-0000-0000-0000-000000000010','REG-20260713-0010','CUST-20260713-0010','Rina Marlina','3171016207930010','081234560010','rina@jsn.net','Aceh','Bireuen','Gandapura','Geurugok','Jl. Stasiun Geurugok No. 7','jsn_rina10','CIOT26235698','10','ODP-GDP-01/01','https://maps.google.com/?q=5.210,96.710',8),
    ('50000000-0000-0000-0000-000000000011','REG-20260713-0011','CUST-20260713-0011','Zulkifli Harun','3171010506820011','081234560011','zulkifli@jsn.net','Aceh','Bireuen','Kota Juang','Bireuen','Jl. T. Umar No. 22','jsn_zulkifli11','ZICG276ABBEE','11','ODP-KJ-01/02','https://maps.google.com/?q=5.211,96.711',6),
    ('50000000-0000-0000-0000-000000000012','REG-20260713-0012','CUST-20260713-0012','Nurmala Hayati','3171015512960012','081234560012','nurmala@jsn.net','Aceh','Bireuen','Peusangan','Blang Dalam','Jl. Masjid Taqwa No. 1','jsn_nurmala12','ZICG275D0615','12','ODP-PSN-05/04','https://maps.google.com/?q=5.212,96.712',4)
) AS v(id, reg_number, customer_number, full_name, nik, phone, email, province, city, district, village, address_detail, pppoe_username, ont_serial_number, ont_index, odp_info, google_maps_link, days_ago)
CROSS JOIN LATERAL (
  SELECT id FROM packages WHERE is_active = true ORDER BY price_monthly DESC LIMIT 1
) p
ON CONFLICT (id) DO UPDATE
  SET status = 'active',
      pppoe_username = EXCLUDED.pppoe_username,
      activated_at = COALESCE(registrations.activated_at, EXCLUDED.activated_at),
      updated_at = NOW();

-- Juga update registrasi yang sudah ada dan sudah di-provisioning agar status = active
UPDATE registrations
SET status = 'active',
    activated_at = COALESCE(activated_at, NOW()),
    updated_at = NOW()
WHERE pppoe_username IS NOT NULL
  AND pppoe_username != ''
  AND status NOT IN ('active', 'isolir')
  AND deleted_at IS NULL;

-- Tampilkan hasil
SELECT
  reg_number,
  full_name,
  phone,
  status,
  pppoe_username,
  activated_at::date AS aktif_sejak
FROM registrations
WHERE status IN ('active', 'isolir')
  AND deleted_at IS NULL
ORDER BY activated_at DESC
LIMIT 20;
ENDSQL
)

echo "Menjalankan seed data pelanggan..."
docker exec -i "$PG_CONTAINER" psql -U isp_dev -d isp_registration << EOF
$SQL
EOF

echo ""
echo "Done! Refresh browser Anda."
