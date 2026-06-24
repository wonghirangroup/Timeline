import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  role: string
  tenant_id: string | null
  first_name: string
  last_name: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

function loadUser(): AuthUser | null {
  try { return JSON.parse(localStorage.getItem('sa_user') ?? 'null') } catch { return null }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: loadUser(),
  isAuthenticated: !!localStorage.getItem('sa_token'),
  login: (token, user) => {
    localStorage.setItem('sa_token', token)
    localStorage.setItem('sa_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_user')
    set({ user: null, isAuthenticated: false })
  },
}))
