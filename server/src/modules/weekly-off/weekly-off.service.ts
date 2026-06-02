// server/src/modules/weekly-off/weekly-off.service.ts
import { prisma } from '../../common/utils/prisma'

function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function listWeeklyOff(tenantId: string, filters: {
  weekStart?: string   // YYYY-MM-DD → สัปดาห์เดียว
  month?: string       // YYYY-MM → ทั้งเดือน
  branchId?: string
  employeeId?: string
  status?: string
}) {
  const where: any = { tenant_id: tenantId }

  if (filters.month) {
    const [y, m] = filters.month.split('-').map(Number)
    where.week_start = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0)),
    }
  } else if (filters.weekStart) {
    const monday = getMondayOf(filters.weekStart)
    const sunday = new Date(monday)
    sunday.setUTCDate(sunday.getUTCDate() + 6)
    where.week_start = { gte: monday, lte: sunday }
  }

  if (filters.status) where.status = filters.status

  if (filters.employeeId) {
    where.employee_id = filters.employeeId
  } else if (filters.branchId) {
    where.employee = { branch_id: filters.branchId }
  }

  return prisma.weeklyOffRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true, first_name: true, last_name: true, nickname: true, employee_code: true,
          branch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ week_start: 'asc' }, { day_of_week: 'asc' }],
  })
}

export async function createWeeklyOff(tenantId: string, data: {
  employee_id: string
  week_start: string    // YYYY-MM-DD (ระบบ normalize เป็น Monday อัตโนมัติ)
  day_of_week: number   // 0-6
}) {
  const monday = getMondayOf(data.week_start)

  const existing = await prisma.weeklyOffRequest.findUnique({
    where: { employee_id_week_start: { employee_id: data.employee_id, week_start: monday } },
  })
  if (existing) throw new Error('ALREADY_REQUESTED')

  return prisma.weeklyOffRequest.create({
    data: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      week_start:  monday,
      day_of_week: data.day_of_week,
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } },
    },
  })
}

export async function updateWeeklyOff(tenantId: string, id: string, data: {
  day_of_week?: number
  status?: 'APPROVED' | 'REJECTED'
  reviewed_by?: string
  reject_note?: string
}) {
  const req = await prisma.weeklyOffRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return null

  return prisma.weeklyOffRequest.update({
    where: { id },
    data: {
      ...(data.day_of_week !== undefined ? { day_of_week: data.day_of_week } : {}),
      ...(data.status ? { status: data.status, reviewed_by: data.reviewed_by, reviewed_at: new Date() } : {}),
      ...(data.reject_note ? { reject_note: data.reject_note } : {}),
    },
  })
}

export async function deleteWeeklyOff(tenantId: string, id: string) {
  const count = await prisma.weeklyOffRequest.deleteMany({ where: { id, tenant_id: tenantId } })
  return count.count > 0
}

// ตรวจว่า employee มีวันหยุดในสัปดาห์นี้ไหม (ใช้ตอนเช็คอิน Phase 2)
export async function getEmployeeWeeklyOff(tenantId: string, employeeId: string, date: Date) {
  const monday = getMondayOf(date.toISOString().slice(0, 10))
  return prisma.weeklyOffRequest.findUnique({
    where: { employee_id_week_start: { employee_id: employeeId, week_start: monday } },
  })
}

// ── Monthly Off ─────────────────────────────────────────────────────────────

export async function createMonthlyOff(tenantId: string, data: {
  employee_id: string
  date: string // YYYY-MM-DD — วันที่จริงที่ต้องการหยุด
}) {
  const d = new Date(data.date + 'T00:00:00Z')
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()

  const startOfMonth = new Date(Date.UTC(year, month, 1))
  const endOfMonth   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))

  // 1 เดือน = 1 คำขอเท่านั้น
  const existing = await prisma.weeklyOffRequest.findFirst({
    where: {
      employee_id: data.employee_id,
      tenant_id:   tenantId,
      week_start:  { gte: startOfMonth, lte: endOfMonth },
    },
  })
  if (existing) throw new Error('ALREADY_REQUESTED')

  return prisma.weeklyOffRequest.create({
    data: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      week_start:  d,               // เก็บวันจริง (ไม่ normalize เป็น Monday)
      day_of_week: d.getUTCDay(),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } },
      },
    },
  })
}

export async function getMonthView(tenantId: string, employeeId: string, month: string) {
  const [y, m] = month.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1))
  const endOfMonth   = new Date(Date.UTC(y, m, 0, 23, 59, 59))

  const employee = await prisma.employee.findFirst({
    where:  { id: employeeId, tenant_id: tenantId },
    select: { branch_id: true },
  })

  const all = await prisma.weeklyOffRequest.findMany({
    where: {
      tenant_id:  tenantId,
      week_start: { gte: startOfMonth, lte: endOfMonth },
      employee:   { branch_id: employee?.branch_id ?? undefined },
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true } },
    },
    orderBy: { week_start: 'asc' },
  })

  return {
    own:       all.filter(r => r.employee_id === employeeId),
    colleagues: all.filter(r => r.employee_id !== employeeId),
  }
}

export async function deleteMonthlyOff(tenantId: string, id: string, employeeId: string) {
  const req = await prisma.weeklyOffRequest.findFirst({
    where: { id, tenant_id: tenantId, employee_id: employeeId },
  })
  if (!req) return false
  if (req.status !== 'PENDING') throw new Error('NOT_PENDING')

  await prisma.weeklyOffRequest.delete({ where: { id } })
  return true
}
