// server/src/modules/leave/leave.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { requireFeature }   from '../../common/middleware/feature'
import { ok, fail }         from '../../common/utils/response'
import { listLeaveRequests, getLeaveRequest, createLeaveRequest, updateLeaveRequest, approveLeaveRequest, rejectLeaveRequest, deleteLeaveRequest, getMonthColleagueLeaves } from './leave.service'
import { listLeaveBalances, upsertLeaveBalance, batchUpsertLeaveBalances, listEmployeesWithBalances } from './leave-balance.service'

export async function leaveRoutes(app: FastifyInstance) {

  // ── Admin/Manager: ดู Leave requests ─────────────────────────────
  app.get('/admin/leave-requests', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), resolveDeptScope, requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายการคำขอวันลาทั้งหมด (กรอง status / branchId / employeeId ได้ — DEPT_HEAD เห็นแค่แผนกที่ดูแล)',
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
      scopedEmployeeIds: req.scopedEmployeeIds,
    })
    return ok(requests)
  })

  // ── Admin/Manager/DEPT_HEAD: Approve ──────────────────────────────
  app.post('/admin/leave-requests/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติวันลา (DEPT_HEAD อนุมัติได้แค่คำขอของคนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await approveLeaveRequest(req.tenantId, req.params.id, req.userId!, req.scopedEmployeeIds)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(result, 'อนุมัติวันลาสำเร็จ')
  })

  // ── Admin/Manager/DEPT_HEAD: Reject ───────────────────────────────
  app.post('/admin/leave-requests/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธวันลา (DEPT_HEAD ปฏิเสธได้แค่คำขอของคนในแผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: { reject_note: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const ok_ = await rejectLeaveRequest(req.tenantId, req.params.id, req.userId!, req.body?.reject_note, req.scopedEmployeeIds)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือไม่อยู่ในสถานะ PENDING'))
    return ok(null, 'ปฏิเสธวันลาแล้ว')
  })

  // ── Admin: สร้างวันลาแทนพนักงาน (อนุมัติอัตโนมัติทันที) ────────────
  app.post('/admin/leave-requests', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'Admin สร้างคำขอวันลาแทนพนักงาน (อนุมัติอัตโนมัติ — คนลงคือคนอนุมัติอยู่แล้วในตัว)',
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
      const request = await createLeaveRequest(req.tenantId, { ...req.body, autoApprove: true, reviewedBy: req.userId })
      return reply.code(201).send(ok(request, 'สร้างคำขอวันลาสำเร็จ (อนุมัติอัตโนมัติ)'))
    } catch (e: any) {
      if (e.message === 'LEAVE_OVERLAP')       return reply.code(409).send(fail('LEAVE_OVERLAP', 'มีวันลาที่ทับซ้อนกันอยู่แล้ว'))
      if (e.message === 'INSUFFICIENT_BALANCE') return reply.code(400).send(fail('INSUFFICIENT_BALANCE', 'วันลาคงเหลือไม่เพียงพอ'))
      throw e
    }
  })

  // ── Admin: แก้ไขคำขอวันลา ────────────────────────────────────────
  app.patch('/admin/leave-requests/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขคำขอวันลา',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
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
      const result = await updateLeaveRequest(req.tenantId, req.params.id, req.body)
      if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ'))
      return ok(result, 'แก้ไขสำเร็จ')
    } catch (e: any) {
      if (e.message === 'LEAVE_OVERLAP') return reply.code(409).send(fail('LEAVE_OVERLAP', 'มีวันลาที่ทับซ้อนกันอยู่แล้ว'))
      throw e
    }
  })

  // ── Admin: ลบคำขอวันลา ───────────────────────────────────────────
  app.delete('/admin/leave-requests/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_management')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบคำขอวันลา (ถ้า APPROVED จะคืนวันลากลับ)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await deleteLeaveRequest(req.tenantId, req.params.id)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ'))
    return ok(null, 'ลบคำขอวันลาสำเร็จ')
  })

  // ── Employee (LIFF): ขอวันลา ──────────────────────────────────────
  app.post('/employee/leave-requests', {
    preHandler: [tenantMiddleware, requireFeature('leave_management')],
    schema: {
      tags: ['Employee'],
      summary: 'ยื่นคำขอวันลา (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'leave_type', 'start_date', 'end_date', 'days'],
        properties: {
          employee_id: { type: 'string' },
          // COMPENSATE เปิดให้พนักงานยื่นเองได้ (ผ่านหน้าจองวันหยุด → ใช้โควต้าพักร้อน/ชดเชย)
          // แต่ยังถูก gate ด้วย LeaveBalance เหมือนประเภทอื่น — ถ้าแอดมินไม่เคย grant โควต้า
          // ให้ (total_days=0) จะขอไม่ผ่านอยู่ดี (INSUFFICIENT_BALANCE)
          leave_type:  { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE'] },
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
      if (e.message === 'LEAVE_OVERLAP')       return reply.code(409).send(fail('LEAVE_OVERLAP', 'มีวันลาที่ทับซ้อนกันอยู่แล้ว'))
      if (e.message === 'INSUFFICIENT_BALANCE') return reply.code(400).send(fail('INSUFFICIENT_BALANCE', 'วันลาคงเหลือไม่เพียงพอ'))
      throw e
    }
  })

  // ── Employee (LIFF): เพื่อนตำแหน่ง/สาขาเดียวกันที่ลาทับเดือนนี้ ────
  // ใช้แสดงจุดสีบนปฏิทินหน้าจองวันหยุด (โหมดพักร้อน/ชดเชย) เหมือนวันหยุดประจำ
  app.get('/employee/leave-requests/colleagues', {
    preHandler: [tenantMiddleware, requireFeature('leave_management')],
    schema: {
      tags: ['Employee'],
      summary: 'ดูเพื่อนร่วมสาขา/ตำแหน่งที่ลาทับช่วงเดือนนี้ (LIFF) — สำหรับปฏิทินหน้าจองวันหยุด',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId', 'month'],
        properties: { employeeId: { type: 'string' }, month: { type: 'string', description: 'YYYY-MM' } },
      },
    },
  }, async (req: any) => ok(await getMonthColleagueLeaves(req.tenantId, req.query.employeeId, req.query.month)))

  // ── Employee (LIFF): ดูประวัติวันลาตัวเอง ─────────────────────────
  app.get('/employee/leave-requests', {
    preHandler: [tenantMiddleware, requireFeature('leave_management')],
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

  // GET /api/v1/admin/leave-balances/employees — พนักงานทุกคนพร้อม balance รวม
  app.get('/admin/leave-balances/employees', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('leave_balance')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูพนักงานทุกคนพร้อม leave balance ทุกประเภท (สำหรับหน้า leave-balance)',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { year: { type: 'integer' } } },
    },
  }, async (req: any) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear()
    const data = await listEmployeesWithBalances(req.tenantId, year)
    return ok(data)
  })

  // POST /api/v1/admin/leave-balances/batch — batch upsert
  app.post('/admin/leave-balances/batch', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_balance')],
    schema: {
      tags: ['Admin'],
      summary: 'Batch upsert leave balances (apply default / seniority)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['year', 'items'],
        properties: {
          year:  { type: 'integer' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['employee_id', 'leave_type', 'total_days'],
              properties: {
                employee_id: { type: 'string' },
                leave_type:  { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE'] },
                total_days:  { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (req: any) => {
    const { year, items } = req.body
    const result = await batchUpsertLeaveBalances(
      req.tenantId,
      items.map((i: any) => ({ ...i, year })),
    )
    return ok(result, `บันทึก ${result.count} รายการสำเร็จ`)
  })

  // GET /api/v1/admin/leave-balances
  app.get('/admin/leave-balances', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('leave_balance')],
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
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_balance')],
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
    preHandler: [tenantMiddleware, requireFeature('leave_balance')],
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
