// server/src/modules/attendance/attendance.route.ts
import { FastifyInstance } from 'fastify'

export async function attendanceRoutes(app: FastifyInstance) {
  // Simple check-in stub for LIFF smoke tests
  app.post('/employee/attendance/check-in', async (request: any, reply) => {
    const body = request.body || {}
    // In real flow we would verify LIFF token and resolve employee
    const sample = {
      success: true,
      data: {
        employee_id: body.employeeId || 'emp-dev-1',
        branch_id: body.branchId || 'branch-dev-1',
        shift_id: body.shiftId || null,
        check_in_time: new Date().toISOString(),
      },
      message: 'checked-in (stub)'
    }
    return sample
  })

  app.post('/employee/attendance/check-out', async (request: any, reply) => {
    const body = request.body || {}
    return {
      success: true,
      data: { employee_id: body.employeeId || 'emp-dev-1', check_out_time: new Date().toISOString() },
      message: 'checked-out (stub)'
    }
  })
}
