// server/src/modules/offsite/offsite.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listOffsiteCheckins(tenantId: string, filters: {
  employeeId?: string
  branchId?: string
}) {
  return prisma.offsiteCheckin.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
      ...(filters.branchId   ? { employee: { branch_id: filters.branchId } } : {}),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true,
          branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: { check_in_at: 'desc' },
  })
}

export async function createOffsiteCheckin(
  tenantId: string,
  data: { employee_id: string; lat: number; lng: number; note?: string },
) {
  const open = await prisma.offsiteCheckin.findFirst({
    where: { tenant_id: tenantId, employee_id: data.employee_id, check_out_at: null },
  })
  if (open) throw new Error('ALREADY_CHECKED_IN')

  return prisma.offsiteCheckin.create({
    data: {
      tenant_id:    tenantId,
      employee_id:  data.employee_id,
      check_in_lat: data.lat,
      check_in_lng: data.lng,
      note:         data.note,
    },
  })
}

export async function checkOutOffsiteCheckin(
  tenantId: string,
  id: string,
  employeeId: string,
  data: { lat: number; lng: number },
) {
  const count = await prisma.offsiteCheckin.updateMany({
    where: { id, tenant_id: tenantId, employee_id: employeeId, check_out_at: null },
    data: {
      check_out_at:  new Date(),
      check_out_lat: data.lat,
      check_out_lng: data.lng,
    },
  })
  return count.count > 0
}
