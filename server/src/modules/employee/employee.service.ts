// server/src/modules/employee/employee.service.ts
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../../common/utils/prisma'
import { assertPlanCapacity } from '../tenant/tenant.service'
import { generateTempPassword, setUserDepartments } from '../tenant/user.service'
import { seedPermissionsFromTemplate } from '../permissions/permission.service'

// ตำแหน่งผูก parent ชัดเจนเสมอ: Position → Department → Division → Group (ดู org-structure.service.ts)
const POLICY_FIELDS = { booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true } as const
const POSITION_INCLUDE = {
  select: {
    id: true, name: true, ...POLICY_FIELDS,
    department: {
      select: {
        id: true, name: true, ...POLICY_FIELDS,
        division: { select: { id: true, name: true, ...POLICY_FIELDS, group: { select: { id: true, name: true } } } },
      },
    },
  },
} as const
const STATUS_TYPE_INCLUDE = {
  select: { id: true, name: true, monthly_off_quota: true, saturday_rule: true, sunday_rule: true, off_on_public_holiday: true },
} as const

// เงื่อนไข Prisma สำหรับกรอง "พนักงานที่สังกัดสาขานี้" — รวมทั้งสาขาหลัก (branch_id)
// และสาขาเสริมที่แอดมินเพิ่มให้ (extra_branches) เพราะพนักงาน 1 คนอยู่ได้มากกว่า
// 1 สาขาแล้ว (feedback 2026-09-14: "เห็นทุกสาขาที่สังกัด (หลัก+เสริม)") — ใช้แทน
// { branch_id: X } เปล่าๆ ทุกจุดที่กรองรายงาน/รายการตามสาขา (attendance, leave,
// ot, offsite, weekly-off, shift-assignment, dashboard, announcement ฯลฯ)
export function employeeBranchWhere(branchId: string) {
  return {
    OR: [
      { branch_id: branchId },
      { extra_branches: { some: { branch_id: branchId } } },
    ],
  }
}

