// server/src/modules/shift/shift.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { prisma } from '../../common/utils/prisma'
import {
  listShifts, getShift, createShift, updateShift, deleteShift,
  listEmployeesInShift, assignEmployeeToShift, removeEmployeeFromShift,
} from './shift.service'

const TAG = 'Admin'

export async function shiftRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/shifts?branchId=
  app.get('/shifts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
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
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
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
          late_threshold_2: { type: 'string', description: 'HH:mm สายระดับ 2' },
          late_fine_1:      { type: ['number', 'null'], description: 'ค่าปรับสายระดับ 1 (บาท)' },
          late_fine_2:      { type: ['number', 'null'], description: 'ค่าปรับสายระดับ 2 (บาท)' },
          absent_threshold: { type: 'string', description: 'HH:mm เช็คอินหลังเวลานี้ = นับว่าขาด (ยังเช็คอินได้)' },
          absent_fine:      { type: ['number', 'null'], description: 'ค่าปรับที่จะถูกหักในวันที่มาเช็คอินถัดไป' },
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
          absent_threshold: { type: 'string' },
          absent_fine:      { type: ['number', 'null'] },
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

  // ── พนักงาน ↔ กะ (many-to-many) — 1 คนอยู่ได้หลายกะ ────────────────────

  // GET /api/v1/admin/employee-shifts — ทุก link ของ tenant (สำหรับ build map ฝั่ง frontend)
  app.get('/employee-shifts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการพนักงาน↔กะทั้งหมดของ tenant (ใช้ทำแผนที่ใครอยู่กะไหนบ้าง)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => {
    const links = await prisma.employeeShift.findMany({
      where: { tenant_id: req.tenantId },
      select: { employee_id: true, shift_id: true },
    })
    return ok(links)
  })

  // GET /api/v1/admin/shifts/:id/employees
  app.get('/shifts/:id/employees', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: {
      tags: [TAG], summary: 'ดูพนักงานที่อยู่ในกะนี้', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any) => ok(await listEmployeesInShift(req.tenantId, req.params.id)))

  // POST /api/v1/admin/shifts/:id/employees — เพิ่มพนักงานเข้ากะ (ไม่เอาออกจากกะอื่น)
  app.post('/shifts/:id/employees', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG], summary: 'เพิ่มพนักงานเข้ากะ (คนเดิมอยู่หลายกะพร้อมกันได้)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const result = await assignEmployeeToShift(req.tenantId, req.body.employee_id, req.params.id)
      return reply.code(201).send(ok(result, 'เพิ่มพนักงานเข้ากะสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
      if (e.message === 'SHIFT_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกะ'))
      throw e
    }
  })

  // DELETE /api/v1/admin/shifts/:id/employees/:employeeId — เอาออกจากกะนี้ (กะอื่นไม่กระทบ)
  app.delete('/shifts/:id/employees/:employeeId', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG], summary: 'เอาพนักงานออกจากกะนี้', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' }, employeeId: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const removed = await removeEmployeeFromShift(req.tenantId, req.params.employeeId, req.params.id)
    if (!removed) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'เอาออกจากกะสำเร็จ')
  })
}
