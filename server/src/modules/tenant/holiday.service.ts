// server/src/modules/tenant/holiday.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listHolidays(tenantId: string, year?: number) {
  const y = year ?? new Date().getFullYear()
  return prisma.holiday.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      date: {
        gte: new Date(`${y}-01-01`),
        lte: new Date(`${y}-12-31`),
      },
    },
    orderBy: { date: 'asc' },
  })
}

export async function createHoliday(
  tenantId: string,
  data: {
    name: string; date: string; type?: string; recurring?: boolean
    target_branches?: string[]; target_departments?: string[]
    employee_includes?: string[]; employee_excludes?: string[]; compensate_days?: number
  },
) {
  return prisma.holiday.create({
    data: {
      tenant_id:          tenantId,
      name:               data.name,
      date:               new Date(data.date),
      type:               (data.type as any) ?? 'NATIONAL',
      recurring:          data.recurring ?? false,
      target_branches:    data.target_branches?.length ? data.target_branches : undefined,
      target_departments: data.target_departments?.length ? data.target_departments : undefined,
      employee_includes:  data.employee_includes?.length ? data.employee_includes : undefined,
      employee_excludes:  data.employee_excludes?.length ? data.employee_excludes : undefined,
      compensate_days:    data.compensate_days ?? 1,
    },
  })
}

export async function updateHoliday(
  tenantId: string,
  id: string,
  data: {
    name?: string; date?: string; type?: string; recurring?: boolean
    target_branches?: string[] | null; target_departments?: string[] | null
    employee_includes?: string[] | null; employee_excludes?: string[] | null; compensate_days?: number
  },
) {
  const count = await prisma.holiday.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(data.name      ? { name: data.name }                      : {}),
      ...(data.date      ? { date: new Date(data.date) }            : {}),
      ...(data.type      ? { type: data.type as any }               : {}),
      ...(data.recurring !== undefined ? { recurring: data.recurring } : {}),
      ...(data.target_branches    !== undefined ? { target_branches:    (data.target_branches?.length    ? data.target_branches    : null) as any } : {}),
      ...(data.target_departments !== undefined ? { target_departments: (data.target_departments?.length ? data.target_departments : null) as any } : {}),
      ...(data.employee_includes  !== undefined ? { employee_includes:  (data.employee_includes?.length  ? data.employee_includes  : null) as any } : {}),
      ...(data.employee_excludes  !== undefined ? { employee_excludes:  (data.employee_excludes?.length  ? data.employee_excludes  : null) as any } : {}),
      ...(data.compensate_days    !== undefined ? { compensate_days: data.compensate_days } : {}),
    },
  })
  return count.count > 0
}

export async function batchCreateHolidays(
  tenantId: string,
  items: { name: string; date: string; type?: string; recurring?: boolean; target_branches?: string[]; target_departments?: string[] }[],
) {
  // หักวันซ้ำออก
  const existing = await prisma.holiday.findMany({
    where: { tenant_id: tenantId },
    select: { date: true },
  })
  const existDates = new Set(existing.map(h => h.date.toISOString().slice(0, 10)))
  const toCreate = items.filter(i => !existDates.has(i.date))

  if (toCreate.length === 0) return { count: 0 }

  await prisma.holiday.createMany({
    data: toCreate.map(i => ({
      tenant_id:          tenantId,
      name:               i.name,
      date:               new Date(i.date),
      type:               (i.type as any) ?? 'NATIONAL',
      recurring:          i.recurring ?? false,
      target_branches:    i.target_branches?.length ? i.target_branches : undefined,
      target_departments: i.target_departments?.length ? i.target_departments : undefined,
    })),
  })
  return { count: toCreate.length }
}

