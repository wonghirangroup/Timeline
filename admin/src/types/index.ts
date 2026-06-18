// admin/src/types/index.ts

export type AttendanceStatus = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT' | 'LEAVE' | 'VACATION' | 'WEEKLY_OFF' | 'SAT_OFF' | 'SUN_OFF' | 'HOLIDAY' | 'HALF_DAY' | 'MANAGER'
export type LeaveType = 'SICK' | 'PERSONAL' | 'VACATION' | 'HOLIDAY' | 'COMPENSATE' | 'WEEKLY_OFF' | 'HALF_DAY'

export interface Branch {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  employee_count: number
  radius_m: number
}

export interface Employee {
  id: string
  code: string
  full_name: string
  nickname: string
  department: string
  branches: string[]
  phone: string
  hire_date: string
  status: 'ACTIVE' | 'INACTIVE'
  line_user_id: string | null   // null = ยังไม่ผูก Line account → เช็คอิน LIFF ไม่ได้
  pay_type: 'MONTHLY' | 'DAILY' | 'HOURLY'
  hourly_rate?: number          // บาท/ชั่วโมง (เฉพาะ HOURLY — เก็บไว้อ้างอิง, ไม่คำนวณในระบบ)
  // ── กะประจำ ──────────────────────────────────────────────────────────────
  default_shift_id?: string     // กะที่ใช้โดย default — ระบบ fallback มาหาถ้าไม่มี override
  default_work_days?: number[]  // วันทำงานปกติ [1-6] = จ-ส, [1-5] = จ-ศ (0=อา)
                                // ถ้าไม่ตั้ง → ถือว่าทำงาน จ-ศ (1,2,3,4,5)
}

// ── Shift Assignment (Option B: Individual Day Assignment) ─────────────────────
export type ShiftAssignmentType = 'WORK' | 'DAY_OFF' | 'WEEKLY_OFF' | 'HOLIDAY'

export interface ShiftAssignment {
  id: string
  employee_id: string
  date: string                  // YYYY-MM-DD
  shift_id: string | null       // null เมื่อ type ≠ WORK
  type: ShiftAssignmentType
  note?: string
}

export interface AttendanceRow {
  id: string
  code: string
  full_name: string
  nickname: string
  branch_name: string
  shift_no: number
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  fine: number
}

export interface ReportRow {
  id: string
  code: string
  full_name: string
  nickname: string
  branch_name: string
  work_days: number
  late_days: number
  absent_days: number
  leave_days: number
  fine_late: number
  fine_absent: number
  total_fine: number
}

export interface CalendarEvent {
  date: string
  nickname: string
  type: LeaveType
}

export interface ShiftConfig {
  shift_no: number
  start_time: string
  end_time: string
  late_threshold_1: string
  late_threshold_2: string
  min_checkout: string
}

export interface BranchSettings {
  branch_id: string
  branch_name: string
  use_shift_2: boolean
  shifts: ShiftConfig[]
}

export interface GlobalSettings {
  fine_late_1: number
  fine_late_2: number
  fine_absent: number
  radius_m: number
}

// ── Fine Rule System ──────────────────────────────────────────────────────────
export type FineMode = 'tier' | 'per_minute'

export interface FineTier {
  id: string
  from_minute: number        // นาทีที่สาย (inclusive) เริ่มจาก 1
  to_minute: number | null   // นาทีที่สาย (inclusive), null = ไม่จำกัด (ขึ้นไป)
  fine_amount: number        // ค่าปรับ (บาท)
  count_as_absent: boolean   // นับเป็นวันหยุด/ขาดงาน 1 วัน
  next_day_fine: number      // ค่าปรับเพิ่มวันถัดไป (0 = ไม่มี)
}

export interface FineRule {
  mode: FineMode
  tiers: FineTier[]
  per_minute_rate: number    // บาทต่อนาที (ใช้เมื่อ mode = per_minute)
  per_minute_max: number     // ค่าปรับสูงสุด บาท (0 = ไม่จำกัด)
}

