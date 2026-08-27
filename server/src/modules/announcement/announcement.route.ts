// server/src/modules/announcement/announcement.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireFeature }   from '../../common/middleware/feature'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listAnnouncements, createAnnouncement, deleteAnnouncement, sendDirectMessage, listTemplates, createTemplate, updateTemplate, deleteTemplate } from './announcement.service'

export async function announcementRoutes(app: FastifyInstance) {

  // GET /api/v1/admin/announcements
  app.get('/announcements', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูประกาศทั้งหมด',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => {
    const list = await listAnnouncements(req.tenantId)
    return ok(list)
  })

  // POST /api/v1/admin/announcements
  app.post('/announcements', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'],
      summary: 'สร้างประกาศใหม่',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title:        { type: 'string' },
          content:      { type: 'string' },
          send_line:    { type: 'boolean', description: 'broadcast ผ่าน Line ด้วย' },
          branch_id:    { type: 'string', description: 'ส่งถึงสาขาเฉพาะ (ไม่ระบุ = ทุกคน)' },
          employee_ids: { type: 'array', items: { type: 'string' }, description: 'เลือกส่งรายคน — ชนะ branch_id ถ้าระบุ' },
        },
      },
    },
  }, async (req: any, reply) => {
    const announcement = await createAnnouncement(req.tenantId, req.userId!, {
      title:        req.body.title,
      content:      req.body.content,
      send_line:    req.body.send_line,
      branch_id:    req.body.branch_id,
      employee_ids: req.body.employee_ids,
    })
    return reply.code(201).send(ok(announcement, 'สร้างประกาศสำเร็จ'))
  })

  // ── Template: เทมเพลตข้อความประกาศ ────────────────────────────────
  app.get('/announcement-templates', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'), requireFeature('announcement')],
    schema: { tags: ['Admin'], summary: 'ดูเทมเพลตข้อความประกาศทั้งหมด', security: [{ oauth2: [] }] },
  }, async (req: any) => ok(await listTemplates(req.tenantId)))

  app.post('/announcement-templates', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'], summary: 'สร้างเทมเพลตข้อความประกาศ', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['name', 'title', 'content'], properties: {
        name: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' },
      } },
    },
  }, async (req: any, reply) => {
    const template = await createTemplate(req.tenantId, req.body)
    return reply.code(201).send(ok(template, 'สร้างเทมเพลตสำเร็จ'))
  })

  app.patch('/announcement-templates/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'], summary: 'แก้ไขเทมเพลตข้อความประกาศ', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', properties: {
        name: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' },
      } },
    },
  }, async (req: any, reply) => {
    const updated = await updateTemplate(req.tenantId, req.params.id, req.body)
    if (!updated) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเทมเพลต'))
    return ok(null, 'แก้ไขสำเร็จ')
  })

  app.delete('/announcement-templates/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'], summary: 'ลบเทมเพลตข้อความประกาศ', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteTemplate(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเทมเพลต'))
    return ok(null, 'ลบเทมเพลตสำเร็จ')
  })

  // POST /api/v1/admin/announcements/direct
  app.post('/announcements/direct', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'],
      summary: 'ส่งข้อความส่วนตัวผ่าน Line',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['employee_id', 'message'],
        properties: {
          employee_id: { type: 'string' },
          message:     { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await sendDirectMessage(req.tenantId, req.body.employee_id, req.body.message)
      return reply.code(200).send(ok(result, 'ส่งข้อความสำเร็จ'))
    } catch (err: any) {
      return reply.code(400).send(fail('SEND_FAILED', err.message))
    }
  })

  // DELETE /api/v1/admin/announcements/:id
  app.delete('/announcements/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), requireFeature('announcement')],
    schema: {
      tags: ['Admin'],
      summary: 'ลบประกาศ',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteAnnouncement(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบประกาศ'))
    return ok(null, 'ลบประกาศสำเร็จ')
  })
}
