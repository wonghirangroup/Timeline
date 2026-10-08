// server/src/modules/tenant/user.service.ts
import { normalizeRecoveryEmail } from '../auth/password-reset.service'
import { prisma } from '../../common/utils/prisma'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { seedPermissionsFromTemplate } from '../permissions/permission.service'

// สุ่มรหัสผ่านชั่วคราว เช่น "Tmp#Ab3xK9pQ" — ตัวพิมพ์ใหญ่/เล็ก+ตัวเลข+สัญลักษณ์
// ให้ผ่านเงื่อนไข "8+ ตัว, ตัวพิมพ์ใหญ่, ตัวเลข" ตามที่ระบุใน onboarding flow แน่นอน
export function generateTempPassword(): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower  = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbol = '#'
  const pick = (chars: string) => chars[randomInt(chars.length)]
  let rest = ''
  for (let i = 0; i < 8; i++) rest += pick(upper + lower + digits)
  return `Tmp${symbol}${pick(upper)}${pick(digits)}${rest}`
}

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    select: {
      id: true, email: true, recovery_email: true, first_name: true, last_name: true, role: true, is_active: true, tenant_id: true, created_at: true, is_root_admin: true,
      linked_employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, line_user_id: true } },
    },
    orderBy: { created_at: 'desc' },
  })
}

export async function createUser(
  tenantId: string,
  data: {
    email: string
    password: string
    first_name: string
    last_name: string
    role: 'ADMIN' | 'MANAGER' | 'EXECUTIVE' | 'DEPT_HEAD'
    recovery_email?: string | null   // อีเมลรับ OTP ลืมรหัสผ่าน
    department_ids?: string[] // เฉพาะ role DEPT_HEAD — แผนกที่ดูแล (ดูแลได้หลายแผนก)
    // ดึงจากพนักงาน — ผูก Employee.user_id กับบัญชีใหม่ พนักงานคนนั้นจะเห็นปุ่ม
    // "สลับไปเว็บแอดมิน" ในแอป LINE (LIFF) แล้วเข้าเว็บได้เลยไม่ต้องล็อกอินซ้ำ
    employee_id?: string
  },
  opts?: { mustChangePassword?: boolean },
) {
  if (data.employee_id) {
    const emp = await prisma.employee.findFirst({
      where: { id: data.employee_id, tenant_id: tenantId, deleted_at: null },
      select: { admin_user: { select: { is_active: true } } },
    })
    if (!emp) throw new Error('EMPLOYEE_NOT_FOUND')
    // บัญชีเดิมที่ถูกลบ/ปิดไปแล้วผูกใหม่ได้ (Employee.user_id ย้ายมาที่บัญชีใหม่)
    if (emp.admin_user?.is_active) throw new Error('EMPLOYEE_ALREADY_LINKED')
  }

  const hashed = await bcrypt.hash(data.password, 10)
  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({
    data: {
      tenant_id:  tenantId || null,
      email:      data.email,
      recovery_email: normalizeRecoveryEmail(data.recovery_email),
      password:   hashed,
      first_name: data.first_name,
      last_name:  data.last_name,
      role:       data.role,
      is_active:  true,
      must_change_password: opts?.mustChangePassword ?? false,
    },
    select: { id: true, email: true, first_name: true, last_name: true, role: true, tenant_id: true },
    })
    if (data.employee_id) await tx.employee.update({ where: { id: data.employee_id }, data: { user_id: created.id } })
    return created
  })

  if (data.role === 'DEPT_HEAD' && data.department_ids?.length) {
    await prisma.userDepartment.createMany({
      data: data.department_ids.map(department_id => ({ user_id: user.id, department_id })),
      skipDuplicates: true,
    })
  }

  // สิทธิ์แบบละเอียด — เริ่มต้นจากเทมเพลตของ role นี้ แก้ไขรายบัญชีทีหลังได้
  // (feedback 2026-09-22) ยังไม่มีผลต่อการเข้าถึงจริง (Phase 1 — ดู brain log v187)
  if (tenantId) await seedPermissionsFromTemplate(tenantId, user.id, data.role)

  return user
}

// จัดการแผนกที่หัวหน้าแผนกดูแล (ตั้งใหม่ทั้งชุด — ลบของเดิมแล้วสร้างใหม่ตามที่ส่งมา)
export async function setUserDepartments(tenantId: string, userId: string, departmentIds: string[]) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId, deleted_at: null } })
  if (!user) throw new Error('NOT_FOUND')
  await prisma.userDepartment.deleteMany({ where: { user_id: userId } })
  if (departmentIds.length > 0) {
    await prisma.userDepartment.createMany({
      data: departmentIds.map(department_id => ({ user_id: userId, department_id })),
      skipDuplicates: true,
    })
  }
  return prisma.userDepartment.findMany({ where: { user_id: userId }, include: { department: { select: { id: true, name: true } } } })
}

export async function getUserDepartments(tenantId: string, userId: string) {
  return prisma.userDepartment.findMany({
    where: { user_id: userId, department: { tenant_id: tenantId } },
    include: { department: { select: { id: true, name: true } } },
  })
}

export async function updateUser(
  tenantId: string,
  id: string,
  data: { first_name?: string; last_name?: string; is_active?: boolean; password?: string; recovery_email?: string | null },
) {
  const updateData: any = { ...data }
  if (data.recovery_email !== undefined) updateData.recovery_email = normalizeRecoveryEmail(data.recovery_email)
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10)
  }
  const count = await prisma.user.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), deleted_at: null },
    data: updateData,
  })
  return count.count > 0
}

export async function deleteUser(tenantId: string, id: string) {
  const count = await prisma.user.updateMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}), deleted_at: null },
    data: { deleted_at: new Date(), is_active: false },
  })
  return count.count > 0
}
