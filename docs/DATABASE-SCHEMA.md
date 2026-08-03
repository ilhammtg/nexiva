# Database Schema — Sub-service Registrasi Pelanggan ISP
**Database:** PostgreSQL  
**Versi:** 1.0  
**Konteks:** Dibaca AI agent sebelum generate kode apapun yang menyentuh database.

---

## Konvensi

- Semua primary key: `UUID` (gen_random_uuid())
- Semua tabel punya: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Soft delete pakai `deleted_at TIMESTAMPTZ NULL`
- Enum disimpan sebagai `TEXT` dengan constraint CHECK
- Nama kolom: `snake_case`
- Nama tabel: plural `snake_case`

---

## ERD Ringkas

```
users
  └─< registrations (customer_id → users.id)
        └─< registration_logs (registration_id)
        └─< provisioning_logs (registration_id)
        └── packages (package_id → packages.id)
        └── assigned_cs (cs_user_id → users.id)
        └── assigned_technician (technician_id → users.id)

packages
olt_port_configs
mikrotik_configs
notification_logs
```

---

## Tabel: `users`

Semua role dalam satu tabel, dibedakan kolom `role`.

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,                          -- NULL untuk customer (login via OTP/link)
  role            TEXT NOT NULL CHECK (role IN ('customer','cs_admin','technician','owner')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
```

---

## Tabel: `packages`

Paket internet yang bisa dipilih pelanggan.

```sql
CREATE TABLE packages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,                  -- "Paket 10 Mbps"
  description           TEXT,
  price_monthly         BIGINT NOT NULL,                -- dalam rupiah
  price_installation    BIGINT NOT NULL DEFAULT 0,      -- biaya pasang
  speed_down_mbps       INT NOT NULL,
  speed_up_mbps         INT NOT NULL,
  mikrotik_profile      TEXT NOT NULL,                  -- nama profile di Mikrotik
  olt_line_profile_id   INT NOT NULL,                   -- ZTE line profile ID
  olt_srv_profile_id    INT NOT NULL,                   -- ZTE service profile ID
  vlan_id               INT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `registrations`

Inti dari sub-service ini. Satu baris = satu pendaftaran pelanggan.

```sql
CREATE TYPE registration_status AS ENUM (
  'pending_review',
  'survey_scheduled',
  'survey_done',
  'survey_failed',
  'rejected',
  'waiting_payment',
  'payment_confirmed',
  'installation_scheduled',
  'provisioning',
  'provisioning_failed',
  'active'
);

CREATE TABLE registrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number            TEXT NOT NULL UNIQUE,            -- format: REG-YYYYMMDD-XXXX
  
  -- Data pelanggan
  customer_id           UUID REFERENCES users(id),      -- NULL jika belum punya akun
  full_name             TEXT NOT NULL,
  nik                   TEXT,                            -- nomor KTP
  phone                 TEXT NOT NULL,
  email                 TEXT,
  
  -- Alamat
  province              TEXT NOT NULL,
  city                  TEXT NOT NULL,
  district              TEXT NOT NULL,                   -- kecamatan
  village               TEXT NOT NULL,                   -- kelurahan
  rt                    TEXT,
  rw                    TEXT,
  address_detail        TEXT NOT NULL,                   -- nomor rumah, gang, dll
  maps_lat              NUMERIC(10,7),                   -- koordinat GPS opsional
  maps_lng              NUMERIC(10,7),
  
  -- Paket
  package_id            UUID NOT NULL REFERENCES packages(id),
  
  -- Status
  status                registration_status NOT NULL DEFAULT 'pending_review',
  
  -- Assignment
  cs_user_id            UUID REFERENCES users(id),       -- CS yang handle
  technician_id         UUID REFERENCES users(id),       -- teknisi yang di-assign
  
  -- Jadwal
  survey_scheduled_at   TIMESTAMPTZ,
  survey_done_at        TIMESTAMPTZ,
  installation_scheduled_at TIMESTAMPTZ,
  activated_at          TIMESTAMPTZ,
  
  -- Pembayaran (manual)
  installation_fee      BIGINT,                          -- total yang harus dibayar
  payment_amount        BIGINT,                          -- jumlah yang diterima
  payment_date          DATE,
  payment_bank          TEXT,
  payment_confirmed_by  UUID REFERENCES users(id),
  payment_confirmed_at  TIMESTAMPTZ,
  
  -- Hasil survei
  survey_notes          TEXT,
  survey_is_feasible    BOOLEAN,
  survey_cable_length_m INT,
  
  -- Provisioning
  pppoe_username        TEXT UNIQUE,                     -- diisi saat provisioning
  pppoe_password        TEXT,                            -- diisi saat provisioning (disimpan terenkripsi)
  ont_serial_number     TEXT,                            -- diisi teknisi saat instalasi
  ont_index             INT,                             -- index ONT di port OLT
  olt_port_config_id    UUID REFERENCES olt_port_configs(id),
  
  -- Dokumen
  ktp_file_path         TEXT,                            -- path di object storage
  
  -- Catatan
  rejection_reason      TEXT,
  internal_notes        TEXT,                            -- catatan internal CS
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_phone ON registrations(phone);
CREATE INDEX idx_registrations_cs ON registrations(cs_user_id);
CREATE INDEX idx_registrations_technician ON registrations(technician_id);
CREATE INDEX idx_registrations_reg_number ON registrations(reg_number);
CREATE INDEX idx_registrations_created ON registrations(created_at DESC);
```

---

## Tabel: `registration_logs`

Audit trail setiap perubahan status.

```sql
CREATE TABLE registration_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  status_from       TEXT,
  status_to         TEXT NOT NULL,
  changed_by        UUID REFERENCES users(id),           -- NULL = sistem otomatis
  changed_by_role   TEXT,
  reason            TEXT,
  metadata          JSONB,                               -- data tambahan opsional
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reg_logs_registration ON registration_logs(registration_id);
CREATE INDEX idx_reg_logs_created ON registration_logs(created_at DESC);
```

---

## Tabel: `provisioning_logs`

Log detail setiap langkah provisioning ke Mikrotik dan OLT.

```sql
CREATE TABLE provisioning_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  target            TEXT NOT NULL CHECK (target IN ('mikrotik', 'olt_zte')),
  action            TEXT NOT NULL,                       -- "create_pppoe_secret", "register_ont", dll
  status            TEXT NOT NULL CHECK (status IN ('started','success','failed')),
  request_payload   JSONB,                               -- command/request yang dikirim
  response_payload  JSONB,                               -- response yang diterima
  error_message     TEXT,
  duration_ms       INT,
  attempt_number    INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prov_logs_registration ON provisioning_logs(registration_id);
CREATE INDEX idx_prov_logs_created ON provisioning_logs(created_at DESC);
```

---

## Tabel: `olt_port_configs`

Konfigurasi slot/port OLT ZTE per area coverage. Diisi admin, dibaca sistem saat provisioning.

```sql
CREATE TABLE olt_port_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                         -- "Area Barat - Slot 0 Port 1"
  area_name       TEXT NOT NULL,
  olt_host        TEXT NOT NULL,                         -- IP management OLT
  olt_port_ssh    INT NOT NULL DEFAULT 22,
  gpon_slot       INT NOT NULL,
  gpon_port       INT NOT NULL,
  max_ont         INT NOT NULL DEFAULT 64,
  current_ont_count INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `mikrotik_configs`

Konfigurasi koneksi Mikrotik. v1 hanya 1 router, tapi tabel sudah siap multi-router.

```sql
CREATE TABLE mikrotik_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                         -- "Router Utama"
  host            TEXT NOT NULL,                         -- IP Mikrotik
  port            INT NOT NULL DEFAULT 443,
  username        TEXT NOT NULL,
  password_enc    TEXT NOT NULL,                         -- terenkripsi AES
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  is_online       BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `notification_logs`

Log semua notifikasi yang dikirim.

```sql
CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID REFERENCES registrations(id),
  recipient_phone   TEXT NOT NULL,
  channel           TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  template_name     TEXT NOT NULL,
  message_content   TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('sent','failed','pending')),
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_logs_registration ON notification_logs(registration_id);
```

---

## Tabel: `app_configs`

Key-value store untuk konfigurasi sistem yang bisa diubah owner tanpa redeploy.

```sql
CREATE TABLE app_configs (
  key           TEXT PRIMARY KEY,
  value         TEXT NOT NULL,
  description   TEXT,
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data awal
INSERT INTO app_configs (key, value, description) VALUES
  ('reg_number_prefix', 'REG', 'Prefix nomor registrasi'),
  ('pppoe_username_prefix', 'ISP', 'Prefix username PPPoE'),
  ('provisioning_timeout_sec', '30', 'Timeout per operasi provisioning (detik)'),
  ('provisioning_max_retry', '3', 'Maksimum retry jika provisioning gagal'),
  ('notif_webhook_url', '', 'URL webhook WhatsApp/SMS gateway'),
  ('notif_enabled', 'true', 'Aktifkan notifikasi');
```

---

## Migration Order

Jalankan migration dalam urutan ini:

```
001_create_users.sql
002_create_packages.sql
003_create_olt_port_configs.sql
004_create_mikrotik_configs.sql
005_create_registrations.sql
006_create_registration_logs.sql
007_create_provisioning_logs.sql
008_create_notification_logs.sql
009_create_app_configs.sql
010_seed_default_configs.sql
```

---

## Catatan untuk AI Agent

- Jangan pernah query `pppoe_password` langsung ke frontend — field ini hanya dibaca sistem untuk provisioning dan notifikasi
- Setiap perubahan `status` di tabel `registrations` HARUS diikuti INSERT ke `registration_logs`
- `ont_index` per port OLT harus di-query dulu (MAX + 1) sebelum provisioning, dengan row-level lock
- Gunakan transaction untuk operasi yang mengubah `registrations` + `registration_logs` sekaligus
- `pppoe_password` disimpan terenkripsi menggunakan AES-256 dengan key dari environment variable
