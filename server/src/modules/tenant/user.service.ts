// server/src/modules/tenant/user.service.ts
import { prisma } from '../../common/utils/prisma'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'

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
    select: { id: true, email: true, first_name: true, last_name: true, role: true, is_active: true, tenant_id: true, created_at: true },
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
    role: 'ADMIN' | 'MANAGER'
  },
  opts?: { mustChangePassword?: boolean },
) {
  const hashed = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: {
      tenant_id:  tenantId || null,
      email:      data.email,
      password:   hashed,
      first_name: data.first_name,
      last_name:  data.last_name,
      role:       data.role,
      is_active:  true,
      must_change_password: opts?.mustChangePassword ?? false,
    },
    select: { id: true, email: true, first_name: true, last_name: true, role: true, tenant_id: true },
  })
}

export async function updateUser(
  tenantId: string,
  id: string,
  data: { first_name?: string; last_name?: string; is_active?: boolean; password?: string },
) {
  const updateData: any = { ...data }
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
