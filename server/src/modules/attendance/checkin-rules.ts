// server/src/modules/attendance/checkin-rules.ts
// ตรรกะ "เช็คอินได้ไหม/เข้ากะไหน/นอกพื้นที่ไหม" — pure functions ล้วนๆ ไม่แตะ DB
// (แยกออกจาก attendance.service.ts ตามแบบ late.ts เดิม เพื่อ unit test ได้จริง
// โดยไม่ต้อง mock prisma — feedback 2026-09-16: "ลองเทสทุกเคสที่เป็นไปได้ให้หน่อย")
import { toMins } from './late'

// ── 1/4. สาขาหลัก/สาขารอง — เช็คอินสาขาไหนได้บ้าง ───────────────────────────
export function isAllowedBranch(
  employee: { branch_id: string; extra_branches: { branch_id: string }[] },
  targetBranchId: string,
): boolean {
  return employee.branch_id === targetBranchId || employee.extra_branches.some(b => b.branch_id === targetBranchId)
}

// ── 3. เข้ากะไหน คำนวณจากเวลาเช็คอิน ─────────────────────────────────────────
// หมายเหตุ (ข้อ 2 ในเคสทดสอบ): ตั้งใจไม่เช็คว่า "พนักงานคนนี้ต้องอยู่กะนี้เท่านั้น"
// — ไล่ดูทุกกะ Active ของสาขา ใครก็เช็คอินกะไหนของสาขาตัวเองก็ได้ ขอแค่เวลาตรง
export interface ShiftWindow {
  id: string
  start_time: string          // "HH:MM"
  late_threshold_2: string | null
  absent_threshold: string | null
}
export interface ShiftPickResult { shiftId: string; isOutsideShift: boolean }

// shifts ต้องเรียงตาม start_time asc มาก่อนแล้ว (attendance.service.ts ทำให้ผ่าน
// prisma orderBy) — ฟังก์ชันนี้ไม่ sort เองเพื่อให้ผลเทสยืนยัน "ลำดับ" ตรงไปตรงมา
export function pickShiftForCheckIn(
  shifts: ShiftWindow[],
  nowMins: number,
  isCheckedIn: (shiftId: string) => boolean,
): ShiftPickResult | null {
  if (shifts.length === 0) return null

  // รอบแรก — หากะที่ "หน้าต่างเวลา" ครอบ nowMins อยู่พอดี
  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    const startMins = toMins(shift.start_time)
    const earlyMins = startMins - 60 // เช็คอินก่อนเวลาได้ 1 ชม.

    // เกณฑ์ไกลสุดที่ยัง "เปิดรับ" เช็คอิน: ขาด > สายมาก > เวลาเริ่ม (ตามลำดับที่มี)
    const latestBoundMins = shift.absent_threshold
      ? toMins(shift.absent_threshold)
      : shift.late_threshold_2
        ? toMins(shift.late_threshold_2)
        : startMins
    // ยืดได้อีก 4 ชม.หลังเกณฑ์นั้น (ให้เช็คอินได้แม้ "ขาด" แล้ว) แต่ห้ามล้ำเข้า
    // เขต "-1 ชม.ก่อนกะถัดไป" กันจับกะผิดตอนกะติดกัน (เช่น 08:00/09:00/13:00)
    const nextShiftEarlyMins = i + 1 < shifts.length ? toMins(shifts[i + 1].start_time) - 60 : Infinity
    const closeMins = Math.min(latestBoundMins + 4 * 60, nextShiftEarlyMins - 1)

    if (nowMins < earlyMins || nowMins > closeMins) continue
    if (isCheckedIn(shift.id)) continue
    return { shiftId: shift.id, isOutsideShift: false }
  }

  // รอบสอง — ไม่มีกะไหน "หน้าต่างเวลา" ครอบเลย → fallback ไปกะที่เวลาเริ่มใกล้
  // ตอนนี้ที่สุด (ที่ยังไม่ได้เช็คอิน) พร้อม flag isOutsideShift ให้แอดมินเห็น
  let closestShiftId: string | null = null
  let closestDiff = Infinity
  for (const shift of shifts) {
    if (isCheckedIn(shift.id)) continue
    const diff = Math.abs(toMins(shift.start_time) - nowMins)
    if (diff < closestDiff) { closestDiff = diff; closestShiftId = shift.id }
  }
  if (!closestShiftId) return null
  return { shiftId: closestShiftId, isOutsideShift: true }
}

// ── 5. เช็คอินแล้วนอกพื้นที่ — ทำยังไงต่อ (WARN แจ้งเตือนแต่ผ่าน / BLOCK ปฏิเสธ) ──
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // รัศมีโลกเป็นเมตร
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface GeoCheckResult { blocked: boolean; isOutsideArea: boolean }
export function resolveGeoCheckIn(distMeters: number, radiusMeters: number, geoMode: 'WARN' | 'BLOCK'): GeoCheckResult {
  if (distMeters <= radiusMeters) return { blocked: false, isOutsideArea: false }
  if (geoMode === 'BLOCK') return { blocked: true, isOutsideArea: false }
  return { blocked: false, isOutsideArea: true }
}
