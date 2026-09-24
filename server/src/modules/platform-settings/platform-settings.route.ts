// server/src/modules/platform-settings/platform-settings.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok }                from '../../common/utils/response'
import { logActivity }       from '../../common/utils/activityLog'
import * as svc from './platform-settings.service'

const bodySchema = {
  type: 'object',
  properties: {
    payment_bank_name:    { type: 'string', nullable: true },
    payment_account_name: { type: 'string', nullable: true },
    payment_account_no:   { type: 'string', nullable: true },
    payment_promptpay_id: { type: 'string', nullable: true },
    payment_qr_url:       { type: 'string', nullable: true },
    payment_note:         { type: 'string', nullable: true },
    support_phone:        { type: 'string', nullable: true },
    support_line_id:      { type: 'string', nullable: true },
    support_email:        { type: 'string', nullable: true },
  },
}

// SUPER_ADMIN — ดู/แก้ไขเต็มรูปแบบ (prefix /api/v1/super-admin)
export async function platformSettingsRoutes(app: FastifyInstance) {
  app.get('/platform-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: ['Super Admin'], summary: 'ดูตั้งค่าระดับแพลตฟอร์ม (ช่องทางชำระเงิน/ติดต่อ)', security: [{ oauth2: [] }] },
  }, async () => ok(await svc.getPlatformSettings()))

  app.patch('/platform-settings', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: ['Super Admin'], summary: 'แก้ไขตั้งค่าระดับแพลตฟอร์ม', security: [{ oauth2: [] }], body: bodySchema },
  }, async (req: any) => {
    const row = await svc.updatePlatformSettings(req.body)
    logActivity({ action: 'PACKAGE_UPDATED', actorName: req.user?.email ?? 'Super Admin', message: 'แก้ไขช่องทางชำระเงิน/ติดต่อระดับแพลตฟอร์ม' })
    return ok(row, 'บันทึกสำเร็จ')
  })
}

// ทุก role ฝั่งแอดมิน — อ่านอย่างเดียว (prefix /api/v1/admin) ให้ tenant เห็นว่า
// จะจ่ายเงิน/ติดต่อขอเปลี่ยนแพ็กเกจทางไหน — ไม่ต้องมีสิทธิ์พิเศษ แค่ login แล้ว
export async function platformSettingsPublicRoutes(app: FastifyInstance) {
  app.get('/platform-contact', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD')],
    schema: { tags: ['Admin'], summary: 'ช่องทางชำระเงิน/ติดต่อของ TimeLine (SuperAdmin ตั้งค่าไว้)', security: [{ oauth2: [] }] },
  }, async () => ok(await svc.getPlatformSettings()))
}
