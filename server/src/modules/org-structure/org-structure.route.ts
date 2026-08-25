// server/src/modules/org-structure/org-structure.route.ts
// ผังองค์กร 4 ชั้น: Department → Division → Section → Position (ADMIN จัดการ) — ข้ามชั้นได้
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import * as svc from './org-structure.service'

const TAG = 'Admin'
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const
const READ_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const

function handleParentErrors(e: any, reply: any) {
  if (e.message === 'DEPARTMENT_NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแผนกที่อ้างอิง'))
  if (e.message === 'DIVISION_NOT_FOUND')   return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบฝ่ายที่อ้างอิง'))
  if (e.message === 'SECTION_NOT_FOUND')    return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบส่วนที่อ้างอิง'))
  return null
}

export async function orgStructureRoutes(app: FastifyInstance) {
  // ── ผังรวม (สำหรับหน้าจัดการ) ─────────────────────────────
  app.get('/org-structure/tree', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูผังองค์กรทั้งหมด (Department→Division→Section→Position, ข้ามชั้นได้)', security: [{ oauth2: [] }] },
  }, async (req, reply) => ok(await svc.getOrgTree(req.tenantId)))

  // GET /admin/org-structure/unassigned — ฝ่าย/ส่วน/ตำแหน่งที่ยังลอย ไม่ผูกอะไรเลยสักชั้น
  app.get('/org-structure/unassigned', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูฝ่าย/ส่วน/ตำแหน่งที่ยังไม่ได้จัดเข้าแผนก (สร้างลอยไว้ก่อน)', security: [{ oauth2: [] }] },
  }, async (req, reply) => ok(await svc.getUnassigned(req.tenantId)))

  // ── Department ─────────────────────────────────────────────
  app.get('/departments', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการแผนก', security: [{ oauth2: [] }] },
  }, async (req, reply) => ok(await svc.listDepartments(req.tenantId)))

  app.post('/departments', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างแผนกใหม่', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, code: { type: 'string' } } },
    },
  }, async (req: any, reply) => reply.code(201).send(ok(await svc.createDepartment(req.tenantId, req.body), 'สร้างแผนกสำเร็จ')))

  app.patch('/departments/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขแผนก', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, is_active: { type: 'boolean' } } },
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
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีฝ่าย/ส่วน/ตำแหน่งผูกอยู่ในแผนกนี้ ย้าย/ลบออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ── Division ───────────────────────────────────────────────
  app.get('/divisions', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการฝ่าย', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { department_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listDivisions(req.tenantId, req.query.department_id)))

  // department_id ไม่บังคับ — สร้างฝ่ายลอยไม่ผูกแผนกก็ได้
  app.post('/divisions', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างฝ่ายใหม่ (ผูกแผนกได้ทันที หรือสร้างลอยไว้ก่อนก็ได้)', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name'], properties: { department_id: { type: 'string' }, name: { type: 'string' } } },
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
      tags: [TAG], summary: 'แก้ไขฝ่าย (แก้ department_id เพื่อย้าย/ถอดออกจากแผนกได้)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, department_id: { type: ['string', 'null'] }, is_active: { type: 'boolean' } } },
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
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีส่วน/ตำแหน่งผูกอยู่ในฝ่ายนี้ ย้าย/ลบออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ── Section ────────────────────────────────────────────────
  app.get('/sections', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการส่วน', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { division_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listSections(req.tenantId, req.query.division_id)))

  // division_id ไม่บังคับ — แนบตรงกับ department_id ได้เลยถ้าไม่มีฝ่าย หรือสร้างลอยไว้ก่อนก็ได้
  app.post('/sections', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างส่วนใหม่ (ผูกฝ่าย หรือข้ามไปผูกแผนกตรงๆ หรือสร้างลอยไว้ก่อนก็ได้)', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name'], properties: { division_id: { type: 'string' }, department_id: { type: 'string' }, name: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    try {
      return reply.code(201).send(ok(await svc.createSection(req.tenantId, req.body), 'สร้างส่วนสำเร็จ'))
    } catch (e: any) {
      if (handleParentErrors(e, reply)) return
      throw e
    }
  })

  app.patch('/sections/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'แก้ไขส่วน', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: { name: { type: 'string' }, division_id: { type: ['string', 'null'] }, department_id: { type: ['string', 'null'] }, is_active: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    const s = await svc.updateSection(req.tenantId, req.params.id, req.body)
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบส่วน'))
    return ok(s, 'อัปเดตส่วนสำเร็จ')
  })

  app.delete('/sections/:id', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: { tags: [TAG], summary: 'ลบส่วน (soft delete)', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    try {
      const deleted = await svc.deleteSection(req.tenantId, req.params.id)
      if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบส่วน'))
      return ok(null, 'ลบส่วนสำเร็จ')
    } catch (e: any) {
      if (e.message === 'IN_USE') return reply.code(409).send(fail('IN_USE', 'มีตำแหน่งผูกอยู่ในส่วนนี้ ย้าย/ลบตำแหน่งออกก่อนจึงลบได้'))
      throw e
    }
  })

  // ── Position ───────────────────────────────────────────────
  app.get('/positions', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES)],
    schema: { tags: [TAG], summary: 'ดูรายการตำแหน่ง', security: [{ oauth2: [] }], querystring: { type: 'object', properties: { section_id: { type: 'string' } } } },
  }, async (req: any, reply) => ok(await svc.listPositions(req.tenantId, req.query.section_id)))

  // section_id/division_id/department_id ทั้งหมดไม่บังคับ — เลือกแนบชั้นไหนก็ได้ชั้นเดียว
  // (ลำดับความสำคัญ: section > division > department) หรือสร้างตำแหน่งลอยไว้ก่อนก็ได้เลย
  app.post('/positions', {
    preHandler: [tenantMiddleware, requireRole(...ADMIN_ROLES)],
    schema: {
      tags: [TAG], summary: 'สร้างตำแหน่งใหม่ (แนบชั้นไหนก็ได้ตามที่มีจริง หรือสร้างลอยไว้ก่อนก็ได้)', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['name'],
        properties: { section_id: { type: 'string' }, division_id: { type: 'string' }, department_id: { type: 'string' }, name: { type: 'string' } },
      },
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
      tags: [TAG], summary: 'แก้ไขตำแหน่ง (ย้ายไปแนบชั้นอื่นได้ด้วย)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          section_id: { type: ['string', 'null'] },
          division_id: { type: ['string', 'null'] },
          department_id: { type: ['string', 'null'] },
          is_active: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const p = await svc.updatePosition(req.tenantId, req.params.id, req.body)
    if (!p) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบตำแหน่ง'))
    return ok(p, 'อัปเดตตำแหน่งสำเร็จ')
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
