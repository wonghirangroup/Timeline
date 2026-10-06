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
  phone: `08${i % 10}-${100 + i * 7}-${2000 + i * 13}`, hired_at: '2025-05-01', line_user_id: i < 10 ? 'U' + i : null, is_active: true, status: 'ACTIVE', status_reason: null,
  created_at: '2569-01-10T00:00:00Z', branch_id: p[3], branch: { id: p[3], name: bName(p[3]), group_id: 'g1' }, extra_branches: [],
  weekly_off_mode: 'MONTHLY_BATCH', position_id: 'p' + p[4], position: { id: 'p' + p[4], name: p[4] }, employee_status_type_id: i < 10 ? 'st1' : 'st2', employee_status_type: i < 10 ? { id: 'st1', name: 'พนักงานประจำ', monthly_off_quota: 5 } : { id: 'st2', name: 'พนักงานขนส่ง', monthly_off_quota: 4 },
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


const base = { booking_enabled: null, leave_enabled: null, is_active: true, saturday_rule: null, sunday_rule: null, booking_quota: null, off_quota_mode: null }
const divisionsTree = [
  { id: 'd1', name: 'ฝ่ายปฏิบัติการ', group_id: 'g1', ...base, _count: { departments: 2 }, departments: [
    { id: 'dp1', name: 'แผนกขายหน้าร้าน', division_id: 'd1', ...base, _count: { positions: 2 }, positions: [
      { id: 'pผู้จัดการสาขา', name: 'ผู้จัดการสาขา', department_id: 'dp1', ...base, _count: { employees: 3 } },
      { id: 'pพนักงานขาย', name: 'พนักงานขาย', department_id: 'dp1', ...base, _count: { employees: 5 } } ] },
    { id: 'dp2', name: 'แผนกขนส่ง', division_id: 'd1', ...base, _count: { positions: 1 }, positions: [
      { id: 'pพนักงานขนส่ง', name: 'พนักงานขนส่ง', department_id: 'dp2', ...base, _count: { employees: 2 } } ] } ] },
  { id: 'd2', name: 'ฝ่ายการเงิน', group_id: 'g1', ...base, _count: { departments: 1 }, departments: [
    { id: 'dp3', name: 'แผนกบัญชี', division_id: 'd2', ...base, _count: { positions: 1 }, positions: [
      { id: 'pแคชเชียร์', name: 'แคชเชียร์', department_id: 'dp3', ...base, _count: { employees: 2 } } ] } ] },
]
const statusTypes = [
  { id: 'st1', name: 'พนักงานประจำ', monthly_off_quota: 5, off_quota_mode: 'FIXED', saturday_rule: 'WORK', sunday_rule: 'OFF', off_on_public_holiday: true, is_active: true, _count: { employees: 8 } },
  { id: 'st2', name: 'พนักงานขนส่ง', monthly_off_quota: 4, off_quota_mode: 'WEEKENDS_IN_MONTH', saturday_rule: 'OFF', sunday_rule: 'OFF', off_on_public_holiday: true, is_active: true, _count: { employees: 2 } },
]

