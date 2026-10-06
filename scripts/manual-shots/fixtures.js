// ข้อมูลสมมติสำหรับถ่ายภาพคู่มือ — ชื่อ/สาขา/เบอร์ ทั้งหมดไม่มีอยู่จริง
const pad = n => String(n).padStart(2, '0')
const now = new Date()
const Y = now.getFullYear(), M = now.getMonth() + 1, D = now.getDate()
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const today = ymd(Y, M, D)
const iso = (d, t) => `${d}T${t}:00+07:00`
const monday = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d)); const dow = dt.getUTCDay(); dt.setUTCDate(dt.getUTCDate() - ((dow + 6) % 7)); return dt.toISOString().slice(0, 10) }

const branches = [
  { id: 'b1', branch_code: 'BKK', name: 'สาขาสุขุมวิท', location: 'ถนนสุขุมวิท กรุงเทพฯ', lat: '13.7367', lng: '100.5610', gps_radius: 200, geo_mode: 'WARN', is_active: true, created_at: '2569-01-10T00:00:00Z', group_id: 'g1', booking_enabled: null, leave_enabled: null, saturday_rule: null, sunday_rule: null, booking_quota: null, _count: { employees: 6, shifts: 2 } },
  { id: 'b2', branch_code: 'CNX', name: 'สาขาเชียงใหม่', location: 'ถนนนิมมานเหมินท์ เชียงใหม่', lat: '18.7969', lng: '98.9681', gps_radius: 150, geo_mode: 'WARN', is_active: true, created_at: '2569-02-01T00:00:00Z', group_id: 'g1', booking_enabled: null, leave_enabled: null, saturday_rule: null, sunday_rule: null, booking_quota: 5, _count: { employees: 4, shifts: 1 } },
  { id: 'b3', branch_code: 'HKT', name: 'สาขาภูเก็ต', location: 'ถนนเทพกระษัตรี ภูเก็ต', lat: '7.8804', lng: '98.3923', gps_radius: 200, geo_mode: 'BLOCK', is_active: true, created_at: '2569-03-15T00:00:00Z', group_id: 'g1', booking_enabled: null, leave_enabled: null, saturday_rule: null, sunday_rule: null, booking_quota: null, _count: { employees: 2, shifts: 1 } },
]
const people = [
  ['สมชาย', 'ใจดี', 'ชาย', 'b1', 'ผู้จัดการสาขา'], ['สมหญิง', 'รักงาน', 'หญิง', 'b1', 'พนักงานขาย'], ['ประเสริฐ', 'มั่นคง', 'เสริฐ', 'b1', 'พนักงานขาย'],
  ['วิภา', 'สุขใจ', 'วิ', 'b1', 'แคชเชียร์'], ['ธนา', 'พัฒนา', 'ธน', 'b1', 'พนักงานขนส่ง'], ['นภา', 'ศรีสุข', 'นภ', 'b1', 'พนักงานขนส่ง'],
  ['กิตติ', 'วงศ์ไทย', 'กิต', 'b2', 'ผู้จัดการสาขา'], ['มาลี', 'ดอกไม้', 'มะ', 'b2', 'พนักงานขาย'], ['อนันต์', 'สายลม', 'นัน', 'b2', 'แคชเชียร์'], ['พิมพ์', 'ใจงาม', 'พิม', 'b2', 'พนักงานขาย'],
  ['ชัย', 'ทะเลใส', 'ชัย', 'b3', 'ผู้จัดการสาขา'], ['รุ่งนภา', 'แสงทอง', 'รุ่ง', 'b3', 'พนักงานขาย'],
]
const bName = id => branches.find(b => b.id === id).name
const employees = people.map((p, i) => ({
  id: 'e' + (i + 1), employee_code: `69-0${(i % 3) + 1}-${pad(i + 1).padStart(3, '0')}`, first_name: p[0], last_name: p[1], nickname: p[2], department: null,
  phone: `08${i % 10}-${100 + i * 7}-${2000 + i * 13}`, hired_at: '2568-05-01', line_user_id: i < 10 ? 'U' + i : null, is_active: true, status: 'ACTIVE', status_reason: null,
  created_at: '2569-01-10T00:00:00Z', branch_id: p[3], branch: { id: p[3], name: bName(p[3]), group_id: 'g1' }, extra_branches: [],
  weekly_off_mode: 'MONTHLY_BATCH', position_id: 'p' + p[4], position: { id: 'p' + p[4], name: p[4] }, employee_status_type_id: null, employee_status_type: null,
  photo_url: null, default_shift_id: p[3] === 'b1' ? 's1' : p[3] === 'b2' ? 's3' : 's4',
}))
const empLite = e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name, nickname: e.nickname, employee_code: e.employee_code, branch: { id: e.branch_id, name: e.branch.name } })
const shifts = [
  { id: 's1', branch_id: 'b1', name: 'กะเช้า', start_time: '09:00', end_time: '18:00', min_checkout: null, late_threshold: 15, late_threshold_1: '09:15', late_threshold_2: '09:30', late_fine_1: '50', late_fine_2: '100', is_active: true },
  { id: 's2', branch_id: 'b1', name: 'กะบ่าย', start_time: '13:00', end_time: '22:00', min_checkout: null, late_threshold: 15, late_threshold_1: '13:15', late_threshold_2: '13:30', late_fine_1: '50', late_fine_2: '100', is_active: true },
  { id: 's3', branch_id: 'b2', name: 'กะปกติ', start_time: '09:00', end_time: '18:00', min_checkout: null, late_threshold: 15, late_threshold_1: '09:15', late_threshold_2: '09:30', late_fine_1: '50', late_fine_2: '100', is_active: true },
  { id: 's4', branch_id: 'b3', name: 'กะปกติ', start_time: '10:00', end_time: '19:00', min_checkout: null, late_threshold: 15, late_threshold_1: '10:15', late_threshold_2: '10:30', late_fine_1: '50', late_fine_2: '100', is_active: true },
]
const checkins = ['08:52', '09:03', '09:21', '08:47', '09:40', null, '08:58', '09:01', null, '09:12', '09:55', null]
const attendance = employees.map((e, i) => checkins[i] && ({
  id: 'a' + i, employee_id: e.id, shift_id: e.default_shift_id, date: today, check_in_at: iso(today, checkins[i]), check_out_at: null, check_in_method: i % 4 === 0 ? 'QR' : 'LIFF',
  is_late: checkins[i] > '09:15', late_minutes: checkins[i] > '09:15' ? 12 : 0, is_absent: false, fine: checkins[i] > '09:30' ? '100' : checkins[i] > '09:15' ? '50' : '0', carried_fine: '0',
  is_outside_area: false, is_outside_shift: false, gps_lat: 13.7367, gps_lng: 100.561, note: null, employee: empLite(e), shift: shifts.find(x => x.id === e.default_shift_id),
})).filter(Boolean)

