// server/src/modules/weekly-off/weekly-off.service.ts
import { prisma } from '../../common/utils/prisma'
import { resolveBookingEnabled, resolveBookingQuota } from '../group/group.service'
import { checkPeriodOpen } from './weekly-off-period.service'
import { employeeBranchWhere } from '../employee/employee.service'
import { assertMonthlyCap, applyConflictDeduction, reverseConflictDeduction } from '../leave/vacation-policy.service'

// การจอง/เพิ่มวันหยุดให้พนักงาน — gate ด้วย booking cascade (ดู resolvePolicyFlag)
// พนักงานจองเอง: force = false เสมอ → ปิดแล้วจองไม่ได้
// แอดมินเพิ่มให้: ปิดแล้วโดนบล็อกด้วย แต่ส่ง force=true (กด "ยืนยันเพิ่มให้อยู่ดี") ผ่านได้ + เก็บ policy_override_by
export interface PolicyOpts { force?: boolean; actorUserId?: string }
async function assertBookingAllowed(tenantId: string, employeeId: string, opts: PolicyOpts): Promise<string | null> {
  if (await resolveBookingEnabled(tenantId, employeeId)) return null
  if (!opts.force) throw new Error('BOOKING_DISABLED')
  return opts.actorUserId ?? null
}
import { grantHolidayCompensation } from '../tenant/holiday.service' // ชื่อผูกกับ holiday แต่กลไกเป็น "ให้วันชดเชยเข้า LeaveBalance" ทั่วไป — reuse ตรงนี้ด้วย

function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// week_start (จันทร์) + day_of_week → วันที่จริงที่พนักงานเลือกหยุด (YYYY-MM-DD)
export function resolveActualDateStr(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// นับวันหยุดที่พนักงานจองไว้แล้ว ในเดือนหนึ่ง — default PENDING+APPROVED (เช็คโควต้าจอง/
// เดือน) — statuses ปรับได้ (เช่น ['APPROVED'] เท่านั้น ใช้ใน vacation-policy.service.ts
// ข้อ 2 "หยุดไม่ครบโควต้า" ที่นับเฉพาะที่อนุมัติแล้วจริงๆ ไม่นับ PENDING ที่ยังค้างอยู่)
export async function countMonthOffRequests(
  tenantId: string, employeeId: string, month: string, excludeId?: string,
  statuses: ('PENDING' | 'APPROVED' | 'REJECTED')[] = ['PENDING', 'APPROVED'],
): Promise<number> {
  const [y, m] = month.split('-').map(Number)
  const rangeStart = new Date(Date.UTC(y, m - 1, 1)); rangeStart.setUTCDate(rangeStart.getUTCDate() - 6)
  const rangeEnd   = new Date(Date.UTC(y, m, 0));     rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6)
  const rows = await prisma.weeklyOffRequest.findMany({
    where: {
      tenant_id: tenantId, employee_id: employeeId,
      status: { in: statuses },
      week_start: { gte: rangeStart, lte: rangeEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { week_start: true, day_of_week: true },
  })
  return rows.filter(r => resolveActualDateStr(r.week_start, r.day_of_week).slice(0, 7) === month).length
}

// scopedEmployeeIds: undefined = ไม่ scope, array = DEPT_HEAD จำกัดแค่คนในแผนกที่ดูแล
export async function listWeeklyOff(tenantId: string, filters: {
  weekStart?: string   // YYYY-MM-DD → สัปดาห์เดียว
  month?: string       // YYYY-MM → ทั้งเดือน
  branchId?: string
  employeeId?: string
  status?: string
  scopedEmployeeIds?: string[]
}) {
  const where: any = { tenant_id: tenantId }

  if (filters.month) {
    const [y, m] = filters.month.split('-').map(Number)
    // ขยายช่วง query ±6 วัน กันเคสสัปดาห์คาบเกี่ยวเดือน (week_start อยู่เดือนนี้ แต่
    // day_of_week ที่เลือกจริงตกไปเดือนถัดไป หรือกลับกัน) — กรองแม่นด้วยวันที่จริง
    // (resolveActualDateStr) หลัง query แทนที่จะเชื่อ week_start เฉยๆ
    const rangeStart = new Date(Date.UTC(y, m - 1, 1)); rangeStart.setUTCDate(rangeStart.getUTCDate() - 6)
    const rangeEnd   = new Date(Date.UTC(y, m, 0));     rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 6)
    where.week_start = { gte: rangeStart, lte: rangeEnd }
  } else if (filters.weekStart) {
    const monday = getMondayOf(filters.weekStart)
    const sunday = new Date(monday)
    sunday.setUTCDate(sunday.getUTCDate() + 6)
    where.week_start = { gte: monday, lte: sunday }
  }

  if (filters.status) where.status = filters.status

  // ถ้าระบุ employeeId เจาะจงมาด้วย ต้องอยู่ใน scope ด้วย (กัน DEPT_HEAD เห็นคนนอกแผนก
  // ผ่านการระบุ employeeId ตรงๆ)
  if (filters.scopedEmployeeIds) {
    where.employee_id = filters.employeeId
      ? (filters.scopedEmployeeIds.includes(filters.employeeId) ? filters.employeeId : '__none__')
      : { in: filters.scopedEmployeeIds }
  } else if (filters.employeeId) {
    where.employee_id = filters.employeeId
  } else if (filters.branchId) {
    where.employee = employeeBranchWhere(filters.branchId)
  }

  const results = await prisma.weeklyOffRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true, first_name: true, last_name: true, nickname: true, employee_code: true, photo_url: true,
          branch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ week_start: 'asc' }, { day_of_week: 'asc' }],
  })

  if (filters.month) {
    return results.filter(r => resolveActualDateStr(r.week_start, r.day_of_week).slice(0, 7) === filters.month)
  }
  return results
}

