// employee/src/types/index.ts

export type AttendanceStatus =
  | 'ON_TIME'
  | 'LATE_1'
  | 'LATE_2'
  | 'ABSENT'
  | 'OFF_SITE'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'WEEKLY_OFF'

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type OtStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface EmployeeListItem {
  id: string
  employee_code: string
  full_name: string
  position: string
  branch_name: string
}

export interface Employee extends EmployeeListItem {
  hire_date: string
  salary_type: 'MONTHLY' | 'DAILY'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFY'
  shift: {
    name: string
    start_time: string
    end_time: string
  }
}

export interface AttendanceRecord {
  id: string
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: AttendanceStatus
  branch_name: string
  ot_hours: number
  is_manual: boolean
}

export interface LeaveBalance {
  leave_type_code: string
  leave_type: string
  used_days: number
  entitled_days: number
  color: string
}

export interface LeaveRequest {
  id: string
  leave_type: string
  leave_type_code: string
  leave_type_color: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: LeaveStatus
  approved_by?: string
  created_at: string
}

export interface OtRecord {
  id: string
  date: string
  start_time: string
  end_time: string
  hours: number
  status: OtStatus
  multiplier: number
  amount: number
  note: string
}