const wk = (id, e, date, status, extra = {}) => { const dt = new Date(date + 'T00:00:00Z'); return { id, employee_id: e.id, week_start: monday(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), day_of_week: dt.getUTCDay(), status, reject_note: null, created_at: iso(today, '08:00'), employee: { ...e }, ...extra } }
const weeklyOff = [
  wk('w1', employees[1], ymd(Y, M, 11), 'PENDING'), wk('w2', employees[1], ymd(Y, M, 12), 'PENDING'), wk('w3', employees[2], ymd(Y, M, 18), 'PENDING'),
  wk('w4', employees[3], ymd(Y, M, 19), 'APPROVED'), wk('w5', employees[3], ymd(Y, M, 20), 'APPROVED'), wk('w6', employees[7], ymd(Y, M, 25), 'APPROVED'),
  wk('w7', employees[8], ymd(Y, M, 26), 'REJECTED', { reject_note: 'ตรงกับวันที่มีคนหยุดเต็มแล้ว' }),
]
const leaves = [
  { id: 'l1', request_no: 'LV-2569-0101', employee_id: 'e2', leave_type: 'SICK', start_date: ymd(Y, M, D), end_date: ymd(Y, M, D), days: 1, leave_period: 'FULL', reason: 'ไข้หวัด', status: 'PENDING', reviewed_by: null, reviewed_at: null, reject_note: null, created_at: iso(today, '07:30'), employee: empLite(employees[1]) },
  { id: 'l2', request_no: 'LV-2569-0102', employee_id: 'e4', leave_type: 'PERSONAL', start_date: ymd(Y, M, D + 2), end_date: ymd(Y, M, D + 3), days: 2, leave_period: 'FULL', reason: 'ธุระครอบครัว', status: 'PENDING', reviewed_by: null, reviewed_at: null, reject_note: null, created_at: iso(today, '07:45'), employee: empLite(employees[3]) },
  { id: 'l3', request_no: 'LV-2569-0099', employee_id: 'e8', leave_type: 'VACATION', start_date: ymd(Y, M, 14), end_date: ymd(Y, M, 15), days: 2, leave_period: 'FULL', reason: 'พักผ่อน', status: 'APPROVED', reviewed_by: 'admin', reviewed_at: iso(today, '06:00'), reject_note: null, created_at: iso(ymd(Y, M, 1), '09:00'), employee: empLite(employees[7]) },
  { id: 'l4', request_no: 'LV-2569-0098', employee_id: 'e3', leave_type: 'SICK', start_date: ymd(Y, M, 2), end_date: ymd(Y, M, 2), days: 1, leave_period: 'FULL', reason: 'ปวดหัว', status: 'APPROVED', reviewed_by: 'admin', reviewed_at: iso(ymd(Y, M, 2), '09:00'), reject_note: null, created_at: iso(ymd(Y, M, 2), '07:00'), employee: empLite(employees[2]) },
]
const leaveTypes = [{ id: 'lt1', code: 'SICK', name: 'ลาป่วย', color: '#16a34a' }, { id: 'lt2', code: 'PERSONAL', name: 'ลากิจ', color: '#2563eb' }, { id: 'lt3', code: 'VACATION', name: 'พักร้อน', color: '#d97706' }]
const positions = [...new Set(people.map(p => p[4]))].map(n => ({ id: 'p' + n, name: n, department_id: null, department: null }))

