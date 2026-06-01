// server/src/modules/branch/branch.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    include: {
      _count: { select: { employees: true, shifts: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

export async function getBranch(tenantId: string, id: string) {
  return prisma.branch.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
  })
}

export async function createBranch(tenantId: string, data: {
  name: string
  location?: string
  lat?: number
  lng?: number
  gps_radius?: number
  geo_mode?: 'WARN' | 'BLOCK'
}) {
  return prisma.branch.create({
    data: {
      tenant_id: tenantId,
      name: data.name,
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      gps_radius: data.gps_radius ?? 200,
      geo_mode: data.geo_mode ?? 'WARN',
    },
  })
}

export async function getBranchQrUrl(tenantId: string, branchId: string): Promise<{ url: string; branch_name: string } | null> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenant_id: tenantId, deleted_at: null },
  })
  if (!branch) return null

  const liffId = process.env.LINE_LIFF_ID ?? ''
  const url = `https://liff.line.me/${liffId}?mode=qr&branchId=${branchId}`
  return { url, branch_name: branch.name }
}

export async function updateBranch(
  tenantId: string,
  id: string,
  data: { name?: string; location?: string; lat?: number | null; lng?: number | null; gps_radius?: number; geo_mode?: 'WARN' | 'BLOCK'; is_active?: boolean },
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
