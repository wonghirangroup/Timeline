// server/src/modules/attendance/attendance.service.ts
import { prisma } from '../../common/utils/prisma'
import { holidayAppliesTo } from '../tenant/holiday.service'

// ── Day rule (สถานะพนักงาน: เสาร์/อาทิตย์/นักขัตฤกษ์) ────────────────────────
// เช็คอินยังทำได้เสมอไม่ว่าวันนี้จะเป็นวันหยุดหรือไม่ (ไม่บล็อค) แต่ผลลัพธ์
// ต่างกัน: OFF → ยกเว้นสาย/ขาด/ค่าปรับ (ไม่ได้ถูกกำหนดให้มาอยู่แล้ว), OFFSITE →
// คำนวณสาย/ค่าปรับตามปกติ แค่แนบหมายเหตุให้ admin เห็นว่าวันนี้กำหนดทำงานนอกสถานที่
interface DayRuleResult { rule: 'WORK' | 'OFF' | 'OFFSITE'; holidayName?: string }

async function resolveDayRule(tenantId: string, employeeId: string, date: Date): Promise<DayRuleResult> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId },
    select: {
      branch_id: true, department: true,
      employee_status_type: { select: { saturday_rule: true, sunday_rule: true, off_on_public_holiday: true } },
    },
  })
  const st = employee?.employee_status_type
  if (!st) return { rule: 'WORK' }

  const dow = date.getUTCDay()
  if (dow === 6 && st.saturday_rule !== 'WORK') return { rule: st.saturday_rule as 'OFF' | 'OFFSITE' }
  if (dow === 0 && st.sunday_rule   !== 'WORK') return { rule: st.sunday_rule as 'OFF' | 'OFFSITE' }

  if (st.off_on_public_holiday && employee) {
    const holiday = await prisma.holiday.findFirst({ where: { tenant_id: tenantId, date } })
    if (holiday && holidayAppliesTo(holiday, employee)) return { rule: 'OFF', holidayName: holiday.name }
  }
  return { rule: 'WORK' }
}

// ปรับผล late/absent ตาม day rule — OFF ยกเว้นทั้งหมด, OFFSITE ปล่อยตามคำนวณปกติ
// แค่แนบหมายเหตุ, WORK ไม่ยุ่งอะไรเลย
function applyDayRule(late: LateStatus, dayRule: DayRuleResult): { late: LateStatus; dayRuleNote?: string } {
  if (dayRule.rule === 'OFF') {
    const reason = dayRule.holidayName ? `วันหยุดนักขัตฤกษ์ (${dayRule.holidayName})` : 'วันหยุดประจำตามสถานะพนักงาน'
    return { late: { is_late: false, late_level: 0, late_minutes: 0, is_absent: false }, dayRuleNote: `เช็คอินในวันหยุด — ${reason} ไม่นับสาย/ขาด` }
  }
  if (dayRule.rule === 'OFFSITE') {
    return { late, dayRuleNote: 'วันนี้กำหนดให้ทำงานนอกสถานที่ตามสถานะพนักงาน' }
  }
  return { late }
}

// scopedEmployeeIds: undefined = ไม่ scope (role ปกติ), array = DEPT_HEAD จำกัดแค่คนในแผนก
// ที่ดูแล (ดู resolveDeptScope middleware)
export async function getAttendanceReport(tenantId: string, filters: {
  date?: string
  startDate?: string
  endDate?: string
  branchId?: string
  employeeId?: string
  scopedEmployeeIds?: string[]
}) {
  const dateFilter = filters.date
    ? { date: new Date(filters.date + 'T00:00:00.000Z') }
    : filters.startDate || filters.endDate
      ? {
          date: {
            ...(filters.startDate ? { gte: new Date(filters.startDate + 'T00:00:00.000Z') } : {}),
            ...(filters.endDate   ? { lte: new Date(filters.endDate   + 'T00:00:00.000Z') } : {}),
          },
        }
      : {}

  // ถ้าระบุ employeeId เจาะจงมาด้วย ต้องอยู่ใน scope ด้วย ไม่งั้นคืนว่างเปล่า (ไม่ใช่เผลอ
  // ทับ filter scope จน DEPT_HEAD เห็นคนนอกแผนกได้ผ่านการระบุ employeeId ตรงๆ)
  const employeeFilter = filters.scopedEmployeeIds
    ? (filters.employeeId
        ? (filters.scopedEmployeeIds.includes(filters.employeeId) ? { employee_id: filters.employeeId } : { employee_id: '__none__' })
        : { employee_id: { in: filters.scopedEmployeeIds } })
    : (filters.employeeId ? { employee_id: filters.employeeId } : {})

  return prisma.attendanceRecord.findMany({
    where: {
      tenant_id: tenantId,
      ...dateFilter,
      ...employeeFilter,
      ...(filters.branchId ? { employee: { branch_id: filters.branchId } } : {}),
    },
    include: {
      employee: {
        select: {
          id: true, first_name: true, last_name: true, nickname: true,
          employee_code: true,
          branch: { select: { id: true, name: true } },
        },
      },
      shift: { select: {
        id: true, name: true, branch_id: true, start_time: true, end_time: true,
        late_threshold_1: true, late_threshold_2: true, absent_threshold: true,
        late_fine_1: true, late_fine_2: true,
      } },
    },
    orderBy: [{ date: 'asc' }, { check_in_at: 'asc' }],
  })
}

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function dateToBangkokMins(d: Date): number {
  const utcMins = d.getUTCHours() * 60 + d.getUTCMinutes()
  return (utcMins + 7 * 60) % (24 * 60)
}

