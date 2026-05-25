// server/src/modules/shift/shift.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listShifts(tenantId: string, branchId?: string) {
  return prisma.shift.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ branch_id: 'asc' }, { start_time: 'asc' }],
  })
}

export async function getShift(tenantId: string, id: string) {
  return prisma.shift.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: { branch: { select: { id: true, name: true } } },
  })
}

export async function createShift(
  tenantId: string,
  data: {
    branch_id: string
    name: string
    start_time: string
    end_time: string
    late_threshold?: number
  },
) {
  return prisma.shift.create({
    data: { tenant_id: tenantId, ...data },
  })
}

export async function updateShift(
  tenantId: string,
  id: string,
  data: {
    name?: string
    start_time?: string
    end_time?: string
    late_threshold?: number
    is_active?: boolean
  },
) {
  const count = await prisma.shift.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.shift.findFirst({ where: { id } })
}

export async function deleteShift(tenantId: string, id: string) {
  const count = await prisma.shift.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