const ot = [
  { id: 'o1', request_no: 'OT-2569-0031', employee_id: 'e2', date: ymd(Y, M, D), start_time: '18:00', end_time: '21:00', hours: 3, reason: 'ปิดยอดสิ้นเดือน', status: 'PENDING', employee: empLite(employees[1]) },
  { id: 'o2', request_no: 'OT-2569-0030', employee_id: 'e5', date: ymd(Y, M, D - 1), start_time: '18:00', end_time: '20:00', hours: 2, reason: 'ขนของเข้าคลัง', status: 'APPROVED', employee: empLite(employees[4]) },
  { id: 'o3', request_no: 'OT-2569-0029', employee_id: 'e4', date: ymd(Y, M, D - 3), start_time: '18:00', end_time: '19:30', hours: 1.5, reason: 'นับสต็อก', status: 'APPROVED', employee: empLite(employees[3]) },
  { id: 'o4', request_no: 'OT-2569-0028', employee_id: 'e8', date: ymd(Y, M, D - 4), start_time: '18:00', end_time: '22:00', hours: 4, reason: 'งานอีเวนต์', status: 'REJECTED', employee: empLite(employees[7]) },
]
const resign = [
  { id: 'r1', request_no: 'RS-2569-0004', employee_id: 'e3', last_working_date: ymd(Y, M + 1 > 12 ? 1 : M + 1, 15), reason: 'ย้ายไปอยู่ต่างจังหวัด', status: 'PENDING', reject_note: null, created_at: iso(today, '08:10'), employee: empLite(employees[2]) },
  { id: 'r2', request_no: 'RS-2569-0003', employee_id: 'e9', last_working_date: ymd(Y, M, 30), reason: 'ศึกษาต่อ', status: 'APPROVED', reject_note: null, created_at: iso(ymd(Y, M, 1), '09:00'), employee: empLite(employees[8]) },
]
const docReqs = [
  { id: 'dr1', request_no: 'DC-2569-0012', employee_id: 'e2', type: 'SALARY_CERT', custom_type: null, period: null, note: 'ใช้ประกอบการขอสินเชื่อ', status: 'PENDING', reject_note: null, file_url: null, created_at: iso(today, '07:50'), employee: empLite(employees[1]) },
  { id: 'dr2', request_no: 'DC-2569-0011', employee_id: 'e4', type: 'PAYSLIP', custom_type: null, period: ymd(Y, M - 1 < 1 ? 12 : M - 1, 1).slice(0, 7), note: null, status: 'COMPLETED', reject_note: null, file_url: null, created_at: iso(ymd(Y, M, 2), '10:00'), employee: empLite(employees[3]) },
  { id: 'dr3', request_no: 'DC-2569-0010', employee_id: 'e5', type: 'WORK_CERT', custom_type: null, period: null, note: 'ยื่นวีซ่า', status: 'PENDING', reject_note: null, file_url: null, created_at: iso(ymd(Y, M, 3), '11:20'), employee: empLite(employees[4]) },
]
const announcements = [
  { id: 'an1', title: 'แจ้งปิดทำการวันหยุดนักขัตฤกษ์', content: 'บริษัทขอแจ้งปิดทำการในวันศุกร์ที่ 23 ตุลาคม เปิดทำการตามปกติวันจันทร์', send_line: true, created_at: iso(ymd(Y, M, 3), '10:00') },
  { id: 'an2', title: 'อบรมความปลอดภัยประจำไตรมาส', content: 'ขอเชิญพนักงานทุกสาขาเข้าร่วมอบรม วันที่ 15 เวลา 13:00 น.', send_line: true, created_at: iso(ymd(Y, M, 1), '09:30') },
]