// opts.force: แอดมินกด "ยืนยันเพิ่มให้อยู่ดี" ทั้งที่ booking cascade = ปิด (พนักงานจองเองส่ง {} เสมอ)
export async function createWeeklyOff(tenantId: string, data: {
  employee_id: string
  week_start: string    // YYYY-MM-DD (ระบบ normalize เป็น Monday อัตโนมัติ)
  day_of_week: number   // 0-6
}, opts: PolicyOpts = {}) {
  const overrideBy = await assertBookingAllowed(tenantId, data.employee_id, opts)

  const monday = getMondayOf(data.week_start)

  // กันจองซ้ำแค่ "วันเดียวกันเป๊ะ" (feedback 2026-09-14: เลิกจำกัด 1 วัน/สัปดาห์
  // แล้ว — จองได้หลายวันในสัปดาห์เดียวกัน จำกัดแค่โควต้ารวม/เดือนด้านล่าง)
  const existing = await prisma.weeklyOffRequest.findFirst({
    where: { employee_id: data.employee_id, week_start: monday, day_of_week: data.day_of_week },
  })
  if (existing) throw new Error('ALREADY_REQUESTED')

  const actualMonth = resolveActualDateStr(monday, data.day_of_week).slice(0, 7)

  // โควต้าจอง/เดือน — cascade 6 ชั้น (default 5) · แอดมิน force ข้ามได้ (ผูกกับ
  // overrideBy เดิม = force ที่ใช้ข้าม booking cascade ปิด)
  if (!overrideBy) {
    const quota = await resolveBookingQuota(tenantId, data.employee_id)
    if (await countMonthOffRequests(tenantId, data.employee_id, actualMonth) >= quota) throw new Error('OVER_QUOTA')
  }
  // รวม (วันหยุดจอง + พักร้อนที่ใช้) ต้องไม่เกิน 10 วัน/เดือน — feedback 2026-09-15
  // ข้อ 5 — เช็คแยกจาก overrideBy ด้านบน (คนละเหตุผลกัน): พนักงานจองเองโดน block
  // เสมอ (opts.force ไม่มีทางเป็น true), แอดมิน force ข้ามได้เสมอไม่ว่า booking
  // cascade จะเปิด/ปิดอยู่ก็ตาม
  if (!opts.force) {
    await assertMonthlyCap(tenantId, data.employee_id, actualMonth, 1)
  }

  const employee = await prisma.employee.findFirst({ where: { id: data.employee_id, tenant_id: tenantId }, select: { position_id: true } })
  const conflict = await hasPositionConflict(tenantId, data.employee_id, employee?.position_id ?? null, monday, data.day_of_week)

  // แอดมินลงวันหยุดให้พนักงานเอง (มี actorUserId มาจาก route /admin/weekly-off) =
  // อนุมัติอัตโนมัติทันที ไม่ต้องมาอนุมัติซ้ำอีกรอบ (แบบเดียวกับ createLeaveRequest
  // autoApprove) — ต่างจากพนักงานยื่นขอเอง (/employee/weekly-off ไม่ส่ง actorUserId
  // มา) ที่ยังต้องเป็น PENDING รอแอดมินอนุมัติตามปกติ (feedback 2026-09-23)
  let created
  try {
    created = await prisma.weeklyOffRequest.create({
      data: {
        tenant_id:   tenantId,
        employee_id: data.employee_id,
        week_start:  monday,
        day_of_week: data.day_of_week,
        has_conflict: conflict,
        policy_override_by: overrideBy,
        ...(opts.actorUserId ? { status: 'APPROVED', reviewed_by: opts.actorUserId, reviewed_at: new Date() } : {}),
      },
      include: {
        employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } },
      },
    })
  } catch (e: any) {
    // race กับ findUnique เช็คด้านบน (เช่น double-submit/2 แท็บพร้อมกัน) — map เป็น
    // ALREADY_REQUESTED เหมือน createMonthlyBatchOff แทนที่จะปล่อย P2002 ดิบออกไปเป็น 500
    if (e.code === 'P2002') throw new Error('ALREADY_REQUESTED')
    throw e
  }
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

