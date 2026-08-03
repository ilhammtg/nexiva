import { api } from '@/lib/api'
import type { Package, OLTPortConfig, MikrotikConfig, Registration, SystemUser } from '../types'

export const ownerApi = {
  // Dashboard
  getDashboard: async () => {
    const res = await api.get('/owner/dashboard')
    const s = res.data.data?.summary ?? {}
    return {
      total: s.total_registrations ?? 0,
      by_status: {
        active: s.active ?? 0,
        pending_review: s.pending_review ?? 0,
        rejected: s.rejected ?? 0,
        in_progress: s.in_progress ?? 0,
      },
      active_this_month: s.active ?? 0,
      pending_count: s.pending_review ?? 0,
    }
  },

  // Registrations
  getRegistrations: async (params?: Record<string, string>) => {
    const res = await api.get('/owner/registrations', { params })
    return res.data as { data: Registration[]; meta?: { total: number; page: number; per_page: number } }
  },

  getRegistration: async (id: string): Promise<Registration> => {
    const res = await api.get(`/owner/registrations/${id}`)
    return res.data.data
  },

  // Packages
  getPackages: async (): Promise<Package[]> => {
    const res = await api.get('/packages/all')
    return res.data.data ?? []
  },

  createPackage: async (data: Partial<Package>) => {
    const res = await api.post('/packages', data)
    return res.data.data
  },

  updatePackage: async (id: string, data: Partial<Package>) => {
    const res = await api.put(`/packages/${id}`, data)
    return res.data.data
  },

  deletePackage: async (id: string) => {
    await api.patch(`/packages/${id}/toggle`)
  },

  // OLT Port Configs
  getOLTPorts: async (): Promise<OLTPortConfig[]> => {
    const res = await api.get('/olt-ports')
    const raw = Array.isArray(res.data) ? res.data : (res.data.data ?? [])
    return Array.isArray(raw) ? raw : []
  },

  createOLTPort: async (data: Partial<OLTPortConfig>) => {
    const res = await api.post('/olt-ports', data)
    return res.data.data
  },

  updateOLTPort: async (id: string, data: Partial<OLTPortConfig>) => {
    const res = await api.put(`/olt-ports/${id}`, data)
    return res.data.data
  },

  deleteOLTPort: async (id: string) => {
    await api.delete(`/olt-ports/${id}`)
  },

  // Mikrotik
  getMikrotikConfigs: async (): Promise<MikrotikConfig[]> => {
    const res = await api.get('/owner/mikrotik-configs')
    return res.data.data ?? []
  },

  createMikrotikConfig: async (data: any) => {
    const res = await api.post('/owner/mikrotik-configs', data)
    return res.data.data
  },

  updateMikrotikConfig: async (id: string, data: any) => {
    const res = await api.put(`/owner/mikrotik-configs/${id}`, data)
    return res.data.data
  },

  deleteMikrotikConfig: async (id: string) => {
    await api.delete(`/owner/mikrotik-configs/${id}`)
  },

  testMikrotikConnection: async (id: string) => {
    const res = await api.post(`/owner/mikrotik-configs/${id}/test`)
    return res.data.data
  },

  getMikrotikResources: async (id: string) => {
    const res = await api.get(`/owner/mikrotik-configs/${id}/resources`)
    return res.data.data
  },

  getMikrotikActiveConnections: async (id: string) => {
    const res = await api.get(`/owner/mikrotik-configs/${id}/active-connections`)
    return res.data.data ?? []
  },

  getMikrotikPPPSecrets: async (id: string) => {
    const res = await api.get(`/owner/mikrotik-configs/${id}/secrets`)
    return res.data.data ?? []
  },

  getMikrotikTraffic: async (id: string) => {
    const res = await api.get(`/owner/mikrotik-configs/${id}/traffic`)
    return res.data.data ?? []
  },

  getMikrotikLogs: async (id: string) => {
    const res = await api.get(`/owner/mikrotik-configs/${id}/logs`)
    return res.data.data ?? []
  },

  disconnectMikrotikActiveConnection: async (id: string, name: string) => {
    const res = await api.post(`/owner/mikrotik-configs/${id}/active-connections/disconnect`, { name })
    return res.data.data
  },

  toggleMikrotikSecret: async (id: string, name: string, disabled: boolean) => {
    const res = await api.post(`/owner/mikrotik-configs/${id}/secrets/toggle`, { name, disabled })
    return res.data.data
  },

  addMikrotikSecret: async (id: string, data: { name: string; password?: string; profile?: string; service?: string }) => {
    const res = await api.post(`/owner/mikrotik-configs/${id}/secrets`, data)
    return res.data.data
  },

  // Users
  getUsers: async (): Promise<SystemUser[]> => {
    const res = await api.get('/users')
    return res.data.data ?? []
  },

  createUser: async (data: any) => {
    const res = await api.post('/users', data)
    return res.data.data
  },

  updateUser: async (id: string, data: any) => {
    const res = await api.put(`/users/${id}`, data)
    return res.data.data
  },

  toggleUser: async (id: string) => {
    const res = await api.patch(`/users/${id}/toggle`)
    return res.data
  },

  resetPassword: async (id: string, data: any) => {
    const res = await api.put(`/users/${id}/password`, data)
    return res.data
  },

  // Activity logs
  getActivityLogs: async (params?: Record<string, string>) => {
    const res = await api.get('/owner/activity-logs', { params })
    return res.data
  },

  // App Configs
  getConfigs: async (): Promise<{ Key: string; Value: string; Description?: string }[]> => {
    const res = await api.get('/configs')
    return res.data.data ?? []
  },

  updateConfig: async (key: string, value: string) => {
    const res = await api.put(`/configs/${key}`, { value })
    return res.data
  },

  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('logo', file)
    const res = await api.post('/owner/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data.url
  },

  // OLT Real-Time Telemetry & Driver Scraping
  fetchOLTPorts: async (data: { brand: string; ip: string; username?: string; password?: string; port?: number; sync?: boolean }) => {
    const res = await api.post('/olt/ports', data)
    return res.data.data ?? []
  },

  fetchOLTONUs: async (data: { brand: string; ip: string; username?: string; password?: string; port?: number }) => {
    const res = await api.post('/olt/onus', data)
    return res.data.data ?? []
  },

  fetchUnconfiguredONUs: async (data: { brand: string; ip: string; username?: string; password?: string; port?: number }) => {
    const res = await api.post('/olt/unconfigured', data)
    return res.data.data ?? []
  },

  fetchPowerAttenuation: async (data: { brand: string; ip: string; username?: string; password?: string; port?: number; onuIndex: string }) => {
    const res = await api.post('/olt/attenuation', data)
    return res.data as { success: boolean; onuIndex: string; oltRxPower: number; onuRxPower: number }
  },

  testOLTConnection: async (data: { brand: string; ip: string; username?: string; password?: string; port?: number }) => {
    const res = await api.post('/olt/test-connection', data)
    return res.data as { success: boolean; connected: boolean; message: string; portCount?: number }
  },
}
