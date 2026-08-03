# Frontend Structure — React + Vite + TypeScript

---

## Struktur Folder Lengkap

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                  ← Root komponen, setup provider
│   │   ├── router.tsx               ← Definisi semua route
│   │   └── providers.tsx            ← QueryClient, Toaster, dll
│   │
│   ├── assets/                      ← Gambar, font, ikon statis
│   │
│   ├── components/                  ← Komponen REUSABLE lintas fitur
│   │   ├── ui/                      ← HANYA komponen dari shadcn/ui (jangan edit)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   ├── shared/                  ← Komponen custom reusable
│   │   │   ├── StatusBadge.tsx      ← Badge status registrasi
│   │   │   ├── DataTable.tsx        ← Wrapper TanStack Table
│   │   │   ├── PageHeader.tsx       ← Header halaman dengan breadcrumb
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── layout/
│   │       ├── AppLayout.tsx        ← Layout utama: sidebar + header + content
│   │       ├── Sidebar.tsx          ← Navigasi sidebar, role-aware
│   │       ├── Header.tsx           ← Top bar, user info, notifikasi
│   │       └── PublicLayout.tsx     ← Layout untuk halaman publik
│   │
│   ├── features/                    ← Satu folder per domain fitur
│   │   │
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── authApi.ts       ← login(), logout(), refreshToken()
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts       ← useLogin(), useLogout()
│   │   │   ├── store/
│   │   │   │   └── authStore.ts     ← Zustand store: user, isAuthenticated
│   │   │   └── types/
│   │   │       └── auth.types.ts    ← User, LoginRequest, AuthResponse
│   │   │
│   │   ├── registration/
│   │   │   ├── api/
│   │   │   │   └── registrationApi.ts  ← submitRegistration(), checkStatus(), dll
│   │   │   ├── components/
│   │   │   │   ├── RegistrationForm.tsx    ← Form publik pendaftaran
│   │   │   │   ├── StatusChecker.tsx       ← Cek status via nomor HP
│   │   │   │   ├── RegistrationTable.tsx   ← Tabel list (admin)
│   │   │   │   ├── RegistrationDetail.tsx  ← Detail + history (admin)
│   │   │   │   ├── ApproveModal.tsx
│   │   │   │   ├── RejectModal.tsx
│   │   │   │   ├── ScheduleSurveyModal.tsx
│   │   │   │   ├── ConfirmPaymentModal.tsx
│   │   │   │   └── SurveyResultForm.tsx    ← Untuk teknisi
│   │   │   ├── hooks/
│   │   │   │   ├── useRegistrations.ts     ← TanStack Query hooks
│   │   │   │   └── useRegistrationActions.ts
│   │   │   ├── store/
│   │   │   │   └── registrationStore.ts    ← Filter aktif, selected rows
│   │   │   └── types/
│   │   │       └── registration.types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── api/
│   │   │   │   └── dashboardApi.ts
│   │   │   ├── components/
│   │   │   │   ├── SummaryCards.tsx        ← Total pelanggan, pending, dll
│   │   │   │   ├── RecentRegistrations.tsx ← 5 pendaftar terbaru
│   │   │   │   └── ProvisioningStatus.tsx  ← Status provisioning realtime
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts
│   │   │   └── types/
│   │   │       └── dashboard.types.ts
│   │   │
│   │   ├── technician/
│   │   │   ├── api/
│   │   │   │   └── technicianApi.ts
│   │   │   ├── components/
│   │   │   │   ├── ScheduleList.tsx         ← Jadwal hari ini teknisi
│   │   │   │   ├── ActivationPanel.tsx      ← Input ONT serial + tombol aktivasi
│   │   │   │   └── ProvisioningProgress.tsx ← Progress realtime via WebSocket
│   │   │   ├── hooks/
│   │   │   │   ├── useSchedule.ts
│   │   │   │   └── useProvisioning.ts       ← WebSocket listener
│   │   │   └── types/
│   │   │       └── technician.types.ts
│   │   │
│   │   └── owner/
│   │       ├── api/
│   │       │   └── ownerApi.ts
│   │       ├── components/
│   │       │   ├── OwnerDashboard.tsx
│   │       │   └── ActivityLog.tsx
│   │       └── types/
│   │           └── owner.types.ts
│   │
│   ├── hooks/                       ← Hook REUSABLE lintas fitur
│   │   ├── useWebSocket.ts          ← WebSocket connection management
│   │   ├── useDebounce.ts           ← Debounce input pencarian
│   │   └── useLocalStorage.ts       ← Wrapper localStorage dengan type safety
│   │
│   ├── lib/
│   │   ├── axios.ts                 ← Instance axios + interceptor JWT
│   │   ├── queryClient.ts           ← TanStack Query client config
│   │   └── utils.ts                 ← cn() helper untuk class names
│   │
│   ├── stores/                      ← Zustand stores GLOBAL (bukan per fitur)
│   │   └── uiStore.ts               ← Sidebar open/close, theme
│   │
│   ├── types/                       ← Tipe GLOBAL yang dipakai lintas fitur
│   │   ├── api.types.ts             ← ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   └── common.types.ts          ← PaginationMeta, SelectOption, dll
│   │
│   └── utils/
│       ├── formatDate.ts            ← Format tanggal Indonesia
│       ├── formatCurrency.ts        ← Format rupiah
│       └── statusLabel.ts           ← Map status enum ke label Indonesia
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## Pola Kode Wajib