function getNowBangkokMins(): number {
  return dateToBangkokMins(new Date())
}

// ── Late/absent tier calculation ────────────────────────────────────────────
// ลำดับความสำคัญ: ขาด (absent_threshold) > สายระดับ 2 (late_threshold_2) >
// สายระดับ 1 (late_threshold_1) — เช็คจากเกณฑ์ที่หนักสุดก่อนเสมอ เพื่อไม่ให้
// เกณฑ์ที่ผ่อนกว่าทับเกณฑ์ที่หนักกว่าโดยไม่ตั้งใจ (เช่น ตั้ง absent_threshold
// ไว้ก่อน late_threshold_2 ในเวลาโดยพลาด)
interface ShiftLateConfig {
  start_time: string
  late_threshold: number
  late_threshold_1: string | null
  late_threshold_2: string | null
  absent_threshold: string | null
}
interface LateStatus {
  is_late: boolean
  late_level: 0 | 1 | 2
  late_minutes: number
  is_absent: boolean
}

function computeLateStatus(shift: ShiftLateConfig, checkInMins: number): LateStatus {
  const startMins = toMins(shift.start_time)
  if (checkInMins <= startMins) return { is_late: false, late_level: 0, late_minutes: 0, is_absent: false }

  const late_minutes = checkInMins - startMins
  const late1Mins   = shift.late_threshold_1   ? toMins(shift.late_threshold_1)   : null
  const late2Mins   = shift.late_threshold_2   ? toMins(shift.late_threshold_2)   : null
  const absentMins  = shift.absent_threshold   ? toMins(shift.absent_threshold)   : null

  if (absentMins != null && checkInMins >= absentMins) {
    return { is_late: true, late_level: 2, late_minutes, is_absent: true }
  }
  if (late2Mins != null && checkInMins >= late2Mins) {
    return { is_late: true, late_level: 2, late_minutes, is_absent: false }
  }
  if (late1Mins != null && checkInMins >= late1Mins) {
    return { is_late: true, late_level: 1, late_minutes, is_absent: false }
  }
  if (late1Mins == null && late2Mins == null && late_minutes > shift.late_threshold) {
    // fallback: ใช้ integer late_threshold (นาที) เมื่อไม่ได้กำหนด threshold_1/2 เลย
    return { is_late: true, late_level: 1, late_minutes, is_absent: false }
  }
  return { is_late: false, late_level: 0, late_minutes: 0, is_absent: false } // สายแต่ยังไม่ถึงเกณฑ์ไหน (grace period)
}

function fineForLevel(shift: { late_fine_1: unknown; late_fine_2: unknown }, level: 0 | 1 | 2): number {
  if (level === 1) return shift.late_fine_1 != null ? Number(shift.late_fine_1) : 0
  if (level === 2) return shift.late_fine_2 != null ? Number(shift.late_fine_2) : 0
  return 0
}

// อ่านค่าปรับขาดที่ยกมาจากการขาดงานครั้งก่อน (ถ้ามี) แล้วเคลียร์ทิ้งทันที
// (ต้องเรียกใน $transaction เดียวกับการสร้าง attendance record เสมอ กัน race)
async function settlePendingFine(tx: any, employeeId: string): Promise<number> {
  const emp = await tx.employee.findUnique({ where: { id: employeeId }, select: { pending_fine: true } })
  const carried = emp?.pending_fine ? Number(emp.pending_fine) : 0
  if (carried > 0) await tx.employee.update({ where: { id: employeeId }, data: { pending_fine: 0 } })
  return carried
}

// ยกค่าปรับขาดไปหักในวันที่มาเช็คอินถัดไป
async function schedulePendingFine(tx: any, employeeId: string, amount: number): Promise<void> {
  if (amount > 0) await tx.employee.update({ where: { id: employeeId }, data: { pending_fine: { increment: amount } } })
}

