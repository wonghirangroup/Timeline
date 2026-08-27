// server/src/modules/line/line.service.ts
import { prisma } from '../../common/utils/prisma'

export async function getTenantByChannelId(channelId: string) {
  // ลอง match direct channel_id ก่อน
  const byChannel = await prisma.tenantLineConfig.findFirst({
    where: { line_channel_id: channelId },
    include: { tenant: { select: { id: true, name: true, is_active: true } } },
  })
  if (byChannel) return byChannel

  // Fallback: LIFF อาจถูกสร้างบน channel ที่ต่างจาก Messaging API channel
  // เช่น LIFF ID "2010564267-xxx" แต่ line_channel_id ที่บันทึกคือ "2010564253"
  return prisma.tenantLineConfig.findFirst({
    where: { line_liff_id: { startsWith: `${channelId}-` } },
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
    const data = await res.json() as { sub?: string; error?: string; error_description?: string }
    if (!res.ok) {
      console.error(`[LIFF verify] failed client_id=${channelId} status=${res.status} error=${data.error} desc=${data.error_description}`)
      return null
    }
    return data.sub ?? null
  } catch (e) {
    console.error('[LIFF verify] exception:', e)
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
