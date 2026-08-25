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

  const employee = await prisma.employee.findFirst({ where: { id: data.employee_id, tenant_id: tenantId }, select: { position_id: true } })
  const conflict = await hasPositionConflict(tenantId, data.employee_id, employee?.position_id ?? null, monday, data.day_of_week)

  const created = await prisma.weeklyOffRequest.create({
    data: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      week_start:  monday,
      day_of_week: data.day_of_week,
      has_conflict: conflict,
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } },
    },
  })
  if (conflict && employee?.position_id) {
    await prisma.weeklyOffRequest.updateMany({
      where: {
        tenant_id: tenantId, week_start: monday, day_of_week: data.day_of_week,
        employee_id: { not: data.employee_id },
        status: { in: ['PENDING', 'APPROVED'] },
        employee: { position_id: employee.position_id },
      },
      data: { has_conflict: true },
    })
  }
  return created
}

export async function updateWeeklyOff(tenantId: string, id: string, data: {
  day_of_week?: number
  week_start?: string   // YYYY-MM-DD — ย้ายไปสัปดาห์อื่น (ปฏิทินรวม: ลากวางย้ายวันหยุด) normalize เป็น Monday อัตโนมัติ
  status?: 'APPROVED' | 'REJECTED'
  reviewed_by?: string
  reject_note?: string
}) {
  const req = await prisma.weeklyOffRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return null

  let monday: Date | undefined
  if (data.week_start !== undefined) {
    monday = getMondayOf(data.week_start)
    // ย้ายข้ามสัปดาห์ต้องเช็ค unique (employee_id + week_start) ก่อน — เว้นตัวเอง
    if (monday.getTime() !== req.week_start.getTime()) {
      const conflict = await prisma.weeklyOffRequest.findUnique({
        where: { employee_id_week_start: { employee_id: req.employee_id, week_start: monday } },
      })
      if (conflict && conflict.id !== id) throw new Error('ALREADY_REQUESTED')
    }
  }

  return prisma.weeklyOffRequest.update({
    where: { id },
    data: {
      ...(data.day_of_week !== undefined ? { day_of_week: data.day_of_week } : {}),
      ...(monday !== undefined ? { week_start: monday } : {}),
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

// ── Monthly Batch Off (weekly_off_mode = MONTHLY_BATCH) ──────────────────────
// พนักงาน mode นี้ต้องจองครบทุกสัปดาห์ในเดือนรวดเดียว (1 วัน/สัปดาห์ x 4-5 สัปดาห์)
// ไม่บังคับจำนวนตายตัวเป็น 4 — คำนวณจากจำนวนวันจันทร์จริงในเดือนนั้น (บางเดือนมี 5)

function getTodayStrBangkok(): string {
  const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${bkk.getFullYear()}-${String(bkk.getMonth() + 1).padStart(2, '0')}-${String(bkk.getDate()).padStart(2, '0')}`
}

// สัปดาห์ที่ "ต้องเลือกให้ครบ" จริง — ไม่นับสัปดาห์ที่ผ่านไปแล้วทั้งสัปดาห์ (mirror ของ
// getWeeksOfMonth ฝั่ง frontend employee/src/pages/leave/index.tsx) กันเคส user เปิดดู
// เดือนปัจจุบันตอนผ่านไปแล้วบางส่วน แล้วติด deadlock เลือกวันในสัปดาห์ที่ผ่านไปแล้วไม่ได้
// แต่ระบบยังบังคับให้ครบทุกสัปดาห์รวมสัปดาห์เก่าด้วย
function getWeeksOfMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mondays = new Set<string>()
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`
    mondays.add(getMondayOf(dateStr).toISOString().slice(0, 10))
  }
  const today = getTodayStrBangkok()
  return [...mondays].filter(monday => {
    const sunday = new Date(monday + 'T00:00:00Z')
    sunday.setUTCDate(sunday.getUTCDate() + 6)
    return sunday.toISOString().slice(0, 10) >= today
  }).sort()
}

// ตำแหน่งเดียวกัน + วันเดียวกัน (week_start+day_of_week) ถูกจองไว้แล้วโดยคนอื่นไหม (PENDING/APPROVED)
// ไม่บล็อคการจอง — แค่คืนค่าไว้ set has_conflict ให้แอดมินเห็นตอนอนุมัติ ตาม spec
// ("ยังจองได้ แต่ให้แอดมินเป็นคนตัดสินใจ")
async function hasPositionConflict(tenantId: string, employeeId: string, positionId: string | null, weekStart: Date, dayOfWeek: number): Promise<boolean> {
  if (!positionId) return false
  const conflict = await prisma.weeklyOffRequest.findFirst({
    where: {
      tenant_id: tenantId,
      week_start: weekStart,
      day_of_week: dayOfWeek,
      employee_id: { not: employeeId },
      status: { in: ['PENDING', 'APPROVED'] },
      employee: { position_id: positionId },
    },
  })
  return !!conflict
}

export async function createMonthlyBatchOff(tenantId: string, data: {
  employee_id: string
  month: string       // YYYY-MM
  dates: string[]      // YYYY-MM-DD
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId },
    select: { position_id: true, employee_status_type_id: true, employee_status_type: { select: { monthly_off_quota: true } } },
  })

  const picked = data.dates.map(dateStr => ({
    dateStr,
    weekStart: getMondayOf(dateStr).toISOString().slice(0, 10),
  }))

  // มีสถานะพนักงานผูกโควต้าแล้ว → โหมดโควต้า: เลือกกี่วันก็ได้ในเดือน ไม่เกินโควต้า
  // ไม่บังคับครบทุกสัปดาห์/ไม่บังคับ 1 วันต่อสัปดาห์อีกต่อไป (ตาม spec สถานะพนักงานกำหนดจำนวนวัน)
  if (employee?.employee_status_type_id && employee.employee_status_type) {
    const quota = employee.employee_status_type.monthly_off_quota
    const uniqueDates = new Set(picked.map(p => p.dateStr))
    if (uniqueDates.size !== picked.length) throw new Error('DUPLICATE_DATE')
    if (picked.length > quota) throw new Error('OVER_QUOTA')
  } else {
    // ยังไม่ได้ผูกสถานะพนักงาน → fallback พฤติกรรมเดิม: ต้องครบทุกสัปดาห์ของเดือน (1 วัน/สัปดาห์)
    const requiredWeeks = getWeeksOfMonth(data.month)
    const pickedWeeks = new Set(picked.map(p => p.weekStart))
    if (pickedWeeks.size !== picked.length) throw new Error('DUPLICATE_WEEK')
    if (picked.length !== requiredWeeks.length || requiredWeeks.some(w => !pickedWeeks.has(w))) {
      throw new Error('INCOMPLETE_MONTH')
    }
  }

  try {
    return await prisma.$transaction(async tx => {
      const created = []
      for (const p of picked) {
        const week_start = new Date(p.weekStart + 'T00:00:00Z')
        const day_of_week = new Date(p.dateStr + 'T00:00:00Z').getUTCDay()
        const conflict = await hasPositionConflict(tenantId, data.employee_id, employee?.position_id ?? null, week_start, day_of_week)
        const row = await tx.weeklyOffRequest.create({
          data: { tenant_id: tenantId, employee_id: data.employee_id, week_start, day_of_week, has_conflict: conflict },
          include: { employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } } },
        })
        if (conflict && employee?.position_id) {
          // แก้ record ของคนอื่นที่ชนกันให้ flag ด้วย เพื่อให้แอดมินเห็นทั้งสองฝั่ง
          await tx.weeklyOffRequest.updateMany({
            where: {
              tenant_id: tenantId, week_start, day_of_week,
              employee_id: { not: data.employee_id },
              status: { in: ['PENDING', 'APPROVED'] },
              employee: { position_id: employee.position_id },
            },
            data: { has_conflict: true },
          })
        }
        created.push(row)
      }
      return created
    })
  } catch (e: any) {
    if (e.code === 'P2002') throw new Error('ALREADY_REQUESTED')
    throw e
  }
}

// ── Monthly Off (เดิม — ยังไม่มี frontend เรียกใช้) ───────────────────────────

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
    select: { branch_id: true, position_id: true },
  })

  const all = await prisma.weeklyOffRequest.findMany({
    where: {
      tenant_id:  tenantId,
      week_start: { gte: startOfMonth, lte: endOfMonth },
      employee:   { branch_id: employee?.branch_id ?? undefined },
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, position_id: true } },
    },
    orderBy: { week_start: 'asc' },
  })

  // same_position: คนตำแหน่งเดียวกับตัวเอง — ใช้กันจองซ้ำวันหยุดในตำแหน่งเดียวกัน (ยังจองซ้ำได้ แต่ให้เห็น flag)
  return {
    own: all.filter(r => r.employee_id === employeeId),
    colleagues: all.filter(r => r.employee_id !== employeeId).map(r => ({
      ...r,
      same_position: !!employee?.position_id && r.employee.position_id === employee.position_id,
    })),
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
