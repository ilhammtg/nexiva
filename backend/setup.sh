#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ISP Platform — Backend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Cek Go
echo ""
echo "▶ Mengecek Go..."
if ! command -v go &>/dev/null; then
  echo "❌ Go belum terinstall."
  echo "   Download: https://go.dev/dl/"
  echo "   Minimum versi: go 1.22"
  exit 1
fi
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo "✅ Go $GO_VERSION ditemukan"

# 2. Download dependencies
echo ""
echo "▶ Download Go modules..."
go mod download
go mod verify
echo "✅ Dependencies terinstall"

# 3. Install tools
echo ""
echo "▶ Install CLI tools..."

# golang-migrate
if ! command -v migrate &>/dev/null; then
  echo "  Installing golang-migrate..."
  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
  echo "  ✅ migrate terinstall"
else
  echo "  ✅ migrate sudah ada"
fi

# mockery
if ! command -v mockery &>/dev/null; then
  echo "  Installing mockery..."
  go install github.com/vektra/mockery/v2@latest
  echo "  ✅ mockery terinstall"
else
  echo "  ✅ mockery sudah ada"
fi

# 4. Setup .env
echo ""
echo "▶ Setup .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env dibuat dari .env.example"
  echo "⚠️  Isi nilai-nilai di .env sebelum menjalankan server!"
else
  echo "✅ .env sudah ada"
fi

# 5. Buat folder uploads
mkdir -p uploads
echo "✅ Folder uploads dibuat"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Backend setup selesai!"
echo ""
echo "  Langkah berikutnya:"
echo "  1. Edit .env dan isi semua nilai yang kosong"
echo "  2. Jalankan infrastruktur: docker-compose up -d postgres redis nats"
echo "  3. Jalankan migration: make migrate-up"
echo "  4. Jalankan server: make run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
