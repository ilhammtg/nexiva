import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isAuthUrl = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/refresh')
    
    const pathname = window.location.pathname
    const isPublicPage = pathname === '/' || 
                         pathname === '/login' ||
                         pathname === '/register' ||
                         pathname === '/forgot-password' ||
                         pathname === '/reset-password' ||
                         pathname.startsWith('/invoice/') ||
                         pathname.startsWith('/receipt/') ||
                         pathname.startsWith('/billing-invoice/')

    if (error.response?.status === 401 && !isAuthUrl && !isPublicPage) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
