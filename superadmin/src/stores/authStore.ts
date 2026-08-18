// admin/src/stores/authStore.ts
import { create } from 'zustand'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'

interface AuthState {
  token:    string | null
  role:     Role | null
  tenantId: string | null
  name:     string | null
  setAuth:  (token: string, role: Role, tenantId: string, name: string) => void
  setName:  (name: string) => void
  clear:    () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token:    localStorage.getItem('access_token'),
  role:     localStorage.getItem('role') as Role | null,
  tenantId: localStorage.getItem('tenant_id'),
  name:     localStorage.getItem('name'),
  setAuth: (token, role, tenantId, name) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('tenant_id', tenantId)
    localStorage.setItem('name', name)
    set({ token, role, tenantId, name })
  },
  setName: (name) => {
    localStorage.setItem('name', name)
    set({ name })
  },
  clear: () => {
    localStorage.clear()
    set({ token: null, role: null, tenantId: null, name: null })
  },
}))
