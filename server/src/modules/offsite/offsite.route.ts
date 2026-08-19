// server/src/modules/offsite/offsite.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireFeature }   from '../../common/middleware/feature'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listOffsiteCheckins, createOffsiteCheckin, checkOutOffsiteCheckin } from './offsite.service'

export async function offsiteRoutes(app: FastifyInstance) {

  // ── Admin/Manager: ดูรายการเช็คอินนอกสถานที่ ──────────────────────
  app.get('/admin/offsite-checkins', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('gps_checkin')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายการเช็คอินนอกสถานที่ (กรอง branchId / employeeId ได้)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    const list = await listOffsiteCheckins(req.tenantId, {
      branchId: req.query.branchId, employeeId: req.query.employeeId,
    })
    return ok(list)
  })

  // ── Employee (LIFF): ปักหมุดเช็คอินนอกสถานที่ ─────────────────────
  app.post('/employee/offsite-checkins', {
    preHandler: [tenantMiddleware, requireFeature('gps_checkin')],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คอินนอกสถานที่ (ปักหมุด GPS + เวลา) — ไม่ผูกกับกะ/เวลาเข้างานปกติ',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'lat', 'lng'],
        properties: {
          employee_id: { type: 'string' },
          lat:         { type: 'number' },
          lng:         { type: 'number' },
          note:        { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await createOffsiteCheckin(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'เช็คอินนอกสถานที่สำเร็จ'))
    } catch (e: any) {
      if (e.message === 'ALREADY_CHECKED_IN') {
        return reply.code(400).send(fail('ALREADY_CHECKED_IN', 'มีการเช็คอินนอกสถานที่ที่ยังไม่เช็คเอาต์อยู่'))
      }
      throw e
    }
  })

  // ── Employee (LIFF): เช็คเอาต์นอกสถานที่ ──────────────────────────
  app.patch('/employee/offsite-checkins/:id/check-out', {
    preHandler: [tenantMiddleware, requireFeature('gps_checkin')],
    schema: {
      tags: ['Employee'],
      summary: 'เช็คเอาต์นอกสถานที่ (ปักหมุด GPS + เวลา)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['employee_id', 'lat', 'lng'],
        properties: {
          employee_id: { type: 'string' },
          lat:         { type: 'number' },
          lng:         { type: 'number' },
        },
      },
    },
  }, async (req: any, reply) => {
    const record = await checkOutOffsiteCheckin(req.tenantId, req.params.id, req.body.employee_id, req.body)
    if (!record) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ หรือเช็คเอาต์ไปแล้ว'))
    return ok(record, 'เช็คเอาต์นอกสถานที่สำเร็จ')
  })

  // ── Employee (LIFF): ดูประวัติ/สถานะปัจจุบันของตัวเอง ──────────────
  app.get('/employee/offsite-checkins', {
    preHandler: [tenantMiddleware, requireFeature('gps_checkin')],
    schema: {
      tags: ['Employee'],
      summary: 'ดูประวัติเช็คอินนอกสถานที่ของตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const list = await listOffsiteCheckins(req.tenantId, { employeeId: req.query.employeeId })
    return ok(list)
  })
}
