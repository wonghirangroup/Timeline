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
          id: true, first_name: true, last_name: true, employee_code: true,
          branch: { select: { id: true, name: true } },
        },
      },
      shift: { select: { id: true, name: true, start_time: true, end_time: true } },
    },
    orderBy: [{ date: 'desc' }, { check_in_at: 'asc' }],
  })
}

export async function checkIn(tenantId: string, data: {
  employee_id: string
  shift_id: string
  note?: string
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ตรวจว่าเช็คอินซ้ำในกะเดียวกันหรือเปล่า
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

  // คำนวณว่าสายไหม
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
