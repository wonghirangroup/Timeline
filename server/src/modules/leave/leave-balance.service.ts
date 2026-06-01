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

type LeaveTypeEnum = 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE'

export async function upsertLeaveBalance(
  tenantId: string,
  data: { employee_id: string; leave_type: LeaveTypeEnum; year: number; total_days: number },
) {
  return prisma.leaveBalance.upsert({
    where: { employee_id_leave_type_year: { employee_id: data.employee_id, leave_type: data.leave_type, year: data.year } },
    update: { total_days: data.total_days },
    create: { tenant_id: tenantId, employee_id: data.employee_id, leave_type: data.leave_type, year: data.year, total_days: data.total_days },
  })
}

// batch upsert — ใช้สำหรับ apply default / seniority ให้หลายคนพร้อมกัน
export async function batchUpsertLeaveBalances(
  tenantId: string,
  items: { employee_id: string; leave_type: LeaveTypeEnum; year: number; total_days: number }[],
) {
  await Promise.all(items.map(item => upsertLeaveBalance(tenantId, item)))
  return { count: items.length }
}

// ดึงพนักงานทุกคนพร้อม balance ทุก type รวมเป็น 1 record ต่อพนักงาน
export async function listEmployeesWithBalances(tenantId: string, year: number) {
  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, deleted_at: null, is_active: true },
    include: {
      branch: { select: { id: true, name: true } },
      leave_balances: { where: { year } },
    },
    orderBy: [{ branch_id: 'asc' }, { first_name: 'asc' }],
  })

  return employees.map(emp => {
    const bal = (type: LeaveTypeEnum) => {
      const b = emp.leave_balances.find(lb => lb.leave_type === type)
      return { total: b?.total_days ?? 0, used: b?.used_days ?? 0 }
    }
    return {
      employee_id:   emp.id,
      employee_code: emp.employee_code,
      full_name:     `${emp.first_name} ${emp.last_name}`,
      nickname:      emp.nickname ?? emp.first_name,
      branch_id:     emp.branch_id,
      branch_name:   emp.branch.name,
      hired_at:      emp.hired_at,
      sick:          bal('SICK'),
      personal:      bal('PERSONAL'),
      vacation:      bal('VACATION'),
      maternity:     bal('MATERNITY'),
      compensate:    bal('COMPENSATE'),
    }
  })
}
