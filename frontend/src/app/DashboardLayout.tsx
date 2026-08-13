import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  // Owner
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan operasional jaringan dan layanan' },
  '/dashboard/registrations': { title: 'Registrasi Pelanggan', subtitle: 'Kelola semua pendaftaran masuk' },
  '/dashboard/customers': { title: 'Database Pelanggan', subtitle: 'Daftar pelanggan aktif yang telah terpasang' },
  '/dashboard/invoices': { title: 'Tagihan Bulanan', subtitle: 'Manajemen invoice bulanan pelanggan' },
  '/dashboard/packages': { title: 'Paket Internet', subtitle: 'Kelola paket layanan internet' },
  '/dashboard/olt-ports': { title: 'OLT Port Config', subtitle: 'Konfigurasi port OLT per area' },
  '/dashboard/mikrotik': { title: 'Mikrotik Config', subtitle: 'Manajemen perangkat Mikrotik' },
  '/dashboard/users': { title: 'Manajemen User', subtitle: 'Kelola akun staff dan pelanggan' },
  '/dashboard/activity': { title: 'Activity Log', subtitle: 'Riwayat perubahan status registrasi' },
  '/dashboard/settings': { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi platform ISP' },
  // CS Admin
  '/cs/dashboard': { title: 'Dashboard CS Admin', subtitle: 'Kelola pendaftaran pelanggan baru' },
  '/cs/registrations': { title: 'Registrasi Pelanggan', subtitle: 'Semua pendaftaran masuk' },
  '/cs/invoices': { title: 'Tagihan Bulanan', subtitle: 'Manajemen invoice bulanan pelanggan' },
  '/cs/customers': { title: 'Database Pelanggan', subtitle: 'Daftar pelanggan aktif yang telah terpasang' },
  '/cs/activity': { title: 'Activity Log', subtitle: 'Riwayat perubahan status' },
  // Technician
  '/tech/dashboard': { title: 'Jadwal Teknisi', subtitle: 'Tugas survei dan instalasi hari ini' },
  // Profile (shared)
  '/dashboard/profile': { title: 'Profil Saya', subtitle: 'Kelola informasi akun dan keamanan' },
  '/cs/profile': { title: 'Profil Saya', subtitle: 'Kelola informasi akun dan keamanan' },
  '/tech/profile': { title: 'Profil Saya', subtitle: 'Kelola informasi akun dan keamanan' },
}

export default function DashboardLayout() {
  const { isAuthenticated } = useAuthStore()
  const { pathname } = useLocation()
  const { title, subtitle } = PAGE_TITLES[pathname] ?? { title: 'ISP Platform', subtitle: '' }
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-200 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={title} 
          subtitle={subtitle} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

