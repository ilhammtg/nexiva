import { useState, useRef, useEffect } from 'react'
import {
  Bell, Search, Sun, Moon, ChevronDown, Menu,
  CheckCheck, Trash2, RefreshCw, UserPlus, AlertCircle, LogOut, User
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { authApi } from '@/features/auth/api/authApi'
import { useThemeStore } from '@/stores/useThemeStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import type { Notification } from '@/stores/useNotificationStore'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle?: string
  onToggleSidebar?: () => void
}

function timeAgo(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} mnt lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  return `${Math.floor(diffHour / 24)} hari lalu`
}

function NotifTypeIcon({ type }: { type: Notification['type'] }) {
  if (type === 'created')
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
        <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      </div>
    )
  if (type === 'updated')
    return (
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
        <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </div>
    )
  return (
    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
      <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
    </div>
  )
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markAllRead, markRead, clear, unreadCount } = useNotificationStore()

  return (
    <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-32px)] sm:w-[360px] bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Notifikasi
          </p>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/30">
              {unreadCount} baru
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Tandai semua sudah dibaca"
              >
                <CheckCheck className="w-3 h-3" />
                Baca semua
              </button>
              <button
                onClick={() => { clear(); onClose() }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-400 dark:text-zinc-550 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Hapus semua"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-zinc-400">
              Belum ada notifikasi
            </p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 leading-relaxed">
              Update real-time akan muncul di sini<br />
              saat ada perubahan data registrasi
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors',
                  !n.read && 'bg-blue-50/40 dark:bg-blue-900/5'
                )}
              >
                <NotifTypeIcon type={n.type} />

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-[12.5px] font-semibold leading-tight truncate',
                      n.read
                        ? 'text-gray-500 dark:text-zinc-400'
                        : 'text-gray-800 dark:text-zinc-100'
                    )}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                        {timeAgo(n.timestamp)}
                      </span>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                    {n.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-150 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/20 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-[10.5px] text-gray-400 dark:text-zinc-500">
          Terhubung secara real-time
        </p>
      </div>
    </div>
  )
}

export default function Header({ onToggleSidebar }: Props) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false)
      }
    }
    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showProfileDropdown])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // Ignore network errors on logout to allow offline/session clearing
    }
    logout()
    navigate('/login')
  }

  const profilePath = pathname.startsWith('/cs')
    ? '/cs/profile'
    : pathname.startsWith('/tech')
      ? '/tech/profile'
      : '/dashboard/profile'

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-850"
            title="Menu Utama"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Cari pelanggan / perangkat / OLT..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 text-gray-700 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 transition-all"
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200 transition-all border border-gray-200 dark:border-zinc-850"
          title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
        >
          {theme === 'light'
            ? <Moon className="w-5 h-5 transition-transform hover:rotate-12" />
            : <Sun className="w-5 h-5 transition-transform hover:rotate-45" />}
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotifications((v) => !v)}
            className={cn(
              'relative p-2 rounded-lg transition-all border',
              showNotifications
                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                : 'bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200 border-gray-200 dark:border-zinc-850'
            )}
            title="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfileDropdown((v) => !v)}
            className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800 hover:opacity-80 transition-opacity group"
            title="Menu profil"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200 leading-tight">
                {user?.full_name ?? 'Admin Pusat'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 capitalize leading-none mt-0.5">
                {user?.role === 'owner' ? 'Super Admin'
                  : user?.role === 'cs_admin' ? 'CS Admin'
                  : user?.role === 'technician' ? 'Teknisi'
                  : 'Super Admin'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 top-full mt-2.5 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-800 z-50 overflow-hidden py-1">
              <button
                onClick={() => {
                  setShowProfileDropdown(false)
                  navigate(profilePath)
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60 flex items-center gap-2 transition-colors"
              >
                <User className="w-4 h-4 text-gray-450 dark:text-zinc-500" />
                Profil Saya
              </button>
              
              <div className="border-t border-gray-100 dark:border-zinc-800/80 my-1" />
              
              <button
                onClick={() => {
                  setShowProfileDropdown(false)
                  handleLogout()
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
