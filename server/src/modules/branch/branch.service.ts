// server/src/modules/branch/branch.service.ts
import { prisma } from '../../common/utils/prisma'
import { assertPlanCapacity } from '../tenant/tenant.service'

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    include: {
      // นับเฉพาะพนักงานที่ยังใช้งานอยู่จริง (is_active=true ผูกกับ status=ACTIVE
      // เท่านั้น) — เดิมนับรวมพนักงานลาออก/ปิดใช้งาน/soft-delete ด้วย ทำให้ตัวเลข
      // "พนักงานรวม" สูงเกินจริง (feedback 2026-09-16)
      _count: { select: { employees: { where: { deleted_at: null, is_active: true } }, shifts: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

export async function getBranch(tenantId: string, id: string) {
  return prisma.branch.findFirst({
    where: { id, tenant_id: tenantId, deleted_at: null },
  })
}

// รหัสสาขา: ตัวพิมพ์ใหญ่ ตัดช่องว่าง ว่าง = ไม่ระบุ
export function normalizeBranchCode(v?: string | null): string | null {
  const c = (v ?? '').trim().toUpperCase()
  return c || null
}

async function branchCodeTaken(tenantId: string, code: string, exceptId?: string) {
  const hit = await prisma.branch.findFirst({
    where: { tenant_id: tenantId, branch_code: code, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  })
  return !!hit
}

// BR001, BR002, ... — รันต่อจากเลขสูงสุดที่เคยมีในบริษัท (นับรวมสาขาที่ลบแล้ว จะได้ไม่นำรหัสเก่ากลับมาใช้)
async function nextBranchCode(tenantId: string): Promise<string> {
  const rows = await prisma.branch.findMany({ where: { tenant_id: tenantId, branch_code: { not: null } }, select: { branch_code: true } })
  let max = 0
  for (const r of rows) {
    const m = /^BR(\d+)$/.exec(r.branch_code ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return 'BR' + String(max + 1).padStart(3, '0')
}

export async function createBranch(tenantId: string, data: {
  name: string
  branch_code?: string
  location?: string
  lat?: number
  lng?: number
  gps_radius?: number
  geo_mode?: 'WARN' | 'BLOCK'
  booking_enabled?: boolean | null
  leave_enabled?: boolean | null
  saturday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null
  sunday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null
  booking_quota?: number | null
}) {
  await assertPlanCapacity(tenantId, 'branches')
  const manualCode = normalizeBranchCode(data.branch_code)
  if (manualCode && await branchCodeTaken(tenantId, manualCode)) throw new Error('BRANCH_CODE_DUPLICATE')
  // ไม่ระบุรหัส = รันต่อจากเลขสูงสุดของบริษัท — ถ้าชนกันพอดี (สร้างพร้อมกัน) ลองเลขถัดไปอีกครั้ง
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.branch.create({ data: await buildCreateData(tenantId, data, manualCode ?? (await nextBranchCode(tenantId)) ) })
    } catch (e: any) {
      if (e?.code === 'P2002' && !manualCode && attempt < 2) continue
      if (e?.code === 'P2002') throw new Error('BRANCH_CODE_DUPLICATE')
      throw e
    }
  }
}

async function buildCreateData(tenantId: string, data: Parameters<typeof createBranch>[1], branchCode: string) {
  return {
      tenant_id: tenantId,
      branch_code: branchCode,
      name: data.name,
      location: data.location,
      lat: data.lat,
      lng: data.lng,
      gps_radius: data.gps_radius ?? 200,
      geo_mode: data.geo_mode ?? 'WARN',
      booking_enabled: data.booking_enabled ?? null,
      leave_enabled: data.leave_enabled ?? null,
      saturday_rule: data.saturday_rule ?? null,
      sunday_rule: data.sunday_rule ?? null,
      booking_quota: data.booking_quota ?? null,
  }
}

export async function getBranchQrUrl(tenantId: string, branchId: string): Promise<{ url: string; branch_name: string } | null> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenant_id: tenantId, deleted_at: null },
  })
  if (!branch) return null

  const liffId = process.env.LINE_LIFF_ID ?? ''
  const url = `https://liff.line.me/${liffId}?mode=qr&branchId=${branchId}`
  return { url, branch_name: branch.name }
}

export async function updateBranch(
  tenantId: string,
  id: string,
  data: { name?: string; branch_code?: string; location?: string; lat?: number | null; lng?: number | null; gps_radius?: number; geo_mode?: 'WARN' | 'BLOCK'; is_active?: boolean; booking_enabled?: boolean | null; leave_enabled?: boolean | null; saturday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null; sunday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null; booking_quota?: number | null },
) {
  const patch = { ...data }
  if ('branch_code' in patch) {
    const code = normalizeBranchCode(patch.branch_code)
    if (!code) delete patch.branch_code   // ห้ามล้างรหัสทิ้ง — ไม่ส่ง/ส่งว่าง = คงรหัสเดิม
    else {
      if (await branchCodeTaken(tenantId, code, id)) throw new Error('BRANCH_CODE_DUPLICATE')
      patch.branch_code = code
    }
  }
  const count = await prisma.branch.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: patch,
  })
  if (count.count === 0) return null
  return prisma.branch.findFirst({ where: { id } })
}

// feedback 2026-09-30: เดิม deleteBranch ลบตรงๆ ไม่เช็คเลยว่ามีพนักงาน/กะทำงาน
// ยังผูกอยู่ — Employee.branch_id และ Shift.branch_id เป็นฟิลด์บังคับ (ไม่มี
// null ให้ fallback) พอสาขาโดน soft-delete พนักงาน/กะที่เหลือจะ "ลอย" อยู่กับ
// branch_id ที่ชี้ไปสาขาที่ลบไปแล้ว — ทุกจุดที่ดึงรายชื่อสาขามาทำ dropdown/
// filter (listBranches กรอง deleted_at:null) จะไม่เห็นสาขานั้นอีกเลย ทำให้
// พนักงาน/กะกลุ่มนี้หายไปจากรายงาน/ตัวกรองที่อิงสาขาทั้งหมด ทั้งที่ยังอยู่จริง
// ในฐานข้อมูล — บล็อกการลบไว้ก่อนแทนที่จะเดาย้ายพนักงานให้อัตโนมัติ ให้แอดมิน
// ย้ายคนออกเองก่อนชัดเจนกว่า
export async function deleteBranch(tenantId: string, id: string): Promise<{ ok: boolean; employeeCount?: number; shiftCount?: number }> {
  const [employeeCount, shiftCount] = await Promise.all([
    prisma.employee.count({ where: { tenant_id: tenantId, branch_id: id, deleted_at: null } }),
    prisma.shift.count({ where: { tenant_id: tenantId, branch_id: id } }),
  ])
  if (employeeCount > 0 || shiftCount > 0) return { ok: false, employeeCount, shiftCount }

  const count = await prisma.branch.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return { ok: count.count > 0 }
}
