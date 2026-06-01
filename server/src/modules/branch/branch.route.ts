// server/src/modules/branch/branch.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listBranches, getBranch, createBranch, updateBranch, deleteBranch, getBranchQrUrl } from './branch.service'

const TAG = 'Admin'

export async function branchRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/branches
  app.get('/branches', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการสาขาทั้งหมดของ tenant',
      security: [{ oauth2: [] }],
    },
  }, async (req, reply) => {
    const branches = await listBranches(req.tenantId)
    return ok(branches)
  })

  // GET /api/v1/admin/branches/:id
  app.get('/branches/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูข้อมูลสาขาตาม ID',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const branch = await getBranch(req.tenantId, req.params.id)
    if (!branch) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขา'))
    return ok(branch)
  })

  // POST /api/v1/admin/branches
  app.post('/branches', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'สร้างสาขาใหม่',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name:       { type: 'string' },
          location:   { type: 'string' },
          lat:        { type: 'number' },
          lng:        { type: 'number' },
          gps_radius: { type: 'number', description: 'รัศมียอมรับ (เมตร) default 200' },
          geo_mode:   { type: 'string', enum: ['WARN', 'BLOCK'], description: 'WARN=แจ้งเตือน, BLOCK=บล็อค' },
        },
      },
    },
  }, async (req: any, reply) => {
    const branch = await createBranch(req.tenantId, req.body)
    return reply.code(201).send(ok(branch, 'สร้างสาขาสำเร็จ'))
  })

  // PATCH /api/v1/admin/branches/:id
  app.patch('/branches/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไขข้อมูลสาขา',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name:       { type: 'string' },
          location:   { type: 'string' },
          lat:        { type: 'number' },
          lng:        { type: 'number' },
          gps_radius: { type: 'number' },
          geo_mode:   { type: 'string', enum: ['WARN', 'BLOCK'] },
          is_active:  { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const branch = await updateBranch(req.tenantId, req.params.id, req.body)
    if (!branch) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขา'))
    return ok(branch, 'อัปเดตสาขาสำเร็จ')
  })

  // GET /api/v1/admin/branches/:id/qr?shiftId=xxx
  app.get('/branches/:id/qr', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดึง URL สำหรับสร้าง QR เช็คอิน (BLOCK mode)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: {
        type: 'object',
        required: ['shiftId'],
        properties: { shiftId: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const result = await getBranchQrUrl(req.tenantId, req.params.id, req.query.shiftId)
    if (!result) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขาหรือกะนี้'))
    return ok(result)
  })

  // DELETE /api/v1/admin/branches/:id
  app.delete('/branches/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบสาขา (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteBranch(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขา'))
    return ok(null, 'ลบสาขาสำเร็จ')
  })
}
