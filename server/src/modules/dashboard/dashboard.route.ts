// server/src/modules/dashboard/dashboard.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok }                from '../../common/utils/response'
import { getDashboardSummary } from './dashboard.service'

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/dashboard/summary — KPI ตามช่วงวันที่ (DEPT_HEAD เห็นแค่แผนกที่ดูแล)
  app.get('/dashboard/summary', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope],
    schema: {
      tags: ['Admin'],
      summary: 'สรุป KPI ตามช่วงวันที่: มาสาย+รายชื่อ, ลาออก, เข้าใหม่, พนักงานทั้งหมด',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate:   { type: 'string', description: 'YYYY-MM-DD' },
          branchId:  { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    const summary = await getDashboardSummary(req.tenantId, {
      startDate: req.query.startDate,
      endDate:   req.query.endDate,
      branchId:  req.query.branchId,
      scopedEmployeeIds: req.scopedEmployeeIds,
    })
    return ok(summary)
  })
}
