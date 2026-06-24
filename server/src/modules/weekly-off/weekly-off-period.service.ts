// server/src/modules/weekly-off/weekly-off-period.service.ts
import { prisma } from '../../common/utils/prisma'

export async function listPeriods(tenantId: string, month: string) {
  // ดึง periods ที่มีอยู่
  const periods = await prisma.weeklyOffPeriod.findMany({
    where: { tenant_id: tenantId, month },
    include: { branch: { select: { id: true, name: true } } },
  })

  // ดึงสาขาทั้งหมดของ tenant
  const branches = await prisma.branch.findMany({
    where: { tenant_id: tenantId, deleted_at: null, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // รวม: สาขาที่ยังไม่มี period → is_open = false (ยังไม่ได้เปิด)
  return branches.map(b => {
    const period = periods.find(p => p.branch_id === b.id)
    return period ?? {
      id: null,
      tenant_id: tenantId,
      branch_id: b.id,
      month,
      is_open: false,
      deadline: null,
      note: null,
      branch: b,
    }
  })
}

export async function openPeriod(tenantId: string, data: {
  branch_id: string; month: string; deadline?: string | null; note?: string | null
}) {
  return prisma.weeklyOffPeriod.upsert({
    where: { tenant_id_branch_id_month: { tenant_id: tenantId, branch_id: data.branch_id, month: data.month } },
    create: {
      tenant_id:  tenantId,
      branch_id:  data.branch_id,
      month:      data.month,
      is_open:    true,
      deadline:   data.deadline ? new Date(data.deadline) : null,
      note:       data.note ?? null,
    },
    update: {
      is_open:  true,
      deadline: data.deadline !== undefined ? (data.deadline ? new Date(data.deadline) : null) : undefined,
      note:     data.note !== undefined ? data.note : undefined,
    },
    include: { branch: { select: { id: true, name: true } } },
  })
}

export async function closePeriod(tenantId: string, branchId: string, month: string) {
  const count = await prisma.weeklyOffPeriod.updateMany({
    where: { tenant_id: tenantId, branch_id: branchId, month },
    data:  { is_open: false },
  })
  return count.count > 0
}

export async function updatePeriod(tenantId: string, id: string, data: {
  is_open?: boolean; deadline?: string | null; note?: string | null
}) {
  const count = await prisma.weeklyOffPeriod.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(data.is_open !== undefined ? { is_open: data.is_open } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(data.deadline) : null } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  })
  return count.count > 0
}

// Employee: เช็คว่า period เปิดอยู่ไหม
export async function checkPeriodOpen(tenantId: string, branchId: string, month: string): Promise<boolean> {
  const period = await prisma.weeklyOffPeriod.findUnique({
    where: { tenant_id_branch_id_month: { tenant_id: tenantId, branch_id: branchId, month } },
  })
  if (!period || !period.is_open) return false
  if (period.deadline && new Date() > period.deadline) return false
  return true
}
