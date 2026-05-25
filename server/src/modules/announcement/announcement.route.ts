// server/src/modules/announcement/announcement.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from './announcement.service'

export async function announcementRoutes(app: FastifyInstance) {

  // GET /api/v1/admin/announcements
  app.get('/announcements', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
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
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: ['Admin'],
      summary: 'สร้างประกาศใหม่',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title:     { type: 'string' },
          content:   { type: 'string' },
          send_line: { type: 'boolean', description: 'broadcast ผ่าน Line ด้วย' },
        },
      },
    },
  }, async (req: any, reply) => {
    const announcement = await createAnnouncement(req.tenantId, req.userId!, req.body)
    return reply.code(201).send(ok(announcement, 'สร้างประกาศสำเร็จ'))
  })

  // DELETE /api/v1/admin/announcements/:id
  app.delete('/announcements/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
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
