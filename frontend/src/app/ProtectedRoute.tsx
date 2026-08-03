import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import type { User } from '@/features/auth/types'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/features/public/api/publicApi'

interface Props {
  children: React.ReactNode
  allowedRoles?: User['role'][]
}

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  cs_admin: {
    dashboard: true,
    registrations: true,
    customers: true,
    activity_log: true,
    packages: false,
    olt_ports: false,
    mikrotik: false,
    users: false,
    settings: false,
  },
  technician: {
    dashboard: true,
    registrations: false,
    customers: false,
    activity_log: false,
    packages: false,
    olt_ports: false,
    mikrotik: false,
    users: false,
    settings: false,
  }
}

/**
 * ProtectedRoute — guards routes by authentication + optional role check.
 * - If not authenticated → redirect to /login
 * - If authenticated but wrong role or lacks RBAC permission → redirects appropriately
 */
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
    staleTime: 5 * 60 * 1000,
  })

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as User['role'])) {
    // Redirect to the appropriate default page per role
    const roleHome: Record<string, string> = {
      owner:      '/dashboard',
      cs_admin:   '/cs/dashboard',
      technician: '/tech/dashboard',
      customer:   '/login',
    }
    return <Navigate to={roleHome[user.role] ?? '/login'} replace />
  }

  // Dynamic RBAC permission check for cs_admin and technician
  if (user && (user.role === 'cs_admin' || user.role === 'technician')) {
    let permissions: any = null
    try {
      if (publicConfigs?.role_permissions) {
        permissions = JSON.parse(publicConfigs.role_permissions)
      }
    } catch (e) {}

    const activePermissions = permissions?.[user.role] ?? DEFAULT_PERMISSIONS[user.role]

    let requiredPerm: string | null = null
    const path = location.pathname
    const rolePath = user.role === 'cs_admin' ? 'cs' : 'tech'

    if (path.startsWith(`/${rolePath}/dashboard`)) requiredPerm = 'dashboard'
    else if (path.startsWith(`/${rolePath}/registrations`)) requiredPerm = 'registrations'
    else if (path.startsWith(`/${rolePath}/customers`)) requiredPerm = 'customers'
    else if (path.startsWith(`/${rolePath}/packages`)) requiredPerm = 'packages'
    else if (path.startsWith(`/${rolePath}/olt-ports`)) requiredPerm = 'olt_ports'
    else if (path.startsWith(`/${rolePath}/mikrotik`)) requiredPerm = 'mikrotik'
    else if (path.startsWith(`/${rolePath}/users`)) requiredPerm = 'users'
    else if (path.startsWith(`/${rolePath}/activity`)) requiredPerm = 'activity_log'
    else if (path.startsWith(`/${rolePath}/settings`)) requiredPerm = 'settings'

    if (requiredPerm && activePermissions && activePermissions[requiredPerm] === false) {
      // Find first allowed page
      const possiblePages = [
        { perm: 'dashboard', path: `/${rolePath}/dashboard` },
        { perm: 'registrations', path: `/${rolePath}/registrations` },
        { perm: 'customers', path: `/${rolePath}/customers` },
        { perm: 'packages', path: `/${rolePath}/packages` },
        { perm: 'olt_ports', path: `/${rolePath}/olt-ports` },
        { perm: 'mikrotik', path: `/${rolePath}/mikrotik` },
        { perm: 'users', path: `/${rolePath}/users` },
        { perm: 'activity_log', path: `/${rolePath}/activity` },
        { perm: 'settings', path: `/${rolePath}/settings/registration` },
      ]

      const firstAllowed = possiblePages.find(p => activePermissions[p.perm] !== false)
      if (firstAllowed) {
        return <Navigate to={firstAllowed.path} replace />
      }
      return <Navigate to="/login" replace />
    }
  }

  return <>{children}</>
}
