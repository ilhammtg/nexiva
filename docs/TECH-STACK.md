# Tech Stack — ISP Platform

---

## Backend

| Teknologi | Versi | Package/Library | Fungsi |
|---|---|---|---|
| **Go** | 1.22+ | — | Bahasa utama backend |
| **Fiber** | v2.52+ | `github.com/gofiber/fiber/v2` | HTTP framework |
| **PostgreSQL** | 15+ | — | Database utama |
| **Redis** | 7+ | — | Cache, session, job queue |
| **NATS** | 2.10+ | `github.com/nats-io/nats.go` | Message broker antar service |
| **sqlx** | v1.3+ | `github.com/jmoiern/sqlx` | Query builder + DB helper |
| **golang-migrate** | v4 | `github.com/golang-migrate/migrate/v4` | Database migration |
| **JWT** | v5 | `github.com/golang-jwt/jwt/v5` | Auth token |
| **golang-ssh** | v0.17+ | `golang.org/x/crypto/ssh` | Koneksi SSH ke OLT ZTE |
| **go-redis** | v9 | `github.com/redis/go-redis/v9` | Redis client |
| **godotenv** | v1.5 | `github.com/joho/godotenv` | Load .env file |
| **validator** | v10 | `github.com/go-playground/validator/v10` | Validasi struct |
| **zap** | v1.27 | `go.uber.org/zap` | Structured logging |
| **websocket** | — | `github.com/gofiber/contrib/websocket` | WebSocket handler |
| **uuid** | v4 | `github.com/google/uuid` | Generate UUID |
| **bcrypt** | — | `golang.org/x/crypto/bcrypt` | Hash password user |
| **AES** | — | `crypto/aes` (stdlib) | Enkripsi pppoe_password di DB |
| **testify** | v1.9 | `github.com/stretchr/testify` | Testing assertion |
| **mockery** | v2 | `github.com/vektra/mockery/v2` | Generate mock untuk testing |

### Alasan memilih Go + Fiber

- Goroutine memungkinkan provisioning Mikrotik + OLT berjalan **paralel** tanpa kompleksitas
- Memory footprint sangat rendah dibanding Laravel/Node.js
- Fiber adalah framework tercepat di ekosistem Go, API mirip Express (mudah dipahami)
- Single binary deployment — tidak butuh runtime environment
- Built-in race condition protection via channel dan mutex

---

## Frontend

| Teknologi | Versi | Fungsi |
|---|---|---|
| **React** | 18+ | UI framework |
| **Vite** | 5+ | Build tool, dev server |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 3+ | Utility-first styling |
| **shadcn/ui** | latest | Komponen UI (berbasis Radix UI) |
| **TanStack Query** | v5 | Server state management, caching, refetch |
| **TanStack Table** | v8 | Tabel data besar dengan virtual scroll |
| **Zustand** | v4 | Client state global (ringan, tanpa boilerplate) |
| **React Hook Form** | v7 | Form handling tanpa re-render berlebih |
| **Zod** | v3 | Schema validasi form + TypeScript inference |
| **Axios** | v1 | HTTP client dengan interceptor JWT |
| **React Router** | v6 | Client-side routing |
| **Recharts** | v2 | Chart & grafik (ringan, SVG-based) |
| **Lucide React** | latest | Icon library |
| **date-fns** | v3 | Manipulasi tanggal |
| **clsx + tailwind-merge** | latest | Conditional class names |

### Alasan memilih stack ini

- **Vite** → build 10–20x lebih cepat dari CRA, HMR instan
- **Tailwind** → zero unused CSS di production (PurgeCSS otomatis), tidak perlu file .css terpisah
- **shadcn/ui** → komponen bisa dikopi ke project (bukan dependency), bisa dikustomisasi penuh, tidak menambah bundle size untuk komponen yang tidak dipakai
- **TanStack Query** → cache otomatis, deduplication request, background refetch — tidak perlu Redux untuk server state
- **Zustand** → hanya untuk UI state (sidebar open/close, filter aktif) — jauh lebih ringan dari Redux
- **React Hook Form** → validasi tanpa re-render per keystroke, performa sangat baik untuk form panjang

---

## Infrastructure

| Teknologi | Fungsi |
|---|---|
| **Docker + Docker Compose** | Development environment, deployment |
| **Nginx** | Reverse proxy, serve frontend static files |
| **PostgreSQL 15** | Database utama |
| **Redis 7** | Cache + job queue |
| **NATS** | Event streaming antar microservice |

---

## Perangkat Jaringan yang Diintegrasikan

| Perangkat | Protokol | Library Go |
|---|---|---|
| **Mikrotik RouterOS** | REST API (HTTPS port 443) | `net/http` stdlib |
| **OLT ZTE C300/C320** | SSH CLI (port 22) | `golang.org/x/crypto/ssh` |

---

## Versi Go Module (go.mod)

```
module isp-platform/registration

go 1.22

require (
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/gofiber/contrib/websocket v1.3.0
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/golang-migrate/migrate/v4 v4.17.0
    github.com/go-playground/validator/v10 v10.19.0
    github.com/google/uuid v1.6.0
    github.com/jmoiern/sqlx v1.3.5
    github.com/joho/godotenv v1.5.1
    github.com/lib/pq v1.10.9
    github.com/nats-io/nats.go v1.33.1
    github.com/redis/go-redis/v9 v9.5.1
    github.com/stretchr/testify v1.9.0
    go.uber.org/zap v1.27.0
    golang.org/x/crypto v0.22.0
)
```

---

## Environment Variables Wajib

File `.env.example` — semua variabel ini HARUS ada, tidak boleh ada nilai default untuk yang sensitif:

```env
# App
APP_ENV=development
APP_PORT=8080
APP_SECRET_KEY=        # min 32 karakter, untuk enkripsi AES

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=isp_registration
DB_USER=
DB_PASSWORD=
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=            # min 32 karakter
JWT_EXPIRY_HOURS=24
JWT_REFRESH_EXPIRY_DAYS=7

# Mikrotik
MIKROTIK_HOST=
MIKROTIK_PORT=443
MIKROTIK_USER=
MIKROTIK_PASSWORD=

# OLT ZTE
OLT_SSH_HOST=
OLT_SSH_PORT=22
OLT_SSH_USER=
OLT_SSH_PASSWORD=

# NATS
NATS_URL=nats://localhost:4222

# Notification Webhook
NOTIF_WEBHOOK_URL=
NOTIF_ENABLED=true

# File Upload
UPLOAD_MAX_SIZE_MB=5
UPLOAD_PATH=./uploads
```
