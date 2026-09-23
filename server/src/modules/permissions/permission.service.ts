// server/src/modules/permissions/permission.service.ts
// จัดการสิทธิ์แบบละเอียดต่อบัญชี (FeaturePermission) — Phase 1: มีข้อมูล+
// จัดการได้จริง แต่ endpoint อื่นยังไม่ได้เช็คค่าจากตารางนี้ (ดู brain log v187)
import { prisma } from '../../common/utils/prisma'
import { FEATURE_KEYS, PERMISSION_ACTIONS, type PermissionAction } from '../../common/permissions/features'
import { ROLE_TEMPLATES, type FeatureTemplate } from '../../common/permissions/roleTemplates'

export type PermissionRow = { feature: string } & Record<PermissionAction, boolean>

// คืนสิทธิ์ครบทุก feature key เสมอ — feature ที่ยังไม่มีแถวในตาราง (เช่น
// ฟีเจอร์ใหม่ที่เพิ่งเพิ่มทีหลัง ผู้ใช้เก่ายังไม่เคย seed, หรือบัญชีที่หลุด
// การ seed ไปตอนสร้าง) ต้องได้ true ทั้งหมด "ไม่ใช่" false — เพื่อให้ตรงกับ
// พฤติกรรมจริงของ requirePermission() middleware ที่ "ไม่มีแถว = อนุญาตผ่าน"
// (fallback ปลอดภัย) ถ้า default เป็น false ตรงนี้จะโชว์ผิดว่าบัญชีนั้นไม่มี
// สิทธิ์อะไรเลย ทั้งที่จริงยังเข้าถึงได้ปกติทุกอย่าง (feedback 2026-09-23)
export async function getUserPermissions(tenantId: string, userId: string): Promise<PermissionRow[]> {
  const rows = await prisma.featurePermission.findMany({
    where: { tenant_id: tenantId, user_id: userId },
  })
  const byFeature = new Map(rows.map(r => [r.feature, r]))
  return FEATURE_KEYS.map(feature => {
    const r = byFeature.get(feature)
    return {
      feature,
      view: r?.can_view ?? true,
      add: r?.can_add ?? true,
      edit: r?.can_edit ?? true,
      delete: r?.can_delete ?? true,
      approve: r?.can_approve ?? true,
    }
  })
}

export async function setUserPermissions(tenantId: string, userId: string, permissions: PermissionRow[]): Promise<void> {
  await prisma.$transaction(
    permissions
      .filter(p => FEATURE_KEYS.includes(p.feature))
      .map(p => prisma.featurePermission.upsert({
        where: { user_id_feature: { user_id: userId, feature: p.feature } },
        create: {
          tenant_id: tenantId, user_id: userId, feature: p.feature,
          can_view: p.view, can_add: p.add, can_edit: p.edit, can_delete: p.delete, can_approve: p.approve,
        },
        update: {
          can_view: p.view, can_add: p.add, can_edit: p.edit, can_delete: p.delete, can_approve: p.approve,
        },
      })),
  )
}

// seed แถวที่ "ยังไม่มี" จากเทมเพลตของ role — ใช้ skipDuplicates กันทับสิทธิ์ที่
// เคยปรับเองไว้แล้ว (เรียกซ้ำได้เสมอ ปลอดภัย เช่นตอนเปลี่ยน role ภายหลัง)
export async function seedPermissionsFromTemplate(tenantId: string, userId: string, role: string): Promise<void> {
  const template = (ROLE_TEMPLATES as Record<string, FeatureTemplate>)[role]
  if (!template) return // SUPER_ADMIN หรือ role ที่ไม่รู้จัก — ไม่ seed
  await prisma.featurePermission.createMany({
    data: FEATURE_KEYS.map(feature => ({
      tenant_id: tenantId, user_id: userId, feature,
      can_view: template[feature]?.view ?? false,
      can_add: template[feature]?.add ?? false,
      can_edit: template[feature]?.edit ?? false,
      can_delete: template[feature]?.delete ?? false,
      can_approve: template[feature]?.approve ?? false,
    })),
    skipDuplicates: true,
  })
}

// รีเซ็ตทั้งชุดกลับเป็นค่าเริ่มต้นของ role — ต่างจาก seed ตรงที่ "ลบของเดิมทิ้งก่อน"
// (ผู้ใช้กดเองแบบ explicit เท่านั้น ไม่เกิดอัตโนมัติ)
export async function resetUserPermissions(tenantId: string, userId: string, role: string): Promise<void> {
  await prisma.featurePermission.deleteMany({ where: { tenant_id: tenantId, user_id: userId } })
  await seedPermissionsFromTemplate(tenantId, userId, role)
}

export { PERMISSION_ACTIONS }
