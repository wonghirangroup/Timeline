import { create } from 'zustand'
import { setJwt } from '../lib/axios'

export interface EmployeeProfile {
  id: string
  first_name: string
  last_name: string
  employee_code: string
  branch: { id: string; name: string }
}

interface AuthStore {
  employee: EmployeeProfile | null
  isAuthenticated: boolean
  isVerifying: boolean
  setAuth: (employee: EmployeeProfile, token: string) => void
  setVerifying: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  employee: null,
  isAuthenticated: false,
  isVerifying: false,
  setAuth: (employee, token) => {
    setJwt(token)
    set({ employee, isAuthenticated: true, isVerifying: false })
  },
  setVerifying: (isVerifying) => set({ isVerifying }),
  logout: () => {
    setJwt('')
    set({ employee: null, isAuthenticated: false })
  },
}))