// sync สาขาเสริม — ลบของเดิมทั้งหมดแล้วสร้างใหม่ตาม list ที่ส่งมา (ง่ายกว่า diff
// เพราะจำนวนสาขาต่อคนน้อย ไม่คุ้มความซับซ้อนของการ diff) ส่ง undefined = ไม่แตะเลย,
// [] = ล้างสาขาเสริมทั้งหมด
async function syncExtraBranches(tenantId: string, employeeId: string, branchIds: string[] | undefined) {
  if (branchIds === undefined) return
  await prisma.$transaction([
    prisma.employeeBranch.deleteMany({ where: { employee_id: employeeId } }),
    ...(branchIds.length > 0
      ? [prisma.employeeBranch.createMany({
          data: branchIds.map(branch_id => ({ tenant_id: tenantId, employee_id: employeeId, branch_id })),
          skipDuplicates: true,
        })]
      : []),
  ])
}

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
      ...(branchId ? employeeBranchWhere(branchId) : {}),
      ...(includeInactive ? {} : { status: 'ACTIVE' }),
      ...(scopedEmployeeIds ? { id: { in: scopedEmployeeIds } } : {}),
    },
    include: {
      branch: { select: { id: true, name: true, group_id: true, ...POLICY_FIELDS, group: { select: { booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true } } } },
      position: POSITION_INCLUDE,
      employee_status_type: STATUS_TYPE_INCLUDE,
      admin_user: { select: { role: true, is_active: true } },
      extra_branches: { select: { branch: { select: { id: true, name: true } } } },
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
      branch: { select: { id: true, name: true, group_id: true, ...POLICY_FIELDS, group: { select: { booking_enabled: true, leave_enabled: true, saturday_rule: true, sunday_rule: true, booking_quota: true } } } },
      position: POSITION_INCLUDE,
      employee_status_type: STATUS_TYPE_INCLUDE,
      admin_user: ADMIN_USER_INCLUDE,
      extra_branches: { select: { branch: { select: { id: true, name: true } } } },
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

  // มีบัญชีผูกอยู่แล้ว — อัปเดต role + เปิดใช้งาน + (ถ้าส่ง email มาต่างจากเดิม)
  // เปลี่ยน username/login ด้วย — เดิมไม่มีทางแก้เลย ถอนสิทธิ์แล้วให้สิทธิ์ใหม่ก็ยัง
  // ใช้ email เดิมตลอดไป (feedback 2026-09-16: "ถอดสิทธิ์แล้วมันไม่เปลี่ยน User ให้
  // อยากเปลี่ยน user เป็น username เอง")
  // ต้องเคลียร์ deleted_at ด้วยเสมอ — เจอบั๊กจริง: ถ้าเคยลบบัญชีนี้ผ่านหน้า "ผู้ใช้
  // งานเว็บ" (Settings → deleteUser ตั้ง deleted_at ไว้แต่ไม่ได้เคลียร์
  // Employee.user_id) แล้วมาให้สิทธิ์ใหม่ทางนี้ทีหลัง เดิมจะได้บัญชีที่ is_active:
  // true แต่ deleted_at ยังติดอยู่ — ล็อกอินได้จริงแต่หายไปจากลิสต์ผู้ใช้งาน (feedback
  // 2026-09-16: "เพิ่มตำแหน่งแล้วสร้าง user แล้วทำไมไม่ขึ้นตรงนี้")
  if (emp.user_id && emp.admin_user) {
    const updateData: { role: AdminRole; is_active: boolean; deleted_at: null; email?: string } = { role: data.role, is_active: true, deleted_at: null }
    const trimmedEmail = data.email?.trim().toLowerCase()
    if (trimmedEmail && trimmedEmail !== emp.admin_user.email) updateData.email = trimmedEmail
    try {
      await prisma.user.update({ where: { id: emp.user_id }, data: updateData })
    } catch (e: any) {
      if (e.code === 'P2002') return { duplicateEmail: true }
      throw e
    }
    if (data.role === 'DEPT_HEAD') await setUserDepartments(tenantId, emp.user_id, data.department_ids ?? [])
    else await prisma.userDepartment.deleteMany({ where: { user_id: emp.user_id } })
    // เติมสิทธิ์แบบละเอียดจาก template ของ role ใหม่ เฉพาะ feature ที่ยังไม่มี
    // แถว (ไม่ทับของที่เคยปรับเองไว้แล้วตอน role เดิม)
    await seedPermissionsFromTemplate(tenantId, emp.user_id, data.role)
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
    await seedPermissionsFromTemplate(tenantId, user.id, data.role)
    return { ok: true, admin_access: user, temp_password: tempPassword }
  } catch (e: any) {
    if (e.code === 'P2002') return { duplicateEmail: true }
    throw e
  }
}