function absentNote(checkInAt: Date): string {
  const mins = dateToBangkokMins(checkInAt)
  const hh = String(Math.floor(mins / 60)).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return `หยุด (มาสายเกินกำหนด — เช็คอิน ${hh}:${mm})`
}

export async function createManualAttendance(tenantId: string, data: {
  employee_id: string
  shift_id: string
  date: string        // YYYY-MM-DD
  check_in_at?: string   // HH:mm
  check_out_at?: string  // HH:mm
  note?: string
}) {
  // Parse as UTC midnight to avoid timezone shift (MySQL DATE column is date-only)
  const [y, mo, d] = data.date.split('-').map(Number)
  const dateObj = new Date(Date.UTC(y, mo - 1, d))

  // ตรวจซ้ำ
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employee_id_shift_id_date: {
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        date: dateObj,
      },
    },
  })
  if (existing) throw new Error('ALREADY_CHECKED_IN')

  const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } })
  const checkInAt = buildDateTime(data.date, data.check_in_at)

  let late: LateStatus = { is_late: false, late_level: 0, late_minutes: 0, is_absent: false }
  let levelFine = 0
  if (shift && checkInAt) {
    late = computeLateStatus(shift, dateToBangkokMins(checkInAt))
    levelFine = late.is_absent ? 0 : fineForLevel(shift, late.late_level)
  }

  return prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id:       tenantId,
        employee_id:     data.employee_id,
        shift_id:        data.shift_id,
        date:            dateObj,
        check_in_at:     checkInAt ?? undefined,
        check_out_at:    buildDateTime(data.date, data.check_out_at) ?? undefined,
        check_in_method: 'ADMIN',
        is_late:         late.is_late,
        late_minutes:    late.late_minutes,
        is_absent:       late.is_absent,
        fine:            levelFine,
        carried_fine:    carried,
        note:            data.note ?? (late.is_absent && checkInAt ? absentNote(checkInAt) : undefined),
      },
    })
    if (late.is_absent && shift?.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return record
  })
}

// map สถานะที่ Admin เลือกเอง (override) → flag ภายใน — ใช้ตอนแอดมินแก้ผลลัพธ์
// auto-calculation ด้วยมือ (เช่น รู้ว่ามีเหตุผลสมควรก็เลยยกเว้นให้ไม่นับสาย)
// late_minutes คงค่าที่ auto-calc ล่าสุดไว้ (เผื่ออ้างอิง) ยกเว้น ON_TIME ที่ต้องเป็น 0 เสมอ
function applyStatusOverride(
  status: 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT',
  currentLateMinutes: number,
): { is_late: boolean; late_minutes: number; is_absent: boolean } {
  switch (status) {
    case 'ON_TIME': return { is_late: false, late_minutes: 0,                       is_absent: false }
    case 'LATE_1':  return { is_late: true,  late_minutes: currentLateMinutes || 1, is_absent: false }
    case 'LATE_2':  return { is_late: true,  late_minutes: currentLateMinutes || 1, is_absent: false }
    case 'ABSENT':  return { is_late: true,  late_minutes: currentLateMinutes || 1, is_absent: true  }
  }
}

