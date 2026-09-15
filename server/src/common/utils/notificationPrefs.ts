// server/src/common/utils/notificationPrefs.ts
// ประเภทการแจ้งเตือน LINE ไปยังแอดมิน/หัวหน้าแผนกที่ tenant เปิด/ปิดเองได้ (Tenant.notification_prefs)
// key ที่ไม่มีอยู่ใน object หรือ tenant ไม่มี record นี้เลย = ถือว่าเปิดใช้งาน (backward-compatible
// — เหมือนกับ Tenant.enabled_features ทุกประการ ดู server/src/common/utils/features.ts)
export const NOTIFICATION_TYPES = [
  'leave',               // ใบลารออนุมัติ
  'ot',                  // คำขอ OT รออนุมัติ
  'weekly_off',          // จองวันหยุดรออนุมัติ (ทั้ง 3 โหมด: รายสัปดาห์/รายเดือน/แบบเลือกหลายวัน)
  'weekly_off_swap',     // พนักงานสลับวันหยุดกันเอง (แจ้งให้ทราบ หลังสลับสำเร็จแล้ว)
  'resignation',         // คำขอลาออกรอพิจารณา
  'attendance_anomaly',  // เช็คอินผิดปกติ — นอกเวลากะ / เช็คอินผิดสาขา (ถูกบล็อก)
  'document_request',    // ขอเอกสาร HR รอดำเนินการ (สลิป/หนังสือรับรอง)
] as const

export type NotificationType = typeof NOTIFICATION_TYPES[number]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  leave:               'ใบลารออนุมัติ',
  ot:                  'คำขอ OT รออนุมัติ',
  weekly_off:          'จองวันหยุดรออนุมัติ',
  weekly_off_swap:     'พนักงานสลับวันหยุดกันเอง',
  resignation:         'คำขอลาออกรอพิจารณา',
  attendance_anomaly:  'เช็คอินผิดปกติ (นอกเวลากะ / ผิดสาขา)',
  document_request:    'ขอเอกสาร HR รอดำเนินการ',
}

export function isNotificationEnabled(prefs: unknown, type: NotificationType): boolean {
  if (!prefs || typeof prefs !== 'object') return true
  const v = (prefs as Record<string, unknown>)[type]
  return v !== false
}
