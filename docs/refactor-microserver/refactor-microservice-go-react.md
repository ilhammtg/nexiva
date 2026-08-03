# Refactor Microservice — Go + React

Bagian ini menyesuaikan blueprint dengan stack yang Anda pakai saat ini: Go di backend dan React di frontend.

## Backend: Go + Fiber per service

Backend saat ini sudah memakai Go dan Fiber, sehingga refactor ke microservice bisa dilakukan dengan perubahan mental model yang relatif kecil.

Rekomendasi struktur backend per service:

```text
services/auth-service/
  cmd/server/main.go
  internal/
  pkg/
  migrations/
  Dockerfile
  go.mod
```

Gunakan shared package untuk concern umum seperti:

- logging
- response helper
- error wrapper
- config loader
- JWT helper

## Frontend: React + Vite tetap satu portal utama

Frontend bisa tetap menjadi satu aplikasi utama selama transisi.

Rekomendasi:

- frontend tetap satu aplikasi
- semua request diarahkan ke API Gateway
- gunakan TanStack Query untuk state server dan cache
- jangan letakkan logika bisnis domain terlalu dekat ke UI

Struktur frontend yang disarankan:

```text
frontend/src/
  app/
  features/
    auth/
    registration/
    provisioning/
    notification/
  shared/
  services/
  hooks/
```

## Integrasi dengan gateway

Frontend tidak lagi berkomunikasi langsung ke tiap service. Semua request lewat gateway.

Alur yang disarankan:

- frontend -> gateway -> auth-service / registration-service / provisioning-service
- gateway bertugas routing, auth, rate limit, dan agregasi sederhana

## Checklist saat menambah service baru

- tentukan domain dan batas tanggung jawab
- tentukan data ownership
- tentukan API contract dan event contract
- buat template service standar
- tambahkan health check, logging, tracing, test
- daftarkan service di gateway dan observability
- pastikan service bisa di-deploy sendiri
