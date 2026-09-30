import { create } from 'zustand'
import { setJwt } from '../lib/axios'

export interface EmployeeProfile {
  id: string
  first_name: string
  last_name: string
  nickname?: string | null
  employee_code: string
  branch: { id: string; name: string }
  extra_branches?: { id: string; name: string }[] // สาขาเสริม/สาขารอง นอกเหนือจาก branch (สาขาหลัก)
  hired_at?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'
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
  // นโยบายวันหยุด — resolve จาก cascade 6 ชั้น (สถานะพนักงาน→ตำแหน่ง→…→กลุ่ม) ฝั่ง server
  saturday_rule?: 'WORK' | 'OFF' | 'OFFSITE'
  sunday_rule?: 'WORK' | 'OFF' | 'OFFSITE'
  booking_quota?: number // จองวันหยุดได้กี่วัน/เดือน (ทั้ง 2 โหมด)
  // ยื่นลาผ่าน LIFF ย้อนหลังได้ไม่เกินกี่วัน (null = ไม่จำกัด) — ตั้งที่ admin การตั้งค่า → นโยบายการลา
  leave_backdate_days?: number | null
  feat_disciplinary?: boolean // tenant เปิดฟีเจอร์หนังสือเตือนไหม
  feat_resignation?: boolean  // tenant เปิดให้พนักงานยื่นลาออกผ่าน LIFF ไหม
  feat_document_request?: boolean // tenant เปิดฟีเจอร์ขอเอกสาร HR ผ่าน LIFF ไหม
  offsite_checkin_enabled?: boolean // สิทธิ์เช็คอินนอกสถานที่รายคน — default false ต้องแอดมินเปิดให้ (ไม่ cascade)
  admin_access?: boolean      // พนักงานคนนี้มีบัญชีแอดมิน (active) — โชว์เมนู "สลับไปเว็บแอดมิน"
  admin_url?: string | null   // URL เว็บแอดมินสำหรับกดสลับ
  photo_url?: string | null   // รูปโปรไฟล์ (URL จาก Cloudinary)
}

interface AuthStore {
  employee: EmployeeProfile | null
  isAuthenticated: boolean
  isVerifying: boolean
  setAuth: (employee: EmployeeProfile, token: string) => void
  patchEmployee: (patch: Partial<EmployeeProfile>) => void
  setVerifying: (v: boolean) => void
  logout: () => void
}

// จำชื่อพนักงานคนล่าสุดที่ล็อกอินสำเร็จไว้ใน localStorage (แค่ชื่อ ไม่ใช่ token/
// ข้อมูลอ่อนไหว) — ใช้ตอนบูตแอปครั้งถัดไปแล้วเจอ "Failed to fetch" ตั้งแต่ก่อน
// login เสร็จเลย (ไม่มี lineUserId/displayName จาก LIFF มาแนบตอนกดแจ้งปัญหา)
// จะได้เดาได้ว่าน่าจะเป็นใคร แทนที่จะขึ้น "ไม่ทราบตัวตน" เฉยๆ (feedback: "ตอนแจ้ง
// ปัญหาขึ้นให้หน่อยว่าใครเป็นคนแจ้ง")
const LAST_EMPLOYEE_KEY = 'tl_last_employee'
export function getLastKnownEmployeeName(): string | null {
  try {
    const raw = localStorage.getItem(LAST_EMPLOYEE_KEY)
    return raw || null
  } catch { return null }
}
function rememberEmployeeName(employee: EmployeeProfile) {
  try {
    const name = employee.nickname
      ? `${employee.first_name} ${employee.last_name} (${employee.nickname})`
      : `${employee.first_name} ${employee.last_name}`
    localStorage.setItem(LAST_EMPLOYEE_KEY, name)
  } catch { /* private mode/blocked storage — เฉยๆ ไปเลย ไม่ critical */ }
}

export const useAuthStore = create<AuthStore>((set) => ({
  employee: null,
  isAuthenticated: false,
  isVerifying: false,
  setAuth: (employee, token) => {
    setJwt(token)
    rememberEmployeeName(employee)
    set({ employee, isAuthenticated: true, isVerifying: false })
  },
  patchEmployee: (patch) => set(s => ({ employee: s.employee ? { ...s.employee, ...patch } : s.employee })),
  setVerifying: (isVerifying) => set({ isVerifying }),
  logout: () => {
    setJwt('')
    set({ employee: null, isAuthenticated: false })
  },
}))
