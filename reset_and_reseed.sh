#!/bin/bash
# reset_and_reseed.sh
# Script untuk mereset dan mengisi ulang data pelanggan Peusangan
# Jalankan dari root directory nexiva: ./reset_and_reseed.sh

set -e

MIGRATION_FILE="./backend/migrations/034_reset_and_reseed_peusangan.up.sql"

echo "========================================================"
echo "  ISP Platform - Reset & Reseed Data Pelanggan Peusangan"
echo "========================================================"
echo ""

# Cek apakah migration file ada
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ File migration tidak ditemukan: $MIGRATION_FILE"
  exit 1
fi

echo "✅ File migration ditemukan"
echo ""

# Cek container postgres
if ! docker ps --filter name=isp_postgres --format "{{.Names}}" | grep -q "isp_postgres"; then
  echo "⚠️  Container isp_postgres tidak running."
  echo "   Coba jalankan: docker-compose up -d postgres"
  echo ""
  echo "   Atau jika menggunakan psql lokal:"
  echo "   psql -U isp_dev -d isp_registration -f $MIGRATION_FILE"
  exit 1
fi

echo "✅ Container isp_postgres sedang running"
echo ""
echo "📋 Menjalankan migration..."
echo ""

# Copy file ke container lalu jalankan
docker cp "$MIGRATION_FILE" isp_postgres:/tmp/034_reseed.sql

docker exec isp_postgres psql -U isp_dev -d isp_registration -f /tmp/034_reseed.sql

echo ""
echo "========================================================"
echo "✅ Selesai! Data telah direset dan diisi ulang."
echo ""
echo "Data yang telah dibuat:"
echo "  ODP:"
echo "    ODP-PSN-01  → lat: 5.197059, lng: 96.782974"
echo "    ODP-PSN-02  → lat: 5.195118, lng: 96.782548"
echo ""
echo "  Pelanggan:"
echo "    Budi Santoso     → 261970001001@ptnat.net (ODP-PSN-01)"
echo "    Siti Rahmi       → 261970002001@ptnat.net (ODP-PSN-01)"
echo "    Muhammad Iqbal   → 261950001001@ptnat.net (ODP-PSN-02)"
echo "    Nurhayati        → 261950002001@ptnat.net (ODP-PSN-02)"
echo ""
echo "  Semua pelanggan status: active"
echo "  PPPoE tersimpan di DB (Mikrotik offline - akan dikirim saat online)"
echo "========================================================"
echo ""
echo "Pastikan backend di-restart agar cache di-refresh:"
echo "  docker restart isp_backend"
