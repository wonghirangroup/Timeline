// server/src/modules/group/group.service.ts
// กลุ่ม (บริษัท) — ชั้นนโยบายเหนือสาขา คั่นระหว่าง Tenant กับ Branch จำนวนกลุ่มต่อ tenant
// จำกัดตาม Tenant.max_groups (package) — resolveBookingEnabled() คือ core ของ policy cascade:
// Employee override → Department → Division → Group → true (default ปลอดภัยสุด ถ้าไม่มีอะไรตั้งไว้เลย)
import { prisma } from '../../common/utils/prisma'

export async function listGroups(tenantId: string) {
  return prisma.group.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { branches: true, divisions: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createGroup(tenantId: string, data: { name: string; booking_enabled?: boolean }) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deleted_at: null } })
  if (!tenant) throw new Error('TENANT_NOT_FOUND')

  const current = await prisma.group.count({ where: { tenant_id: tenantId, deleted_at: null } })
  if (current >= tenant.max_groups) throw new Error('LIMIT_REACHED')

  return prisma.group.create({
    data: { tenant_id: tenantId, name: data.name, booking_enabled: data.booking_enabled ?? true },
  })
}

export async function updateGroup(tenantId: string, id: string, data: { name?: string; booking_enabled?: boolean; is_active?: boolean }) {
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
// ลำดับ inherit: Employee override → Department (ผ่าน Position) → Division → Group
// พนักงานส่วนใหญ่ยังไม่มี position_id (ผังองค์กรเพิ่งสร้าง ใช้น้อย) เลย fallback ไปหา
// กลุ่มผ่าน Branch ตรงๆ ถ้าไม่มีตำแหน่ง — ไม่งั้น cascade นี้จะใช้งานไม่ได้กับคนส่วนใหญ่เลย
export async function resolveBookingEnabled(tenantId: string, employeeId: string): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId },
    select: {
      booking_enabled_override: true,
      branch: { select: { group: { select: { booking_enabled: true } } } },
      position: {
        select: {
          department: {
            select: {
              booking_enabled: true,
              division: { select: { booking_enabled: true, group: { select: { booking_enabled: true } } } },
            },
          },
        },
      },
    },
  })
  if (!employee) return true // ไม่รู้จักพนักงาน — ปลอดภัยไว้ก่อน ไม่บล็อกโดยไม่มีเหตุ

  if (employee.booking_enabled_override !== null && employee.booking_enabled_override !== undefined) {
    return employee.booking_enabled_override
  }

  const dept = employee.position?.department
  if (dept && dept.booking_enabled !== null) return dept.booking_enabled
  if (dept?.division && dept.division.booking_enabled !== null) return dept.division.booking_enabled

  // ไม่มีตำแหน่ง (หรือมีแต่ dept/division ทุกชั้น inherit ว่างหมด) → ใช้กลุ่มของฝ่ายที่ตำแหน่งสังกัด
  // ถ้ามี ไม่งั้น fallback ไปกลุ่มของสาขาที่พนักงานสังกัดโดยตรง
  const group = dept?.division?.group ?? employee.branch?.group
  return group?.booking_enabled ?? true
}
