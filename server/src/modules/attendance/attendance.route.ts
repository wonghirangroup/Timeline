// server/src/modules/attendance/attendance.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import {
  getAttendanceReport, createManualAttendance, updateAttendanceTime,
  checkIn, checkOut, getEmployeeHistory,
} from './attendance.service'

export async function attendanceRoutes(app: FastifyInstance) {

  // ── Admin: รายงานเช็คชื่อ ─────────────────────────────────────────
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

  // ── Admin: ลงเวลาแทนพนักงาน (manual) ────────────────────────────
  app.post('/admin/attendance', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'Admin ลงเวลาแทนพนักงาน',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'shift_id', 'date'],
        properties: {
          employee_id:  { type: 'string' },
          shift_id:     { type: 'string' },
          date:         { type: 'string', description: 'YYYY-MM-DD' },
          check_in_at:  { type: 'string', description: 'HH:mm' },
          check_out_at: { type: 'string', description: 'HH:mm' },
          note:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await createManualAttendance(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'ลงเวลาสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN' || e.code === 'P2002') {
        return reply.code(409).send(fail('ALREADY_CHECKED_IN', 'พนักงานนี้มีบันทึกในกะนี้แล้ว'))
      }
      throw e
    }
  })

  // ── Admin: แก้ไขเวลาเช็คอิน/เช็คเอาต์ ───────────────────────────
  app.patch('/admin/attendance/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขเวลาเช็คอิน/เช็คเอาต์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          check_in_at:  { type: 'string', description: 'HH:mm' },
          check_out_at: { type: 'string', description: 'HH:mm' },
          note:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const record = await updateAttendanceTime(req.tenantId, req.params.id, req.body)
    if (!record) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบบันทึก'))
    return ok(record, 'แก้ไขเวลาสำเร็จ')
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
      if (e.message === 'NOT_CHECKED_IN')      return reply.code(400).send(fail('NOT_CHECKED_IN', 'ยังไม่ได้เช็คอินในกะนี้'))
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
