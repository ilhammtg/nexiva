#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ISP Platform — Frontend Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Cek Node.js
echo ""
echo "▶ Mengecek Node.js..."
if ! command -v node &>/dev/null; then
  echo "❌ Node.js belum terinstall."
  echo "   Download: https://nodejs.org (gunakan versi LTS, minimal v18)"
  exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION ditemukan"

# 2. Cek npm
if ! command -v npm &>/dev/null; then
  echo "❌ npm tidak ditemukan"
  exit 1
fi
NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION ditemukan"

# 3. Install dependencies
echo ""
echo "▶ Install npm packages... (ini membutuhkan waktu beberapa menit)"
npm install
echo "✅ npm packages terinstall"

# 4. Install shadcn/ui CLI dan init
echo ""
echo "▶ Setup shadcn/ui..."
if ! command -v shadcn &>/dev/null && ! npx shadcn --version &>/dev/null 2>&1; then
  echo "  shadcn/ui akan diinstall via npx saat dibutuhkan"
fi

# 5. Setup .env
echo ""
echo "▶ Setup .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env dibuat dari .env.example"
else
  echo "✅ .env sudah ada"
fi

# 6. Init shadcn/ui (components.json)
echo ""
echo "▶ Init shadcn/ui..."
if [ ! -f components.json ]; then
  echo "  Jalankan perintah berikut untuk init shadcn/ui:"
  echo ""
  echo "  npx shadcn@latest init"
  echo ""
  echo "  Pilih opsi:"
  echo "  - Style: Default"
  echo "  - Base color: Slate"
  echo "  - CSS variables: Yes"
else
  echo "✅ shadcn/ui sudah diinit"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Frontend setup selesai!"
echo ""
echo "  Langkah berikutnya:"
echo "  1. Jalankan: npx shadcn@latest init (jika belum)"
echo "  2. Install komponen yang dibutuhkan:"
echo "     npx shadcn@latest add button input label badge"
echo "     npx shadcn@latest add dialog table select"
echo "     npx shadcn@latest add form toast progress"
echo "  3. Edit .env jika URL backend berbeda"
echo "  4. Jalankan dev server: npm run dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
