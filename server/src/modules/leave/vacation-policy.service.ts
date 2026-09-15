// server/src/modules/leave/vacation-policy.service.ts
// นโยบายวันพักร้อนตามอายุงาน — feedback 2026-09-15 (9 ข้อ) — โมดูลนี้คุมข้อ 2, 5, 6, 8
// (ข้อ 1 หัก conflict อยู่ใน weekly-off.service.ts/leave.service.ts, ข้อ 3 อยู่ใน
// holiday.service.ts, ข้อ 4/7/9 ไม่ต้องแก้โค้ด — ดู brain log v145 สำหรับรายละเอียด)
//
// รูปแบบไฟล์: pure resolver (…FromChain, ไม่แตะ DB — unit test ได้ตรงๆ) + loader (ต่อ DB)
// ตามแบบ group.service.ts เดิม
import { prisma } from '../../common/utils/prisma'
import { bangkokToday } from '../../common/utils/time'
import { resolveBookingQuota } from '../group/group.service'

// ── Tenure-based vacation entitlement (ข้อ 6) ──────────────────────────────
// สูตร: base + incDays * floor((years - 1) / incYears) เมื่อ years >= 1
// ตัวอย่าง base=11, incDays=1, incYears=2 → ครบ 1-2ปี=11, ครบ 3-4ปี=12, ครบ 5-6ปี=13
export interface VacationEmployeeShape {
  hired_at?: Date | null
  weekly_off_mode?: 'WEEKLY' | 'MONTHLY_BATCH' | null
  status?: string | null
  probation_end_date?: Date | null
  probation_result?: string | null
  position?: {
    vacation_base_days?: number | null
    vacation_increment_days?: number | null
    vacation_increment_years?: number | null
  } | null
}

const VACATION_EMPLOYEE_SELECT = {
  hired_at: true,
  weekly_off_mode: true,
  status: true,
  probation_end_date: true,
  probation_result: true,
  position: { select: { vacation_base_days: true, vacation_increment_days: true, vacation_increment_years: true } },
} as const

// ผ่านโปรแล้วหรือยัง — ใช้ predicate เดียวกับ runAccrualForMonth (leave-types.service.ts)
// เพื่อให้ 2 ระบบไม่ขัดกัน: ผ่าน = probation_result==='PASS' หรือไม่มี probation_end_date
// หรือ probation_end_date ผ่านมาแล้ว
function isPastProbation(e: VacationEmployeeShape, asOf: Date): boolean {
  if (e.probation_result === 'PASS') return true
  if (!e.probation_end_date) return true
  return e.probation_end_date <= asOf
}

function yearsOfTenure(hiredAt: Date, asOf: Date): number {
  const ms = asOf.getTime() - hiredAt.getTime()
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000))
}

export interface VacationEligibility { eligible: boolean; reason: string; years: number }

// pure — ตัดสินว่าพนักงานคนนี้ "อยู่ในโปรแกรมพักร้อนตามอายุงาน" ไหม (ไม่ใช่แค่คำนวณจำนวนวัน)
// ต้องครบทุกเงื่อนไข: ยังทำงานอยู่ + โหมดรายเดือน (พนักงานประจำ) + ผ่านโปรแล้ว +
// มีวันเริ่มงาน + อายุงาน >= 1 ปี + ตำแหน่งตั้งค่าโปรแกรมพักร้อนไว้ (vacation_base_days != null)
export function isVacationEligible(e: VacationEmployeeShape | null, asOf: Date = bangkokToday()): VacationEligibility {
  if (!e) return { eligible: false, reason: 'NO_EMPLOYEE', years: 0 }
  if (e.status !== 'ACTIVE') return { eligible: false, reason: 'NOT_ACTIVE', years: 0 }
  if (e.weekly_off_mode !== 'MONTHLY_BATCH') return { eligible: false, reason: 'NOT_MONTHLY_BATCH', years: 0 }
  if (!isPastProbation(e, asOf)) return { eligible: false, reason: 'IN_PROBATION', years: 0 }
  if (!e.hired_at) return { eligible: false, reason: 'NO_HIRED_AT', years: 0 }
  const years = yearsOfTenure(e.hired_at, asOf)
  if (years < 1) return { eligible: false, reason: 'UNDER_1_YEAR', years }
  if (e.position?.vacation_base_days == null) return { eligible: false, reason: 'POSITION_NOT_CONFIGURED', years }
  return { eligible: true, reason: 'OK', years }
}

