// server/src/modules/group/group.service.ts
// กลุ่ม (บริษัท) — ชั้นนโยบายเหนือสาขา คั่นระหว่าง Tenant กับ Branch จำนวนกลุ่มต่อ tenant
// จำกัดตาม Tenant.max_groups (package) — resolvePolicyFlag() คือ core ของ policy cascade 6 ชั้น:
// บุคคล override → ตำแหน่ง → แผนก → ฝ่าย → สาขา → กลุ่ม → true (เจาะจงกว่าชนะ)
// 2 แกนอิสระ: 'booking' (จองวันหยุด) / 'leave' (ยื่นคำขอลา)
import { prisma } from '../../common/utils/prisma'

export async function listGroups(tenantId: string) {
  return prisma.group.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { branches: true, divisions: true } } },
    orderBy: { created_at: 'asc' },
  })
}

type GroupDayRule = 'WORK' | 'OFF' | 'OFFSITE'
interface GroupPolicyInput {
  booking_enabled?: boolean; leave_enabled?: boolean
  saturday_rule?: GroupDayRule; sunday_rule?: GroupDayRule; booking_quota?: number
}

export async function createGroup(tenantId: string, data: { name: string } & GroupPolicyInput) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deleted_at: null } })
  if (!tenant) throw new Error('TENANT_NOT_FOUND')

  const current = await prisma.group.count({ where: { tenant_id: tenantId, deleted_at: null } })
  if (current >= tenant.max_groups) throw new Error('LIMIT_REACHED')

  return prisma.group.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      booking_enabled: data.booking_enabled ?? true,
      leave_enabled: data.leave_enabled ?? true,
      ...(data.saturday_rule !== undefined ? { saturday_rule: data.saturday_rule } : {}),
      ...(data.sunday_rule   !== undefined ? { sunday_rule: data.sunday_rule } : {}),
      ...(data.booking_quota !== undefined ? { booking_quota: data.booking_quota } : {}),
    },
  })
}

export async function updateGroup(tenantId: string, id: string, data: { name?: string; is_active?: boolean } & GroupPolicyInput) {
  const count = await prisma.group.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.group.findFirst({ where: { id } })
}

async function groupChildCount(tenantId: string, id: string) {
  const [branches, divisions] = await Promise.all([
    prisma.branch.count({ where: { group_id: id, tenant_id: tenantId, deleted_at: null } }),
    prisma.division.count({ where: { group_id: id, tenant_id: tenantId, deleted_at: null } }),
  ])
  return branches + divisions
}

