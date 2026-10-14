// server/src/modules/leave/monthly-cap.ts
// เพดานรวม "วันหยุดจอง + ลาพักร้อน" ต่อเดือน — ตัว error พกตัวเลขไปด้วย เพื่อให้หน้าจอบอกได้ว่า "เกินเพราะอะไร"
// feedback 2026-10-14: แอดมินลงพักร้อนเพิ่มแล้วขึ้นแค่ "ไม่สำเร็จ" ไม่รู้ว่าเกินจากอะไร

export interface MonthlyCapDetail { dayOff: number; vacation: number; total: number; cap: number; adding: number }

export class MonthlyCapError extends Error {
  constructor(public detail: MonthlyCapDetail) { super('MONTHLY_CAP_EXCEEDED') }
}

/** ข้อความอธิบายตัวเลข เช่น "เดือนนี้มี จองหยุด 9 วัน + ลาพักร้อน 1 วัน = 10 วัน (เพดานรวม 10 วัน/เดือน) — ลงเพิ่มอีก 2 วันจะเป็น 12 วัน เกิน 2 วัน" */
export function capMessage(detail: MonthlyCapDetail | undefined, fallback: string): string {
  if (!detail) return fallback
  const after = detail.total + detail.adding
  return `เดือนนี้มี จองหยุด ${detail.dayOff} วัน + ลาพักร้อน ${detail.vacation} วัน = ${detail.total} วัน (เพดานรวม ${detail.cap} วัน/เดือน) — ลงเพิ่มอีก ${detail.adding} วันจะเป็น ${after} วัน เกิน ${after - detail.cap} วัน`
}
