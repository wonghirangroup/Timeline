// server/src/modules/ot/ot.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireFeature }   from '../../common/middleware/feature'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok, fail }         from '../../common/utils/response'
import { listOtRequests, createOtRequest, approveOtRequest, rejectOtRequest } from './ot.service'

export async function otRoutes(app: FastifyInstance) {

  // ── Admin/Manager/DEPT_HEAD: ดู OT ─────────────────────────────────
  app.get('/admin/ot-requests', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope, requireFeature('ot_management')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายการขอ OT (กรอง status / branchId / employeeId ได้ — DEPT_HEAD เห็นแค่แผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          status:     { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    const list = await listOtRequests(req.tenantId, {
      status: req.query.status, branchId: req.query.branchId, employeeId: req.query.employeeId,
      scopedEmployeeIds: req.scopedEmployeeIds,
    })
    return ok(list)
  })

  // ── Admin/Manager/DEPT_HEAD: Approve OT ────────────────────────────
  app.post('/admin/ot-requests/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('ot_management')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติ OT (DEPT_HEAD อนุมัติได้แค่คนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const ok_ = await approveOtRequest(req.tenantId, req.params.id, req.userId!, req.scopedEmployeeIds)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(null, 'อนุมัติ OT สำเร็จ')
  })

  // ── Admin/Manager/DEPT_HEAD: Reject OT ─────────────────────────────
  app.post('/admin/ot-requests/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('ot_management')],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธ OT (DEPT_HEAD ปฏิเสธได้แค่คนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: { reject_note: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const ok_ = await rejectOtRequest(req.tenantId, req.params.id, req.userId!, req.body?.reject_note, req.scopedEmployeeIds)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(null, 'ปฏิเสธ OT แล้ว')
  })

  // ── Employee (LIFF): ยื่นขอ OT ───────────────────────────────────
  app.post('/employee/ot-requests', {
    preHandler: [tenantMiddleware, requireFeature('ot_management')],
    schema: {
      tags: ['Employee'],
      summary: 'ยื่นขอ OT (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'date', 'start_time', 'end_time', 'hours'],
        properties: {
          employee_id: { type: 'string' },
          date:        { type: 'string', description: 'YYYY-MM-DD' },
          start_time:  { type: 'string', description: 'HH:mm' },
          end_time:    { type: 'string', description: 'HH:mm' },
          hours:       { type: 'number' },
          reason:      { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const request = await createOtRequest(req.tenantId, req.body)
    return reply.code(201).send(ok(request, 'ยื่นขอ OT สำเร็จ'))
  })

  // ── Employee (LIFF): ดูประวัติ OT ────────────────────────────────
  app.get('/employee/ot-requests', {
    preHandler: [tenantMiddleware, requireFeature('ot_management')],
    schema: {
      tags: ['Employee'],
      summary: 'ดูประวัติขอ OT ของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const list = await listOtRequests(req.tenantId, { employeeId: req.query.employeeId })
    return ok(list)
  })
}
