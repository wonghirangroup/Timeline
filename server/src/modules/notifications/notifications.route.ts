// server/src/modules/notifications/notifications.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission } from '../../common/middleware/permission'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok }               from '../../common/utils/response'
import { listAdminNotifications } from './notifications.service'
import { listLineMessageLogs } from './line-log.service'

export async function notificationRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/notifications — กระดิ่งแจ้งเตือนรวม (DEPT_HEAD เห็นเฉพาะแผนกที่ดูแล)
  app.get('/notifications', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'รวมสิ่งที่แอดมินควรจัดการ: คำขอรออนุมัติ (ลา/OT/ลาออก/วันหยุด), ลาทับตำแหน่ง, เช็คอินวันหยุดที่จองเอง, เอกสารหมดอายุ, ครบทดลองงาน, สลับวันหยุด',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => ok(await listAdminNotifications(req.tenantId, req.scopedEmployeeIds)))

  // GET /api/v1/admin/line-message-logs — ประวัติการส่งข้อความ LINE ทั้งหมด (สำหรับรายงานการส่งข้อความไลน์)
  app.get('/line-message-logs', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requirePermission('report_line_messages', 'view')],
    schema: {
      tags: ['Admin'],
      summary: 'ประวัติการส่งข้อความ LINE (แจ้งเตือน/ประกาศ/แจ้งปัญหา/เปิดจองวันหยุด ฯลฯ)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate:   { type: 'string', description: 'YYYY-MM-DD' },
          category:  { type: 'string' },
        },
      },
    },
  }, async (req: any) => ok(await listLineMessageLogs(req.tenantId, {
    startDate: req.query.startDate, endDate: req.query.endDate, category: req.query.category,
  })))
}