export async function updateAttendanceTime(tenantId: string, id: string, data: {
  date?: string
  shift_id?: string              // เปลี่ยนกะที่บันทึกนี้สังกัดอยู่
  check_in_at?: string | null    // HH:mm หรือ null
  check_out_at?: string | null   // HH:mm หรือ null
  status?: 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT'  // override ผลคำนวณอัตโนมัติด้วยมือ
  fine?: number                  // override ค่าปรับด้วยมือ (บาท)
  note?: string
}) {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id, tenant_id: tenantId },
    include: { shift: true },
  })
  if (!record) return null

  const dateStr = data.date ?? record.date.toISOString().slice(0, 10)

  // เปลี่ยนกะ (ทั้งกะอื่นในสาขาเดิม หรือสาขาอื่นไปเลย) — ต้องเช็ค unique constraint
  // (employee+shift+date) กันชนกับ record อื่นที่มีอยู่แล้วในกะปลายทาง
  let shift = record.shift
  const shiftChanged = data.shift_id !== undefined && data.shift_id !== record.shift_id
  if (shiftChanged) {
    const newShift = await prisma.shift.findFirst({ where: { id: data.shift_id, tenant_id: tenantId, deleted_at: null } })
    if (!newShift) throw new Error('SHIFT_NOT_FOUND')
    const conflict = await prisma.attendanceRecord.findFirst({
      where: { id: { not: id }, employee_id: record.employee_id, shift_id: newShift.id, date: record.date },
    })
    if (conflict) throw new Error('ALREADY_CHECKED_IN')
    shift = newShift
  }

  let is_late      = record.is_late
  let late_minutes = record.late_minutes
  let is_absent    = record.is_absent
  let fine         = Number(record.fine)   // carried_fine ไม่แตะ — คงค่าเดิมเสมอ (settle/schedule เกิดครั้งเดียวตอนสร้าง record)

  const checkInAt = data.check_in_at !== undefined
    ? (data.check_in_at ? buildDateTime(dateStr, data.check_in_at) : null)
    : record.check_in_at

  // Auto-calculation: เปลี่ยนเวลาเข้า หรือเปลี่ยนกะ (ซึ่งอาจอยู่คนละสาขา/เกณฑ์สาย
  // ต่างกัน) → คำนวณสถานะ+ค่าปรับใหม่จากเกณฑ์ของกะที่ใช้อยู่ตอนนี้เสมอ
  if ((data.check_in_at !== undefined || shiftChanged) && checkInAt && shift) {
    const late = computeLateStatus(shift, dateToBangkokMins(checkInAt))
    is_late      = late.is_late
    late_minutes = late.late_minutes
    is_absent    = late.is_absent
    fine         = late.is_absent ? 0 : fineForLevel(shift, late.late_level)
  } else if (data.check_in_at !== undefined && !checkInAt) {
    is_late = false; late_minutes = 0; is_absent = false; fine = 0
  }

  // Override ด้วยมือ (ทับผล auto-calculation ด้านบน) — ใช้ตอน Admin ไม่เห็นด้วยกับ
  // ผลคำนวณอัตโนมัติ เช่น รู้เหตุผลที่สมควรยกเว้นให้
  if (data.status !== undefined) {
    const ov = applyStatusOverride(data.status, late_minutes)
    is_late = ov.is_late; late_minutes = ov.late_minutes; is_absent = ov.is_absent
  }
  if (data.fine !== undefined) fine = data.fine

  const checkOutAt = data.check_out_at !== undefined
    ? (data.check_out_at ? buildDateTime(dateStr, data.check_out_at) : null)
    : record.check_out_at

  return prisma.attendanceRecord.update({
    where: { id },
    data: {
      ...(shiftChanged ? { shift_id: shift!.id } : {}),
      check_in_at:  checkInAt,
      check_out_at: checkOutAt,
      is_late,
      late_minutes,
      is_absent,
      fine,
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  })
}

// ลบ/รีเซ็ตบันทึกเช็คชื่อ — ถ้า record นี้เป็นวันขาด (is_absent) ที่เคยตั้งค่าปรับ
// ไปรอหักวันถัดไปแล้ว (schedulePendingFine) ต้องคืนยอดนั้นออกจาก pending_fine ด้วย
// ไม่งั้นจะเหลือค่าปรับผีค้างอยู่ทั้งที่ record ต้นเหตุถูกลบไปแล้ว
// (ถ้ายอดนั้นถูกใช้ไปแล้วจากการเช็คอินครั้งถัดมา — clamp ไม่ให้ pending_fine ติดลบ)
export async function deleteAttendanceRecord(tenantId: string, id: string): Promise<boolean> {
  const record = await prisma.attendanceRecord.findFirst({ where: { id, tenant_id: tenantId } })
  if (!record) return false

  await prisma.$transaction(async (tx) => {
    if (record.is_absent) {
      const shift = await tx.shift.findUnique({ where: { id: record.shift_id }, select: { absent_fine: true } })
      const refund = shift?.absent_fine ? Number(shift.absent_fine) : 0
      if (refund > 0) {
        const emp = await tx.employee.findUnique({ where: { id: record.employee_id }, select: { pending_fine: true } })
        const current = emp?.pending_fine ? Number(emp.pending_fine) : 0
        await tx.employee.update({ where: { id: record.employee_id }, data: { pending_fine: Math.max(0, current - refund) } })
      }
    }
    await tx.attendanceRecord.delete({ where: { id } })
  })
  return true
}

// วันที่ Bangkok ณ ตอนนี้ เก็บเป็น UTC midnight ของวันนั้น
// ตัวอย่าง: 15:05 BKK (= 08:05 UTC) → return 2026-06-24 00:00:00 UTC
function getTodayBangkok(): Date {
  const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return new Date(Date.UTC(bkk.getFullYear(), bkk.getMonth(), bkk.getDate()))
}

