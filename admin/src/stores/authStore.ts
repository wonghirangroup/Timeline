// admin/src/stores/authStore.ts
import { create } from 'zustand'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EXECUTIVE' | 'DEPT_HEAD'
export type EnabledFeatures = Record<string, boolean> | null

// สิทธิ์แบบละเอียดต่อบัญชี (ดู server/src/modules/permissions) — array ที่ได้จาก
// /auth/me แปลงเป็น map ตาม feature key ไว้ lookup ง่ายฝั่ง UI (เช่น Sidebar)
export interface PermissionRow { feature: string; view: boolean; add: boolean; edit: boolean; delete: boolean; approve: boolean }
export type PermissionsMap = Record<string, PermissionRow> | null

interface AuthState {
  token:            string | null
  role:             Role | null
  tenantId:         string | null
  name:             string | null
  enabledFeatures:  EnabledFeatures
  permissions:      PermissionsMap
  isRootAdmin:      boolean
  setAuth:  (token: string, role: Role, tenantId: string, name: string, enabledFeatures?: EnabledFeatures) => void
  setName:  (name: string) => void
  setEnabledFeatures: (enabledFeatures: EnabledFeatures) => void
  setPermissions: (permissions: PermissionRow[] | null) => void
  setIsRootAdmin: (v: boolean) => void
  clear:    () => void
}

function readEnabledFeatures(): EnabledFeatures {
  const raw = localStorage.getItem('enabled_features')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function readPermissions(): PermissionsMap {
  const raw = localStorage.getItem('permissions')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function toPermissionsMap(rows: PermissionRow[] | null): PermissionsMap {
  if (!rows) return null
  return Object.fromEntries(rows.map(r => [r.feature, r]))
}

export const useAuthStore = create<AuthState>((set) => ({
  token:            localStorage.getItem('access_token'),
  role:             localStorage.getItem('role') as Role | null,
  tenantId:         localStorage.getItem('tenant_id'),
  name:             localStorage.getItem('name'),
  enabledFeatures:  readEnabledFeatures(),
  permissions:      readPermissions(),
  isRootAdmin:      localStorage.getItem('is_root_admin') === '1',
  setAuth: (token, role, tenantId, name, enabledFeatures) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('tenant_id', tenantId)
    localStorage.setItem('name', name)
    if (enabledFeatures) localStorage.setItem('enabled_features', JSON.stringify(enabledFeatures))
    else localStorage.removeItem('enabled_features')
    localStorage.removeItem('permissions') // ล้างของบัญชีเก่า — รอบโหลดถัดไปจะ sync สดจาก /auth/me
    localStorage.removeItem('is_root_admin') // เช่นกัน — sync สดจาก /auth/me
    set({ token, role, tenantId, name, enabledFeatures: enabledFeatures ?? null, permissions: null, isRootAdmin: false })
  },
  setName: (name) => {
    localStorage.setItem('name', name)
    set({ name })
  },
  setEnabledFeatures: (enabledFeatures) => {
    if (enabledFeatures) localStorage.setItem('enabled_features', JSON.stringify(enabledFeatures))
    else localStorage.removeItem('enabled_features')
    set({ enabledFeatures })
  },
  setPermissions: (rows) => {
    const map = toPermissionsMap(rows)
    if (map) localStorage.setItem('permissions', JSON.stringify(map))
    else localStorage.removeItem('permissions')
    set({ permissions: map })
  },
  setIsRootAdmin: (v) => {
    localStorage.setItem('is_root_admin', v ? '1' : '0')
    set({ isRootAdmin: v })
  },
  clear: () => {
    localStorage.clear()
    set({ token: null, role: null, tenantId: null, name: null, enabledFeatures: null, permissions: null, isRootAdmin: false })
  },
}))

// ผู้บริหาร (EXECUTIVE) เห็นข้อมูลทั้ง tenant ได้เหมือน ADMIN แต่ backend บล็อกทุก
// write route (POST/PATCH/DELETE) ไว้แล้ว — ใช้ hook นี้ซ่อนปุ่มแก้ไข/ลบ/อนุมัติใน UI
// ไม่ให้กดแล้วเจอ error 403 เฉยๆ (backend คือ source of truth ตัวจริง อันนี้แค่ UX)
export function useIsReadOnly() {
  return useAuthStore(s => s.role) === 'EXECUTIVE'
}
