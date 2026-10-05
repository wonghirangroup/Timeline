import { describe, it, expect } from 'vitest'
import { weekendDaysInMonth, resolveBookingQuotaFromChain } from './group.service'

describe('weekendDaysInMonth', () => {
  it('ตุลาคม 2569 มีเสาร์ 5 + อาทิตย์ 4 = 9 วัน', () => expect(weekendDaysInMonth('2026-10')).toBe(9))
  it('กุมภาพันธ์ 2026 (28 วัน) มี 8 วัน', () => expect(weekendDaysInMonth('2026-02')).toBe(8))
  it('สิงหาคม 2026 มีเสาร์ 5 + อาทิตย์ 5 = 10 วัน', () => expect(weekendDaysInMonth('2026-08')).toBe(10))
})

describe('resolveBookingQuotaFromChain (WEEKENDS_IN_MONTH)', () => {
  const pool = { employee_status_type: { off_quota_mode: 'WEEKENDS_IN_MONTH' as const, monthly_off_quota: 4 } }
  it('ส่งเดือนมา → ใช้จำนวนเสาร์-อาทิตย์ของเดือนนั้น', () => expect(resolveBookingQuotaFromChain(pool, '2026-10')).toBe(9))
  it('ไม่ส่งเดือน → ใช้ตัวเลขคงที่เดิม', () => expect(resolveBookingQuotaFromChain(pool)).toBe(4))
  it('โหมด FIXED → ไม่สนเดือน', () => expect(resolveBookingQuotaFromChain({ employee_status_type: { off_quota_mode: 'FIXED', monthly_off_quota: 5 } }, '2026-10')).toBe(5))
})