export type OtStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface OtRequest {
  id: string
  employee_id: string
  full_name: string
  nickname: string
  branch_name: string
  date: string
  start_time: string
  end_time: string
  hours: number
  multiplier: number
  amount: number
  note: string
  bank_account?: string   // เลขบัญชีสำหรับโอน OT
  status: OtStatus
  paid_at?: string        // ISO timestamp เมื่อจ่ายแล้ว
  payment_amount?: number // ยอดที่จ่ายจริง (daily_rate × multiplier)
}

export interface ShiftDef {
  id: string
  name: string
  branch_name: string
  start_time: string
  end_time: string
  late_threshold_1: string
  late_threshold_2: string
  employee_count: number
  shift_type?: 'REGULAR' | 'SPECIAL'
}

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  sent_at: string
  target: string
  sent_count: number
}

export interface LeaveRequest {
  id: string
  full_name: string
  nickname: string
  branch_name: string
  leave_type: string
  leave_type_color: string
  start_date: string
  end_date: string
  days: number
  half_day_period?: 'AM' | 'PM' | null
  reason: string
  status: LeaveStatus
  created_at: string
}

export interface FeedbackItem {
  id: string
  category: string
  message: string
  created_at: string
  branch_hint: string | null
}

export interface LeaveBalance {
  employee_id: string
  full_name: string
  nickname: string
  branch_name: string
  sick_used: number
  sick_quota: number
  personal_used: number
  personal_quota: number
  vacation_used: number
  vacation_quota: number
  compensate_used: number
  compensate_quota: number
}

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
export type TenantPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export interface Tenant {
  id: string
  name: string
  owner_name: string
  owner_email: string
  plan: TenantPlan
  status: TenantStatus
  branch_count: number
  employee_count: number
  created_at: string
  expires_at: string | null
  line_configured: boolean
}

export interface TenantLineConfig {
  tenant_id: string
  line_channel_id: string
  line_channel_secret: string
  liff_id: string
  webhook_url: string
  verified: boolean
}

export interface Department {
  id: string
  code: string   // '01', '02', ...
  name: string
}

// ── Billing / Invoice ─────────────────────────────────────────────────────────
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'

export interface Invoice {
  id: string
  tenant_id: string
  tenant_name: string
  plan: TenantPlan
  amount: number           // ฿
  due_date: string         // YYYY-MM-DD
  paid_date: string | null
  status: PaymentStatus
  period_start: string     // YYYY-MM-DD
  period_end: string       // YYYY-MM-DD
  note: string
}

// ── Plan / Package Management ─────────────────────────────────────────────────
export interface PlanLimits {
  max_branches: number       // -1 = ไม่จำกัด
  max_employees: number      // -1 = ไม่จำกัด
  max_shifts_per_branch: number  // -1 = ไม่จำกัด
  max_managers: number       // -1 = ไม่จำกัด
}

export interface PlanFeatures {
  leave_management: boolean    // จัดการวันลา
  ot_management: boolean       // จัดการ OT
  announcement: boolean        // ประกาศ
  report_export: boolean       // Export รายงาน
  fine_system: boolean         // ระบบค่าปรับ
  multi_shift: boolean         // หลายกะต่อวัน
  leave_balance: boolean       // โควต้าวันลา
  line_oa: boolean             // Line OA Integration
  gps_checkin: boolean         // เช็คอิน GPS
  feedback: boolean            // ระบบ Feedback
}

export interface PlanConfig {
  plan: TenantPlan
  label: string
  price_monthly: number        // 0 = custom / ติดต่อเรา
  limits: PlanLimits
  features: PlanFeatures
  color: string
  bg: string
}

export interface AttendanceLogRow {
  date: string          // YYYY-MM-DD
  day_th: string        // จ,อ,พ,พฤ,ศ,ส,อา
  shift_no: number | null
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  late_minutes: number
  fine: number
  note: string
}

export type WeeklyOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface WeeklyOffBooking {
  id: string
  employee_id: string
  full_name: string
  nickname: string
  branch_name: string
  week_start: string   // YYYY-MM-DD (Monday of that week)
  day_of_week: number  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  status: WeeklyOffStatus
  created_at: string
}