// ค้นหากะที่ match กับเวลาปัจจุบัน (ภายใน window ของกะ)
// คืนค่า { shift, isOutsideShift }
async function autoDetectShift(tenantId: string, branchId: string, employeeId: string): Promise<{
  shift: Awaited<ReturnType<typeof prisma.shift.findFirst>> & {}
  isOutsideShift: boolean
} | null> {
  const nowMins = getNowBangkokMins()

  const today = getTodayBangkok()

  const shifts = await prisma.shift.findMany({
    where: { tenant_id: tenantId, branch_id: branchId, is_active: true, deleted_at: null },
    orderBy: { start_time: 'asc' },
  })
  if (shifts.length === 0) return null

  // หากะที่อยู่ใน window (earlyMins → closeMins)
  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    const startMins = toMins(shift.start_time)
    const earlyMins = startMins - 60
    // เช็คอินได้ยาวถึง 4 ชม. หลังเกณฑ์ที่หนักสุดที่ตั้งไว้ (absent > late2 > start)
    // เพื่อให้พนักงานยังเช็คอินได้ในช่วง "ขาด" ตามที่ตกลงไว้ — นับขาดแต่ไม่ปิดรับ
    const latestBoundMins = shift.absent_threshold
      ? toMins(shift.absent_threshold)
      : shift.late_threshold_2
        ? toMins(shift.late_threshold_2)
        : startMins
    // ห้ามยืดเข้าไปในช่วง "เช็คอินก่อนเวลาได้ 1 ชม." ของกะถัดไป (เรียงตาม start_time
    // แล้ว) ไม่งั้นสาขาที่มีหลายกะติดกัน (เช่น 08:00/09:00/13:00) จะจับกะผิดกัน —
    // คนมาเข้ากะสายจะถูกจับเข้ากะเช้าที่ยัง "เปิด" ค้างอยู่แทน
    const nextShiftEarlyMins = i + 1 < shifts.length ? toMins(shifts[i + 1].start_time) - 60 : Infinity
    const closeMins = Math.min(latestBoundMins + 4 * 60, nextShiftEarlyMins - 1)

    if (nowMins < earlyMins || nowMins > closeMins) continue

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employee_id_shift_id_date: { employee_id: employeeId, shift_id: shift.id, date: today } },
    })
    if (existing) continue

    return { shift, isOutsideShift: false }
  }

  // ไม่มีกะที่ match — หากะใกล้ที่สุด (closest start_time) ที่ยังไม่ได้เช็คอิน
  let closestShift = null
  let closestDiff  = Infinity
  for (const shift of shifts) {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { employee_id_shift_id_date: { employee_id: employeeId, shift_id: shift.id, date: today } },
    })
    if (existing) continue
    const diff = Math.abs(toMins(shift.start_time) - nowMins)
    if (diff < closestDiff) { closestDiff = diff; closestShift = shift }
  }

  if (!closestShift) return null
  return { shift: closestShift, isOutsideShift: true }
}

export async function checkInAuto(tenantId: string, data: {
  employee_id: string
  branch_id: string
  gps_lat?: number
  gps_lng?: number
}) {
  const branch = await prisma.branch.findFirst({
    where: { id: data.branch_id, tenant_id: tenantId, deleted_at: null },
  })
  if (!branch) throw new Error('BRANCH_NOT_FOUND')

  // ตรวจว่าพนักงานสังกัดสาขานี้
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
    select: { branch_id: true },
  })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')
  if (employee.branch_id !== data.branch_id) throw new Error('NOT_IN_BRANCH')

  // ตรวจ GPS
  let is_outside_area = false
  const detected = await autoDetectShift(tenantId, data.branch_id, data.employee_id)
  if (!detected) throw new Error('NO_SHIFT_AVAILABLE')

  const { shift, isOutsideShift } = detected

  if (branch.lat && branch.lng && data.gps_lat != null && data.gps_lng != null) {
    const radius = (shift as any)?.gps_radius ?? branch.gps_radius
    const dist = Math.round(haversineMeters(
      data.gps_lat, data.gps_lng,
      Number(branch.lat), Number(branch.lng),
    ))
    if (dist > radius) {
      if (branch.geo_mode === 'BLOCK') throw new Error('OUTSIDE_GEOFENCE')
      is_outside_area = true
    }
  }

  const now = new Date()
  const today = getTodayBangkok()
  const dayRule = await resolveDayRule(tenantId, data.employee_id, today)
  const { late, dayRuleNote } = applyDayRule(computeLateStatus(shift, dateToBangkokMins(now)), dayRule)
  const levelFine = late.is_absent ? 0 : fineForLevel(shift, late.late_level)

  const { record, carried } = await prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id:        tenantId,
        employee_id:      data.employee_id,
        shift_id:         shift.id,
        date:             today,
        check_in_at:      now,
        check_in_method:  'QR',
        is_late:          late.is_late,
        late_minutes:     late.late_minutes,
        is_absent:        late.is_absent,
        fine:             levelFine,
        carried_fine:     carried,
        note:             dayRuleNote ?? (late.is_absent ? absentNote(now) : undefined),
        gps_lat:          data.gps_lat,
        gps_lng:          data.gps_lng,
        is_outside_area,
        is_outside_shift: isOutsideShift,
      },
    })
    if (late.is_absent && shift.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return { record, carried }
  })

  return {
    record,
    shift: {
      id:         shift.id,
      name:       shift.name,
      start_time: shift.start_time,
      end_time:   shift.end_time,
    },
    branch:           { id: branch.id, name: branch.name },
    late_level:       late.late_level,
    late_minutes:     late.late_minutes,
    is_absent:        late.is_absent,
    fine:             levelFine + carried,
    is_outside_area,
    is_outside_shift: isOutsideShift,
  }
}

