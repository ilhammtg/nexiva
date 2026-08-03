#!/bin/bash
# Script untuk membuat sertifikat SSL lokal menggunakan mkcert

# Pastikan script dijalankan dari direktori frontend
cd "$(dirname "$0")"

# Buat folder certs jika belum ada
mkdir -p certs

# Periksa apakah mkcert terpasang
if ! command -v mkcert &> /dev/null; then
    echo "=========================================================="
    echo "ERROR: mkcert tidak ditemukan di sistem Anda."
    echo "=========================================================="
    echo "Silakan install mkcert terlebih dahulu menggunakan package manager Anda:"
    echo "  - Ubuntu/Debian: sudo apt install mkcert libnss3-tools"
    echo "  - macOS: brew install mkcert"
    echo "  - Windows (Scoop): scoop install mkcert"
    echo ""
    echo "Setelah diinstall, jalankan perintah ini sekali untuk mendaftarkan CA lokal:"
    echo "  mkcert -install"
    echo "=========================================================="
    exit 1
fi

echo "Membuat sertifikat SSL untuk localhost..."
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

echo ""
echo "=========================================================="
echo "SUCCESS: Sertifikat SSL berhasil dibuat di ./certs/"
echo "=========================================================="
echo "1. Restart docker container frontend untuk menerapkan HTTPS:"
echo "   docker compose restart frontend"
echo "2. Buka browser dan akses melalui HTTPS:"
echo "   https://localhost:5173"
echo "=========================================================="
