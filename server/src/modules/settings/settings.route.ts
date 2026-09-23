// server/src/modules/settings/settings.route.ts
// การตั้งค่าระดับบริษัทที่ Admin ของ tenant แก้เองได้ (โปรไฟล์/แบรนด์ + นโยบาย + ฟีเจอร์)
// max_employees/branches/groups, plan = ของ Super Admin เท่านั้น (ไม่อยู่ที่นี่)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission } from '../../common/middleware/permission'
import { ok, fail }         from '../../common/utils/response'
import { getTenantSettings, updateTenantSettings, updateTenantNotificationPrefs, updateTenantFeatures } from '../tenant/tenant.service'
import { NOTIFICATION_TYPES } from '../../common/utils/notificationPrefs'
import { FEATURE_KEYS } from '../../common/utils/features'

export async function settingsRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/tenant-settings
  app.get('/tenant-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), requirePermission('settings', 'view')],
    schema: { tags: ['Admin'], summary: 'ดูการตั้งค่าบริษัท (โปรไฟล์/แบรนด์/นโยบายลาย้อนหลัง)', security: [{ oauth2: [] }] },
  }, async (req: any, reply) => {
    const s = await getTenantSettings(req.tenantId)
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัท'))
    return ok(s)
  })

  // PATCH /api/v1/admin/tenant-settings
  app.patch('/tenant-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('settings', 'edit')],
    schema: {
      tags: ['Admin'], summary: 'แก้ไขการตั้งค่าบริษัท', security: [{ oauth2: [] }],
      body: {
        type: 'object',
        properties: {
          name:          { type: 'string', minLength: 1 },
          address:       { type: ['string', 'null'] },
          tax_id:        { type: ['string', 'null'] },
          logo_url:      { type: ['string', 'null'] },
          primary_color: { type: ['string', 'null'], description: '#RRGGBB' },
          signer_name:   { type: ['string', 'null'], description: 'ชื่อผู้ลงนามท้ายเอกสาร HR เช่น "นางสาวเภาไพรรำ หิรัญประทีป"' },
          signer_title:  { type: ['string', 'null'], description: 'ตำแหน่งผู้ลงนาม เช่น "กรรมการผู้จัดการ"' },
          leave_backdate_days: { type: ['integer', 'null'], minimum: 0, description: 'null = ยื่นลาย้อนหลังได้ไม่จำกัด' },
          self_resignation_enabled: { type: 'boolean', description: 'เปิด/ปิดเมนู "ยื่นลาออก" ใน LIFF' },
        },
      },
    },
  }, async (req: any, reply) => {
    const s = await updateTenantSettings(req.tenantId, req.body)
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัท'))
    return ok(s, 'บันทึกการตั้งค่าแล้ว')
  })

  // PATCH /api/v1/admin/tenant-settings/notification-prefs — เปิด/ปิดการแจ้งเตือน LINE
  // ไปแอดมินแต่ละประเภท (ต่างจาก enabled_features ที่ Super Admin เท่านั้น อันนี้ Admin
  // ของ tenant แก้เองได้เลย) merge เฉพาะ key ที่ส่งมา ไม่เขียนทับ key อื่น
  app.patch('/tenant-settings/notification-prefs', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('settings', 'edit')],
    schema: {
      tags: ['Admin'], summary: 'เปิด/ปิดการแจ้งเตือน LINE ไปแอดมินแต่ละประเภท', security: [{ oauth2: [] }],
      body: {
        type: 'object',
        properties: Object.fromEntries(NOTIFICATION_TYPES.map(k => [k, { type: 'boolean' }])),
      },
    },
  }, async (req: any, reply) => {
    const s = await updateTenantNotificationPrefs(req.tenantId, req.body)
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัท'))
    return ok(s, 'บันทึกการตั้งค่าแจ้งเตือนแล้ว')
  })

  // PATCH /api/v1/admin/tenant-settings/features — เปิด/ปิดฟีเจอร์ของ tenant ตัวเอง
  // (feedback 2026-09-23 "account ที่ superadmin สร้างให้ = ผู้ดูแลระบบ กำหนด
  // ทิศทางการเข้าถึงฟีเจอร์ได้" — เดิมมีแค่ Super Admin เท่านั้นที่สลับได้ที่
  // /super-admin/tenants/:id/features) merge เฉพาะ key ที่ส่งมา ไม่เขียนทับ key อื่น
  app.patch('/tenant-settings/features', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('settings', 'edit')],
    schema: {
      tags: ['Admin'], summary: 'เปิด/ปิดฟีเจอร์ของบริษัทตัวเอง (บางฟีเจอร์บล็อกจริงที่ backend เลย)', security: [{ oauth2: [] }],
      body: {
        type: 'object',
        properties: Object.fromEntries(FEATURE_KEYS.map(k => [k, { type: 'boolean' }])),
      },
    },
  }, async (req: any, reply) => {
    const tenant = await updateTenantFeatures(req.tenantId, req.body ?? {})
    if (!tenant) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัท'))
    return ok({ enabled_features: tenant.enabled_features }, 'บันทึกฟีเจอร์แล้ว')
  })
}
