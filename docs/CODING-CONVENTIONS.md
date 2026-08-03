# Coding Conventions — ISP Platform

> Dokumen ini wajib dibaca sebelum menulis kode. AI agent yang melanggar konvensi ini
> akan menghasilkan kode yang tidak bisa diintegrasikan dengan bagian lain.

---

## 1. Naming Conventions

### Go (Backend)

| Konteks | Aturan | Contoh |
|---|---|---|
| Package | lowercase, singkat, tanpa underscore | `handler`, `service`, `repository` |
| Struct | PascalCase | `Registration`, `ProvisioningJob` |
| Interface | PascalCase, tambah suffix `...er` atau nama domain | `RegistrationRepository`, `ProvisioningService` |
| Fungsi/Method publik | PascalCase | `GetByID`, `UpdateStatus`, `CreatePPPoESecret` |
| Fungsi/Method privat | camelCase | `buildPayload`, `validateTransition` |
| Konstanta | PascalCase atau UPPER_SNAKE jika truly global | `StatusActive`, `MaxRetryCount` |
| Variable | camelCase, deskriptif | `registrationID`, `oltClient` |
| Error variable | dimulai `Err` | `ErrNotFound`, `ErrInvalidTransition` |
| File | snake_case | `registration.go`, `postgres_repo.go` |
| Test file | tambah `_test` | `registration_test.go` |

### TypeScript (Frontend)

| Konteks | Aturan | Contoh |
|---|---|---|
| Komponen React | PascalCase | `RegistrationForm`, `StatusBadge` |
| Hook | camelCase dengan prefix `use` | `useRegistrations`, `useWebSocket` |
| Fungsi util | camelCase | `formatCurrency`, `mapStatusLabel` |
| Tipe/Interface | PascalCase, suffix `...Type` atau deskriptif | `Registration`, `ApiResponse<T>` |
| Konstanta | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `WS_RECONNECT_DELAY` |
| File komponen | PascalCase.tsx | `RegistrationForm.tsx` |
| File hook/util | camelCase.ts | `useWebSocket.ts`, `formatDate.ts` |
| File tipe | camelCase.types.ts | `registration.types.ts` |
| Enum value | UPPER_SNAKE_CASE | `PENDING_REVIEW`, `ACTIVE` |
| CSS class | hanya Tailwind, tidak ada custom class |  |

---

## 2. Status Enum — Nilai Tetap

Status registrasi di backend (Go) dan frontend (TypeScript) HARUS identik:

```go
// Go — model/registration.go
const (
    StatusPendingReview          Status = "pending_review"
    StatusSurveyScheduled        Status = "survey_scheduled"
    StatusSurveyDone             Status = "survey_done"
    StatusSurveyFailed           Status = "survey_failed"
    StatusRejected               Status = "rejected"
    StatusWaitingPayment         Status = "waiting_payment"
    StatusPaymentConfirmed       Status = "payment_confirmed"
    StatusInstallationScheduled  Status = "installation_scheduled"
    StatusProvisioning           Status = "provisioning"
    StatusProvisioningFailed     Status = "provisioning_failed"
    StatusActive                 Status = "active"
)
```

```typescript
// TypeScript — registration.types.ts
export type RegistrationStatus =
  | 'pending_review'
  | 'survey_scheduled'
  | 'survey_done'
  | 'survey_failed'
  | 'rejected'
  | 'waiting_payment'
  | 'payment_confirmed'
  | 'installation_scheduled'
  | 'provisioning'
  | 'provisioning_failed'
  | 'active'
```

---

## 3. Format Tanggal & Waktu

- Semua timestamp di DB: `TIMESTAMPTZ` (dengan timezone)
- Semua timestamp di API response: ISO 8601 format `"2026-01-15T10:30:00Z"`
- Di frontend, parse dengan `date-fns` dan tampilkan format Indonesia
- TIDAK PERNAH kirim timestamp sebagai Unix epoch integer di API

```typescript
// utils/formatDate.ts
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export function formatDate(iso: string) {
  return format(parseISO(iso), 'dd MMMM yyyy', { locale: id })
  // Output: "15 Januari 2026"
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy, HH:mm', { locale: id })
  // Output: "15 Jan 2026, 10:30"
}
```

