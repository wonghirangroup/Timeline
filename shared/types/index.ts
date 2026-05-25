// shared/types/index.ts

export type UserRole     = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
export type LeaveType    = 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
export type LeaveStatus  = 'PENDING' | 'APPROVED' | 'REJECTED'
export type TenantPlan   = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
export type CheckInMethod = 'LIFF' | 'WEB_FALLBACK' | 'SELFIE' | 'OFFSITE'

export interface ApiResponse<T> {
  success:    boolean
  data:       T
  message:    string
  pagination?: { page: number; limit: number; total: number }
}

export interface ApiError {
  success: false
  error:   { code: string; message: string }
}
