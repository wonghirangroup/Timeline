// server/src/modules/attendance/attendance.service.ts
import { prisma } from '../../common/utils/prisma'

export async function getAttendanceReport(tenantId: string, filters: {
  date?: string
  branchId?: string
  employeeId?: string
}) {
  return prisma.attendanceRecord.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(filters.date ? { date: new Date(filters.date) } : {}),
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
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
      shift: { select: { id: true, name: true, start_time: true, end_time: true, late_threshold_1: true, late_threshold_2: true } },
    },
    orderBy: [{ date: 'desc' }, { check_in_at: 'asc' }],
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
      check_in_method: 'WEB_FALLBACK',
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

function buildDateTime(dateStr: string, timeStr?: string): Date | null {
  if (!timeStr) return null
  const [y, mo, d]  = dateStr.split('-').map(Number)
  const [h, m]      = timeStr.split(':').map(Number)
  // UTC date + Bangkok offset (+7h) so the stored timestamp reflects local time
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m, 0, 0))
}

export async function checkIn(tenantId: string, data: {
  employee_id: string
  shift_id: string
  note?: string
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

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

  return prisma.attendanceRecord.create({
    data: {
      tenant_id:        tenantId,
      employee_id:      data.employee_id,
      shift_id:         data.shift_id,
      date:             today,
      check_in_at:      new Date(),
      check_in_method:  'LIFF',
      is_late,
      late_minutes,
      note:             data.note,
    },
  })
}

export async function checkOut(tenantId: string, data: {
  employee_id: string
  shift_id: string
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const record = await prisma.attendanceRecord.findUnique({
    where: {
      employee_id_shift_id_date: {
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        date: today,
      },
    },
  })

  if (!record) throw new Error('NOT_CHECKED_IN')
  if (record.check_out_at) throw new Error('ALREADY_CHECKED_OUT')

  return prisma.attendanceRecord.update({
    where: { id: record.id },
    data: { check_out_at: new Date() },
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
