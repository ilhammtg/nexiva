# AI Agent Guide — ISP Platform: Registrasi Pelanggan
> **BACA DOKUMEN INI SEBELUM MENULIS SATU BARIS KODE PUN.**
> Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk seluruh sistem.

---

## Daftar Dokumen yang Harus Dibaca

| Dokumen | Isi | Wajib dibaca oleh |
|---|---|---|
| `AI-AGENT-GUIDE.md` (ini) | Overview sistem, rules, konvensi | Semua AI |
| `TECH-STACK.md` | Teknologi, versi, alasan pemilihan | Semua AI |
| `BACKEND-STRUCTURE.md` | Struktur folder & pola backend Go | AI backend |
| `FRONTEND-STRUCTURE.md` | Struktur folder & pola frontend React | AI frontend |
| `PRD-registrasi-pelanggan.md` | Fitur, alur bisnis, state machine | Semua AI |
| `DATABASE-SCHEMA.md` | Semua tabel, kolom, index, constraint | AI backend |
| `API-CONTRACT.md` | OpenAPI spec semua endpoint | Semua AI |
| `CODING-CONVENTIONS.md` | Naming, error handling, pattern | Semua AI |

---

## Konteks Sistem

Ini adalah **sub-service registrasi pelanggan** dari platform manajemen ISP fiber optik.
Mirip dengan sistem pendaftaran Indihome — dari form online pelanggan hingga aktivasi otomatis internet.

**Yang membuat sistem ini unik:**
- Setelah data pelanggan diapprove dan dibayar, sistem **otomatis** membuat akun PPPoE di Mikrotik
- Sistem **otomatis** mendaftarkan ONT (perangkat di rumah pelanggan) ke OLT ZTE via SSH
- Status provisioning di-push ke frontend secara **realtime** via WebSocket
- Semua operasi ke perangkat jaringan berjalan **paralel** (Mikrotik + OLT bersamaan)

---

## Batasan Keras (JANGAN DILANGGAR)

### Backend
- ❌ JANGAN gunakan `fmt.Println` untuk logging — pakai `pkg/logger`
- ❌ JANGAN hardcode IP, password, atau konfigurasi apapun — semua dari `.env`
- ❌ JANGAN return `pppoe_password` ke response API apapun
- ❌ JANGAN akses database langsung dari handler — wajib lewat repository
- ❌ JANGAN buat migration baru tanpa update `DATABASE-SCHEMA.md`
- ❌ JANGAN ubah nama kolom/tabel yang sudah ada di schema tanpa diskusi
- ✅ Setiap perubahan `status` di tabel `registrations` HARUS insert ke `registration_logs`
- ✅ Semua operasi DB yang mengubah `registrations` + `registration_logs` HARUS dalam satu transaction
- ✅ Gunakan `context.Context` di semua fungsi yang menyentuh DB atau network

### Frontend
- ❌ JANGAN fetch API langsung dari komponen — semua lewat fungsi di folder `api/`
- ❌ JANGAN simpan token JWT di `localStorage` — gunakan `httpOnly cookie`
- ❌ JANGAN buat state global baru jika data bisa di-handle TanStack Query
- ❌ JANGAN gunakan inline style — semua pakai Tailwind class
- ❌ JANGAN buat komponen UI dari nol jika sudah ada di `shadcn/ui`
- ✅ Semua form wajib pakai React Hook Form + Zod untuk validasi
- ✅ Semua tipe data dari API wajib didefinisikan di folder `types/`

---

## Alur Status Registrasi (State Machine)

AI TIDAK BOLEH menambah atau mengubah status selain yang ada di bawah:

```
pending_review
  ├─→ survey_scheduled
  └─→ rejected

survey_scheduled
  ├─→ survey_done
  └─→ survey_failed

survey_done
  └─→ waiting_payment

waiting_payment
  └─→ payment_confirmed

payment_confirmed
  └─→ installation_scheduled

installation_scheduled
  └─→ provisioning

provisioning
  ├─→ active
  └─→ provisioning_failed

active              ← TERMINAL
rejected            ← TERMINAL
survey_failed       ← TERMINAL
```

---

## Konvensi Penamaan Cepat

| Konteks | Konvensi | Contoh |
|---|---|---|
| Go package | lowercase, singkat | `handler`, `service`, `repo` |
| Go struct | PascalCase | `Registration`, `ProvisioningJob` |
| Go fungsi publik | PascalCase | `GetRegistrationByID` |
| Go fungsi privat | camelCase | `buildPPPoEPayload` |
| DB tabel | snake_case plural | `registrations`, `provisioning_logs` |
| DB kolom | snake_case | `created_at`, `ont_serial_number` |
| API endpoint | kebab-case | `/api/v1/registrations/:id/approve` |
| React komponen | PascalCase | `RegistrationForm`, `StatusBadge` |
| React hook | camelCase dengan `use` prefix | `useRegistrations`, `useProvisionStatus` |
| File React | PascalCase untuk komponen | `RegistrationForm.tsx` |
| File hook/util | camelCase | `useWebSocket.ts`, `formatDate.ts` |
| Env variable | UPPER_SNAKE_CASE | `DB_HOST`, `MIKROTIK_PASSWORD` |

---

## Format Response API (Semua Endpoint)

AI backend WAJIB menggunakan format ini secara konsisten:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Pendaftaran berhasil dibuat"
}

// Success dengan pagination
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data tidak valid",
    "details": { "phone": "Nomor HP tidak valid" }
  }
}
```

### Daftar Error Code

| Code | HTTP Status | Keterangan |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `UNAUTHORIZED` | 401 | Token tidak ada/expired |
| `FORBIDDEN` | 403 | Role tidak punya akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `CONFLICT` | 409 | Data duplikat (nomor HP sudah terdaftar) |
| `INVALID_STATUS_TRANSITION` | 422 | Perubahan status tidak valid |
| `PROVISIONING_ERROR` | 502 | Gagal koneksi ke Mikrotik/OLT |
| `INTERNAL_ERROR` | 500 | Error tidak terduga |

---

## WebSocket Events

Backend HANYA boleh push event dengan nama persis seperti ini:

```
provisioning.started
provisioning.mikrotik_done
provisioning.olt_done
provisioning.completed
provisioning.failed
registration.status_changed
```

Format payload semua event:
```json
{
  "event": "provisioning.completed",
  "registration_id": "uuid",
  "data": { ... },
  "timestamp": "2026-01-01T10:00:00Z"
}
```
