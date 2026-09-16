import { describe, it, expect } from 'vitest'
import { toMins } from './late'
import { isAllowedBranch, pickShiftForCheckIn, haversineMeters, resolveGeoCheckIn, type ShiftWindow } from './checkin-rules'

// ── 1/4. สาขาหลัก/สาขารอง ────────────────────────────────────────────────────
describe('isAllowedBranch', () => {
  const emp = { branch_id: 'main', extra_branches: [{ branch_id: 'extra-1' }, { branch_id: 'extra-2' }] }
  it('สาขาหลัก = เช็คอินได้', () => {
    expect(isAllowedBranch(emp, 'main')).toBe(true)
  })
  it('สาขารองที่ผูกไว้ = เช็คอินได้', () => {
    expect(isAllowedBranch(emp, 'extra-1')).toBe(true)
    expect(isAllowedBranch(emp, 'extra-2')).toBe(true)
  })
  it('สาขาที่ไม่ได้ผูกเลย = เช็คอินไม่ได้', () => {
    expect(isAllowedBranch(emp, 'other-branch')).toBe(false)
  })
  it('ไม่มีสาขารองเลย — เช็คอินสาขาหลักได้ สาขาอื่นไม่ได้', () => {
    const solo = { branch_id: 'main', extra_branches: [] }
    expect(isAllowedBranch(solo, 'main')).toBe(true)
    expect(isAllowedBranch(solo, 'other')).toBe(false)
  })
})

