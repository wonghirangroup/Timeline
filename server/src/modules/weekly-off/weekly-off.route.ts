// server/src/modules/weekly-off/weekly-off.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listWeeklyOff, createWeeklyOff, updateWeeklyOff, deleteWeeklyOff } from './weekly-off.service'

export async function weeklyOffRoutes(app: FastifyInstance) {

  // ── Admin: ดูรายการ weekly off ──────────────────────────────────────
  app.get('/admin/weekly-off', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูวันหยุดสัปดาห์ของพนักงาน (กรอง weekStart / branchId / status)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          weekStart:  { type: 'string', description: 'YYYY-MM-DD (วันใดก็ได้ในสัปดาห์นั้น)' },
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
          status:     { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
        },
      },
    },
  }, async (req: any) => {
    const list = await listWeeklyOff(req.tenantId, {
      weekStart:  req.query.weekStart,
      branchId:   req.query.branchId,
      employeeId: req.query.employeeId,
      status:     req.query.status,
    })
    return ok(list)
  })

  // ── Admin: เพิ่มวันหยุดให้พนักงาน ──────────────────────────────────
  app.post('/admin/weekly-off', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'Admin เพิ่มวันหยุดสัปดาห์ให้พนักงาน',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'week_start', 'day_of_week'],
        properties: {
          employee_id: { type: 'string' },
          week_start:  { type: 'string', description: 'YYYY-MM-DD' },
          day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createWeeklyOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'เพิ่มวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'พนักงานนี้มีวันหยุดในสัปดาห์นี้แล้ว'))
      throw e
    }
  })

  // ── Admin: Approve ───────────────────────────────────────────────────
  app.post('/admin/weekly-off/:id/approve', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'อนุมัติวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'APPROVED', reviewed_by: req.userId })
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(result, 'อนุมัติวันหยุดสำเร็จ')
  })

  // ── Admin: Reject ────────────────────────────────────────────────────
  app.post('/admin/weekly-off/:id/reject', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ปฏิเสธวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { reject_note: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, { status: 'REJECTED', reviewed_by: req.userId, reject_note: req.body?.reject_note })
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ปฏิเสธวันหยุดแล้ว')
  })

  // ── Admin: แก้ไขวัน (เปลี่ยน day_of_week) ───────────────────────────
  app.patch('/admin/weekly-off/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { day_of_week: { type: 'integer', minimum: 0, maximum: 6 } } },
    },
  }, async (req: any, reply) => {
    const result = await updateWeeklyOff(req.tenantId, req.params.id, req.body)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(result, 'แก้ไขสำเร็จ')
  })

  // ── Admin: ลบ ────────────────────────────────────────────────────────
  app.delete('/admin/weekly-off/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบวันหยุดสัปดาห์',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteWeeklyOff(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ลบสำเร็จ')
  })

  // ── Employee (LIFF): ขอวันหยุดสัปดาห์ ──────────────────────────────
  app.post('/employee/weekly-off', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ขอวันหยุดประจำสัปดาห์ (LIFF)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'week_start', 'day_of_week'],
        properties: {
          employee_id: { type: 'string' },
          week_start:  { type: 'string', description: 'YYYY-MM-DD' },
          day_of_week: { type: 'integer', minimum: 0, maximum: 6 },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createWeeklyOff(req.tenantId, req.body)
      return reply.code(201).send(ok(result, 'ส่งคำขอวันหยุดสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_REQUESTED') return reply.code(409).send(fail('ALREADY_REQUESTED', 'มีการขอวันหยุดสัปดาห์นี้แล้ว'))
      throw e
    }
  })

  // ── Employee (LIFF): ดูประวัติ weekly off ──────────────────────────
  app.get('/employee/weekly-off', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูประวัติวันหยุดสัปดาห์ของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const list = await listWeeklyOff(req.tenantId, { employeeId: req.query.employeeId })
    return ok(list)
  })
}
