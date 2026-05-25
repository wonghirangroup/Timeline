// server/src/modules/ot/ot.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listOtRequests(tenantId: string, filters: {
  employeeId?: string
  status?: string
  branchId?: string
}) {
  return prisma.otRequest.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
      ...(filters.status     ? { status: filters.status as any }   : {}),
      ...(filters.branchId   ? { employee: { branch_id: filters.branchId } } : {}),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true,
          branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: { created_at: 'desc' },
  })
}

export async function createOtRequest(
  tenantId: string,
  data: {
    employee_id: string
    date: string
    start_time: string
    end_time: string
    hours: number
    reason?: string
  },
) {
  return prisma.otRequest.create({
    data: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      date:        new Date(data.date),
      start_time:  data.start_time,
      end_time:    data.end_time,
      hours:       data.hours,
      reason:      data.reason,
    },
  })
}

export async function approveOtRequest(tenantId: string, id: string, reviewerId: string) {
  const count = await prisma.otRequest.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), status: 'PENDING' },
    data: { status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date() },
  })
  return count.count > 0
}

export async function rejectOtRequest(
  tenantId: string,
  id: string,
  reviewerId: string,
  reject_note?: string,
) {
  const count = await prisma.otRequest.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), status: 'PENDING' },
    data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date(), reject_note },
  })
  return count.count > 0
}
