// server/src/modules/offsite/offsite.service.ts
import { prisma } from '../../common/utils/prisma'
import { reverseGeocode } from '../../common/utils/geocode'
import { employeeBranchWhere } from '../employee/employee.service'

// scopedEmployeeIds: undefined = ไม่ scope, array = DEPT_HEAD จำกัดแค่คนในแผนกที่ดูแล
export async function listOffsiteCheckins(tenantId: string, filters: {
  employeeId?: string
  branchId?: string
  activeOnly?: boolean // true = เฉพาะรายการที่ยังไม่เช็คเอาต์ (กำลังนอกสถานที่ตอนนี้)
  scopedEmployeeIds?: string[]
}) {
  const employeeFilter = filters.scopedEmployeeIds
    ? (filters.employeeId
        ? (filters.scopedEmployeeIds.includes(filters.employeeId) ? { employee_id: filters.employeeId } : { employee_id: '__none__' })
        : { employee_id: { in: filters.scopedEmployeeIds } })
    : (filters.employeeId ? { employee_id: filters.employeeId } : {})

  return prisma.offsiteCheckin.findMany({
    where: {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...employeeFilter,
      ...(filters.branchId   ? { employee: employeeBranchWhere(filters.branchId) } : {}),
      ...(filters.activeOnly ? { check_out_at: null } : {}),
    },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, employee_code: true,
          branch: { select: { id: true, name: true } } },
      },
    },
    orderBy: { check_in_at: 'desc' },
  })
}

export async function createOffsiteCheckin(
  tenantId: string,
  data: { employee_id: string; lat: number; lng: number; note?: string },
) {
  // สิทธิ์เช็คอินนอกสถานที่ — ตั้งรายบุคคลเท่านั้น (feedback 2026-09-15: "ใช้ได้
  // สำหรับคนที่มีสิทธิเท่านั้น") default false ต้องแอดมินเปิดให้ทีละคนก่อน
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
    select: { offsite_checkin_enabled: true },
  })
  if (!employee?.offsite_checkin_enabled) throw new Error('NOT_ALLOWED')

  const open = await prisma.offsiteCheckin.findFirst({
    where: { tenant_id: tenantId, employee_id: data.employee_id, check_out_at: null },
  })
  if (open) throw new Error('ALREADY_CHECKED_IN')

  const address = await reverseGeocode(data.lat, data.lng)

  return prisma.offsiteCheckin.create({
    data: {
      tenant_id:        tenantId,
      employee_id:      data.employee_id,
      check_in_lat:     data.lat,
      check_in_lng:     data.lng,
      check_in_address: address,
      note:             data.note,
    },
  })
}

const OFFSITE_INCLUDE = {
  employee: {
    select: { id: true, first_name: true, last_name: true, employee_code: true,
      branch: { select: { id: true, name: true } } },
  },
} as const

// รับ date (YYYY-MM-DD) + time (HH:mm) แยกกันแล้วประกอบเป็น UTC ตามเวลาไทย +7
// เสมอ — ไม่ใช้ new Date(fullString) ตรงๆ เพราะจะโดน timezone ของ server ตีความ
// ผิด (ดู attendance.service.ts buildDateTime ซึ่งใช้ pattern เดียวกันนี้)
function buildBangkokDateTime(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m]     = timeStr.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m, 0, 0))
}

// ── Admin: เพิ่มรายการเช็คอินนอกสถานที่ด้วยมือ (feedback 2026-09-23 —
// เดิมแอดมินดูได้อย่างเดียว บันทึกย้อนหลัง/แทนพนักงานที่ลืมเช็คอินไม่ได้)
// ไม่มี GPS จริง — ผู้ดูแลพิมพ์ที่อยู่/เวลาเอง ไม่ผ่าน reverse geocode
export async function createOffsiteCheckinByAdmin(tenantId: string, data: {
  employee_id: string
  check_in_date: string
  check_in_time: string
  check_in_address?: string
  check_out_date?: string
  check_out_time?: string
  check_out_address?: string
  note?: string
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
    select: { id: true },
  })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  return prisma.offsiteCheckin.create({
    data: {
      tenant_id:         tenantId,
      employee_id:       data.employee_id,
      check_in_at:       buildBangkokDateTime(data.check_in_date, data.check_in_time),
      check_in_address:  data.check_in_address || null,
      check_out_at:      (data.check_out_date && data.check_out_time) ? buildBangkokDateTime(data.check_out_date, data.check_out_time) : null,
      check_out_address: data.check_out_address || null,
      note:              data.note || null,
    },
    include: OFFSITE_INCLUDE,
  })
}

// ── Admin: แก้ไขรายการเช็คอินนอกสถานที่ (เวลา/ที่อยู่/หมายเหตุ) ────────────
export async function updateOffsiteCheckin(tenantId: string, id: string, data: {
  check_in_date?: string
  check_in_time?: string
  check_in_address?: string
  check_out_date?: string | null
  check_out_time?: string | null
  check_out_address?: string
  note?: string
}) {
  const existing = await prisma.offsiteCheckin.findFirst({ where: { id, tenant_id: tenantId } })
  if (!existing) return null

  // ล้างเวลาเช็คเอาต์ = ส่ง check_out_date/check_out_time เป็น null ทั้งคู่
  const clearingCheckOut = data.check_out_date === null && data.check_out_time === null
  const settingCheckOut  = !!data.check_out_date && !!data.check_out_time

  return prisma.offsiteCheckin.update({
    where: { id },
    data: {
      ...(data.check_in_date && data.check_in_time ? { check_in_at: buildBangkokDateTime(data.check_in_date, data.check_in_time) } : {}),
      ...(data.check_in_address !== undefined  ? { check_in_address: data.check_in_address || null } : {}),
      ...(settingCheckOut  ? { check_out_at: buildBangkokDateTime(data.check_out_date!, data.check_out_time!) } : {}),
      ...(clearingCheckOut ? { check_out_at: null, check_out_lat: null, check_out_lng: null } : {}),
      ...(data.check_out_address !== undefined ? { check_out_address: data.check_out_address || null } : {}),
      ...(data.note !== undefined              ? { note: data.note || null } : {}),
    },
    include: OFFSITE_INCLUDE,
  })
}

// ── Admin: ลบรายการเช็คอินนอกสถานที่ ──────────────────────────────────────
export async function deleteOffsiteCheckin(tenantId: string, id: string): Promise<boolean> {
  const result = await prisma.offsiteCheckin.deleteMany({ where: { id, tenant_id: tenantId } })
  return result.count > 0
}

export async function checkOutOffsiteCheckin(
  tenantId: string,
  id: string,
  employeeId: string,
  data: { lat: number; lng: number },
) {
  const address = await reverseGeocode(data.lat, data.lng)

  // updateMany + count กันแข่ง (race) เช็คเอาต์ซ้ำสองครั้งพร้อมกัน — atomic ที่ระดับ DB
  const count = await prisma.offsiteCheckin.updateMany({
    where: { id, tenant_id: tenantId, employee_id: employeeId, check_out_at: null },
    data: {
      check_out_at:      new Date(),
      check_out_lat:     data.lat,
      check_out_lng:     data.lng,
      check_out_address: address,
    },
  })
  if (count.count === 0) return null

  return prisma.offsiteCheckin.findUnique({ where: { id } })
}