function buildDateTime(dateStr: string, timeStr?: string): Date | null {
  if (!timeStr) return null
  const [y, mo, d]  = dateStr.split('-').map(Number)
  const [h, m]      = timeStr.split(':').map(Number)
  // UTC date + Bangkok offset (+7h) so the stored timestamp reflects local time
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m, 0, 0))
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function checkIn(tenantId: string, data: {
  employee_id: string
  shift_id: string
  branch_id?: string
  gps_lat?: number
  gps_lng?: number
  note?: string
}) {
  const today = getTodayBangkok()

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employee_id_shift_id_date: {
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        date: today,
      },
    },
  })
  if (existing) throw new Error('ALREADY_CHECKED_IN')

  const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } })
  const now = new Date()
  const dayRule = await resolveDayRule(tenantId, data.employee_id, today)
  const rawLate = shift ? computeLateStatus(shift, dateToBangkokMins(now)) : { is_late: false, late_level: 0 as const, late_minutes: 0, is_absent: false }
  const { late, dayRuleNote } = applyDayRule(rawLate, dayRule)
  const levelFine = shift && !late.is_absent ? fineForLevel(shift, late.late_level) : 0

  // ตรวจสอบ GPS vs geo_mode ของสาขา
  let is_outside_area = false

  if (data.branch_id && data.gps_lat != null && data.gps_lng != null) {
    const branch = await prisma.branch.findFirst({ where: { id: data.branch_id } })
    const shiftRadius = (shift as any)?.gps_radius ?? null
    if (branch?.lat && branch?.lng) {
      const radius = shiftRadius ?? branch.gps_radius
      const dist = Math.round(haversineMeters(
        data.gps_lat, data.gps_lng,
        Number(branch.lat), Number(branch.lng),
      ))
      if (dist > radius) {
        if (branch.geo_mode === 'BLOCK') throw new Error('OUTSIDE_GEOFENCE')
        is_outside_area = true
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id:       tenantId,
        employee_id:     data.employee_id,
        shift_id:        data.shift_id,
        date:            today,
        check_in_at:     now,
        check_in_method: 'LIFF',
        is_late:         late.is_late,
        late_minutes:    late.late_minutes,
        is_absent:       late.is_absent,
        fine:            levelFine,
        carried_fine:    carried,
        gps_lat:         data.gps_lat,
        gps_lng:         data.gps_lng,
        is_outside_area,
        note:            data.note ?? dayRuleNote ?? (late.is_absent ? absentNote(now) : null),
      },
    })
    if (shift && late.is_absent && shift.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return record
  })
}

export async function checkInQR(tenantId: string, data: {
  employee_id: string
  shift_id: string
  branch_id: string
  gps_lat: number
  gps_lng: number
}) {
  const branch = await prisma.branch.findFirst({
    where: { id: data.branch_id, tenant_id: tenantId, deleted_at: null },
  })
  if (!branch) throw new Error('BRANCH_NOT_FOUND')

  if (branch.lat && branch.lng) {
    const dist = Math.round(haversineMeters(
      data.gps_lat, data.gps_lng,
      Number(branch.lat), Number(branch.lng),
    ))
    if (dist > branch.gps_radius) throw new Error('OUTSIDE_GEOFENCE')
  }

  const today = getTodayBangkok()

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employee_id_shift_id_date: {
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        date: today,
      },
    },
  })
  if (existing) throw new Error('ALREADY_CHECKED_IN')

  const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } })
  const now = new Date()
  const dayRule = await resolveDayRule(tenantId, data.employee_id, today)
  const rawLate = shift ? computeLateStatus(shift, dateToBangkokMins(now)) : { is_late: false, late_level: 0 as const, late_minutes: 0, is_absent: false }
  const { late, dayRuleNote } = applyDayRule(rawLate, dayRule)
  const levelFine = shift && !late.is_absent ? fineForLevel(shift, late.late_level) : 0

  return prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id:       tenantId,
        employee_id:     data.employee_id,
        shift_id:        data.shift_id,
        date:            today,
        check_in_at:     now,
        check_in_method: 'QR',
        is_late:         late.is_late,
        late_minutes:    late.late_minutes,
        is_absent:       late.is_absent,
        fine:            levelFine,
        carried_fine:    carried,
        gps_lat:         data.gps_lat,
        gps_lng:         data.gps_lng,
        is_outside_area: false,
        note:            dayRuleNote ?? (late.is_absent ? absentNote(now) : undefined),
      },
    })
    if (shift && late.is_absent && shift.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return record
  })
}

