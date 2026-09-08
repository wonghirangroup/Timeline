// server/src/modules/notifications/notifications.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok }               from '../../common/utils/response'
import { listAdminNotifications } from './notifications.service'

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
}
