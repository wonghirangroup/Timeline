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
      _count:      { select: { employees: { where: { deleted_at: null } }, groups: { where: { deleted_at: null } } } },
      line_config: { select: { line_channel_id: true, line_channel_access_token: true, line_liff_id: true } },
    },
  })
}

export async function createTenant(data: {
  name: string
  plan?: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
  max_employees?: number
  max_branches?: number
  max_groups?: number
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
        max_groups:    data.max_groups ?? 1,
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
  max_groups?: number
  is_active?: boolean
  firebase_sync_enabled?: boolean
}) {
  const count = await prisma.tenant.updateMany({
    where: { id, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.tenant.findFirst({ where: { id } })
}

// การใช้งานเทียบขีดจำกัดแพ็กเกจของ tenant (พนักงาน/สาขา/กลุ่ม) — ใช้ทั้งฝั่ง admin
// (แสดง meter + เตือนใกล้เต็ม) และ super admin (หน้า tenant detail)
export async function getPlanUsage(tenantId: string) {
  const [tenant, employees, branches, groups] = await Promise.all([
    prisma.tenant.findFirst({ where: { id: tenantId, deleted_at: null }, select: { plan: true, max_employees: true, max_branches: true, max_groups: true } }),
    prisma.employee.count({ where: { tenant_id: tenantId, deleted_at: null } }),
    prisma.branch.count({ where: { tenant_id: tenantId, deleted_at: null } }),
    prisma.group.count({ where: { tenant_id: tenantId, deleted_at: null } }),
  ])
  if (!tenant) return null
  return {
    plan: tenant.plan,
    employees: { used: employees, limit: tenant.max_employees },
    branches:  { used: branches,  limit: tenant.max_branches },
    groups:    { used: groups,    limit: tenant.max_groups },
  }
}

// throw 'LIMIT_REACHED' ถ้าสร้างเพิ่มจะเกินขีดจำกัดแพ็กเกจ — เรียกก่อน create พนักงาน/สาขา
export async function assertPlanCapacity(tenantId: string, kind: 'employees' | 'branches') {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deleted_at: null }, select: { max_employees: true, max_branches: true } })
  if (!tenant) throw new Error('TENANT_NOT_FOUND')
  const used = kind === 'employees'
    ? await prisma.employee.count({ where: { tenant_id: tenantId, deleted_at: null } })
    : await prisma.branch.count({ where: { tenant_id: tenantId, deleted_at: null } })
  const limit = kind === 'employees' ? tenant.max_employees : tenant.max_branches
  if (used >= limit) throw new Error('LIMIT_REACHED')
}

// ── การตั้งค่าที่ Admin ของ tenant แก้ได้เอง (แยกจาก max_* / plan ที่เป็นของ Super Admin) ──
const TENANT_SETTINGS_SELECT = {
  name: true, address: true, tax_id: true, logo_url: true, primary_color: true,
  leave_backdate_days: true, self_resignation_enabled: true, plan: true,
} as const

export async function getTenantSettings(tenantId: string) {
  return prisma.tenant.findFirst({ where: { id: tenantId, deleted_at: null }, select: TENANT_SETTINGS_SELECT })
}

export async function updateTenantSettings(tenantId: string, data: {
  name?: string
  address?: string | null
  tax_id?: string | null
  logo_url?: string | null
  primary_color?: string | null
  leave_backdate_days?: number | null
  self_resignation_enabled?: boolean
}) {
  const count = await prisma.tenant.updateMany({ where: { id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.tenant.findFirst({ where: { id: tenantId }, select: TENANT_SETTINGS_SELECT })
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
