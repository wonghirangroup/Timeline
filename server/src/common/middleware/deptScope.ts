// server/src/common/middleware/deptScope.ts
// หัวหน้าแผนก (DEPT_HEAD) — จำกัดขอบเขตข้อมูลเฉพาะพนักงานในแผนกที่ดูแล (บังคับจริงที่
// backend ไม่ใช่แค่ซ่อน UI) resolve chain: UserDepartment → Department → Position →
// Employee.position_id (ตำแหน่งผูกแผนกตรงๆ เสมอ ตั้งแต่งาน Group layer วันนี้)
//
// ใช้เป็น preHandler ต่อท้าย requireRole(...) เสมอ ในทุก route ที่ DEPT_HEAD เข้าถึงได้
// role อื่นไม่ถูกแตะเลย (req.scopedEmployeeIds ยังเป็น undefined = ไม่ scope)
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/prisma'

declare module 'fastify' {
  interface FastifyRequest {
    // undefined = role นี้ไม่ต้อง scope (ไม่ใช่ DEPT_HEAD) — [] = DEPT_HEAD แต่ยังไม่ได้
    // ผูกแผนกไหนเลย (เห็นไม่ได้สักคน) — array ที่มีค่า = employee_id ที่เข้าถึงได้
    scopedEmployeeIds?: string[]
  }
}

export async function resolveDeptScope(req: FastifyRequest, _reply: FastifyReply) {
  if (req.userRole !== 'DEPT_HEAD') return

  const deptLinks = await prisma.userDepartment.findMany({
    where: { user_id: req.userId },
    select: { department_id: true },
  })
  const departmentIds = deptLinks.map(d => d.department_id)
  if (departmentIds.length === 0) { req.scopedEmployeeIds = []; return }

  const positions = await prisma.position.findMany({
    where: { department_id: { in: departmentIds }, tenant_id: req.tenantId, deleted_at: null },
    select: { id: true },
  })
  const positionIds = positions.map(p => p.id)
  if (positionIds.length === 0) { req.scopedEmployeeIds = []; return }

  const employees = await prisma.employee.findMany({
    where: { position_id: { in: positionIds }, tenant_id: req.tenantId, deleted_at: null },
    select: { id: true },
  })
  req.scopedEmployeeIds = employees.map(e => e.id)
}
