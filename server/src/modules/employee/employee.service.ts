// server/src/modules/employee/employee.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listEmployees(tenantId: string, branchId?: string) {
  return prisma.employee.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function getEmployee(tenantId: string, id: string) {
  return prisma.employee.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: { branch: { select: { id: true, name: true } } },
  })
}

export async function createEmployee(
  tenantId: string,
  data: {
    branch_id: string
    employee_code: string
    first_name: string
    last_name: string
    phone?: string
  },
) {
  return prisma.employee.create({
    data: { tenant_id: tenantId, ...data },
  })
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  data: {
    branch_id?: string
    first_name?: string
    last_name?: string
    phone?: string
    line_user_id?: string | null
    is_active?: boolean
  },
) {
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.employee.findFirst({ where: { id } })
}

export async function deleteEmployee(tenantId: string, id: string) {
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