export async function checkInScan(tenantId: string, data: {
  employee_id: string
  shift_id: string
  branch_id: string
  gps_lat?: number
  gps_lng?: number
}): Promise<{
  record: any; shift: any; branch: any
  late_level: 0 | 1 | 2; late_minutes: number; is_absent: boolean; fine: number; is_outside_area: boolean
}> {
  const branch = await prisma.branch.findFirst({
    where: { id: data.branch_id, tenant_id: tenantId, deleted_at: null },
  })
  if (!branch) throw new Error('BRANCH_NOT_FOUND')

  const shift = await prisma.shift.findFirst({
    where: { id: data.shift_id, tenant_id: tenantId, deleted_at: null },
  })
  if (!shift) throw new Error('SHIFT_NOT_FOUND')

  // ตรวจ GPS
  let is_outside_area = false
  if (branch.lat && branch.lng && data.gps_lat != null && data.gps_lng != null) {
    const radius = branch.gps_radius ?? 200
    const dist = haversineMeters(data.gps_lat, data.gps_lng, Number(branch.lat), Number(branch.lng))
    if (dist > radius) {
      if (branch.geo_mode === 'BLOCK') throw new Error('OUTSIDE_GEOFENCE')
      is_outside_area = true
    }
  }

  const today = getTodayBangkok()

  const existing = await prisma.attendanceRecord.findUnique({
    where: { employee_id_shift_id_date: { employee_id: data.employee_id, shift_id: data.shift_id, date: today } },
  })
  if (existing) throw new Error('ALREADY_CHECKED_IN')

  const now = new Date()
  const late = computeLateStatus(shift, dateToBangkokMins(now))
  const levelFine = late.is_absent ? 0 : fineForLevel(shift, late.late_level)

  const { record, carried } = await prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id: tenantId, employee_id: data.employee_id, shift_id: data.shift_id,
        date: today, check_in_at: now, check_in_method: 'QR',
        is_late: late.is_late, late_minutes: late.late_minutes, is_absent: late.is_absent,
        fine: levelFine, carried_fine: carried,
        gps_lat: data.gps_lat, gps_lng: data.gps_lng, is_outside_area,
        note: late.is_absent ? absentNote(now) : undefined,
      },
    })
    if (late.is_absent && shift.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return { record, carried }
  })

  return {
    record,
    shift: { id: shift.id, name: shift.name, start_time: shift.start_time, end_time: shift.end_time },
    branch: { id: branch.id, name: branch.name },
    late_level: late.late_level, late_minutes: late.late_minutes, is_absent: late.is_absent,
    fine: levelFine + carried, is_outside_area,
  }
}

export async function checkInOffsite(tenantId: string, data: {
  employee_id: string
  gps_lat: number
  gps_lng: number
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
    select: { branch_id: true },
  })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  const detected = await autoDetectShift(tenantId, employee.branch_id, data.employee_id)
  if (!detected) throw new Error('NO_SHIFT_AVAILABLE')

  const { shift } = detected
  if ((shift as any).shift_type !== 'OFFSITE') throw new Error('NOT_OFFSITE_SHIFT')

  const now = new Date()
  const late = computeLateStatus(shift, dateToBangkokMins(now))
  const levelFine = late.is_absent ? 0 : fineForLevel(shift, late.late_level)

  const today = getTodayBangkok()
  const { record, carried } = await prisma.$transaction(async (tx) => {
    const carried = await settlePendingFine(tx, data.employee_id)
    const record = await tx.attendanceRecord.create({
      data: {
        tenant_id:       tenantId,
        employee_id:     data.employee_id,
        shift_id:        shift.id,
        date:            today,
        check_in_at:     now,
        check_in_method: 'OFFSITE',
        is_late: late.is_late, late_minutes: late.late_minutes, is_absent: late.is_absent,
        fine: levelFine, carried_fine: carried,
        gps_lat:         data.gps_lat,
        gps_lng:         data.gps_lng,
        is_outside_area: false,
        note:            late.is_absent ? absentNote(now) : undefined,
      },
    })
    if (late.is_absent && shift.absent_fine) await schedulePendingFine(tx, data.employee_id, Number(shift.absent_fine))
    return { record, carried }
  })

  return {
    record,
    shift: { id: shift.id, name: shift.name, start_time: shift.start_time, end_time: shift.end_time },
    late_level: late.late_level, late_minutes: late.late_minutes, is_absent: late.is_absent,
    fine: levelFine + carried,
    gps_lat: data.gps_lat,
    gps_lng: data.gps_lng,
  }
}

