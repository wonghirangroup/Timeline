// superadmin/src/types/index.ts
// เอาเฉพาะ type ที่ Super Admin ใช้จริง — คัดจาก admin/src/types/index.ts
//
// ⚠️ TenantStatus/TenantPlan ที่นี่ (ACTIVE/SUSPENDED/TRIAL, STARTER/PROFESSIONAL/ENTERPRISE)
// ไม่ตรงกับ Prisma enum จริงฝั่ง backend (TenantPlan: FREE/STARTER/PRO/ENTERPRISE,
// Tenant.is_active: Boolean ไม่มี concept TRIAL/SUSPENDED) — ความไม่ตรงนี้มีอยู่ก่อนแล้ว
// ในโค้ดเดิม ยกมาเหมือนเดิมตอนแยกโฟลเดอร์ ไม่ได้แก้ไขจุดนี้

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
