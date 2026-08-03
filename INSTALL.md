# Panduan Onboarding & Instalasi — ISP Platform

Panduan ini ditujukan untuk menjalankan seluruh ekosistem ISP Platform di komputer lokal yang baru/kosong dari awal (clean machine).

---

## Prasyarat Sistem

Wajib terpasang pada komputer Anda:
1. **Docker** & **Docker Compose**
2. **Git**
3. **mkcert** (untuk local HTTPS)

---

## Langkah-langkah Setup (Quick Start)

### 1. Persiapan Folder & Environment
Pertama, salin berkas environment konfigurasi default untuk backend dan frontend:
```bash
# 1. Salin berkas env backend
cp backend/.env.example backend/.env

# 2. Salin berkas env frontend
cp frontend/.env.example frontend/.env
```

### 2. Membuat SSL Certificate (HTTPS)
Fitur peta (Google Maps API) dan deteksi GPS memerlukan browser Secure Context (HTTPS). Kita menggunakan `mkcert` untuk membuat sertifikat SSL tepercaya secara lokal.

**Install mkcert & nss-tools sesuai OS Anda:**
- **Fedora/RHEL**: `sudo dnf install mkcert nss-tools`
- **Ubuntu/Debian**: `sudo apt install mkcert libnss3-tools`
- **macOS**: `brew install mkcert`
- **Windows**: `scoop install mkcert`

**Daftarkan root CA lokal dan buat sertifikat:**
```bash
# Daftarkan CA ke browser & OS trust store (Jalankan sekali seumur hidup)
mkcert -install

# Jalankan script helper untuk membuat sertifikat SSL frontend
./frontend/setup-https.sh
```
*Script di atas akan menghasilkan file sertifikat di `./frontend/certs/`.*

### 3. Menjalankan Docker Containers
Seluruh service (database, cache, message broker, backend Go, dan frontend React) dikemas dalam Docker. Cukup jalankan satu perintah:

```bash
# Build dan jalankan semua service di background
docker compose up -d --build

# Periksa status kontainer
docker compose ps
```

Daftar container yang akan berjalan:
- `isp_frontend` (Vite, HTTPS port `5173`)
- `isp_backend` (Go Server, port `8080`)
- `isp_postgres` (PostgreSQL Database, port `5432`)
- `isp_redis` (Cache & Session, port `6379`)
- `isp_nats` (PubSub Message Broker, port `4222`)
- `isp_pgadmin` (Opsional, port `5050`)

*Catatan: Backend akan otomatis melakukan koneksi dan menjalankan database migrations (`backend/migrations/`) secara mandiri pada saat startup.*

### 4. Seed Data Wilayah & Akun (Rekomendasi)
Untuk memasukkan data dummy real-world (OLT, ODP, dan pelanggan aktif berkoordinasi Peusangan, Bireuen), jalankan script reseed:

```bash
./reset_and_reseed.sh
```

---

## Akses Layanan & Akun Uji Coba

Setelah semua container berjalan:

- **Frontend Dashboard (HTTPS)**: [https://localhost:5173](https://localhost:5173)
- **Backend Health Check**: [http://localhost:8080/health](http://localhost:8080/health)
- **Database Admin (pgAdmin)**: [http://localhost:5050](http://localhost:5050) (Login: `admin@isp.dev` / `admin`)

### Akun Uji Coba Default (Password: `Admin@123`):
| Role | Email | No. Telepon | Hak Akses |
|---|---|---|---|
| **Super Admin / Owner** | `owner@isp.dev` | `081200000001` | Penuh (Branding, Billing, Mikrotik, OLT) |
| **Customer Service** | `andi@isp.dev` | `081200000002` | Registrasi & Layanan Pelanggan |
| **Teknisi Lapangan** | `rizky@isp.dev` | `081200000004` | Tiket Survei & Instalasi Lapangan |

---

## Pemecahan Masalah (Troubleshooting)

**1. Browser menampilkan "Connection Not Private":**
- Pastikan Anda sudah menjalankan `mkcert -install` sebelum menjalankan script `./frontend/setup-https.sh`.
- Restart browser Anda agar sistem mengenali CA lokal yang baru.

**2. Koneksi DB Error di Backend:**
- Pastikan password database di `backend/.env` cocok dengan `POSTGRES_PASSWORD` di `docker-compose.yml`.

**3. Reset Data Database:**
- Jika database Anda corrupt atau ingin dibersihkan secara total:
  ```bash
  docker compose down -v
  docker compose up -d
  ./reset_and_reseed.sh
  ```
