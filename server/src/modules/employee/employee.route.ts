// server/src/modules/employee/employee.route.ts
import { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../common/middleware/tenant'
import { requireRole }      from '../../common/middleware/rbac'
import { ok, fail }         from '../../common/utils/response'
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } from './employee.service'

const TAG = 'Admin'

export async function employeeRoutes(app: FastifyInstance) {
  // GET /api/v1/admin/employees?branchId=
  app.get('/employees', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูรายการพนักงานทั้งหมด (กรองตาม branchId ได้)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        properties: { branchId: { type: 'string' } },
      },
    },
  }, async (req: any) => {
    const employees = await listEmployees(req.tenantId, req.query.branchId)
    return ok(employees)
  })

  // GET /api/v1/admin/employees/:id
  app.get('/employees/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER')],
    schema: {
      tags: [TAG],
      summary: 'ดูข้อมูลพนักงานตาม ID',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const employee = await getEmployee(req.tenantId, req.params.id)
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok(employee)
  })

  // POST /api/v1/admin/employees
  app.post('/employees', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'เพิ่มพนักงานใหม่',
      security: [{ oauth2: [] }],
      body: {
        type: 'object',
        required: ['branch_id', 'employee_code', 'first_name', 'last_name'],
        properties: {
          branch_id:     { type: 'string' },
          employee_code: { type: 'string' },
          first_name:    { type: 'string' },
          last_name:     { type: 'string' },
          phone:         { type: 'string' },
        },
      },
    },
  }, async (req: any, reply) => {
    try {
      const employee = await createEmployee(req.tenantId, req.body)
      return reply.code(201).send(ok(employee, 'เพิ่มพนักงานสำเร็จ'))
    } catch (e: any) {
      if (e.code === 'P2002') return reply.code(409).send(fail('DUPLICATE', 'รหัสพนักงานซ้ำ'))
      throw e
    }
  })

  // PATCH /api/v1/admin/employees/:id
  app.patch('/employees/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'แก้ไขข้อมูลพนักงาน',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        properties: {
          branch_id:    { type: 'string' },
          first_name:   { type: 'string' },
          last_name:    { type: 'string' },
          phone:        { type: 'string' },
          line_user_id: { type: 'string' },
          is_active:    { type: 'boolean' },
        },
      },
    },
  }, async (req: any, reply) => {
    const employee = await updateEmployee(req.tenantId, req.params.id, req.body)
    if (!employee) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok(employee, 'อัปเดตพนักงานสำเร็จ')
  })

  // GET /api/v1/admin/employees/:id/profile (Employee self profile via LIFF)
  app.get('/employees/profile', {
    preHandler: [tenantMiddleware],
    schema: {
      tags: ['Employee'],
      summary: 'ดูข้อมูลตัวเองผ่าน lineUserId (LIFF)',
      security: [{ oauth2: [] }],
      querystring: {
        type: 'object',
        required: ['employeeId'],
        properties: { employeeId: { type: 'string' } },
      },
    },
  }, async (req: any, reply) => {
    const { prisma } = await import('../../common/utils/prisma')
    const employee = await prisma.employee.findFirst({
      where: { id: (req.query as any).employeeId, tenant_id: req.tenantId || undefined, deleted_at: null },
      include: { branch: { select: { id: true, name: true } } },
    })
    if (!employee) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบพนักงาน' } })
    return { success: true, data: employee }
  })

  // DELETE /api/v1/admin/employees/:id
  app.delete('/employees/:id', {
    preHandler: [tenantMiddleware, requireRole('SUPER_ADMIN', 'ADMIN')],
    schema: {
      tags: [TAG],
      summary: 'ลบพนักงาน (soft delete)',
      security: [{ oauth2: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req: any, reply) => {
    const deleted = await deleteEmployee(req.tenantId, req.params.id)
    if (!deleted) return reply.code(404).send(fail('NOT_FOUND', 'ไม่พบพนักงาน'))
    return ok(null, 'ลบพนักงานสำเร็จ')
  })
}
