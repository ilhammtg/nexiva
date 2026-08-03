# PRD — Sub-service: Registrasi Pelanggan ISP
**Versi:** 1.0  
**Status:** Draft  
**Terakhir diperbarui:** 2026-06-30  
**Konteks sistem:** Sub-service dari platform ISP management. Berjalan sebagai microservice mandiri. Backend: Go (Fiber). Frontend: React + Vite + Tailwind CSS + shadcn/ui. Database: PostgreSQL. OLT: ZTE. Router: Mikrotik (RouterOS REST API).

---

## 1. Tujuan

Sistem registrasi pelanggan baru untuk ISP fiber optik. Mencakup alur dari pendaftaran awal hingga aktivasi layanan secara otomatis — termasuk pembuatan akun PPPoE di Mikrotik dan registrasi ONT ke OLT ZTE.

---

## 2. User Roles

| Role | Akses | Keterangan |
|---|---|---|
| `customer` | Self-register, cek status pendaftaran sendiri | Calon pelanggan via portal publik |
| `cs_admin` | Input data, approve/reject, konfirmasi pembayaran | Customer service / admin kantor |
| `technician` | Lihat jadwal, input serial ONT, trigger aktivasi | Teknisi lapangan |
| `owner` | Monitoring semua, approve override, lihat laporan | Pemilik / manajer |

---

## 3. Alur Bisnis Utama

```
[Pelanggan daftar online]
        ↓
[CS review & verifikasi data]
        ↓
[CS buat jadwal survei + kirim ke teknisi]
        ↓
[Teknisi survei lokasi → update hasil survei]
        ↓
[CS konfirmasi biaya pasang → pelanggan transfer]
        ↓
[CS konfirmasi pembayaran diterima]
        ↓
[Jadwal instalasi dibuat → teknisi lapangan]
        ↓
[Teknisi input serial number ONT di lokasi]
        ↓
[Sistem otomatis: create PPPoE di Mikrotik + register ONT di OLT ZTE]
        ↓
[Status pelanggan → AKTIF]
        ↓
[Notifikasi ke pelanggan: username + password PPPoE]
```

---

## 4. Status Pendaftaran (State Machine)

```
PENDING_REVIEW
    → SURVEY_SCHEDULED      (CS buat jadwal survei)
    → REJECTED              (CS tolak, misal area tidak terjangkau)

SURVEY_SCHEDULED
    → SURVEY_DONE           (teknisi selesai survei, update hasil)
    → SURVEY_FAILED         (lokasi tidak feasible)

SURVEY_DONE
    → WAITING_PAYMENT       (CS kirim tagihan biaya pasang)

WAITING_PAYMENT
    → PAYMENT_CONFIRMED     (CS konfirmasi transfer masuk)

PAYMENT_CONFIRMED
    → INSTALLATION_SCHEDULED (CS buat jadwal instalasi)

INSTALLATION_SCHEDULED
    → PROVISIONING          (teknisi input ONT serial, trigger provisioning)

PROVISIONING
    → ACTIVE                (Mikrotik + OLT berhasil dikonfigurasi)
    → PROVISIONING_FAILED   (error di Mikrotik atau OLT, perlu retry)

ACTIVE                      ← status final

REJECTED / SURVEY_FAILED    ← status terminal (bisa diarsip)
```

---

## 5. Fitur Per Role

### 5.1 Portal Pelanggan (publik, tanpa login awal)

- Form pendaftaran online:
  - Nama lengkap, NIK, nomor HP, email
  - Alamat lengkap (provinsi, kota, kecamatan, kelurahan, RT/RW, detail)
  - Pilih paket internet (dari daftar paket aktif)
  - Upload foto KTP (opsional di tahap awal, bisa diminta CS)
  - CAPTCHA / rate limiting
- Setelah submit: dapat nomor registrasi dan link cek status
- Halaman cek status: masukkan nomor HP atau nomor registrasi → lihat posisi proses

### 5.2 Dashboard CS Admin

- **Daftar pendaftaran masuk** — filter by status, tanggal, area, paket
- **Detail pendaftaran** — semua data pelanggan + history perubahan status
- **Approve / reject** pendaftaran dengan catatan alasan
- **Buat jadwal survei** — assign ke teknisi, set tanggal + waktu
- **Konfirmasi pembayaran** — input jumlah yang diterima, tanggal, bank
- **Buat jadwal instalasi** — assign ke teknisi, set tanggal + waktu
- **Generate username PPPoE** — otomatis dari nama/nomor pelanggan (bisa di-override)
- **Kirim notifikasi manual** ke pelanggan (WhatsApp / SMS — via webhook)
- **Lihat log provisioning** per pelanggan (sukses / gagal + pesan error)

### 5.3 Dashboard Teknisi Lapangan

- **Jadwal hari ini** — list tugas survei + instalasi yang di-assign
- **Detail lokasi** — alamat, nama pelanggan, nomor HP, catatan CS
- **Update hasil survei** — feasible/tidak, foto lokasi, catatan teknis, estimasi panjang kabel
- **Input serial number ONT** — scan atau ketik manual serial ONT yang dipasang
- **Trigger aktivasi** — tombol "Aktifkan Sekarang" → sistem auto-provisioning ke Mikrotik + ZTE OLT
- **Lihat status provisioning realtime** — progress bar / status WebSocket

### 5.4 Dashboard Owner / Manager

- **Overview summary** — total pendaftar, aktif bulan ini, pending, gagal
- **List semua pendaftaran** — bisa export CSV
- **Log aktivitas CS** — siapa approve apa, kapan
- **Lihat detail provisioning** — history per pelanggan

---

## 6. Fitur Teknis Provisioning

