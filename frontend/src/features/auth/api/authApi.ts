import { api } from '@/lib/api'

export const authApi = {
  login: async (identifier: string, password: string) => {
    const res = await api.post('/auth/login', { identifier, phone: identifier, password })
    return res.data.data as {
      access_token: string
      refresh_token: string
      expires_in: number
      user: { id: string; full_name: string; phone: string; role: string }
    }
  },
  logout: async () => {
    await api.post('/auth/logout').catch(() => {})
  },
  getProfile: async () => {
    const res = await api.get('/profile')
    return res.data.data
  },
  updateProfile: async (data: { full_name: string; email?: string; phone: string }) => {
    const res = await api.put('/profile', data)
    return res.data.data
  },
  changePassword: async (data: { old_password: string; new_password: string; confirm_password: string }) => {
    const res = await api.put('/profile/password', data)
    return res.data
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data as { message: string }
  },
  resetPassword: async (data: { token: string; new_password: string; confirm_password: string }) => {
    const res = await api.post('/auth/reset-password', data)
    return res.data as { message: string }
  },
}
