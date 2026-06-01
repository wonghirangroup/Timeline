// server/src/modules/employee/employee-me.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { ok, fail }         from '../../common/utils/response'
import { prisma }           from '../../common/utils/prisma'

export async function employeeMeRoutes(app: FastifyInstance) {

  // GET /api/v1/employee/me
  // ดึงข้อมูล employee + กะที่สังกัด จาก JWT (employee_id + tenant_id)
  app.get('/employee/me', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูข้อมูลตัวเอง + กะที่สังกัด (LIFF)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any, reply) => {
    const employeeId = req.employeeId
    if (!employeeId) return reply.code(401).send(fail('UNAUTHORIZED', 'ไม่พบข้อมูล employee'))

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      include: { branch: { select: { id: true, name: true } } },
    })
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))

    // ดึงกะของสาขาที่พนักงานสังกัด
    const shifts = await prisma.shift.findMany({
      where: { branch_id: employee.branch_id, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      orderBy: { start_time: 'asc' },
      select: { id: true, name: true, start_time: true, end_time: true, late_threshold_1: true, late_threshold_2: true },
    })

    return ok({ employee, shifts })
  })
}
