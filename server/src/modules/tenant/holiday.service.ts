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
  data: { name: string; date: string; type?: string; recurring?: boolean },
) {
  return prisma.holiday.create({
    data: {
      tenant_id: tenantId,
      name:      data.name,
      date:      new Date(data.date),
      type:      (data.type as any) ?? 'NATIONAL',
      recurring: data.recurring ?? false,
    },
  })
}

export async function updateHoliday(
  tenantId: string,
  id: string,
  data: { name?: string; date?: string; type?: string; recurring?: boolean },
) {
  const count = await prisma.holiday.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(data.name      ? { name: data.name }                      : {}),
      ...(data.date      ? { date: new Date(data.date) }            : {}),
      ...(data.type      ? { type: data.type as any }               : {}),
      ...(data.recurring !== undefined ? { recurring: data.recurring } : {}),
    },
  })
  return count.count > 0
}

export async function batchCreateHolidays(
  tenantId: string,
  items: { name: string; date: string; type?: string; recurring?: boolean }[],
) {
  // หักวันซ้ำออก
  const existing = await prisma.holiday.findMany({
    where: { tenant_id: tenantId },
    select: { date: true },
  })
  const existDates = new Set(existing.map(h => h.date.toISOString().slice(0, 10)))
  const toCreate = items.filter(i => !existDates.has(i.date))

  if (toCreate.length === 0) return { count: 0 }

  await prisma.holiday.createMany({
    data: toCreate.map(i => ({
      tenant_id: tenantId,
      name:      i.name,
      date:      new Date(i.date),
      type:      (i.type as any) ?? 'NATIONAL',
      recurring: i.recurring ?? false,
    })),
  })
  return { count: toCreate.length }
}

export async function deleteHoliday(tenantId: string, id: string) {
  const count = await prisma.holiday.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
