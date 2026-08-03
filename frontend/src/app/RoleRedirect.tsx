import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

/**
 * Redirects authenticated users to their role-appropriate home page.
 * Used for "/" and catch-all "*" routes.
 */
export default function RoleRedirect() {
  const user = useAuthStore((s) => s.user)

  const roleHome: Record<string, string> = {
    owner:      '/dashboard',
    cs_admin:   '/cs/dashboard',
    technician: '/tech/dashboard',
    customer:   '/login',
  }

  const target = user ? (roleHome[user.role] ?? '/login') : '/login'
  return <Navigate to={target} replace />
}
