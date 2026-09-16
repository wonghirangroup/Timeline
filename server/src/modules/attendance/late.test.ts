import { describe, it, expect } from 'vitest'
import { toMins, computeLateStatus, computeFine, type ShiftLateConfig, type ShiftFineConfig } from './late'

const tier: ShiftLateConfig = {
  start_time: '09:00',
  late_threshold: 15,
  late_threshold_1: '09:15',
  late_threshold_2: '09:45',
  absent_threshold: '10:00',
  fine_mode: 'TIER',
  late_grace_minutes: null,
}

const perMin: ShiftLateConfig = {
  start_time: '09:00',
  late_threshold: 0,
  late_threshold_1: null,
  late_threshold_2: null,
  absent_threshold: '10:00',
  fine_mode: 'PER_MINUTE',
  late_grace_minutes: 5,
}

describe('toMins', () => {
  it('แปลง HH:MM เป็นนาที', () => {
    expect(toMins('00:00')).toBe(0)
    expect(toMins('09:15')).toBe(555)
    expect(toMins('23:59')).toBe(1439)
  })
})

describe('computeLateStatus — TIER', () => {
  it('มาก่อนเวลา = ไม่สาย', () => {
    expect(computeLateStatus(tier, toMins('08:55'))).toMatchObject({ is_late: false, late_level: 0, is_absent: false })
  })
  it('ตรงเวลาพอดี = ไม่สาย', () => {
    expect(computeLateStatus(tier, toMins('09:00')).is_late).toBe(false)
  })
  it('สายเกิน threshold_1 = ระดับ 1', () => {
    expect(computeLateStatus(tier, toMins('09:20'))).toMatchObject({ is_late: true, late_level: 1, late_minutes: 20, is_absent: false })
  })
  it('สายเกิน threshold_2 = ระดับ 2', () => {
    expect(computeLateStatus(tier, toMins('09:50'))).toMatchObject({ is_late: true, late_level: 2, is_absent: false })
  })
  it('เกิน absent_threshold = ขาด', () => {
    expect(computeLateStatus(tier, toMins('10:05'))).toMatchObject({ is_late: true, is_absent: true, late_level: 2 })
  })
  it('สายเล็กน้อยแต่ยังไม่ถึง threshold_1 = ไม่สาย', () => {
    expect(computeLateStatus(tier, toMins('09:10')).is_late).toBe(false)
  })
  it('ไม่มี threshold_1/2 → ใช้ late_threshold เป็นนาที', () => {
    const s: ShiftLateConfig = { ...tier, late_threshold_1: null, late_threshold_2: null, late_threshold: 10 }
    expect(computeLateStatus(s, toMins('09:09')).is_late).toBe(false)
    expect(computeLateStatus(s, toMins('09:11')).is_late).toBe(true)
  })
})

describe('computeLateStatus — กะข้ามเที่ยงคืน (crossesMidnight)', () => {
  // กะ 22:00-06:00 ตั้ง absent ไว้ "01:00" หมายถึงตี 1 ของวันถัดไป (เวลาน้อยกว่า
  // start_time ของกะข้ามคืน = ตีความเป็นรุ่งขึ้นเสมอ) — feedback 2026-09-16 "แบบเต็ม"
  const night: ShiftLateConfig = {
    start_time: '22:00', late_threshold: 15, late_threshold_1: '22:15', late_threshold_2: '23:00',
    absent_threshold: '01:00', fine_mode: 'TIER', late_grace_minutes: null,
  }
  it('เช็คอิน 00:30 (checkInMins ต้องบวก 1440 แล้วโดยผู้เรียก) = สาย แต่ยังไม่ขาด', () => {
    const r = computeLateStatus(night, toMins('00:30') + 1440, true)
    // 00:30 เลย late_threshold_2 (23:00) ไปแล้ว แต่ยังไม่ถึง absent ที่ตีความเป็น
    // ตี 1 ของรุ่งขึ้น (01:00+1440=1500 นาที) เลยได้แค่ระดับ 2 ไม่ใช่ขาด
    expect(r).toMatchObject({ is_late: true, is_absent: false, late_level: 2 })
  })
  it('เช็คอิน 01:30 (เลย absent ที่ตีความเป็นตี 1 รุ่งขึ้นแล้ว) = ขาด', () => {
    const r = computeLateStatus(night, toMins('01:30') + 1440, true)
    expect(r).toMatchObject({ is_late: true, is_absent: true })
  })
  it('เช็คอินตรงเวลาเริ่มกะเป๊ะ (22:00) = ไม่สาย แม้เป็นกะข้ามคืน', () => {
    expect(computeLateStatus(night, toMins('22:00'), true).is_late).toBe(false)
  })
  it('crossesMidnight=false (ค่า default) — พฤติกรรมเดิมไม่เปลี่ยน ไม่ตีความ threshold เป็นวันถัดไป', () => {
    // ไม่ส่ง crossesMidnight เลย เทียบ threshold แบบเดิมตรงๆ (ไม่บวก 1440)
    // "01:00"=60 < startMins(1320) ตีความตรงตัว → absentMins=60 ซึ่งน้อยกว่า checkInMins
    // เสมอ (เพราะ checkIn ต้อง > startMins(1320) อยู่แล้วถึงจะเข้าเงื่อนไขนี้) จึงขาดทันที
    const r = computeLateStatus(night, toMins('22:30'))
    expect(r.is_absent).toBe(true)
  })
})

