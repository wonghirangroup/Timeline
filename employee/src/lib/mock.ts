// employee/src/lib/mock.ts — Mock data สำหรับ UI development (ยังไม่ต่อ API)

import type {
  Employee,
  EmployeeListItem,
  AttendanceRecord,
  LeaveBalance,
  LeaveRequest,
  OtRecord,
} from '../types'

// ── รายชื่อพนักงานทั้งหมด (สำหรับหน้า Verify) ──────────────────────────────
export const MOCK_EMPLOYEE_LIST: EmployeeListItem[] = [
  { id: 'emp-001', employee_code: '001', full_name: 'สมชาย มีสุข',    position: 'พนักงานขาย',    branch_name: 'สาขาสีลม' },
  { id: 'emp-002', employee_code: '002', full_name: 'สมหญิง ดีใจ',    position: 'แคชเชียร์',     branch_name: 'สาขาสีลม' },
  { id: 'emp-003', employee_code: '003', full_name: 'วิชัย ทองดี',    position: 'หัวหน้าแผนก',   branch_name: 'สาขาสาทร' },
  { id: 'emp-004', employee_code: '004', full_name: 'มณี รัตนา',      position: 'พนักงานบริการ', branch_name: 'สาขาสีลม' },
  { id: 'emp-005', employee_code: '005', full_name: 'ประสงค์ ใจดี',   position: 'ช่างซ่อมบำรุง', branch_name: 'สาขาสาทร' },
  { id: 'emp-006', employee_code: '006', full_name: 'จิรา สุขสันต์',  position: 'พนักงานขาย',    branch_name: 'สาขาสีลม' },
]

// ── พนักงานที่ "login" อยู่ตอนนี้ ───────────────────────────────────────────
export const MOCK_EMPLOYEE: Employee = {
  id: 'emp-001',
  employee_code: '001',
  full_name: 'สมชาย มีสุข',
  position: 'พนักงานขาย',
  branch_name: 'สาขาสีลม',
  hire_date: '2023-03-15',
  salary_type: 'MONTHLY',
  status: 'ACTIVE',
  shift: { name: 'กะเช้า', start_time: '08:00', end_time: '17:00' },
}

// ── โควต้าวันลา ─────────────────────────────────────────────────────────────
export const MOCK_LEAVE_BALANCES: LeaveBalance[] = [
  { leave_type_code: 'SICK',     leave_type: 'ลาป่วย',    used_days: 3,  entitled_days: 30, color: '#3b82f6' },
  { leave_type_code: 'PERSONAL', leave_type: 'ลากิจ',     used_days: 1,  entitled_days: 3,  color: '#8b5cf6' },
  { leave_type_code: 'VACATION', leave_type: 'ลาพักร้อน', used_days: 0,  entitled_days: 6,  color: '#f59e0b' },
]

// ── ประวัติเช็คชื่อเดือนนี้ ──────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }

const yr = 2026
const mo = 4 // 0-based → พฤษภาคม

const statusPool: AttendanceRecord['status'][] = [
  'ON_TIME', 'ON_TIME', 'ON_TIME', 'LATE_1', 'ON_TIME', 'LATE_2', 'ON_TIME',
]

export const MOCK_ATTENDANCE: AttendanceRecord[] = Array.from({ length: 18 }, (_, i) => {
  const day = i + 1
  const d = new Date(yr, mo, day)
  const dow = d.getDay()
  const dateStr = `${yr}-${pad(mo + 1)}-${pad(day)}`

  if (dow === 0 || dow === 6) {
    return { id: `att-${i}`, date: dateStr, check_in_time: null, check_out_time: null,
      status: 'WEEKLY_OFF', branch_name: 'สาขาสีลม', ot_hours: 0, is_manual: false }
  }
  if (i === 9) {
    return { id: `att-${i}`, date: dateStr, check_in_time: null, check_out_time: null,
      status: 'LEAVE', branch_name: 'สาขาสีลม', ot_hours: 0, is_manual: false }
  }

  const status = statusPool[i % statusPool.length]
  const inMin = status === 'ON_TIME' ? pad(Math.floor(Math.random() * 10))
    : status === 'LATE_1' ? pad(10 + Math.floor(Math.random() * 18))
    : pad(31 + Math.floor(Math.random() * 29))
  const otHours = i % 7 === 0 ? 2 : 0

  return {
    id: `att-${i}`,
    date: dateStr,
    check_in_time: `${dateStr}T08:${inMin}:00`,
    check_out_time: `${dateStr}T${otHours > 0 ? 19 : 17}:${pad(Math.floor(Math.random() * 30))}:00`,
    status,
    branch_name: 'สาขาสีลม',
    ot_hours: otHours,
    is_manual: i === 3,
  }
})

// ── คำขอวันลา ────────────────────────────────────────────────────────────────
export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'leave-001',
    leave_type: 'ลากิจ', leave_type_code: 'PERSONAL', leave_type_color: '#8b5cf6',
    start_date: '2026-05-20', end_date: '2026-05-20', days_count: 1,
    reason: 'ธุระส่วนตัว', status: 'PENDING',
    created_at: '2026-05-18T09:00:00',
  },
  {
    id: 'leave-002',
    leave_type: 'ลาป่วย', leave_type_code: 'SICK', leave_type_color: '#3b82f6',
    start_date: '2026-05-10', end_date: '2026-05-10', days_count: 1,
    reason: 'ไม่สบาย มีไข้', status: 'APPROVED', approved_by: 'ผู้จัดการ',
    created_at: '2026-05-09T18:00:00',
  },
  {
    id: 'leave-003',
    leave_type: 'ลาพักร้อน', leave_type_code: 'VACATION', leave_type_color: '#f59e0b',
    start_date: '2026-04-01', end_date: '2026-04-03', days_count: 3,
    reason: 'ท่องเที่ยวกับครอบครัว', status: 'APPROVED', approved_by: 'ผู้จัดการ',
    created_at: '2026-03-25T10:00:00',
  },
  {
    id: 'leave-004',
    leave_type: 'ลากิจ', leave_type_code: 'PERSONAL', leave_type_color: '#8b5cf6',
    start_date: '2026-03-15', end_date: '2026-03-15', days_count: 1,
    reason: 'ไปต่อทะเบียนรถ', status: 'REJECTED',
    created_at: '2026-03-14T08:00:00',
  },
]

// ── OT records ───────────────────────────────────────────────────────────────
export const MOCK_OT_RECORDS: OtRecord[] = [
  {
    id: 'ot-001', date: '2026-05-15', start_time: '17:00', end_time: '19:00',
    hours: 2, status: 'APPROVED', multiplier: 1.5, amount: 300,
    note: 'ปิดงบประจำเดือน',
  },
  {
    id: 'ot-002', date: '2026-05-08', start_time: '17:00', end_time: '20:00',
    hours: 3, status: 'APPROVED', multiplier: 1.5, amount: 450,
    note: 'เตรียมงาน Event',
  },
  {
    id: 'ot-003', date: '2026-05-18', start_time: '17:00', end_time: '19:30',
    hours: 2.5, status: 'PENDING', multiplier: 1.5, amount: 375,
    note: 'รอลูกค้าเซ็นสัญญา',
  },
]
