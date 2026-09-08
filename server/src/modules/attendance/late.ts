// server/src/modules/attendance/late.ts
// ตรรกะคำนวณสาย/ขาด/ค่าปรับ — pure functions ไม่แตะ DB (แยกจาก attendance.service
// เพื่อ unit test ได้โดยไม่ต้อง mock prisma)

export function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export interface ShiftLateConfig {
  start_time: string
  late_threshold: number
  late_threshold_1: string | null
  late_threshold_2: string | null
  absent_threshold: string | null
  fine_mode?: 'TIER' | 'PER_MINUTE' | null
  late_grace_minutes?: number | null
}

export interface LateStatus {
  is_late: boolean
  late_level: 0 | 1 | 2
  late_minutes: number
  is_absent: boolean
}

const NOT_LATE: LateStatus = { is_late: false, late_level: 0, late_minutes: 0, is_absent: false }

// ── Late/absent calculation ────────────────────────────────────────────────
// ลำดับ: ขาด (absent_threshold) มาก่อนเสมอทุกโหมด
//   TIER      → สายระดับ 2 (late_threshold_2) > สายระดับ 1 (late_threshold_1)
//   PER_MINUTE → สายเมื่อเกิน grace หลังเวลาเริ่มงาน (ไม่มีระดับ 2)
export function computeLateStatus(shift: ShiftLateConfig, checkInMins: number): LateStatus {
  const startMins = toMins(shift.start_time)
  if (checkInMins <= startMins) return NOT_LATE

  const late_minutes = checkInMins - startMins
  const absentMins = shift.absent_threshold ? toMins(shift.absent_threshold) : null

  if (absentMins != null && checkInMins >= absentMins) {
    return { is_late: true, late_level: 2, late_minutes, is_absent: true }
  }

  if (shift.fine_mode === 'PER_MINUTE') {
    const grace = shift.late_grace_minutes ?? 0
    return late_minutes > grace
      ? { is_late: true, late_level: 1, late_minutes, is_absent: false }
      : NOT_LATE
  }

  const late1Mins = shift.late_threshold_1 ? toMins(shift.late_threshold_1) : null
  const late2Mins = shift.late_threshold_2 ? toMins(shift.late_threshold_2) : null
  if (late2Mins != null && checkInMins >= late2Mins) {
    return { is_late: true, late_level: 2, late_minutes, is_absent: false }
  }
  if (late1Mins != null && checkInMins >= late1Mins) {
    return { is_late: true, late_level: 1, late_minutes, is_absent: false }
  }
  if (late1Mins == null && late2Mins == null && late_minutes > shift.late_threshold) {
    return { is_late: true, late_level: 1, late_minutes, is_absent: false }
  }
  return NOT_LATE
}

export interface ShiftFineConfig {
  fine_mode?: 'TIER' | 'PER_MINUTE' | null
  late_fine_1: unknown
  late_fine_2: unknown
  late_fine_per_minute?: unknown
  late_grace_minutes?: number | null
  late_fine_max?: unknown
}

// ค่าปรับสายของวันนี้ (ไม่รวม absent_fine / carried_fine)
export function computeFine(shift: ShiftFineConfig, late: LateStatus): number {
  if (late.is_absent || !late.is_late) return 0
  if (shift.fine_mode === 'PER_MINUTE') {
    const rate = shift.late_fine_per_minute != null ? Number(shift.late_fine_per_minute) : 0
    const grace = shift.late_grace_minutes ?? 0
    const chargeable = Math.max(0, late.late_minutes - grace)
    let f = chargeable * rate
    if (shift.late_fine_max != null) f = Math.min(f, Number(shift.late_fine_max))
    return Math.round(f * 100) / 100
  }
  if (late.late_level === 1) return shift.late_fine_1 != null ? Number(shift.late_fine_1) : 0
  if (late.late_level === 2) return shift.late_fine_2 != null ? Number(shift.late_fine_2) : 0
  return 0
}
