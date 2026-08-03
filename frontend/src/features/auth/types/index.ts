export interface User {
  id: string
  full_name: string
  email?: string | null
  phone: string
  role: 'owner' | 'cs_admin' | 'technician' | 'customer'
}

export interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (partial: Partial<User>) => void
}
