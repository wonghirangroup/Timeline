// คำนวณ "ลาทับวันหยุด/วันลาของคนตำแหน่งเดียวกัน" + ค่าปรับต่อวัน (feedback 2026-10-19)
// กติกา: ตำแหน่งเดียวกัน + วันเดียวกัน ทุกประเภทการลา — คนที่ยื่นลาทีหลังเป็นฝ่ายถูกหัก
// อัตราหักเป็นเงิน: จันทร์–ศุกร์ = leave_conflict_fee_weekday, เสาร์–อาทิตย์ = leave_conflict_fee_weekend
// (ตั้งในหน้า ลา → นโยบายการลา) · ปิดไว้ (leave_conflict_fee_enabled=false) ก็ยังคืนรายการวันที่ทับ แต่ fee = 0
import { prisma } from '../../common/utils/prisma'

// สำเนาของ resolveActualDateStr ใน weekly-off.service (กัน import วงกลม) — week_start (จันทร์) + day_of_week → YYYY-MM-DD
function resolveActualDateStr(weekStart: Date, dayOfWeek: number): string {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return d.toISOString().slice(0, 10)
}

export interface ConflictDay { date: string; fee: number; with: string[] }
export interface LeaveConflict { enabled: boolean; has_conflict: boolean; fee: number; days: ConflictDay[] }

const MAX_DAYS = 62
const nameOf = (e: { first_name: string; last_name: string; nickname: string | null }) => e.nickname || `${e.first_name} ${e.last_name}`

function eachDate(startStr: string, endStr: string): string[] {
  const out: string[] = []
  const d = new Date(startStr + 'T00:00:00Z'), end = new Date(endStr + 'T00:00:00Z')
  if (Number.isNaN(d.getTime()) || Number.isNaN(end.getTime())) return out
  while (d <= end && out.length < MAX_DAYS) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
  return out
}

export async function computeLeaveConflict(tenantId: string, employeeId: string, startStr: string, endStr: string): Promise<LeaveConflict> {
  const none: LeaveConflict = { enabled: false, has_conflict: false, fee: 0, days: [] }
  const [emp, tenant] = await Promise.all([
    prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId }, select: { position_id: true } }),
    prisma.tenant.findFirst({ where: { id: tenantId }, select: { leave_conflict_fee_enabled: true, leave_conflict_fee_weekday: true, leave_conflict_fee_weekend: true } }),
  ])
  const enabled = tenant?.leave_conflict_fee_enabled ?? false
  const dates = eachDate(startStr, endStr)
  if (!emp?.position_id || dates.length === 0) return { ...none, enabled }

  const start = new Date(dates[0] + 'T00:00:00Z'), end = new Date(dates[dates.length - 1] + 'T00:00:00Z')
  const weekStartFrom = new Date(start); weekStartFrom.setUTCDate(weekStartFrom.getUTCDate() - 6)
  const empSel = { first_name: true, last_name: true, nickname: true } as const
  const colleague = { position_id: emp.position_id, id: { not: employeeId }, deleted_at: null }

  const [leaves, offs] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { tenant_id: tenantId, status: { in: ['PENDING', 'APPROVED'] }, start_date: { lte: end }, end_date: { gte: start }, employee: colleague },
      select: { start_date: true, end_date: true, employee: { select: empSel } },
    }),
    prisma.weeklyOffRequest.findMany({
      where: { tenant_id: tenantId, status: 'APPROVED', week_start: { gte: weekStartFrom, lte: end }, employee: colleague },
      select: { week_start: true, day_of_week: true, employee: { select: empSel } },
    }),
  ])

  const withByDate = new Map<string, Set<string>>()
  const add = (date: string, name: string) => { if (!withByDate.has(date)) withByDate.set(date, new Set()); withByDate.get(date)!.add(name) }
  for (const l of leaves) {
    const s = l.start_date.toISOString().slice(0, 10), e = l.end_date.toISOString().slice(0, 10)
    for (const d of dates) if (d >= s && d <= e) add(d, nameOf(l.employee))
  }
  for (const o of offs) {
    const d = resolveActualDateStr(o.week_start, o.day_of_week)
    if (dates.includes(d)) add(d, nameOf(o.employee))
  }

  const wk = tenant?.leave_conflict_fee_weekday ?? 50, we = tenant?.leave_conflict_fee_weekend ?? 100
  const days: ConflictDay[] = dates.filter(d => withByDate.has(d)).map(d => {
    const dow = new Date(d + 'T00:00:00Z').getUTCDay()
    return { date: d, fee: enabled ? (dow === 0 || dow === 6 ? we : wk) : 0, with: [...withByDate.get(d)!] }
  })
  return { enabled, has_conflict: days.length > 0, fee: days.reduce((s, x) => s + x.fee, 0), days }
}
