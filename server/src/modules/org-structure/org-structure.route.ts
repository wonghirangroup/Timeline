// server/src/modules/org-structure/org-structure.route.ts
// ผังองค์กร 3 ชั้นใต้กลุ่ม: Division (ฝ่าย) → Department (แผนก) → Position (ตำแหน่ง) (ADMIN จัดการ)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import * as svc from './org-structure.service'

const TAG = 'Admin'
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const
const READ_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const

function handleParentErrors(e: any, reply: any) {
  if (e.message === 'GROUP_NOT_FOUND')      return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบกลุ่มที่อ้างอิง'))
  if (e.message === 'DIVISION_NOT_FOUND')   return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบฝ่ายที่อ้างอิง'))
  if (e.message === 'DEPARTMENT_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแผนกที่อ้างอิง'))
  return null
}

export async function orgStructureRoutes(app: FastifyInstance) {
  // ── ผังรวมของ "กลุ่ม" เดียว (สำหรับหน้าจัดการผังองค์กร) ─────
  app.get('/org-structure/tree', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: {
      tags: [TAG], summary: 'ดูผังองค์กรของกลุ่มหนึ่ง (Division→Department→Position)', security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['group_id'], properties: { group_id: { type: 'string' } } },
    },
  }, async (req: any, reply) => ok(await svc.getOrgTree(req.tenantId, req.query.group_id)))

  // ── Division (ฝ่าย) ────────────────────────────────────────
  app.get('/divisions', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการฝ่าย', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { group_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listDivisions(req.tenantId, req.query.group_id)))

  app.post('/divisions', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างฝ่ายใหม่ในกลุ่ม', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['group_id', 'name'],
        properties: { group_id: { type: 'string' }, name: { type: 'string' }, booking_enabled: { type: ['boolean', 'null'] } },
      },
    },
  }, async (req: any, reply) => {
    try {
      return reply.code(201).send(ok(await svc.createDivision(req.tenantId, req.body), 'สร้างฝ่ายสำเร็จ'))
    } catch (e: any) {
      if (handleParentErrors(e, reply)) return
      throw e
    }
  })

  app.patch('/divisions/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขฝ่าย (booking_enabled: null = inherit จากกลุ่ม)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, booking_enabled: { type: ['boolean', 'null'] }, is_active: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    const d = await svc.updateDivision(req.tenantId, req.params.id, req.body)
    if (!d) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบฝ่าย'))
    return ok(d, 'อัปเดตฝ่ายสำเร็จ')
  })

  app.delete('/divisions/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: { tags: [TAG], summary: 'ลบฝ่าย (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await svc.deleteDivision(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบฝ่าย'))
      return ok(null, 'ลบฝ่ายสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีแผนกผูกอยู่ในฝ่ายนี้ ย้าย/ลบออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ── Department (แผนก) ──────────────────────────────────────
  app.get('/departments', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการแผนก', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { division_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listDepartments(req.tenantId, req.query.division_id)))

  app.post('/departments', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างแผนกใหม่ในฝ่าย', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['division_id', 'name'],
        properties: { division_id: { type: 'string' }, name: { type: 'string' }, booking_enabled: { type: ['boolean', 'null'] } },
      },
    },
  }, async (req: any, reply) => {
    try {
      return reply.code(201).send(ok(await svc.createDepartment(req.tenantId, req.body), 'สร้างแผนกสำเร็จ'))
    } catch (e: any) {
      if (handleParentErrors(e, reply)) return
      throw e
    }
  })

  app.patch('/departments/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขแผนก (booking_enabled: null = inherit จากฝ่าย)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, booking_enabled: { type: ['boolean', 'null'] }, is_active: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    const d = await svc.updateDepartment(req.tenantId, req.params.id, req.body)
    if (!d) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแผนก'))
    return ok(d, 'อัปเดตแผนกสำเร็จ')
  })

  app.delete('/departments/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: { tags: [TAG], summary: 'ลบแผนก (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await svc.deleteDepartment(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแผนก'))
      return ok(null, 'ลบแผนกสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีตำแหน่งผูกอยู่ในแผนกนี้ ย้าย/ลบออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ── Position (ตำแหน่ง) ─────────────────────────────────────
  app.get('/positions', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการตำแหน่ง', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { department_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listPositions(req.tenantId, req.query.department_id)))

  app.post('/positions', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างตำแหน่งใหม่ในแผนก', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['department_id', 'name'], properties: { department_id: { type: 'string' }, name: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      return reply.code(201).send(ok(await svc.createPosition(req.tenantId, req.body), 'สร้างตำแหน่งสำเร็จ'))
    } catch (e: any) {
      if (handleParentErrors(e, reply)) return
      throw e
    }
  })

  app.patch('/positions/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขตำแหน่ง (ย้ายไปแผนกอื่นได้ด้วย)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, department_id: { type: 'string' }, is_active: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    try {
      const p = await svc.updatePosition(req.tenantId, req.params.id, req.body)
      if (!p) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบตำแหน่ง'))
      return ok(p, 'อัปเดตตำแหน่งสำเร็จ')
    } catch (e: any) {
      if (handleParentErrors(e, reply)) return
      throw e
    }
  })

  app.delete('/positions/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: { tags: [TAG], summary: 'ลบตำแหน่ง (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await svc.deletePosition(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบตำแหน่ง'))
      return ok(null, 'ลบตำแหน่งสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีพนักงานผูกตำแหน่งนี้อยู่ ย้ายพนักงานออกก่อนจึงลบได้'))
      throw e
    }
  })
}
