// server/src/modules/employee/employee-me.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { ok, fail }         from '../../common/utils/response'
import { prisma }           from '../../common/utils/prisma'
import { listHolidays, holidayAppliesTo } from '../tenant/holiday.service'
import { resolveHolidayPolicy } from '../group/group.service'
import { isFeatureEnabled } from '../../common/utils/features'

export async function employeeMeRoutes(app: FastifyInstance) {

  // GET /api/v1/employee/me
  // ดึงข้อมูล employee + กะที่สังกัด จาก JWT (employee_id + tenant_id)
  app.get('/employee/me', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูข้อมูลตัวเอง + กะที่สังกัด (LIFF)',
      security: [{ oauth2: [] }],
    },
  }, async (req: any, reply) => {
    const employeeId = req.employeeId
    if (!employeeId) return reply.code(401).send(fail('UNAUTHORIZED', 'ไม่พบข้อมูล employee'))

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      include: {
        branch: { select: { id: true, name: true } },
        admin_user: { select: { is_active: true } },
      },
    })
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))

    // ดึงกะของสาขาที่พนักงานสังกัด
    const shifts = await prisma.shift.findMany({
      where: { branch_id: employee.branch_id, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      orderBy: { start_time: 'asc' },
      select: { id: true, name: true, start_time: true, end_time: true, late_threshold_1: true, late_threshold_2: true },
    })

    // สิทธิ์จอง/ลา — cascade 6 ชั้น กลุ่ม→สาขา→ฝ่าย→แผนก→ตำแหน่ง→บุคคล (ดู group.service.ts)
    // ใช้ซ่อน UI ฝั่ง LIFF เมื่อปิด (เช่น สมาร์ทจิ๊กซอว์ หยุดได้แค่เสาร์-อาทิตย์ตายตัว)
    const [policy, tenant] = await Promise.all([
      resolveHolidayPolicy(req.tenantId, employeeId),
      prisma.tenant.findFirst({ where: { id: req.tenantId }, select: { leave_backdate_days: true, enabled_features: true, self_resignation_enabled: true } }),
    ])
    const { booking_enabled, leave_enabled, saturday_rule, sunday_rule, booking_quota } = policy
    const ff = (k: string) => isFeatureEnabled(tenant?.enabled_features, k as any)
    const { admin_user, ...empRest } = employee as any
    const admin_access = !!admin_user?.is_active
    const ADMIN_APP_URL = process.env.ADMIN_APP_URL || 'https://timeline-admin.vercel.app'

    return ok({ employee: { ...empRest, booking_enabled, leave_enabled, saturday_rule, sunday_rule, booking_quota, leave_backdate_days: tenant?.leave_backdate_days ?? null, feat_disciplinary: ff('disciplinary'), feat_resignation: ff('resignation') && (tenant?.self_resignation_enabled ?? true), admin_access, admin_url: admin_access ? ADMIN_APP_URL : null }, shifts })
  })

  // PATCH /api/v1/employee/photo — พนักงานตั้ง/ลบรูปโปรไฟล์ตัวเองผ่าน LIFF
  app.patch('/employee/photo', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ตั้ง/ลบรูปโปรไฟล์ตัวเอง (LIFF) — photo_url=null เพื่อลบ',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['photo_url'],
        properties: { photo_url: { type: ['string', 'null'] } },
      },
    },
  }, async (req: any, reply) => {
    const employeeId = req.employeeId
    if (!employeeId) return reply.code(401).send(fail('UNAUTHORIZED', 'ไม่พบข้อมูล employee'))
    const url = req.body.photo_url
    if (url && !/^https:\/\/\S+$/.test(url)) return reply.code(400).send(fail('INVALID_URL', 'URL ไม่ถูกต้อง'))
    const c = await prisma.employee.updateMany({
      where: { id: employeeId, tenant_id: req.tenantId, deleted_at: null },
      data: { photo_url: url || null },
    })
    if (c.count === 0) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok({ photo_url: url || null })
  })

  // GET /api/v1/employee/holidays?year=
  // วันหยุดนักขัตฤกษ์/ประจำปีของ tenant ที่ใช้กับพนักงานคนนี้ (กรองตามสาขา/แผนกที่ holiday กำหนดไว้)
  app.get('/employee/holidays', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูวันหยุดนักขัตฤกษ์/ประจำปีที่ใช้กับตัวเอง (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { year: { type: 'integer' } },
      },
    },
  }, async (req: any, reply) => {
    const employeeId = req.employeeId
    if (!employeeId) return reply.code(401).send(fail('UNAUTHORIZED', 'ไม่พบข้อมูล employee'))

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      select: { branch_id: true, department: true },
    })
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))

    const year = req.query.year ? Number(req.query.year) : undefined
    const holidays = await listHolidays(req.tenantId, year)
    const applicable = holidays.filter(h => holidayAppliesTo(h, employee))

    return ok(applicable)
  })

  // GET /api/v1/employee/branches/:id
  // ดูชื่อสาขาจาก id — ใช้ตอน scan QR เช็คเอาต์ที่สาขาอื่น (ไม่ใช่สาขาตัวเอง) เพื่อโชว์
  // ชื่อสาขาที่ถูกต้องในหน้ายืนยันก่อนเช็คเอาต์จริง (QR payload มีแค่ branch id ไม่มีชื่อ)
  // ไม่เช็คว่าตรงกับสาขาพนักงานเอง เพราะเช็คเอาต์ทำจากสาขาไหนก็ได้ตามดีไซน์
  app.get('/employee/branches/:id', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูชื่อสาขาจาก id (LIFF) — ใช้แสดงผลตอนสแกน QR เช็คเอาต์ต่างสาขา',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const branch = await prisma.branch.findFirst({
      where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: null },
      select: { id: true, name: true },
    })
    if (!branch) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบสาขา'))
    return ok(branch)
  })
}
