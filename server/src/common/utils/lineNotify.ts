// server/src/common/utils/lineNotify.ts
// ตรวจว่าแพ็กเกจของ tenant นี้ "รวมการส่งข้อความแจ้งเตือนผ่าน LINE" ไหม (ฟีเจอร์ line_notify)
// ไม่มี key = เปิด (tenant เดิมไม่ต้อง backfill) — ใช้ก่อนส่ง push/multicast ทุกจุดที่ระบบส่งเอง
import { prisma } from './prisma'
import { isFeatureEnabled } from './features'

export const LINE_NOTIFY_OFF_MESSAGE = 'แพ็กเกจของคุณไม่รวมการแจ้งเตือนผ่าน LINE — พนักงานยังเช็คอินผ่าน LINE ได้ตามปกติ'

export async function isLineNotifyEnabled(tenantId: string): Promise<boolean> {
  const t = await prisma.tenant.findFirst({ where: { id: tenantId }, select: { enabled_features: true } })
  return isFeatureEnabled(t?.enabled_features, 'line_notify')
}
