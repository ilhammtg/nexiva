# API Contract — Sub-service Registrasi Pelanggan ISP

**Base URL:** `http://localhost:8080/api/v1`  
**Versi:** 1.0  
**Auth:** Bearer JWT (kecuali endpoint publik)

---

## Format Response Global

```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Success dengan pagination
{ "success": true, "data": [...], "meta": { "page": 1, "per_page": 20, "total": 150, "total_pages": 8 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { ... } } }
```

**Error Codes:** `VALIDATION_ERROR (400)` · `UNAUTHORIZED (401)` · `FORBIDDEN (403)` · `NOT_FOUND (404)` · `CONFLICT (409)` · `INVALID_STATUS_TRANSITION (422)` · `PROVISIONING_ERROR (502)` · `INTERNAL_ERROR (500)`

---

## 1. Auth

### POST /auth/login
Login untuk CS Admin, Teknisi, Owner.

**Request:**
```json
{ "phone": "081234567890", "password": "secret123" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "full_name": "Budi Santoso",
      "phone": "081234567890",
      "role": "cs_admin"
    }
  }
}
```

**Error:** `401 UNAUTHORIZED` jika credentials salah.

---

### POST /auth/refresh
Perbarui access token menggunakan refresh token.

**Request:**
```json
{ "refresh_token": "eyJ..." }
```

**Response 200:**
```json
{
  "success": true,
  "data": { "access_token": "eyJ...", "expires_in": 86400 }
}
```

---

### POST /auth/logout
Invalidate refresh token. *(Requires Auth)*

**Response 200:** `{ "success": true, "message": "Logout berhasil" }`

---

## 2. Public — Registrasi Pelanggan

### POST /registrations
Submit form pendaftaran baru. **Tanpa auth. Rate limit: 5/IP/jam.**

**Request (multipart/form-data):**
```
full_name       string   required   "Budi Santoso"
nik             string   optional   "3171234567890001"
phone           string   required   "081234567890"
email           string   optional   "budi@email.com"
province        string   required   "Jawa Barat"
city            string   required   "Bandung"
district        string   required   "Coblong"
village         string   required   "Dago"
rt              string   optional   "003"
rw              string   optional   "007"
address_detail  string   required   "Jl. Dago No. 10"
maps_lat        float    optional   -6.8942
maps_lng        float    optional   107.6108
package_id      uuid     required   "uuid-paket"
ktp_file        file     optional   max 5MB, jpg/png/pdf
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "registration_id": "uuid",
    "reg_number": "REG-20260102-0001",
    "status": "pending_review",
    "message": "Pendaftaran berhasil dikirim. Simpan nomor registrasi Anda."
  }
}
```

**Error:** `409 CONFLICT` jika nomor HP sudah terdaftar aktif.

---

### GET /registrations/status
Cek status pendaftaran. **Tanpa auth.**

**Query Params:**
- `phone` (string) — nomor HP pelanggan, **atau**
- `reg_number` (string) — nomor registrasi

**Response 200:**
```json
{
  "success": true,
  "data": {
    "reg_number": "REG-20260102-0001",
    "full_name": "Budi Santoso",
    "status": "survey_scheduled",
    "status_label": "Survei Dijadwalkan",
    "package_name": "Paket 20 Mbps",
    "survey_scheduled_at": "2026-01-05T09:00:00Z",
    "created_at": "2026-01-02T10:00:00Z",
    "timeline": [
      { "status": "pending_review", "label": "Pendaftaran Masuk", "timestamp": "2026-01-02T10:00:00Z" },
      { "status": "survey_scheduled", "label": "Survei Dijadwalkan", "timestamp": "2026-01-03T14:00:00Z" }
    ]
  }
}
```

---