// pure — คำนวณจำนวนวันพักร้อนที่ควรได้ ณ วันที่ asOf (0 ถ้าไม่มีสิทธิ์)
export function resolveVacationEntitlementFromChain(e: VacationEmployeeShape | null, asOf: Date = bangkokToday()): number {
  const elig = isVacationEligible(e, asOf)
  if (!elig.eligible) return 0
  const pos = e!.position!
  const base = pos.vacation_base_days!
  const incDays  = pos.vacation_increment_days ?? 1
  const incYears = pos.vacation_increment_years && pos.vacation_increment_years > 0 ? pos.vacation_increment_years : 0
  const steps = incYears > 0 ? Math.floor((elig.years - 1) / incYears) : 0
  return base + incDays * steps
}

function loadVacationEmployee(tenantId: string, employeeId: string) {
  return prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: VACATION_EMPLOYEE_SELECT })
}

export async function resolveVacationEntitlement(tenantId: string, employeeId: string, asOf: Date = bangkokToday()): Promise<number> {
  return resolveVacationEntitlementFromChain(await loadVacationEmployee(tenantId, employeeId), asOf)
}

export async function previewVacationPolicy(tenantId: string, employeeId: string, asOf: Date = bangkokToday()) {
  const e = await loadVacationEmployee(tenantId, employeeId)
  const elig = isVacationEligible(e, asOf)
  return { ...elig, entitlement: resolveVacationEntitlementFromChain(e, asOf) }
}

// bulk — ใช้กับ cron/รายงาน กันยิง query ต่อคน (N+1) เมื่อต้อง resolve ทั้ง tenant
export async function resolveVacationEntitlementBulk(
  tenantId: string, asOf: Date = bangkokToday(), employeeIds?: string[],
): Promise<Map<string, { entitlement: number; eligible: boolean; reason: string }>> {
  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(employeeIds ? { id: { in: employeeIds } } : {}) },
    select: { id: true, ...VACATION_EMPLOYEE_SELECT },
  })
  const out = new Map<string, { entitlement: number; eligible: boolean; reason: string }>()
  for (const e of employees) {
    const elig = isVacationEligible(e, asOf)
    out.set(e.id, { entitlement: resolveVacationEntitlementFromChain(e, asOf), eligible: elig.eligible, reason: elig.reason })
  }
  return out
}

// ── โควต้ารวม 10 วัน/เดือน (ข้อ 5) ─────────────────────────────────────────
export const MONTHLY_TOTAL_CAP = 10

// นับวันหยุดที่จอง (PENDING+APPROVED) เดือนนั้น — ใช้ query เดียวกับ countMonthOffRequests
// เดิมใน weekly-off.service.ts (export มาจากที่นั่นเพื่อไม่ fork ตรรกะ ±6 วัน)
export async function countMonthlyCommitment(
  tenantId: string, employeeId: string, ym: string,
  opts: { excludeWeeklyOffId?: string; excludeLeaveId?: string } = {},
): Promise<{ dayOff: number; vacation: number; total: number }> {
  const { countMonthOffRequests } = await import('../weekly-off/weekly-off.service')
  const dayOff = await countMonthOffRequests(tenantId, employeeId, ym, opts.excludeWeeklyOffId)

  const [y, m] = ym.split('-').map(Number)
  const rangeStart = new Date(Date.UTC(y, m - 1, 1))
  const rangeEnd   = new Date(Date.UTC(y, m, 0, 23, 59, 59))
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenant_id: tenantId, employee_id: employeeId, leave_type: 'VACATION',
      status: { in: ['PENDING', 'APPROVED'] },
      start_date: { gte: rangeStart, lte: rangeEnd },
      ...(opts.excludeLeaveId ? { id: { not: opts.excludeLeaveId } } : {}),
    },
    select: { days: true },
  })
  const vacation = leaves.reduce((sum, l) => sum + l.days, 0)
  return { dayOff, vacation, total: dayOff + vacation }
}

// throw 'MONTHLY_CAP_EXCEEDED' ถ้ารวมเกิน 10 วัน/เดือน — เรียกจากทั้ง weekly-off.service
// และ leave.service (เฉพาะ leave_type=VACATION) ก่อนสร้าง record จริง
export async function assertMonthlyCap(
  tenantId: string, employeeId: string, ym: string, adding: number,
  opts: { excludeWeeklyOffId?: string; excludeLeaveId?: string } = {},
) {
  const { total } = await countMonthlyCommitment(tenantId, employeeId, ym, opts)
  if (total + adding > MONTHLY_TOTAL_CAP) throw new Error('MONTHLY_CAP_EXCEEDED')
}

