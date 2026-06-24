// server/src/modules/line/line.service.ts
import { prisma } from '../../common/utils/prisma'

export async function getTenantByChannelId(channelId: string) {
  return prisma.tenantLineConfig.findFirst({
    where: { line_channel_id: channelId },
    include: { tenant: { select: { id: true, name: true, is_active: true } } },
  })
}

export async function verifyLiffIdToken(idToken: string, channelId: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    })
    if (!res.ok) return null
    const data = await res.json() as { sub?: string; error?: string }
    return data.sub ?? null  // sub = lineUserId
  } catch {
    return null
  }
}

export async function upsertLineConfig(tenantId: string, data: {
  line_channel_id:           string
  line_channel_secret:       string
  line_channel_access_token?: string
  line_liff_id:              string
}) {
  return prisma.tenantLineConfig.upsert({
    where:  { tenant_id: tenantId },
    update: { ...data },
    create: { tenant_id: tenantId, ...data },
  })
}
