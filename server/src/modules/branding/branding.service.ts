// server/src/modules/branding/branding.service.ts
import { prisma } from '../../common/utils/prisma'
import { uploadTenantLoadingImage, deleteTenantLoadingImage } from '../../common/utils/cloudinary'

export async function getLoadingImage(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { loading_image_url: true },
  })
  return tenant?.loading_image_url ?? null
}

export async function setLoadingImage(tenantId: string, buffer: Buffer): Promise<string> {
  const url = await uploadTenantLoadingImage(tenantId, buffer)
  await prisma.tenant.update({ where: { id: tenantId }, data: { loading_image_url: url } })
  return url
}

export async function removeLoadingImage(tenantId: string): Promise<void> {
  await deleteTenantLoadingImage(tenantId)
  await prisma.tenant.update({ where: { id: tenantId }, data: { loading_image_url: null } })
}
