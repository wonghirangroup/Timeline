// server/src/modules/employee-status-type/employee-status-type.service.ts
// สถานะพนักงาน (ประจำ/ชั่วคราว/...) admin สร้างเอง — กำหนดโควต้าวันหยุดต่อเดือนต่อสถานะ
import { prisma } from '../../common/utils/prisma'

export async function listEmployeeStatusTypes(tenantId: string) {
  return prisma.employeeStatusType.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { employees: true } } },
    orderBy: { created_at: 'asc' },
  })
}

type DayRuleValue = 'WORK' | 'OFF' | 'OFFSITE'

// โหมดโควต้า = เสาร์-อาทิตย์ของเดือน ต้องตั้งเสาร์/อาทิตย์เป็น "หยุด" เสมอ — ค่าเริ่มต้นคือ "ไม่จองก็หยุดเสาร์-อาทิตย์" ถ้าเป็น WORK พนักงานที่ไม่จองจะต้องทำงานเสาร์-อาทิตย์
const POOL_DAY_RULES = { saturday_rule: 'OFF', sunday_rule: 'OFF' } as const

export async function createEmployeeStatusType(tenantId: string, data: {
  name: string; monthly_off_quota?: number; off_quota_mode?: 'FIXED' | 'WEEKENDS_IN_MONTH'
  saturday_rule?: DayRuleValue; sunday_rule?: DayRuleValue; off_on_public_holiday?: boolean
}) {
  return prisma.employeeStatusType.create({
    data: {
      tenant_id: tenantId, name: data.name, monthly_off_quota: data.monthly_off_quota ?? 4,
      off_quota_mode:        data.off_quota_mode ?? 'FIXED',
      saturday_rule:         data.off_quota_mode === 'WEEKENDS_IN_MONTH' ? POOL_DAY_RULES.saturday_rule : (data.saturday_rule ?? 'WORK'),
      sunday_rule:           data.off_quota_mode === 'WEEKENDS_IN_MONTH' ? POOL_DAY_RULES.sunday_rule : (data.sunday_rule ?? 'WORK'),
      off_on_public_holiday: data.off_on_public_holiday ?? true,
    },
  })
}

export async function updateEmployeeStatusType(
  tenantId: string, id: string,
  data: {
    name?: string; monthly_off_quota?: number; off_quota_mode?: 'FIXED' | 'WEEKENDS_IN_MONTH'; is_active?: boolean
    saturday_rule?: DayRuleValue; sunday_rule?: DayRuleValue; off_on_public_holiday?: boolean
  },
) {
  // เป็น (หรือกำลังเปลี่ยนเป็น) โหมดเสาร์-อาทิตย์ของเดือน → บังคับเสาร์/อาทิตย์ = หยุด
  let patch = { ...data }
  const nextMode = data.off_quota_mode ?? (await prisma.employeeStatusType.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null }, select: { off_quota_mode: true } }))?.off_quota_mode
  if (nextMode === 'WEEKENDS_IN_MONTH') patch = { ...patch, ...POOL_DAY_RULES }
  const count = await prisma.employeeStatusType.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data: patch })
  if (count.count === 0) return null
  return prisma.employeeStatusType.findFirst({ where: { id } })
}

export async function deleteEmployeeStatusType(tenantId: string, id: string) {
  const inUse = await prisma.employee.count({ where: { employee_status_type_id: id, tenant_id: tenantId, deleted_at: null } })
  if (inUse > 0) throw new Error('IN_USE')
  const count = await prisma.employeeStatusType.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
