// server/src/modules/tenant/tenant.route.ts
import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { requirePermission, requireRootAdmin } from '../../common/middleware/permission'
import { ok, fail }         from '../../common/utils/response'
import { listTenants, getTenant, createTenant, updateTenant, updateTenantFeatures, deleteTenant } from './tenant.service'
import { FEATURE_KEYS } from '../../common/utils/features'
import { listUsers, createUser, updateUser, deleteUser, generateTempPassword, setUserDepartments, getUserDepartments } from './user.service'
import { listHolidays, createHoliday, updateHoliday, deleteHoliday, batchCreateHolidays, listHolidayWorkedAlerts } from './holiday.service'
import { upsertLineConfig } from '../line/line.service'
import { logActivity }      from '../../common/utils/activityLog'
import { logAudit, resolveActorName, webUserLogInfo } from '../../common/utils/auditLog'
import { prisma }           from '../../common/utils/prisma'

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
          max_groups:       { type: 'integer' },
          admin_email:      { type: 'string' },
          admin_password:   { type: 'string' },
          admin_first_name: { type: 'string' },
          admin_last_name:  { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const result = await createTenant(req.body)
      logActivity({
        action: 'TENANT_CREATED', tenantId: result.tenant.id,
        actorName: req.user?.email ?? 'Super Admin',
        message: `สร้าง Tenant "${result.tenant.name}" ใหม่`,
      })
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
          max_employees: { type: 'integer', minimum: 1 },
          max_branches:  { type: 'integer', minimum: 1 },
          max_groups:    { type: 'integer', minimum: 1 },
          is_active:     { type: 'boolean' },
          firebase_sync_enabled: { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const tenant = await updateTenant(req.params.id, req.body)
    if (!tenant) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Tenant'))
    logActivity({
      action: 'TENANT_UPDATED', tenantId: tenant.id,
      actorName: req.user?.email ?? 'Super Admin',
      message: `แก้ไขข้อมูล Tenant "${tenant.name}"`,
    })
    return ok(tenant, 'อัปเดต Tenant สำเร็จ')
  })

  // POST /api/v1/super-admin/tenants/:id/line-config
  app.post('/tenants/:id/line-config', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ตั้งค่า LINE OA สำหรับ Tenant',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['line_channel_id', 'line_channel_secret', 'line_liff_id'],
        properties: {
          line_channel_id:     { type: 'string' },
          line_channel_secret: { type: 'string' },
          line_liff_id:        { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const config = await upsertLineConfig(req.params.id, {
      line_channel_id:     req.body.line_channel_id,
      line_channel_secret: req.body.line_channel_secret,
      line_liff_id:        req.body.line_liff_id,
    })
    const t = await prisma.tenant.findUnique({ where: { id: req.params.id }, select: { name: true } })
    logActivity({
      action: 'LINE_CONFIG_UPDATED', tenantId: req.params.id,
      actorName: req.user?.email ?? 'Super Admin',
      message: `ตั้งค่า LINE OA ให้ "${t?.name ?? req.params.id}"`,
    })
    return ok(config, 'บันทึก LINE config สำเร็จ')
  })

  // PATCH /api/v1/super-admin/tenants/:id/features — เปิด/ปิดฟีเจอร์ต่อ Tenant
  app.patch('/tenants/:id/features', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'เปิด/ปิดฟีเจอร์ของ Tenant (บางฟีเจอร์บล็อกจริงที่ backend เลย ดู FEATURE_KEYS)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: Object.fromEntries(FEATURE_KEYS.map(k => [k, { type: 'boolean' }])),
      },
    },
  }, async (req: any, reply) => {
    const tenant = await updateTenantFeatures(req.params.id, req.body ?? {})
    if (!tenant) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ Tenant'))
    const changed = Object.entries(req.body ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')
    logActivity({
      action: 'FEATURE_TOGGLED', tenantId: tenant.id,
      actorName: req.user?.email ?? 'Super Admin',
      message: `เปลี่ยนฟีเจอร์ "${tenant.name}": ${changed || '(ไม่มีการเปลี่ยนแปลง)'}`,
    })
    return ok({ enabled_features: tenant.enabled_features }, 'อัปเดตฟีเจอร์สำเร็จ')
  })

  // POST /api/v1/super-admin/tenants/:id/admin — Talent สร้าง Admin คนแรกให้ Tenant
  // (ยังไม่มีระบบส่งอีเมล — โชว์รหัสผ่านชั่วคราวกลับไปครั้งเดียว ให้ Talent copy ไปแจ้งเอง)
  app.post('/tenants/:id/admin', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'สร้าง Admin คนแรกให้ Tenant พร้อมรหัสผ่านชั่วคราว',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['email', 'first_name', 'last_name'],
        properties: {
          email:      { type: 'string', minLength: 1 }, // login identifier — username ล้วนก็ได้ ไม่บังคับรูปแบบอีเมล (feedback 2026-09-14)
          first_name: { type: 'string' },
          last_name:  { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const tempPassword = generateTempPassword()
    try {
      const user = await createUser(req.params.id, {
        email:      req.body.email,
        password:   tempPassword,
        first_name: req.body.first_name,
        last_name:  req.body.last_name,
        role:       'ADMIN',
      }, { mustChangePassword: true })
      const t = await prisma.tenant.findUnique({ where: { id: req.params.id }, select: { name: true } })
      logActivity({
        action: 'ADMIN_CREATED', tenantId: req.params.id,
        actorName: req.user?.email ?? 'Super Admin',
        message: `สร้าง Admin "${req.body.first_name} ${req.body.last_name}" ให้ "${t?.name ?? req.params.id}"`,
      })
      return reply.code(201).send(ok({ user, temp_password: tempPassword }, 'สร้าง Admin สำเร็จ'))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(fail('DUPLICATE_EMAIL', 'อีเมลนี้มีอยู่แล้ว'))
      throw e
    }
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
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'view'), requireRootAdmin()],
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
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'add'), requireRootAdmin()],
    schema: {
      tags: [TAG],
      summary: 'สร้าง User (Admin/Manager/ผู้บริหาร/หัวหน้าแผนก)',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['email', 'password', 'first_name', 'last_name', 'role'],
        properties: {
          email:      { type: 'string', minLength: 1 }, // login identifier — username ล้วนก็ได้ ไม่บังคับรูปแบบอีเมล (feedback 2026-09-14)
          password:   { type: 'string' },
          first_name: { type: 'string' },
          last_name:  { type: 'string' },
          role:       { type: 'string', enum: ['ADMIN', 'MANAGER', 'EXECUTIVE', 'DEPT_HEAD'] },
          recovery_email: { type: 'string', maxLength: 191, description: 'อีเมลรับ OTP ลืมรหัสผ่าน (ไม่บังคับ)' },
          // เฉพาะ role DEPT_HEAD — แผนกที่ดูแล (ดูแลได้หลายแผนก)
          department_ids: { type: 'array', items: { type: 'string' } },
          // ดึงจากพนักงาน — ผูกบัญชีนี้กับพนักงาน เพื่อให้สลับจากแอป LINE เข้าเว็บแอดมินได้
          employee_id: { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const user = await createUser(req.tenantId, req.body)
      const [actorName, info] = await Promise.all([resolveActorName(req.userId), webUserLogInfo(user.id)])
      if (info) logAudit({
        tenantId: req.tenantId, branchId: info.branchId, actorName,
        action: 'WEB_USER_CREATED', entityName: info.name,
        message: `${actorName} เพิ่มผู้ใช้งานเว็บ ${info.name} (${info.email}) บทบาท${info.role}`
          + (info.employeeCode ? ` — ผูกกับพนักงาน ${info.employeeCode} (เข้าเว็บจากแอป LINE ได้)` : ''),
      })
      return reply.code(201).send(ok(user, 'สร้าง User สำเร็จ'))
    } catch (e: any) {
      if (e.message === 'INVALID_EMAIL') return reply.code(400).send(fail('INVALID_EMAIL', 'รูปแบบอีเมลสำหรับกู้รหัสผ่านไม่ถูกต้อง'))
      if (e.message === 'EMPLOYEE_NOT_FOUND') return reply.code(404).send(fail('EMPLOYEE_NOT_FOUND', 'ไม่พบพนักงานคนนี้'))
      if (e.message === 'EMPLOYEE_ALREADY_LINKED') return reply.code(409).send(fail('EMPLOYEE_ALREADY_LINKED', 'พนักงานคนนี้มีบัญชีเข้าเว็บอยู่แล้ว'))
      if (e.code === 'P2002') return reply.code(409).send(fail('DUPLICATE_EMAIL', 'อีเมลนี้มีอยู่แล้ว'))
      throw e
    }
  })

  // GET /api/v1/super-admin/users/:id/departments — แผนกที่หัวหน้าแผนกคนนี้ดูแล
  app.get('/users/:id/departments', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'view'), requireRootAdmin()],
    schema: {
      tags: [TAG], summary: 'ดูแผนกที่ user (DEPT_HEAD) คนนี้ดูแล', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any) => ok(await getUserDepartments(req.tenantId, req.params.id)))

  // PUT /api/v1/super-admin/users/:id/departments — ตั้งใหม่ทั้งชุด
  app.put('/users/:id/departments', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'edit'), requireRootAdmin()],
    schema: {
      tags: [TAG], summary: 'ตั้งแผนกที่ user (DEPT_HEAD) ดูแล (แทนที่ทั้งชุด)', security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['department_ids'], properties: { department_ids: { type: 'array', items: { type: 'string' } } } },
    },
  }, async (req: any, reply) => {
    try {
      const result = await setUserDepartments(req.tenantId, req.params.id, req.body.department_ids)
      return ok(result, 'ตั้งค่าแผนกที่ดูแลสำเร็จ')
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
      throw e
    }
  })

  // PATCH /api/v1/super-admin/users/:id
  app.patch('/users/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'edit'), requireRootAdmin()],
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
          recovery_email: { type: 'string', maxLength: 191, description: 'อีเมลรับ OTP ลืมรหัสผ่าน — ส่งสตริงว่างเพื่อลบ' },
        },
      },
    },
  }, async (req: any, reply) => {
    let ok_: boolean
    try { ok_ = await updateUser(req.tenantId, req.params.id, req.body) }
    catch (e: any) { if (e?.message === 'INVALID_EMAIL') return reply.code(400).send(fail('INVALID_EMAIL', 'รูปแบบอีเมลสำหรับกู้รหัสผ่านไม่ถูกต้อง')); throw e }
    if (!ok_) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    const [actorName, info] = await Promise.all([resolveActorName(req.userId), webUserLogInfo(req.params.id)])
    if (info) {
      // ไม่บันทึกค่ารหัสผ่าน บอกแค่ว่ามีการเปลี่ยน
      const changes = [
        (req.body.first_name !== undefined || req.body.last_name !== undefined) && 'แก้ชื่อ',
        req.body.password && 'เปลี่ยนรหัสผ่าน',
        req.body.is_active === false && 'ปิดใช้งาน',
        req.body.is_active === true && 'เปิดใช้งาน',
      ].filter(Boolean)
      logAudit({
        tenantId: req.tenantId, branchId: info.branchId, actorName,
        action: 'WEB_USER_UPDATED', entityName: info.name,
        message: `${actorName} แก้ไขผู้ใช้งานเว็บ ${info.name} (${info.email})${changes.length ? ` — ${changes.join(', ')}` : ''}`,
      })
    }
    return ok(null, 'อัปเดต User สำเร็จ')
  })

  // DELETE /api/v1/super-admin/users/:id
  app.delete('/users/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), requirePermission('user_management', 'delete'), requireRootAdmin()],
    schema: {
      tags: [TAG],
      summary: 'ลบ User (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const info = await webUserLogInfo(req.params.id)
    const deleted = await deleteUser(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ User'))
    if (info) {
      const actorName = await resolveActorName(req.userId)
      logAudit({
        tenantId: req.tenantId, branchId: info.branchId, actorName,
        action: 'WEB_USER_DELETED', entityName: info.name,
        message: `${actorName} ลบผู้ใช้งานเว็บ ${info.name} (${info.email})`
          + (info.employeeCode ? ` — พนักงาน ${info.employeeCode} จะไม่เห็นปุ่มเข้าเว็บในแอป LINE อีก` : ''),
      })
    }
    return ok(null, 'ลบ User สำเร็จ')
  })

  // ── Holiday Management ────────────────────────────────────────────

  // GET /api/v1/super-admin/holidays?year=
  app.get('/holidays', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
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
          name:               { type: 'string' },
          date:               { type: 'string', description: 'YYYY-MM-DD' },
          type:               { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
          recurring:          { type: 'boolean' },
          target_branches:    { type: 'array', items: { type: 'string' }, description: 'branch_id ที่จะให้หยุด — ว่าง/ไม่ส่ง = ทุกสาขา' },
          target_departments: { type: 'array', items: { type: 'string' }, description: 'รหัสแผนก — ว่าง/ไม่ส่ง = ทุกแผนก' },
          employee_includes:  { type: 'array', items: { type: 'string' }, description: 'employee_id ที่ได้หยุดเพิ่ม แม้ branch/dept จะไม่ครอบคลุม' },
          employee_excludes:  { type: 'array', items: { type: 'string' }, description: 'employee_id ที่ไม่ได้หยุด แม้ branch/dept จะครอบคลุม' },
          compensate_days:    { type: 'integer', description: 'วันชดเชยถ้ามาทำงานในวันนี้ (default 1)' },
          compensate_leave_type: { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER'], description: 'วันที่ได้ให้ลงประเภทไหน (default COMPENSATE) — เช่น VACATION ถ้าอยากให้เป็น "พักร้อนเพิ่ม" แทน "ชดเชย"' },
        },
      },
    },
  }, async (req: any, reply) => {
    const holiday = await createHoliday(req.tenantId, req.body)
    return reply.code(201).send(ok(holiday, 'เพิ่มวันหยุดสำเร็จ'))
  })

  // GET /api/v1/super-admin/holidays/worked-alerts — ใครทำงานในวันหยุดนักขัตฤกษ์บ้าง
  app.get('/holidays/worked-alerts', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE')],
    schema: {
      tags: [TAG], summary: 'ดูรายชื่อคนที่ทำงานในวันหยุดนักขัตฤกษ์ที่ควรหยุด (Alert)', security: [{ oauth2: [] }],
    },
  }, async (req: any) => ok(await listHolidayWorkedAlerts(req.tenantId)))

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
          name:               { type: 'string' },
          date:               { type: 'string' },
          type:               { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
          recurring:          { type: 'boolean' },
          target_branches:    { type: ['array', 'null'], items: { type: 'string' } },
          target_departments: { type: ['array', 'null'], items: { type: 'string' } },
          employee_includes:  { type: ['array', 'null'], items: { type: 'string' } },
          employee_excludes:  { type: ['array', 'null'], items: { type: 'string' } },
          compensate_days:    { type: 'integer' },
          compensate_leave_type: { type: 'string', enum: ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY', 'COMPENSATE', 'OTHER'] },
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
                name:               { type: 'string' },
                date:               { type: 'string' },
                type:               { type: 'string', enum: ['NATIONAL', 'RELIGIOUS', 'COMPANY'] },
                recurring:          { type: 'boolean' },
                target_branches:    { type: 'array', items: { type: 'string' } },
                target_departments: { type: 'array', items: { type: 'string' } },
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

  // POST /api/v1/super-admin/line-config/test — ทดสอบเชื่อมต่อ LINE OA จริง (ไม่ใช่
  // แค่เช็คว่ากรอกครบ) — แลก access token จาก channel id+secret ด้วย client_credentials
  // grant ถ้ายังไม่มี token อยู่แล้ว แล้วยิง GET /v2/bot/info จริงกับ LINE เพื่อยืนยันว่า
  // credential ใช้ได้จริง คืนชื่อ/รูปบอทให้เห็นเป็นหลักฐาน ไม่ผูกกับ tenant ไหนเป็นพิเศษ
  // ใช้ทดสอบก่อนบันทึกก็ได้ (feedback 2026-10-01: "เชื่อมต่อได้จริงไหม" — ปุ่ม Test
  // เดิมเป็นแค่ setTimeout เช็คว่ากรอกไม่ว่างเฉยๆ ไม่เคยยิงหา LINE จริง)
  app.post('/line-config/test', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ทดสอบเชื่อมต่อ LINE OA จริงกับ LINE Platform',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        properties: {
          line_channel_id:           { type: 'string' },
          line_channel_secret:       { type: 'string' },
          line_channel_access_token: { type: 'string' },
        },
      },
    },
  }, async (req: any) => {
    try {
      let token: string | undefined = req.body.line_channel_access_token || undefined
      if (!token) {
        if (!req.body.line_channel_id || !req.body.line_channel_secret) {
          return ok({ ok: false, error: 'ต้องกรอก Channel ID + Channel Secret หรือ Access Token อย่างน้อยหนึ่งแบบ' })
        }
        const tokenRes = await axios.post(
          'https://api.line.me/oauth2/v3/token',
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: req.body.line_channel_id,
            client_secret: req.body.line_channel_secret,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 },
        )
        token = tokenRes.data.access_token
      }
      const botRes = await axios.get('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      })
      return ok({ ok: true, displayName: botRes.data.displayName, basicId: botRes.data.basicId, pictureUrl: botRes.data.pictureUrl })
    } catch (e: any) {
      const lineMsg = e?.response?.data?.error_description || e?.response?.data?.message || e.message || 'เชื่อมต่อ LINE ไม่สำเร็จ'
      return ok({ ok: false, error: lineMsg })
    }
  })
}
