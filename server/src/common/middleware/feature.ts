// server/src/common/middleware/feature.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/prisma'
import { isFeatureEnabled, type FeatureKey } from '../utils/features'

export function requireFeature(key: FeatureKey) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { enabled_features: true },
    })
    if (!isFeatureEnabled(tenant?.enabled_features, key)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'ฟีเจอร์นี้ถูกปิดใช้งานสำหรับบริษัทของคุณ' },
      })
    }
  }
}
