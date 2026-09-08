// server/src/modules/employee/employee.service.ts
import bcrypt from 'bcryptjs'
import { prisma } from '../../common/utils/prisma'
import { assertPlanCapacity } from '../tenant/tenant.service'
import { generateTempPassword, setUserDepartments } from '../tenant/user.service'

// ตำแหน่งผูก parent ชัดเจนเสมอ: Position → Department → Division → Group (ดู org-structure.service.ts)
const POSITION_INCLUDE = {
  select: {
    id: true, name: true,
    department: {
      select: {
        id: true, name: true,
        division: { select: { id: true, name: true, group: { select: { id: true, name: true } } } },
      },
    },
  },
} as const
const STATUS_TYPE_INCLUDE = {
  select: { id: true, name: true, monthly_off_quota: true, saturday_rule: true, sunday_rule: true, off_on_public_holiday: true },
} as const

async function generateEmployeeCode(
  tenantId: string,
  hiredAt: string | undefined,
  department: string | undefined,
): Promise<string> {
  const date   = hiredAt ? new Date(hiredAt) : new Date()
  const year   = date.getFullYear()
  const beYear = year > 2500 ? year : year + 543
  const beYY   = String(beYear).slice(-2)

  // รหัสแผนก = 2 ตัวแรกของ department เช่น "01 ผู้บริหาร" → "01"
  const deptCode = department ? department.slice(0, 2).trim() : '00'
  const prefix   = `${beYY}-${deptCode}-`

  // หา running number สูงสุดใน prefix นี้ (รวม deleted เพื่อป้องกันซ้ำ)
  const existing = await prisma.employee.findMany({
    where:  { tenant_id: tenantId, employee_code: { startsWith: prefix } },
    select: { employee_code: true },
  })

  const maxSeq = existing.reduce((max, e) => {
    const seq = parseInt(e.employee_code.slice(prefix.length), 10)
    return isNaN(seq) ? max : Math.max(max, seq)
  }, 0)

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

// scopedEmployeeIds: undefined = ไม่ scope (role ปกติ), array = จำกัดเฉพาะ id เหล่านี้
// (DEPT_HEAD ผ่าน resolveDeptScope middleware — ดู employee.route.ts)
export async function listEmployees(tenantId: string, branchId?: string, includeInactive?: boolean, scopedEmployeeIds?: string[]) {
  return prisma.employee.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
      ...(includeInactive ? {} : { status: 'ACTIVE' }),
      ...(scopedEmployeeIds ? { id: { in: scopedEmployeeIds } } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, group_id: true } },
      position: POSITION_INCLUDE,
      employee_status_type: STATUS_TYPE_INCLUDE,
    },
    orderBy: { created_at: 'asc' },
  })
}

const ADMIN_USER_INCLUDE = {
  select: {
    id: true, email: true, role: true, is_active: true,
    managed_departments: { select: { department_id: true } },
  },
} as const

export async function getEmployee(tenantId: string, id: string) {
  return prisma.employee.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: {
      branch: { select: { id: true, name: true, group_id: true } },
      position: POSITION_INCLUDE,
      employee_status_type: STATUS_TYPE_INCLUDE,
      admin_user: ADMIN_USER_INCLUDE,
    },
  })
}

// ── สิทธิ์เข้าเว็บแอดมิน (ผูก Employee ↔ User) ──────────────────────────────
type AdminRole = 'ADMIN' | 'MANAGER' | 'EXECUTIVE' | 'DEPT_HEAD'

export async function setEmployeeAdminAccess(tenantId: string, employeeId: string, data: {
  role: AdminRole | null
  email?: string
  department_ids?: string[]
}): Promise<
  | { notFound: true }
  | { needEmail: true }
  | { duplicateEmail: true }
  | { ok: true; admin_access: any; temp_password?: string }