const offsite = [
  { id: 'of1', check_in_at: iso(today, '09:30'), check_in_lat: '13.7563', check_in_lng: '100.5018', check_in_address: 'ลูกค้า บริษัท ตัวอย่างการค้า ถนนพระราม 4', check_out_at: null, check_out_lat: null, check_out_lng: null, check_out_address: null, note: 'ส่งสินค้าและเก็บเงิน', employee: empLite(employees[4]) },
  { id: 'of2', check_in_at: iso(ymd(Y, M, D - 1), '10:00'), check_in_lat: '13.7563', check_in_lng: '100.5018', check_in_address: 'งานสัมมนาโรงแรมตัวอย่าง', check_out_at: iso(ymd(Y, M, D - 1), '16:30'), check_out_lat: '13.7563', check_out_lng: '100.5018', check_out_address: 'งานสัมมนาโรงแรมตัวอย่าง', note: 'เข้าร่วมสัมมนา', employee: empLite(employees[1]) },
  { id: 'of3', check_in_at: iso(ymd(Y, M, D - 2), '09:00'), check_in_lat: '13.7563', check_in_lng: '100.5018', check_in_address: 'คลังสินค้าสาขาย่อย', check_out_at: iso(ymd(Y, M, D - 2), '17:00'), check_out_lat: '13.7563', check_out_lng: '100.5018', check_out_address: 'คลังสินค้าสาขาย่อย', note: 'ตรวจนับสต็อก', employee: empLite(employees[5]) },
]
const auditLog = [
  { id: 'al1', action: 'EMPLOYEE_CREATED', actor_name: 'ผู้ดูแลระบบ (ตัวอย่าง)', entity_name: 'วิภา ตัวอย่างดี', message: 'เพิ่มพนักงาน วิภา ตัวอย่างดี (สาขาสุขุมวิท)', branch_id: 'b1', created_at: iso(today, '09:10') },
  { id: 'al2', action: 'EMPLOYEE_UPDATED', actor_name: 'ผู้ดูแลระบบ (ตัวอย่าง)', entity_name: 'สมหญิง รักงาน', message: 'แก้ไขข้อมูลพนักงาน สมหญิง รักงาน — เปลี่ยนเบอร์โทร', branch_id: 'b1', created_at: iso(today, '08:45') },
  { id: 'al3', action: 'NOTIFICATION_SENT', actor_name: 'ระบบ', entity_name: 'ประเสริฐ มั่นคง', message: 'ส่งแจ้งเตือนผลอนุมัติวันลา ถึง ประเสริฐ มั่นคง ทาง LINE', branch_id: 'b1', created_at: iso(ymd(Y, M, D - 1), '16:20') },
  { id: 'al4', action: 'WEB_USER_CREATED', actor_name: 'ผู้ดูแลระบบ (ตัวอย่าง)', entity_name: 'ผู้จัดการ สาขา', message: 'เพิ่มผู้ใช้งานเว็บ ผู้จัดการ สาขา (MANAGER)', branch_id: null, created_at: iso(ymd(Y, M, D - 2), '11:00') },
  { id: 'al5', action: 'EMPLOYEE_DELETED', actor_name: 'ผู้ดูแลระบบ (ตัวอย่าง)', entity_name: 'ทดสอบ ระบบ', message: 'ลบพนักงาน ทดสอบ ระบบ', branch_id: 'b2', created_at: iso(ymd(Y, M, D - 3), '14:05') },
]
const webUsers = [
  { id: 'u1', email: 'admin@example.com', first_name: 'ผู้ดูแลระบบ', last_name: '(ตัวอย่าง)', role: 'ADMIN', is_active: true, created_at: '2569-01-10T00:00:00Z', is_root_admin: true },
  { id: 'u2', email: 'manager@example.com', first_name: 'ผู้จัดการ', last_name: 'สาขา', role: 'MANAGER', is_active: true, created_at: '2569-03-01T00:00:00Z' },
  { id: 'u3', email: 'exec@example.com', first_name: 'ผู้บริหาร', last_name: 'ตัวอย่าง', role: 'EXECUTIVE', is_active: true, created_at: '2569-04-01T00:00:00Z' },
]
const features = ['employee', 'branch', 'attendance', 'leave', 'ot', 'report', 'announcement', 'offsite', 'shift', 'master_data', 'holiday', 'weekly_off', 'resignation', 'document_request', 'leave_management', 'gps_checkin', 'ot_management']

