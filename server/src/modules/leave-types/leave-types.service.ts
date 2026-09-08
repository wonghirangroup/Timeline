// server/src/modules/leave-types/leave-types.service.ts
// ประเภทการลาที่ tenant กำหนดเอง (feature: custom_leave_types)
// + กติกาสะสมวันลา (feature: leave_accrual) — รันด้วยปุ่มของแอดมิน (ยังไม่มี cron)
import { prisma } from '../../common/utils/prisma'
import { bangkokNow } from '../../common/utils/time'

// ═══ TenantLeaveType ═══════════════════════════════════════════════════════
export async function listLeaveTypes(tenantId: string, includeInactive = false) {
  return prisma.tenantLeaveType.findMany({
    where: { tenant_id: tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
  })
}

export async function createLeaveType(tenantId: string, data: {
  name: string; color?: string; default_days?: number; paid?: boolean; deducts_quota?: boolean
}) {
  const count = await prisma.tenantLeaveType.count({ where: { tenant_id: tenantId } })
  return prisma.tenantLeaveType.create({
    data: {
      tenant_id: tenantId, name: data.name.trim(),
      color: data.color ?? '#64748b',
      default_days: data.default_days ?? 0,
      paid: data.paid ?? true,
      deducts_quota: data.deducts_quota ?? true,
      sort_order: count,
    },
  })
}

export async function updateLeaveType(tenantId: string, id: string, data: {
  name?: string; color?: string; default_days?: number; paid?: boolean; deducts_quota?: boolean; active?: boolean; sort_order?: number
}) {
  const t = await prisma.tenantLeaveType.findFirst({ where: { id, tenant_id: tenantId } })
  if (!t) return null
  return prisma.tenantLeaveType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.default_days !== undefined ? { default_days: data.default_days } : {}),
      ...(data.paid !== undefined ? { paid: data.paid } : {}),
      ...(data.deducts_quota !== undefined ? { deducts_quota: data.deducts_quota } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.sort_order !== undefined ? { sort_order: data.sort_order } : {}),
    },
  })
}

// ปิดใช้งาน (ไม่ hard delete — มี LeaveRequest/LeaveBalance ผูกอยู่)
export async function deactivateLeaveType(tenantId: string, id: string) {
  const count = await prisma.tenantLeaveType.updateMany({ where: { id, tenant_id: tenantId }, data: { active: false } })
  return count.count > 0
}

// ═══ Leave accrual rules ══════════════════════════════════════════════════
const STD_TYPES = ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE'] as const

