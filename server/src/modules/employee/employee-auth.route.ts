// server/src/modules/employee/employee-auth.route.ts
import { FastifyInstance } from 'fastify'
import { ok, fail }        from '../../common/utils/response'
import { getTenantByChannelId, verifyLiffIdToken } from '../line/line.service'
import { prisma } from '../../common/utils/prisma'

export async function employeeAuthRoutes(app: FastifyInstance) {

  // POST /api/v1/employee/auth/liff
  // Exchange LIFF idToken → JWT (ไม่ต้องมี auth middleware — นี่คือ auth endpoint)
  app.post('/employee/auth/liff', {
    schema: {
      tags: ['Employee'],
      summary: 'แลก LIFF idToken เป็น JWT (สำหรับ LIFF app)',
      body: {
        type: 'object',
        required: ['liff_token', 'line_user_id', 'line_channel_id'],
        properties: {
          liff_token:      { type: 'string' },
          line_user_id:    { type: 'string' },
          line_channel_id: { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const { liff_token, line_user_id, line_channel_id } = req.body

    // 1. หา tenant จาก channel_id
    const config = await getTenantByChannelId(line_channel_id)
    if (!config) return reply.code(401).send(fail('INVALID_CHANNEL', 'ไม่พบ tenant สำหรับ Line Channel นี้'))
    if (!config.tenant.is_active) return reply.code(403).send(fail('TENANT_INACTIVE', 'บัญชีไม่ได้ใช้งาน'))

    // 2. ยืนยัน LIFF token กับ Line API
    const verifiedUserId = await verifyLiffIdToken(liff_token, line_channel_id)
    if (!verifiedUserId || verifiedUserId !== line_user_id) {
      return reply.code(401).send(fail('INVALID_TOKEN', 'LIFF token ไม่ถูกต้อง'))
    }

    // 3. หา employee จาก line_user_id + tenant_id
    const employee = await prisma.employee.findFirst({
      where: { line_user_id, tenant_id: config.tenant.id, deleted_at: null, is_active: true },
      include: { branch: { select: { id: true, name: true } } },
    })
    if (!employee) {
      return reply.code(404).send(fail('EMPLOYEE_NOT_FOUND', 'ไม่พบพนักงาน กรุณายืนยันตัวตนก่อน'))
    }

    // 4. ออก JWT
    const token = await (app as any).jwt.sign({
      id:          employee.id,
      tenant_id:   config.tenant.id,
      role:        'EMPLOYEE',
      employee_id: employee.id,
    }, { expiresIn: '12h' })

    return ok({ token, employee: { id: employee.id, first_name: employee.first_name, last_name: employee.last_name, employee_code: employee.employee_code, branch: employee.branch } }, 'เข้าสู่ระบบสำเร็จ')
  })

  // GET /api/v1/employee/list?line_channel_id=xxx
  // ดึงรายชื่อพนักงานที่ยังไม่ผูก Line (สำหรับหน้า verify)
  app.get('/employee/list', {
    schema: {
      tags: ['Employee'],
      summary: 'รายชื่อพนักงานที่ยังไม่ผูก Line (ใช้ตอน verify)',
      querystring: {
        type: 'object',
        required: ['line_channel_id'],
        properties: { line_channel_id: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const config = await getTenantByChannelId(req.query.line_channel_id)
    if (!config) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบ tenant'))

    const employees = await prisma.employee.findMany({
      where: {
        tenant_id:    config.tenant.id,
        line_user_id: null,            // เฉพาะที่ยังไม่ผูก
        deleted_at:   null,
        is_active:    true,
      },
      select: {
        id: true, first_name: true, last_name: true,
        nickname: true, department: true, employee_code: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ branch_id: 'asc' }, { first_name: 'asc' }],
    })

    return ok(employees)
  })

  // POST /api/v1/employee/verify
  // พนักงานยืนยันตัวตนครั้งแรก — ผูก line_user_id กับ employee_code
  app.post('/employee/verify', {
    schema: {
      tags: ['Employee'],
      summary: 'ยืนยันตัวตนครั้งแรก — ผูก Line กับรหัสพนักงาน',
      body: {
        type: 'object',
        required: ['liff_token', 'line_user_id', 'line_channel_id', 'employee_code'],
        properties: {
          liff_token:      { type: 'string' },
          line_user_id:    { type: 'string' },
          line_channel_id: { type: 'string' },
          employee_code:   { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    const { liff_token, line_user_id, line_channel_id, employee_code } = req.body

    const config = await getTenantByChannelId(line_channel_id)
    if (!config) return reply.code(401).send(fail('INVALID_CHANNEL', 'ไม่พบ tenant'))

    const verifiedUid = await verifyLiffIdToken(liff_token, line_channel_id)
    if (!verifiedUid || verifiedUid !== line_user_id) {
      return reply.code(401).send(fail('INVALID_TOKEN', 'LIFF token ไม่ถูกต้อง'))
    }

    // หาพนักงานจากรหัส
    const employee = await prisma.employee.findFirst({
      where: { employee_code, tenant_id: config.tenant.id, deleted_at: null },
    })
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงานที่มีรหัสนี้'))

    // เช็คว่า line_user_id ถูกใช้แล้วหรือยัง
    if (employee.line_user_id && employee.line_user_id !== line_user_id) {
      return reply.code(409).send(fail('ALREADY_LINKED', 'รหัสนี้ผูกกับ Line อื่นแล้ว'))
    }

    // ผูก line_user_id
    await prisma.employee.update({
      where: { id: employee.id },
      data:  { line_user_id },
    })

    // ออก JWT
    const token = await (app as any).jwt.sign({
      id: employee.id, tenant_id: config.tenant.id, role: 'EMPLOYEE', employee_id: employee.id,
    }, { expiresIn: '12h' })

    return ok({ token, employee: { id: employee.id, first_name: employee.first_name, last_name: employee.last_name, employee_code: employee.employee_code } }, 'ยืนยันตัวตนสำเร็จ')
  })
}
