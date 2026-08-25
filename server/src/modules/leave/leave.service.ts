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
        select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch: { select: { id: true, name: true } } },
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
        select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true },
      },
    },
  })
}

// ตำแหน่งเดียวกัน + ช่วงวันที่ทับซ้อนกันไหม (PENDING/APPROVED) — ไม่บล็อคการขอ แค่คืนค่า
// ไว้ set has_conflict ให้แอดมินเห็นตอนอนุมัติ (แบบเดียวกับ weekly-off.service.ts)
async function hasPositionConflict(
  tenantId: string, employeeId: string, positionId: string | null, startDate: Date, endDate: Date,
): Promise<boolean> {
  if (!positionId) return false
  const conflict = await prisma.leaveRequest.findFirst({
    where: {
      tenant_id: tenantId,
      employee_id: { not: employeeId },
      status: { in: ['PENDING', 'APPROVED'] },
      start_date: { lte: endDate },
      end_date: { gte: startDate },
      employee: { position_id: positionId },
    },
  })
  return !!conflict
}

export async function createLeaveRequest(
  tenantId: string,
  data: {
    employee_id: string
    leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE'
    start_date: string
    end_date: string
    days: number
    reason?: string
  },
) {
  // ตรวจสอบวันลาทับซ้อน (PENDING หรือ APPROVED)
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      tenant_id:   tenantId,
      employee_id: data.employee_id,
      status:      { in: ['PENDING', 'APPROVED'] },
      start_date:  { lte: new Date(data.end_date) },
      end_date:    { gte: new Date(data.start_date) },
    },
  })
  if (overlap) throw new Error('LEAVE_OVERLAP')

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

  const employee = await prisma.employee.findFirst({ where: { id: data.employee_id, tenant_id: tenantId }, select: { position_id: true } })
  const startDate = new Date(data.start_date), endDate = new Date(data.end_date)
  const conflict = await hasPositionConflict(tenantId, data.employee_id, employee?.position_id ?? null, startDate, endDate)

  const created = await prisma.leaveRequest.create({
    data: {
      tenant_id: tenantId,
      employee_id: data.employee_id,
      leave_type: data.leave_type,
      start_date: startDate,
      end_date: endDate,
      days: data.days,
      reason: data.reason,
      has_conflict: conflict,
    },
  })

  if (conflict && employee?.position_id) {
    // แก้ record ของคนอื่นที่ชนกันให้ flag ด้วย เพื่อให้แอดมินเห็นทั้งสองฝั่ง
    await prisma.leaveRequest.updateMany({
      where: {
        tenant_id: tenantId,
        employee_id: { not: data.employee_id },
        status: { in: ['PENDING', 'APPROVED'] },
        start_date: { lte: endDate },
        end_date: { gte: startDate },
        employee: { position_id: employee.position_id },
      },
      data: { has_conflict: true },
    })
  }

  return created
}

// พนักงานตำแหน่ง/สาขาเดียวกันที่ลาทับช่วงเดือนนี้ — ใช้แสดงจุดสีบนปฏิทินหน้าจองวันหยุด
// (โหมดพักร้อน/ชดเชย) แบบเดียวกับ colleagues ของวันหยุดประจำ
export async function getMonthColleagueLeaves(tenantId: string, employeeId: string, month: string) {
  const [y, m] = month.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(y, m - 1, 1))
  const endOfMonth   = new Date(Date.UTC(y, m, 0, 23, 59, 59))

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId },
    select: { branch_id: true, position_id: true },
  })

  const requests = await prisma.leaveRequest.findMany({
    where: {
      tenant_id: tenantId,
      employee_id: { not: employeeId },
      status: { in: ['PENDING', 'APPROVED'] },
      start_date: { lte: endOfMonth },
      end_date: { gte: startOfMonth },
      employee: { branch_id: employee?.branch_id ?? undefined },
    },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, position_id: true } },
    },
    orderBy: { start_date: 'asc' },
  })

  return requests.map(r => ({
    ...r,
    same_position: !!employee?.position_id && r.employee.position_id === employee.position_id,
  }))
}

export async function approveLeaveRequest(tenantId: string, id: string, reviewerId: string) {
  const req = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: tenantId, status: 'PENDING' },
  })
  if (!req) return null

  // หักวันลา
  await prisma.leaveBalance.updateMany({
    where: {
      tenant_id: tenantId,
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

export async function updateLeaveRequest(
  tenantId: string,
  id: string,
  data: {
    leave_type?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
    start_date?: string
    end_date?: string
    days?: number
    reason?: string
  },
) {
  const req = await prisma.leaveRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return null

  // ตรวจสอบวันลาทับซ้อน (ยกเว้นตัวเอง)
  if (data.start_date || data.end_date) {
    const start = data.start_date ? new Date(data.start_date) : req.start_date
    const end   = data.end_date   ? new Date(data.end_date)   : req.end_date
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        tenant_id:   tenantId,
        employee_id: req.employee_id,
        id:          { not: id },
        status:      { in: ['PENDING', 'APPROVED'] },
        start_date:  { lte: end },
        end_date:    { gte: start },
      },
    })
    if (overlap) throw new Error('LEAVE_OVERLAP')
  }

  return prisma.leaveRequest.update({
    where: { id },
    data: {
      ...(data.leave_type  ? { leave_type:  data.leave_type }            : {}),
      ...(data.start_date  ? { start_date:  new Date(data.start_date) }  : {}),
      ...(data.end_date    ? { end_date:    new Date(data.end_date) }     : {}),
      ...(data.days        ? { days:        data.days }                   : {}),
      ...(data.reason !== undefined ? { reason: data.reason || null }     : {}),
    },
  })
}

export async function deleteLeaveRequest(tenantId: string, id: string) {
  const req = await prisma.leaveRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return null

  // ถ้าเคย APPROVED → คืนวันลากลับ
  if (req.status === 'APPROVED') {
    await prisma.leaveBalance.updateMany({
      where: { tenant_id: tenantId, employee_id: req.employee_id, leave_type: req.leave_type, year: new Date(req.start_date).getFullYear() },
      data:  { used_days: { decrement: req.days } },
    })
  }

  await prisma.leaveRequest.delete({ where: { id } })
  return true
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