export async function listAccrualRules(tenantId: string) {
  return prisma.leaveAccrualRule.findMany({
    where: { tenant_id: tenantId },
    include: { custom_type: { select: { id: true, name: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function upsertAccrualRule(tenantId: string, data: {
  leave_type: string; custom_type_id?: string | null
  days_per_month?: number; max_balance?: number | null; max_carryover?: number | null
  start_after_probation?: boolean; active?: boolean
}) {
  if (data.leave_type === 'OTHER' && !data.custom_type_id) throw new Error('INVALID_LEAVE_TYPE')
  const custom_type_id = data.leave_type === 'OTHER' ? data.custom_type_id! : null
  const existing = await prisma.leaveAccrualRule.findFirst({ where: { tenant_id: tenantId, leave_type: data.leave_type, custom_type_id } })
  const payload = {
    ...(data.days_per_month !== undefined ? { days_per_month: data.days_per_month } : {}),
    ...(data.max_balance !== undefined ? { max_balance: data.max_balance } : {}),
    ...(data.max_carryover !== undefined ? { max_carryover: data.max_carryover } : {}),
    ...(data.start_after_probation !== undefined ? { start_after_probation: data.start_after_probation } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
  }
  if (existing) return prisma.leaveAccrualRule.update({ where: { id: existing.id }, data: payload })
  return prisma.leaveAccrualRule.create({
    data: { tenant_id: tenantId, leave_type: data.leave_type, custom_type_id, days_per_month: data.days_per_month ?? 0, ...payload },
  })
}

export async function deleteAccrualRule(tenantId: string, id: string) {
  const count = await prisma.leaveAccrualRule.deleteMany({ where: { id, tenant_id: tenantId } })
  return count.count > 0
}

// ═══ ประมวลผลสะสม 1 เดือน (รันด้วยปุ่มแอดมิน) ═══════════════════════════════
// สำหรับ rule ที่ active — เพิ่ม days_per_month ให้ LeaveBalance ของพนักงาน ACTIVE ทุกคน
// กันรันซ้ำเดือนเดิมด้วย last_run_ym · ปีของ balance = ปีปัจจุบัน (เวลาไทย)
export async function runAccrualForMonth(tenantId: string, ym?: string) {
  const now = bangkokNow()
  const targetYm = ym ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const year = Number(targetYm.slice(0, 4))

  const rules = await prisma.leaveAccrualRule.findMany({ where: { tenant_id: tenantId, active: true } })
  if (rules.length === 0) return { ranMonth: targetYm, rulesRun: 0, balancesUpdated: 0, skippedAlreadyRun: 0 }

  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, deleted_at: null, status: 'ACTIVE' },
    select: { id: true, probation_end_date: true, probation_result: true },
  })

  let balancesUpdated = 0, rulesRun = 0, skippedAlreadyRun = 0
  const todayMid = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

  for (const rule of rules) {
    if (rule.last_run_ym === targetYm) { skippedAlreadyRun++; continue }
    rulesRun++
    for (const emp of employees) {
      // ยังไม่ผ่านทดลองงาน + rule บอกให้เริ่มหลังผ่านโปร → ข้าม
      if (rule.start_after_probation && emp.probation_result !== 'PASS' && emp.probation_end_date && emp.probation_end_date > todayMid) continue

      const bal = await prisma.leaveBalance.findFirst({
        where: { tenant_id: tenantId, employee_id: emp.id, leave_type: rule.leave_type as any, custom_type_id: rule.custom_type_id, year },
      })
      const current = bal?.total_days ?? 0
      let next = current + rule.days_per_month
      if (rule.max_balance != null) next = Math.min(next, rule.max_balance)
      if (next === current) continue

      if (bal) await prisma.leaveBalance.update({ where: { id: bal.id }, data: { total_days: next } })
      else await prisma.leaveBalance.create({
        data: { tenant_id: tenantId, employee_id: emp.id, leave_type: rule.leave_type as any, custom_type_id: rule.custom_type_id, year, total_days: next },
      })
      balancesUpdated++
    }
    await prisma.leaveAccrualRule.update({ where: { id: rule.id }, data: { last_run_ym: targetYm } })
  }

  return { ranMonth: targetYm, rulesRun, balancesUpdated, skippedAlreadyRun }
}

// ═══ ยกยอดข้ามปี (รันด้วยปุ่มแอดมิน ต้นปี) ═══════════════════════════════════
// สร้าง LeaveBalance ปีใหม่ = min(คงเหลือปีเก่า, max_carryover) + default (0 ถ้าไม่ระบุ)
export async function carryOverToYear(tenantId: string, toYear: number) {
  const fromYear = toYear - 1
  const rules = await prisma.leaveAccrualRule.findMany({ where: { tenant_id: tenantId, active: true } })
  if (rules.length === 0) return { toYear, carried: 0 }

  let carried = 0
  for (const rule of rules) {
    if (rule.max_carryover === 0) continue // ไม่ยก
    const olds = await prisma.leaveBalance.findMany({
      where: { tenant_id: tenantId, leave_type: rule.leave_type as any, custom_type_id: rule.custom_type_id, year: fromYear },
    })
    for (const old of olds) {
      const remaining = Math.max(0, old.total_days - old.used_days)
      const carryAmt = rule.max_carryover != null ? Math.min(remaining, rule.max_carryover) : remaining
      if (carryAmt <= 0) continue
      const existing = await prisma.leaveBalance.findFirst({
        where: { tenant_id: tenantId, employee_id: old.employee_id, leave_type: rule.leave_type as any, custom_type_id: rule.custom_type_id, year: toYear },
      })
      if (existing) await prisma.leaveBalance.update({ where: { id: existing.id }, data: { total_days: existing.total_days + carryAmt } })
      else await prisma.leaveBalance.create({
        data: { tenant_id: tenantId, employee_id: old.employee_id, leave_type: rule.leave_type as any, custom_type_id: rule.custom_type_id, year: toYear, total_days: carryAmt },
      })
      carried++
    }
  }
  return { toYear, carried }
}
