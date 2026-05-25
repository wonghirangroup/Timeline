// server/src/modules/attendance/attendance.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { getAttendanceReport, checkIn, checkOut, getEmployeeHistory } from './attendance.service'

export async function attendanceRoutes(app: FastifyInstance) {

  // ── Admin/Manager: รายงานเช็คชื่อ ────────────────────────────────
  app.get('/admin/attendance', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'รายงานการเช็คชื่อ (กรอง date / branchId / employeeId ได้)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          date:       { type: 'string', description: 'YYYY-MM-DD' },
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    const records = await getAttendanceReport(req.tenantId, {
      date:       req.query.date,
      branchId:   req.query.branchId,
      employeeId: req.query.employeeId,
    })
    return ok(records)
  })

  // ── Employee (LIFF): Check-in ─────────────────────────────────────
  app.post('/employee/attendance/check-in', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คอิน (LIFF only)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id'],
        properties: {
          employee_id: { type: 'string' },
          shift_id:    { type: 'string' },
          note:        { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await checkIn(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'เช็คอินสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN') {
        return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'เช็คอินในกะนี้แล้ว'))
      }
      throw e
    }
  })

  // ── Employee (LIFF): Check-out ────────────────────────────────────
  app.post('/employee/attendance/check-out', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คเอาต์ (LIFF only)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id'],
        properties: {
          employee_id: { type: 'string' },
          shift_id:    { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await checkOut(req.tenantId, req.body)
      return ok(record, 'เช็คเอาต์สำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_CHECKED_IN')     return reply.code(400).send(fail('NOT_CHECKED_IN', 'ยังไม่ได้เช็คอินในกะนี้'))
      if (e.message === 'ALREADY_CHECKED_OUT') return reply.code(409).send(fail('ALREADY_CHECKED_OUT', 'เช็คเอาต์แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ประวัติของตัวเอง ────────────────────────────
  app.get('/employee/attendance/history', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ประวัติการเช็คชื่อ 30 วันล่าสุด (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const history = await getEmployeeHistory(req.tenantId, req.query.employeeId)
    return ok(history)
  })
}