// ── 3. เข้ากะไหน คำนวณจากเวลาเช็คอิน ─────────────────────────────────────────
describe('pickShiftForCheckIn', () => {
  const notCheckedIn = () => false

  it('ไม่มีกะเลย = null', () => {
    expect(pickShiftForCheckIn([], toMins('09:00'), notCheckedIn)).toBeNull()
  })

  describe('กะเดียว 09:00 (late1=09:15, late2=09:45, absent=10:00)', () => {
    const shift: ShiftWindow = { id: 's1', start_time: '09:00', late_threshold_2: '09:45', absent_threshold: '10:00' }

    it('มาก่อนเวลาแต่ในหน้าต่าง 1 ชม. (08:30) = จับกะนี้ ไม่ถือว่านอกกะ', () => {
      expect(pickShiftForCheckIn([shift], toMins('08:30'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: false })
    })
    it('มาตรงเวลาเป๊ะ = จับกะนี้', () => {
      expect(pickShiftForCheckIn([shift], toMins('09:00'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: false })
    })
    it('มาสายเลยระดับ 2 แต่ยังไม่ถึง absent = ยังจับกะนี้ (ไม่ใช่นอกกะ — แค่สายมาก)', () => {
      expect(pickShiftForCheckIn([shift], toMins('09:50'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: false })
    })
    it('มาหลัง absent_threshold แต่ยังในช่วงยืด +4 ชม. (10:00-14:00) = ยังจับกะนี้ได้ (นับขาดแต่ไม่ปิดรับเช็คอิน)', () => {
      expect(pickShiftForCheckIn([shift], toMins('13:59'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: false })
    })
    it('มาก่อนหน้าต่าง 1 ชม. มากไป (07:59) = หลุดหน้าต่างหลัก ตกไป fallback (isOutsideShift=true แต่ยังจับกะเดียวที่มีอยู่)', () => {
      expect(pickShiftForCheckIn([shift], toMins('07:59'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: true })
    })
    it('มาเลยช่วงยืด +4 ชม.ไปแล้ว (14:01) = หลุดหน้าต่างหลัก ตกไป fallback', () => {
      expect(pickShiftForCheckIn([shift], toMins('14:01'), notCheckedIn)).toEqual({ shiftId: 's1', isOutsideShift: true })
    })
    it('เช็คอินกะนี้ไปแล้ว = ไม่มีกะให้จับอีก (null)', () => {
      expect(pickShiftForCheckIn([shift], toMins('09:00'), id => id === 's1')).toBeNull()
    })
  })

  it('2 กะห่างกันมาก (08:00, 13:00) — คนละหน้าต่างชัดเจน ไม่ชนกัน', () => {
    const shifts: ShiftWindow[] = [
      { id: 'morning', start_time: '08:00', late_threshold_2: null, absent_threshold: null },
      { id: 'noon',    start_time: '13:00', late_threshold_2: null, absent_threshold: null },
    ]
    // 11:30 ยังอยู่ในหน้าต่างยืดของกะเช้า (08:00+4ชม.=12:00 แต่ถูก cap ด้วยกะบ่าย-1ชม.=12:00 พอดี)
    expect(pickShiftForCheckIn(shifts, toMins('11:30'), notCheckedIn)).toEqual({ shiftId: 'morning', isOutsideShift: false })
    // 12:30 หลุดหน้าต่างกะเช้าแล้ว (ปิดที่ 11:59) แต่เข้าหน้าต่างกะบ่ายพอดี (เปิดล่วงหน้า 1ชม. = 12:00)
    expect(pickShiftForCheckIn(shifts, toMins('12:30'), notCheckedIn)).toEqual({ shiftId: 'noon', isOutsideShift: false })
  })

  it('2 กะติดกันแน่น (08:00, 09:00 ไม่ตั้ง late/absent เลย) — หน้าต่างกะแรกถูกบีบแคบมาก เพราะห้ามล้ำเขต -1ชม.ก่อนกะถัดไป', () => {
    const shifts: ShiftWindow[] = [
      { id: 'a', start_time: '08:00', late_threshold_2: null, absent_threshold: null },
      { id: 'b', start_time: '09:00', late_threshold_2: null, absent_threshold: null },
    ]
    // ไม่ตั้ง late/absent เลย → latestBound = start_time ของกะ a เอง (08:00) ยืด +4ชม.=12:00
    // แต่ถูก cap ด้วย "กะ b ล่วงหน้า 1 ชม." = 08:00 พอดี (09:00-60=08:00) เลยปิดที่ 07:59
    // ผลคือกะ a เปิดรับแค่ 07:00–07:59 เท่านั้น (ไม่ใช่ทั้งวันเหมือนที่อาจคาดไว้ถ้าไม่มีกะถัดไปชนกัน)
    expect(pickShiftForCheckIn(shifts, toMins('07:30'), notCheckedIn)).toEqual({ shiftId: 'a', isOutsideShift: false })
    // 08:15 หลุดหน้าต่างกะ a (ปิดไปแล้วตั้งแต่ 07:59) แต่ตกเข้าหน้าต่างกะ b พอดี (เปิดล่วงหน้าตั้งแต่ 08:00)
    // เท่ากับคนมาสาย 15 นาทีสำหรับกะ a กลับถูกจับเข้ากะ b แทน (ไม่ถือว่าสายเลยด้วยซ้ำ เพราะยังไม่ถึง 09:00)
    expect(pickShiftForCheckIn(shifts, toMins('08:15'), notCheckedIn)).toEqual({ shiftId: 'b', isOutsideShift: false })
  })

  it('ไม่มีกะไหนตรงหน้าต่างเลย + มีหลายกะว่าง = fallback ไปกะที่เวลาเริ่มใกล้ตอนนี้ที่สุด', () => {
    const shifts: ShiftWindow[] = [
      { id: 'early', start_time: '06:00', late_threshold_2: null, absent_threshold: null },
      { id: 'late',  start_time: '20:00', late_threshold_2: null, absent_threshold: null },
    ]
    // 15:00 อยู่นอกหน้าต่างทั้งคู่ (กะเช้าปิดไปแล้วตั้งแต่ 10:00, กะดึกยังไม่เปิดจนถึง 19:00)
    // แต่ใกล้เวลาเริ่มกะ 20:00 กว่า (ห่าง 5 ชม. vs กะ 06:00 ห่าง 9 ชม.)
    expect(pickShiftForCheckIn(shifts, toMins('15:00'), notCheckedIn)).toEqual({ shiftId: 'late', isOutsideShift: true })
  })

  it('ทุกกะเช็คอินไปหมดแล้ว = null แม้จะมีกะที่เวลาตรงหน้าต่างก็ตาม', () => {
    const shifts: ShiftWindow[] = [{ id: 's1', start_time: '09:00', late_threshold_2: null, absent_threshold: null }]
    expect(pickShiftForCheckIn(shifts, toMins('09:00'), () => true)).toBeNull()
  })
})

// ── 5. เช็คอินนอกพื้นที่ — WARN เตือนแต่ผ่าน / BLOCK ปฏิเสธ ──────────────────
describe('resolveGeoCheckIn', () => {
  it('อยู่ในรัศมี = ผ่านปกติ ไม่มี flag', () => {
    expect(resolveGeoCheckIn(50, 100, 'WARN')).toEqual({ blocked: false, isOutsideArea: false })
    expect(resolveGeoCheckIn(50, 100, 'BLOCK')).toEqual({ blocked: false, isOutsideArea: false })
  })
  it('อยู่ขอบรัศมีพอดี (dist === radius) = ยังถือว่าอยู่ในพื้นที่', () => {
    expect(resolveGeoCheckIn(100, 100, 'WARN')).toEqual({ blocked: false, isOutsideArea: false })
  })
  it('เกินรัศมี โหมด WARN = เช็คอินผ่าน แค่ flag นอกพื้นที่', () => {
    expect(resolveGeoCheckIn(150, 100, 'WARN')).toEqual({ blocked: false, isOutsideArea: true })
  })
  it('เกินรัศมี โหมด BLOCK = ปฏิเสธเลย ไม่ flag (เพราะไม่ผ่านตั้งแต่ต้น)', () => {
    expect(resolveGeoCheckIn(150, 100, 'BLOCK')).toEqual({ blocked: true, isOutsideArea: false })
  })
})

describe('haversineMeters', () => {
  it('จุดเดียวกัน = ระยะ 0', () => {
    expect(haversineMeters(13.7563, 100.5018, 13.7563, 100.5018)).toBe(0)
  })
  it('ขยับละติจูด 0.001 องศา ≈ 111 เมตร', () => {
    const d = haversineMeters(13.7563, 100.5018, 13.7573, 100.5018)
    expect(d).toBeGreaterThan(105)
    expect(d).toBeLessThan(115)
  })
})
