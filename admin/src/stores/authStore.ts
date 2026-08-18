// admin/src/stores/authStore.ts
import { create } from 'zustand'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
export type EnabledFeatures = Record<string, boolean> | null

interface AuthState {
  token:            string | null
  role:             Role | null
  tenantId:         string | null
  name:             string | null
  enabledFeatures:  EnabledFeatures
  setAuth:  (token: string, role: Role, tenantId: string, name: string, enabledFeatures?: EnabledFeatures) => void
  setName:  (name: string) => void
  clear:    () => void
}

function readEnabledFeatures(): EnabledFeatures {
  const raw = localStorage.getItem('enabled_features')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export const useAuthStore = create<AuthState>((set) => ({
  token:            localStorage.getItem('access_token'),
  role:             localStorage.getItem('role') as Role | null,
  tenantId:         localStorage.getItem('tenant_id'),
  name:             localStorage.getItem('name'),
  enabledFeatures:  readEnabledFeatures(),
  setAuth: (token, role, tenantId, name, enabledFeatures) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('tenant_id', tenantId)
    localStorage.setItem('name', name)
    if (enabledFeatures) localStorage.setItem('enabled_features', JSON.stringify(enabledFeatures))
    else localStorage.removeItem('enabled_features')
    set({ token, role, tenantId, name, enabledFeatures: enabledFeatures ?? null })
  },
  setName: (name) => {
    localStorage.setItem('name', name)
    set({ name })
  },
  clear: () => {
    localStorage.clear()
    set({ token: null, role: null, tenantId: null, name: null, enabledFeatures: null })
  },
}))
