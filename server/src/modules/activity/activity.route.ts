// server/src/modules/activity/activity.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok }                from '../../common/utils/response'
import { prisma }            from '../../common/utils/prisma'
import { getMergedAuditFeed } from '../audit-log/audit-log.service'

export async function activityRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/activity?limit=&tenant_id= — feed "กิจกรรมล่าสุด" ของ
  // Dashboard (ไม่ระบุ tenant_id) หรือ log รายบริษัท (ระบุ tenant_id — feedback
  // 2026-09-24 "log กิจกรรมรายบริษัท" ในแท็บ "กิจกรรม" ของหน้ารายละเอียด tenant)
  app.get('/activity', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'ดูกิจกรรมล่าสุดของ Super Admin (สร้าง/แก้ tenant, ตั้งค่า, invoice ฯลฯ) — ระบุ tenant_id เพื่อกรองเฉพาะบริษัทเดียว (จะรวมกิจกรรมระดับพนักงานของบริษัทนั้นมาด้วย)',
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
    // ระบุ tenant_id = ดูรายบริษัท (feedback 2026-09-28 "superadmin สามารถดูล็อค
    // ของแต่ละบริษัทได้") — รวม feed ระดับข้อมูลพนักงาน (เพิ่ม/ลบ/แก้ไข/แจ้งเตือน)
    // เข้ากับ feed ระดับจัดการบัญชี/แพลตฟอร์มเดิม ให้เห็นภาพรวมทั้งบริษัทในที่
    // เดียว — feed หน้า Dashboard รวมข้ามบริษัท (ไม่มี tenant_id) ไม่ต้องรวม
    if (!req.query.tenant_id) return ok(list)
    const employeeFeed = await getMergedAuditFeed(req.query.tenant_id, { limit })
    const merged = [
      ...list.map((a: any) => ({ id: a.id, action: a.action, actor_name: a.actor_name, message: a.message, created_at: a.created_at })),
      ...employeeFeed.map(e => ({ id: e.id, action: e.action, actor_name: e.actor_name, message: e.message, created_at: e.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit)
    return ok(merged)
  })
}