// scopedEmployeeIds: DEPT_HEAD เท่านั้น (ผ่านตอน approve/reject) — ถ้าเจ้าของ request
// ไม่อยู่ในแผนกที่ดูแล findFirst จะหาไม่เจอ เป็น 404 ธรรมชาติ
// conflict_deduct_type: เฉพาะตอน status → APPROVED และ req.has_conflict=true — แอดมิน
// เลือกว่าจะหัก 1 วันจากโควต้าประเภทไหน (เช่น พักร้อน) เป็น "ค่าใช้จ่าย" ของการอนุมัติ
// ให้ 2 คนหยุดวันเดียวกันในตำแหน่งเดียวกัน (feedback 2026-09-15 ข้อ 1 — ยังคง warn
// เฉยๆ ไม่บล็อกเหมือนเดิม แค่เพิ่มจุดนี้) idempotent ด้วย req.conflict_deduct_type
// เดิมต้องเป็น null (กันหักซ้ำถ้ากด approve ซ้ำ/แก้ไขซ้ำ)
export async function updateWeeklyOff(tenantId: string, id: string, data: {
  day_of_week?: number
  week_start?: string   // YYYY-MM-DD — ย้ายไปสัปดาห์อื่น (ปฏิทินรวม: ลากวางย้ายวันหยุด) normalize เป็น Monday อัตโนมัติ
  status?: 'APPROVED' | 'REJECTED'
  reviewed_by?: string
  reject_note?: string
  conflict_deduct_type?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER' | null
}, scopedEmployeeIds?: string[]) {
  const req = await prisma.weeklyOffRequest.findFirst({
    where: { id, tenant_id: tenantId, ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}) },
  })
  if (!req) return null

  let monday: Date | undefined
  if (data.week_start !== undefined) {
    monday = getMondayOf(data.week_start)
    const destDow = data.day_of_week ?? req.day_of_week
    // ย้ายข้ามสัปดาห์ (หรือย้ายวัน) ต้องเช็คว่าปลายทาง (สัปดาห์+วัน) ว่างไหมก่อน — เว้นตัวเอง
    if (monday.getTime() !== req.week_start.getTime() || destDow !== req.day_of_week) {
      const conflict = await prisma.weeklyOffRequest.findFirst({
        where: { employee_id: req.employee_id, week_start: monday, day_of_week: destDow },
      })
      if (conflict && conflict.id !== id) throw new Error('ALREADY_REQUESTED')
    }
  }

  const shouldDeduct = data.status === 'APPROVED' && req.has_conflict && !!data.conflict_deduct_type && !req.conflict_deduct_type
  if (shouldDeduct) {
    const year = Number(resolveActualDateStr(monday ?? req.week_start, data.day_of_week ?? req.day_of_week).slice(0, 4))
    await applyConflictDeduction(tenantId, req.employee_id, data.conflict_deduct_type!, year, data.reviewed_by)
  }

  return prisma.weeklyOffRequest.update({
    where: { id },
    data: {
      ...(data.day_of_week !== undefined ? { day_of_week: data.day_of_week } : {}),
      ...(monday !== undefined ? { week_start: monday } : {}),
      ...(data.status ? { status: data.status, reviewed_by: data.reviewed_by, reviewed_at: new Date() } : {}),
      ...(data.reject_note ? { reject_note: data.reject_note } : {}),
      ...(shouldDeduct ? { conflict_deduct_type: data.conflict_deduct_type } : {}),
    },
  })
}

