// server/src/modules/shift/shift.service.ts
import { createHmac } from 'crypto'
import { prisma } from '../../common/utils/prisma'

const QR_SECRET = process.env.QR_SECRET ?? 'fallback-secret'

// Branch-level QR — ถาวร ไม่มีวันหมดอายุ (auto-detect กะจากเวลาที่สแกน)
export interface BranchQrPayload {
  v:   1
  tid: string   // tenant_id
  bid: string   // branch_id
  sig: string
}

function signBranchQr(tid: string, bid: string): string {
  return createHmac('sha256', QR_SECRET).update(`1:${tid}:${bid}`).digest('hex')
}

export function verifyBranchQrPayload(payload: BranchQrPayload): boolean {
  const expected = signBranchQr(payload.tid, payload.bid)
  return payload.sig === expected
}

export async function generateBranchQR(tenantId: string, branchId: string): Promise<{
  payload: BranchQrPayload
  branch: { id: string; name: string; location: string | null; gps_radius: number }
}> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenant_id: tenantId, deleted_at: null },
    select: { id: true, name: true, location: true, gps_radius: true },
  })
  if (!branch) throw new Error('BRANCH_NOT_FOUND')

  const sig = signBranchQr(tenantId, branchId)
  const payload: BranchQrPayload = { v: 1, tid: tenantId, bid: branchId, sig }
  return { payload, branch }
}

export async function listShifts(tenantId: string, branchId?: string) {
  return prisma.shift.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(branchId ? { branch_id: branchId } : {}),
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ branch_id: 'asc' }, { start_time: 'asc' }],
  })
}

export async function getShift(tenantId: string, id: string) {
  return prisma.shift.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
    include: { branch: { select: { id: true, name: true } } },
  })
}

export async function createShift(
  tenantId: string,
  data: {
    branch_id: string
    name: string
    start_time: string
    end_time: string
    min_checkout?: string
    late_threshold?: number
    late_threshold_1?: string
    late_threshold_2?: string
    late_fine_1?: number | null
    late_fine_2?: number | null
    gps_radius?: number
  },
) {
  return prisma.shift.create({
    data: { tenant_id: tenantId, ...data },
  })
}

export async function updateShift(
  tenantId: string,
  id: string,
  data: {
    name?: string
    start_time?: string
    end_time?: string
    min_checkout?: string | null
    late_threshold?: number
    late_threshold_1?: string | null
    late_threshold_2?: string | null
    late_fine_1?: number | null
    late_fine_2?: number | null
    gps_radius?: number | null
    is_active?: boolean
  },
) {
  const count = await prisma.shift.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data,
  })
  if (count.count === 0) return null
  return prisma.shift.findFirst({ where: { id } })
}

export async function deleteShift(tenantId: string, id: string) {
  const count = await prisma.shift.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}
