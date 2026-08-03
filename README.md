# ISP Platform — Sub-service Registrasi Pelanggan

Sistem registrasi pelanggan ISP fiber optik dengan provisioning otomatis ke Mikrotik (PPPoE) dan OLT ZTE (ONT).

## Dokumentasi

Semua dokumentasi ada di folder `/docs/`. **Baca sebelum coding.**

| Dokumen | Deskripsi |
|---|---|
| `AI-AGENT-GUIDE.md` | **MULAI DI SINI** — rules, batasan, format response |
| `TECH-STACK.md` | Semua teknologi, versi, dan alasan pemilihan |
| `BACKEND-STRUCTURE.md` | Struktur folder Go + pola kode wajib |
| `FRONTEND-STRUCTURE.md` | Struktur folder React + pola kode wajib |
| `PRD-registrasi-pelanggan.md` | Product requirements, alur bisnis |
| `DATABASE-SCHEMA.md` | Schema PostgreSQL lengkap |
| `CODING-CONVENTIONS.md` | Naming, logging, testing, git convention |
| `API-CONTRACT.md` | *(Akan dibuat)* OpenAPI spec semua endpoint |

## Stack

- **Backend**: Go 1.22 + Fiber v2
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Messaging**: NATS
- **OLT**: ZTE C300/C320 via SSH
- **Router**: Mikrotik RouterOS via REST API

## Quick Start

```bash
# Clone dan setup
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Isi semua variable di .env

# Jalankan infrastruktur
docker-compose up -d postgres redis nats

# Backend
cd backend && go run cmd/server/main.go

# Frontend
cd frontend && npm install && npm run dev
```