### GET /packages
Daftar paket internet aktif. **Tanpa auth.**

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Paket 10 Mbps",
      "description": "Cocok untuk keluarga kecil",
      "price_monthly": 150000,
      "price_installation": 250000,
      "speed_down_mbps": 10,
      "speed_up_mbps": 5,
      "sort_order": 1
    }
  ]
}
```

---

## 3. CS Admin Endpoints *(Role: cs_admin, owner)*

### GET /admin/registrations
Daftar semua pendaftaran dengan filter & pagination.

**Query Params:**
```
page        int      default=1
per_page    int      default=20, max=100
status      string   filter by status (misal: pending_review)
search      string   cari nama/phone/reg_number
date_from   date     format YYYY-MM-DD
date_to     date     format YYYY-MM-DD
package_id  uuid     filter by paket
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reg_number": "REG-20260102-0001",
      "full_name": "Budi Santoso",
      "phone": "081234567890",
      "status": "pending_review",
      "package_name": "Paket 20 Mbps",
      "city": "Bandung",
      "cs_name": null,
      "created_at": "2026-01-02T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 85, "total_pages": 5 }
}
```

---

### GET /admin/registrations/:id
Detail satu pendaftaran lengkap.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reg_number": "REG-20260102-0001",
    "full_name": "Budi Santoso",
    "nik": "3171234567890001",
    "phone": "081234567890",
    "email": "budi@email.com",
    "province": "Jawa Barat",
    "city": "Bandung",
    "district": "Coblong",
    "village": "Dago",
    "rt": "003",
    "rw": "007",
    "address_detail": "Jl. Dago No. 10",
    "maps_lat": -6.8942,
    "maps_lng": 107.6108,
    "ktp_file_url": "https://...",
    "package": {
      "id": "uuid",
      "name": "Paket 20 Mbps",
      "price_monthly": 200000,
      "price_installation": 300000
    },
    "status": "pending_review",
    "cs_user": null,
    "technician": null,
    "survey_scheduled_at": null,
    "survey_done_at": null,
    "survey_is_feasible": null,
    "survey_notes": null,
    "survey_cable_length_m": null,
    "installation_scheduled_at": null,
    "installation_fee": null,
    "payment_amount": null,
    "payment_date": null,
    "payment_bank": null,
    "payment_confirmed_at": null,
    "pppoe_username": null,
    "ont_serial_number": null,
    "rejection_reason": null,
    "internal_notes": null,
    "activated_at": null,
    "created_at": "2026-01-02T10:00:00Z",
    "updated_at": "2026-01-02T10:00:00Z",
    "logs": [
      {
        "id": "uuid",
        "status_from": null,
        "status_to": "pending_review",
        "changed_by_name": "System",
        "reason": null,
        "created_at": "2026-01-02T10:00:00Z"
      }
    ]
  }
}
```

---

### PATCH /admin/registrations/:id/approve
Approve pendaftaran → jadwalkan survei. Status: `pending_review → survey_scheduled`.

**Request:**
```json
{
  "technician_id": "uuid",
  "survey_scheduled_at": "2026-01-05T09:00:00Z",
  "notes": "Area sudah terjangkau jaringan kami"
}
```

**Response 200:**
```json
{ "success": true, "data": { "status": "survey_scheduled" }, "message": "Survei dijadwalkan" }
```

**Error:** `422 INVALID_STATUS_TRANSITION` jika status bukan `pending_review`.

---

### PATCH /admin/registrations/:id/reject
Tolak pendaftaran. Status: `pending_review → rejected`.

**Request:**
```json
{ "reason": "Area belum terjangkau jaringan kami" }
```

**Response 200:**
```json
{ "success": true, "data": { "status": "rejected" }, "message": "Pendaftaran ditolak" }
```

---

### PATCH /admin/registrations/:id/confirm-payment
Konfirmasi pembayaran biaya pasang. Status: `waiting_payment → payment_confirmed`.

**Request:**
```json
{
  "payment_amount": 300000,
  "payment_date": "2026-01-10",
  "payment_bank": "BCA",
  "notes": "Transfer via ATM"
}
```

**Response 200:**
```json
{ "success": true, "data": { "status": "payment_confirmed" }, "message": "Pembayaran dikonfirmasi" }
```

---

### PATCH /admin/registrations/:id/schedule-installation
Buat jadwal instalasi. Status: `payment_confirmed → installation_scheduled`.

**Request:**
```json
{
  "technician_id": "uuid",
  "installation_scheduled_at": "2026-01-15T08:00:00Z",
  "installation_fee": 300000,
  "pppoe_username": "ISP-0001-K7M2",
  "notes": "Bawa kabel 50m"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "installation_scheduled",
    "pppoe_username": "ISP-0001-K7M2"
  },
  "message": "Jadwal instalasi dibuat"
}
```

---

### PATCH /admin/registrations/:id/internal-notes
Update catatan internal CS (tidak ubah status).

**Request:**
```json
{ "internal_notes": "Pelanggan minta dihubungi sore hari" }
```

**Response 200:**
```json
{ "success": true, "message": "Catatan diperbarui" }
```

---

