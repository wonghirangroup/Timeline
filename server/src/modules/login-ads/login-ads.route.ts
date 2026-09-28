// server/src/modules/login-ads/login-ads.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import * as svc from './login-ads.service'

const TAG = 'Super Admin'

// SUPER_ADMIN — จัดการแบนเนอร์ฝั่งซ้ายของหน้า login แอดมิน (prefix /api/v1/super-admin)
export async function loginAdsRoutes(app: FastifyInstance) {
  app.get('/login-ads', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'ลิสต์แบนเนอร์หน้า login ทั้งหมด (รวมที่ปิดใช้งาน)', security: [{ oauth2: [] }] },
  }, async () => ok(await svc.listLoginAds(false)))

  app.post('/login-ads', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'เพิ่มแบนเนอร์หน้า login', security: [{ oauth2: [] }],
      body: {
        type: 'object', required: ['image_url'],
        properties: {
          image_url: { type: 'string' },
          link_url:  { type: 'string', nullable: true },
          title:     { type: 'string', nullable: true },
        },
      },
    },
  }, async (req: any, reply) => reply.code(201).send(ok(await svc.createLoginAd(req.body), 'เพิ่มแบนเนอร์แล้ว')))

  app.patch('/login-ads/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'แก้ไขแบนเนอร์ (รูป/ลิงก์/เปิดปิดใช้งาน)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          image_url: { type: 'string' },
          link_url:  { type: 'string', nullable: true },
          title:     { type: 'string', nullable: true },
          is_active: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const row = await svc.updateLoginAd(req.params.id, req.body)
    return row ? ok(row, 'บันทึกแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแบนเนอร์'))
  })

  app.delete('/login-ads/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: { tags: [TAG], summary: 'ลบแบนเนอร์', security: [{ oauth2: [] }], params: { type: 'object', properties: { id: { type: 'string' } } } },
  }, async (req: any, reply) => {
    const done = await svc.deleteLoginAd(req.params.id)
    return done ? ok(null, 'ลบแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแบนเนอร์'))
  })

  app.post('/login-ads/swap-order', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG], summary: 'สลับลำดับ 2 แบนเนอร์ (ปุ่มเลื่อนขึ้น/ลง)', security: [{ oauth2: [] }],
      body: { type: 'object', required: ['id_a', 'id_b'], properties: { id_a: { type: 'string' }, id_b: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const done = await svc.swapLoginAdOrder(req.body.id_a, req.body.id_b)
    return done ? ok(null, 'สลับลำดับแล้ว') : reply.code(404).send(fail('NOT_FOUND', 'ไม่พบแบนเนอร์'))
  })
}

// Public — หน้า login แอดมินดึงก่อนล็อกอิน (ไม่มี auth เลย เหมือน
// employee-auth.route.ts /employee/list) คืนเฉพาะที่เปิดใช้งานอยู่
export async function loginAdsPublicRoutes(app: FastifyInstance) {
  app.get('/login-ads', {
    schema: { tags: ['Admin'], summary: 'แบนเนอร์หน้า login ที่เปิดใช้งาน (public, ไม่ต้อง login)' },
  }, async () => ok(await svc.listLoginAds(true)))
}
