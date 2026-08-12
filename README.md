# ISP Management Platform (Client Registration & Auto-Provisioning)

[![Go Version](https://img.shields.counts/badge/Go-1.24-00ADD8?style=flat-square&logo=go)](https://go.dev/)
[![React Version](https://img.shields.counts/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Docker Powered](https://img.shields.counts/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.counts/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

ISP Management Platform adalah sistem enterprise-grade untuk manajemen pendaftaran pelanggan internet (Fiber Optik), yang diintegrasikan secara langsung dengan otomatisasi (Auto-Provisioning) jaringan pada perangkat OLT ZTE & Mikrotik PPPoE Server.

Sistem ini didesain menggunakan arsitektur modern berbasis monorepo untuk menyatukan kekuatan performa backend Go dan keluwesan frontend React (TypeScript) yang aman dan responsif.

---

## 🚀 Fitur Utama

- **Pendaftaran Pelanggan Terintegrasi**: Pengisian formulir pendaftaran, verifikasi wilayah, dan pemilihan paket internet dengan alur kerja (workflow) multi-peran (Owner, CS Admin, Teknisi).
- **Auto-Provisioning OLT & ONT**: Integrasi otomatis pendaftaran perangkat ONT pada OLT ZTE C300/C320 melalui protokol SSH, termasuk manajemen VLAN dan line/service profile.
- **Auto-Provisioning Mikrotik**: Pembuatan akun PPPoE secara real-time pada Mikrotik RouterOS via API setelah status registrasi disetujui.
- **Geographical Information System (GIS)**: Peta interaktif berbasis koordinat bumi untuk memetakan titik ODP (Optical Distribution Point) dan rumah pelanggan lengkap dengan garis kabel fiber teranimasi (visualisasi aliran data).
- **Sistem Invoice & Kwitansi Dinamis**: Template HTML dinamis siap cetak untuk tagihan registrasi pelanggan baru.
- **Local HTTPS Ready**: Terintegrasi penuh dengan `mkcert` untuk lingkungan dev yang aman menggunakan HTTPS di localhost.

---

## 🛠️ Stack Teknologi

Sistem ini dibangun menggunakan teknologi pilihan yang andal dan teruji:

| Lapisan (Layer) | Komponen Stack | Deskripsi |
|---|---|---|
| **Backend** | Go 1.24 + Go-Fiber v2 | Web framework Go berkinerja tinggi |
| **Frontend** | React 18 + Vite + TypeScript | Pembuatan antarmuka (UI) modular yang type-safe |
| **Styling** | Tailwind CSS + Lucide Icons | Desain UI modern, adaptif, dan responsif |
| **Database** | PostgreSQL 15 | Penyimpanan data relasional transaksional |
| **Cache & Queue** | Redis 7 | Caching data cepat dan manajemen antrean pesan |
| **Message Broker** | NATS Server | Komunikasi pesan/event asinkronus |
| **Orkestrasi** | Docker & Docker Compose | Standardisasi lingkungan kerja dev dan prod |

---

## 📂 Panduan Dokumentasi Lengkap

Seluruh informasi detail mengenai proyek ini telah disusun secara rapi di dalam direktori [`/docs/`](file:///home/ilham/data/coding/nexiva/docs):

| Dokumen | Isi & Deskripsi |
|---|---|
| 📖 [**`INSTALL.md`**](file:///home/ilham/data/coding/nexiva/INSTALL.md) | **Instalasi Lengkap** & Cara menyalakan proyek di komputer baru |
| 🧑‍💻 [**`AI-AGENT-GUIDE.md`**](file:///home/ilham/data/coding/nexiva/docs/AI-AGENT-GUIDE.md) | Panduan instruksi untuk AI Coding Assistant |
| 🗂️ [**`TECH-STACK.md`**](file:///home/ilham/data/coding/nexiva/docs/TECH-STACK.md) | Detail versi pustaka (libraries) dan dependensi sistem |
| 🖥️ [**`BACKEND-STRUCTURE.md`**](file:///home/ilham/data/coding/nexiva/docs/BACKEND-STRUCTURE.md) | Struktur folder Go Backend & desain arsitektur kode |
| 🎨 [**`FRONTEND-STRUCTURE.md`**](file:///home/ilham/data/coding/nexiva/docs/FRONTEND-STRUCTURE.md) | Struktur folder React Frontend & styling guide |
| ⚙️ [**`DATABASE-SCHEMA.md`**](file:///home/ilham/data/coding/nexiva/docs/DATABASE-SCHEMA.md) | Penjelasan skema database PostgreSQL dan relasinya |
| 📋 [**`PRD-registrasi-pelanggan.md`**](file:///home/ilham/data/coding/nexiva/docs/PRD-registrasi-pelanggan.md) | *Product Requirement Document* (Dokumen Kebutuhan Bisnis) |
| 📝 [**`CODING-CONVENTIONS.md`**](file:///home/ilham/data/coding/nexiva/docs/CODING-CONVENTIONS.md) | Aturan penulisan kode, commit Git, dan penamaan variabel |

---

## ⚡ Memulai Cepat (Quick Start)

Untuk detail instalasi lengkap dari nol, harap ikuti panduan **[`INSTALL.md`](file:///home/ilham/data/coding/nexiva/INSTALL.md)**. Berikut ini adalah ringkasan perintah cepat untuk memulai:

```bash
# 1. Clone repositori & masuk to folder project
git clone git@github.com:ilhammtg/nexiva.git
cd nexiva

# 2. Salin environment konfigurasi default
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Setup sertifikat SSL lokal (Opsional, untuk HTTPS localhost)
./frontend/setup-https.sh

# 4. Bangun dan jalankan semua container
docker compose up -d --build

# 5. Seed data wilayah & pengguna default
./reset_and_reseed.sh
```

Akses aplikasi di browser melalui URL: **`https://localhost:5173`** (atau `http://localhost:5173` jika tidak menggunakan SSL).

---

## 👥 Hak Akses Uji Coba

Gunakan kredensial berikut untuk masuk ke dashboard pengujian (Password: `Admin@123`):
- **Owner / Administrator**: `owner@isp.dev`
- **Customer Service**: `andi@isp.dev`
- **Teknisi Lapangan**: `rizky@isp.dev`

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi MIT. Lihat berkas `LICENSE` untuk informasi lebih lanjut.