export async function deleteGroup(tenantId: string, id: string) {
  if (await groupChildCount(tenantId, id) > 0) throw new Error('IN_USE')
  const count = await prisma.group.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ย้ายสาขาเข้ากลุ่ม (ตอนสร้าง branch หรือ reassign ทีหลังจากหน้าจัดการกลุ่ม)
export async function assignBranchToGroup(tenantId: string, branchId: string, groupId: string | null) {
  if (groupId) {
    const group = await prisma.group.findFirst({ where: { id: groupId, tenant_id: tenantId, deleted_at: null } })
    if (!group) throw new Error('GROUP_NOT_FOUND')
  }
  const count = await prisma.branch.updateMany({ where: { id: branchId, tenant_id: tenantId, deleted_at: null }, data: { group_id: groupId } })
  return count.count > 0
}

// ── Policy cascade ────────────────────────────────────────────
// ลำดับชั้น 6 ระดับ "เจาะจงกว่าชนะ" (first non-null):
//   บุคคล(override) → ตำแหน่ง → แผนก → ฝ่าย → สาขา → กลุ่ม(ของสาขา) → true
// ชั้น "กลุ่ม" อ้างจาก branch.group เสมอ (ตรงกับ mental model กลุ่ม→สาขา และ branch_id มีทุกคน)
// มี 2 แกนอิสระ: 'booking' (จองวันหยุด weekly-off) และ 'leave' (ยื่นคำขอลา)
export type PolicyFlag = 'booking' | 'leave'

const pick = (v: boolean | null | undefined): boolean | null => (v === null || v === undefined ? null : v)

// รูปร่างข้อมูลที่ resolvePolicyFromChain ต้องใช้ (subset ของ employee ที่ query มา)
export interface PolicyNode { booking_enabled?: boolean | null; leave_enabled?: boolean | null }
export interface PolicyEmployeeShape {
  booking_enabled_override?: boolean | null
  leave_enabled_override?: boolean | null
  branch?: (PolicyNode & { group?: PolicyNode | null }) | null
  position?: (PolicyNode & { department?: (PolicyNode & { division?: PolicyNode | null }) | null }) | null
}

// pure — "เจาะจงกว่าชนะ" first non-null; null ทั้ง chain → true (แยกไว้ unit test ได้ไม่ต้องแตะ DB)
export function resolvePolicyFromChain(employee: PolicyEmployeeShape | null, flag: PolicyFlag): boolean {
  if (!employee) return true
  const b = flag === 'booking'
  const pos  = employee.position
  const dept = pos?.department
  const div  = dept?.division
  const br   = employee.branch
  const chain: (boolean | null)[] = [
    pick(b ? employee.booking_enabled_override : employee.leave_enabled_override),
    pick(b ? pos?.booking_enabled  : pos?.leave_enabled),
    pick(b ? dept?.booking_enabled : dept?.leave_enabled),
    pick(b ? div?.booking_enabled  : div?.leave_enabled),
    pick(b ? br?.booking_enabled   : br?.leave_enabled),
    pick(b ? br?.group?.booking_enabled : br?.group?.leave_enabled),
  ]
  for (const v of chain) if (v !== null) return v
  return true
}

// ── นโยบายวันหยุด: เสาร์/อาทิตย์ + โควต้าจอง — cascade เดียวกัน + ชั้นบนสุด = สถานะพนักงาน ─
type DayRule = 'WORK' | 'OFF' | 'OFFSITE'
export interface PolicyDayNode { saturday_rule?: DayRule | null; sunday_rule?: DayRule | null; booking_quota?: number | null }
export interface WeekendQuotaShape {
  employee_status_type?: { saturday_rule?: DayRule | null; sunday_rule?: DayRule | null; monthly_off_quota?: number | null } | null
  branch?: (PolicyDayNode & { group?: PolicyDayNode | null }) | null
  position?: (PolicyDayNode & { department?: (PolicyDayNode & { division?: PolicyDayNode | null }) | null }) | null
}
const DEFAULT_QUOTA = 5

// เจาะจงกว่าชนะ: สถานะพนักงาน → ตำแหน่ง → แผนก → ฝ่าย → สาขา → กลุ่ม
export function resolveWeekendRuleFromChain(e: WeekendQuotaShape | null, day: 'saturday' | 'sunday'): DayRule {
  if (!e) return 'OFF'
  const k = day === 'saturday' ? 'saturday_rule' : 'sunday_rule'
  const st = e.employee_status_type
  const chain: (DayRule | null | undefined)[] = [
    st?.[k],
    e.position?.[k], e.position?.department?.[k], e.position?.department?.division?.[k],
    e.branch?.[k], e.branch?.group?.[k],
  ]
  for (const v of chain) if (v !== null && v !== undefined) return v
  return 'OFF'
}
export function resolveBookingQuotaFromChain(e: WeekendQuotaShape | null): number {
  if (!e) return DEFAULT_QUOTA
  const chain: (number | null | undefined)[] = [
    e.employee_status_type?.monthly_off_quota,
    e.position?.booking_quota, e.position?.department?.booking_quota, e.position?.department?.division?.booking_quota,
    e.branch?.booking_quota, e.branch?.group?.booking_quota,
  ]
  for (const v of chain) if (v !== null && v !== undefined) return v
  return DEFAULT_QUOTA
}

const POLICY_SELECT = {
  booking_enabled_override: true,
  leave_enabled_override: true,
  employee_status_type: { select: { saturday_rule: true, sunday_rule: true, monthly_off_quota: true } },
  branch: {
    select: {
      booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true,
      group: { select: { booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true } },
    },
  },
  position: {
    select: {
      booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true,
      department: {
        select: {
          booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true,
          division: { select: { booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true } },
        },
      },
    },
  },
} as const

function loadPolicyEmployee(tenantId: string, employeeId: string) {
  return prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: POLICY_SELECT })
}

export async function resolvePolicyFlag(tenantId: string, employeeId: string, flag: PolicyFlag): Promise<boolean> {
  return resolvePolicyFromChain(await loadPolicyEmployee(tenantId, employeeId), flag)
}

// wrapper คงชื่อเดิมไว้ (มีที่เรียกจากหลายโมดูล)
export const resolveBookingEnabled = (tenantId: string, employeeId: string) => resolvePolicyFlag(tenantId, employeeId, 'booking')
export const resolveLeaveEnabled   = (tenantId: string, employeeId: string) => resolvePolicyFlag(tenantId, employeeId, 'leave')

export async function resolveWeekendRule(tenantId: string, employeeId: string, day: 'saturday' | 'sunday'): Promise<DayRule> {
  return resolveWeekendRuleFromChain(await loadPolicyEmployee(tenantId, employeeId) as any, day)
}
export async function resolveBookingQuota(tenantId: string, employeeId: string): Promise<number> {
  return resolveBookingQuotaFromChain(await loadPolicyEmployee(tenantId, employeeId) as any)
}

// resolve 3 อย่างในครั้งเดียว (ใช้ตอน LIFF login — ประหยัด query)
export async function resolveHolidayPolicy(tenantId: string, employeeId: string) {
  const e = await loadPolicyEmployee(tenantId, employeeId)
  return {
    booking_enabled: resolvePolicyFromChain(e, 'booking'),
    leave_enabled:   resolvePolicyFromChain(e, 'leave'),
    saturday_rule:   resolveWeekendRuleFromChain(e as any, 'saturday'),
    sunday_rule:     resolveWeekendRuleFromChain(e as any, 'sunday'),
    booking_quota:   resolveBookingQuotaFromChain(e as any),
  }
}