---

## 4. Format Uang (Rupiah)

```typescript
// utils/formatCurrency.ts
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
  // Output: "Rp 150.000"
}
```

Di backend, semua nilai uang disimpan sebagai `BIGINT` dalam satuan **rupiah** (bukan sen).

---

## 5. Format Nomor Registrasi

Format: `REG-YYYYMMDD-XXXX` di mana XXXX adalah 4 digit angka sequential per hari.

Contoh: `REG-20260115-0001`, `REG-20260115-0042`

Dibuat oleh backend, TIDAK PERNAH di-generate di frontend.

---

## 6. Format Username PPPoE

Format default: `{PREFIX}-{REG_NUMBER_LAST4}-{RANDOM4}`

Contoh: `ISP-0042-K7M2`

Bisa di-override CS admin. Dibuat backend saat status berubah ke `installation_scheduled`.

---

## 7. Pagination

Semua endpoint list wajib support pagination dengan query params berikut:

```
GET /admin/registrations?page=1&per_page=20&status=pending_review&search=budi
```

Default: `page=1`, `per_page=20`. Maximum `per_page`: 100.

Response selalu dalam format `PaginatedResponse<T>` — lihat `AI-AGENT-GUIDE.md`.

---

## 8. Logging (Backend)

WAJIB pakai `pkg/logger` (zap). TIDAK BOLEH pakai `fmt.Println` atau `log.Println`.

```go
// ✅ BENAR
logger.Info("provisioning started",
    zap.String("registration_id", reg.ID),
    zap.String("pppoe_username", reg.PPPoEUsername),
)

logger.Error("mikrotik connection failed",
    zap.String("registration_id", reg.ID),
    zap.Error(err),
)

// ❌ SALAH
fmt.Println("provisioning started:", reg.ID)
log.Printf("error: %v", err)
```

Level logging:
- `Debug` — detail teknis untuk troubleshooting
- `Info` — event penting (provisioning started, status changed, dll)
- `Warn` — kondisi tidak normal tapi masih bisa lanjut
- `Error` — error yang perlu perhatian

---

## 9. Testing

- Setiap `service/` WAJIB punya file test minimal untuk happy path dan error case
- Gunakan mock untuk repository (generate dengan `mockery`)
- Test tidak boleh menyentuh DB nyata — gunakan interface mock
- Nama test: `TestNamaFungsi_Kondisi` → `TestApprove_WhenStatusIsPendingReview_ShouldSucceed`

```go
// Contoh test service
func TestRegistrationService_Approve_Success(t *testing.T) {
    mockRepo := mocks.NewRegistrationRepository(t)
    svc := NewRegistrationService(mockRepo, ...)

    mockRepo.On("GetByID", mock.Anything, "reg-id-123").
        Return(&Registration{Status: StatusPendingReview}, nil)
    mockRepo.On("UpdateStatus", mock.Anything, ...).Return(nil)

    err := svc.Approve(context.Background(), "reg-id-123", "user-id")
    assert.NoError(t, err)
}
```

---

## 10. Git Commit Convention

Format: `type(scope): deskripsi singkat`

| Type | Kapan dipakai |
|---|---|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactor tanpa perubahan fungsi |
| `docs` | Update dokumentasi |
| `test` | Tambah/update test |
| `chore` | Konfigurasi, dependency update |
| `migration` | Perubahan database migration |

Contoh:
```
feat(registration): add approve endpoint with status validation
fix(provisioning): handle OLT SSH timeout correctly
migration: add ont_index column to registrations table
docs: update API contract for approve endpoint
```

---

## 11. File yang TIDAK Boleh Diubah Tanpa Diskusi

File-file berikut adalah fondasi sistem. Perubahan di sini berdampak ke seluruh codebase:

- `docs/DATABASE-SCHEMA.md` — perubahan tabel harus diikuti migration baru
- `docs/API-CONTRACT.md` — perubahan endpoint bisa break frontend
- `docs/AI-AGENT-GUIDE.md` — rules global
- `internal/response/response.go` — format response sudah disepakati
- `services/registration/model/registration.go` — status enum dan valid transitions
