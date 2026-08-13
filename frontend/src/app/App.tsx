import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useWebSocket } from '@/hooks/useWebSocket'

import ProtectedRoute from './ProtectedRoute'
import LoginPage from '@/features/auth/components/LoginPage'
import DashboardLayout from './DashboardLayout'
import RoleRedirect from './RoleRedirect'

// Owner pages
import DashboardPage from '@/features/owner/components/DashboardPage'
import RegistrationsPage from '@/features/owner/components/RegistrationsPage'
import PackagesPage from '@/features/owner/components/PackagesPage'
import MikrotikPage from '@/features/owner/components/MikrotikPage'
import OLTPortsPage from '@/features/owner/components/OLTPortsPage'
import UsersPage from '@/features/owner/components/UsersPage'
import ActivityPage from '@/features/owner/components/ActivityPage'
import SettingsPage from '@/features/owner/components/SettingsPage'
import CustomersPage from '@/features/owner/components/CustomersPage'
import ProfilePage from '@/features/auth/components/ProfilePage'
import { NetworkMapPage } from '@/features/owner/components/NetworkMapPage'

// CS Admin pages
import CSDashboardPage from '@/features/cs/components/CSDashboardPage'
import CSRegistrationsPage from '@/features/cs/components/CSRegistrationsPage'

// Technician pages
import TechDashboardPage from '@/features/technician/components/TechDashboardPage'

// Public pages
import RegisterPage from '@/features/public/components/RegisterPage'
import ForgotPasswordPage from '@/features/auth/components/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/components/ResetPasswordPage'
import InvoicePage from '@/features/public/components/InvoicePage'
import ReceiptPage from '@/features/public/components/ReceiptPage'
import InvoicesPage from '@/features/billing/components/InvoicesPage'
import BillingInvoicePage from '@/features/billing/components/BillingInvoicePage'

import { useThemeStore } from '@/stores/useThemeStore'
import { useBrandingStore, applyMetadata } from '@/stores/useBrandingStore'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme)
  const location = useLocation()
  const fetchBranding = useBrandingStore((s) => s.fetchConfig)
  const brandingConfig = useBrandingStore((s) => s.config)

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  useEffect(() => {
    const isPublicPage = location.pathname === '/' || 
                         location.pathname === '/login' ||
                         location.pathname === '/register' ||
                         location.pathname === '/forgot-password' ||
                         location.pathname === '/reset-password' ||
                         location.pathname.startsWith('/invoice/') ||
                         location.pathname.startsWith('/receipt/');
                         
    if (theme === 'dark' && !isPublicPage) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme, location.pathname])

  useEffect(() => {
    if (brandingConfig) {
      applyMetadata(brandingConfig)
    }
  }, [location.pathname, brandingConfig])

  return null
}

function WebSocketListener() {
  useWebSocket()
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <WebSocketListener />
      <BrowserRouter>
        <ThemeApplier />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<RegisterPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invoice/:id" element={<InvoicePage />} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          <Route path="/billing-invoice/:id" element={<BillingInvoicePage />} />

          {/* ── OWNER ─────────────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['owner']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route path="customers" element={<CustomersPage role="owner" />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="olt-ports" element={<OLTPortsPage />} />
            <Route path="network-map" element={<NetworkMapPage />} />
            <Route path="mikrotik" element={<MikrotikPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="activity" element={<ActivityPage role="owner" />} />
            <Route path="settings" element={<Navigate to="/dashboard/settings/registration" replace />} />
            <Route path="settings/registration" element={<SettingsPage activeSection="registration" />} />
            <Route path="settings/provisioning" element={<SettingsPage activeSection="provisioning" />} />
            <Route path="settings/notification" element={<SettingsPage activeSection="notification" />} />
            <Route path="settings/website" element={<SettingsPage activeSection="branding" />} />
            <Route path="settings/invoice" element={<SettingsPage activeSection="invoice" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* ── CS ADMIN ──────────────────────────── */}
          <Route path="/cs" element={
            <ProtectedRoute allowedRoles={['cs_admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/cs/dashboard" replace />} />
            <Route path="dashboard" element={<CSDashboardPage />} />
            <Route path="registrations" element={<CSRegistrationsPage />} />
            <Route path="customers" element={<CustomersPage role="cs_admin" />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="olt-ports" element={<OLTPortsPage />} />
            <Route path="network-map" element={<NetworkMapPage />} />
            <Route path="mikrotik" element={<MikrotikPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="activity" element={<ActivityPage role="cs_admin" />} />
            <Route path="settings" element={<Navigate to="/cs/settings/registration" replace />} />
            <Route path="settings/registration" element={<SettingsPage activeSection="registration" />} />
            <Route path="settings/provisioning" element={<SettingsPage activeSection="provisioning" />} />
            <Route path="settings/notification" element={<SettingsPage activeSection="notification" />} />
            <Route path="settings/website" element={<SettingsPage activeSection="branding" />} />
            <Route path="settings/invoice" element={<SettingsPage activeSection="invoice" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* ── TECHNICIAN ────────────────────────── */}
          <Route path="/tech" element={
            <ProtectedRoute allowedRoles={['technician']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/tech/dashboard" replace />} />
            <Route path="dashboard" element={<TechDashboardPage />} />
            <Route path="registrations" element={<RegistrationsPage />} />
            <Route path="customers" element={<CustomersPage role="cs_admin" />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="olt-ports" element={<OLTPortsPage />} />
            <Route path="network-map" element={<NetworkMapPage />} />
            <Route path="mikrotik" element={<MikrotikPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="activity" element={<ActivityPage role="cs_admin" />} />
            <Route path="settings" element={<Navigate to="/tech/settings/registration" replace />} />
            <Route path="settings/registration" element={<SettingsPage activeSection="registration" />} />
            <Route path="settings/provisioning" element={<SettingsPage activeSection="provisioning" />} />
            <Route path="settings/notification" element={<SettingsPage activeSection="notification" />} />
            <Route path="settings/website" element={<SettingsPage activeSection="branding" />} />
            <Route path="settings/invoice" element={<SettingsPage activeSection="invoice" />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all → smart redirect */}
          <Route path="*" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}

