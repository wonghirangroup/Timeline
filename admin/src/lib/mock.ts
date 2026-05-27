// admin/src/lib/mock.ts
import type { Branch, Department, Employee, AttendanceRow, ReportRow, CalendarEvent, BranchSettings, GlobalSettings, OtRequest, ShiftDef, AnnouncementItem, FeedbackItem, LeaveRequest, LeaveBalance, Tenant, TenantLineConfig, FineRule, AttendanceLogRow, AttendanceStatus, PlanConfig, Invoice, WeeklyOffBooking, ShiftAssignment, ShiftAssignmentType } from '../types'

// ── Departments ───────────────────────────────────────────────────────────────
export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'dep-01', code: '01', name: 'ผู้บริหาร' },
  { id: 'dep-02', code: '02', name: 'Office' },
  { id: 'dep-03', code: '03', name: 'พนักงานขาย' },
  { id: 'dep-04', code: '04', name: 'พนักงานขนส่ง' },
]

// ── Branches ─────────────────────────────────────────────────────────────────
export const MOCK_BRANCHES: Branch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ',                    address: 'X4X9+QG ตำบล หมื่นไวย อำเภอเมืองนครราชสีมา นครราชสีมา',                            lat: 14.999537444372937, lng: 102.11878106968074, employee_count: 21, radius_m: 150 },
  { id: 'br-02', name: 'ฟุ๊ดโรห์ แม่กิมเฮง',           address: '173 ถ. สุรนารี ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000',                  lat: 14.976407395813236, lng: 102.0953132316107,  employee_count: 2,  radius_m: 150 },
  { id: 'br-03', name: 'ฟุ๊ดโรห์ ตลาดย่าโม',           address: 'X3GH+PMW ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000',                        lat: 14.976832134706047, lng: 102.07916957731089, employee_count: 2,  radius_m: 150 },
  { id: 'br-04', name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก',        address: '99 ถ. สวนหมาก อำเภอเมืองนครราชสีมา นครราชสีมา 30000',                               lat: 14.9723,            lng: 102.1012,           employee_count: 6,  radius_m: 150 },
  { id: 'br-05', name: 'ME Group Enterprise Co., Ltd.', address: '500 ถ. มิตรภาพ อำเภอเมืองนครราชสีมา นครราชสีมา 30000',                               lat: 14.9801,            lng: 102.0935,           employee_count: 0,  radius_m: 200 },
  { id: 'br-06', name: 'ฟุ๊ดโรห์ เทิดไท',             address: '12 ถ. เทิดไท ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000',                     lat: 14.9634,            lng: 102.1143,           employee_count: 2,  radius_m: 150 },
]

