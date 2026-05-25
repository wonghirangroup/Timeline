// server/src/modules/leave/leave-balance.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listLeaveBalances(tenantId: string, filters: {
  employeeId?: string
  year?: number
}) {
  const year = filters.year ?? new Date().getFullYear()
  return prisma.leaveBalance.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      year,
      ...(filters.employeeId ? { employee_id: filters.employeeId } : {}),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true,
          branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ employee_id: 'asc' }, { leave_type: 'asc' }],
  })
}

export async function upsertLeaveBalance(
  tenantId: string,
  data: {
    employee_id: string
    leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
    year: number
    total_days: number
  },
) {
  return prisma.leaveBalance.upsert({
    where: {
      employee_id_leave_type_year: {
        employee_id: data.employee_id,
        leave_type:  data.leave_type,
        year:        data.year,
      },
    },
    update: { total_days: data.total_days },
    create: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      leave_type:  data.leave_type,
      year:        data.year,
      total_days:  data.total_days,
    },
  })
}
