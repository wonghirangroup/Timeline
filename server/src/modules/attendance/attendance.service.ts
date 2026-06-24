// server/src/modules/attendance/attendance.service.ts
import { prisma } from '../../common/utils/prisma'

export async function getAttendanceReport(tenantId: string, filters: {
  date?: string
  startDate?: string
  endDate?: string
  branchId?: string
  employeeId?: string
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

  return prisma.attendanceRecord.findMany({
    where: {
      tenant_id: tenantId,
      ...dateFilter,
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
      ...(filters.branchId   ? { employee: { branch_id: filters.branchId } } : {}),
    },
    include: {
      employee: {
        select: {
          id: true, first_name: true, last_name: true, nickname: true,
          employee_code: true,
          branch: { select: { id: true, name: true } },
        },
      },
      shift: { select: { id: true, name: true, start_time: true, end_time: true } },
    },
    orderBy: [{ date: 'asc' }, { check_in_at: 'asc' }],
  })
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

  // คำนวณ is_late จาก shift
  const shift = await prisma.shift.findUnique({ where: { id: data.shift_id } })
  let is_late = false
  let late_minutes = 0

  const checkInAt = buildDateTime(data.date, data.check_in_at)

  if (shift && checkInAt) {
    const [h, m] = shift.start_time.split(':').map(Number)
    const shiftStart = new Date(data.date)
    shiftStart.setHours(h, m, 0, 0)
    const threshold = new Date(shiftStart.getTime() + shift.late_threshold * 60000)
    if (checkInAt > threshold) {
      is_late = true
      late_minutes = Math.floor((checkInAt.getTime() - shiftStart.getTime()) / 60000)
    }
  }

  return prisma.attendanceRecord.create({
    data: {
      tenant_id:       tenantId,
      employee_id:     data.employee_id,
      shift_id:        data.shift_id,
      date:            dateObj,
      check_in_at:     checkInAt ?? undefined,
      check_out_at:    buildDateTime(data.date, data.check_out_at) ?? undefined,
      check_in_method: 'ADMIN',
      is_late,
      late_minutes,
      note:            data.note,
    },
  })
}

export async function updateAttendanceTime(tenantId: string, id: string, data: {
  date?: string
  check_in_at?: string | null   // HH:mm หรือ null
  check_out_at?: string | null  // HH:mm หรือ null
  note?: string
}) {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id, tenant_id: tenantId },
    include: { shift: true },
  })
  if (!record) return null

  const dateStr = data.date ?? record.date.toISOString().slice(0, 10)

  let is_late = record.is_late
  let late_minutes = record.late_minutes

  const checkInAt = data.check_in_at !== undefined
    ? (data.check_in_at ? buildDateTime(dateStr, data.check_in_at) : null)
    : record.check_in_at

  if (data.check_in_at !== undefined && checkInAt && record.shift) {
    const [h, m] = record.shift.start_time.split(':').map(Number)
    const shiftStart = new Date(dateStr)
    shiftStart.setHours(h, m, 0, 0)
    const threshold = new Date(shiftStart.getTime() + record.shift.late_threshold * 60000)
    is_late = checkInAt > threshold
    late_minutes = is_late ? Math.floor((checkInAt.getTime() - shiftStart.getTime()) / 60000) : 0
  }

  const checkOutAt = data.check_out_at !== undefined
    ? (data.check_out_at ? buildDateTime(dateStr, data.check_out_at) : null)
    : record.check_out_at

  return prisma.attendanceRecord.update({
    where: { id },
    data: {
      check_in_at:  checkInAt,
      check_out_at: checkOutAt,
      is_late,
      late_minutes,
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  })
}

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function getNowBangkokMins(): number {
  const now = new Date()
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes()
  return (utcMins + 7 * 60) % (24 * 60)
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
  for (const shift of shifts) {
    const startMins = toMins(shift.start_time)
    const earlyMins = startMins - 60
    const closeMins = shift.late_threshold_2
      ? toMins(shift.late_threshold_2)
      : startMins + 4 * 60

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

  const nowMins    = getNowBangkokMins()
  const startMins  = toMins(shift.start_time)
  const late1Mins  = shift.late_threshold_1 ? toMins(shift.late_threshold_1) : null
  const late2Mins  = shift.late_threshold_2 ? toMins(shift.late_threshold_2) : null

  let is_late     = false
  let late_level  = 0
  let late_minutes = 0
  let fine = 0

  if (!isOutsideShift && nowMins > startMins) {
    late_minutes = nowMins - startMins
    if (late2Mins && nowMins >= late2Mins) {
      is_late = true; late_level = 2
      fine = shift.late_fine_2 ? Number(shift.late_fine_2) : 0
    } else if (late1Mins && nowMins >= late1Mins) {
      is_late = true; late_level = 1
      fine = shift.late_fine_1 ? Number(shift.late_fine_1) : 0
    }
  }

  const today = getTodayBangkok()

  const record = await prisma.attendanceRecord.create({
    data: {
      tenant_id:        tenantId,
      employee_id:      data.employee_id,
      shift_id:         shift.id,
      date:             today,
      check_in_at:      new Date(),
      check_in_method:  'QR',
      is_late,
      late_minutes,
      gps_lat:          data.gps_lat,
      gps_lng:          data.gps_lng,
      is_outside_area,
      is_outside_shift: isOutsideShift,
    },
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
    late_level,
    late_minutes,
    fine,
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
  let is_late = false
  let late_minutes = 0

  if (shift) {
    const [h, m] = shift.start_time.split(':').map(Number)
    const now = new Date()
    const shiftStartMs = new Date().setHours(h, m, 0, 0)
    const thresholdMs  = shiftStartMs + shift.late_threshold * 60 * 1000
    is_late = now.getTime() > thresholdMs
    if (is_late) {
      late_minutes = Math.floor((now.getTime() - shiftStartMs) / 60000)
    }
  }

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

  return prisma.attendanceRecord.create({
    data: {
      tenant_id:       tenantId,
      employee_id:     data.employee_id,
      shift_id:        data.shift_id,
      date:            today,
      check_in_at:     new Date(),
      check_in_method: 'LIFF',
      is_late,
      late_minutes,
      gps_lat:         data.gps_lat,
      gps_lng:         data.gps_lng,
      is_outside_area,
      note:            data.note ?? null,
    },
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
  let is_late = false
  let late_minutes = 0

  if (shift) {
    const [h, m] = shift.start_time.split(':').map(Number)
    const shiftStartMs = new Date().setHours(h, m, 0, 0)
    const thresholdMs = shiftStartMs + shift.late_threshold * 60 * 1000
    is_late = Date.now() > thresholdMs
    if (is_late) late_minutes = Math.floor((Date.now() - shiftStartMs) / 60000)
  }

  return prisma.attendanceRecord.create({
    data: {
      tenant_id:       tenantId,
      employee_id:     data.employee_id,
      shift_id:        data.shift_id,
      date:            today,
      check_in_at:     new Date(),
      check_in_method: 'QR',
      is_late,
      late_minutes,
      gps_lat:         data.gps_lat,
      gps_lng:         data.gps_lng,
      is_outside_area: false,
    },
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
  late_level: 0 | 1 | 2; late_minutes: number; fine: number; is_outside_area: boolean
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

  const nowMins   = getNowBangkokMins()
  const startMins = toMins(shift.start_time)
  const late1Mins = shift.late_threshold_1 ? toMins(shift.late_threshold_1) : null
  const late2Mins = shift.late_threshold_2 ? toMins(shift.late_threshold_2) : null

  let is_late = false; let late_level: 0 | 1 | 2 = 0; let late_minutes = 0; let fine = 0

  if (nowMins > startMins) {
    late_minutes = nowMins - startMins
    if (late2Mins && nowMins >= late2Mins) {
      is_late = true; late_level = 2; fine = shift.late_fine_2 ? Number(shift.late_fine_2) : 0
    } else if (late1Mins && nowMins >= late1Mins) {
      is_late = true; late_level = 1; fine = shift.late_fine_1 ? Number(shift.late_fine_1) : 0
    }
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      tenant_id: tenantId, employee_id: data.employee_id, shift_id: data.shift_id,
      date: today, check_in_at: new Date(), check_in_method: 'QR',
      is_late, late_minutes, gps_lat: data.gps_lat, gps_lng: data.gps_lng, is_outside_area,
    },
  })

  return {
    record,
    shift: { id: shift.id, name: shift.name, start_time: shift.start_time, end_time: shift.end_time },
    branch: { id: branch.id, name: branch.name },
    late_level, late_minutes, fine, is_outside_area,
  }
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
