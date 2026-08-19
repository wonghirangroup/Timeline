// server/src/modules/billing/billing.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listInvoices, createInvoice, updateInvoice } from './billing.service'

export async function billingRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/invoices?tenantId=
  app.get('/invoices', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'ดู Invoice ทั้งหมด (กรอง tenantId ได้)',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', properties: { tenantId: { type: 'string' } } },
    },
  }, async (req: any) => {
    const list = await listInvoices(req.query.tenantId)
    return ok(list)
  })

  // POST /api/v1/super-admin/invoices
  app.post('/invoices', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'สร้าง Invoice ใหม่ให้ Tenant (บันทึกเอง — ยังไม่ผูก payment gateway)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['tenant_id', 'plan', 'amount', 'due_date', 'period_start', 'period_end'],
        properties: {
          tenant_id:    { type: 'string' },
          plan:         { type: 'string' },
          amount:       { type: 'integer' },
          due_date:     { type: 'string' },
          paid_date:    { type: 'string', nullable: true },
          status:       { type: 'string', enum: ['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'] },
          period_start: { type: 'string' },
          period_end:   { type: 'string' },
          note:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const invoice = await createInvoice(req.body)
    return reply.code(201).send(ok(invoice, 'สร้าง Invoice สำเร็จ'))
  })

  // PATCH /api/v1/super-admin/invoices/:id
  app.patch('/invoices/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: ['SuperAdmin'],
      summary: 'อัปเดต Invoice (mark ชำระแล้ว/ยกเลิก/ต่ออายุ)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          status:     { type: 'string', enum: ['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'] },
          paid_date:  { type: 'string', nullable: true },
          period_end: { type: 'string' },
          note:       { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const invoice = await updateInvoice(req.params.id, req.body)
    if (!invoice) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Invoice'))
    return ok(invoice, 'อัปเดต Invoice สำเร็จ')
  })
}
