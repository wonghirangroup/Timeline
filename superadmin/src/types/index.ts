// superadmin/src/types/index.ts
// เอาเฉพาะ type ที่ Super Admin ใช้จริง — คัดจาก admin/src/types/index.ts
//
// ⚠️ TenantStatus (ACTIVE/SUSPENDED/TRIAL) ยังไม่ตรงกับ backend จริง (Tenant.is_active
// เป็น Boolean ล้วน ไม่มี concept TRIAL/SUSPENDED แยก) — ของเดิมที่ค้างมาก่อน ยังไม่ใช่
// scope ของงานนี้ ปล่อยไว้เหมือนเดิม
//
// TenantPlan แก้แล้ว (feedback 2026-09-24) — เดิมเป็น STARTER/PROFESSIONAL/ENTERPRISE
// (ไม่มี FREE) ไม่ตรงกับ enum จริงฝั่ง backend เลย ทำให้หน้า packages/announcement
// เทียบ plan กับ tenant จริงไม่ตรงสักแถว ตอนนี้ตรงกับ Prisma enum TenantPlan แล้ว

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
export type TenantPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

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

// ── Plan / Package Management (feedback 2026-09-24 "custom package builder")
// ── ตรงกับ PackagePlan model จริงฝั่ง backend แล้ว (server/src/prisma/schema.prisma)
// — limits ตรงกับ 3 field จริงที่ Tenant มี (max_employees/max_branches/max_groups)
// เท่านั้น ตัดฟิลด์ปลอมเดิม (max_shifts_per_branch/max_managers ที่ไม่มีจริง) ออก
export interface PlanLimits {
  max_branches: number       // -1 = ไม่จำกัด
  max_employees: number      // -1 = ไม่จำกัด
  max_groups: number         // -1 = ไม่จำกัด
}

// ตรงกับ FEATURE_KEYS จริงฝั่ง backend (server/src/common/utils/features.ts) ครบ 18 ตัว
export interface PlanFeatures {
  leave_management: boolean
  leave_balance: boolean
  ot_management: boolean
  announcement: boolean
  multi_shift: boolean
  fine_system: boolean
  gps_checkin: boolean
  line_oa: boolean
  report_export: boolean
  feedback: boolean
  employee_documents: boolean
  probation: boolean
  disciplinary: boolean
  resignation: boolean
  custom_leave_types: boolean
  leave_accrual: boolean
  document_request: boolean
  vacation_policy: boolean
}

export interface PlanConfig {
  id: string
  plan: TenantPlan
  label: string
  price_monthly: number | null  // null = custom / ติดต่อเรา (เช่น Enterprise)
  limits: PlanLimits
  features: PlanFeatures
  color: string
  bg: string
}
