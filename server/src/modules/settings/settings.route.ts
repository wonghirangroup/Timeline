// server/src/modules/settings/settings.route.ts
// การตั้งค่าระดับบริษัทที่ Admin ของ tenant แก้เองได้ (โปรไฟล์/แบรนด์ + นโยบาย)
// max_employees/branches/groups, plan, ฟีเจอร์ = ของ Super Admin (ไม่อยู่ที่นี่)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { getTenantSettings, updateTenantSettings } from '../tenant/tenant.service'

export async function settingsRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/tenant-settings
  app.get('/tenant-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD')],
    schema: { tags: ['Admin'], summary: 'ดูการตั้งค่าบริษัท (โปรไฟล์/แบรนด์/นโยบายลาย้อนหลัง)', security: [{ oauth2: [] }] },
  }, async (req: any, reply) => {
    const s = await getTenantSettings(req.tenantId)
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบริษัท'))
    return ok(s)
  })

  // PATCH /api/v1/admin/tenant-settings
  app.patch('/tenant-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
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
}
