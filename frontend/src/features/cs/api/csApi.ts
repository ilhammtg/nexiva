import { api } from '@/lib/api'
import type { Registration, ODP } from '@/features/owner/types'

// ---- Types ----
export interface ScheduleSurveyPayload {
  technician_id: string
  scheduled_at: string   // ISO datetime
  notes?: string
}

export interface ScheduleInstallationPayload {
  technician_id: string
  scheduled_at: string
  notes?: string
}

export interface ConfirmPaymentPayload {
  amount: number
  bank: string
  date: string   // ISO date YYYY-MM-DD
  notes?: string
}

export interface SurveyResultPayload {
  is_feasible?: boolean
  status?: 'feasible' | 'failed' | 'pending'
  notes?: string
  cable_length_m?: number
}

export interface ActivatePayload {
  ont_serial_number: string
  olt_port_config_id: string
  pppoe_username?: string
  pppoe_password?: string
  maps_lat?: number | null
  maps_lng?: number | null
  odp_info?: string
  google_maps_link?: string
}

// ---- CS Admin API ----
export const csApi = {
  // List registrations (same as owner but via /admin prefix)
  getRegistrations: async (params?: Record<string, string>) => {
    const res = await api.get('/admin/registrations', { params })
    return res.data as { data: Registration[]; meta?: { total: number; page: number; per_page: number } }
  },

  createRegistration: async (formData: FormData) => {
    const res = await api.post('/admin/registrations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  getRegistration: async (id: string): Promise<Registration> => {
    const res = await api.get(`/admin/registrations/${id}`)
    return res.data.data
  },

  approve: async (id: string, payload: ScheduleSurveyPayload) => {
    const res = await api.patch(`/admin/registrations/${id}/approve`, {
      technician_id: payload.technician_id,
      survey_scheduled_at: payload.scheduled_at,
      notes: payload.notes,
    })
    return res.data
  },

  reject: async (id: string, reason: string) => {
    const res = await api.patch(`/admin/registrations/${id}/reject`, { reason })
    return res.data
  },

  confirmPayment: async (id: string, payload: ConfirmPaymentPayload) => {
    const res = await api.patch(`/admin/registrations/${id}/confirm-payment`, {
      payment_amount: payload.amount,
      payment_bank: payload.bank,
      payment_date: payload.date,
      notes: payload.notes,
    })
    return res.data
  },

  scheduleInstallation: async (id: string, payload: ScheduleInstallationPayload) => {
    const res = await api.patch(`/admin/registrations/${id}/schedule-installation`, {
      technician_id: payload.technician_id,
      installation_scheduled_at: payload.scheduled_at,
      notes: payload.notes,
    })
    return res.data
  },

  updateInternalNotes: async (id: string, notes: string) => {
    const res = await api.patch(`/admin/registrations/${id}/internal-notes`, { notes })
    return res.data
  },

  getProvisioningLogs: async (registrationId: string) => {
    const res = await api.get(`/admin/provisioning-logs/${registrationId}`)
    return res.data.data ?? []
  },

  listTechnicians: async () => {
    const res = await api.get('/admin/technicians')
    return res.data.data ?? []
  },

  getActivityLogs: async (params?: Record<string, string>) => {
    const res = await api.get('/admin/activity-logs', { params })
    return res.data
  },

  activate: async (id: string, payload: ActivatePayload | FormData) => {
    const res = await api.patch(`/admin/registrations/${id}/activate`, payload)
    return res.data
  },

  getNextCustomerNumber: async (registrationId?: string): Promise<string> => {
    const res = await api.get('/admin/registrations/next-customer-number', {
      params: registrationId ? { registration_id: registrationId } : undefined
    })
    return res.data.data.next_customer_number
  },

  updateRegistration: async (id: string, payload: Partial<Registration>) => {
    const res = await api.put(`/admin/registrations/${id}`, payload)
    return res.data
  },
  
  deleteRegistration: async (id: string) => {
    const res = await api.delete(`/admin/registrations/${id}`)
    return res.data
  },

  resendNotification: async (id: string, type?: string) => {
    const res = await api.post(`/admin/registrations/${id}/resend-notif`, { type })
    return res.data as {
      success: boolean
      message: string
      data: {
        wa_sent: boolean
        wa_error?: string
        email_sent: boolean
        email_error?: string
        message: string
      }
    }
  },

  provisionMikrotik: async (id: string) => {
    const res = await api.post(`/admin/registrations/${id}/provision-mikrotik`)
    return res.data as {
      success: boolean
      message: string
      data: {
        pppoe_username: string
        pppoe_password: string
        mikrotik_name: string
        mikrotik_profile: string
        is_mikrotik_online: boolean
      }
    }
  },

  // ODP API
  getODPs: async (): Promise<ODP[]> => {
    const res = await api.get('/admin/odps')
    return res.data.data ?? []
  },

  createODP: async (payload: Partial<ODP>): Promise<ODP> => {
    const res = await api.post('/admin/odps', payload)
    return res.data.data
  },

  updateODP: async (id: string, payload: Partial<ODP>): Promise<ODP> => {
    const res = await api.put(`/admin/odps/${id}`, payload)
    return res.data.data
  },

  deleteODP: async (id: string): Promise<boolean> => {
    await api.delete(`/admin/odps/${id}`)
    return true
  },
}

// ---- Technician API ----
export const techApi = {
  getSchedule: async (params?: Record<string, string>) => {
    const res = await api.get('/technician/schedule', { params })
    return res.data.data ?? []
  },

  claimTicket: async (id: string) => {
    const res = await api.patch(`/technician/registrations/${id}/claim`)
    return res.data
  },

  submitSurveyResult: async (id: string, payload: SurveyResultPayload) => {
    const res = await api.patch(`/technician/registrations/${id}/survey-result`, payload)
    return res.data
  },

  activate: async (id: string, payload: ActivatePayload | FormData) => {
    const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    const res = await api.patch(`/technician/registrations/${id}/activate`, payload, { headers })
    return res.data
  },

  retryProvisioning: async (id: string) => {
    const res = await api.patch(`/registrations/${id}/retry-provisioning`)
    return res.data
  },

  getProvisioningLogs: async (registrationId: string) => {
    const res = await api.get(`/admin/provisioning-logs/${registrationId}`)
    return res.data.data ?? []
  },
}
