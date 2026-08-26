// server/src/modules/shift-assignment/shift-assignment.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listShiftAssignments, upsertShiftAssignment, deleteShiftAssignment } from './shift-assignment.service'

const TAG = 'Admin'

export async function shiftAssignmentRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/shift-assignments?month=&branchId=
  app.get('/shift-assignments', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: {
      tags: [TAG],
      summary: 'ดู override ตารางกะ (กรอง month / branchId)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { month: { type: 'string', description: 'YYYY-MM' }, branchId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    return ok(await listShiftAssignments(req.tenantId, { month: req.query.month, branchId: req.query.branchId }))
  })

  // PUT /api/v1/admin/shift-assignments — ตั้ง/แก้ override เฉพาะวัน
  app.put('/shift-assignments', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ตั้ง/แก้ override ตารางกะเฉพาะวัน (manual correction — ไม่กระทบ leave/weekly-off จริง)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'date', 'type'],
        properties: {
          employee_id: { type: 'string' },
          date:        { type: 'string', description: 'YYYY-MM-DD' },
          shift_id:    { type: ['string', 'null'] },
          type:        { type: 'string', enum: ['WORK', 'DAY_OFF', 'WEEKLY_OFF', 'HOLIDAY'] },
          note:        { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const result = await upsertShiftAssignment(req.tenantId, { ...req.body, created_by: req.userId })
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok(result, 'บันทึกสำเร็จ')
  })

  // DELETE /api/v1/admin/shift-assignments/:employeeId/:date — ล้าง override กลับไปใช้กะประจำ
  app.delete('/shift-assignments/:employeeId/:date', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบ override กลับไปใช้กะประจำ (คำนวณจาก default/leave/weekly-off จริง)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { employeeId: { type: 'string' }, date: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteShiftAssignment(req.tenantId, req.params.employeeId, req.params.date)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ลบสำเร็จ')
  })
}
