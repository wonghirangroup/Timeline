// server/src/modules/tenant/holiday.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listHolidays(tenantId: string, year?: number) {
  const y = year ?? new Date().getFullYear()
  return prisma.holiday.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      date: {
        gte: new Date(`${y}-01-01`),
        lte: new Date(`${y}-12-31`),
      },
    },
    orderBy: { date: 'asc' },
  })
}

export async function createHoliday(
  tenantId: string,
  data: { name: string; date: string },
) {
  return prisma.holiday.create({
    data: {
      tenant_id: tenantId,
      name:      data.name,
      date:      new Date(data.date),
    },
  })
}

export async function deleteHoliday(tenantId: string, id: string) {
  const count = await prisma.holiday.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
