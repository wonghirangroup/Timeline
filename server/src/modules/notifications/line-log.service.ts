// server/src/modules/notifications/line-log.service.ts
// บันทึก log ทุกครั้งที่ระบบยิงข้อความ LINE จริง — best-effort เสมอเหมือนตัว
// ส่งเอง (ดู line-push.service.ts) พังยังไงก็ห้ามทำให้การส่งจริงล้มตาม
import { prisma } from '../../common/utils/prisma'

export interface LineLogRecipient {
  type: 'EMPLOYEE' | 'ADMIN'
  id: string | null
  label: string
}

export async function logLineSend(params: {
  tenantId: string
  category: string
  title: string
  recipients: LineLogRecipient[]
  success: boolean
  errorMessage?: string
}): Promise<void> {
  if (params.recipients.length === 0) return
  try {
    await prisma.lineMessageLog.createMany({
      data: params.recipients.map(r => ({
        tenant_id: params.tenantId,
        category: params.category,
        recipient_type: r.type,
        recipient_id: r.id,
        recipient_label: r.label,
        title: params.title,
        success: params.success,
        error_message: params.errorMessage ?? null,
      })),
    })
  } catch (e) {
    console.error('[line-log] บันทึก log การส่งไลน์ไม่สำเร็จ (ไม่กระทบการส่งจริง):', e)
  }
}

export async function listLineMessageLogs(tenantId: string, filters: { startDate?: string; endDate?: string; category?: string }) {
  return prisma.lineMessageLog.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.startDate || filters.endDate ? {
        created_at: {
          ...(filters.startDate ? { gte: new Date(filters.startDate + 'T00:00:00.000Z') } : {}),
          ...(filters.endDate   ? { lte: new Date(filters.endDate   + 'T23:59:59.999Z') } : {}),
        },
      } : {}),
    },
    orderBy: { created_at: 'desc' },
  })
}
