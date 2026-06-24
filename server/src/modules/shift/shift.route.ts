// server/src/modules/shift/shift.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listShifts, getShift, createShift, updateShift, deleteShift } from './shift.service'

const TAG = 'Admin'

export async function shiftRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/shifts?branchId=
  app.get('/shifts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการกะทำงานทั้งหมด (กรองตาม branchId ได้)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const shifts = await listShifts(req.tenantId, req.query.branchId)
    return ok(shifts)
  })

  // GET /api/v1/admin/shifts/:id
  app.get('/shifts/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูข้อมูลกะตาม ID',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const shift = await getShift(req.tenantId, req.params.id)
    if (!shift) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกะ'))
    return ok(shift)
  })

  // POST /api/v1/admin/shifts
  app.post('/shifts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'สร้างกะใหม่',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['branch_id', 'name', 'start_time', 'end_time'],
        properties: {
          branch_id:       { type: 'string' },
          name:            { type: 'string' },
          start_time:      { type: 'string', description: 'HH:mm' },
          end_time:        { type: 'string', description: 'HH:mm' },
          min_checkout:    { type: 'string', description: 'HH:mm เช็คเอาท์ขั้นต่ำ' },
          late_threshold:  { type: 'integer', description: 'นาที (backward compat)' },
          late_threshold_1: { type: 'string', description: 'HH:mm สายระดับ 1' },
          late_threshold_2: { type: 'string', description: 'HH:mm สายระดับ 2 / ปิดรับเช็คอิน' },
          late_fine_1:      { type: ['number', 'null'], description: 'ค่าปรับสายระดับ 1 (บาท)' },
          late_fine_2:      { type: ['number', 'null'], description: 'ค่าปรับสายระดับ 2 (บาท)' },
          gps_radius:       { type: 'integer', description: 'รัศมีเช็คอิน (เมตร) — null ใช้ค่าสาขา' },
        },
      },
    },
  }, async (req: any, reply) => {
    const shift = await createShift(req.tenantId, req.body)
    return reply.code(201).send(ok(shift, 'สร้างกะสำเร็จ'))
  })

  // PATCH /api/v1/admin/shifts/:id
  app.patch('/shifts/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไขข้อมูลกะ',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name:             { type: 'string' },
          start_time:       { type: 'string' },
          end_time:         { type: 'string' },
          min_checkout:     { type: 'string' },
          late_threshold:   { type: 'integer' },
          late_threshold_1: { type: 'string' },
          late_threshold_2: { type: 'string' },
          late_fine_1:      { type: ['number', 'null'] },
          late_fine_2:      { type: ['number', 'null'] },
          gps_radius:       { type: ['integer', 'null'] },
          is_active:        { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const shift = await updateShift(req.tenantId, req.params.id, req.body)
    if (!shift) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกะ'))
    return ok(shift, 'อัปเดตกะสำเร็จ')
  })

  // DELETE /api/v1/admin/shifts/:id
  app.delete('/shifts/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบกะ (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteShift(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกะ'))
    return ok(null, 'ลบกะสำเร็จ')
  })
}
