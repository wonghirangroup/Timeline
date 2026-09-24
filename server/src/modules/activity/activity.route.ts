// server/src/modules/activity/activity.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok }                from '../../common/utils/response'
import { prisma }            from '../../common/utils/prisma'

export async function activityRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/activity?limit=&tenant_id= — feed "กิจกรรมล่าสุด" ของ
  // Dashboard (ไม่ระบุ tenant_id) หรือ log รายบริษัท (ระบุ tenant_id — feedback
  // 2026-09-24 "log กิจกรรมรายบริษัท" ในแท็บ "กิจกรรม" ของหน้ารายละเอียด tenant)
  app.get('/activity', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'ดูกิจกรรมล่าสุดของ Super Admin (สร้าง/แก้ tenant, ตั้งค่า, invoice ฯลฯ) — ระบุ tenant_id เพื่อกรองเฉพาะบริษัทเดียว',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { limit: { type: 'integer' }, tenant_id: { type: 'string' } } },
    },
  }, async (req: any) => {
    const limit = Math.min(req.query.limit ? Number(req.query.limit) : 20, 100)
    const list = await prisma.activityLog.findMany({
      where: { ...(req.query.tenant_id ? { tenant_id: req.query.tenant_id } : {}) },
      orderBy: { created_at: 'desc' },
      take: limit,
    })
    return ok(list)
  })
}
