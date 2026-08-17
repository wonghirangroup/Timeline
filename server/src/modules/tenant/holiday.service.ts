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
  data: { name: string; date: string; type?: string; recurring?: boolean; target_branches?: string[]; target_departments?: string[] },
) {
  return prisma.holiday.create({
    data: {
      tenant_id:          tenantId,
      name:               data.name,
      date:               new Date(data.date),
      type:               (data.type as any) ?? 'NATIONAL',
      recurring:          data.recurring ?? false,
      target_branches:    data.target_branches?.length ? data.target_branches : undefined,
      target_departments: data.target_departments?.length ? data.target_departments : undefined,
    },
  })
}

export async function updateHoliday(
  tenantId: string,
  id: string,
  data: { name?: string; date?: string; type?: string; recurring?: boolean; target_branches?: string[] | null; target_departments?: string[] | null },
) {
  const count = await prisma.holiday.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(data.name      ? { name: data.name }                      : {}),
      ...(data.date      ? { date: new Date(data.date) }            : {}),
      ...(data.type      ? { type: data.type as any }               : {}),
      ...(data.recurring !== undefined ? { recurring: data.recurring } : {}),
      ...(data.target_branches    !== undefined ? { target_branches:    (data.target_branches?.length    ? data.target_branches    : null) as any } : {}),
      ...(data.target_departments !== undefined ? { target_departments: (data.target_departments?.length ? data.target_departments : null) as any } : {}),
    },
  })
  return count.count > 0
}

export async function batchCreateHolidays(
  tenantId: string,
  items: { name: string; date: string; type?: string; recurring?: boolean; target_branches?: string[]; target_departments?: string[] }[],
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
      tenant_id:          tenantId,
      name:               i.name,
      date:               new Date(i.date),
      type:               (i.type as any) ?? 'NATIONAL',
      recurring:          i.recurring ?? false,
      target_branches:    i.target_branches?.length ? i.target_branches : undefined,
      target_departments: i.target_departments?.length ? i.target_departments : undefined,
    })),
  })
  return { count: toCreate.length }
}

// เช็คว่า holiday นี้ใช้กับพนักงานคนนี้ไหม (null/[] ใน target = ใช้กับทุกคน)
// department เก็บไม่ตรงกันระหว่างสร้างผ่าน Admin UI ("03 พนักงานขาย") กับ migrate
// จาก Firebase (แค่ "03") — match ด้วยรหัส 2 ตัวแรกเสมอ (แบบเดียวกับ
// bulkSetWeeklyOffMode ใน employee.service.ts)
export function holidayAppliesTo(
  holiday: { target_branches: unknown; target_departments: unknown },
  employee: { branch_id: string; department: string | null },
): boolean {
  const branches    = (holiday.target_branches    as string[] | null) ?? []
  const departments = (holiday.target_departments as string[] | null) ?? []
  const branchOk = branches.length === 0 || branches.includes(employee.branch_id)
  const empDeptCode = employee.department?.slice(0, 2).trim() ?? ''
  const deptOk = departments.length === 0 || departments.some(d => d.slice(0, 2).trim() === empDeptCode)
  return branchOk && deptOk
}

export async function deleteHoliday(tenantId: string, id: string) {
  const count = await prisma.holiday.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