### 1. Tipe API — Selalu definisikan di `types/`

```typescript
// src/types/api.types.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
}
```

### 2. API Layer — Semua fetch lewat fungsi di `api/`

```typescript
// src/features/registration/api/registrationApi.ts
import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'
import type { Registration, CreateRegistrationDto } from '../types/registration.types'

export const registrationApi = {
  submit: (data: CreateRegistrationDto) =>
    api.post<ApiResponse<{ reg_number: string }>>('/registrations', data),

  checkStatus: (phone: string) =>
    api.get<ApiResponse<Registration>>(`/registrations/status?phone=${phone}`),

  list: (params: { page?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<Registration>>('/admin/registrations', { params }),

  approve: (id: string) =>
    api.patch<ApiResponse<null>>(`/admin/registrations/${id}/approve`),
}
```

### 3. TanStack Query — Semua server state lewat hooks

```typescript
// src/features/registration/hooks/useRegistrations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationApi } from '../api/registrationApi'

// Query keys — konsisten, tidak pernah hard-code string
export const registrationKeys = {
  all: ['registrations'] as const,
  lists: () => [...registrationKeys.all, 'list'] as const,
  list: (params: object) => [...registrationKeys.lists(), params] as const,
  detail: (id: string) => [...registrationKeys.all, id] as const,
}

export function useRegistrations(params: { page?: number; status?: string }) {
  return useQuery({
    queryKey: registrationKeys.list(params),
    queryFn: () => registrationApi.list(params).then(r => r.data),
    staleTime: 30_000,  // 30 detik sebelum dianggap stale
  })
}

export function useApproveRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => registrationApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrationKeys.lists() })
    },
  })
}
```

### 4. Zustand — Hanya untuk UI state

```typescript
// src/features/registration/store/registrationStore.ts
import { create } from 'zustand'

interface RegistrationStore {
  statusFilter: string
  searchQuery: string
  setStatusFilter: (status: string) => void
  setSearchQuery: (q: string) => void
}

export const useRegistrationStore = create<RegistrationStore>(set => ({
  statusFilter: 'all',
  searchQuery: '',
  setStatusFilter: status => set({ statusFilter: status }),
  setSearchQuery: q => set({ searchQuery: q }),
}))
```

### 5. Form — React Hook Form + Zod

```typescript
// src/features/registration/components/RegistrationForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  full_name: z.string().min(3, 'Nama minimal 3 karakter'),
  phone: z.string().regex(/^08\d{8,11}$/, 'Format nomor HP tidak valid'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  package_id: z.string().uuid('Pilih paket'),
  address_detail: z.string().min(10, 'Alamat terlalu singkat'),
})

type FormData = z.infer<typeof schema>

export function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  // ...
}
```

### 6. WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react'

type WSMessage = {
  event: string
  registration_id: string
  data: unknown
  timestamp: string
}

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const ws = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    ws.current = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws`)
    ws.current.onmessage = (e) => onMessage(JSON.parse(e.data))
    ws.current.onclose = () => setTimeout(connect, 3000)  // auto-reconnect
  }, [onMessage])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])
}
```

### 7. Axios Interceptor — JWT otomatis

```typescript
// src/lib/axios.ts
import axios from 'axios'
import { useAuthStore } from '@/features/auth/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,  // untuk httpOnly cookie
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      // Token expired → coba refresh
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        return api.request(err.config)  // retry original request
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
```

---

## Route Structure

```typescript
// src/app/router.tsx
// Publik (tanpa auth)
/                          → Landing / form registrasi
/cek-status                → Cek status pendaftaran
/login                     → Halaman login

// Protected (semua role setelah login)
/dashboard                 → Dashboard sesuai role

// CS Admin
/admin/registrasi          → List semua pendaftaran
/admin/registrasi/:id      → Detail + aksi

// Teknisi
/teknisi/jadwal            → Jadwal hari ini
/teknisi/aktivasi/:id      → Panel aktivasi ONT

// Owner
/owner/dashboard           → Summary metrics
/owner/registrasi          → List + export
```

---

## Konvensi File

- Satu komponen per file, nama file = nama komponen: `RegistrationForm.tsx`
- Barrel export di setiap folder `index.ts` — TIDAK WAJIB, hindari jika menyebabkan circular import
- Semua path import pakai alias `@/` — jangan pakai `../../..`
- CSS hanya Tailwind — tidak ada file `.css` kecuali `index.css` untuk base styles
