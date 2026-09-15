// server/src/modules/hr-document/hr-document.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { resolveDeptScope } from '../../common/middleware/deptScope'
import { ok, fail }         from '../../common/utils/response'
import * as svc              from './hr-document.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'] as const
const READ_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'] as const

export async function hrDocumentRoutes(app: FastifyInstance) {

  // ข้อมูลตั้งต้นให้ฟอร์มสร้างเอกสาร (auto-fill จากพนักงาน+บริษัท + เลขที่เอกสารแนะนำ)
  app.get('/admin/employees/:id/hr-doc-data', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), resolveDeptScope],
    schema: {
      tags: ['Admin'], summary: 'ข้อมูลตั้งต้นสร้างเอกสาร HR (auto-fill)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: { type: 'object', required: ['type'], properties: { type: { type: 'string', enum: svc.HR_DOC_TYPES as unknown as string[] } } },
    },
  }, async (req: any, reply) => {
    if (req.scopedEmployeeIds && !req.scopedEmployeeIds.includes(req.params.id)) {
      return reply.code(403).send(fail('OUT_OF_SCOPE', 'อยู่นอกขอบเขตแผนกที่ดูแล'))
    }
    const data = await svc.getDocData(req.tenantId, req.params.id, req.query.type)
    if (!data) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok(data)
  })

  app.get('/admin/hr-documents', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope],
    schema: {
      tags: ['Admin'], summary: 'รายการเอกสาร HR ที่ออกแล้ว', security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { employee_id: { type: 'string' }, type: { type: 'string', enum: svc.HR_DOC_TYPES as unknown as string[] } } },
    },
  }, async (req: any) => ok(await svc.listHrDocuments(req.tenantId, {
    employee_id: req.query.employee_id, type: req.query.type, scoped: req.scopedEmployeeIds,
  })))

  app.post('/admin/hr-documents', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES), resolveDeptScope],
    schema: {
      tags: ['Admin'], summary: 'สร้างเอกสาร HR (บันทึก snapshot ถาวร)', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['employee_id', 'type', 'data'],
        properties: {
          employee_id: { type: 'string' },
          type: { type: 'string', enum: svc.HR_DOC_TYPES as unknown as string[] },
          doc_number: { type: 'string', nullable: true },
          period: { type: 'string', nullable: true },
          document_request_id: { type: 'string', nullable: true },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const row = await svc.createHrDocument(req.tenantId, req.userId, req.body, req.scopedEmployeeIds)
      return ok(row, 'สร้างเอกสารสำเร็จ')
    } catch (err: any) {
      if (err.message === 'OUT_OF_SCOPE')       return reply.code(403).send(fail('OUT_OF_SCOPE', 'อยู่นอกขอบเขตแผนกที่ดูแล'))
      if (err.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
      if (err.message === 'REQUEST_NOT_FOUND')  return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบคำขอเอกสาร'))
      throw err
    }
  })

  // พิมพ์ซ้ำ — render จาก snapshot เดิมเป๊ะ (หน้า print แยก ไม่มี Layout)
  app.get('/admin/hr-documents/:id', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), resolveDeptScope],
    schema: { tags: ['Admin'], summary: 'ดูเอกสาร HR รายฉบับ (สำหรับพิมพ์/พิมพ์ซ้ำ)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const row = await svc.getHrDocument(req.tenantId, req.params.id, req.scopedEmployeeIds)
      if (!row) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเอกสาร'))
      return ok(row)
    } catch (err: any) {
      if (err.message === 'OUT_OF_SCOPE') return reply.code(403).send(fail('OUT_OF_SCOPE', 'อยู่นอกขอบเขตแผนกที่ดูแล'))
      throw err
    }
  })
}
