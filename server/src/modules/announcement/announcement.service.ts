// server/src/modules/announcement/announcement.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listAnnouncements(tenantId: string) {
  return prisma.announcement.findMany({
    where: { ...(tenantId ? { tenant_id: tenantId } : {}) },
    orderBy: { created_at: 'desc' },
  })
}

export async function createAnnouncement(
  tenantId: string,
  userId: string,
  data: { title: string; content: string; send_line?: boolean },
) {
  return prisma.announcement.create({
    data: {
      tenant_id:  tenantId,
      created_by: userId,
      title:      data.title,
      content:    data.content,
      send_line:  data.send_line ?? false,
    },
  })
}

export async function deleteAnnouncement(tenantId: string, id: string) {
  const count = await prisma.announcement.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
