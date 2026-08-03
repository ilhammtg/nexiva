import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, FileText, Network,
  Users, LogOut, Wifi, ChevronRight, ChevronDown,
  DollarSign, BarChart2, MapPin, ClipboardList, Settings, CalendarCheck, Globe
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { authApi } from '@/features/auth/api/authApi'
import { publicApi } from '@/features/public/api/publicApi'
import { cn } from '@/lib/utils'

interface SubNavItem {
  to: string;
  label: string;
  isMock?: boolean;
}

interface NavItem {
  to?: string;
  label: string;
  icon: any;
  isMock?: boolean;
  key?: string;
  subItems?: SubNavItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

  const role = user?.role ?? 'owner'
  const rolePath = role === 'owner' ? 'dashboard' : role === 'cs_admin' ? 'cs' : 'tech'

  // Fetch public configurations for dynamic brand name and logo
  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  })

  const brandName = publicConfigs?.brand_name || 'ISP Center'
  const brandLogoUrl = publicConfigs?.brand_logo_url || ''

  let permissions: any = null
  try {
    if (publicConfigs?.role_permissions) {
      permissions = JSON.parse(publicConfigs.role_permissions)
    }
  } catch (e) {}

  const activePermissions = permissions?.[role] ?? {
    dashboard: true,
    registrations: role === 'owner' || role === 'cs_admin',
    customers: role === 'owner' || role === 'cs_admin',
    packages: role === 'owner',
    olt_ports: role === 'owner',
    mikrotik: role === 'owner',
    users: role === 'owner',
    activity_log: role === 'owner' || role === 'cs_admin',
    settings: role === 'owner',
  }

  const hasPerm = (key: string) => {
    if (role === 'owner') return true
    return activePermissions[key] !== false
  }

  // Construct raw navigation items dynamically
  const menuItems: NavItem[] = []

  // 1. Dashboard
  if (hasPerm('dashboard')) {
    menuItems.push({
      to: `/${rolePath}`,
      label: role === 'technician' ? 'Jadwal Hari Ini' : 'Dashboard',
      icon: role === 'technician' ? CalendarCheck : LayoutDashboard,
      key: 'dashboard'
    })
  }

  // 2. Registrasi Pelanggan
  if (hasPerm('registrations')) {
    menuItems.push({
      to: `/${rolePath}/registrations`,
      label: 'Registrasi Pelanggan',
      icon: FileText,
      key: 'registrations'
    })
  }

  // 3. Data Pelanggan
  if (hasPerm('customers')) {
    menuItems.push({
      to: `/${rolePath}/customers`,
      label: 'Data Pelanggan',
      icon: Users,
      key: 'customers'
    })
  }

  // 4. Integrasi Jaringan (Dropdown)
  const networkSub: SubNavItem[] = []
  if (hasPerm('packages')) networkSub.push({ to: `/${rolePath}/packages`, label: 'Paket Internet' })
  if (hasPerm('olt_ports')) networkSub.push({ to: `/${rolePath}/olt-ports`, label: 'OLT Port Config' })
  networkSub.push({ to: `/${rolePath}/network-map`, label: 'Peta Jaringan & ODP' })
  if (hasPerm('mikrotik')) networkSub.push({ to: `/${rolePath}/mikrotik`, label: 'Mikrotik Config' })

  if (networkSub.length > 0) {
    menuItems.push({
      label: 'Integrasi Jaringan',
      icon: Network,
      subItems: networkSub
    })
  }

  // 5. Keamanan & Log (Dropdown)
  const securitySub: SubNavItem[] = []
  if (hasPerm('users')) securitySub.push({ to: `/${rolePath}/users`, label: 'Manajemen User' })
  if (hasPerm('activity_log')) securitySub.push({ to: `/${rolePath}/activity`, label: 'Activity Log' })

  if (securitySub.length > 0) {
    menuItems.push({
      label: 'Keamanan & Log',
      icon: Users,
      subItems: securitySub
    })
  }

  // 6. Pengaturan Layanan (Dropdown)
  if (hasPerm('settings')) {
    menuItems.push({
      label: 'Pengaturan Layanan',
      icon: Settings,
      subItems: [
        { to: `/${rolePath}/settings/registration`, label: 'Alur Registrasi' },
        { to: `/${rolePath}/settings/provisioning`, label: 'Provisioning OLT' },
        { to: `/${rolePath}/settings/notification`, label: 'Notifikasi & Verifikasi' },
        { to: `/${rolePath}/settings/invoice`, label: 'Kustomisasi Invoice' },
      ]
    })

    // 7. Branding & Website (Direct Link)
    menuItems.push({
      to: `/${rolePath}/settings/website`,
      label: 'Branding & Website',
      icon: Globe
    })
  }

  // 7. Mocked items (only for owner)
  if (role === 'owner') {
    menuItems.push({ to: '#billing', label: 'Billing & Invoice', icon: DollarSign, isMock: true })
    menuItems.push({ to: '#monitoring', label: 'Monitoring Traffic', icon: BarChart2, isMock: true })
    menuItems.push({ to: '#map', label: 'Map Pelanggan', icon: MapPin, isMock: true })
    menuItems.push({ to: '#reports', label: 'Laporan Harian', icon: ClipboardList, isMock: true })
  }

  const navItems = menuItems

  // Auto-open dropdown if a subitem is active on mount or page change
  useEffect(() => {
    const updatedDropdowns = { ...openDropdowns }
    let hasChanges = false
    
    navItems.forEach((item) => {
      if (item.subItems) {
        const isChildActive = item.subItems.some((sub) => location.pathname === sub.to)
        if (isChildActive && !openDropdowns[item.label]) {
          updatedDropdowns[item.label] = true
          hasChanges = true
        }
      }
    })

    if (hasChanges) {
      setOpenDropdowns(updatedDropdowns)
    }
  }, [location.pathname, role])

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    navigate('/login')
  }

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [label]: !prev[label]
    }))
  }

  return (
    <>
      {/* Overlay for mobile drawer */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose} 
      />

      <aside className={cn(
        "flex flex-col w-64 min-h-screen bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300",
        "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full lg:-ml-64 lg:translate-x-0"
      )}>
        {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800/80">
        {brandLogoUrl ? (
          <div className="h-14 w-14 bg-white border border-zinc-150 dark:border-zinc-800/80 rounded-lg p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            <img
              src={brandLogoUrl}
              alt={brandName}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-600 shadow-sm flex-shrink-0">
            <Wifi className="w-7 h-7 text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-zinc-900 dark:text-zinc-100 font-bold text-sm tracking-tight leading-snug break-words" title={brandName}>
            {brandName}
          </h1>
          <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-wider uppercase mt-0.5">
            Management System
          </p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const { to, label, icon: Icon, isMock, subItems } = item

          if (isMock) {
            return (
              <div
                key={to || label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 dark:text-zinc-650 cursor-not-allowed group opacity-70"
                title="Modul akan segera hadir"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] font-semibold bg-gray-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded text-gray-400 dark:text-zinc-600">
                  Soon
                </span>
              </div>
            )
          }

          // Render dropdown if has subItems
          if (subItems && subItems.length > 0) {
            const isDropdownOpen = !!openDropdowns[label]
            const hasActiveSub = subItems.some((sub) => location.pathname === sub.to)

            return (
              <div key={label} className="space-y-1">
                <button
                   type="button"
                   onClick={() => toggleDropdown(label)}
                   className={cn(
                     'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group text-left',
                     hasActiveSub
                       ? 'bg-blue-600/10 text-blue-600 dark:text-blue-450 dark:bg-blue-950/30 border border-blue-500/20'
                       : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                   )}
                >
                   <Icon className={cn(
                     'w-4 h-4 flex-shrink-0 transition-colors',
                     hasActiveSub
                       ? 'text-blue-600 dark:text-blue-450'
                       : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
                   )} />
                   <span className="flex-1">{label}</span>
                   <ChevronDown className={cn(
                     'w-3.5 h-3.5 opacity-70 transition-transform duration-200',
                     isDropdownOpen ? 'transform rotate-180 text-blue-600 dark:text-blue-400' : 'group-hover:opacity-100'
                   )} />
                </button>

                 {/* Sub items list with collapse animation */}
                 <div
                   className={cn(
                     'overflow-hidden transition-all duration-300 pl-4 space-y-1',
                     isDropdownOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none'
                   )}
                 >
                   {subItems.map((sub) => (
                     <NavLink
                       key={sub.to}
                       to={sub.to}
                       className={({ isActive }) =>
                         cn(
                           'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all group/sub',
                           isActive
                             ? 'bg-blue-600 text-white font-semibold shadow-sm border border-blue-600'
                             : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 font-medium'
                         )
                       }
                     >
                       {({ isActive }) => (
                         <>
                           <span
                             className={cn(
                               'w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0',
                               isActive
                                 ? 'bg-white'
                                 : 'bg-zinc-400 dark:bg-zinc-650 group-hover/sub:bg-blue-500'
                             )}
                           />
                           <span className="flex-1 truncate">{sub.label}</span>
                         </>
                       )}
                     </NavLink>
                   ))}
                 </div>
              </div>
            )
          }

          // Standard NavLink
          return (
            <NavLink
              key={to}
              to={to!}
              end={to === '/dashboard' || to === '/cs' || to === '/tech'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm border border-blue-600'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-white' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-200')} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className={cn('w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity', isActive && 'opacity-100 text-white')} />
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Activation Status Widget */}
      <div className="mx-4 my-2 p-4 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850">
        <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 mb-3">
          Status Aktivasi Hari Ini
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-zinc-400">Aktivasi Sukses</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
              48
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-zinc-400">Menunggu Aktivasi</span>
            <span className="font-medium text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-550/10 px-2 py-0.5 rounded-full">
              19
            </span>
          </div>
        </div>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-gray-200 dark:border-zinc-850">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-950/60 border border-gray-200/40 dark:border-zinc-850/40">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold uppercase">
              {user?.full_name?.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-700 dark:text-zinc-200 text-sm font-semibold truncate leading-tight">
              {user?.full_name ?? 'Owner ISP'}
            </p>
            <p className="text-gray-400 dark:text-zinc-500 text-[10px] capitalize leading-none mt-1">
              {user?.role === 'owner' ? 'Super Admin' : user?.role === 'cs_admin' ? 'CS Admin' : user?.role === 'technician' ? 'Teknisi' : 'Super Admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 dark:text-zinc-550 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-center text-gray-400 dark:text-zinc-600 mt-2 font-medium">
          &copy; 2025 ISP Center.
        </div>
      </div>
      </aside>
    </>
  )
}