export async function deleteWeeklyOff(tenantId: string, id: string) {
  // ถ้าเคยหักโควต้าไว้ตอนอนุมัติ (ข้อ 1) ต้องคืนก่อนลบ ไม่งั้นคืนวันให้ไม่ได้อีกเลย
  const req = await prisma.weeklyOffRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return false
  if (req.conflict_deduct_type) {
    const year = Number(resolveActualDateStr(req.week_start, req.day_of_week).slice(0, 4))
    await reverseConflictDeduction(tenantId, req.employee_id, req.conflict_deduct_type, year)
  }
  const count = await prisma.weeklyOffRequest.deleteMany({ where: { id, tenant_id: tenantId } })
  return count.count > 0
}

// ตรวจว่า employee มีวันหยุดตรงกับวันนี้เป๊ะไหม (ใช้ตอนเช็คอิน Phase 2) — เช็คทั้ง
// week_start+day_of_week ตรงๆ เลย (เดิมเช็คแค่ week_start แล้วให้ผู้เรียกกรอง
// day_of_week เอง สมัยที่ยังจำกัด 1 วัน/สัปดาห์ — ตอนนี้จองได้หลายวัน/สัปดาห์แล้ว
// ต้องระบุวันให้ตรงเป๊ะตั้งแต่ query เลย)
export async function getEmployeeWeeklyOff(tenantId: string, employeeId: string, date: Date) {
  const monday = getMondayOf(date.toISOString().slice(0, 10))
  return prisma.weeklyOffRequest.findFirst({
    where: { employee_id: employeeId, week_start: monday, day_of_week: date.getUTCDay() },
  })
}