// ── Grant/deduct primitives — เขียน LeaveBalance + log ทุกครั้งในธุรกรรมเดียว ─────
async function writeVacationGrant(
  tenantId: string, employeeId: string, year: number, ym: string,
  source: 'UNDER_QUOTA_BONUS' | 'ANNUAL_RESET' | 'HOLIDAY_WORKED' | 'CONFLICT_DEDUCTION' | 'MANUAL',
  opts: { setTotal?: number; incTotal?: number; incUsed?: number; leaveType?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER'; note?: string; createdBy?: string },
) {
  const leaveType = opts.leaveType ?? 'VACATION'
  const days = opts.setTotal != null ? opts.setTotal : (opts.incTotal ?? -(opts.incUsed ?? 0))
  try {
    await prisma.$transaction(async tx => {
      const existing = await tx.leaveBalance.findFirst({ where: { employee_id: employeeId, leave_type: leaveType, custom_type_id: null, year } })
      if (opts.setTotal != null) {
        if (existing) await tx.leaveBalance.update({ where: { id: existing.id }, data: { total_days: opts.setTotal, used_days: 0 } })
        else await tx.leaveBalance.create({ data: { tenant_id: tenantId, employee_id: employeeId, leave_type: leaveType, year, total_days: opts.setTotal, used_days: 0 } })
      } else if (opts.incTotal != null) {
        if (existing) await tx.leaveBalance.update({ where: { id: existing.id }, data: { total_days: { increment: opts.incTotal } } })
        else await tx.leaveBalance.create({ data: { tenant_id: tenantId, employee_id: employeeId, leave_type: leaveType, year, total_days: opts.incTotal } })
      } else if (opts.incUsed != null) {
        // การหัก (ข้อ 1) — จงใจปล่อยให้ used_days > total_days ได้ (แอดมินสั่งหักเป็นบทลงโทษ
        // ไม่ใช่พนักงานขอเอง บล็อกแล้วค้างสถานะอนุมัติไม่ได้)
        if (existing) await tx.leaveBalance.update({ where: { id: existing.id }, data: { used_days: { increment: opts.incUsed } } })
        else await tx.leaveBalance.create({ data: { tenant_id: tenantId, employee_id: employeeId, leave_type: leaveType, year, total_days: 0, used_days: opts.incUsed } })
      }
      await tx.vacationGrantLog.create({
        data: { tenant_id: tenantId, employee_id: employeeId, year, ym, source, days, note: opts.note, created_by: opts.createdBy },
      })
    })
  } catch (e: any) {
    // unique([employee_id, source, year, ym]) ชน = ให้ไปแล้วรอบนี้ (idempotent กัน cron รันซ้ำ)
    if (e.code === 'P2002') return
    throw e
  }
}

// ข้อ 1 — แอดมินหักโควต้าตอนอนุมัติคำขอที่ has_conflict=true
export async function applyConflictDeduction(
  tenantId: string, employeeId: string, leaveType: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER',
  year: number, actorUserId?: string,
) {
  await writeVacationGrant(tenantId, employeeId, year, `${year}`, 'CONFLICT_DEDUCTION', {
    incUsed: 1, leaveType, note: 'หักจากการชนตำแหน่งเดียวกัน — แอดมินอนุมัติให้หยุดต่อ', createdBy: actorUserId,
  })
}
export async function reverseConflictDeduction(
  tenantId: string, employeeId: string, leaveType: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER',
  year: number, actorUserId?: string,
) {
  await prisma.leaveBalance.updateMany({
    where: { employee_id: employeeId, leave_type: leaveType, custom_type_id: null, year },
    data: { used_days: { decrement: 1 } },
  })
  await prisma.vacationGrantLog.create({
    data: { tenant_id: tenantId, employee_id: employeeId, year, ym: `${year}`, source: 'MANUAL', days: 1, note: 'คืนวันจากการยกเลิก/ลบคำขอที่เคยหักไว้', created_by: actorUserId },
  }).catch(() => {}) // ไม่ critical ถ้า log ซ้ำ/พลาด — balance คืนไปแล้วเป็นหลัก
}

// ข้อ 3 — มาทำงานวันหยุดบริษัท (เรียกจาก grantHolidayCompensation ที่ holiday.service.ts
// เมื่อ holiday.compensate_leave_type === 'VACATION')
export async function logHolidayWorkedVacationGrant(tenantId: string, employeeId: string, year: number, days: number) {
  await prisma.vacationGrantLog.create({
    data: { tenant_id: tenantId, employee_id: employeeId, year, ym: `${year}`, source: 'HOLIDAY_WORKED', days },
  }).catch(() => {})
}

// ข้อ 2 — โบนัส +1 พักร้อน ถ้าหยุดไม่ครบโควต้า/เดือน (เรียกจาก cron รายเดือน)
// เฉพาะคนที่ "อยู่ในโปรแกรมพักร้อนจริง" (isVacationEligible) — ไม่ให้คนที่ไม่มีสิทธิ์
// พักร้อนเลยจู่ๆมี balance โผล่มา
export async function grantUnderQuotaBonus(tenantId: string, ym: string) {
  const [y] = ym.split('-').map(Number)
  const asOf = bangkokToday()
  const { countMonthOffRequests } = await import('../weekly-off/weekly-off.service')
  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, deleted_at: null, status: 'ACTIVE' },
    select: { id: true, ...VACATION_EMPLOYEE_SELECT },
  })
  let granted = 0, skipped = 0, ineligible = 0
  for (const e of employees) {
    const elig = isVacationEligible(e, asOf)
    if (!elig.eligible) { ineligible++; continue }
    const quota = await resolveBookingQuota(tenantId, e.id)
    // เฉพาะที่ "อนุมัติแล้วจริง" (ไม่นับ PENDING ที่ยังค้าง) — เดือนปิดไปแล้วตอน cron รัน
    const approved = await countMonthOffRequests(tenantId, e.id, ym, undefined, ['APPROVED'])
    if (approved < quota) {
      await writeVacationGrant(tenantId, e.id, y, ym, 'UNDER_QUOTA_BONUS', { incTotal: 1, note: `หยุดไม่ครบโควต้า ${ym} (${approved}/${quota})` })
      granted++
    } else skipped++
  }
  return { ym, granted, skipped, ineligible }
}

