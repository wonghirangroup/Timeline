// server/src/common/middleware/rbac.ts
import { FastifyRequest, FastifyReply } from 'fastify'

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์เข้าถึง' } })
    }
  }
}
