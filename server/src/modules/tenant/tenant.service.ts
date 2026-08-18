// server/src/modules/tenant/tenant.service.ts
import { prisma } from '../../common/utils/prisma'
import bcrypt from 'bcryptjs'

export async function listTenants() {
  return prisma.tenant.findMany({
    where: { deleted_at: null },
    include: {
      _count: { select: { employees: true, branches: true } },
      line_config: { select: { line_channel_id: true, line_liff_id: true } },
      users: {
        where: { role: 'ADMIN', deleted_at: null },
        select: { email: true, first_name: true, last_name: true },
        take: 1,
      },
    },
    orderBy: { created_at: 'desc' },
  })
}

export async function getTenant(id: string) {
  return prisma.tenant.findFirst({
    where: { id, deleted_at: null },
    include: {
      users:       { where: { deleted_at: null }, select: { id: true, email: true, first_name: true, last_name: true, role: true } },
      branches:    { where: { deleted_at: null } },
      _count:      { select: { employees: true } },
      line_config: { select: { line_channel_id: true, line_channel_access_token: true, line_liff_id: true } },
    },
  })
}

export async function createTenant(data: {
  name: string
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
  max_employees?: number
  max_branches?: number
  admin_email: string
  admin_password: string
  admin_first_name: string
  admin_last_name: string
}) {
  const hashedPassword = await bcrypt.hash(data.admin_password, 10)

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name:          data.name,
        plan:          data.plan ?? 'FREE',
        max_employees: data.max_employees ?? 5,
        max_branches:  data.max_branches ?? 1,
      },
    })

    const admin = await tx.user.create({
      data: {
        tenant_id:  tenant.id,
        email:      data.admin_email,
        password:   hashedPassword,
        first_name: data.admin_first_name,
        last_name:  data.admin_last_name,
        role:       'ADMIN',
        is_active:  true,
      },
    })

    return { tenant, admin: { id: admin.id, email: admin.email } }
  })
}

export async function updateTenant(id: string, data: {
  name?: string
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
  max_employees?: number
  max_branches?: number
  is_active?: boolean
}) {
  const count = await prisma.tenant.updateMany({
    where: { id, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.tenant.findFirst({ where: { id } })
}

export async function updateTenantFeatures(id: string, features: Partial<Record<string, boolean>>) {
  const existing = await prisma.tenant.findFirst({ where: { id, deleted_at: null }, select: { enabled_features: true } })
  if (!existing) return null

  const current = (existing.enabled_features && typeof existing.enabled_features === 'object')
    ? existing.enabled_features as Record<string, boolean>
    : {}
  const merged = { ...current, ...features } // merge — ไม่เขียนทับ key อื่นที่ไม่ได้ส่งมารอบนี้

  return prisma.tenant.update({
    where: { id },
    data: { enabled_features: merged },
  })
}

export async function deleteTenant(id: string) {
  const count = await prisma.tenant.updateMany({
    where: { id, deleted_at: null },
    data: { deleted_at: new Date(), is_active: false },
  })
  return count.count > 0
}
