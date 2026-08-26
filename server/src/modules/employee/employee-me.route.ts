// server/src/modules/employee/employee-me.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { ok, fail }         from '../../common/utils/response'
import { prisma }           from '../../common/utils/prisma'
import { listHolidays, holidayAppliesTo } from '../tenant/holiday.service'
import { resolveBookingEnabled } from '../group/group.service'

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
      include: { branch: { select: { id: true, name: true } } },
    })
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))

    // ดึงกะของสาขาที่พนักงานสังกัด
    const shifts = await prisma.shift.findMany({
      where: { branch_id: employee.branch_id, tenant_id: req.tenantId, deleted_at: null, is_active: true },
      orderBy: { start_time: 'asc' },
      select: { id: true, name: true, start_time: true, end_time: true, late_threshold_1: true, late_threshold_2: true },
    })

    // สิทธิ์จองวันหยุด — cascade จากกลุ่ม/ฝ่าย/แผนก/ตัวเอง (ดู group.service.ts)
    // ใช้ซ่อน UI จองวันหยุดฝั่ง LIFF เมื่อกลุ่มปิด (เช่น สมาร์ทจิ๊กซอว์ หยุดได้แค่เสาร์-อาทิตย์ตายตัว)
    const booking_enabled = await resolveBookingEnabled(req.tenantId, employeeId)

    return ok({ employee: { ...employee, booking_enabled }, shifts })
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
