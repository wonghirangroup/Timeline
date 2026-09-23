// server/src/modules/offsite/offsite.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireFeature }   from '../../common/middleware/feature'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission, requirePermissionAny } from '../../common/middleware/permission'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok, fail }         from '../../common/utils/response'
import { listOffsiteCheckins, createOffsiteCheckin, checkOutOffsiteCheckin, createOffsiteCheckinByAdmin, updateOffsiteCheckin, deleteOffsiteCheckin } from './offsite.service'

export async function offsiteRoutes(app: FastifyInstance) {

  // ── Admin/Manager/DEPT_HEAD: ดูรายการเช็คอินนอกสถานที่ ─────────────
  app.get('/admin/offsite-checkins', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), requirePermissionAny([
      { feature: 'offsite', action: 'view' }, { feature: 'report_checkin', action: 'view' },
    ]), resolveDeptScope, requireFeature('gps_checkin')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูรายการเช็คอินนอกสถานที่ (กรอง branchId / employeeId / status=active ได้ — DEPT_HEAD เห็นแค่แผนกที่ดูแล)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: {
          branchId:   { type: 'string' },
          employeeId: { type: 'string' },
          status:     { type: 'string', enum: ['active'], description: 'active = เฉพาะที่ยังไม่เช็คเอาต์ (กำลังนอกสถานที่ตอนนี้)' },
        },
      },
    },
  }, async (req: any) => {
    const list = await listOffsiteCheckins(req.tenantId, {
      branchId: req.query.branchId, employeeId: req.query.employeeId,
      activeOnly: req.query.status === 'active',
      scopedEmployeeIds: req.scopedEmployeeIds,
    })
    return ok(list)
  })

  // ── Admin/Manager: เพิ่มรายการเช็คอินนอกสถานที่ด้วยมือ (feedback 2026-09-23
  // — บันทึกย้อนหลัง/แทนพนักงานที่ลืมเช็คอิน ไม่ใช่ GPS จริงของพนักงาน) ───────
  app.post('/admin/offsite-checkins', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('offsite', 'add'), requireFeature('gps_checkin')],
    schema: {
      tags: ['Admin'],
      summary: 'เพิ่มรายการเช็คอินนอกสถานที่ด้วยมือ (แอดมินบันทึกแทน ไม่ใช่ GPS พนักงาน)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'check_in_date', 'check_in_time'],
        properties: {
          employee_id:       { type: 'string' },
          check_in_date:     { type: 'string', description: 'YYYY-MM-DD' },
          check_in_time:     { type: 'string', description: 'HH:mm' },
          check_in_address:  { type: 'string' },
          check_out_date:    { type: 'string', description: 'YYYY-MM-DD' },
          check_out_time:    { type: 'string', description: 'HH:mm' },
          check_out_address: { type: 'string' },
          note:              { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const record = await createOffsiteCheckinByAdmin(req.tenantId, req.body)
      return reply.code(201).send(ok(record, 'เพิ่มรายการเช็คอินนอกสถานที่สำเร็จ'))
    } catch (e: any) {
      if (e.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
      throw e
    }
  })

  // ── Admin/Manager: แก้ไขรายการเช็คอินนอกสถานที่ ────────────────────
  app.patch('/admin/offsite-checkins/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('offsite', 'edit'), requireFeature('gps_checkin')],
    schema: {
      tags: ['Admin'],
      summary: 'แก้ไขรายการเช็คอินนอกสถานที่ (เวลา/ที่อยู่/หมายเหตุ)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          check_in_date:     { type: 'string', description: 'YYYY-MM-DD' },
          check_in_time:     { type: 'string', description: 'HH:mm' },
          check_in_address:  { type: 'string' },
          check_out_date:    { type: ['string', 'null'], description: 'YYYY-MM-DD — ส่ง null พร้อม check_out_time เพื่อล้างเวลาเช็คเอาต์' },
          check_out_time:    { type: ['string', 'null'], description: 'HH:mm' },
          check_out_address: { type: 'string' },
          note:              { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const record = await updateOffsiteCheckin(req.tenantId, req.params.id, req.body)
    if (!record) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(record, 'บันทึกการแก้ไขเรียบร้อย')
  })

  // ── Admin/Manager: ลบรายการเช็คอินนอกสถานที่ ───────────────────────
  app.delete('/admin/offsite-checkins/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('offsite', 'delete'), requireFeature('gps_checkin')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบรายการเช็คอินนอกสถานที่',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const success = await deleteOffsiteCheckin(req.tenantId, req.params.id)
    if (!success) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
    return ok(null, 'ลบรายการเรียบร้อย')
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
      if (e.message === 'NOT_ALLOWED') {
        return reply.code(403).send(fail('NOT_ALLOWED', 'คุณไม่มีสิทธิ์เช็คอินนอกสถานที่ — ติดต่อแอดมิน'))
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
