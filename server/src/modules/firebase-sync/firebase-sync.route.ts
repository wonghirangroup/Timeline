// server/src/modules/firebase-sync/firebase-sync.route.ts
// SUPER_ADMIN เท่านั้น — ปุ่ม "ซิงค์ตอนนี้เลย" ในหน้า Tenant Detail (ไม่ต้องรอ cron
// รอบถัดไปตอน 03:00) ใช้ตรวจว่า credential/logic ยังทำงานถูกหลัง deploy ด้วย
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { runFirebaseSync }  from './firebase-sync.service'

export async function firebaseSyncRoutes(app: FastifyInstance) {
  // POST /api/v1/super-admin/firebase-sync/:tenantId/run
  app.post('/firebase-sync/:tenantId/run', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['Super Admin'],
      summary: 'ซิงค์ข้อมูลจากระบบเก่า (Firebase) ให้ tenant นี้เดี๋ยวนี้ (ไม่ต้องรอ cron รายวัน)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { tenantId: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const result = await runFirebaseSync(req.params.tenantId)
      return ok(result, 'ซิงค์สำเร็จ')
    } catch (e: any) {
      return reply.code(500).send(fail('SYNC_FAILED', e.message ?? 'ซิงค์ไม่สำเร็จ'))
    }
  })
}
