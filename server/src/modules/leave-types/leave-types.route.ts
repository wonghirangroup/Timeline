// server/src/modules/leave-types/leave-types.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requireFeature }   from '../../common/middleware/feature'
import { ok, fail }         from '../../common/utils/response'
import * as svc             from './leave-types.service'

export async function leaveTypesRoutes(app: FastifyInstance) {

  // ═══ ประเภทการลาที่กำหนดเอง (feature: custom_leave_types) ═══════════════
  // GET เปิดให้ทุก role อ่านได้ (LIFF ใช้ผ่าน endpoint แยกด้านล่าง)
  app.get('/admin/leave-types', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'), requireFeature('custom_leave_types')],
    schema: { tags: ['Admin'], summary: 'ประเภทการลาที่กำหนดเอง', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { includeInactive: { type: 'boolean' } } } },
  }, async (req: any) => ok(await svc.listLeaveTypes(req.tenantId, req.query.includeInactive === true)))

  app.post('/admin/leave-types', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('custom_leave_types')],
    schema: {
      tags: ['Admin'], summary: 'เพิ่มประเภทการลา', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1 }, color: { type: 'string' }, default_days: { type: 'number' }, paid: { type: 'boolean' }, deducts_quota: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => reply.code(201).send(ok(await svc.createLeaveType(req.tenantId, req.body), 'เพิ่มประเภทการลาแล้ว')))

  app.patch('/admin/leave-types/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('custom_leave_types')],
    schema: { tags: ['Admin'], summary: 'แก้ไขประเภทการลา', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } }, body: { type: 'object', additionalProperties: true } },
  }, async (req: any, reply) => {
    const r = await svc.updateLeaveType(req.tenantId, req.params.id, req.body)
    return r ? ok(r, 'บันทึกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบประเภทการลา'))
  })

  app.delete('/admin/leave-types/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('custom_leave_types')],
    schema: { tags: ['Admin'], summary: 'ปิดใช้งานประเภทการลา (ไม่ลบจริง — มีประวัติผูกอยู่)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.deactivateLeaveType(req.tenantId, req.params.id)
    return done ? ok(null, 'ปิดใช้งานแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ'))
  })

  // LIFF: พนักงานดูประเภทการลาที่กำหนดเอง (สำหรับฟอร์มขอลา)
  app.get('/employee/leave-types', {
    preHandler: [tenantMiddleware, requireFeature('custom_leave_types')],
    schema: { tags: ['Employee'], summary: 'ประเภทการลาที่กำหนดเอง (LIFF)', security: [{ oauth2: [] }] },
  }, async (req: any) => ok(await svc.listLeaveTypes(req.tenantId, false)))

  // ═══ กติกาสะสมวันลา (feature: leave_accrual) ═══════════════════════════
  app.get('/admin/leave-accrual', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('leave_accrual')],
    schema: { tags: ['Admin'], summary: 'กติกาสะสมวันลา', security: [{ oauth2: [] }] },
  }, async (req: any) => ok(await svc.listAccrualRules(req.tenantId)))

  app.put('/admin/leave-accrual', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_accrual')],
    schema: {
      tags: ['Admin'], summary: 'ตั้ง/แก้กติกาสะสมของประเภทหนึ่ง', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['leave_type'],
        properties: {
          leave_type: { type: 'string' }, custom_type_id: { type: 'string', nullable: true },
          days_per_month: { type: 'number' }, max_balance: { type: 'number', nullable: true }, max_carryover: { type: 'number', nullable: true },
          start_after_probation: { type: 'boolean' }, active: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    try { return ok(await svc.upsertAccrualRule(req.tenantId, req.body), 'บันทึกกติกาแล้ว') }
    catch (e: any) { return reply.code(400).send(fail(e.message, 'บันทึกไม่สำเร็จ')) }
  })

  app.delete('/admin/leave-accrual/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_accrual')],
    schema: { tags: ['Admin'], summary: 'ลบกติกาสะสม', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.deleteAccrualRule(req.tenantId, req.params.id)
    return done ? ok(null, 'ลบแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ'))
  })

  // ประมวลผลสะสม 1 เดือน — ปุ่มของแอดมิน (ยังไม่มี cron อัตโนมัติ)
  app.post('/admin/leave-accrual/run', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_accrual')],
    schema: { tags: ['Admin'], summary: 'ประมวลผลสะสมวันลาของเดือนนี้ (หรือเดือนที่ระบุ)', security: [{ oauth2: [] }], body: { type: 'object', properties: { ym: { type: 'string', description: 'YYYY-MM (default = เดือนนี้)' } } } },
  }, async (req: any) => {
    const r = await svc.runAccrualForMonth(req.tenantId, req.body?.ym)
    return ok(r, `ประมวลผลเดือน ${r.ranMonth} — อัปเดต ${r.balancesUpdated} รายการ (${r.rulesRun} กติกา)${r.skippedAlreadyRun ? ` · ข้าม ${r.skippedAlreadyRun} กติกาที่รันเดือนนี้ไปแล้ว` : ''}`)
  })

  // ยกยอดข้ามปี
  app.post('/admin/leave-accrual/carryover', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('leave_accrual')],
    schema: { tags: ['Admin'], summary: 'ยกยอดวันลาคงเหลือจากปีก่อนเข้าปีที่ระบุ', security: [{ oauth2: [] }], body: { type: 'object', required: ['toYear'], properties: { toYear: { type: 'integer' } } } },
  }, async (req: any) => {
    const r = await svc.carryOverToYear(req.tenantId, req.body.toYear)
    return ok(r, `ยกยอดเข้าปี ${r.toYear} — ${r.carried} รายการ`)
  })
}
