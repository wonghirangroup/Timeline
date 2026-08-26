// server/src/modules/offsite/offsite.service.ts
import { prisma } from '../../common/utils/prisma'
import { reverseGeocode } from '../../common/utils/geocode'

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
      ...(filters.branchId   ? { employee: { branch_id: filters.branchId } } : {}),
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
