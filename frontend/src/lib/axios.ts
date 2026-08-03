import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor: auto-refresh JWT on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        return api(original)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
