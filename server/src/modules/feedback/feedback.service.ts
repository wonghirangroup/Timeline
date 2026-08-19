// server/src/modules/feedback/feedback.service.ts
import { prisma } from '../../common/utils/prisma'

const CATEGORIES = ['WELFARE', 'WORK_ENV', 'MANAGEMENT', 'SALARY', 'OTHER'] as const
export type FeedbackCategory = typeof CATEGORIES[number]

export async function createFeedback(tenantId: string, category: FeedbackCategory, content: string) {
  // เก็บแค่ tenant_id/category/content — ห้ามมี employee_id หรืออะไรที่ trace
  // กลับไปหาผู้ส่งได้เด็ดขาด ตามที่หน้า LIFF บอกผู้ใช้ไว้ว่า "ไม่ระบุตัวตน"
  return prisma.feedback.create({
    data: { tenant_id: tenantId, category, content },
  })
}

export async function listFeedback(tenantId: string, category?: string) {
  return prisma.feedback.findMany({
    where: {
      tenant_id: tenantId,
      ...(category ? { category: category as any } : {}),
    },
    orderBy: { created_at: 'desc' },
  })
}
