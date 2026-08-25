// server/src/modules/employee-status-type/employee-status-type.service.ts
// สถานะพนักงาน (ประจำ/ชั่วคราว/...) admin สร้างเอง — กำหนดโควต้าวันหยุดต่อเดือนต่อสถานะ
import { prisma } from '../../common/utils/prisma'

export async function listEmployeeStatusTypes(tenantId: string) {
  return prisma.employeeStatusType.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { employees: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createEmployeeStatusType(tenantId: string, data: { name: string; monthly_off_quota?: number }) {
  return prisma.employeeStatusType.create({
    data: { tenant_id: tenantId, name: data.name, monthly_off_quota: data.monthly_off_quota ?? 4 },
  })
}

export async function updateEmployeeStatusType(
  tenantId: string, id: string,
  data: { name?: string; monthly_off_quota?: number; is_active?: boolean },
) {
  const count = await prisma.employeeStatusType.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.employeeStatusType.findFirst({ where: { id } })
}

export async function deleteEmployeeStatusType(tenantId: string, id: string) {
  const inUse = await prisma.employee.count({ where: { employee_status_type_id: id, tenant_id: tenantId, deleted_at: null } })
  if (inUse > 0) throw new Error('IN_USE')
  const count = await prisma.employeeStatusType.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
