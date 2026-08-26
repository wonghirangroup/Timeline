// server/src/modules/employee-status-type/employee-status-type.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import {
  listEmployeeStatusTypes, createEmployeeStatusType,
  updateEmployeeStatusType, deleteEmployeeStatusType,
} from './employee-status-type.service'

const TAG = 'Admin'

export async function employeeStatusTypeRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/employee-status-types
  app.get('/employee-status-types', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: { tags: [TAG], summary: 'ดูรายการสถานะพนักงาน (ประจำ/ชั่วคราว/...) พร้อมโควต้าวันหยุดต่อเดือน', security: [{ oauth2: [] }] },
  }, async (req, reply) => ok(await listEmployeeStatusTypes(req.tenantId)))

  // POST /api/v1/admin/employee-status-types
  app.post('/employee-status-types', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG], summary: 'สร้างสถานะพนักงานใหม่', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string' },
          monthly_off_quota: { type: 'number', description: 'จำนวนวันหยุดที่จองได้ต่อเดือน (default 4)' },
          saturday_rule: { type: 'string', enum: ['WORK', 'OFF', 'OFFSITE'], description: 'เงื่อนไขวันเสาร์ (default WORK) — OFFSITE = ทำงานนอกสถานที่ ไม่ใช่วันหยุด' },
          sunday_rule: { type: 'string', enum: ['WORK', 'OFF', 'OFFSITE'], description: 'เงื่อนไขวันอาทิตย์ (default WORK)' },
          off_on_public_holiday: { type: 'boolean', description: 'หยุดวันนักขัตฤกษ์อัตโนมัติ (default true)' },
        },
      },
    },
  }, async (req: any, reply) => reply.code(201).send(ok(await createEmployeeStatusType(req.tenantId, req.body), 'สร้างสถานะพนักงานสำเร็จ')))

  // PATCH /api/v1/admin/employee-status-types/:id
  app.patch('/employee-status-types/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG], summary: 'แก้ไขสถานะพนักงาน', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' }, monthly_off_quota: { type: 'number' }, is_active: { type: 'boolean' },
          saturday_rule: { type: 'string', enum: ['WORK', 'OFF', 'OFFSITE'] },
          sunday_rule: { type: 'string', enum: ['WORK', 'OFF', 'OFFSITE'] },
          off_on_public_holiday: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const t = await updateEmployeeStatusType(req.tenantId, req.params.id, req.body)
    if (!t) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสถานะพนักงาน'))
    return ok(t, 'อัปเดตสถานะพนักงานสำเร็จ')
  })

  // DELETE /api/v1/admin/employee-status-types/:id
  app.delete('/employee-status-types/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: { tags: [TAG], summary: 'ลบสถานะพนักงาน (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await deleteEmployeeStatusType(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสถานะพนักงาน'))
      return ok(null, 'ลบสถานะพนักงานสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีพนักงานผูกสถานะนี้อยู่ ย้ายพนักงานออกก่อนจึงลบได้'))
      throw e
    }
  })
}