### GET /admin/technicians
Daftar teknisi aktif untuk dropdown assign. *(Role: cs_admin, owner)*

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "full_name": "Andi Teknisi", "phone": "082111222333" }
  ]
}
```

---

### GET /admin/provisioning-logs/:registration_id
Log provisioning untuk satu pendaftaran. *(Role: cs_admin, owner)*

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "target": "mikrotik",
      "action": "create_pppoe_secret",
      "status": "success",
      "error_message": null,
      "duration_ms": 1230,
      "attempt_number": 1,
      "created_at": "2026-01-15T09:15:00Z"
    },
    {
      "id": "uuid",
      "target": "olt_zte",
      "action": "register_ont",
      "status": "success",
      "error_message": null,
      "duration_ms": 4500,
      "attempt_number": 1,
      "created_at": "2026-01-15T09:15:05Z"
    }
  ]
}
```

---

## 4. Teknisi Endpoints *(Role: technician)*

### GET /technician/schedule
Jadwal tugas teknisi hari ini dan mendatang.

**Query Params:**
```
date  date  optional, default=today (YYYY-MM-DD)
type  string  optional: survey | installation | all (default: all)
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reg_number": "REG-20260102-0001",
      "type": "survey",
      "full_name": "Budi Santoso",
      "phone": "081234567890",
      "address_detail": "Jl. Dago No. 10, RT 003/007",
      "city": "Bandung",
      "maps_lat": -6.8942,
      "maps_lng": 107.6108,
      "scheduled_at": "2026-01-05T09:00:00Z",
      "package_name": "Paket 20 Mbps",
      "notes": "Bawa kabel 50m"
    }
  ]
}
```

---

### PATCH /technician/registrations/:id/survey-result
Input hasil survei lapangan. Status: `survey_scheduled → survey_done` atau `survey_failed`.

**Request:**
```json
{
  "is_feasible": true,
  "cable_length_m": 45,
  "notes": "Tiang terdekat berjarak 40m, kondisi baik",
  "installation_fee_estimate": 300000
}
```

*Jika `is_feasible: false`:*
```json
{
  "is_feasible": false,
  "notes": "Lokasi terlalu jauh dari tiang, medan sulit"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "status": "survey_done" },
  "message": "Hasil survei berhasil disimpan"
}
```

---

### PATCH /technician/registrations/:id/activate
Trigger aktivasi / provisioning. Input serial ONT. Status: `installation_scheduled → provisioning`.

**Request:**
```json
{
  "ont_serial_number": "ZTEGC1234567",
  "olt_port_config_id": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "provisioning",
    "message": "Provisioning dimulai. Pantau progress via WebSocket."
  }
}
```

---

### PATCH /technician/registrations/:id/retry-provisioning
Retry provisioning yang gagal. *(Role: technician, cs_admin, owner)*  
Status: `provisioning_failed → provisioning`.

**Response 200:**
```json
{
  "success": true,
  "data": { "status": "provisioning" },
  "message": "Retry provisioning dimulai"
}
```

---

## 5. Owner Endpoints *(Role: owner)*

### GET /owner/dashboard
Summary statistik keseluruhan.

**Query Params:**
```
period  string  optional: today | this_week | this_month | all (default: this_month)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "period": "this_month",
    "summary": {
      "total_registrations": 120,
      "pending_review": 5,
      "in_progress": 23,
      "active": 87,
      "rejected": 3,
      "provisioning_failed": 2
    },
    "recent_registrations": [
      {
        "reg_number": "REG-20260102-0005",
        "full_name": "Dewi Rahayu",
        "status": "pending_review",
        "created_at": "2026-01-02T14:30:00Z"
      }
    ]
  }
}
```

---

### GET /owner/registrations
Semua pendaftaran (sama seperti CS admin tapi bisa lihat semua data).

*Query params identik dengan `GET /admin/registrations`.*

---

### GET /owner/activity-logs
Log aktivitas semua CS admin.

**Query Params:**
```
page      int    default=1
per_page  int    default=20
date_from date
date_to   date
user_id   uuid   filter by CS
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "registration_reg_number": "REG-20260102-0001",
      "customer_name": "Budi Santoso",
      "status_from": "pending_review",
      "status_to": "survey_scheduled",
      "changed_by_name": "Siti CS Admin",
      "reason": null,
      "created_at": "2026-01-03T14:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 45, "total_pages": 3 }
}
```

---

### GET /owner/export/registrations
Export data registrasi ke CSV.

**Query Params:** Sama seperti filter di `/owner/registrations`.

**Response:** `Content-Type: text/csv`  
**Headers:** `Content-Disposition: attachment; filename="registrations-2026-01.csv"`

---

## 6. Packages (CRUD) *(Role: owner)*