// ── Monthly Batch Off (weekly_off_mode = MONTHLY_BATCH) ──────────────────────
// โหมดโควต้า: เลือกวันไหนก็ได้ในเดือน ไม่เกิน booking_quota (resolve จาก cascade 6 ชั้น, default 5)
// (เดิมมีโหมด "ต้องครบทุกสัปดาห์" สำหรับคนไม่ผูกสถานะพนักงาน — เลิกใช้แล้ว ทุกคนมีโควต้าจากกลุ่ม)

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
  if (!(await resolveBookingEnabled(tenantId, data.employee_id))) throw new Error('BOOKING_DISABLED')

  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId },
    select: { position_id: true },
  })

  const picked = data.dates.map(dateStr => ({
    dateStr,
    weekStart: getMondayOf(dateStr).toISOString().slice(0, 10),
  }))

  // โหมดโควต้า (ทุกคน): เลือกวันไหนก็ได้ในเดือน ไม่เกินโควต้าที่ resolve จาก cascade 6 ชั้น (default 5)
  const quota = await resolveBookingQuota(tenantId, data.employee_id)
  const uniqueDates = new Set(picked.map(p => p.dateStr))
  if (uniqueDates.size !== picked.length) throw new Error('DUPLICATE_DATE')
  if (picked.length > quota) throw new Error('OVER_QUOTA')
  // รวม (วันหยุดจอง + พักร้อนที่ใช้) ต้องไม่เกิน 10 วัน/เดือน — feedback 2026-09-15 ข้อ 5
  // (endpoint นี้พนักงานจองเองเท่านั้น ไม่มี force — block เสมอ)
  await assertMonthlyCap(tenantId, data.employee_id, data.month, picked.length)

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
  if (!(await resolveBookingEnabled(tenantId, data.employee_id))) throw new Error('BOOKING_DISABLED')

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
  // ขยาย query ±6 วัน กันเคสสัปดาห์คาบเกี่ยวเดือน (เหมือน listWeeklyOff ด้านบน) —
  // กรองแม่นด้วยวันที่จริงหลัง query แทนที่จะเชื่อ week_start เฉยๆ
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1)); startOfMonth.setUTCDate(startOfMonth.getUTCDate() - 6)
  const endOfMonth   = new Date(Date.UTC(y, m, 0, 23, 59, 59)); endOfMonth.setUTCDate(endOfMonth.getUTCDate() + 6)

  const employee = await prisma.employee.findFirst({
    where:  { id: employeeId, tenant_id: tenantId },
    select: { branch_id: true, position_id: true, extra_branches: { select: { branch_id: true } } },
  })
  // เพื่อนร่วมสาขา = แชร์สาขาใดสาขาหนึ่งร่วมกัน (หลักหรือเสริมก็นับ) ไม่ใช่แค่สาขาหลัก
  // ตัวเองอย่างเดียวอีกต่อไป (feedback 2026-09-14: คนมีหลายสาขาต้องเห็นคนจองชนใน
  // ทุกสาขาที่ตัวเองสังกัดด้วย ไม่ใช่แค่สาขาหลัก)
  const myBranchIds = employee ? [employee.branch_id, ...employee.extra_branches.map(b => b.branch_id)] : []
  const employeeWhere = myBranchIds.length > 0
    ? { OR: [{ branch_id: { in: myBranchIds } }, { extra_branches: { some: { branch_id: { in: myBranchIds } } } }] }
    : {}

  const allRaw = await prisma.weeklyOffRequest.findMany({
    where: {
      tenant_id:  tenantId,
      week_start: { gte: startOfMonth, lte: endOfMonth },
      employee:   employeeWhere,
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, position_id: true } },
    },
    orderBy: { week_start: 'asc' },
  })
  const all = allRaw.filter(r => resolveActualDateStr(r.week_start, r.day_of_week).slice(0, 7) === month)
  const ownRecords = all.filter(r => r.employee_id === employeeId)

  // วันไหนที่มาจากการสลับ (WeeklyOffSwap — swapWeeklyOff() อัปเดต week_start/
  // day_of_week ของ record เดิมในที่ id คงเดิม เลยยัง match ผ่าน off_id ได้)
  // แนบชื่อคู่สลับให้ ปฏิทินจะได้โชว์ "สลับกับ [ชื่อ]" ได้ (feedback 2026-09-15:
  // "ถ้ามีการสลับวันหยุดให้ขึ้นด้วย ว่าสลับมาจากใครแล้วสลับวันไหนกันบ้าง")
  const ownIds = ownRecords.map(r => r.id)
  const swaps = ownIds.length > 0 ? await prisma.weeklyOffSwap.findMany({
    where: { tenant_id: tenantId, OR: [{ employee_a_off_id: { in: ownIds } }, { employee_b_off_id: { in: ownIds } }] },
  }) : []
  const otherEmployeeIds = [...new Set(swaps.map(s => s.employee_a_id === employeeId ? s.employee_b_id : s.employee_a_id))]
  const otherEmployees = otherEmployeeIds.length > 0 ? await prisma.employee.findMany({
    where: { id: { in: otherEmployeeIds } },
    select: { id: true, first_name: true, last_name: true, nickname: true },
  }) : []
  const otherEmpMap = new Map(otherEmployees.map(e => [e.id, e]))
  const swapNameByOffId = new Map<string, string>()
  for (const s of swaps) {
    const mine = ownIds.includes(s.employee_a_off_id) ? s.employee_a_off_id : ownIds.includes(s.employee_b_off_id) ? s.employee_b_off_id : null
    if (!mine) continue
    const otherId = mine === s.employee_a_off_id ? s.employee_b_id : s.employee_a_id
    const other = otherEmpMap.get(otherId)
    if (other) swapNameByOffId.set(mine, other.nickname || `${other.first_name} ${other.last_name}`)
  }

  // same_position: คนตำแหน่งเดียวกับตัวเอง — ใช้กันจองซ้ำวันหยุดในตำแหน่งเดียวกัน (ยังจองซ้ำได้ แต่ให้เห็น flag)
  return {
    own: ownRecords.map(r => ({ ...r, swapped_with: swapNameByOffId.get(r.id) ?? null })),
    colleagues: all.filter(r => r.employee_id !== employeeId).map(r => ({
      ...r,
      same_position: !!employee?.position_id && r.employee.position_id === employee.position_id,
    })),
  }
}

// PENDING ยกเลิกได้เสมอ (ยังไม่ผ่านอนุมัติ ไม่กระทบใคร) — APPROVED ยกเลิก/แก้ไขได้ก็ต่อเมื่อ
// ช่วงเปิดรับจองของเดือนนั้น (ตามสาขาพนักงาน) ยังเปิดอยู่เท่านั้น (feedback 2026-09-14:
// เดิมพออนุมัติแล้วแก้ไม่ได้เลยแม้ช่วงจองจะยังไม่ปิด)
export async function deleteMonthlyOff(tenantId: string, id: string, employeeId: string) {
  const req = await prisma.weeklyOffRequest.findFirst({
    where: { id, tenant_id: tenantId, employee_id: employeeId },
    include: { employee: { select: { branch_id: true } } },
  })
  if (!req) return false
  if (req.status !== 'PENDING') {
    if (req.status !== 'APPROVED') throw new Error('NOT_PENDING')
    const month = resolveActualDateStr(req.week_start, req.day_of_week).slice(0, 7)
    const open = await checkPeriodOpen(tenantId, req.employee.branch_id, month)
    if (!open) throw new Error('PERIOD_CLOSED')
  }

  await prisma.weeklyOffRequest.delete({ where: { id } })
  return true
}

