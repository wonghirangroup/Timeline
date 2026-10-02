// server/src/common/utils/requestNo.ts
// เลขที่คำขอที่คนอ่าน/พูดอ้างอิงได้ เช่น LV-2569-0001 (feedback 2026-10-02 "มีรหัสคำขอเอกสารไหม ... ทุกๆอัน")
// รูปแบบ <PREFIX>-<ปี พ.ศ.>-<ลำดับ 4 หลัก> เลขรันแยกต่อ tenant + ประเภท + ปี (รีเซ็ตทุกปี) ออกเลขผ่านตาราง
// request_counters แบบ atomic: INSERT ... ON DUPLICATE KEY UPDATE ล็อกแถวไว้จนจบ transaction จึงไม่ชนกันแม้ยื่นพร้อมกัน
// ถ้า create ของคำขอจริงล้มเหลวหลังออกเลขแล้ว เลขนั้นจะข้ามไป (เป็นช่องว่าง) — ยอมรับได้ ดีกว่าออกเลขซ้ำ
import { prisma } from './prisma'

export const REQUEST_PREFIX = {
  documentRequest:   'DOC',
  leaveRequest:      'LV',
  otRequest:         'OT',
  resignationRequest: 'RS',
  weeklyOffRequest:  'WO',
  offsiteCheckin:    'OS',
} as const
export type RequestPrefix = (typeof REQUEST_PREFIX)[keyof typeof REQUEST_PREFIX]

// ปี พ.ศ. ตามเวลาไทย (UTC+7) ของ instant ที่ให้มา
export function buddhistYearBangkok(at: Date = new Date()): number {
  return new Date(at.getTime() + 7 * 3600_000).getUTCFullYear() + 543
}

export function formatRequestNo(prefix: RequestPrefix, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

export async function nextRequestNo(tenantId: string, prefix: RequestPrefix, at: Date = new Date()): Promise<string> {
  const year = buddhistYearBangkok(at)
  const seq = await prisma.$transaction(async tx => {
    await tx.$executeRaw`INSERT INTO request_counters (tenant_id, prefix, year, last) VALUES (${tenantId}, ${prefix}, ${year}, 1)
      ON DUPLICATE KEY UPDATE last = last + 1`
    const rows = await tx.$queryRaw<{ last: number }[]>`SELECT last FROM request_counters WHERE tenant_id = ${tenantId} AND prefix = ${prefix} AND year = ${year}`
    return Number(rows[0].last)
  })
  return formatRequestNo(prefix, year, seq)
}
