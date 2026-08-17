// server/src/modules/shift-assignment/shift-assignment.service.ts
import { prisma } from '../../common/utils/prisma'

export type ShiftAssignmentTypeValue = 'WORK' | 'DAY_OFF' | 'WEEKLY_OFF' | 'HOLIDAY'

export async function listShiftAssignments(tenantId: string, filters: {
  branchId?: string
  month?: string // YYYY-MM
}) {
  const where: any = { tenant_id: tenantId }

  if (filters.month) {
    const [y, m] = filters.month.split('-').map(Number)
    where.date = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0)),
    }
  }
  if (filters.branchId) {
    where.employee = { branch_id: filters.branchId }
  }

  return prisma.shiftAssignment.findMany({ where, orderBy: { date: 'asc' } })
}

export async function upsertShiftAssignment(tenantId: string, data: {
  employee_id: string
  date: string // YYYY-MM-DD
  shift_id: string | null
  type: ShiftAssignmentTypeValue
  note?: string
  created_by?: string
}) {
  // เช็คว่า employee เป็นของ tenant นี้จริง ก่อน upsert (upsert ใช้ unique key
  // employee_id+date ล้วนๆ ไม่มี tenant_id ให้กรองใน where ของ upsert เอง)
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
  })
  if (!employee) return null

  const date = new Date(`${data.date}T00:00:00Z`)

  return prisma.shiftAssignment.upsert({
    where: { employee_id_date: { employee_id: data.employee_id, date } },
    update: {
      shift_id:   data.shift_id,
      type:       data.type,
      note:       data.note,
      created_by: data.created_by,
    },
    create: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      date,
      shift_id:    data.shift_id,
      type:        data.type,
      note:        data.note,
      created_by:  data.created_by,
    },
  })
}

export async function deleteShiftAssignment(tenantId: string, employeeId: string, dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00Z`)
  const count = await prisma.shiftAssignment.deleteMany({
    where: { tenant_id: tenantId, employee_id: employeeId, date },
  })
  return count.count > 0
}
