// server/src/modules/permissions/permission.service.ts
// จัดการสิทธิ์แบบละเอียดต่อบัญชี (FeaturePermission) — Phase 1: มีข้อมูล+
// จัดการได้จริง แต่ endpoint อื่นยังไม่ได้เช็คค่าจากตารางนี้ (ดู brain log v187)
import { prisma } from '../../common/utils/prisma'
import { FEATURE_KEYS, PERMISSION_ACTIONS, type PermissionAction } from '../../common/permissions/features'
import { ROLE_TEMPLATES, type FeatureTemplate } from '../../common/permissions/roleTemplates'
import { NOTIFICATION_TYPE_TO_FEATURE, type NotificationType } from '../../common/utils/notificationPrefs'

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
      notify: r?.can_notify ?? true,
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
          can_view: p.view, can_add: p.add, can_edit: p.edit, can_delete: p.delete, can_approve: p.approve, can_notify: p.notify,
        },
        update: {
          can_view: p.view, can_add: p.add, can_edit: p.edit, can_delete: p.delete, can_approve: p.approve, can_notify: p.notify,
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
      can_notify: template[feature]?.notify ?? false,
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

// ── จัดการ "ใครได้รับแจ้งเตือนไลน์ประเภทนี้บ้าง" รายคน ──────────────────────────
// แยกออกมาจาก setUserPermissions เพราะหน้า "ตั้งค่า → การแจ้งเตือน" อยากแก้แค่
// can_notify ของ feature เดียวต่อครั้ง ไม่ต้องรู้จัก/ส่ง permission ชุดเต็มของ
// ฟีเจอร์นั้นมาด้วย (feedback 2026-10-01: "ผู้ดูแลระบบมีสิทธิจัดการว่าจะให้
// แอดมินหรือสิทธิกับคนไหนที่จะไม่ได้รับไลน์ notify") — ชนิดแจ้งเตือนที่อยู่
// feature เดียวกัน (เช่น leave/weekly_off/weekly_off_swap ใช้ feature 'leave'
// ร่วมกัน) จะได้ can_notify ตัวเดียวกันเสมอ ปิดอันหนึ่งเท่ากับปิดทั้งชุด
export interface NotifyRecipient { id: string; name: string; role: string; notify: boolean }

// เฉพาะ role ที่ notifyAdminsLine() เลือกเป็นผู้รับจริง (ดู
// server/src/modules/notifications/line-push.service.ts) — EXECUTIVE ไม่เคย
// ได้รับแจ้งเตือนไลน์เลยไม่ต้องขึ้นในลิสต์นี้ กันสับสนว่าทำไมปิดไม่ได้ผล
const NOTIFIABLE_ROLES = ['ADMIN', 'MANAGER', 'DEPT_HEAD'] as const

export async function getNotifyRecipients(tenantId: string, type: NotificationType): Promise<NotifyRecipient[]> {
  const feature = NOTIFICATION_TYPE_TO_FEATURE[type]
  const users = await prisma.user.findMany({
    where: { tenant_id: tenantId, is_active: true, deleted_at: null, role: { in: [...NOTIFIABLE_ROLES] } },
    select: { id: true, email: true, role: true, linked_employee: { select: { first_name: true, last_name: true, nickname: true } } },
    orderBy: { created_at: 'asc' },
  })
  if (users.length === 0) return []
  const perms = await prisma.featurePermission.findMany({
    where: { tenant_id: tenantId, feature, user_id: { in: users.map(u => u.id) } },
    select: { user_id: true, can_notify: true },
  })
  const byUser = new Map(perms.map(p => [p.user_id, p.can_notify]))
  return users.map(u => ({
    id: u.id,
    role: u.role,
    name: u.linked_employee ? (u.linked_employee.nickname || `${u.linked_employee.first_name} ${u.linked_employee.last_name}`) : u.email,
    notify: byUser.get(u.id) ?? true,
  }))
}

export async function setNotify(tenantId: string, userId: string, type: NotificationType, notify: boolean): Promise<void> {
  const feature = NOTIFICATION_TYPE_TO_FEATURE[type]
  const user = await prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { role: true } })
  // แถวนี้อาจเป็นแถวแรกที่ถูกสร้างของ user+feature คู่นี้ (ไม่เคยเปิด matrix
  // เต็มมาก่อน) — ใช้ default ของ role ตาม template เดียวกับ seedPermissionsFromTemplate
  // กัน regression ตอน Phase 2 เริ่ม enforce จริง (ไม่ใช่เปิดทุกสิทธิ์ให้เต็มมั่วๆ)
  const template = user ? (ROLE_TEMPLATES as Record<string, FeatureTemplate>)[user.role] : undefined
  const base = template?.[feature]
  await prisma.featurePermission.upsert({
    where: { user_id_feature: { user_id: userId, feature } },
    create: {
      tenant_id: tenantId, user_id: userId, feature,
      can_view: base?.view ?? true, can_add: base?.add ?? true, can_edit: base?.edit ?? true,
      can_delete: base?.delete ?? true, can_approve: base?.approve ?? true,
      can_notify: notify,
    },
    update: { can_notify: notify },
  })
}

export { PERMISSION_ACTIONS }
