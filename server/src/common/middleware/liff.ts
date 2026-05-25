// server/src/common/middleware/liff.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../utils/prisma'
import axios from 'axios'

export async function liffMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const liffToken  = req.headers['x-liff-token']    as string
  const lineUserId = req.headers['x-line-user-id']  as string
  const channelId  = req.headers['x-line-channel-id'] as string

  if (!liffToken || !lineUserId || !channelId) {
    return reply.status(401).send({ success: false, error: { code: 'LIFF_MISSING_HEADERS', message: 'Missing LIFF headers' } })
  }

  const lineConfig = await prisma.tenantLineConfig.findFirst({ where: { line_channel_id: channelId } })
  if (!lineConfig) {
    return reply.status(403).send({ success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Line channel not registered' } })
  }

  const ok = await verifyLiffToken(liffToken, lineUserId, lineConfig.line_channel_id)
  if (!ok) {
    return reply.status(401).send({ success: false, error: { code: 'LIFF_INVALID_TOKEN', message: 'Invalid LIFF token' } })
  }

  const employee = await prisma.employee.findFirst({
    where: { tenant_id: lineConfig.tenant_id, line_user_id: lineUserId },
  })
  if (!employee) {
    return reply.status(403).send({ success: false, error: { code: 'EMPLOYEE_NOT_MAPPED', message: 'กรุณายืนยันตัวตนก่อนใช้งาน' } })
  }

  req.tenantId   = lineConfig.tenant_id
  req.employeeId = employee.id
}

async function verifyLiffToken(token: string, lineUserId: string, channelId: string) {
  try {
    const params = new URLSearchParams({ id_token: token, client_id: channelId })
    const res = await axios.post('https://api.line.me/oauth2/v2.1/verify', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return res.data.sub === lineUserId
  } catch { return false }
}
