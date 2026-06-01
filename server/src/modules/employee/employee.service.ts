// server/src/modules/employee/employee.service.ts
import { prisma } from '../../common/utils/prisma'

async function generateEmployeeCode(
  tenantId: string,
  hiredAt: string | undefined,
  department: string | undefined,
): Promise<string> {
  // BE year (พ.ศ.) 2 หลักท้าย เช่น 2568 → "68"
  const date   = hiredAt ? new Date(hiredAt) : new Date()
  const year   = date.getFullYear()
  // ถ้าปีเกิน 2500 = user ส่ง พ.ศ. มาตรง ไม่ต้องบวก 543 อีก
  const beYear = year > 2500 ? year : year + 543
  const beYY   = String(beYear).slice(-2)

  // รหัสแผนก = 2 ตัวแรกของ department เช่น "01 ผู้บริหาร" → "01"
  const deptCode = department ? department.slice(0, 2).trim() : '00'

  const prefix = `${beYY}-${deptCode}-`

  // นับพนักงานที่มี prefix เดียวกันใน tenant นี้ (ไม่รวม deleted)
  const count = await prisma.employee.count({
    where: { tenant_id: tenantId, employee_code: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(3, '0')}`
}

export async function listEmployees(tenantId: string, branchId?: string) {
  return prisma.employee.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function getEmployee(tenantId: string, id: string) {
  return prisma.employee.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: { branch: { select: { id: true, name: true } } },
  })
}

export async function createEmployee(
  tenantId: string,
  data: {
    branch_id: string
    first_name: string
    last_name: string
    nickname?: string
    department?: string
    phone?: string
    hired_at?: string
  },
) {
  const employee_code = await generateEmployeeCode(tenantId, data.hired_at, data.department)
  return prisma.employee.create({
    data: {
      tenant_id: tenantId,
      employee_code,
      branch_id: data.branch_id,
      first_name: data.first_name,
      last_name: data.last_name,
      nickname: data.nickname,
      department: data.department,
      phone: data.phone,
      hired_at: data.hired_at ? new Date(data.hired_at) : undefined,
    },
  })
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  data: {
    branch_id?: string
    first_name?: string
    last_name?: string
    nickname?: string | null
    department?: string | null
    phone?: string | null
    hired_at?: string | null
    line_user_id?: string | null
    is_active?: boolean
  },
) {
  const { hired_at, ...rest } = data
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: {
      ...rest,
      ...(hired_at !== undefined ? { hired_at: hired_at ? new Date(hired_at) : null } : {}),
    },
  })
  if (count.count === 0) return null
  return prisma.employee.findFirst({ where: { id } })
}

export async function deleteEmployee(tenantId: string, id: string) {
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
