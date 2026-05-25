// server/src/modules/branch/branch.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: {
      deleted_at: null,
      // SUPER_ADMIN (tenantId = '') ดูได้ทุก tenant
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    orderBy: { created_at: 'asc' },
  })
}

export async function getBranch(tenantId: string, id: string) {
  return prisma.branch.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
  })
}

export async function createBranch(tenantId: string, data: { name: string; location?: string }) {
  return prisma.branch.create({
    data: { tenant_id: tenantId, name: data.name, location: data.location },
  })
}

export async function updateBranch(
  tenantId: string,
  id: string,
  data: { name?: string; location?: string; is_active?: boolean },
) {
  const count = await prisma.branch.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.branch.findFirst({ where: { id } })
}

export async function deleteBranch(tenantId: string, id: string) {
  const count = await prisma.branch.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