// ── Employees ─────────────────────────────────────────────────────────────────
export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e01', code: '58-01-001', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',      department: 'แผนกผู้บริหาร / กรรมการ', branches: ['วงษ์หิรัญ'],                                             phone: '0891234561', hire_date: '2015-01-01', status: 'ACTIVE',   line_user_id: 'Ua1b2c3d4e5f6789012345678901234ab', pay_type: 'MONTHLY' },
  { id: 'e02', code: '58-01-002', full_name: 'เกาไพรรา หิรัญประทีป',   nickname: 'ที่จิ๋ว',   department: 'แผนกผู้บริหาร / กรรมการ', branches: ['วงษ์หิรัญ'],                                             phone: '0891234562', hire_date: '2015-01-01', status: 'ACTIVE',   line_user_id: 'Ub2c3d4e5f6789012345678901234abcd', pay_type: 'MONTHLY' },
  { id: 'e03', code: '59-03-001', full_name: 'ศุภนุช จึงอนุวัตร',      nickname: 'พิม',       department: 'พนักงานขาย',              branches: ['วงษ์หิรัญ', 'ฟุ๊ดโรห์ ไนท์สวนหมาก'],                  phone: '0891234563', hire_date: '2016-07-01', status: 'ACTIVE',   line_user_id: 'Uc3d4e5f6789012345678901234abcde', pay_type: 'MONTHLY' },
  { id: 'e04', code: '60-03-001', full_name: 'นวลละออ โพธิ์สูงเนิน',   nickname: 'ปุ้ย',      department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ ไนท์สวนหมาก'],                                 phone: '0891234564', hire_date: '2017-01-04', status: 'ACTIVE',   line_user_id: 'Ud4e5f6789012345678901234abcdef1', pay_type: 'MONTHLY' },
  { id: 'e05', code: '63-03-001', full_name: 'มณเฑียร สว่างเมฆ',       nickname: 'เฟิร์ส',   department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ แม่กิมเฮง', 'ฟุ๊ดโรห์ ไนท์สวนหมาก'],          phone: '0891234565', hire_date: '2020-11-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'HOURLY',  hourly_rate: 65 },
  { id: 'e06', code: '63-04-001', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',       department: 'พนักงานขนส่ง',            branches: ['วงษ์หิรัญ', 'ฟุ๊ดโรห์ ไนท์สวนหมาก'],                  phone: '0891234566', hire_date: '2020-02-17', status: 'ACTIVE',   line_user_id: 'Uf6789012345678901234abcdef12345', pay_type: 'MONTHLY' },
  { id: 'e07', code: '64-02-001', full_name: 'อมรรัตน์ โชติมณี',       nickname: 'ปิ๊ว',      department: 'Office',                  branches: ['วงษ์หิรัญ'],                                             phone: '0891234567', hire_date: '2021-09-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'MONTHLY' },
  { id: 'e08', code: '65-03-001', full_name: 'สนธิญา เลื่อนกระโทก',   nickname: 'มิลส์',    department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ แม่กิมเฮง', 'ฟุ๊ดโรห์ ไนท์สวนหมาก', 'วงษ์หิรัญ'], phone: '0891234568', hire_date: '2022-01-11', status: 'ACTIVE',   line_user_id: 'Ug789012345678901234abcdef123456', pay_type: 'MONTHLY' },
  { id: 'e09', code: '66-03-001', full_name: 'ปัทมา ปลั่งกลาง',        nickname: 'แพร',       department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ ตลาดย่าโม'],                                   phone: '0891234569', hire_date: '2023-03-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'MONTHLY' },
  { id: 'e10', code: '67-03-002', full_name: 'ลัดดาวัลย์ ปอกระโทก',   nickname: 'แป้ว',      department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ เทิดไท'],                                      phone: '0891234570', hire_date: '2024-01-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'DAILY' },
  { id: 'e11', code: '59-03-001', full_name: 'ศุภนุช จึงอนุวัตร',      nickname: 'พิม',       department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ ไนท์สวนหมาก'],                                 phone: '0891234571', hire_date: '2016-07-01', status: 'ACTIVE',   line_user_id: 'Uh89012345678901234abcdef1234567', pay_type: 'MONTHLY' },
  { id: 'e12', code: '68-03-004', full_name: 'ณัฐธิชา พิมพ์สระเกตุ',  nickname: 'สมาย',     department: 'พนักงานขาย',              branches: ['วงษ์หิรัญ'],                                             phone: '0891234572', hire_date: '2025-01-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'DAILY' },
  { id: 'e13', code: '68-03-006', full_name: 'ศรัญญา ถาวิชัย',         nickname: 'น้ำ สาขา', department: 'พนักงานขาย',              branches: ['ฟุ๊ดโรห์ ไนท์สวนหมาก'],                                 phone: '0891234573', hire_date: '2025-03-01', status: 'ACTIVE',   line_user_id: null,                                pay_type: 'HOURLY', hourly_rate: 60 },
]

// ── Today Attendance ──────────────────────────────────────────────────────────
export const MOCK_TODAY_ATTENDANCE: AttendanceRow[] = [
  { id: 'a01', code: '68-03-006', full_name: 'ศรัญญา ถาวิชัย',        nickname: 'น้ำ สาขา',  branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', shift_no: 1, check_in_time: '09:55', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a02', code: '66-03-001', full_name: 'ปัทมา ปลั่งกลาง',       nickname: 'แพร',        branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   shift_no: 1, check_in_time: '09:47', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a03', code: '67-03-002', full_name: 'ลัดดาวัลย์ ปอกระโทก',  nickname: 'แป้ว',       branch_name: 'ฟุ๊ดโรห์ เทิดไท',       shift_no: 1, check_in_time: '09:45', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a04', code: '63-04-001', full_name: 'สิรีธร จึงอนุวัตร',     nickname: 'กุล',        branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', shift_no: 2, check_in_time: '09:10', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a05', code: '59-03-001', full_name: 'ศุภนุช จึงอนุวัตร',     nickname: 'พิม',        branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', shift_no: 2, check_in_time: '09:09', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a06', code: '68-03-004', full_name: 'ณัฐธิชา พิมพ์สระเกตุ', nickname: 'สมาย',       branch_name: 'วงษ์หิรัญ',             shift_no: 1, check_in_time: '08:05', check_out_time: null, status: 'LATE_1',  fine: 20 },
  { id: 'a07', code: '58-01-001', full_name: 'ชาตรี วงษ์วิบูลย์สิน', nickname: 'ตอง',        branch_name: 'วงษ์หิรัญ',             shift_no: 1, check_in_time: null,    check_out_time: null, status: 'MANAGER', fine: 0 },
  { id: 'a08', code: '58-01-002', full_name: 'เกาไพรรา หิรัญประทีป',  nickname: 'ที่จิ๋ว',    branch_name: 'วงษ์หิรัญ',             shift_no: 1, check_in_time: null,    check_out_time: null, status: 'MANAGER', fine: 0 },
  { id: 'a09', code: '60-03-001', full_name: 'นวลละออ โพธิ์สูงเนิน',  nickname: 'ปุ้ย',       branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', shift_no: 1, check_in_time: '07:59', check_out_time: null, status: 'ON_TIME', fine: 0 },
  { id: 'a10', code: '63-03-001', full_name: 'มณเฑียร สว่างเมฆ',      nickname: 'เฟิร์ส',    branch_name: 'ฟุ๊ดโรห์ แม่กิมเฮง',    shift_no: 1, check_in_time: null,    check_out_time: null, status: 'LEAVE',   fine: 0 },
  { id: 'a11', code: '64-02-001', full_name: 'อมรรัตน์ โชติมณี',      nickname: 'ปิ๊ว',       branch_name: 'วงษ์หิรัญ',             shift_no: 1, check_in_time: null,    check_out_time: null, status: 'VACATION',fine: 0 },
  { id: 'a12', code: '65-03-001', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',      branch_name: 'วงษ์หิรัญ',             shift_no: 1, check_in_time: '08:00', check_out_time: null, status: 'ON_TIME', fine: 0 },
]

// ── Report ────────────────────────────────────────────────────────────────────
export const MOCK_REPORT: ReportRow[] = MOCK_EMPLOYEES.slice(0, 10).map((e, i) => ({
  id: e.id,
  code: e.code,
  full_name: e.full_name,
  nickname: e.nickname,
  branch_name: e.branches[0],
  work_days: [0, 0, 14, 12, 10, 13, 8, 11, 9, 15][i] ?? 0,
  late_days: [0, 0, 0, 1, 2, 0, 1, 3, 0, 1][i] ?? 0,
  absent_days: [0, 0, 11, 3, 2, 4, 8, 2, 5, 1][i] ?? 0,
  leave_days: [0, 0, 6, 2, 1, 0, 3, 1, 2, 0][i] ?? 0,
  fine_late: [0, 0, 0, 20, 40, 0, 20, 60, 0, 20][i] ?? 0,
  fine_absent: [0, 0, 550, 150, 100, 200, 400, 100, 250, 50][i] ?? 0,
  total_fine: [0, 0, 550, 170, 140, 200, 420, 160, 250, 70][i] ?? 0,
}))

// ── Calendar Events ───────────────────────────────────────────────────────────
const weeklyOffNicknames = ['จุ๋ม', 'มิลส์', 'บี', 'ปุ้ย', 'กุล', 'เฟิร์ส', 'แพร', 'แป้ว', 'สมาย', 'น้ำ สาขา', 'พิม', 'มก', 'เม่น', 'ใบเตย', 'สมคิด', 'มะปราง']

function genCalendarEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const yr = 2026
  const mo = 5 // May (1-based)

  const daysInMonth = new Date(yr, mo, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(yr, mo - 1, d)
    const dow = date.getDay() // 0=Sun
    const dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // Weekly off pattern per nickname
    weeklyOffNicknames.forEach((nick, idx) => {
      const offDay = (idx % 7) // 0=Sun
      if (dow === offDay || (dow + 1) % 7 === offDay) {
        events.push({ date: dateStr, nickname: nick, type: 'WEEKLY_OFF' })
      }
    })
  }

  // Add specific leaves
  events.push({ date: '2026-05-20', nickname: 'ปิ๊ว', type: 'VACATION' })
  events.push({ date: '2026-05-18', nickname: 'ปิ๊ว', type: 'VACATION' })
  events.push({ date: '2026-05-19', nickname: 'ปิ๊ว', type: 'VACATION' })
  events.push({ date: '2026-05-10', nickname: 'เฟิร์ส', type: 'SICK' })
  events.push({ date: '2026-05-15', nickname: 'แพร', type: 'PERSONAL' })
  events.push({ date: '2026-05-01', nickname: 'ทุกคน', type: 'HOLIDAY' })

  return events
}

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = genCalendarEvents()

// ── Settings ──────────────────────────────────────────────────────────────────
export const MOCK_BRANCH_SETTINGS: BranchSettings = {
  branch_id: 'br-01',
  branch_name: 'วงษ์หิรัญ',
  use_shift_2: true,
  shifts: [
    { shift_no: 1, start_time: '08:00', end_time: '18:00', late_threshold_1: '08:05', late_threshold_2: '08:20', min_checkout: '17:55' },
    { shift_no: 2, start_time: '09:00', end_time: '19:00', late_threshold_1: '09:05', late_threshold_2: '09:20', min_checkout: '18:55' },
  ],
}

export const MOCK_GLOBAL_SETTINGS: GlobalSettings = {
  fine_late_1: 20,
  fine_late_2: 50,
  fine_absent: 50,
  radius_m: 150,
}

// ── Fine Rule (default: tier mode ตามตัวอย่างที่กำหนด) ────────────────────────
export const MOCK_FINE_RULE: FineRule = {
  mode: 'tier',
  tiers: [
    { id: 'ft-1', from_minute: 1,  to_minute: 15,   fine_amount: 20,  count_as_absent: false, next_day_fine: 0  },
    { id: 'ft-2', from_minute: 16, to_minute: 30,   fine_amount: 50,  count_as_absent: false, next_day_fine: 0  },
    { id: 'ft-3', from_minute: 31, to_minute: null,  fine_amount: 0,   count_as_absent: true,  next_day_fine: 50 },
  ],
  per_minute_rate: 2,
  per_minute_max: 200,
}

// ── OT Requests ───────────────────────────────────────────────────────────────
export const MOCK_OT_REQUESTS: OtRequest[] = [
  // ── OT เดือนก่อนหน้า ────────────────────────────────────────────────────
  { id: 'ot-01', employee_id: 'e03', full_name: 'ศุภนุช จึงอนุวัตร',     nickname: 'พิม',   branch_name: 'วงษ์หิรัญ',             date: '2026-05-15', start_time: '17:00', end_time: '19:00', hours: 2,   multiplier: 1.5, amount: 0, note: 'ปิดงบประจำเดือน',    status: 'APPROVED' },
  { id: 'ot-02', employee_id: 'e04', full_name: 'นวลละออ โพธิ์สูงเนิน', nickname: 'ปุ้ย',   branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-17', start_time: '17:00', end_time: '18:30', hours: 1.5, multiplier: 1.5, amount: 0, note: 'จัดสต็อกสินค้า',    status: 'PENDING'  },
  { id: 'ot-03', employee_id: 'e09', full_name: 'ปัทมา ปลั่งกลาง',      nickname: 'แพร',    branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   date: '2026-05-12', start_time: '18:00', end_time: '20:00', hours: 2,   multiplier: 1.5, amount: 0, note: 'ประชุมยอดขาย',       status: 'REJECTED' },
  { id: 'ot-04', employee_id: 'e12', full_name: 'ณัฐธิชา พิมพ์สระเกตุ', nickname: 'สมาย',  branch_name: 'วงษ์หิรัญ',             date: '2026-05-16', start_time: '17:00', end_time: '19:00', hours: 2,   multiplier: 2.0, amount: 0, note: 'วันหยุด OT x2',     status: 'PENDING'  },
  // ── สัปดาห์นี้ (25–31 พ.ค. 2569) — สำหรับแสดง OT Cap Warning ──────────
  // ตอง — 24 ชม. อนุมัติแล้ว (🟡 ใกล้จะถึง)
  { id: 'ot-05', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',   branch_name: 'วงษ์หิรัญ',             date: '2026-05-25', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'ปิดงบไตรมาส',        status: 'APPROVED' },
  { id: 'ot-06', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',   branch_name: 'วงษ์หิรัญ',             date: '2026-05-26', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'ปิดงบไตรมาส',        status: 'APPROVED' },
  { id: 'ot-07', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',   branch_name: 'วงษ์หิรัญ',             date: '2026-05-27', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'ปิดงบไตรมาส',        status: 'APPROVED' },
  { id: 'ot-08', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',   branch_name: 'วงษ์หิรัญ',             date: '2026-05-28', start_time: '17:00', end_time: '22:00', hours: 5,   multiplier: 1.5, amount: 0, note: 'ปิดงบไตรมาส',        status: 'PENDING'  },
  // กุล — 36 ชม. อนุมัติแล้ว (🔴 เกินขีดจำกัด!)
  { id: 'ot-09', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-25', start_time: '02:00', end_time: '12:00', hours: 10,  multiplier: 2.0, amount: 0, note: 'กะดึกสาขาไนท์',      status: 'APPROVED' },
  { id: 'ot-10', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-26', start_time: '02:00', end_time: '12:00', hours: 10,  multiplier: 2.0, amount: 0, note: 'กะดึกสาขาไนท์',      status: 'APPROVED' },
  { id: 'ot-11', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-27', start_time: '02:00', end_time: '12:00', hours: 10,  multiplier: 2.0, amount: 0, note: 'กะดึกสาขาไนท์',      status: 'APPROVED' },
  { id: 'ot-12', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-28', start_time: '02:00', end_time: '08:00', hours: 6,   multiplier: 2.0, amount: 0, note: 'กะดึกสาขาไนท์',      status: 'APPROVED' },
  { id: 'ot-13', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', date: '2026-05-29', start_time: '02:00', end_time: '06:00', hours: 4,   multiplier: 2.0, amount: 0, note: 'กะดึกสาขาไนท์',      status: 'PENDING'  },
  // มิลส์ — 24 ชม. อนุมัติแล้ว (🟡 ใกล้จะถึง)
  { id: 'ot-14', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',  branch_name: 'วงษ์หิรัญ',             date: '2026-05-25', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'จัดงาน Promotion',    status: 'APPROVED' },
  { id: 'ot-15', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',  branch_name: 'วงษ์หิรัญ',             date: '2026-05-26', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'จัดงาน Promotion',    status: 'APPROVED' },
  { id: 'ot-16', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',  branch_name: 'วงษ์หิรัญ',             date: '2026-05-27', start_time: '17:00', end_time: '01:00', hours: 8,   multiplier: 1.5, amount: 0, note: 'จัดงาน Promotion',    status: 'APPROVED' },
  { id: 'ot-17', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',  branch_name: 'วงษ์หิรัญ',             date: '2026-05-28', start_time: '17:00', end_time: '21:00', hours: 4,   multiplier: 1.5, amount: 0, note: 'จัดงาน Promotion',    status: 'PENDING'  },
]

// ── Shifts ────────────────────────────────────────────────────────────────────
export const MOCK_SHIFTS: ShiftDef[] = [
  { id: 'sh-01', name: 'กะเช้า', branch_name: 'วงษ์หิรัญ',             start_time: '08:00', end_time: '17:00', late_threshold_1: '08:05', late_threshold_2: '08:20', employee_count: 8  },
  { id: 'sh-02', name: 'กะบ่าย', branch_name: 'วงษ์หิรัญ',             start_time: '13:00', end_time: '22:00', late_threshold_1: '13:05', late_threshold_2: '13:20', employee_count: 3  },
  { id: 'sh-03', name: 'กะเช้า', branch_name: 'ฟุ๊ดโรห์ แม่กิมเฮง',   start_time: '09:00', end_time: '18:00', late_threshold_1: '09:05', late_threshold_2: '09:30', employee_count: 2  },
  { id: 'sh-04', name: 'กะเช้า', branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   start_time: '09:00', end_time: '18:00', late_threshold_1: '09:05', late_threshold_2: '09:30', employee_count: 2  },
  { id: 'sh-05', name: 'กะกลางคืน', branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', start_time: '17:00', end_time: '02:00', late_threshold_1: '17:05', late_threshold_2: '17:30', employee_count: 6  },
  { id: 'sh-06', name: 'กะเช้า', branch_name: 'ฟุ๊ดโรห์ เทิดไท',      start_time: '09:00', end_time: '18:00', late_threshold_1: '09:05', late_threshold_2: '09:30', employee_count: 2  },
]

// ── Announcements ─────────────────────────────────────────────────────────────
export const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  { id: 'ann-01', title: 'แจ้งปิดระบบวันหยุดสงกรานต์', body: 'ระบบจะปิดให้บริการในวันที่ 13-15 เมษายน 2569 กรุณาเช็คอินก่อน 12:00 น. ของวันที่ 12', sent_at: '2026-04-10T09:00:00', target: 'all', sent_count: 27 },
  { id: 'ann-02', title: 'ประกาศการจ่ายโบนัสประจำปี',    body: 'บริษัทจะจ่ายโบนัสในวันที่ 30 พฤษภาคม 2569 กรุณาตรวจสอบเลขบัญชีของท่านให้ถูกต้อง',       sent_at: '2026-05-01T10:00:00', target: 'all', sent_count: 27 },
  { id: 'ann-03', title: 'ซ้อมดับเพลิงประจำปี',          body: 'วันที่ 20 พฤษภาคม 2569 เวลา 14:00 น. ขอให้พนักงานทุกท่านเข้าร่วมการซ้อมดับเพลิง',         sent_at: '2026-05-15T08:00:00', target: 'วงษ์หิรัญ', sent_count: 21 },
]

// ── Leave Requests (admin view) ───────────────────────────────────────────────
export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lv-01', full_name: 'สนธิญา เลื่อนกระโทก', nickname: 'มิลส์',  branch_name: 'วงษ์หิรัญ',             leave_type: 'ลากิจ',       leave_type_color: '#8b5cf6', start_date: '2026-05-20', end_date: '2026-05-20', days: 1,   half_day_period: null, reason: 'ธุระส่วนตัว',        status: 'PENDING',  created_at: '2026-05-18T09:00:00' },
  { id: 'lv-02', full_name: 'ปัทมา ปลั่งกลาง',      nickname: 'แพร',    branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   leave_type: 'ลาป่วย',      leave_type_color: '#16a34a', start_date: '2026-05-10', end_date: '2026-05-10', days: 1,   half_day_period: null, reason: 'ไม่สบาย มีไข้',      status: 'APPROVED', created_at: '2026-05-09T18:00:00' },
  { id: 'lv-03', full_name: 'อมรรัตน์ โชติมณี',     nickname: 'ปิ๊ว',   branch_name: 'วงษ์หิรัญ',             leave_type: 'ลาพักร้อน',   leave_type_color: '#d97706', start_date: '2026-05-18', end_date: '2026-05-20', days: 3,   half_day_period: null, reason: 'ท่องเที่ยวครอบครัว', status: 'APPROVED', created_at: '2026-05-01T10:00:00' },
  { id: 'lv-04', full_name: 'มณเฑียร สว่างเมฆ',     nickname: 'เฟิร์ส', branch_name: 'ฟุ๊ดโรห์ แม่กิมเฮง',   leave_type: 'ลาป่วย',      leave_type_color: '#16a34a', start_date: '2026-05-10', end_date: '2026-05-10', days: 1,   half_day_period: null, reason: 'หมอนัด',             status: 'PENDING',  created_at: '2026-05-09T07:00:00' },
  { id: 'lv-05', full_name: 'ลัดดาวัลย์ ปอกระโทก',  nickname: 'แป้ว',   branch_name: 'ฟุ๊ดโรห์ เทิดไท',       leave_type: 'ลากิจ',       leave_type_color: '#8b5cf6', start_date: '2026-05-15', end_date: '2026-05-15', days: 1,   half_day_period: null, reason: 'ต่อทะเบียนรถ',       status: 'REJECTED', created_at: '2026-05-14T08:00:00' },
  { id: 'lv-06', full_name: 'ณัฐธิชา พิมพ์สระเกตุ', nickname: 'สมาย',   branch_name: 'วงษ์หิรัญ',             leave_type: 'ลาครึ่งวัน',  leave_type_color: '#0891b2', start_date: '2026-05-21', end_date: '2026-05-21', days: 0.5, half_day_period: 'AM',  reason: 'นัดหมอช่วงเช้า',     status: 'PENDING',  created_at: '2026-05-19T08:30:00' },
  { id: 'lv-07', full_name: 'สิรีธร จึงอนุวัตร',    nickname: 'กุล',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', leave_type: 'ลาครึ่งวัน',  leave_type_color: '#0891b2', start_date: '2026-05-22', end_date: '2026-05-22', days: 0.5, half_day_period: 'PM',  reason: 'ธุระบ่าย',            status: 'APPROVED', created_at: '2026-05-19T09:00:00' },
]

// ── Leave Balances ────────────────────────────────────────────────────────────
export const MOCK_LEAVE_BALANCES: LeaveBalance[] = [
  { employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',   nickname: 'ตอง',     branch_name: 'วงษ์หิรัญ',             sick_used: 0, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 0,  vacation_quota: 10, compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e02', full_name: 'เกาไพรรา หิรัญประทีป',   nickname: 'ที่จิ๋ว',  branch_name: 'วงษ์หิรัญ',             sick_used: 0, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 0,  vacation_quota: 10, compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e03', full_name: 'ศุภนุช จึงอนุวัตร',      nickname: 'พิม',     branch_name: 'วงษ์หิรัญ',             sick_used: 2, sick_quota: 30, personal_used: 1, personal_quota: 3, vacation_used: 4,  vacation_quota: 10, compensate_used: 1, compensate_quota: 2 },
  { employee_id: 'e04', full_name: 'นวลละออ โพธิ์สูงเนิน',   nickname: 'ปุ้ย',    branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', sick_used: 3, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 2,  vacation_quota: 7,  compensate_used: 0, compensate_quota: 1 },
  { employee_id: 'e05', full_name: 'มณเฑียร สว่างเมฆ',       nickname: 'เฟิร์ส',  branch_name: 'ฟุ๊ดโรห์ แม่กิมเฮง',   sick_used: 5, sick_quota: 30, personal_used: 2, personal_quota: 3, vacation_used: 0,  vacation_quota: 6,  compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',      nickname: 'กุล',     branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', sick_used: 1, sick_quota: 30, personal_used: 1, personal_quota: 3, vacation_used: 5,  vacation_quota: 7,  compensate_used: 2, compensate_quota: 3 },
  { employee_id: 'e07', full_name: 'อมรรัตน์ โชติมณี',       nickname: 'ปิ๊ว',    branch_name: 'วงษ์หิรัญ',             sick_used: 0, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 3,  vacation_quota: 6,  compensate_used: 0, compensate_quota: 1 },
  { employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',   nickname: 'มิลส์',   branch_name: 'วงษ์หิรัญ',             sick_used: 4, sick_quota: 30, personal_used: 1, personal_quota: 3, vacation_used: 1,  vacation_quota: 6,  compensate_used: 0, compensate_quota: 2 },
  { employee_id: 'e09', full_name: 'ปัทมา ปลั่งกลาง',        nickname: 'แพร',     branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   sick_used: 1, sick_quota: 30, personal_used: 1, personal_quota: 3, vacation_used: 0,  vacation_quota: 5,  compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e10', full_name: 'ลัดดาวัลย์ ปอกระโทก',   nickname: 'แป้ว',    branch_name: 'ฟุ๊ดโรห์ เทิดไท',       sick_used: 2, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 0,  vacation_quota: 3,  compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e12', full_name: 'ณัฐธิชา พิมพ์สระเกตุ',  nickname: 'สมาย',    branch_name: 'วงษ์หิรัญ',             sick_used: 0, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 0,  vacation_quota: 3,  compensate_used: 0, compensate_quota: 0 },
  { employee_id: 'e13', full_name: 'ศรัญญา ถาวิชัย',         nickname: 'น้ำ สาขา',branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', sick_used: 0, sick_quota: 30, personal_used: 0, personal_quota: 3, vacation_used: 0,  vacation_quota: 3,  compensate_used: 0, compensate_quota: 0 },
]

// ── Tenants (Super Admin view) ────────────────────────────────────────────────
export const MOCK_TENANTS: Tenant[] = [
  { id: 'tn-01', name: 'วงษ์หิรัญ กรุ๊ป',              owner_name: 'ชาตรี วงษ์วิบูลย์สิน',  owner_email: 'chatre@wonghiran.com',   plan: 'ENTERPRISE',   status: 'ACTIVE',    branch_count: 6,  employee_count: 21, created_at: '2024-01-15', expires_at: null,         line_configured: true  },
  { id: 'tn-02', name: 'ร้านอาหารมหาชัย',               owner_name: 'สมชาย มหาชัย',           owner_email: 'somchai@mahachai.co.th', plan: 'PROFESSIONAL', status: 'ACTIVE',    branch_count: 3,  employee_count: 15, created_at: '2024-03-01', expires_at: '2027-03-01', line_configured: true  },
  { id: 'tn-03', name: 'คลินิกสุขภาพดี',                owner_name: 'แพทย์หญิงนภา รักดี',    owner_email: 'napa@sukkhaphadee.com',  plan: 'PROFESSIONAL', status: 'ACTIVE',    branch_count: 2,  employee_count: 12, created_at: '2024-04-10', expires_at: '2027-04-10', line_configured: true  },
  { id: 'tn-04', name: 'บริษัทก่อสร้างนครราชสีมา จำกัด',owner_name: 'วิชัย นครสร้าง',         owner_email: 'wichai@nakhonsang.com',  plan: 'STARTER',      status: 'SUSPENDED', branch_count: 1,  employee_count: 8,  created_at: '2023-11-05', expires_at: '2026-11-05', line_configured: false },
  { id: 'tn-05', name: 'ร้านกาแฟดอยตุง สาขาโคราช',     owner_name: 'สุภาพร ชาวไร่',          owner_email: 'supaporn@doitung.com',   plan: 'STARTER',      status: 'TRIAL',     branch_count: 1,  employee_count: 5,  created_at: '2026-05-01', expires_at: '2026-06-01', line_configured: false },
  { id: 'tn-06', name: 'ห้างสรรพสินค้าสยามโคราช',       owner_name: 'ประวิทย์ สยามไทย',       owner_email: 'prawit@siamkorat.com',   plan: 'ENTERPRISE',   status: 'ACTIVE',    branch_count: 4,  employee_count: 42, created_at: '2024-06-20', expires_at: null,         line_configured: true  },
  { id: 'tn-07', name: 'โรงแรมพักดีมีสุข',              owner_name: 'อรพิน พักดี',            owner_email: 'orapin@pakdeemisuk.com', plan: 'PROFESSIONAL', status: 'TRIAL',     branch_count: 1,  employee_count: 18, created_at: '2026-04-15', expires_at: '2026-05-15', line_configured: false },
  { id: 'tn-08', name: 'บริษัทขนส่งอีสาน จำกัด',        owner_name: 'สมศักดิ์ ขนส่งดี',      owner_email: 'somsak@isaantrans.com',  plan: 'STARTER',      status: 'ACTIVE',    branch_count: 2,  employee_count: 9,  created_at: '2025-02-10', expires_at: '2027-02-10', line_configured: true  },
]

export const MOCK_LINE_CONFIGS: TenantLineConfig[] = [
  { tenant_id: 'tn-01', line_channel_id: '2006123456', line_channel_secret: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', liff_id: '2006123456-AbCdEfGh', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-01', verified: true  },
  { tenant_id: 'tn-02', line_channel_id: '2006789012', line_channel_secret: 'q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6', liff_id: '2006789012-IjKlMnOp', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-02', verified: true  },
  { tenant_id: 'tn-03', line_channel_id: '2006345678', line_channel_secret: 'z1x2c3v4b5n6m7q8w9e0r1t2y3u4i5o6', liff_id: '2006345678-QrStUvWx', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-03', verified: true  },
  { tenant_id: 'tn-06', line_channel_id: '2006901234', line_channel_secret: 'p1a2s3d4f5g6h7j8k9l0z1x2c3v4b5n6', liff_id: '2006901234-YzAbCdEf', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-06', verified: true  },
  { tenant_id: 'tn-08', line_channel_id: '2006567890', line_channel_secret: 'm1n2b3v4c5x6z7l8k9j0h1g2f3d4s5a6', liff_id: '2006567890-GhIjKlMn', webhook_url: 'https://api.timeline.app/api/v1/line/webhook/tn-08', verified: false },
]

// ── Invoices / Billing ────────────────────────────────────────────────────────
export const MOCK_INVOICES: Invoice[] = [
  // วงษ์หิรัญ — Enterprise (ไม่หมดอายุ, จ่ายรายปี)
  { id: 'inv-001', tenant_id: 'tn-01', tenant_name: 'วงษ์หิรัญ กรุ๊ป',              plan: 'ENTERPRISE',   amount: 0,     due_date: '2026-01-15', paid_date: '2026-01-10', status: 'PAID',      period_start: '2026-01-15', period_end: '2027-01-14', note: 'ชำระรายปี / Custom pricing' },
  // ร้านอาหารมหาชัย — Professional
  { id: 'inv-002', tenant_id: 'tn-02', tenant_name: 'ร้านอาหารมหาชัย',               plan: 'PROFESSIONAL', amount: 2490,  due_date: '2026-05-01', paid_date: '2026-04-28', status: 'PAID',      period_start: '2026-05-01', period_end: '2026-05-31', note: '' },
  { id: 'inv-003', tenant_id: 'tn-02', tenant_name: 'ร้านอาหารมหาชัย',               plan: 'PROFESSIONAL', amount: 2490,  due_date: '2026-06-01', paid_date: null,         status: 'PENDING',   period_start: '2026-06-01', period_end: '2026-06-30', note: '' },
  // คลินิกสุขภาพดี — Professional
  { id: 'inv-004', tenant_id: 'tn-03', tenant_name: 'คลินิกสุขภาพดี',                plan: 'PROFESSIONAL', amount: 2490,  due_date: '2026-05-10', paid_date: '2026-05-08', status: 'PAID',      period_start: '2026-05-10', period_end: '2026-06-09', note: '' },
  { id: 'inv-005', tenant_id: 'tn-03', tenant_name: 'คลินิกสุขภาพดี',                plan: 'PROFESSIONAL', amount: 2490,  due_date: '2026-06-10', paid_date: null,         status: 'PENDING',   period_start: '2026-06-10', period_end: '2026-07-09', note: '' },
  // บริษัทก่อสร้าง — Starter (ค้างชำระ / ถูกระงับ)
  { id: 'inv-006', tenant_id: 'tn-04', tenant_name: 'บริษัทก่อสร้างนครราชสีมา จำกัด', plan: 'STARTER',      amount: 990,   due_date: '2026-04-05', paid_date: null,         status: 'OVERDUE',   period_start: '2026-04-05', period_end: '2026-05-04', note: 'ค้างชำระ 50 วัน — ระบบถูกระงับ' },
  { id: 'inv-007', tenant_id: 'tn-04', tenant_name: 'บริษัทก่อสร้างนครราชสีมา จำกัด', plan: 'STARTER',      amount: 990,   due_date: '2026-05-05', paid_date: null,         status: 'OVERDUE',   period_start: '2026-05-05', period_end: '2026-06-04', note: 'ค้างชำระ 20 วัน' },
  // ร้านกาแฟดอยตุง — Trial (ยังไม่ถึงกำหนด)
  { id: 'inv-008', tenant_id: 'tn-05', tenant_name: 'ร้านกาแฟดอยตุง สาขาโคราช',      plan: 'STARTER',      amount: 990,   due_date: '2026-06-01', paid_date: null,         status: 'PENDING',   period_start: '2026-06-01', period_end: '2026-06-30', note: 'Invoice แรกหลังจบ Trial' },
  // ห้างสรรพสินค้าสยามโคราช — Enterprise
  { id: 'inv-009', tenant_id: 'tn-06', tenant_name: 'ห้างสรรพสินค้าสยามโคราช',        plan: 'ENTERPRISE',   amount: 0,     due_date: '2026-06-20', paid_date: '2026-06-18', status: 'PAID',      period_start: '2026-06-20', period_end: '2027-06-19', note: 'ต่ออายุรายปี' },
  // โรงแรมพักดีมีสุข — Trial
  { id: 'inv-010', tenant_id: 'tn-07', tenant_name: 'โรงแรมพักดีมีสุข',               plan: 'PROFESSIONAL', amount: 2490,  due_date: '2026-06-15', paid_date: null,         status: 'PENDING',   period_start: '2026-06-15', period_end: '2026-07-14', note: 'Invoice แรกหลังจบ Trial' },
  // บริษัทขนส่งอีสาน — Starter
  { id: 'inv-011', tenant_id: 'tn-08', tenant_name: 'บริษัทขนส่งอีสาน จำกัด',         plan: 'STARTER',      amount: 990,   due_date: '2026-05-10', paid_date: '2026-05-09', status: 'PAID',      period_start: '2026-05-10', period_end: '2026-06-09', note: '' },
  { id: 'inv-012', tenant_id: 'tn-08', tenant_name: 'บริษัทขนส่งอีสาน จำกัด',         plan: 'STARTER',      amount: 990,   due_date: '2026-06-10', paid_date: null,         status: 'PENDING',   period_start: '2026-06-10', period_end: '2026-07-09', note: '' },
]

// ── Plan / Package Configs ────────────────────────────────────────────────────
export const MOCK_PLAN_CONFIGS: PlanConfig[] = [
  {
    plan: 'STARTER', label: 'Starter', price_monthly: 990, color: '#374151', bg: '#f3f4f6',
    limits: { max_branches: 1, max_employees: 20, max_shifts_per_branch: 1, max_managers: 1 },
    features: {
      leave_management: true, ot_management: false, announcement: false,
      report_export: false, fine_system: false, multi_shift: false,
      leave_balance: false, line_oa: true, gps_checkin: true, feedback: false,
    },
  },
  {
    plan: 'PROFESSIONAL', label: 'Professional', price_monthly: 2490, color: '#2563eb', bg: '#dbeafe',
    limits: { max_branches: 5, max_employees: 100, max_shifts_per_branch: 2, max_managers: 5 },
    features: {
      leave_management: true, ot_management: true, announcement: true,
      report_export: true, fine_system: true, multi_shift: true,
      leave_balance: true, line_oa: true, gps_checkin: true, feedback: true,
    },
  },
  {
    plan: 'ENTERPRISE', label: 'Enterprise', price_monthly: 0, color: '#7c3aed', bg: '#ede9fe',
    limits: { max_branches: -1, max_employees: -1, max_shifts_per_branch: -1, max_managers: -1 },
    features: {
      leave_management: true, ot_management: true, announcement: true,
      report_export: true, fine_system: true, multi_shift: true,
      leave_balance: true, line_oa: true, gps_checkin: true, feedback: true,
    },
  },
]

// ── Anonymous Feedback ────────────────────────────────────────────────────────
// ── Employee Attendance Log (May 2026) ────────────────────────────────────────
const DAY_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

const LEAVE_MAP: Record<string, { status: AttendanceStatus; note: string }> = {
  'e03': { status: 'LEAVE', note: 'ลากิจ' },
  'e05': { status: 'LEAVE', note: 'ลาป่วย' },
  'e07': { status: 'VACATION', note: 'ลาพักร้อน' },
}

export function genEmployeeLog(employeeId: string, year = 2026, month = 5): AttendanceLogRow[] {
  const rows: AttendanceLogRow[] = []
  const daysInMonth = new Date(year, month, 0).getDate()

  const seed = employeeId.charCodeAt(employeeId.length - 1)

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayTh = DAY_TH[dow]

    // วันหยุดนักขัตฤกษ์ 1 พ.ค.
    if (d === 1) {
      rows.push({ date: dateStr, day_th: dayTh, shift_no: null, check_in_time: null, check_out_time: null, status: 'HOLIDAY', late_minutes: 0, fine: 0, note: 'วันแรงงานแห่งชาติ' })
      continue
    }

    // หยุดอาทิตย์ทุกคน
    if (dow === 0) {
      rows.push({ date: dateStr, day_th: dayTh, shift_no: null, check_in_time: null, check_out_time: null, status: 'SUN_OFF', late_minutes: 0, fine: 0, note: '' })
      continue
    }

    // หยุดเสาร์บางคน (seed คี่)
    if (dow === 6 && seed % 2 === 1) {
      rows.push({ date: dateStr, day_th: dayTh, shift_no: null, check_in_time: null, check_out_time: null, status: 'SAT_OFF', late_minutes: 0, fine: 0, note: '' })
      continue
    }

    // วันลาพิเศษ
    const specialLeave = LEAVE_MAP[employeeId]
    if (specialLeave && d >= 18 && d <= 20) {
      rows.push({ date: dateStr, day_th: dayTh, shift_no: 1, check_in_time: null, check_out_time: null, status: specialLeave.status, late_minutes: 0, fine: 0, note: specialLeave.note })
      continue
    }

    // ขาดงาน (ตาม seed)
    const absentDays = new Set([seed % 28 + 1, (seed * 2) % 28 + 1, (seed * 3) % 28 + 1])
    if (absentDays.has(d)) {
      rows.push({ date: dateStr, day_th: dayTh, shift_no: 1, check_in_time: null, check_out_time: null, status: 'ABSENT', late_minutes: 0, fine: 50, note: 'ขาดงาน' })
      continue
    }

    // มาสาย (ตาม seed)
    const lateMinutes = (d + seed) % 11 === 0 ? 18 : (d + seed) % 7 === 0 ? 6 : 0
    const checkInH = 8
    const checkInM = lateMinutes
    const checkInStr = `${String(checkInH).padStart(2,'0')}:${String(checkInM).padStart(2,'0')}`
    const checkOutH = 17 + ((d + seed) % 3)
    const checkOutStr = `${String(checkOutH).padStart(2,'0')}:00`

    let status: AttendanceStatus = 'ON_TIME'
    let fine = 0
    if (lateMinutes >= 16) { status = 'LATE_2'; fine = 50 }
    else if (lateMinutes >= 1) { status = 'LATE_1'; fine = 20 }

    rows.push({ date: dateStr, day_th: dayTh, shift_no: 1, check_in_time: checkInStr, check_out_time: checkOutStr, status, late_minutes: lateMinutes, fine, note: '' })
  }

  return rows
}

export const MOCK_FEEDBACKS: FeedbackItem[] = [
  { id: 'fb-01', category: 'สวัสดิการ',    message: 'อยากให้เพิ่มสวัสดิการค่าอาหารกลางวันสำหรับพนักงานที่ทำงานล่วงเวลา',                        created_at: '2026-05-17T14:00:00', branch_hint: 'วงษ์หิรัญ' },
  { id: 'fb-02', category: 'สภาพแวดล้อม', message: 'แอร์ในห้องพักบุคลากรชำรุด ควรซ่อมแซมด่วน อากาศร้อนมากทำให้ทำงานลำบาก',                      created_at: '2026-05-16T11:00:00', branch_hint: 'ไนท์สวนหมาก' },
  { id: 'fb-03', category: 'การบริหาร',   message: 'อยากให้มีการประชุมทีมสม่ำเสมอเพื่อรับทราบนโยบายและแผนงานของบริษัท',                        created_at: '2026-05-15T09:30:00', branch_hint: null },
  { id: 'fb-04', category: 'เงินเดือน',   message: 'ค่า OT ยังไม่ได้รับเป็นเวลา 2 เดือนแล้ว รบกวนตรวจสอบด้วยครับ',                              created_at: '2026-05-14T16:00:00', branch_hint: 'แม่กิมเฮง' },
  { id: 'fb-05', category: 'อื่น ๆ',      message: 'ขอบคุณผู้บริหารที่ดูแลพนักงานเป็นอย่างดีตลอดมา ขอให้บริษัทเจริญก้าวหน้ายิ่งๆ ขึ้นไป', created_at: '2026-05-13T10:00:00', branch_hint: null },
]

// ── Shift Assignments (Option B — Individual Day Assignment) ─────────────────
// week_start ใช้วันจันทร์ที่ 2026-05-25 และ 2026-06-01
function _addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function _genWeekAssignments(weekStart: string, weeklyOffOverride?: Record<string, number>): ShiftAssignment[] {
  // primary shift per employee
  const empShift: Record<string, string> = {
    e01: 'sh-01', e02: 'sh-01', e03: 'sh-01', e04: 'sh-05',
    e05: 'sh-03', e06: 'sh-01', e07: 'sh-02', e08: 'sh-01',
    e09: 'sh-04', e10: 'sh-06', e11: 'sh-05', e12: 'sh-01', e13: 'sh-05',
  }
  // weekly off day-of-week (0=Sun 1=Mon … 6=Sat), default from week1 bookings
  const defaultOffDay: Record<string, number> = {
    e01: 6, e02: 2, e03: 3, e04: 3, e05: 0, e06: 1,
    e07: 1, e08: 3, e09: 4, e10: 5, e11: 5, e12: 3, e13: 0,
  }
  const offDay = weeklyOffOverride ?? defaultOffDay
  const empIds = Object.keys(empShift)
  const out: ShiftAssignment[] = []
  empIds.forEach(empId => {
    for (let i = 0; i < 7; i++) {
      const date = _addDays(weekStart, i)
      const dow = new Date(date).getDay()
      let type: ShiftAssignmentType
      let shift_id: string | null = null
      if (dow === 0) {               // อาทิตย์ = DAY_OFF ทุกคน
        type = 'DAY_OFF'
      } else if (offDay[empId] === dow) {
        type = 'WEEKLY_OFF'
      } else {
        type = 'WORK'
        shift_id = empShift[empId]
      }
      out.push({ id: `sa-${empId}-${date}`, employee_id: empId, date, shift_id, type })
    }
  })
  return out
}

// week2 (01 Jun 2026) – ปรับ weekly-off ตาม MOCK_WEEKLY_OFF_BOOKINGS
const _week2OffDay: Record<string, number> = {
  e01: 6, e02: 2, e03: 5, e04: 1, e05: 0, e06: 1,
  e07: 1, e08: 2, e09: 4, e10: 5, e11: 5, e12: 3, e13: 0,
}

export const MOCK_SHIFT_ASSIGNMENTS: ShiftAssignment[] = [
  ..._genWeekAssignments('2026-05-25'),
  ..._genWeekAssignments('2026-06-01', _week2OffDay),
]

// ── Weekly Off Bookings ───────────────────────────────────────────────────────
// week_start = Monday of that week (YYYY-MM-DD)
// day_of_week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
export const MOCK_WEEKLY_OFF_BOOKINGS: WeeklyOffBooking[] = [
  // ── สัปดาห์นี้ (25–31 พ.ค. 2569) ────────────────────────────────────────
  { id: 'wo-01', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',  nickname: 'ตอง',     branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 6, status: 'APPROVED', created_at: '2026-05-20T10:00:00' },
  { id: 'wo-02', employee_id: 'e02', full_name: 'เกาไพรรา หิรัญประทีป',  nickname: 'ที่จิ๋ว',  branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 2, status: 'APPROVED', created_at: '2026-05-20T10:05:00' },
  { id: 'wo-03', employee_id: 'e03', full_name: 'ศุภนุช จึงอนุวัตร',     nickname: 'พิม',      branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 3, status: 'APPROVED', created_at: '2026-05-20T10:10:00' },
  { id: 'wo-04', employee_id: 'e04', full_name: 'นวลละออ โพธิ์สูงเนิน',  nickname: 'ปุ้ย',     branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', week_start: '2026-05-25', day_of_week: 3, status: 'APPROVED', created_at: '2026-05-20T10:15:00' },
  { id: 'wo-05', employee_id: 'e06', full_name: 'สิรีธร จึงอนุวัตร',     nickname: 'กุล',      branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 1, status: 'APPROVED', created_at: '2026-05-20T10:20:00' },
  { id: 'wo-06', employee_id: 'e07', full_name: 'อมรรัตน์ โชติมณี',      nickname: 'ปิ๊ว',     branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 1, status: 'PENDING',  created_at: '2026-05-21T09:00:00' },
  { id: 'wo-07', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',    branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 3, status: 'APPROVED', created_at: '2026-05-20T10:30:00' },
  { id: 'wo-08', employee_id: 'e12', full_name: 'ณัฐธิชา พิมพ์สระเกตุ', nickname: 'สมาย',     branch_name: 'วงษ์หิรัญ',             week_start: '2026-05-25', day_of_week: 3, status: 'PENDING',  created_at: '2026-05-22T14:00:00' },
  { id: 'wo-09', employee_id: 'e09', full_name: 'ปัทมา ปลั่งกลาง',       nickname: 'แพร',      branch_name: 'ฟุ๊ดโรห์ ตลาดย่าโม',   week_start: '2026-05-25', day_of_week: 4, status: 'APPROVED', created_at: '2026-05-20T11:00:00' },
  { id: 'wo-10', employee_id: 'e10', full_name: 'ลัดดาวัลย์ ปอกระโทก',  nickname: 'แป้ว',     branch_name: 'ฟุ๊ดโรห์ เทิดไท',       week_start: '2026-05-25', day_of_week: 5, status: 'APPROVED', created_at: '2026-05-20T11:10:00' },
  { id: 'wo-11', employee_id: 'e11', full_name: 'ศุภนุช จึงอนุวัตร',     nickname: 'พิม',      branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', week_start: '2026-05-25', day_of_week: 5, status: 'PENDING',  created_at: '2026-05-22T15:00:00' },
  // ── สัปดาห์หน้า (1–7 มิ.ย. 2569) ────────────────────────────────────────
  { id: 'wo-12', employee_id: 'e01', full_name: 'ชาตรี วงษ์วิบูลย์สิน',  nickname: 'ตอง',     branch_name: 'วงษ์หิรัญ',             week_start: '2026-06-01', day_of_week: 6, status: 'PENDING',  created_at: '2026-05-23T10:00:00' },
  { id: 'wo-13', employee_id: 'e03', full_name: 'ศุภนุช จึงอนุวัตร',     nickname: 'พิม',      branch_name: 'วงษ์หิรัญ',             week_start: '2026-06-01', day_of_week: 5, status: 'PENDING',  created_at: '2026-05-23T10:10:00' },
  { id: 'wo-14', employee_id: 'e08', full_name: 'สนธิญา เลื่อนกระโทก',  nickname: 'มิลส์',    branch_name: 'วงษ์หิรัญ',             week_start: '2026-06-01', day_of_week: 2, status: 'PENDING',  created_at: '2026-05-23T10:30:00' },
  { id: 'wo-15', employee_id: 'e04', full_name: 'นวลละออ โพธิ์สูงเนิน',  nickname: 'ปุ้ย',     branch_name: 'ฟุ๊ดโรห์ ไนท์สวนหมาก', week_start: '2026-06-01', day_of_week: 1, status: 'PENDING',  created_at: '2026-05-23T11:00:00' },
]
