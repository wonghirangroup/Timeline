// server/src/modules/announcement/announcement.service.ts
import { prisma } from '../../common/utils/prisma'

async function lineMulticast(accessToken: string, toIds: string[], text: string) {
  if (toIds.length === 0) return { sent: 0 }
  // LINE multicast รองรับสูงสุด 500 คนต่อ request
  const chunks: string[][] = []
  for (let i = 0; i < toIds.length; i += 500) chunks.push(toIds.slice(i, i + 500))

  for (const chunk of chunks) {
    const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: chunk,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`LINE multicast failed: ${JSON.stringify(err)}`)
    }
  }
  return { sent: toIds.length }
}

export async function listAnnouncements(tenantId: string) {
  return prisma.announcement.findMany({
    where: { ...(tenantId ? { tenant_id: tenantId } : {}) },
    orderBy: { created_at: 'desc' },
  })
}

export async function createAnnouncement(
  tenantId: string,
  userId: string,
  data: { title: string; content: string; send_line?: boolean; branch_id?: string },
) {
  const announcement = await prisma.announcement.create({
    data: {
      tenant_id:  tenantId,
      created_by: userId,
      title:      data.title,
      content:    data.content,
      send_line:  data.send_line ?? false,
    },
  })

  if (data.send_line) {
    // ดึง LINE Channel Access Token ของ tenant นี้
    const lineConfig = await prisma.tenantLineConfig.findUnique({
      where: { tenant_id: tenantId },
      select: { line_channel_access_token: true },
    })

    if (!lineConfig?.line_channel_access_token) {
      return { ...announcement, line_result: { error: 'LINE access token ไม่ได้ตั้งค่าไว้' } }
    }

    // ดึง line_user_id พนักงานที่ผูก Line แล้ว
    const employees = await prisma.employee.findMany({
      where: {
        tenant_id:    tenantId,
        line_user_id: { not: null },
        deleted_at:   null,
        ...(data.branch_id ? { branch_id: data.branch_id } : {}),
      },
      select: { line_user_id: true },
    })

    const lineUserIds = employees.map(e => e.line_user_id!)

    const message = `📢 ${data.title}\n\n${data.content}`

    try {
      const result = await lineMulticast(lineConfig.line_channel_access_token, lineUserIds, message)
      return { ...announcement, line_result: result }
    } catch (err: any) {
      return { ...announcement, line_result: { error: err.message } }
    }
  }

  return announcement
}

export async function sendDirectMessage(tenantId: string, employeeId: string, message: string) {
  const lineConfig = await prisma.tenantLineConfig.findUnique({
    where: { tenant_id: tenantId },
    select: { line_channel_access_token: true },
  })
  if (!lineConfig?.line_channel_access_token) {
    throw new Error('LINE access token ไม่ได้ตั้งค่าไว้')
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
    select: { line_user_id: true, first_name: true, nickname: true },
  })
  if (!employee) throw new Error('ไม่พบพนักงาน')
  if (!employee.line_user_id) throw new Error('พนักงานยังไม่ได้ผูก Line account')

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lineConfig.line_channel_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: employee.line_user_id,
      messages: [{ type: 'text', text: message }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`LINE push failed: ${JSON.stringify(err)}`)
  }
  return { sent: true, to: employee.nickname ?? employee.first_name }
}

export async function deleteAnnouncement(tenantId: string, id: string) {
  const count = await prisma.announcement.deleteMany({
    where: { id, ...(tenantId ? { tenant_id: tenantId } : {}) },
  })
  return count.count > 0
}
