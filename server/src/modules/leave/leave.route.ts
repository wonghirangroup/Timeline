// server/src/modules/leave/leave.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listLeaveRequests, getLeaveRequest, createLeaveRequest, approveLeaveRequest, rejectLeaveRequest } from './leave.service'
import { listLeaveBalances, upsertLeaveBalance } from './leave-balance.service'

export async function leaveRoutes(app: FastifyInstance) {

  // ── Admin/Manager: ดู Leave requests ─────────────────────────────
  app.get('/admin/leave-requests', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายการคำขอวันลาทั้งหมด (กรอง status / branchId / employeeId ได้)',
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
    const requests = await listLeaveRequests(req.tenantId, {
      status: req.query.status,
      branchId: req.query.branchId,
      employeeId: req.query.employeeId,
    })
    return ok(requests)
  })

  // ── Admin/Manager: Approve ────────────────────────────────────────
  app.post('/admin/leave-requests/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติวันลา',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await approveLeaveRequest(req.tenantId, req.params.id, req.userId!)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(result, 'อนุมัติวันลาสำเร็จ')
  })

  // ── Admin/Manager: Reject ─────────────────────────────────────────
  app.post('/admin/leave-requests/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธวันลา',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: { reject_note: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const ok_ = await rejectLeaveRequest(req.tenantId, req.params.id, req.userId!, req.body?.reject_note)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(null, 'ปฏิเสธวันลาแล้ว')
  })

  // ── Employee (LIFF): ขอวันลา ──────────────────────────────────────
  app.post('/employee/leave-requests', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ยื่นคำขอวันลา (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'leave_type', 'start_date', 'end_date', 'days'],
        properties: {
          employee_id: { type: 'string' },
          leave_type:  { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY'] },
          start_date:  { type: 'string', description: 'YYYY-MM-DD' },
          end_date:    { type: 'string', description: 'YYYY-MM-DD' },
          days:        { type: 'integer' },
          reason:      { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const request = await createLeaveRequest(req.tenantId, req.body)
      return reply.code(201).send(ok(request, 'ยื่นคำขอวันลาสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_BALANCE') {
        return reply.code(400).send(fail('INSUFFICIENT_BALANCE', 'วันลาคงเหลือไม่เพียงพอ'))
      }
      throw e
    }
  })

  // ── Employee (LIFF): ดูประวัติวันลาตัวเอง ─────────────────────────
  app.get('/employee/leave-requests', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูประวัติวันลาของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const requests = await listLeaveRequests(req.tenantId, { employeeId: req.query.employeeId })
    return ok(requests)
  })

  // ── Admin: Leave Balance ──────────────────────────────────────────

  // GET /api/v1/admin/leave-balances
  app.get('/admin/leave-balances', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูโควต้าวันลาของพนักงาน',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          employeeId: { type: 'string' },
          year:       { type: 'integer' },
        },
      },
    },
  }, async (req: any) => {
    const balances = await listLeaveBalances(req.tenantId, {
      employeeId: req.query.employeeId,
      year:       req.query.year ? Number(req.query.year) : undefined,
    })
    return ok(balances)
  })

  // PUT /api/v1/admin/leave-balances
  app.put('/admin/leave-balances', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'ตั้งค่าโควต้าวันลา (upsert)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'leave_type', 'year', 'total_days'],
        properties: {
          employee_id: { type: 'string' },
          leave_type:  { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY'] },
          year:        { type: 'integer' },
          total_days:  { type: 'integer' },
        },
      },
    },
  }, async (req: any) => {
    const balance = await upsertLeaveBalance(req.tenantId, req.body)
    return ok(balance, 'ตั้งค่าโควต้าสำเร็จ')
  })

  // ── Employee (LIFF): ดูวันลาคงเหลือ ─────────────────────────────

  // GET /api/v1/employee/leave-balances
  app.get('/employee/leave-balances', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูวันลาคงเหลือของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: {
          employeeId: { type: 'string' },
          year:       { type: 'integer' },
        },
      },
    },
  }, async (req: any) => {
    const balances = await listLeaveBalances(req.tenantId, {
      employeeId: req.query.employeeId,
      year:       req.query.year ? Number(req.query.year) : undefined,
    })
    return ok(balances)
  })
}
