import { create } from 'zustand'
import { setJwt } from '../lib/axios'

export interface EmployeeProfile {
  id: string
  first_name: string
  last_name: string
  employee_code: string
  branch: { id: string; name: string }
  weekly_off_mode?: 'WEEKLY' | 'MONTHLY_BATCH'
  employee_status_type?: {
    id: string; name: string; monthly_off_quota: number
    saturday_rule?: 'WORK' | 'OFF' | 'OFFSITE'; sunday_rule?: 'WORK' | 'OFF' | 'OFFSITE'
    off_on_public_holiday?: boolean
  } | null
  // สิทธิ์จองวันหยุด — cascade จากกลุ่ม/ฝ่าย/แผนก (ตั้งค่าที่ admin → ผังองค์กร → กลุ่ม)
  // false = กลุ่มนี้จองวันหยุดไม่ได้ (หยุดได้แค่เสาร์-อาทิตย์ตายตัวตาม saturday_rule/sunday_rule)
  booking_enabled?: boolean
  // สิทธิ์การลา — cascade เดียวกัน false = ยื่นคำขอลาไม่ได้ (ล็อกแท็บขอลา + พักร้อน/ชดเชย)
  leave_enabled?: boolean
  // ยื่นลาผ่าน LIFF ย้อนหลังได้ไม่เกินกี่วัน (null = ไม่จำกัด) — ตั้งที่ admin การตั้งค่า → นโยบายการลา
  leave_backdate_days?: number | null
  feat_disciplinary?: boolean // tenant เปิดฟีเจอร์หนังสือเตือนไหม
  feat_resignation?: boolean  // tenant เปิดให้พนักงานยื่นลาออกผ่าน LIFF ไหม
  admin_access?: boolean      // พนักงานคนนี้มีบัญชีแอดมิน (active) — โชว์เมนู "สลับไปเว็บแอดมิน"
  admin_url?: string | null   // URL เว็บแอดมินสำหรับกดสลับ
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
