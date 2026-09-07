// server/src/modules/leave/leave.service.ts
import { prisma } from '../../common/utils/prisma'
import { resolveLeaveEnabled } from '../group/group.service'

type LeavePeriod = 'FULL' | 'MORNING' | 'AFTERNOON' | 'CUSTOM'
const DEFAULT_WORKDAY_HOURS = 8 // fallback เมื่อพนักงานไม่มีกะผูกไว้

// leave_enabled cascade ปิด = บล็อกได้เฉพาะการลาแบบ "ดุลพินิจ" — ลาป่วย/ลาคลอดยังยื่นได้เสมอ
// (สิทธิ์ตามกฎหมาย/สวัสดิการ ไม่ควรถูกปิดโดยนโยบายจัดกำลังคน — decision จาก user 2026-09-07)
const LEAVE_TYPES_ALWAYS_ALLOWED = new Set(['SICK', 'MATERNITY'])

const toMin = (t?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? '')
  return m ? +m[1] * 60 + +m[2] : NaN
}

// ชั่วโมงทำงานต่อวันของพนักงาน — อ่านจากกะจริง (default_shift ก่อน แล้ว employee_shifts)
// span กะ ≥ 7 ชม. ถือว่ามีพักเที่ยง 1 ชม. → หักออก; ไม่มีกะ → 8
async function getEmployeeWorkdayHours(tenantId: string, employeeId: string): Promise<number> {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId },
    select: {
      default_shift: { select: { start_time: true, end_time: true } },
      employee_shifts: { select: { shift: { select: { start_time: true, end_time: true } } }, take: 1 },
    },
  })
  const shift = emp?.default_shift ?? emp?.employee_shifts[0]?.shift
  if (!shift) return DEFAULT_WORKDAY_HOURS
  let span = (toMin(shift.end_time) - toMin(shift.start_time)) / 60
  if (!Number.isFinite(span) || span <= 0) return DEFAULT_WORKDAY_HOURS
  if (span >= 7) span -= 1 // พักเที่ยง
  return Math.max(1, span)
}

// คำนวณจำนวนวันที่ต้องหักโควต้าจาก leave_period
//  FULL      → ใช้ค่า fallbackDays ที่ client ส่งมา (นับจากช่วงวันที่)
//  MORNING/AFTERNOON → 0.5 (บังคับลา 1 วัน)
//  CUSTOM    → (end_time - start_time) / ชม.ทำงานต่อวัน ปัดเป็นทวีคูณ 0.5 ขั้นต่ำ 0.5
function resolveLeaveDays(period: LeavePeriod, fallbackDays: number, startTime?: string | null, endTime?: string | null, workdayHours = DEFAULT_WORKDAY_HOURS): number {
  if (period === 'MORNING' || period === 'AFTERNOON') return 0.5
  if (period === 'CUSTOM') {
    const mins = toMin(endTime) - toMin(startTime)
    if (!Number.isFinite(mins) || mins <= 0) throw new Error('INVALID_TIME_RANGE')
    return Math.max(0.5, Math.round((mins / 60 / workdayHours) * 2) / 2)
  }
  return fallbackDays
}