// เช็คว่า holiday นี้ใช้กับพนักงานคนนี้ไหม (null/[] ใน target = ใช้กับทุกคน)
// department เก็บไม่ตรงกันระหว่างสร้างผ่าน Admin UI ("03 พนักงานขาย") กับ migrate
// จาก Firebase (แค่ "03") — match ด้วยรหัส 2 ตัวแรกเสมอ (แบบเดียวกับ
// bulkSetWeeklyOffMode ใน employee.service.ts)
//
// ลำดับความสำคัญ: employee_excludes ชนะทุกอย่าง (คนนี้ไม่ได้หยุดแน่ๆ แม้
// branch/dept จะครอบคลุม) > employee_includes (คนนี้ได้หยุดแน่ๆ แม้ branch/
// dept จะไม่ครอบคลุม) > branch/dept targeting ปกติ
// รองรับ 2 เคสจาก requirement: "แผนกเดียวกัน สาขาเดียวกัน แต่คนนี้ได้หยุด
// อีกคนไม่ได้"
export function holidayAppliesTo(
  holiday: { target_branches: unknown; target_departments: unknown; employee_includes?: unknown; employee_excludes?: unknown },
  employee: { id?: string; branch_id: string; department: string | null },
): boolean {
  const excludes = (holiday.employee_excludes as string[] | null) ?? []
  if (employee.id && excludes.includes(employee.id)) return false

  const includes = (holiday.employee_includes as string[] | null) ?? []
  if (employee.id && includes.includes(employee.id)) return true

  const branches    = (holiday.target_branches    as string[] | null) ?? []
  const departments = (holiday.target_departments as string[] | null) ?? []
  const branchOk = branches.length === 0 || branches.includes(employee.branch_id)
  const empDeptCode = employee.department?.slice(0, 2).trim() ?? ''
  const deptOk = departments.length === 0 || departments.some(d => d.slice(0, 2).trim() === empDeptCode)
  return branchOk && deptOk
}

// เช็ควันนี้เป็นวันหยุดที่ apply กับพนักงานคนนี้ไหม — ใช้ตอนเช็คอิน (ให้วันชดเชย
// อัตโนมัติถ้ามาทำงาน) และตอนโชว์ Alert ให้แอดมิน
export async function findApplicableHolidayToday(tenantId: string, employee: { id: string; branch_id: string; department: string | null }, date: Date) {
  const dateStr = date.toISOString().slice(0, 10)
  const holidays = await prisma.holiday.findMany({
    where: { tenant_id: tenantId, date: new Date(`${dateStr}T00:00:00.000Z`) },
  })
  return holidays.find(h => holidayAppliesTo(h, employee)) ?? null
}

// ให้วันชดเชย (COMPENSATE) อัตโนมัติเมื่อมาทำงานในวันหยุดที่ควรหยุด — เพิ่มเข้า
// LeaveBalance.total_days ปีนั้นตรงๆ (ไม่ผ่านคำขอลา เพราะเป็น "ได้สิทธิ์" ไม่ใช่ "ขอลา")
export async function grantHolidayCompensation(tenantId: string, employeeId: string, compensateDays: number, year: number) {
  await prisma.leaveBalance.upsert({
    where: { employee_id_leave_type_year: { employee_id: employeeId, leave_type: 'COMPENSATE', year } },
    update: { total_days: { increment: compensateDays } },
    create: { tenant_id: tenantId, employee_id: employeeId, leave_type: 'COMPENSATE', year, total_days: compensateDays },
  })
}

// Alert: ใครทำงานในวันหยุดนักขัตฤกษ์บ้าง (ล่าสุดก่อน) — ให้แอดมินเห็นในหน้าจัดการวันหยุด
export async function listHolidayWorkedAlerts(tenantId: string, limit = 50) {
  const records = await prisma.attendanceRecord.findMany({
    where: { tenant_id: tenantId, worked_on_holiday: true },
    include: {
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch: { select: { id: true, name: true } } } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })
  return records
}

export async function deleteHoliday(tenantId: string, id: string) {
  const count = await prisma.holiday.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
