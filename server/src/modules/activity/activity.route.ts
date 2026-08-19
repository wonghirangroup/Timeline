// server/src/modules/activity/activity.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok }                from '../../common/utils/response'
import { prisma }            from '../../common/utils/prisma'

export async function activityRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/activity?limit= — feed "กิจกรรมล่าสุด" ของ Dashboard
  app.get('/activity', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'ดูกิจกรรมล่าสุดของ Super Admin (สร้าง/แก้ tenant, ตั้งค่า, invoice ฯลฯ)',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { limit: { type: 'integer' } } },
    },
  }, async (req: any) => {
    const limit = Math.min(req.query.limit ? Number(req.query.limit) : 20, 100)
    const list = await prisma.activityLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    })
    return ok(list)
  })
}
