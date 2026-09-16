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
  end_time: string            // "HH:MM" — ใช้เช็คว่าเป็นกะข้ามคืนไหม (end <= start)
  late_threshold_2: string | null
  absent_threshold: string | null
}
// ผลลัพธ์: fromPreviousDay=true หมายถึงจับเป็นกะข้ามคืนของ "เมื่อวาน" ที่ยังไม่ปิด
// รับเช็คอิน — ผู้เรียกต้องบันทึก attendance ด้วยวันที่เมื่อวาน ไม่ใช่วันนี้
export interface ShiftPickResult { shiftId: string; isOutsideShift: boolean; fromPreviousDay: boolean }

export function isOvernightShift(shift: { start_time: string; end_time: string }): boolean {
  return toMins(shift.end_time) <= toMins(shift.start_time)
}

// หน้าต่างเช็คอิน [earlyMins, closeMins] ของกะ 1 กะ — คำนวณสัมพัทธ์กับเวลาเริ่ม
// กะเอง (day-agnostic) เอาไปเทียบได้ทั้งกับ "now วันนี้" (0-1439) และ "now มองจาก
// เมื่อวาน" (+1440) แบบเดียวกัน — feedback 2026-09-16 "กะข้ามเที่ยงคืนแบบเต็ม"
function computeShiftWindow(shift: ShiftWindow, nextShiftEarlyMins: number): { earlyMins: number; closeMins: number } {
  const startMins  = toMins(shift.start_time)
  const overnight  = isOvernightShift(shift)
  const earlyMins  = startMins - 60 // เช็คอินก่อนเวลาได้ 1 ชม.

  // เกณฑ์สาย/ขาดของกะข้ามคืน ที่ตั้งเป็นเวลา "น้อยกว่าเวลาเริ่มกะ" ให้ตีความเป็น
  // ของรุ่งขึ้นเสมอ (กะเริ่ม 22:00 ตั้ง absent ไว้ 01:00 = ตี 1 ของวันถัดไป ไม่ใช่
  // ตี 1 ก่อนกะเริ่มด้วยซ้ำ) — ไม่งั้นสูตรจะได้ช่วงเวลากลับหัว (closeMins < earlyMins)
  const normalize = (t: string | null): number | null => {
    if (!t) return null
    const m = toMins(t)
    return overnight && m < startMins ? m + 1440 : m
  }
  // เกณฑ์ไกลสุดที่ยัง "เปิดรับ" เช็คอิน: ขาด > สายมาก > เวลาเริ่ม (ตามลำดับที่มี)
  const latestBoundMins = normalize(shift.absent_threshold) ?? normalize(shift.late_threshold_2) ?? startMins
  // ยืดได้อีก 4 ชม.หลังเกณฑ์นั้น (ให้เช็คอินได้แม้ "ขาด" แล้ว) แต่ห้ามล้ำเข้า
  // เขต "-1 ชม.ก่อนกะถัดไป" กันจับกะผิดตอนกะติดกัน (เช่น 08:00/09:00/13:00)
  const closeMins = Math.min(latestBoundMins + 4 * 60, nextShiftEarlyMins - 1)
  return { earlyMins, closeMins }
}

// todayShifts ต้องเรียงตาม start_time asc มาก่อนแล้ว (attendance.service.ts ทำให้
// ผ่าน prisma orderBy) — yesterdayOvernightShifts คือกะข้ามคืนชุดเดียวกันของสาขานี้
// เอง (กะเป็น template ต่อสาขา ไม่ได้ผูกวันที่ — "เมื่อวาน" หมายถึงเอา config
// เดียวกันมาเช็คว่า "รอบที่เริ่มเมื่อวาน" ยังเปิดรับถึงตอนนี้ไหม)
export function pickShiftForCheckIn(
  todayShifts: ShiftWindow[],
  nowMins: number,
  isCheckedIn: (shiftId: string, fromPreviousDay: boolean) => boolean,
  yesterdayOvernightShifts: ShiftWindow[] = [],
): ShiftPickResult | null {
  // รอบแรก — หากะของวันนี้ที่ "หน้าต่างเวลา" ครอบ nowMins อยู่พอดี
  for (let i = 0; i < todayShifts.length; i++) {
    const shift = todayShifts[i]
    const nextShiftEarlyMins = i + 1 < todayShifts.length ? toMins(todayShifts[i + 1].start_time) - 60 : Infinity
    const { earlyMins, closeMins } = computeShiftWindow(shift, nextShiftEarlyMins)

    if (nowMins < earlyMins || nowMins > closeMins) continue
    if (isCheckedIn(shift.id, false)) continue
    return { shiftId: shift.id, isOutsideShift: false, fromPreviousDay: false }
  }

  // รอบสอง — กะข้ามคืนของ "เมื่อวาน" ที่หน้าต่างอาจยังเปิดถึงตอนนี้ (มองจากเมื่อวาน
  // now = nowMins+1440) แคปไม่ให้ล้ำเข้าเขตกะแรกของวันนี้เหมือนกัน
  const todayFirstEarlyFromYesterday = todayShifts.length > 0 ? toMins(todayShifts[0].start_time) - 60 + 1440 : Infinity
  const nowFromYesterday = nowMins + 1440
  for (const shift of yesterdayOvernightShifts) {
    const { earlyMins, closeMins } = computeShiftWindow(shift, todayFirstEarlyFromYesterday)
    if (nowFromYesterday < earlyMins || nowFromYesterday > closeMins) continue
    if (isCheckedIn(shift.id, true)) continue
    return { shiftId: shift.id, isOutsideShift: false, fromPreviousDay: true }
  }

  // รอบสาม — ไม่มีกะไหน (วันนี้/เมื่อวานข้ามคืน) หน้าต่างครอบเลย → fallback ไปกะ
  // ของวันนี้ที่เวลาเริ่มใกล้ตอนนี้ที่สุด (ที่ยังไม่ได้เช็คอิน) พร้อม flag
  // isOutsideShift ให้แอดมินเห็น
  let closestShiftId: string | null = null
  let closestDiff = Infinity
  for (const shift of todayShifts) {
    if (isCheckedIn(shift.id, false)) continue
    const diff = Math.abs(toMins(shift.start_time) - nowMins)
    if (diff < closestDiff) { closestDiff = diff; closestShiftId = shift.id }
  }
  if (!closestShiftId) return null
  return { shiftId: closestShiftId, isOutsideShift: true, fromPreviousDay: false }
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