> {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
    include: { admin_user: true },
  })
  if (!emp) return { notFound: true }

  // ปิดสิทธิ์ — ปิดใช้งานบัญชีที่ผูกไว้ (ไม่ลบ เผื่อเปิดใหม่ภายหลัง)
  if (data.role === null) {
    if (emp.user_id) await prisma.user.update({ where: { id: emp.user_id }, data: { is_active: false } })
    return { ok: true, admin_access: null }
  }

  // มีบัญชีผูกอยู่แล้ว — อัปเดต role + เปิดใช้งาน
  if (emp.user_id && emp.admin_user) {
    await prisma.user.update({ where: { id: emp.user_id }, data: { role: data.role, is_active: true } })
    if (data.role === 'DEPT_HEAD') await setUserDepartments(tenantId, emp.user_id, data.department_ids ?? [])
    else await prisma.userDepartment.deleteMany({ where: { user_id: emp.user_id } })
    const u = await prisma.user.findUnique({ where: { id: emp.user_id }, ...ADMIN_USER_INCLUDE })
    return { ok: true, admin_access: u }
  }

  // สร้างบัญชีใหม่ + ผูก
  if (!data.email) return { needEmail: true }
  const tempPassword = generateTempPassword()
  const hashed = await bcrypt.hash(tempPassword, 10)
  try {
    const user = await prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: data.email.trim().toLowerCase(),
        password: hashed,
        first_name: emp.first_name,
        last_name: emp.last_name,
        role: data.role,
        is_active: true,
        must_change_password: true,
        ...(data.role === 'DEPT_HEAD' && data.department_ids?.length
          ? { managed_departments: { create: data.department_ids.map(department_id => ({ department_id })) } }
          : {}),
      },
      ...ADMIN_USER_INCLUDE,
    })
    await prisma.employee.update({ where: { id: employeeId }, data: { user_id: user.id } })
    return { ok: true, admin_access: user, temp_password: tempPassword }
  } catch (e: any) {
    if (e.code === 'P2002') return { duplicateEmail: true }
    throw e
  }
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
    position_id?: string
    employee_status_type_id?: string
  },
) {
  await assertPlanCapacity(tenantId, 'employees')
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
      position_id: data.position_id,
      employee_status_type_id: data.employee_status_type_id,
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
    weekly_off_mode?: 'WEEKLY' | 'MONTHLY_BATCH'
    default_shift_id?: string | null
    pending_fine?: number   // แอดมินปรับมือได้ (เช่น ยกเลิก/แก้ค่าปรับขาดที่ยกมา)
    position_id?: string | null
    employee_status_type_id?: string | null
    booking_enabled_override?: boolean | null
    leave_enabled_override?: boolean | null
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

export async function bulkSetWeeklyOffMode(
  tenantId: string,
  department: string,
  mode: 'WEEKLY' | 'MONTHLY_BATCH',
) {
  // department = 'ALL' → ใช้กับพนักงานทุกแผนก ไม่กรอง
  // department เก็บไม่ตรงกันระหว่างพนักงานที่สร้างผ่าน Admin UI ("03 พนักงานขาย")
  // กับที่ migrate มาจาก Firebase (แค่ "03") — match ด้วยรหัส 2 ตัวแรกเสมอ
  // (แบบเดียวกับ generateEmployeeCode() ตอนสร้างรหัสพนักงาน)
  const deptCode = department.slice(0, 2).trim()
  const result = await prisma.employee.updateMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      ...(department === 'ALL' ? {} : { department: { startsWith: deptCode } }),
    },
    data: { weekly_off_mode: mode },
  })
  return result.count
}

export type EmployeeStatusValue = 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'

export async function changeEmployeeStatus(
  tenantId: string,
  id: string,
  data: { to_status: EmployeeStatusValue; reason: string; changed_by?: string },
) {
  const employee = await prisma.employee.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } })
  if (!employee) return null

  const [updated] = await prisma.$transaction([
    prisma.employee.update({
      where: { id },
      data: {
        status:        data.to_status,
        status_reason: data.reason,
        is_active:     data.to_status === 'ACTIVE',
      },
    }),
    prisma.employeeStatusLog.create({
      data: {
        tenant_id:   tenantId,
        employee_id: id,
        from_status: employee.status,
        to_status:   data.to_status,
        reason:      data.reason,
        changed_by:  data.changed_by,
      },
    }),
  ])
  return updated
}

export async function getEmployeeStatusHistory(tenantId: string, employeeId: string) {
  return prisma.employeeStatusLog.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: { created_at: 'desc' },
  })
}

export async function deleteEmployee(tenantId: string, id: string) {
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