### GET /packages/all
Semua paket termasuk yang nonaktif. *(Requires Auth, Role: owner)*

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Paket 10 Mbps",
      "description": "Cocok untuk keluarga kecil",
      "price_monthly": 150000,
      "price_installation": 250000,
      "speed_down_mbps": 10,
      "speed_up_mbps": 5,
      "mikrotik_profile": "profile-10mbps",
      "olt_line_profile_id": 1,
      "olt_srv_profile_id": 1,
      "vlan_id": 100,
      "is_active": true,
      "sort_order": 1,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /packages
Buat paket baru. *(Role: owner)*

**Request:**
```json
{
  "name": "Paket 50 Mbps",
  "description": "Untuk keluarga besar atau UMKM",
  "price_monthly": 350000,
  "price_installation": 300000,
  "speed_down_mbps": 50,
  "speed_up_mbps": 25,
  "mikrotik_profile": "profile-50mbps",
  "olt_line_profile_id": 3,
  "olt_srv_profile_id": 3,
  "vlan_id": 300,
  "sort_order": 3
}
```

**Response 201:**
```json
{ "success": true, "data": { "id": "uuid", "name": "Paket 50 Mbps" }, "message": "Paket berhasil dibuat" }
```

---

### PUT /packages/:id
Update paket. *(Role: owner)*

*Request body sama dengan POST.*

**Response 200:**
```json
{ "success": true, "message": "Paket berhasil diperbarui" }
```

---

### PATCH /packages/:id/toggle
Aktifkan / nonaktifkan paket. *(Role: owner)*

**Response 200:**
```json
{ "success": true, "data": { "is_active": false }, "message": "Paket dinonaktifkan" }
```

---

## 7. OLT Port Config *(Role: owner)*

### GET /olt-ports
Daftar konfigurasi port OLT.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Area Barat - Slot 0 Port 1",
      "area_name": "Bandung Barat",
      "olt_host": "192.168.1.254",
      "gpon_slot": 0,
      "gpon_port": 1,
      "max_ont": 64,
      "current_ont_count": 12,
      "is_active": true
    }
  ]
}
```

---

### POST /olt-ports
Tambah konfigurasi port OLT baru. *(Role: owner)*

**Request:**
```json
{
  "name": "Area Timur - Slot 0 Port 2",
  "area_name": "Bandung Timur",
  "olt_host": "192.168.1.254",
  "olt_port_ssh": 22,
  "gpon_slot": 0,
  "gpon_port": 2,
  "max_ont": 64,
  "notes": "Port untuk area Cicaheum"
}
```

**Response 201:**
```json
{ "success": true, "data": { "id": "uuid" }, "message": "Port OLT berhasil ditambahkan" }
```

---

## 8. App Config *(Role: owner)*

### GET /configs
Ambil semua konfigurasi sistem.

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "key": "notif_enabled", "value": "true", "description": "Aktifkan notifikasi" },
    { "key": "notif_webhook_url", "value": "https://...", "description": "URL webhook WA/SMS gateway" }
  ]
}
```

---

### PUT /configs/:key
Update satu nilai konfigurasi. *(Role: owner)*

**Request:**
```json
{ "value": "https://api.whatsapp-gateway.com/send" }
```

**Response 200:**
```json
{ "success": true, "message": "Konfigurasi diperbarui" }
```

---

## 9. WebSocket

### WS /ws
Real-time event stream. **Requires Auth** via query param `?token=<access_token>`.

**Client connect:**
```
ws://localhost:8080/ws?token=eyJ...
```

**Subscribe ke registration tertentu (kirim dari client):**
```json
{ "action": "subscribe", "registration_id": "uuid" }
```

**Events yang diterima dari server:**

```json
{ "event": "provisioning.started",      "registration_id": "uuid", "data": {}, "timestamp": "2026-01-15T09:15:00Z" }
{ "event": "provisioning.mikrotik_done","registration_id": "uuid", "data": { "pppoe_username": "ISP-0001-K7M2" }, "timestamp": "..." }
{ "event": "provisioning.olt_done",     "registration_id": "uuid", "data": { "ont_index": 13 }, "timestamp": "..." }
{ "event": "provisioning.completed",    "registration_id": "uuid", "data": { "activated_at": "..." }, "timestamp": "..." }
{ "event": "provisioning.failed",       "registration_id": "uuid", "data": { "error": "SSH timeout to OLT" }, "timestamp": "..." }
{ "event": "registration.status_changed","registration_id": "uuid", "data": { "status": "survey_scheduled" }, "timestamp": "..." }
```

---

## 10. Users (Admin) *(Role: owner)*

### GET /users
Daftar semua user staff (bukan customer).