// ── "เช็คอินวันที่จองวันหยุดไว้เอง" Alert (feedback 2026-08-27) ──────────────
// ต่างจาก holiday worked-alert: ไม่ auto grant อะไรตอนเช็คอิน — ต้องรอ HR
// resolve เลือกทางว่าจะ "เลื่อนวันหยุด" (ลืม ยกเลิกให้ไปจองใหม่) หรือ "ให้วัน
// ชดเชย" (ตั้งใจมาทำ) ดู resolveDayRule() ใน attendance.service.ts
export async function listWorkedOnOwnDayOffAlerts(tenantId: string, scopedEmployeeIds?: string[], limit = 50) {
  return prisma.attendanceRecord.findMany({
    where: {
      tenant_id: tenantId,
      worked_on_weekly_off: true,
      weekly_off_resolved: false,
      ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}),
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch: { select: { id: true, name: true } } } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
}

export async function resolveWorkedOnOwnDayOffAlert(tenantId: string, attendanceId: string, data: {
  action: 'RESCHEDULE' | 'COMPENSATE'
  resolvedBy: string
  note?: string
  compensateDays?: number
}, scopedEmployeeIds?: string[]) {
  const record = await prisma.attendanceRecord.findFirst({
    where: {
      id: attendanceId, tenant_id: tenantId, worked_on_weekly_off: true,
      ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}),
    },
  })
  if (!record) return null
  if (record.weekly_off_resolved) throw new Error('ALREADY_RESOLVED')

  if (data.action === 'RESCHEDULE') {
    // ลืมว่าวันนี้หยุด — ยกเลิกวันหยุดเดิมที่จองไว้วันนี้ คืนสิทธิ์ให้ไปจองวันใหม่แทน
    const monday = getMondayOf(record.date.toISOString().slice(0, 10))
    await prisma.weeklyOffRequest.deleteMany({
      where: { tenant_id: tenantId, employee_id: record.employee_id, week_start: monday, day_of_week: record.date.getUTCDay() },
    })
  } else {
    // ตั้งใจมาทำ — ให้วันชดเชยเพิ่ม เหมือนกลไกวันหยุดนักขัตฤกษ์ — จงใจไม่ส่ง leaveType
    // (คงเป็น COMPENSATE เสมอ) เพราะกรณีนี้คือ "มาทำงานทั้งที่จองวันหยุดตัวเองไว้"
    // คนละเรื่องกับ "วันหยุดที่บริษัทประกาศ" (feedback 2026-09-15 ข้อ 3 ยืนยันแล้วว่า
    // ให้เปลี่ยนเป็นพักร้อนได้เฉพาะกรณีวันหยุดบริษัทเท่านั้น)
    await grantHolidayCompensation(tenantId, record.employee_id, data.compensateDays ?? 1, record.date.getUTCFullYear(), 'COMPENSATE')
  }

  return prisma.attendanceRecord.update({
    where: { id: attendanceId },
    data: {
      weekly_off_resolved:     true,
      weekly_off_resolution:   data.action,
      weekly_off_resolved_by:  data.resolvedBy,
      weekly_off_resolved_at:  new Date(),
      weekly_off_resolve_note: data.note ?? null,
    },
  })
}

