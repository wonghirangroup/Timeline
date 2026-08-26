// server/src/modules/ot/ot.service.ts
import { prisma } from '../../common/utils/prisma'

// scopedEmployeeIds: undefined = ไม่ scope, array = DEPT_HEAD จำกัดแค่คนในแผนกที่ดูแล
export async function listOtRequests(tenantId: string, filters: {
  employeeId?: string
  status?: string
  branchId?: string
  scopedEmployeeIds?: string[]
}) {
  const employeeFilter = filters.scopedEmployeeIds
    ? (filters.employeeId
        ? (filters.scopedEmployeeIds.includes(filters.employeeId) ? { employee_id: filters.employeeId } : { employee_id: '__none__' })
        : { employee_id: { in: filters.scopedEmployeeIds } })
    : (filters.employeeId ? { employee_id: filters.employeeId } : {})

  return prisma.otRequest.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...employeeFilter,
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

export async function approveOtRequest(tenantId: string, id: string, reviewerId: string, scopedEmployeeIds?: string[]) {
  const count = await prisma.otRequest.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), status: 'PENDING', ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}) },
    data: { status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date() },
  })
  return count.count > 0
}

export async function rejectOtRequest(
  tenantId: string,
  id: string,
  reviewerId: string,
  reject_note?: string,
  scopedEmployeeIds?: string[],
) {
  const count = await prisma.otRequest.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), status: 'PENDING', ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}) },
    data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date(), reject_note },
  })
  return count.count > 0
}
