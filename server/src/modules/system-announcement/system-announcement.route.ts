// server/src/modules/system-announcement/system-announcement.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { logActivity }      from '../../common/utils/activityLog'
import * as svc from './system-announcement.service'

const TAG = 'Super Admin'
const ANN_TYPES = ['MAINTENANCE', 'FEATURE', 'BILLING', 'GENERAL', 'URGENT']

export async function systemAnnouncementRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/announcements
  app.get('/announcements', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'ประวัติประกาศจาก Super Admin ถึง tenant', security: [{ oauth2: [] }] },
  }, async () => ok(await svc.listSystemAnnouncements()))

  const bodySchema = {
    type: 'object',
    required: ['type', 'title', 'body', 'target_type'],
    properties: {
      type: { type: 'string', enum: ANN_TYPES },
      title: { type: 'string' },
      body: { type: 'string' },
      target_type: { type: 'string', enum: ['ALL', 'PLAN', 'CUSTOM'] },
      target_plan: { type: 'string', enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'], nullable: true },
      target_tenant_ids: { type: 'array', items: { type: 'string' } },
    },
  }

  // POST /api/v1/super-admin/announcements — สร้าง + ส่งทันที
  app.post('/announcements', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'สร้างและส่งประกาศทันที (LINE push เข้าแอดมิน tenant เป้าหมาย)', security: [{ oauth2: [] }], body: bodySchema },
  }, async (req: any, reply) => {
    const actorEmail = req.user?.email ?? 'Super Admin'
    const row = await svc.createAndSendSystemAnnouncement({ ...req.body, created_by: actorEmail })
    logActivity({ action: 'ANNOUNCEMENT_SENT', actorName: actorEmail, message: `ส่งประกาศ "${row.title}" ถึงแอดมิน ${row.sent_count} คน` })
    return reply.code(201).send(ok(row, `ส่งประกาศแล้ว — ถึงแอดมิน ${row.sent_count} คน`))
  })

  // POST /api/v1/super-admin/announcements/draft — บันทึกร่าง ไม่ส่ง
  app.post('/announcements/draft', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'บันทึกร่างประกาศ (ยังไม่ส่ง)', security: [{ oauth2: [] }], body: bodySchema },
  }, async (req: any, reply) => {
    const row = await svc.saveSystemAnnouncementDraft({ ...req.body, created_by: req.user?.email ?? 'Super Admin' })
    return reply.code(201).send(ok(row, 'บันทึกร่างแล้ว'))
  })

  // PUT /api/v1/super-admin/announcements/:id — แก้ไข draft (ส่งแล้วแก้ไม่ได้)
  // — ส่ง status:"DRAFT" ในตัว body เพื่อบันทึกเป็น draft ต่อ ไม่ส่ง = แก้แล้วส่งเลย
  app.put('/announcements/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'แก้ไข draft ที่ยังไม่ส่ง (ส่ง status:"DRAFT" เพื่อบันทึกเป็น draft ต่อ ไม่ส่ง = แก้แล้วส่งทันที)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { ...bodySchema, properties: { ...bodySchema.properties, status: { type: 'string', enum: ['DRAFT'] } } },
    },
  }, async (req: any, reply) => {
    try {
      const actorEmail = req.user?.email ?? 'Super Admin'
      const asDraft = req.body.status === 'DRAFT'
      const row = await svc.updateOrSendDraft(req.params.id, { ...req.body, created_by: actorEmail, asDraft })
      if (!row) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบประกาศ'))
      if (!asDraft) logActivity({ action: 'ANNOUNCEMENT_SENT', actorName: actorEmail, message: `ส่งประกาศ "${row.title}" ถึงแอดมิน ${(row as any).sent_count ?? 0} คน` })
      return ok(row, asDraft ? 'บันทึก Draft แล้ว' : `ส่งประกาศแล้ว — ถึงแอดมิน ${(row as any).sent_count ?? 0} คน`)
    } catch (e: any) {
      if (e.message === 'ALREADY_SENT') return reply.code(409).send(fail('ALREADY_SENT', 'ประกาศนี้ส่งไปแล้ว แก้ไขไม่ได้'))
      throw e
    }
  })

  // DELETE /api/v1/super-admin/announcements/:id
  app.delete('/announcements/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'ลบประกาศ/ร่าง', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const success = await svc.deleteSystemAnnouncement(req.params.id)
    if (!success) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบประกาศ'))
    return ok(null, 'ลบเรียบร้อย')
  })
}