**Query Params:** `role` filter (cs_admin | technician | owner)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "Siti Admin",
      "phone": "081100000001",
      "email": "siti@isp.com",
      "role": "cs_admin",
      "is_active": true,
      "last_login_at": "2026-01-02T08:00:00Z",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /users
Buat user baru (staff). *(Role: owner)*

**Request:**
```json
{
  "full_name": "Andi Teknisi",
  "phone": "082200000002",
  "email": "andi@isp.com",
  "password": "initialPassword123",
  "role": "technician"
}
```

**Response 201:**
```json
{ "success": true, "data": { "id": "uuid" }, "message": "User berhasil dibuat" }
```

---

### PATCH /users/:id/toggle
Aktifkan/nonaktifkan user. *(Role: owner)*

**Response 200:**
```json
{ "success": true, "data": { "is_active": false }, "message": "User dinonaktifkan" }
```

---

### PUT /users/:id/password
Reset password user. *(Role: owner)*

**Request:**
```json
{ "new_password": "newSecurePass123" }
```

**Response 200:**
```json
{ "success": true, "message": "Password berhasil diperbarui" }
```

---

## 11. Mikrotik Configurations *(Role: owner)*

### GET /owner/mikrotik-configs
Daftar semua konfigurasi Mikrotik yang terdaftar.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mikrotik Core Utama",
      "host": "192.168.1.1",
      "port": 443,
      "username": "admin",
      "is_active": true,
      "last_checked_at": "2026-07-02T13:25:00Z",
      "is_online": true,
      "created_at": "2026-07-02T13:00:00Z",
      "updated_at": "2026-07-02T13:25:00Z"
    }
  ]
}
```

---

### GET /owner/mikrotik-configs/:id
Detail konfigurasi Mikrotik berdasarkan ID.

**Response 200:** (Password disembunyikan/tidak dikembalikan)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mikrotik Core Utama",
    "host": "192.168.1.1",
    "port": 443,
    "username": "admin",
    "is_active": true,
    "last_checked_at": "2026-07-02T13:25:00Z",
    "is_online": true,
    "created_at": "2026-07-02T13:00:00Z",
    "updated_at": "2026-07-02T13:25:00Z"
  }
}
```

---

### POST /owner/mikrotik-configs
Daftarkan konfigurasi Mikrotik baru. Password akan dienkripsi di server menggunakan `APP_SECRET_KEY` sebelum disimpan.

**Request:**
```json
{
  "name": "Mikrotik OLT Barat",
  "host": "10.0.0.1",
  "port": 8728,
  "username": "api_user",
  "password": "secretSecurePassword123",
  "is_active": true
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mikrotik OLT Barat",
    "host": "10.0.0.1",
    "port": 8728,
    "username": "api_user",
    "is_active": true
  },
  "message": "Konfigurasi Mikrotik berhasil dibuat"
}
```

---

### PUT /owner/mikrotik-configs/:id
Update konfigurasi Mikrotik yang ada. Jika payload `password` dikirim (tidak kosong), password akan di-update & di-reencrypt.

**Request:**
```json
{
  "name": "Mikrotik OLT Barat (Updated)",
  "host": "10.0.0.5",
  "port": 8728,
  "username": "api_user_new",
  "password": "newSecretSecurePassword123",
  "is_active": true
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Konfigurasi Mikrotik berhasil diperbarui"
}
```

---

### DELETE /owner/mikrotik-configs/:id
Hapus konfigurasi Mikrotik.

**Response 200:**
```json
{
  "success": true,
  "message": "Konfigurasi Mikrotik berhasil dihapus"
}
```

---

### PATCH /owner/mikrotik-configs/:id/toggle
Aktifkan / nonaktifkan status konfigurasi Mikrotik.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "is_active": false
  },
  "message": "Konfigurasi Mikrotik dinonaktifkan"
}
```

---

### POST /owner/mikrotik-configs/:id/test
Tes ping koneksi ke hardware Mikrotik (menggunakan dekripsi password dinamis).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "is_online": true
  },
  "message": "Koneksi Mikrotik online/berhasil"
}
```

---

## Catatan Implementasi

- `pppoe_password` **TIDAK PERNAH** dikembalikan di response manapun
- Upload KTP: max 5MB, format jpg/png/pdf, disimpan di `UPLOAD_PATH`
- Semua timestamp ISO 8601 UTC (`Z`)
- Rate limit form publik: 5 request/IP/jam
- WebSocket token via query string (bukan header, karena browser WS API tidak support custom header)
- Pagination: default `per_page=20`, max `per_page=100`