// scopedEmployeeIds: undefined = ไม่ scope, array = DEPT_HEAD จำกัดแค่คนในแผนกที่ดูแล
export async function listLeaveRequests(tenantId: string, filters: {
  employeeId?: string
  status?: string
  branchId?: string
  scopedEmployeeIds?: string[]
}) {
  // ถ้าระบุ employeeId เจาะจงมาด้วย ต้องอยู่ใน scope ด้วย (กัน DEPT_HEAD เห็นคนนอกแผนก
  // ผ่านการระบุ employeeId ตรงๆ)
  const employeeFilter = filters.scopedEmployeeIds
    ? (filters.employeeId
        ? (filters.scopedEmployeeIds.includes(filters.employeeId) ? { employee_id: filters.employeeId } : { employee_id: '__none__' })
        : { employee_id: { in: filters.scopedEmployeeIds } })
    : (filters.employeeId ? { employee_id: filters.employeeId } : {})

  return prisma.leaveRequest.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...employeeFilter,
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

// autoApprove: true เฉพาะตอนแอดมิน/หัวหน้าแผนกลงวันลาแทนพนักงานเอง (ไม่ต้องรออนุมัติซ้ำ
// เพราะคนลงคือคนอนุมัติอยู่แล้วในตัว) — พนักงานยื่นเองผ่าน LIFF ต้องผ่าน PENDING ปกติเสมอ
// force: แอดมินกด "ยืนยันเพิ่มให้อยู่ดี" ทั้งที่ leave cascade = ปิด (พนักงาน LIFF ยื่นเองส่ง force ไม่ได้ → โดนบล็อก)
export async function createLeaveRequest(
  tenantId: string,
  data: {
    employee_id: string
    leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE'
    start_date: string
    end_date: string
    days: number
    reason?: string
    autoApprove?: boolean
    reviewedBy?: string
    force?: boolean
    leave_period?: LeavePeriod
    start_time?: string | null
    end_time?: string | null
  },
) {
  // gate ด้วย leave cascade (บุคคล→ตำแหน่ง→แผนก→ฝ่าย→สาขา→กลุ่ม) — ดู resolvePolicyFlag()
  // ลาป่วย/ลาคลอด ยื่นได้เสมอแม้ cascade ปิด
  let leaveOverrideBy: string | null = null
  if (!LEAVE_TYPES_ALWAYS_ALLOWED.has(data.leave_type) && !(await resolveLeaveEnabled(tenantId, data.employee_id))) {
    if (!data.force) throw new Error('LEAVE_DISABLED')
    leaveOverrideBy = data.reviewedBy ?? null
  }

  const period: LeavePeriod = data.leave_period ?? 'FULL'
  // ลาไม่เต็มวันต้องเป็นวันเดียว (start = end)
  if (period !== 'FULL' && data.start_date !== data.end_date) throw new Error('PARTIAL_LEAVE_SINGLE_DAY')
  const workdayHours = period === 'CUSTOM' ? await getEmployeeWorkdayHours(tenantId, data.employee_id) : DEFAULT_WORKDAY_HOURS
  const days = resolveLeaveDays(period, data.days, data.start_time, data.end_time, workdayHours)

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

  if (balance && (balance.used_days + days) > balance.total_days) {
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
      days,
      leave_period: period,
      start_time: period === 'CUSTOM' ? (data.start_time ?? null) : null,
      end_time:   period === 'CUSTOM' ? (data.end_time ?? null)   : null,
      reason: data.reason,
      has_conflict: conflict,
      policy_override_by: leaveOverrideBy,
      ...(data.autoApprove ? { status: 'APPROVED', reviewed_by: data.reviewedBy, reviewed_at: new Date() } : {}),
    },
  })

  // autoApprove ข้ามขั้นตอน approveLeaveRequest() ไปเลย ต้องหักวันลาเองตรงนี้แทน
  // (ปกติ used_days จะถูกหักตอนกด "อนุมัติ" เท่านั้น ไม่ใช่ตอนสร้างคำขอ)
  if (data.autoApprove) {
    await prisma.leaveBalance.updateMany({
      where: { tenant_id: tenantId, employee_id: data.employee_id, leave_type: data.leave_type, year: startDate.getFullYear() },
      data: { used_days: { increment: days } },
    })
  }

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

// scopedEmployeeIds: DEPT_HEAD เท่านั้น — ถ้าเจ้าของคำขอไม่อยู่ในแผนกที่ดูแล findFirst
// จะหาไม่เจอ (คืน null) เป็น 404 ธรรมชาติ ไม่ต้อง check พิเศษเพิ่ม
export async function approveLeaveRequest(tenantId: string, id: string, reviewerId: string, scopedEmployeeIds?: string[]) {
  const req = await prisma.leaveRequest.findFirst({
    where: { id, tenant_id: tenantId, status: 'PENDING', ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}) },
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
    leave_type?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE'
    start_date?: string
    end_date?: string
    days?: number
    reason?: string
    leave_period?: LeavePeriod
    start_time?: string | null
    end_time?: string | null
  },
) {
  const req = await prisma.leaveRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req) return null

  const period = (data.leave_period ?? req.leave_period) as LeavePeriod
  const sd = data.start_date ?? req.start_date.toISOString().slice(0, 10)
  const ed = data.end_date ?? req.end_date.toISOString().slice(0, 10)
  if (period !== 'FULL' && sd !== ed) throw new Error('PARTIAL_LEAVE_SINGLE_DAY')
  // recompute days ถ้าแตะ period/เวลา/วัน — ไม่งั้นคง days เดิม (เว้น client ส่ง days มาตรงๆ สำหรับ FULL)
  const touchesPeriod = data.leave_period !== undefined || data.start_time !== undefined || data.end_time !== undefined
  const st = data.start_time ?? req.start_time
  const et = data.end_time ?? req.end_time
  const workdayHours = touchesPeriod && period === 'CUSTOM' ? await getEmployeeWorkdayHours(tenantId, req.employee_id) : DEFAULT_WORKDAY_HOURS
  const recalcDays = touchesPeriod
    ? resolveLeaveDays(period, data.days ?? req.days, st, et, workdayHours)
    : data.days

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
      ...(recalcDays !== undefined ? { days: recalcDays }                : {}),
      ...(data.leave_period !== undefined ? {
        leave_period: period,
        start_time: period === 'CUSTOM' ? (st ?? null) : null,
        end_time:   period === 'CUSTOM' ? (et ?? null) : null,
      } : {}),
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
  scopedEmployeeIds?: string[],
) {
  const count = await prisma.leaveRequest.updateMany({
    where: { id, tenant_id: tenantId, status: 'PENDING', ...(scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}) },
    data: { status: 'REJECTED', reviewed_by: reviewerId, reviewed_at: new Date(), reject_note },
  })
  return count.count > 0
}
