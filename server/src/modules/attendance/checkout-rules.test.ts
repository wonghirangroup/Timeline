// server/src/modules/attendance/checkout-rules.test.ts
// เทส isBeforeMinCheckout — บั๊กจริงที่เจอ (feedback 2026-09-22): กะข้ามคืนตั้ง
// min_checkout เป็นเวลาหลังเที่ยงคืน แล้วเช็คเอาต์ตอนถึงเวลาจริงแล้วกลับบอก
// "ยังไม่ถึงเวลา" เพราะเดิมเทียบแค่ "นาทีในวัน" ตรงๆ ไม่รู้ว่าข้ามเที่ยงคืนมาหรือยัง
import { describe, it, expect } from 'vitest'
import { isBeforeMinCheckout } from './attendance.service'

// recordDate ต้องเป็น UTC-midnight แบบเดียวกับที่ bangkokToday()/@db.Date คืนมา
function bkkDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d))
}
// now: เวลาไทย (ICT, UTC+7) แปลงเป็น UTC instant จริง
function bkkInstant(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh - 7, mm))
}

describe('isBeforeMinCheckout', () => {
  it('ไม่มี min_checkout ตั้งไว้ — เช็คเอาต์ได้เสมอ', () => {
    const shift = { start_time: '09:00', end_time: '18:00', min_checkout: null }
    expect(isBeforeMinCheckout(shift, bkkDate(2026, 9, 22), bkkInstant(2026, 9, 22, 8, 0))).toBe(false)
  })

  describe('กะปกติ (ไม่ข้ามคืน) 09:00–18:00, min_checkout 17:55', () => {
    const shift = { start_time: '09:00', end_time: '18:00', min_checkout: '17:55' }
    const recordDate = bkkDate(2026, 9, 22)
    it('17:50 — ยังไม่ถึงเวลา', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 17, 50))).toBe(true)
    })
    it('17:55 — ถึงเวลาพอดี เช็คเอาต์ได้', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 17, 55))).toBe(false)
    })
    it('18:30 — เลยเวลาแล้ว เช็คเอาต์ได้', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 18, 30))).toBe(false)
    })
  })

  describe('กะข้ามคืน 18:00–02:00, min_checkout 23:55 (ก่อนเที่ยงคืน วันเดียวกับกะเริ่ม)', () => {
    const shift = { start_time: '18:00', end_time: '02:00', min_checkout: '23:55' }
    const recordDate = bkkDate(2026, 9, 21) // วันที่กะเริ่ม
    it('23:50 คืนวันเดียวกัน — ยังไม่ถึงเวลา', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 21, 23, 50))).toBe(true)
    })
    it('23:55 คืนวันเดียวกัน — ถึงเวลาพอดี', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 21, 23, 55))).toBe(false)
    })
  })

  describe('กะข้ามคืน 18:00–02:00, min_checkout 00:30 (หลังเที่ยงคืน — บั๊กจริงที่เจอ)', () => {
    const shift = { start_time: '18:00', end_time: '02:00', min_checkout: '00:30' }
    const recordDate = bkkDate(2026, 9, 21) // วันที่กะเริ่ม (21 ก.ย.)
    it('23:50 คืนวันที่กะเริ่ม (ก่อนถึง 00:30 ของรุ่งขึ้น) — ยังไม่ถึงเวลา', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 21, 23, 50))).toBe(true)
    })
    it('00:30 ของรุ่งขึ้น (22 ก.ย.) — ถึงเวลาพอดี เช็คเอาต์ได้ (เดิมบั๊ก: เข้าใจผิดว่ายังไม่ถึง)', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 0, 30))).toBe(false)
    })
    it('01:00 ของรุ่งขึ้น — เลยเวลาแล้ว เช็คเอาต์ได้', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 1, 0))).toBe(false)
    })
    it('00:10 ของรุ่งขึ้น (ก่อนถึง 00:30) — ยังไม่ถึงเวลา', () => {
      expect(isBeforeMinCheckout(shift, recordDate, bkkInstant(2026, 9, 22, 0, 10))).toBe(true)
    })
  })
})
