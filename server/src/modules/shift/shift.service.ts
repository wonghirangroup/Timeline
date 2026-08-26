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
    absent_threshold?: string
    absent_fine?: number | null
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
    absent_threshold?: string | null
    absent_fine?: number | null
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

// ── พนักงาน ↔ กะ (many-to-many) — 1 คนอยู่ได้หลายกะ ──────────────────────────
// คนละเรื่องกับ Employee.default_shift_id (เดิม, ข้อมูลอ้างอิงเฉยๆ ไม่บังคับตอนเช็คอิน)

export async function listEmployeesInShift(tenantId: string, shiftId: string) {
  const links = await prisma.employeeShift.findMany({
    where: { tenant_id: tenantId, shift_id: shiftId },
    include: {
      employee: {
        select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch_id: true, is_active: true },
      },
    },
  })
  return links.map(l => l.employee).filter(e => e.is_active)
}

export async function listShiftIdsForEmployees(tenantId: string, employeeIds: string[]) {
  const links = await prisma.employeeShift.findMany({
    where: { tenant_id: tenantId, employee_id: { in: employeeIds } },
    select: { employee_id: true, shift_id: true },
  })
  const map: Record<string, string[]> = {}
  for (const l of links) (map[l.employee_id] ??= []).push(l.shift_id)
  return map
}

export async function assignEmployeeToShift(tenantId: string, employeeId: string, shiftId: string) {
  const [employee, shift] = await Promise.all([
    prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId, deleted_at: null } }),
    prisma.shift.findFirst({ where: { id: shiftId, tenant_id: tenantId, deleted_at: null } }),
  ])
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')
  if (!shift) throw new Error('SHIFT_NOT_FOUND')

  return prisma.employeeShift.upsert({
    where: { employee_id_shift_id: { employee_id: employeeId, shift_id: shiftId } },
    update: {},
    create: { tenant_id: tenantId, employee_id: employeeId, shift_id: shiftId },
  })
}

export async function removeEmployeeFromShift(tenantId: string, employeeId: string, shiftId: string) {
  const count = await prisma.employeeShift.deleteMany({
    where: { tenant_id: tenantId, employee_id: employeeId, shift_id: shiftId },
  })
  return count.count > 0
}