describe('computeLateStatus — PER_MINUTE', () => {
  it('ภายใน grace = ไม่สาย', () => {
    expect(computeLateStatus(perMin, toMins('09:05')).is_late).toBe(false)
  })
  it('เกิน grace = สายระดับ 1', () => {
    expect(computeLateStatus(perMin, toMins('09:06'))).toMatchObject({ is_late: true, late_level: 1, late_minutes: 6 })
  })
  it('grace เป็น null → ถือว่า 0', () => {
    const s: ShiftLateConfig = { ...perMin, late_grace_minutes: null }
    expect(computeLateStatus(s, toMins('09:01')).is_late).toBe(true)
  })
  it('เกิน absent_threshold = ขาด', () => {
    expect(computeLateStatus(perMin, toMins('10:00')).is_absent).toBe(true)
  })
})

describe('computeFine — TIER', () => {
  const fine: ShiftFineConfig = { fine_mode: 'TIER', late_fine_1: 50, late_fine_2: 200, late_grace_minutes: null }
  it('ไม่สาย = 0', () => {
    expect(computeFine(fine, { is_late: false, late_level: 0, late_minutes: 0, is_absent: false })).toBe(0)
  })
  it('ขาด = 0 (ไม่รวม absent_fine)', () => {
    expect(computeFine(fine, { is_late: true, late_level: 2, late_minutes: 90, is_absent: true })).toBe(0)
  })
  it('สายระดับ 1 = late_fine_1', () => {
    expect(computeFine(fine, { is_late: true, late_level: 1, late_minutes: 20, is_absent: false })).toBe(50)
  })
  it('สายระดับ 2 = late_fine_2', () => {
    expect(computeFine(fine, { is_late: true, late_level: 2, late_minutes: 50, is_absent: false })).toBe(200)
  })
  it('late_fine null = 0', () => {
    expect(computeFine({ ...fine, late_fine_1: null }, { is_late: true, late_level: 1, late_minutes: 20, is_absent: false })).toBe(0)
  })
})

describe('computeFine — PER_MINUTE', () => {
  const fine: ShiftFineConfig = { fine_mode: 'PER_MINUTE', late_fine_1: null, late_fine_2: null, late_fine_per_minute: 5, late_grace_minutes: 5, late_fine_max: 300 }
  it('สาย 20 นาที grace 5 → (20-5)*5 = 75', () => {
    expect(computeFine(fine, { is_late: true, late_level: 1, late_minutes: 20, is_absent: false })).toBe(75)
  })
  it('ชนเพดาน late_fine_max', () => {
    expect(computeFine(fine, { is_late: true, late_level: 1, late_minutes: 120, is_absent: false })).toBe(300)
  })
  it('grace เป็น null → ไม่หัก grace', () => {
    expect(computeFine({ ...fine, late_grace_minutes: null, late_fine_max: null }, { is_late: true, late_level: 1, late_minutes: 10, is_absent: false })).toBe(50)
  })
  it('rate เป็น null = 0', () => {
    expect(computeFine({ ...fine, late_fine_per_minute: null }, { is_late: true, late_level: 1, late_minutes: 20, is_absent: false })).toBe(0)
  })
  it('ไม่มีเพดาน → คิดเต็ม', () => {
    expect(computeFine({ ...fine, late_fine_max: null }, { is_late: true, late_level: 1, late_minutes: 25, is_absent: false })).toBe(100)
  })
})
