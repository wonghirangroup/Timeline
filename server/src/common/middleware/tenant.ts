// server/src/common/middleware/tenant.ts
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    tenantId:   string
    userId?:    string
    userRole?:  string
    employeeId?: string
  }
}

export async function tenantMiddleware(req: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<{
      id:           string
      tenant_id:    string | null
      role?:        string
      employee_id?: string
    }>()
    req.tenantId   = payload.tenant_id ?? ''
    req.userId     = payload.id
    req.userRole   = payload.role
    req.employeeId = payload.employee_id
  } catch {
    return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
  }
}
