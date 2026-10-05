// server/src/modules/audit-log/audit-log.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok }                from '../../common/utils/response'
import { getMergedAuditFeed, listAdminActivity } from './audit-log.service'

export async function auditLogRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/audit-log/activity — การกดที่เปลี่ยนข้อมูลของแอดมินแต่ละคน (POST/PUT/PATCH/DELETE: เพิ่ม/แก้ไข/ลบ/อนุมัติ/ลงวันลา-หยุด)
  // เห็นได้เฉพาะ SUPER_ADMIN / ADMIN (มีข้อมูล URL/body ของคนอื่น)
  app.get('/audit-log/activity', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'การกระทำของแอดมิน — เพิ่ม/แก้ไข/ลบ/อนุมัติ/ลงวันลา-หยุด',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['POST', 'PUT', 'PATCH', 'DELETE'] },
          user_id: { type: 'string' }, search: { type: 'string', maxLength: 100 },
          from: { type: 'string' }, to: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 200 }, offset: { type: 'integer', minimum: 0 },
        },
      },
    },
  }, async (req: any) => {
    const q = req.query
    return ok(await listAdminActivity(req.tenantId, {
      method: q.method, userId: q.user_id, search: q.search, from: q.from, to: q.to,
      limit: q.limit ?? 50, offset: q.offset ?? 0,
    }))
  })

  // GET /api/v1/admin/audit-log?branch_id=&limit= — feed "เพิ่ม/ลบ/แก้ไข/
  // แจ้งเตือน" ของพนักงาน (feedback 2026-09-28) — ไม่ส่ง branch_id = เห็นทุกสาขา
  // ในบริษัทตัวเอง, ส่งมา = กรองเฉพาะสาขานั้น (frontend ตั้ง default เป็นสาขา
  // ตัวเองให้ผู้ใช้งานทั่วไป แต่ปรับดูสาขาอื่นได้ถ้ามีสิทธิ์เห็นอยู่แล้ว)
  app.get('/audit-log', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD')],
    schema: {
      tags: ['Admin'],
      summary: 'บันทึกกิจกรรมพนักงาน — เพิ่ม/ลบ/แก้ไขข้อมูล และแจ้งเตือนที่ส่งถึงพนักงาน',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { branch_id: { type: 'string' }, limit: { type: 'integer' } } },
    },
  }, async (req: any) => {
    const limit = Math.min(req.query.limit ? Number(req.query.limit) : 50, 200)
    const list = await getMergedAuditFeed(req.tenantId, { branchId: req.query.branch_id, limit })
    return ok(list)
  })
}