interface EmergencyContact { name: string; relation: string; phone: string }
interface AddressInput { house?: string; road?: string; soi?: string; moo?: string; sub?: string; district?: string; province?: string; zip?: string }
interface EducationInput { level: string; institution: string; field: string; year: string }
interface SkillInput { name: string; level: string }
// Prisma Json field ไม่รับ interface ธรรมดาตรงๆ (ต้องมี index signature) — cast ผ่าน helper
// นี้ทีเดียว กัน `as any` กระจายเกลื่อน, undefined = ไม่แตะ, null = ล้างค่า (Prisma.JsonNull)
function toJsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined
  if (v === null) return Prisma.JsonNull
  return v as Prisma.InputJsonValue
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
    extra_branch_ids?: string[]   // สาขาเสริม นอกเหนือจาก branch_id (สาขาหลัก)
    // ── ข้อมูลส่วนตัวเพิ่มเติม (feedback 2026-09-23) ──────────────────────
    prefix?: string
    email?: string
    id_card?: string
    birthdate?: string
    blood_type?: string
    phone_alt?: string
    emergency_contacts?: EmergencyContact[]
    address_id?: AddressInput
    address_current?: AddressInput | null
    educations?: EducationInput[]
    skills?: SkillInput[]
    emp_type?: string
    salary?: number
    notes?: string
  },
) {
  await assertPlanCapacity(tenantId, 'employees')
  const employee_code = await generateEmployeeCode(tenantId, data.hired_at, data.department)
  const employee = await prisma.employee.create({
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
      prefix: data.prefix,
      email: data.email,
      id_card: data.id_card,
      birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
      blood_type: data.blood_type,
      phone_alt: data.phone_alt,
      emergency_contacts: toJsonInput(data.emergency_contacts?.length ? data.emergency_contacts : undefined),
      address_id: toJsonInput(data.address_id),
      address_current: toJsonInput(data.address_current ?? undefined),
      educations: toJsonInput(data.educations?.length ? data.educations : undefined),
      skills: toJsonInput(data.skills?.length ? data.skills : undefined),
      emp_type: data.emp_type,
      salary: data.salary,
      notes: data.notes,
    },
  })
  if (data.extra_branch_ids?.length) await syncExtraBranches(tenantId, employee.id, data.extra_branch_ids)
  return employee
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
    offsite_checkin_enabled?: boolean
    photo_url?: string | null
    extra_branch_ids?: string[]   // undefined = ไม่แตะ, [] = ล้างสาขาเสริมทั้งหมด
    // ── ข้อมูลส่วนตัวเพิ่มเติม (feedback 2026-09-23) ──────────────────────
    prefix?: string | null
    email?: string | null
    id_card?: string | null
    birthdate?: string | null
    blood_type?: string | null
    phone_alt?: string | null
    emergency_contacts?: EmergencyContact[] | null
    address_id?: AddressInput | null
    address_current?: AddressInput | null
    educations?: EducationInput[] | null
    skills?: SkillInput[] | null
    emp_type?: string | null
    salary?: number | null
    notes?: string | null
  },
) {
  const { hired_at, birthdate, extra_branch_ids, emergency_contacts, address_id, address_current, educations, skills, ...rest } = data
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: {
      ...rest,
      ...(hired_at !== undefined ? { hired_at: hired_at ? new Date(hired_at) : null } : {}),
      ...(birthdate !== undefined ? { birthdate: birthdate ? new Date(birthdate) : null } : {}),
      ...(emergency_contacts !== undefined ? { emergency_contacts: toJsonInput(emergency_contacts) } : {}),
      ...(address_id !== undefined ? { address_id: toJsonInput(address_id) } : {}),
      ...(address_current !== undefined ? { address_current: toJsonInput(address_current) } : {}),
      ...(educations !== undefined ? { educations: toJsonInput(educations) } : {}),
      ...(skills !== undefined ? { skills: toJsonInput(skills) } : {}),
    },
  })
  if (count.count === 0) return null
  await syncExtraBranches(tenantId, id, extra_branch_ids)
  return prisma.employee.findFirst({ where: { id }, include: { extra_branches: { select: { branch: { select: { id: true, name: true } } } } } })
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
  // เคลียร์ line_user_id ด้วย — unique constraint (tenant_id, line_user_id) ไม่แยกแถวที่ลบแล้ว
  // ถ้าไม่เคลียร์ พนักงานคนนี้จะผูก LINE บัญชีเดิมกับ record ใหม่ (เช่นกรณีลาออกแล้วกลับมาสมัครใหม่) ไม่ได้อีกเลย
  // (feedback 2026-09-22 — เจอเคสจริง admin ลบ record เก่าทิ้งแล้วพนักงานผูก LINE รอบใหม่ไม่ได้)
  const count = await prisma.employee.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date(), line_user_id: null },
  })
  return count.count > 0
}
