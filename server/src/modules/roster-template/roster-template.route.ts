// server/src/modules/roster-template/roster-template.route.ts
// เทมเพลต Export ตารางแยกกลุ่ม (ปฏิทินรวม) — ใช้ร่วมกันทั้งบริษัท
// ดู/บันทึก/ลบ: ทุกบทบาทที่เข้าปฏิทินรวมได้ ยกเว้น EXECUTIVE (อ่านอย่างเดียว) ที่ดูได้อย่างเดียว
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole } from '../../common/middleware/rbac'
import { requirePermission } from '../../common/middleware/permission'
import { ok, fail } from '../../common/utils/response'
import * as svc from './roster-template.service'

const TAG = 'Admin'
const READ_ROLES  = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'] as const
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DEPT_HEAD'] as const

export async function rosterTemplateRoutes(app: FastifyInstance) {
  app.get('/roster-templates', {
    preHandler: [tenantMiddleware, requireRole(...READ_ROLES), requirePermission('leave', 'view')],
    schema: { tags: [TAG], summary: 'รายการเทมเพลต Export ตารางแยกกลุ่ม (ทั้งบริษัท)', security: [{ oauth2: [] }] },
  }, async (req: any) => ok(await svc.listRosterTemplates(req.tenantId)))

  app.put('/roster-templates', {
    preHandler: [tenantMiddleware, requireRole(...WRITE_ROLES), requirePermission('leave', 'view')],
    schema: {
      tags: [TAG], summary: 'บันทึก/อัปเดตเทมเพลต Export ตารางแยกกลุ่ม (ชื่อซ้ำ = อัปเดตทับ)', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['name', 'data'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: svc.MAX_NAME_LEN },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const saved = await svc.saveRosterTemplate(req.tenantId, req.body.name, req.body.data, req.user?.email ?? null)
      return ok(saved, 'บันทึกเทมเพลตแล้ว')
    } catch (e: any) {
      if (e.message === 'INVALID_NAME') return reply.code(400).send(fail('INVALID_NAME', `ชื่อเทมเพลตต้องมี 1–${svc.MAX_NAME_LEN} ตัวอักษร`))
      if (e.message === 'TEMPLATE_TOO_LARGE') return reply.code(413).send(fail('TEMPLATE_TOO_LARGE', 'เทมเพลตมีข้อมูลมากเกินไป'))
      if (e.message === 'TOO_MANY_TEMPLATES') return reply.code(409).send(fail('TOO_MANY_TEMPLATES', `เก็บเทมเพลตได้สูงสุด ${svc.MAX_TEMPLATES_PER_TENANT} อัน — ลบอันที่ไม่ใช้ก่อน`))
      throw e
    }
  })

  app.delete('/roster-templates/:id', {
    preHandler: [tenantMiddleware, requireRole(...WRITE_ROLES), requirePermission('leave', 'view')],
    schema: {
      tags: [TAG], summary: 'ลบเทมเพลต Export ตารางแยกกลุ่ม', security: [{ oauth2: [] }],
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const done = await svc.deleteRosterTemplate(req.tenantId, req.params.id)
    if (!done) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบเทมเพลต'))
    return ok(null, 'ลบเทมเพลตแล้ว')
  })
}
