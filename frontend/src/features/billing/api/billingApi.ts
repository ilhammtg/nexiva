import { api } from '@/lib/api'
import type { Invoice } from '../types'

export const billingApi = {
  // Admin List Invoices
  listInvoices: async (params?: Record<string, any>) => {
    const res = await api.get('/admin/invoices', { params })
    return res.data as { data: Invoice[]; meta: { total: number; page: number; per_page: number; total_pages: number } }
  },

  // Admin Get Invoice
  getInvoice: async (id: string): Promise<Invoice> => {
    const res = await api.get(`/admin/invoices/${id}`)
    return res.data.data
  },

  // Admin Confirm Invoice Payment
  confirmPayment: async (id: string, bank: string) => {
    const res = await api.post(`/admin/invoices/${id}/confirm`, { bank })
    return res.data
  },

  // Admin Resend Invoice Notification
  resendNotification: async (id: string) => {
    const res = await api.post(`/admin/invoices/${id}/resend`)
    return res.data
  },

  // Public Get Invoice (for customers)
  getPublicInvoice: async (id: string): Promise<Invoice> => {
    // Note: public endpoint prefix in backend/cmd/server/main.go is registered directly under v1,
    // so `/public-invoices/:id` is accessed via `/api/v1/public-invoices/:id` which matches baseURL `/api/v1` + `/public-invoices/:id`
    const res = await api.get(`/public-invoices/${id}`)
    return res.data.data
  },
}
