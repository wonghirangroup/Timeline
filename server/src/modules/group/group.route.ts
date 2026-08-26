// server/src/modules/group/group.route.ts
// กลุ่ม (บริษัท) — ADMIN จัดการ, MANAGER อ่านได้อย่างเดียว
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import * as svc from './group.service'

const TAG = 'Admin'
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const
const READ_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const

export async function groupRoutes(app: FastifyInstance) {
  app.get('/groups', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการกลุ่ม(บริษัท)', security: [{ oauth2: [] }] },
  }, async (req, reply) => ok(await svc.listGroups(req.tenantId)))

  app.post('/groups', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างกลุ่มใหม่ (จำกัดจำนวนตาม package)', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, booking_enabled: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    try {
      return reply.code(201).send(ok(await svc.createGroup(req.tenantId, req.body), 'สร้างกลุ่มสำเร็จ'))
    } catch (e: any) {
      if (e.message === 'LIMIT_REACHED') return reply.code(409).send(fail('LIMIT_REACHED', 'สร้างกลุ่มครบตามจำนวนที่ package รองรับแล้ว ติดต่อเพื่ออัปเกรด'))
      if (e.message === 'TENANT_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ tenant'))
      throw e
    }
  })

  app.patch('/groups/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขกลุ่ม (booking_enabled = ค่าเริ่มต้นของทุกฝ่าย/แผนก/คนในกลุ่มนี้)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, booking_enabled: { type: 'boolean' }, is_active: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    const g = await svc.updateGroup(req.tenantId, req.params.id, req.body)
    if (!g) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกลุ่ม'))
    return ok(g, 'อัปเดตกลุ่มสำเร็จ')
  })

  app.delete('/groups/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: { tags: [TAG], summary: 'ลบกลุ่ม (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await svc.deleteGroup(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกลุ่ม'))
      return ok(null, 'ลบกลุ่มสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีสาขา/ฝ่ายผูกอยู่ในกลุ่มนี้ ย้ายออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ผูก/ย้ายสาขาเข้ากลุ่ม — แยกจาก branch.route.ts เดิม (ไม่อยากแก้ endpoint branch หลักที่มีอยู่แล้ว)
  app.patch('/branches/:id/group', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'ผูกสาขาเข้ากลุ่ม (group_id: null = ถอดออกจากกลุ่ม)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['group_id'], properties: { group_id: { type: ['string', 'null'] } } },
    },
  }, async (req: any, reply) => {
    try {
      const updated = await svc.assignBranchToGroup(req.tenantId, req.params.id, req.body.group_id)
      if (!updated) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขา'))
      return ok(null, 'ผูกสาขาเข้ากลุ่มสำเร็จ')
    } catch (e: any) {
      if (e.message === 'GROUP_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกลุ่มที่อ้างอิง'))
      throw e
    }
  })
}