const features = ['employee', 'branch', 'attendance', 'leave', 'ot', 'report', 'announcement', 'offsite', 'shift', 'master_data', 'holiday', 'weekly_off', 'resignation', 'document_request', 'leave_management', 'gps_checkin', 'ot_management']

function route(method, path, q) {
  const p = path.replace('/api/v1', '')
  if (method !== 'GET') return { id: 'x' }
  if (p === '/auth/me') return { id: 'u1', role: 'ADMIN', email: 'demo@example.com', first_name: 'ผู้ดูแลระบบ', last_name: '(ตัวอย่าง)', tenant_id: 'demo-tenant', is_root_admin: true, enabled_features: null, permissions: null }
  if (p === '/admin/plan-usage') return { employees: { used: employees.length, limit: 100 }, branches: { used: branches.length, limit: 10 }, plan: 'Standard' }
  if (p === '/admin/notifications') return []
  if (p === '/login-ads') return []
  if (p === '/admin/employees') return employees
  if (p === '/admin/tenant-settings') return { name: 'บริษัท ตัวอย่าง จำกัด', timezone: 'Asia/Bangkok' }
  if (p === '/admin/employee-status-types') return []
  if (p === '/admin/dashboard/summary') { const lp = employees.filter((_, i) => [2, 4, 10].includes(i)).map(e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name, nickname: e.nickname, employee_code: e.employee_code, branch: { id: e.branch_id, name: e.branch.name }, photo_url: null })); return { totalEmployees: employees.length, late: { count: 3, employees: lp }, resigned: { count: 0, employees: [] }, newHires: { count: 1, employees: lp.slice(0, 1) } } }
  if (p === '/admin/dashboard/off-today') return { count: 0, employees: [] }
  if (p === '/admin/documents/expiring' || p === '/admin/probation/due' || p === '/admin/resignations') return []
  if (p === '/admin/branches') return branches
  if (p === '/admin/shifts') return shifts
  if (p === '/admin/attendance') return attendance
  if (p === '/admin/weekly-off') return weeklyOff
  if (p === '/admin/leave-requests') return leaves
  if (p === '/admin/leave-types') return []
  if (p === '/admin/positions') return positions
  if (p.startsWith('/admin/weekly-off/periods')) return branches.map(b => ({ id: 'pr' + b.id, branch_id: b.id, month: `${Y}-${pad(M)}`, is_open: b.id !== 'b3', deadline: null, note: null, branch: { id: b.id, name: b.name } }))
  if (p === '/admin/weekly-off/quotas') return []
  if (p === '/admin/weekly-off/worked-alerts' || p === '/super-admin/holidays/worked-alerts') return []
  if (p === '/admin/leave-balances/employees') return []
  if (p === '/admin/offsite-checkins' || p === '/admin/shift-assignments') return []
  if (p === '/admin/holidays' || p === '/super-admin/holidays') return []
  if (p === '/admin/groups') return [{ id: 'g1', name: 'กลุ่มบริษัทตัวอย่าง' }]
  if (p === '/admin/departments' || p === '/admin/divisions') return []
  return undefined
}
module.exports = { route, employees, branches }
