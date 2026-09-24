// server/src/modules/package-plan/package-plan.service.ts
// เทมเพลตแพ็กเกจจริงต่อ plan (feedback 2026-09-24 "custom package builder")
import { prisma } from '../../common/utils/prisma'
import { FEATURE_KEYS } from '../../common/utils/features'

export async function listPackagePlans() {
  return prisma.packagePlan.findMany({ orderBy: { created_at: 'asc' } })
}

export async function updatePackagePlan(plan: string, data: {
  label?: string
  price_monthly?: number | null
  color?: string
  bg?: string
  max_employees?: number
  max_branches?: number
  max_groups?: number
  enabled_features?: Record<string, boolean>
}) {
  const existing = await prisma.packagePlan.findUnique({ where: { plan: plan as any } })
  if (!existing) return null
  return prisma.packagePlan.update({ where: { plan: plan as any }, data })
}

// นำเทมเพลตของแพ็กเกจนี้ไปใช้กับ tenant ทุกรายที่ใช้ plan นี้อยู่จริง — แยก
// เป็น action ต่างหากจาก "บันทึก" เสมอ (ไม่ sync อัตโนมัติตอนแก้เทมเพลต) กัน
// เผลอเปลี่ยน limit/feature ของ tenant จริงที่ใช้งานอยู่โดยไม่ตั้งใจ
export async function applyPackagePlanToTenants(plan: string): Promise<{ count: number }> {
  const pkg = await prisma.packagePlan.findUnique({ where: { plan: plan as any } })
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND')
  const result = await prisma.tenant.updateMany({
    where: { plan: plan as any, deleted_at: null },
    data: {
      max_employees: pkg.max_employees,
      max_branches: pkg.max_branches,
      max_groups: pkg.max_groups,
      enabled_features: pkg.enabled_features as any,
    },
  })
  return { count: result.count }
}

// seed ครั้งแรก — เรียกจาก script แยก ไม่ auto-run ตอน boot (กันสร้างซ้ำ/
// ทับของจริงที่ Super Admin แก้ไว้แล้วโดยไม่ตั้งใจ)
export function defaultFeatureSet(enabled: string[]): Record<string, boolean> {
  return Object.fromEntries(FEATURE_KEYS.map(k => [k, enabled.includes(k)]))
}