function route(method, path, q) {
  const p = path.replace('/api/v1', '')
  if (method !== 'GET') return { id: 'x' }
  if (p === '/auth/me') return { id: 'u1', role: 'ADMIN', email: 'demo@example.com', first_name: 'ผู้ดูแลระบบ', last_name: '(ตัวอย่าง)', tenant_id: 'demo-tenant', is_root_admin: true, enabled_features: null, permissions: null }
  if (p === '/admin/plan-usage') return { employees: { used: employees.length, limit: 100 }, branches: { used: branches.length, limit: 10 }, groups: { used: 1, limit: 5 }, plan: 'PRO' }
  if (p === '/admin/notifications') return []
  if (p === '/login-ads') return []
  const mEmp = p.match(/^\/admin\/employees\/(e\d+)$/)
  if (mEmp) { const e = employees.find(x => x.id === mEmp[1]); return { ...e, prefix: 'นาย', id_card: '0-0000-00000-00-0', birthdate: '1992-03-15', blood_type: 'O', email: 'somchai@example.com', phone_alt: '089-000-0000',
    emergency_contacts: [{ name: 'สมศรี ใจดี', relation: 'มารดา', phone: '089-111-2222' }], address_id: { house: '99/1', moo: '', soi: '', road: 'ถนนสุขุมวิท', sub: 'คลองเตย', district: 'คลองเตย', province: 'กรุงเทพมหานคร', zip: '10110' },
    address_current: null, educations: [{ level: 'ปริญญาตรี', institution: 'มหาวิทยาลัยตัวอย่าง', field: 'การจัดการ', year: '2558' }], skills: [{ name: 'ภาษาอังกฤษ', level: 'ดี' }, { name: 'Excel', level: 'ดีมาก' }],
    emp_type: 'พนักงานประจำ', salary: 18000, notes: null, line_user_id: 'U1234567890abcdef' } }

  if (p === '/admin/groups') return [{ id: 'g1', name: 'กลุ่มบริษัทตัวอย่าง', booking_enabled: true, leave_enabled: true, is_active: true, _count: { branches: 3, divisions: 2, employees: 12 }, saturday_rule: null, sunday_rule: null, booking_quota: null }]
  if (p === '/admin/org-structure/tree') return divisionsTree
  if (p === '/admin/divisions') return divisionsTree.map(({ departments, ...d }) => d)
  if (p === '/admin/departments') return divisionsTree.flatMap(d => d.departments.map(({ positions, ...x }) => x))
  if (p === '/admin/employee-status-types') return statusTypes
  if (p === '/admin/offsite-checkins') return offsite
  if (p === '/admin/audit-log/activity') { const mk = (i, m, route, name, mins, body) => ({ id: 'ac' + i, user_id: 'u1', actor_name: 'ผู้ดูแลระบบ (ตัวอย่าง)', actor_role: 'ADMIN', method: m, route, url: route, status_code: 200, duration_ms: 40 + i * 7, ip: '203.0.113.' + (10 + i), user_agent: 'Chrome', body, created_at: iso(today, mins) })
    return { total: 5, admins: [{ user_id: 'u1', name: 'ผู้ดูแลระบบ (ตัวอย่าง)' }], rows: [
      mk(1, 'POST', '/api/v1/admin/leave-requests/:id/approve', '', '09:42', null), mk(2, 'PATCH', '/api/v1/admin/employees/:id', '', '09:15', '{"phone":"0812345678"}'),
      mk(3, 'POST', '/api/v1/admin/announcements', '', '08:55', '{"title":"แจ้งหยุด"}'), mk(4, 'DELETE', '/api/v1/admin/branches/:id', '', '08:20', null), mk(5, 'POST', '/api/v1/admin/weekly-off/:id/reopen', '', '08:05', null) ] } }
  if (p === '/admin/audit-log') return auditLog
  if (p === '/super-admin/users') return webUsers
  if (p === '/admin/permissions/notify-recipients') return []
  if (p === '/admin/platform-contact') return { name: 'ทีมผู้ดูแลระบบ', phone: '02-000-0000', email: 'support@example.com', line: '@support' }
  if (p === '/admin/line-message-logs') return []
  if (p === '/admin/attendance/first-checkin') return []
  if (p === '/admin/ot-requests') return ot
  if (p === '/admin/resignations') return resign
  if (p === '/admin/document-requests') return docReqs
  if (p === '/admin/announcements') return announcements
  if (p === '/admin/announcement-templates') return [{ id: 't1', name: 'แจ้งวันหยุดพิเศษ', title: 'แจ้งวันหยุดพิเศษ', content: 'บริษัทขอแจ้งวันหยุดพิเศษ...' }]
  if (p === '/admin/employees') return employees
  if (p === '/admin/tenant-settings') return { name: 'บริษัท ตัวอย่าง จำกัด', address: null, tax_id: '0000000000000', logo_url: null, primary_color: '#244B83', signer_name: null, signer_title: null, timezone: 'Asia/Bangkok' }
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
  if (p === '/admin/leave-balances/employees') return employees.slice(0, 8).map((e, i) => ({ employee_id: e.id, employee_code: e.employee_code, full_name: e.first_name + ' ' + e.last_name, nickname: e.nickname, photo_url: null, branch_id: e.branch_id, branch_name: e.branch.name, hired_at: e.hired_at,
    sick: { total: 30, used: i % 3 }, personal: { total: 3, used: i === 2 ? 4 : i % 3 }, vacation: { total: 6, used: i === 4 ? 5 : i % 4 }, maternity: { total: 0, used: 0 }, compensate: { total: 0, used: 0 } }))
  if (p === '/admin/shift-assignments') return []
  if (p === '/admin/holidays' || p === '/super-admin/holidays') return [
    { id: 'h1', date: Y + '-12-05', name: 'วันพ่อแห่งชาติ', type: 'NATIONAL', recurring: true, target_branches: null, compensate_days: 1 },
    { id: 'h2', date: Y + '-12-10', name: 'วันรัฐธรรมนูญ', type: 'NATIONAL', recurring: true, target_branches: null, compensate_days: 1 },
    { id: 'h3', date: Y + '-12-31', name: 'วันสิ้นปี', type: 'NATIONAL', recurring: true, target_branches: null, compensate_days: 1 },
    { id: 'h4', date: Y + '-10-23', name: 'วันปิยมหาราช', type: 'NATIONAL', recurring: true, target_branches: null, compensate_days: 1 },
    { id: 'h5', date: Y + '-11-15', name: 'วันครบรอบบริษัท', type: 'COMPANY', recurring: true, target_branches: null, compensate_days: 1 } ]
  return undefined
}
module.exports = { route, employees, branches }
