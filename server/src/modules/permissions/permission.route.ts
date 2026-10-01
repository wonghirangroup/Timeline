// server/src/modules/permissions/permission.route.ts
// จัดการสิทธิ์แบบละเอียดต่อบัญชี (Phase 1 — ดู brain log v187: ยังไม่ enforce
// จริงที่ endpoint อื่น แค่จัดการ/ดูข้อมูลได้เต็มรูปแบบ)
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requireRootAdmin } from '../../common/middleware/permission'
import { ok, fail }         from '../../common/utils/response'
import { FEATURES, PERMISSION_ACTIONS } from '../../common/permissions/features'
import { getUserPermissions, setUserPermissions, resetUserPermissions, getNotifyRecipients, setNotify } from './permission.service'
import { NOTIFICATION_TYPES, type NotificationType } from '../../common/utils/notificationPrefs'
import { prisma } from '../../common/utils/prisma'

const permissionActionSchema = {
  type: 'object',
  properties: Object.fromEntries(PERMISSION_ACTIONS.map(a => [a, { type: 'boolean' }])),
} as const

export async function permissionRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/permissions/features — รายการฟีเจอร์ทั้งหมด (ให้ frontend ไม่ต้อง hardcode ซ้ำ)
  app.get('/permissions/features', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: { tags: ['Admin'], summary: 'รายการฟีเจอร์ที่กำหนดสิทธิ์ได้ (สำหรับ matrix editor)', security: [{ oauth2: [] }] },
  }, async () => ok(FEATURES))

  // GET /api/v1/admin/users/:id/permissions
  app.get('/users/:id/permissions', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: ['Admin'],
      summary: 'ดูสิทธิ์แบบละเอียดของบัญชีนี้ (เต็มทุก feature key เสมอ)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: null } })
    if (!target) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    return ok(await getUserPermissions(req.tenantId, req.params.id))
  })

  // PUT /api/v1/admin/users/:id/permissions — จำกัดเฉพาะ root admin (feedback
  // 2026-09-28 "คนที่จะแบ่งสิทธิ์ได้ต้องเป็นผู้ดูแลระบบ") — GET ยังเปิดให้
  // ADMIN/MANAGER ทั่วไปดูได้ (แค่ดู ไม่ใช่แก้)
  app.put('/users/:id/permissions', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireRootAdmin()],
    schema: {
      tags: ['Admin'],
      summary: 'บันทึกสิทธิ์แบบละเอียดของบัญชีนี้ (แทนที่ทั้งชุด)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['permissions'],
        properties: {
          permissions: {
            type: 'array',
            items: { type: 'object', required: ['feature'], properties: { feature: { type: 'string' }, ...permissionActionSchema.properties } },
          },
        },
      },
    },
  }, async (req: any, reply) => {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: null } })
    if (!target) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    await setUserPermissions(req.tenantId, req.params.id, req.body.permissions)
    return ok(null, 'บันทึกสิทธิ์สำเร็จ')
  })

  // POST /api/v1/admin/users/:id/permissions/reset — กลับเป็นค่าเริ่มต้นของ role
  // — จำกัดเฉพาะ root admin เหตุผลเดียวกับ PUT ด้านบน
  app.post('/users/:id/permissions/reset', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireRootAdmin()],
    schema: {
      tags: ['Admin'],
      summary: 'รีเซ็ตสิทธิ์กลับเป็นค่าเริ่มต้นของ role ปัจจุบัน',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: null } })
    if (!target) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    await resetUserPermissions(req.tenantId, req.params.id, target.role)
    return ok(await getUserPermissions(req.tenantId, req.params.id), 'รีเซ็ตสิทธิ์สำเร็จ')
  })

  // GET /api/v1/admin/permissions/notify-recipients?type=leave — รายชื่อแอดมิน/
  // หัวหน้าแผนก + สถานะรับแจ้งเตือนไลน์ของประเภทนี้ — ใช้ในหน้าตั้งค่า →
  // การแจ้งเตือน LINE ให้ผู้ดูแลระบบปิดเฉพาะบางคนได้ ไม่ใช่ปิดทั้ง tenant
  // (feedback 2026-10-01) จำกัดเฉพาะ root admin เหมือนจุดอื่นที่จัดการสิทธิ์คนอื่น
  app.get('/permissions/notify-recipients', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireRootAdmin()],
    schema: {
      tags: ['Admin'],
      summary: 'รายชื่อแอดมิน/หัวหน้าแผนก + สถานะรับแจ้งเตือนไลน์ของประเภทที่ระบุ',
      security: [{ oauth2: [] }],
      querystring: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    if (!NOTIFICATION_TYPES.includes(req.query.type)) return reply.code(400).send(fail('INVALID_TYPE', 'ประเภทแจ้งเตือนไม่ถูกต้อง'))
    return ok(await getNotifyRecipients(req.tenantId, req.query.type as NotificationType))
  })

  // PATCH /api/v1/admin/users/:id/notify — เปิด/ปิดแจ้งเตือนไลน์ประเภทหนึ่งให้
  // บัญชีนี้โดยเฉพาะ (คนละจุดกับ PUT permissions เต็มชุด — แก้แค่ can_notify)
  app.patch('/users/:id/notify', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requireRootAdmin()],
    schema: {
      tags: ['Admin'],
      summary: 'เปิด/ปิดการแจ้งเตือนไลน์ประเภทหนึ่งให้บัญชีนี้',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['type', 'notify'], properties: { type: { type: 'string' }, notify: { type: 'boolean' } } },
    },
  }, async (req: any, reply) => {
    if (!NOTIFICATION_TYPES.includes(req.body.type)) return reply.code(400).send(fail('INVALID_TYPE', 'ประเภทแจ้งเตือนไม่ถูกต้อง'))
    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: null } })
    if (!target) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    await setNotify(req.tenantId, req.params.id, req.body.type as NotificationType, req.body.notify)
    return ok(null, 'บันทึกแล้ว')
  })
}