export async function getOffsiteShifts(tenantId: string, branchId: string) {
  return prisma.shift.findMany({
    where: { tenant_id: tenantId, branch_id: branchId, shift_type: 'OFFSITE', is_active: true, deleted_at: null },
    select: { id: true, name: true, start_time: true, end_time: true },
    orderBy: { start_time: 'asc' },
  })
}

export async function checkOut(tenantId: string, data: {
  employee_id: string
  shift_id: string
}) {
  const today = getTodayBangkok()

  const record = await prisma.attendanceRecord.findUnique({
    where: { employee_id_shift_id_date: { employee_id: data.employee_id, shift_id: data.shift_id, date: today } },
  })
  if (!record) throw new Error('NOT_CHECKED_IN')
  if (record.check_out_at) throw new Error('ALREADY_CHECKED_OUT')

  return prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { check_out_at: new Date() },
  })
}

export async function checkOutScan(tenantId: string, employeeId: string, branchId: string) {
  const today = getTodayBangkok()

  // หาทุก record วันนี้ที่ check-in แล้วยังไม่ check-out
  const openRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenant_id:    tenantId,
      employee_id:  employeeId,
      date:         today,
      check_in_at:  { not: null },
      check_out_at: null,
    },
    include: { shift: { include: { branch: { select: { id: true, name: true } } } } },
    orderBy: { check_in_at: 'asc' },
  })

  if (openRecords.length === 0) throw new Error('NOT_CHECKED_IN')

  // เลือก record ที่ตรงกับ branch จาก QR ก่อน — ถ้าไม่มีให้ใช้ record ล่าสุด
  const record = openRecords.find(r => r.shift.branch_id === branchId) ?? openRecords[openRecords.length - 1]

  if (record.shift.min_checkout) {
    const nowMins  = getNowBangkokMins()
    const minMins  = toMins(record.shift.min_checkout)
    if (nowMins < minMins) throw new Error(`TOO_EARLY:${record.shift.min_checkout}`)
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data:  { check_out_at: new Date() },
    include: { shift: { select: { id: true, name: true, start_time: true, end_time: true } } },
  })

  const workMinutes = Math.round(
    (new Date(updated.check_out_at!).getTime() - new Date(record.check_in_at!).getTime()) / 60000
  )

  return {
    record:     updated,
    shift:      updated.shift,
    branch:     record.shift.branch,
    workMinutes,
  }
}

export async function checkOutAuto(tenantId: string, employeeId: string) {
  const today = getTodayBangkok()

  const records = await prisma.attendanceRecord.findMany({
    where: {
      tenant_id:    tenantId,
      employee_id:  employeeId,
      date:         today,
      check_in_at:  { not: null },
      check_out_at: null,
    },
    include: { shift: true },
    orderBy: { check_in_at: 'asc' },
  })

  if (records.length === 0) throw new Error('NOT_CHECKED_IN')

  const record = records[records.length - 1]

  if (record.shift.min_checkout) {
    const nowMins  = getNowBangkokMins()
    const minMins  = toMins(record.shift.min_checkout)
    if (nowMins < minMins) throw new Error(`TOO_EARLY:${record.shift.min_checkout}`)
  }

  const updated = await prisma.attendanceRecord.update({
    where: { id: record.id },
    data:  { check_out_at: new Date() },
    include: { shift: { select: { id: true, name: true, start_time: true, end_time: true } } },
  })

  const checkInMs  = new Date(record.check_in_at!).getTime()
  const checkOutMs = new Date(updated.check_out_at!).getTime()
  const workMinutes = Math.round((checkOutMs - checkInMs) / 60000)

  return { record: updated, workMinutes }
}

export async function getTodayAttendance(tenantId: string, employeeId: string) {
  const today = getTodayBangkok()

  return prisma.attendanceRecord.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId, date: today },
    include: { shift: { select: { id: true, name: true, start_time: true, end_time: true, min_checkout: true } } },
    orderBy: { check_in_at: 'asc' },
  })
}

export async function getEmployeeHistory(tenantId: string, employeeId: string) {
  return prisma.attendanceRecord.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    include: { shift: { select: { id: true, name: true, start_time: true, end_time: true } } },
    orderBy: { date: 'desc' },
    take: 30,
  })
}
