// server/src/modules/hr-lifecycle/hr-lifecycle.route.ts
// เอกสารพนักงาน / ทดลองงาน / หนังสือเตือน / ลาออก — Tier A (2026-09-08)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { requireFeature }   from '../../common/middleware/feature'
import { ok, fail }         from '../../common/utils/response'
import * as svc             from './hr-lifecycle.service'
import { notifyAdminsLine } from '../notifications/line-push.service'

const ADMIN_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'] as const
const READ_ROLES   = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'] as const

export async function hrLifecycleRoutes(app: FastifyInstance) {

  // ═══ เอกสารพนักงาน (feature: employee_documents) ═══════════════════════════
  app.get('/admin/employees/:id/documents', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope, requireFeature('employee_documents')],
    schema: { tags: ['Admin'], summary: 'เอกสารของพนักงาน', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any) => ok(await svc.listEmployeeDocuments(req.tenantId, req.params.id, req.scopedEmployeeIds)))

  app.post('/admin/employees/:id/documents', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('employee_documents')],
    schema: {
      tags: ['Admin'], summary: 'เพิ่มเอกสารพนักงาน', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object', required: ['type', 'name', 'file_url'],
        properties: {
          type: { type: 'string', enum: svc.DOC_TYPES as unknown as string[] },
          name: { type: 'string', minLength: 1 }, file_url: { type: 'string' },
          issued_date: { type: 'string', nullable: true }, expiry_date: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const doc = await svc.createEmployeeDocument(req.tenantId, { ...req.body, employee_id: req.params.id, uploaded_by: req.userId }, req.scopedEmployeeIds)
      return reply.code(201).send(ok(doc, 'เพิ่มเอกสารแล้ว'))
    } catch (e: any) {
      return reply.code(e.message === 'OUT_OF_SCOPE' ? 403 : 400).send(fail('ERROR', e.message))
    }
  })

  app.patch('/admin/employee-documents/:docId', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), requireFeature('employee_documents')],
    schema: { tags: ['Admin'], summary: 'แก้ไขเอกสาร', security: [{ oauth2: [] }], params: { type: 'object', properties: { docId: { type: 'string' } } }, body: { type: 'object', additionalProperties: true } },
  }, async (req: any, reply) => {
    const r = await svc.updateEmployeeDocument(req.tenantId, req.params.docId, req.body)
    return r ? ok(r, 'บันทึกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเอกสาร'))
  })

  app.delete('/admin/employee-documents/:docId', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), requireFeature('employee_documents')],
    schema: { tags: ['Admin'], summary: 'ลบเอกสาร', security: [{ oauth2: [] }], params: { type: 'object', properties: { docId: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.deleteEmployeeDocument(req.tenantId, req.params.docId)
    return done ? ok(null, 'ลบแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเอกสาร'))
  })

  app.get('/admin/documents/expiring', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope, requireFeature('employee_documents')],
    schema: { tags: ['Admin'], summary: 'เอกสารใกล้หมดอายุ (การ์ดเตือน Dashboard)', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { days: { type: 'integer' } } } },
  }, async (req: any) => ok(await svc.listExpiringDocuments(req.tenantId, req.query.days ?? 45, req.scopedEmployeeIds)))

  // ═══ ทดลองงาน (feature: probation) ═══════════════════════════════════════
  app.patch('/admin/employees/:id/probation', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('probation')],
    schema: {
      tags: ['Admin'], summary: 'ตั้ง/ประเมินทดลองงาน', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          probation_end_date: { type: 'string', nullable: true },
          probation_result: { type: 'string', enum: ['PASS', 'FAIL'], nullable: true },
          probation_note: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const r = await svc.setProbation(req.tenantId, req.params.id, req.body, req.scopedEmployeeIds)
      return r ? ok(r, 'บันทึกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    } catch (e: any) {
      return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
    }
  })

  app.get('/admin/probation/due', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope, requireFeature('probation')],
    schema: { tags: ['Admin'], summary: 'ครบทดลองงานเร็วๆ นี้ (การ์ดเตือน Dashboard)', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { days: { type: 'integer' } } } },
  }, async (req: any) => ok(await svc.listProbationDue(req.tenantId, req.query.days ?? 14, req.scopedEmployeeIds)))

  // ═══ หนังสือเตือน (feature: disciplinary) ════════════════════════════════
  app.get('/admin/employees/:id/disciplinary', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope, requireFeature('disciplinary')],
    schema: { tags: ['Admin'], summary: 'หนังสือเตือนของพนักงาน', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any) => ok(await svc.listDisciplinary(req.tenantId, req.params.id, req.scopedEmployeeIds)))

  app.post('/admin/employees/:id/disciplinary', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('disciplinary')],
    schema: {
      tags: ['Admin'], summary: 'ออกหนังสือเตือน', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object', required: ['level', 'category', 'detail', 'incident_date'],
        properties: {
          level: { type: 'integer', minimum: 1, maximum: 3 },
          category: { type: 'string', enum: svc.DISC_CATEGORIES as unknown as string[] },
          detail: { type: 'string', minLength: 1 },
          incident_date: { type: 'string' },
          attachment_url: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const rec = await svc.createDisciplinary(req.tenantId, { ...req.body, employee_id: req.params.id, issued_by: req.userId }, req.scopedEmployeeIds)
      return reply.code(201).send(ok(rec, 'ออกหนังสือเตือนแล้ว'))
    } catch (e: any) {
      return reply.code(e.message === 'OUT_OF_SCOPE' ? 403 : 400).send(fail('ERROR', e.message))
    }
  })

  app.patch('/admin/disciplinary/:recId', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), requireFeature('disciplinary')],
    schema: { tags: ['Admin'], summary: 'แก้ไขหนังสือเตือน', security: [{ oauth2: [] }], params: { type: 'object', properties: { recId: { type: 'string' } } }, body: { type: 'object', additionalProperties: true } },
  }, async (req: any, reply) => {
    const r = await svc.updateDisciplinary(req.tenantId, req.params.recId, req.body)
    return r ? ok(r, 'บันทึกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
  })

  app.delete('/admin/disciplinary/:recId', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), requireFeature('disciplinary')],
    schema: { tags: ['Admin'], summary: 'ลบหนังสือเตือน', security: [{ oauth2: [] }], params: { type: 'object', properties: { recId: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.deleteDisciplinary(req.tenantId, req.params.recId)
    return done ? ok(null, 'ลบแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ'))
  })

  // LIFF: พนักงานดู + รับทราบหนังสือเตือนของตัวเอง
  app.get('/employee/disciplinary', {
    preHandler: [tenantMiddleware, requireFeature('disciplinary')],
    schema: { tags: ['Employee'], summary: 'หนังสือเตือนของฉัน (LIFF)', security: [{ oauth2: [] }], querystring: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } } },
  }, async (req: any) => ok(await svc.listOwnDisciplinary(req.tenantId, req.query.employee_id)))

  app.post('/employee/disciplinary/:recId/acknowledge', {
    preHandler: [tenantMiddleware, requireFeature('disciplinary')],
    schema: { tags: ['Employee'], summary: 'รับทราบหนังสือเตือน (LIFF)', security: [{ oauth2: [] }], params: { type: 'object', properties: { recId: { type: 'string' } } }, body: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.acknowledgeDisciplinary(req.tenantId, req.params.recId, req.body.employee_id)
    return done ? ok(null, 'รับทราบแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบรายการ หรือรับทราบไปแล้ว'))
  })

  // ═══ ลาออก (feature: resignation) ═══════════════════════════════════════
  app.get('/admin/resignations', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope, requireFeature('resignation')],
    schema: { tags: ['Admin'], summary: 'คำขอลาออก', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } } } },
  }, async (req: any) => ok(await svc.listResignations(req.tenantId, { status: req.query.status, scoped: req.scopedEmployeeIds })))

  app.post('/admin/resignations/:id/review', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), resolveDeptScope, requireFeature('resignation')],
    schema: {
      tags: ['Admin'], summary: 'อนุมัติ/ปฏิเสธคำขอลาออก (อนุมัติ = set สถานะ RESIGNED)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['approve'], properties: { approve: { type: 'boolean' }, reject_note: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const r = await svc.reviewResignation(req.tenantId, req.params.id, { ...req.body, reviewed_by: req.userId }, req.scopedEmployeeIds)
      return r ? ok(r, req.body.approve ? 'อนุมัติลาออกแล้ว' : 'ปฏิเสธคำขอลาออกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือดำเนินการไปแล้ว'))
    } catch (e: any) {
      return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
    }
  })

  // LIFF: พนักงานยื่นลาออก + ดูสถานะคำขอล่าสุด
  app.get('/employee/resignation', {
    preHandler: [tenantMiddleware, requireFeature('resignation')],
    schema: { tags: ['Employee'], summary: 'คำขอลาออกล่าสุดของฉัน (LIFF)', security: [{ oauth2: [] }], querystring: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } } },
  }, async (req: any) => ok(await svc.getOwnResignation(req.tenantId, req.query.employee_id)))

  app.post('/employee/resignation', {
    preHandler: [tenantMiddleware, requireFeature('resignation')],
    schema: {
      tags: ['Employee'], summary: 'ยื่นลาออก (LIFF)', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['employee_id', 'last_working_date'], properties: { employee_id: { type: 'string' }, last_working_date: { type: 'string' }, reason: { type: 'string', nullable: true } } },
    },
  }, async (req: any, reply) => {
    try {
      const { employee_id, last_working_date, reason } = req.body
      const r = await svc.createResignation(req.tenantId, { employee_id, last_working_date, reason })
      notifyAdminsLine(req.tenantId, employee_id, {
        title: 'คำขอลาออกรอพิจารณา',
        detail: `วันทำงานสุดท้าย ${last_working_date}`,
        color: '#DC2626',
        path: `/resignations?approve=${r.id}`,
      })
      return reply.code(201).send(ok({ id: r.id }, 'ยื่นคำขอลาออกแล้ว รอผู้ดูแลอนุมัติ'))
    } catch (e: any) {
      return reply.code(e.message === 'ALREADY_PENDING' ? 409 : 400).send(fail(e.message, e.message === 'ALREADY_PENDING' ? 'มีคำขอลาออกที่รออนุมัติอยู่แล้ว' : 'ยื่นไม่สำเร็จ'))
    }
  })
}