// ── สลับวันหยุดกันระหว่าง 2 คน (feedback 2026-08-27, เพิ่ม self-service 2026-09-14) ──
// เดิมมีแค่แอดมิน/HR ทำให้โดยตรง (swappedBy = user_id) — ตอนนี้พนักงานสลับกันเอง
// ได้แล้วผ่าน WeeklyOffSwapRequest (ขอ→เพื่อนยอมรับ) เรียกฟังก์ชันนี้ตอนยอมรับ โดย
// ส่ง swappedBy: null (ไม่มีแอดมินกด) สลับแค่ week_start/day_of_week ของสองแถวเดิม
// (id คงเดิม) แล้ว mark APPROVED ทั้งคู่ + เก็บ audit log ไว้
export async function swapWeeklyOff(tenantId: string, data: {
  employeeAOffId: string
  employeeBOffId: string
  swappedBy: string | null
}) {
  const [offA, offB] = await Promise.all([
    prisma.weeklyOffRequest.findFirst({ where: { id: data.employeeAOffId, tenant_id: tenantId } }),
    prisma.weeklyOffRequest.findFirst({ where: { id: data.employeeBOffId, tenant_id: tenantId } }),
  ])
  if (!offA || !offB) throw new Error('NOT_FOUND')
  if (offA.employee_id === offB.employee_id) throw new Error('SAME_EMPLOYEE')

  // กันชนกับวันเดียวกันเป๊ะที่แต่ละคนอาจมีจองแยกไว้อยู่แล้ว (unique employee_id+
  // week_start+day_of_week — จองได้หลายวัน/สัปดาห์แล้ว เลยเช็คแค่ week_start ไม่พอ
  // ต้องเช็ค day_of_week ปลายทางด้วยว่าตรงกับวันที่กำลังจะย้ายไปชนไหม)
  if (offA.week_start.getTime() !== offB.week_start.getTime() || offA.day_of_week !== offB.day_of_week) {
    const [conflictA, conflictB] = await Promise.all([
      prisma.weeklyOffRequest.findFirst({ where: { employee_id: offA.employee_id, week_start: offB.week_start, day_of_week: offB.day_of_week } }),
      prisma.weeklyOffRequest.findFirst({ where: { employee_id: offB.employee_id, week_start: offA.week_start, day_of_week: offA.day_of_week } }),
    ])
    if (conflictA && conflictA.id !== offB.id) throw new Error('CONFLICT_A')
    if (conflictB && conflictB.id !== offA.id) throw new Error('CONFLICT_B')
  }

  const now = new Date()
  const [updatedA, updatedB] = await prisma.$transaction([
    prisma.weeklyOffRequest.update({
      where: { id: offA.id },
      data: { week_start: offB.week_start, day_of_week: offB.day_of_week, status: 'APPROVED', reviewed_by: data.swappedBy, reviewed_at: now },
      include: { employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } } },
    }),
    prisma.weeklyOffRequest.update({
      where: { id: offB.id },
      data: { week_start: offA.week_start, day_of_week: offA.day_of_week, status: 'APPROVED', reviewed_by: data.swappedBy, reviewed_at: now },
      include: { employee: { select: { id: true, first_name: true, last_name: true, nickname: true, branch: { select: { id: true, name: true } } } } },
    }),
    prisma.weeklyOffSwap.create({
      data: {
        tenant_id: tenantId,
        employee_a_id: offA.employee_id,
        employee_a_off_id: offA.id,
        employee_b_id: offB.employee_id,
        employee_b_off_id: offB.id,
        swapped_by: data.swappedBy,
      },
    }),
  ])
  return { a: updatedA, b: updatedB }
}

// ── ขอสลับวันหยุดกัน (self-service, feedback 2026-09-14) ─────────────────────
// A เลือกวันของตัวเอง (requesterOffId) + วันของเพื่อน B ที่อยากได้ (targetOffId) —
// ต้อง "อนุมัติแล้ว" ทั้งคู่ก่อนถึงจะขอสลับได้ (ตัดสินใจ 2026-09-14) ยังไม่สลับจริง
// ตรงนี้ — แค่สร้างคำขอ PENDING รอ B กดตอบรับผ่าน respondWeeklyOffSwap()
// (การส่ง LINE แจ้ง B ทำที่ route layer ตามธรรมเนียมไฟล์นี้ ไม่ทำในนี้)
export async function requestWeeklyOffSwap(tenantId: string, requesterEmployeeId: string, data: {
  requesterOffId: string
  targetOffId: string
}) {
  const [reqOff, targetOff] = await Promise.all([
    prisma.weeklyOffRequest.findFirst({ where: { id: data.requesterOffId, tenant_id: tenantId, employee_id: requesterEmployeeId } }),
    prisma.weeklyOffRequest.findFirst({ where: { id: data.targetOffId, tenant_id: tenantId } }),
  ])
  if (!reqOff || !targetOff) throw new Error('NOT_FOUND')
  if (targetOff.employee_id === requesterEmployeeId) throw new Error('SAME_EMPLOYEE')
  if (reqOff.status !== 'APPROVED' || targetOff.status !== 'APPROVED') throw new Error('NOT_APPROVED')

  // กันขอซ้ำซ้อน — ถ้ามีคำขอ PENDING ผูกกับวันใดวันหนึ่งอยู่แล้ว (ทั้งฝั่งขอ/เป้าหมาย) ห้ามขอซ้ำ
  const existing = await prisma.weeklyOffSwapRequest.findFirst({
    where: {
      tenant_id: tenantId, status: 'PENDING',
      OR: [
        { requester_off_id: data.requesterOffId }, { target_off_id: data.requesterOffId },
        { requester_off_id: data.targetOffId },    { target_off_id: data.targetOffId },
      ],
    },
  })
  if (existing) throw new Error('ALREADY_PENDING')

  return prisma.weeklyOffSwapRequest.create({
    data: {
      tenant_id: tenantId,
      requester_employee_id: requesterEmployeeId,
      requester_off_id: data.requesterOffId,
      target_employee_id: targetOff.employee_id,
      target_off_id: data.targetOffId,
    },
    include: {
      requester: { select: { id: true, first_name: true, last_name: true, nickname: true } },
      target:    { select: { id: true, first_name: true, last_name: true, nickname: true } },
    },
  })
}

