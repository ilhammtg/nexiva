# Refactor Microservice — Architecture

Bagian ini menjelaskan boundary domain, struktur repository, dan pola komunikasi antar service.

## Boundary domain yang disarankan

| Domain | Tanggung jawab | Status |
|---|---|---|
| Auth | login, refresh token, reset password, profile | Dipisah menjadi service |
| Registration | submit, review, approve, reject, status workflow | Dipisah menjadi service |
| Provisioning | job provisioning, retry, integrasi Mikrotik dan OLT | Dipisah menjadi service |
| Notification | email, webhook, log notifikasi | Dipisah menjadi service |
| Shared Platform | logging, config, auth utilities, common models | Shared library/platform |

## Struktur repository yang disarankan

```text
platform/
  api-gateway/
  shared/
  services/
    auth-service/
    registration-service/
    provisioning-service/
    notification-service/
  frontend/
```

## Struktur tiap service

```text
service-name/
  cmd/server/main.go
  internal/
  pkg/
  migrations/
  Dockerfile
  go.mod
  Makefile
```

## Pola komunikasi antar service

### Synchronous
Gunakan untuk operasi yang butuh response langsung, misalnya:

- Auth Service memvalidasi token
- Registration Service memanggil Auth Service

Pola yang cocok:

- REST API
- gRPC untuk traffic internal yang tinggi

### Asynchronous
Gunakan untuk workflow bisnis yang tidak harus selesai seketika:

- Registration Submitted -> Provisioning Requested
- Provisioning Done -> Notification Sent

Pola yang cocok:

- NATS subjects
- event schema versioned

Contoh event:

- registration.submitted
- provisioning.requested
- provisioning.completed
- notification.sent

---

## Konsep database untuk arsitektur microservice

### 1. Tahap awal: shared database dengan schema terpisah
Untuk fase transisi, paling aman memakai satu instance PostgreSQL dengan beberapa schema terpisah.

Contoh:

```text
postgres/
  auth_schema
  registration_schema
  provisioning_schema
  notification_schema
```

Keuntungan:

- refactor tidak terlalu berat
- tidak perlu migrasi data besar-besaran
- tetap menjaga batas domain secara konseptual

Kekurangan:

- masih ada single point of failure di level database
- kurang ideal untuk scaling per service

### 2. Tahap matang: database per service
Saat service sudah mandiri, tiap service punya database sendiri.

Contoh:

```text
auth-service -> authdb
registration-service -> registrationdb
provisioning-service -> provisioningdb
notification-service -> notificationdb
```

Keuntungan:

- ownership data jelas
- scaling lebih fleksibel
- satu service tidak tergantung database service lain

Kekurangan:

- perlu mekanisme sync antar service
- lebih banyak operasi deployment dan backup

### 3. Pola data antar service
Karena database tidak lagi shared, data antar service tidak boleh di-join langsung.

Pola yang disarankan:

- Service A menyimpan reference ID ke Service B
- Service A memanggil Service B saat butuh detail data
- Service A menerima event dari Service B saat data berubah

Contoh:

- Registration Service menyimpan user_id
- Provisioning Service menyimpan registration_id
- Notification Service menerima event ketika status registrasi berubah

### 4. Rekomendasi model data untuk proyek ISP

#### Auth Service
Tabel utama:

- users
- roles
- sessions
- password_reset_tokens

#### Registration Service
Tabel utama:

- registrations
- registration_status_history
- registration_notes
- packages
- customer_numbers

#### Provisioning Service
Tabel utama:

- provisioning_jobs
- provisioning_logs
- provisioning_attempts
- olt_actions
- mikrotik_actions

#### Notification Service
Tabel utama:

- notifications
- notification_templates
- notification_logs

### 5. Strategy migrasi database

Tahap 1:

- pakai satu PostgreSQL instance
- tiap service punya schema sendiri

Tahap 2:

- pisahkan service ke database berbeda secara bertahap
- pindahkan tabel sesuai ownership

Tahap 3:

- gunakan event-driven sync jika ada data yang perlu dibagi

### 6. Kesimpulan database

Untuk proyek Anda, pendekatan paling realistis adalah:

- mulai dengan shared database + schema terpisah
- lalu pisah ke database per service saat service sudah stabil
- jangan gunakan join antar database langsung
- gunakan API dan event untuk menjaga konsistensi data
