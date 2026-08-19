// server/src/common/utils/activityLog.ts
import { prisma } from './prisma'

export type ActivityAction =
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'ADMIN_CREATED'
  | 'LINE_CONFIG_UPDATED'
  | 'FEATURE_TOGGLED'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'SUPER_ADMIN_LOGIN'

// บันทึกกิจกรรมสำหรับ feed "กิจกรรมล่าสุด" ของ Super Admin Dashboard — ตั้งใจ
// ให้ล้มเหลวแบบเงียบๆ (catch ไว้ในตัว) เพราะ log พังไม่ควรทำให้ action จริง
// (เช่น สร้าง tenant) fail ตามไปด้วย
export async function logActivity(data: {
  action:     ActivityAction
  message:    string
  actorName:  string
  tenantId?:  string | null
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action:     data.action,
        message:    data.message,
        actor_name: data.actorName,
        tenant_id:  data.tenantId ?? null,
      },
    })
  } catch {
    // เงียบไว้ — ไม่ให้กระทบ action หลัก
  }
}
