// server/src/modules/dashboard/dashboard.service.ts
import { prisma } from '../../common/utils/prisma'

// สรุป KPI ตามช่วงวันที่ที่เลือก (Dashboard requirement 2026-08-26): มาสายกี่คน+
// ใครบ้าง, ลาออกกี่คน, เข้าใหม่กี่คน + จำนวนพนักงานทั้งหมดไว้ให้ frontend คำนวณ %
// เอง (มุมมองปี) — scopedEmployeeIds: undefined = ไม่ scope, array = DEPT_HEAD
export async function getDashboardSummary(tenantId: string, filters: {
  startDate: string
  endDate: string
  branchId?: string
  scopedEmployeeIds?: string[]
}) {
  const start = new Date(`${filters.startDate}T00:00:00.000Z`)
  const end   = new Date(`${filters.endDate}T23:59:59.999Z`)

  const employeeScope: any = { tenant_id: tenantId, deleted_at: null }
  if (filters.branchId) employeeScope.branch_id = filters.branchId
  if (filters.scopedEmployeeIds) employeeScope.id = { in: filters.scopedEmployeeIds }

  const totalEmployees = await prisma.employee.count({ where: employeeScope })

  // ── มาสาย: นับรายคน (กี่ครั้งในช่วงนี้) แล้วเรียงคนที่สายบ่อยสุดก่อน ──────────
  const lateRecords = await prisma.attendanceRecord.findMany({
    where: {
      tenant_id: tenantId,
      is_late: true,
      date: { gte: start, lte: end },
      ...(filters.branchId ? { employee: { branch_id: filters.branchId } } : {}),
      ...(filters.scopedEmployeeIds ? { employee_id: { in: filters.scopedEmployeeIds } } : {}),
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch: { select: { id: true, name: true } } } },
    },
  })
  const lateByEmployee = new Map<string, { employee: (typeof lateRecords)[number]['employee']; count: number }>()
  for (const r of lateRecords) {
    const cur = lateByEmployee.get(r.employee_id)
    if (cur) cur.count += 1
    else lateByEmployee.set(r.employee_id, { employee: r.employee, count: 1 })
  }
  const lateList = [...lateByEmployee.values()].sort((a, b) => b.count - a.count)

  // ── ลาออก/เลิกจ้าง: จาก EmployeeStatusLog (dedupe รายคน เอาครั้งล่าสุดในช่วงนี้) ──
  const resignLogs = await prisma.employeeStatusLog.findMany({
    where: {
      tenant_id: tenantId,
      to_status: { in: ['RESIGNED', 'TERMINATED'] },
      created_at: { gte: start, lte: end },
      ...(filters.scopedEmployeeIds ? { employee_id: { in: filters.scopedEmployeeIds } } : {}),
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch_id: true, branch: { select: { id: true, name: true } } } },
    },
    orderBy: { created_at: 'desc' },
  })
  const resignedByEmployee = new Map<string, (typeof resignLogs)[number]['employee']>()
  for (const log of resignLogs) {
    if (filters.branchId && log.employee.branch_id !== filters.branchId) continue
    if (!resignedByEmployee.has(log.employee_id)) resignedByEmployee.set(log.employee_id, log.employee)
  }
  const resignedList = [...resignedByEmployee.values()]

  // ── เข้าใหม่: hired_at อยู่ในช่วงนี้ ────────────────────────────────────────
  const newHires = await prisma.employee.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      hired_at: { gte: start, lte: end },
      ...(filters.branchId ? { branch_id: filters.branchId } : {}),
      ...(filters.scopedEmployeeIds ? { id: { in: filters.scopedEmployeeIds } } : {}),
    },
    select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, hired_at: true, branch: { select: { id: true, name: true } } },
    orderBy: { hired_at: 'desc' },
  })

  return {
    totalEmployees,
    late:     { count: lateList.length, employees: lateList.map(x => ({ ...x.employee, late_count: x.count })) },
    resigned: { count: resignedList.length, employees: resignedList },
    newHires: { count: newHires.length, employees: newHires },
  }
}