### 6.1 Mikrotik PPPoE (RouterOS REST API)

Endpoint: `POST /rest/ppp/secret`

Field yang di-set otomatis:
- `name` — username PPPoE (format: `ISP-{nomor_pelanggan}` atau custom)
- `password` — auto-generate 10 karakter alphanumeric
- `service` — `pppoe`
- `profile` — sesuai paket yang dipilih (mapping paket → profile name di config)
- `comment` — nama pelanggan + nomor registrasi

### 6.2 OLT ZTE (SSH CLI)

Koneksi: SSH ke management IP OLT ZTE  
Autentikasi: username + password (disimpan di env / secret manager)

Command sequence yang dieksekusi:
```
configure terminal
interface gpon-olt_{slot}/{port}
ont add {ont_index} sn-auth {serial_number} omci ont-lineprofile-id {line_profile} ont-srvprofile-id {srv_profile}
ont port native-vlan {ont_index} eth 1 vlan {vlan_id}
exit
exit
```

Config yang perlu tersedia di sistem:
- Mapping paket → `line_profile_id`, `srv_profile_id`, `vlan_id`
- Target slot/port OLT per area coverage
- ONT index auto-increment per port

### 6.3 Provisioning Job

- Provisioning dijalankan sebagai background job (goroutine + channel)
- Mikrotik dan OLT diproses **paralel** (sync.WaitGroup)
- Jika salah satu gagal → status `PROVISIONING_FAILED`, simpan pesan error, bisa retry manual
- Timeout per operasi: 30 detik
- Max retry otomatis: 3x dengan interval 10 detik
- Log setiap langkah ke tabel `provisioning_logs`

### 6.4 WebSocket Event

Event yang di-push ke frontend saat provisioning:
```json
{ "event": "provisioning.started",   "registration_id": "...", "timestamp": "..." }
{ "event": "provisioning.mikrotik_done", "registration_id": "...", "timestamp": "..." }
{ "event": "provisioning.olt_done",  "registration_id": "...", "timestamp": "..." }
{ "event": "provisioning.completed", "registration_id": "...", "timestamp": "..." }
{ "event": "provisioning.failed",    "registration_id": "...", "error": "...", "timestamp": "..." }
```

---

## 7. Notifikasi

Semua notifikasi dikirim via webhook eksternal (WhatsApp gateway / SMS gateway).  
Sistem hanya mengirim HTTP POST ke endpoint yang dikonfigurasi.

| Trigger | Penerima | Isi pesan |
|---|---|---|
| Pendaftaran masuk | CS admin | "Ada pendaftar baru: {nama}, {paket}" |
| Jadwal survei dibuat | Pelanggan + Teknisi | Tanggal, jam, nama teknisi |
| Pembayaran dikonfirmasi | Pelanggan | Konfirmasi + jadwal instalasi |
| Jadwal instalasi | Pelanggan + Teknisi | Tanggal, jam |
| Aktivasi berhasil | Pelanggan | Username + password PPPoE, info akses |
| Provisioning gagal | CS Admin + Owner | Error detail |

---

## 8. Paket Internet

Tabel paket dikelola di database (CRUD oleh owner/admin).  
Setiap paket memiliki:
- Nama paket (misal: "Paket 10 Mbps", "Paket 20 Mbps")
- Harga bulanan
- Biaya pasang
- Kecepatan download / upload (Mbps)
- `mikrotik_profile` — nama profile di Mikrotik
- `olt_line_profile_id` — ID line profile di ZTE OLT
- `olt_srv_profile_id` — ID service profile di ZTE OLT
- `vlan_id` — VLAN yang digunakan
- Status aktif/nonaktif

---

## 9. Keamanan & Validasi

- Semua endpoint (kecuali form publik dan cek status) wajib JWT auth
- JWT payload berisi: `user_id`, `role`, `exp`
- Rate limiting pada form publik: max 5 submit per IP per jam
- Upload KTP: max 5MB, hanya jpg/png/pdf
- Semua input disanitasi sebelum masuk DB
- Password PPPoE tidak pernah dikembalikan ke frontend setelah dibuat (hanya dikirim via notifikasi ke pelanggan)
- Log audit: setiap perubahan status menyimpan `changed_by`, `changed_at`, `reason`

---

## 10. Non-functional Requirements

- Response API < 300ms untuk operasi non-provisioning
- Provisioning timeout maksimal 60 detik total
- Sistem harus berjalan jika OLT/Mikrotik sedang tidak bisa diakses (job masuk queue, retry otomatis)
- Mendukung minimal 50 provisioning concurrent
- Log provisioning disimpan minimal 1 tahun

---

## 11. Out of Scope (v1)

- Modul billing / invoice bulanan
- Suspend / terminasi layanan
- Self-service portal pelanggan setelah aktif
- Multi-OLT / multi-Mikrotik (v1 hanya 1 OLT + 1 Mikrotik)
- Integrasi payment gateway otomatis (pembayaran manual dulu)
- Mobile app native (teknisi pakai browser mobile)

---

## 12. Dependensi Eksternal

| Sistem | Protokol | Keterangan |
|---|---|---|
| Mikrotik RouterOS | REST API (HTTP) | Port 443, basic auth |
| ZTE OLT | SSH CLI | Port 22 |
| WhatsApp / SMS Gateway | HTTP Webhook | Konfigurasi via env |
| PostgreSQL | TCP | Database utama |
| Redis | TCP | Cache + job queue |

---

*Dokumen ini adalah source of truth untuk semua AI agent dan developer yang mengerjakan sub-service registrasi. Setiap perubahan arsitektur harus diupdate di sini sebelum diimplementasikan di kode.*
