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

export async function createGroup(tenantId: string, data: { name: string; booking_enabled?: boolean; leave_enabled?: boolean }) {
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
    },
  })
}

export async function updateGroup(tenantId: string, id: string, data: { name?: string; booking_enabled?: boolean; leave_enabled?: boolean; is_active?: boolean }) {
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

export async function resolvePolicyFlag(tenantId: string, employeeId: string, flag: PolicyFlag): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId },
    select: {
      booking_enabled_override: true,
      leave_enabled_override: true,
      branch: {
        select: {
          booking_enabled: true, leave_enabled: true,
          group: { select: { booking_enabled: true, leave_enabled: true } },
        },
      },
      position: {
        select: {
          booking_enabled: true, leave_enabled: true,
          department: {
            select: {
              booking_enabled: true, leave_enabled: true,
              division: { select: { booking_enabled: true, leave_enabled: true } },
            },
          },
        },
      },
    },
  })
  if (!employee) return true // ไม่รู้จักพนักงาน — ปลอดภัยไว้ก่อน ไม่บล็อกโดยไม่มีเหตุ

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

// wrapper คงชื่อเดิมไว้ (มีที่เรียกจากหลายโมดูล)
export const resolveBookingEnabled = (tenantId: string, employeeId: string) => resolvePolicyFlag(tenantId, employeeId, 'booking')
export const resolveLeaveEnabled   = (tenantId: string, employeeId: string) => resolvePolicyFlag(tenantId, employeeId, 'leave')