// รายการคำขอสลับที่เกี่ยวกับตัวเอง — ทั้งที่ตัวเองเป็นคนขอ (ยังรอเพื่อนตอบ) และที่
// เพื่อนขอมาหาตัวเอง (ต้องตอบ) ใช้โชว์แบนเนอร์/แจ้งเตือนในหน้าจองวันหยุด
export async function listMyWeeklyOffSwapRequests(tenantId: string, employeeId: string) {
  const rows = await prisma.weeklyOffSwapRequest.findMany({
    where: { tenant_id: tenantId, OR: [{ requester_employee_id: employeeId }, { target_employee_id: employeeId }] },
    include: {
      requester: { select: { id: true, first_name: true, last_name: true, nickname: true } },
      target:    { select: { id: true, first_name: true, last_name: true, nickname: true } },
    },
    orderBy: { created_at: 'desc' },
  })
  // แนบวันที่จริงของแต่ละฝั่งให้ frontend ใช้แสดงผลตรงๆ ไม่ต้องไป join WeeklyOffRequest เอง
  const offIds = [...new Set(rows.flatMap(r => [r.requester_off_id, r.target_off_id]))]
  const offs = await prisma.weeklyOffRequest.findMany({ where: { id: { in: offIds } }, select: { id: true, week_start: true, day_of_week: true } })
  const dateOf = new Map(offs.map(o => [o.id, resolveActualDateStr(o.week_start, o.day_of_week)]))
  return rows.map(r => ({
    ...r,
    requester_date: dateOf.get(r.requester_off_id) ?? null,
    target_date:    dateOf.get(r.target_off_id) ?? null,
  }))
}

// ── ตอบรับ/ปฏิเสธคำขอสลับ ────────────────────────────────────────────────────
// accept = true → เรียก swapWeeklyOff() เดิมให้สลับจริงทันที (swappedBy: null =
// self-service ไม่มีแอดมินกด) แล้ว mark คำขอเป็น ACCEPTED
// accept = false → mark REJECTED เฉยๆ ไม่แตะ WeeklyOffRequest ทั้งคู่
export async function respondWeeklyOffSwap(tenantId: string, swapRequestId: string, targetEmployeeId: string, accept: boolean) {
  const swapReq = await prisma.weeklyOffSwapRequest.findFirst({
    where: { id: swapRequestId, tenant_id: tenantId, target_employee_id: targetEmployeeId },
    include: {
      requester: { select: { id: true, first_name: true, last_name: true, nickname: true } },
      target:    { select: { id: true, first_name: true, last_name: true, nickname: true } },
    },
  })
  if (!swapReq) throw new Error('NOT_FOUND')
  if (swapReq.status !== 'PENDING') throw new Error('NOT_PENDING')

  if (!accept) {
    await prisma.weeklyOffSwapRequest.update({ where: { id: swapReq.id }, data: { status: 'REJECTED', responded_at: new Date() } })
    return { swapReq, swapped: null as null }
  }

  // เช็คซ้ำว่าทั้งคู่ยังอนุมัติอยู่จริง เผื่อสถานะเปลี่ยนไปหลังขอ (เช่นแอดมินไปแก้ก่อน)
  const [reqOff, targetOff] = await Promise.all([
    prisma.weeklyOffRequest.findUnique({ where: { id: swapReq.requester_off_id } }),
    prisma.weeklyOffRequest.findUnique({ where: { id: swapReq.target_off_id } }),
  ])
  if (!reqOff || !targetOff || reqOff.status !== 'APPROVED' || targetOff.status !== 'APPROVED') {
    await prisma.weeklyOffSwapRequest.update({ where: { id: swapReq.id }, data: { status: 'CANCELED', responded_at: new Date() } })
    throw new Error('NOT_APPROVED')
  }

  const swapped = await swapWeeklyOff(tenantId, {
    employeeAOffId: swapReq.requester_off_id,
    employeeBOffId: swapReq.target_off_id,
    swappedBy: null,
  })
  await prisma.weeklyOffSwapRequest.update({ where: { id: swapReq.id }, data: { status: 'ACCEPTED', responded_at: new Date() } })
  return { swapReq, swapped }
}
