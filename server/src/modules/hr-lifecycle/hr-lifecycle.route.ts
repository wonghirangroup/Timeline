// server/src/modules/hr-lifecycle/hr-lifecycle.route.ts
// เอกสารพนักงาน / ทดลองงาน / หนังสือเตือน / ลาออก — Tier A (2026-09-08)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission, requirePermissionAny } from '../../common/middleware/permission'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { requireFeature }   from '../../common/middleware/feature'
import { ok, fail }         from '../../common/utils/response'
import * as svc             from './hr-lifecycle.service'
import { notifyAdminsLine, notifyEmployeeLine } from '../notifications/line-push.service'

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
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), requirePermissionAny([
      { feature: 'resignation', action: 'view' }, { feature: 'report_executive', action: 'view' },
    ]), resolveDeptScope, requireFeature('resignation')],
    schema: { tags: ['Admin'], summary: 'คำขอลาออก', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } } } },
  }, async (req: any) => ok(await svc.listResignations(req.tenantId, { status: req.query.status, scoped: req.scopedEmployeeIds })))

  app.post('/admin/resignations/:id/review', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'), requirePermission('resignation', 'approve'), resolveDeptScope, requireFeature('resignation')],
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
        type: 'resignation',
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

  // ═══ ขอเอกสาร HR (feature: document_request) ═════════════════════════════
  const DOC_REQUEST_LABEL_TH: Record<string, string> = {
    PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', WORK_CERT: 'หนังสือรับรองการทำงาน', OTHER: 'เอกสารอื่นๆ',
  }
  app.get('/admin/document-requests', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), requirePermissionAny([
      { feature: 'document_request', action: 'view' }, { feature: 'report_executive', action: 'view' },
    ]), resolveDeptScope, requireFeature('document_request')],
    schema: { tags: ['Admin'], summary: 'คำขอเอกสาร HR', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'REJECTED'] } } } },
  }, async (req: any) => ok(await svc.listDocumentRequests(req.tenantId, { status: req.query.status, scoped: req.scopedEmployeeIds })))

  // แอดมินสร้างคำขอเอกสารแทนพนักงาน (feedback 2026-09-24 — พนักงานโทร/เดินมา
  // ขอตรงๆ ไม่ได้ยื่นผ่าน LIFF)
  app.post('/admin/document-requests', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), requirePermission('document_request', 'add'), resolveDeptScope, requireFeature('document_request')],
    schema: {
      tags: ['Admin'], summary: 'สร้างคำขอเอกสาร HR แทนพนักงาน', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['employee_id', 'type'],
        properties: {
          employee_id: { type: 'string' },
          type: { type: 'string', enum: svc.DOCUMENT_REQUEST_TYPES as unknown as string[] },
          custom_type: { type: 'string', nullable: true },
          period: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      if (req.scopedEmployeeIds && !req.scopedEmployeeIds.includes(req.body.employee_id)) {
        return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
      }
      const r = await svc.createDocumentRequestByAdmin(req.tenantId, req.body)
      return reply.code(201).send(ok(r, 'สร้างคำขอเอกสารสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
      throw e
    }
  })

  // แก้ไขคำขอ — เฉพาะตอนยัง PENDING
  app.patch('/admin/document-requests/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), requirePermission('document_request', 'edit'), resolveDeptScope, requireFeature('document_request')],
    schema: {
      tags: ['Admin'], summary: 'แก้ไขคำขอเอกสาร HR (เฉพาะตอนยังรอดำเนินการ)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: svc.DOCUMENT_REQUEST_TYPES as unknown as string[] },
          custom_type: { type: 'string', nullable: true },
          period: { type: 'string', nullable: true },
          note: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const r = await svc.updateDocumentRequest(req.tenantId, req.params.id, req.body, req.scopedEmployeeIds)
      if (!r) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ'))
      return ok(r, 'บันทึกการแก้ไขเรียบร้อย')
    } catch (e: any) {
      if (e.message === 'NOT_PENDING') return reply.code(409).send(fail('NOT_PENDING', 'คำขอนี้ดำเนินการไปแล้ว แก้ไขไม่ได้'))
      if (e.message === 'OUT_OF_SCOPE') return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
      throw e
    }
  })

  // ลบคำขอทิ้ง (รายการซ้ำ/กรอกผิด) — ลบได้ทุกสถานะ
  app.delete('/admin/document-requests/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), requirePermission('document_request', 'delete'), resolveDeptScope, requireFeature('document_request')],
    schema: {
      tags: ['Admin'], summary: 'ลบคำขอเอกสาร HR', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      const success = await svc.deleteDocumentRequest(req.tenantId, req.params.id, req.scopedEmployeeIds)
      if (!success) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ'))
      return ok(null, 'ลบคำขอเรียบร้อย')
    } catch (e: any) {
      if (e.message === 'OUT_OF_SCOPE') return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
      throw e
    }
  })

  app.post('/admin/document-requests/:id/review', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), requirePermission('document_request', 'approve'), resolveDeptScope, requireFeature('document_request')],
    schema: {
      tags: ['Admin'], summary: 'แนบไฟล์ + mark เสร็จ หรือปฏิเสธคำขอเอกสาร', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object', required: ['approve'],
        properties: { approve: { type: 'boolean' }, file_url: { type: 'string', nullable: true }, reject_note: { type: 'string', nullable: true } },
      },
    },
  }, async (req: any, reply) => {
    try {
      const r = await svc.reviewDocumentRequest(req.tenantId, req.params.id, { ...req.body, reviewed_by: req.userId }, req.scopedEmployeeIds)
      if (!r) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอ หรือดำเนินการไปแล้ว'))
      const label = DOC_REQUEST_LABEL_TH[r.type] ?? r.type
      if (req.body.approve) {
        notifyEmployeeLine(req.tenantId, r.employee_id, 'ฝ่ายบุคคล', {
          title: 'เอกสารพร้อมแล้ว', detail: `${label}${r.period ? ` (${r.period})` : ''} — กดดูรายละเอียดในแอป`, color: '#16A34A', path: '/documents',
        })
      } else {
        notifyEmployeeLine(req.tenantId, r.employee_id, 'ฝ่ายบุคคล', {
          title: 'คำขอเอกสารไม่สำเร็จ', detail: `${label}${r.reject_note ? ` — เหตุผล: ${r.reject_note}` : ''}`, color: '#DC2626', path: '/documents',
        })
      }
      return ok(r, req.body.approve ? 'บันทึกเอกสารสำเร็จ' : 'ปฏิเสธคำขอแล้ว')
    } catch (e: any) {
      if (e.message === 'FILE_REQUIRED') return reply.code(400).send(fail('FILE_REQUIRED', 'ต้องแนบไฟล์ก่อนถึงจะ mark ว่าเสร็จได้'))
      if (e.message === 'OUT_OF_SCOPE') return reply.code(403).send(fail('OUT_OF_SCOPE', 'ไม่มีสิทธิ์'))
      throw e
    }
  })

  // LIFF: พนักงานขอเอกสาร + ดูประวัติคำขอของตัวเอง
  app.get('/employee/document-requests', {
    preHandler: [tenantMiddleware, requireFeature('document_request')],
    schema: { tags: ['Employee'], summary: 'ประวัติคำขอเอกสารของฉัน (LIFF)', security: [{ oauth2: [] }], querystring: { type: 'object', required: ['employee_id'], properties: { employee_id: { type: 'string' } } } },
  }, async (req: any) => ok(await svc.listOwnDocumentRequests(req.tenantId, req.query.employee_id)))

  app.post('/employee/document-requests', {
    preHandler: [tenantMiddleware, requireFeature('document_request')],
    schema: {
      tags: ['Employee'], summary: 'ขอเอกสาร HR (LIFF)', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['employee_id', 'type'],
        properties: {
          employee_id: { type: 'string' },
          type: { type: 'string', enum: svc.DOCUMENT_REQUEST_TYPES as unknown as string[] },
          custom_type: { type: 'string', nullable: true },
          period: { type: 'string', nullable: true, description: 'เดือนที่ต้องการ YYYY-MM — ใช้กับสลิปเงินเดือนเป็นหลัก' },
          note: { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => {
    const { employee_id, type, custom_type, period, note } = req.body
    const r = await svc.createDocumentRequest(req.tenantId, { employee_id, type, custom_type, period, note })
    const label = DOC_REQUEST_LABEL_TH[type] ?? type
    notifyAdminsLine(req.tenantId, employee_id, {
      type: 'document_request',
      title: 'คำขอเอกสาร HR',
      detail: `${label}${period ? ` (${period})` : ''}`,
      color: '#7C3AED',
      path: `/document-requests?approve=${r.id}`,
    })
    return reply.code(201).send(ok({ id: r.id }, 'ส่งคำขอแล้ว รอฝ่ายบุคคลดำเนินการ'))
  })
}
