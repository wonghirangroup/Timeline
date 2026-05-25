// server/src/modules/leave/leave.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listLeaveRequests(tenantId: string, filters: {
  employeeId?: string
  status?: string
  branchId?: string
}) {
  return prisma.leaveRequest.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.branchId ? { employee: { branch_id: filters.branchId } } : {}),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true, branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: { created_at: 'desc' },
  })
}

export async function getLeaveRequest(tenantId: string, id: string) {
  return prisma.leaveRequest.findFirst({
    where: { id, tenant_id: tenantId },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true },
      },
    },
  })
}

export async function createLeaveRequest(
  tenantId: string,
  data: {
    employee_id: string
    leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
    start_date: string
    end_date: string
    days: number
    reason?: string
  },
) {
  // ตรวจสอบ leave balance
  const balance = await prisma.leaveBalance.findFirst({
    where: {
      employee_id: data.employee_id,
      leave_type: data.leave_type,
      year: new Date().getFullYear(),
      tenant_id: tenantId,
    },
  })

  if (balance && (balance.used_days + data.days) > balance.total_days) {
    throw new Error('INSUFFICIENT_BALANCE')
  }

  return prisma.leaveRequest.create({
    data: {
      tenant_id: tenantId,
      employee_id: data.employee_id,
      leave_type: data.leave_type,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      days: data.days,
      reason: data.reason,
    },
  })
}

export async function approveLeaveRequest(tenantId: string, id: string, reviewerId: string) {
  const req = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: tenantId, status: 'PENDING' },
  })
  if (!req) return null

  // หักวันลา
  await prisma.leaveBalance.updateMany({
    where: {
      employee_id: req.employee_id,
      leave_type: req.leave_type,
      year: new Date(req.start_date).getFullYear(),
    },
    data: { used_days: { increment: req.days } },
  })

  return prisma.leaveRequest.update({
    where: { id },
    data: { status: 'APPROVED', reviewed_by: reviewerId, reviewed_at: new Date() },
  })
}

export async function rejectLeaveRequest(
  tenantId: string,
  id: string,
  reviewerId: string,
  reject_note?: string,
) {
  const count = await prisma.leaveRequest.updateMany({
    where: { id, tenant_id: tenantId, status: 'PENDING' },
    data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date(), reject_note },
  })
  return count.count > 0
}
