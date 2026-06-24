// server/src/modules/tenant/tenant.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listTenants, getTenant, createTenant, updateTenant, deleteTenant } from './tenant.service'
import { listUsers, createUser, updateUser, deleteUser } from './user.service'
import { listHolidays, createHoliday, updateHoliday, deleteHoliday, batchCreateHolidays } from './holiday.service'
import { upsertLineConfig } from '../line/line.service'

const TAG = 'Super Admin'

export async function tenantRoutes(app: FastifyInstance) {

  // GET /api/v1/super-admin/tenants
  app.get('/tenants', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการ Tenant ทั้งหมด',
      security: [{ oauth2: [] }],
    },
  }, async () => {
    const tenants = await listTenants()
    return ok(tenants)
  })

  // GET /api/v1/super-admin/tenants/:id
  app.get('/tenants/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ดูข้อมูล Tenant ตาม ID',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Tenant'))
    return ok(tenant)
  })

  // POST /api/v1/super-admin/tenants
  app.post('/tenants', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'สร้าง Tenant ใหม่ พร้อม Admin account',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['name', 'admin_email', 'admin_password', 'admin_first_name', 'admin_last_name'],
        properties: {
          name:             { type: 'string' },
          plan:             { type: 'string', enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] },
          max_employees:    { type: 'integer' },
          max_branches:     { type: 'integer' },
          admin_email:      { type: 'string', format: 'email' },
          admin_password:   { type: 'string' },
          admin_first_name: { type: 'string' },
          admin_last_name:  { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createTenant(req.body)
      return reply.code(201).send(ok(result, 'สร้าง Tenant สำเร็จ'))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(fail('DUPLICATE_EMAIL', 'อีเมล Admin นี้มีอยู่แล้ว'))
      throw e
    }
  })

  // PATCH /api/v1/super-admin/tenants/:id
  app.patch('/tenants/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไขข้อมูล Tenant',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name:          { type: 'string' },
          plan:          { type: 'string', enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] },
          max_employees: { type: 'integer' },
          max_branches:  { type: 'integer' },
          is_active:     { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const tenant = await updateTenant(req.params.id, req.body)
    if (!tenant) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Tenant'))
    return ok(tenant, 'อัปเดต Tenant สำเร็จ')
  })

  // DELETE /api/v1/super-admin/tenants/:id
  app.delete('/tenants/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ระงับ Tenant (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteTenant(req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Tenant'))
    return ok(null, 'ระงับ Tenant สำเร็จ')
  })

  // ── User Management ───────────────────────────────────────────────

  // GET /api/v1/super-admin/users
  app.get('/users', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการ User (Admin/Manager) ทั้งหมด',
      security: [{ oauth2: [] }],
    },
  }, async (req: any) => {
    const users = await listUsers(req.tenantId)
    return ok(users)
  })

  // POST /api/v1/super-admin/users
  app.post('/users', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'สร้าง User (Admin หรือ Manager)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'first_name', 'last_name', 'role'],
        properties: {
          email:      { type: 'string', format: 'email' },
          password:   { type: 'string' },
          first_name: { type: 'string' },
          last_name:  { type: 'string' },
          role:       { type: 'string', enum: ['ADMIN', 'MANAGER'] },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const user = await createUser(req.tenantId, req.body)
      return reply.code(201).send(ok(user, 'สร้าง User สำเร็จ'))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(fail('DUPLICATE_EMAIL', 'อีเมลนี้มีอยู่แล้ว'))
      throw e
    }
  })

  // PATCH /api/v1/super-admin/users/:id
  app.patch('/users/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไข User',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name:  { type: 'string' },
          password:   { type: 'string' },
          is_active:  { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const ok_ = await updateUser(req.tenantId, req.params.id, req.body)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    return ok(null, 'อัปเดต User สำเร็จ')
  })

  // DELETE /api/v1/super-admin/users/:id
  app.delete('/users/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบ User (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteUser(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    return ok(null, 'ลบ User สำเร็จ')
  })

  // ── Holiday Management ────────────────────────────────────────────

  // GET /api/v1/super-admin/holidays?year=
  app.get('/holidays', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูวันหยุดประจำปี',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { year: { type: 'integer' } },
      },
    },
  }, async (req: any) => {
    const holidays = await listHolidays(req.tenantId, req.query.year)
    return ok(holidays)
  })

  // POST /api/v1/super-admin/holidays
  app.post('/holidays', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'เพิ่มวันหยุด',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['name', 'date'],
        properties: {
          name:      { type: 'string' },
          date:      { type: 'string', description: 'YYYY-MM-DD' },
          type:      { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
          recurring: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const holiday = await createHoliday(req.tenantId, req.body)
    return reply.code(201).send(ok(holiday, 'เพิ่มวันหยุดสำเร็จ'))
  })

  // PATCH /api/v1/super-admin/holidays/:id
  app.patch('/holidays/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไขวันหยุด',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          name:      { type: 'string' },
          date:      { type: 'string' },
          type:      { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
          recurring: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const ok_ = await updateHoliday(req.tenantId, req.params.id, req.body)
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบวันหยุด'))
    return ok(null, 'แก้ไขวันหยุดสำเร็จ')
  })

  // POST /api/v1/super-admin/holidays/batch — import หลายวันพร้อมกัน
  app.post('/holidays/batch', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'Import วันหยุดหลายวันพร้อมกัน (ข้ามวันซ้ำอัตโนมัติ)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'date'],
              properties: {
                name:      { type: 'string' },
                date:      { type: 'string' },
                type:      { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
                recurring: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (req: any, reply) => {
    const result = await batchCreateHolidays(req.tenantId, req.body.items)
    return reply.code(201).send(ok(result, `นำเข้าวันหยุด ${result.count} วันสำเร็จ`))
  })

  // DELETE /api/v1/super-admin/holidays/:id
  app.delete('/holidays/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบวันหยุด',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteHoliday(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบวันหยุด'))
    return ok(null, 'ลบวันหยุดสำเร็จ')
  })

  // PUT /api/v1/super-admin/tenants/:id/line-config
  app.put('/tenants/:id/line-config', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ตั้งค่า Line OA ให้ Tenant',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['line_channel_id', 'line_channel_secret', 'line_liff_id'],
        properties: {
          line_channel_id:           { type: 'string' },
          line_channel_secret:       { type: 'string' },
          line_channel_access_token: { type: 'string' },
          line_liff_id:              { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const config = await upsertLineConfig(req.params.id, req.body)
    return ok(config, 'ตั้งค่า Line สำเร็จ')
  })
}