// ข้อ 8 — reset ประจำปี 1 ม.ค.: ตั้ง total_days ใหม่ตามสูตรอายุงาน, used_days=0
// ไม่ carry-over (ตามที่ยืนยัน: "reset ค่าเริ่มต้น") — ข้ามคนที่ไม่มีสิทธิ์ (ไม่ทำให้เป็น 0)
export async function runVacationAnnualReset(tenantId: string, year: number) {
  const asOf = new Date(Date.UTC(year, 0, 1))
  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, deleted_at: null, status: 'ACTIVE' },
    select: { id: true, ...VACATION_EMPLOYEE_SELECT },
  })
  let reset = 0, skipped = 0
  for (const e of employees) {
    const elig = isVacationEligible(e, asOf)
    if (!elig.eligible) { skipped++; continue }
    const entitlement = resolveVacationEntitlementFromChain(e, asOf)
    await writeVacationGrant(tenantId, e.id, year, `${year}`, 'ANNUAL_RESET', { setTotal: entitlement, note: `reset ประจำปี ${year} ตามอายุงาน ${elig.years} ปี` })
    reset++
  }
  return { year, reset, skipped }
}

// ข้อ 8b — รายงานพักร้อนคงเหลือของปีก่อน (ขายคืนได้ไม่เกิน 10 วัน — HR คิดจ่ายนอกระบบ)
export async function listVacationRemainingReport(tenantId: string, year: number) {
  const rows = await prisma.leaveBalance.findMany({
    where: { tenant_id: tenantId, leave_type: 'VACATION', year },
    include: {
      employee: {
        select: {
          id: true, first_name: true, last_name: true, nickname: true, employee_code: true,
          branch: { select: { name: true } }, position: { select: { name: true } },
        },
      },
    },
  })
  return rows
    .filter(r => r.employee) // กันพนักงานที่ถูกลบไปแล้ว
    .map(r => {
      const remaining = Math.max(0, r.total_days - r.used_days)
      return {
        employee_id: r.employee_id,
        full_name: `${r.employee.first_name} ${r.employee.last_name}`,
        nickname: r.employee.nickname,
        employee_code: r.employee.employee_code,
        branch_name: r.employee.branch?.name ?? null,
        position_name: r.employee.position?.name ?? null,
        total_days: r.total_days, used_days: r.used_days, remaining,
        sellable: Math.min(remaining, 10),
      }
    })
    .sort((a, b) => b.remaining - a.remaining)
}
