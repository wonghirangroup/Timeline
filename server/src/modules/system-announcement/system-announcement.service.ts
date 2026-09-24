// server/src/modules/system-announcement/system-announcement.service.ts
// ประกาศจาก Super Admin ถึงแอดมิน tenant ข้ามบริษัท (feedback 2026-09-24) —
// ส่งผ่าน LINE push เข้าบัญชี ADMIN/MANAGER ที่ผูก LINE ของแต่ละ tenant เป้าหมาย
// (ใช้ LINE channel ของ tenant นั้นๆ เอง — ไม่มี "LINE กลาง" ของ TimeLine) เหมือน
// pattern เดียวกับ notifyAdminsLine ใน line-push.service.ts แต่ไม่ผูกกับพนักงาน
// คนเดียว (เป็น broadcast ไม่ใช่แจ้งเตือนจากคำขอของใครคนหนึ่ง)
import { prisma } from '../../common/utils/prisma'
import { lineMulticast } from '../announcement/announcement.service'
import { logLineSend } from '../notifications/line-log.service'

export async function listSystemAnnouncements() {
  return prisma.systemAnnouncement.findMany({ orderBy: { created_at: 'desc' }, take: 100 })
}

interface CreateInput {
  type: string
  title: string
  body: string
  target_type: 'ALL' | 'PLAN' | 'CUSTOM'
  target_plan?: string | null
  target_tenant_ids?: string[]
  created_by: string
}

async function resolveTargetTenants(input: CreateInput) {
  if (input.target_type === 'ALL') {
    return prisma.tenant.findMany({ where: { deleted_at: null }, select: { id: true, name: true, line_config: { select: { line_channel_access_token: true } } } })
  }
  if (input.target_type === 'PLAN') {
    return prisma.tenant.findMany({ where: { deleted_at: null, plan: input.target_plan as any }, select: { id: true, name: true, line_config: { select: { line_channel_access_token: true } } } })
  }
  return prisma.tenant.findMany({ where: { deleted_at: null, id: { in: input.target_tenant_ids ?? [] } }, select: { id: true, name: true, line_config: { select: { line_channel_access_token: true } } } })
}

function buildAnnouncementFlex(title: string, body: string, color: string) {
  return {
    type: 'flex',
    altText: `📢 ${title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: color, paddingAll: '14px',
        contents: [{ type: 'text', text: `📢 ${title}`, color: '#ffffff', weight: 'bold', size: 'sm', wrap: true }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [{ type: 'text', text: body, size: 'sm', color: '#333333', wrap: true }],
      },
    },
  }
}

const TYPE_COLOR: Record<string, string> = {
  MAINTENANCE: '#d97706', FEATURE: '#2563eb', BILLING: '#16a34a', GENERAL: '#6b7280', URGENT: '#dc2626',
}

// สร้าง + ส่งทันที — best-effort ต่อ tenant (tenant หนึ่งพังไม่กระทบ tenant อื่น)
export async function createAndSendSystemAnnouncement(input: CreateInput) {
  const tenants = await resolveTargetTenants(input)
  const message = buildAnnouncementFlex(input.title, input.body, TYPE_COLOR[input.type] ?? '#6b7280')

  let sentCount = 0
  for (const t of tenants) {
    if (!t.line_config?.line_channel_access_token) continue
    try {
      const admins = await prisma.user.findMany({
        where: { tenant_id: t.id, is_active: true, role: { in: ['ADMIN', 'MANAGER'] } },
        select: { id: true, email: true, linked_employee: { select: { line_user_id: true, first_name: true, last_name: true, nickname: true } } },
      })
      const recipients = admins.filter(a => a.linked_employee?.line_user_id)
      if (recipients.length === 0) continue

      await lineMulticast(t.line_config.line_channel_access_token, recipients.map(a => a.linked_employee!.line_user_id!), message)
      sentCount += recipients.length

      await logLineSend({
        tenantId: t.id, category: 'system_announcement', title: input.title,
        recipients: recipients.map(a => ({
          type: 'ADMIN', id: a.id,
          label: a.linked_employee ? (a.linked_employee.nickname || `${a.linked_employee.first_name} ${a.linked_employee.last_name}`) : a.email,
        })),
        success: true,
      })
    } catch (e: any) {
      await logLineSend({ tenantId: t.id, category: 'system_announcement', title: input.title, recipients: [{ type: 'ADMIN', id: null, label: t.name }], success: false, errorMessage: String(e?.message ?? e) })
    }
  }

  return prisma.systemAnnouncement.create({
    data: {
      type: input.type, title: input.title, body: input.body,
      target_type: input.target_type, target_plan: (input.target_plan as any) ?? null,
      target_tenant_ids: input.target_type === 'CUSTOM' ? (input.target_tenant_ids ?? []) : undefined,
      status: 'SENT', sent_at: new Date(), sent_count: sentCount, created_by: input.created_by,
    },
  })
}

export async function saveSystemAnnouncementDraft(input: CreateInput) {
  return prisma.systemAnnouncement.create({
    data: {
      type: input.type, title: input.title, body: input.body,
      target_type: input.target_type, target_plan: (input.target_plan as any) ?? null,
      target_tenant_ids: input.target_type === 'CUSTOM' ? (input.target_tenant_ids ?? []) : undefined,
      status: 'DRAFT', created_by: input.created_by,
    },
  })
}

export async function deleteSystemAnnouncement(id: string): Promise<boolean> {
  const result = await prisma.systemAnnouncement.deleteMany({ where: { id } })
  return result.count > 0
}

// แก้ไข draft ที่ยังไม่ส่ง — ส่งแล้วแก้ไม่ได้ (เป็นประวัติจริงที่ส่งไปแล้ว)
// asDraft=true บันทึกเป็น draft ต่อ, false = แก้แล้วส่งเลย (ลบ draft เดิมทิ้ง
// แล้วสร้างแถว SENT ใหม่ผ่าน flow เดียวกับสร้าง+ส่งปกติ ง่ายกว่าพยายาม
// update ให้ตรงทุก field พร้อมยิง LINE ไปด้วยในคำสั่งเดียว)
export async function updateOrSendDraft(id: string, input: CreateInput & { asDraft: boolean }) {
  const existing = await prisma.systemAnnouncement.findUnique({ where: { id } })
  if (!existing) return null
  if (existing.status === 'SENT') throw new Error('ALREADY_SENT')

  if (input.asDraft) {
    return prisma.systemAnnouncement.update({
      where: { id },
      data: {
        type: input.type, title: input.title, body: input.body,
        target_type: input.target_type, target_plan: (input.target_plan as any) ?? null,
        target_tenant_ids: input.target_type === 'CUSTOM' ? (input.target_tenant_ids ?? []) : undefined,
      },
    })
  }
  await prisma.systemAnnouncement.delete({ where: { id } })
  return createAndSendSystemAnnouncement(input)
}
