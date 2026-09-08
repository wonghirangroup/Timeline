import { describe, it, expect } from 'vitest'
import { resolveLeaveDays } from './leave.service'

describe('resolveLeaveDays', () => {
  it('FULL → ใช้ fallbackDays จาก client', () => {
    expect(resolveLeaveDays('FULL', 3)).toBe(3)
    expect(resolveLeaveDays('FULL', 1)).toBe(1)
  })
  it('MORNING / AFTERNOON → 0.5 เสมอ', () => {
    expect(resolveLeaveDays('MORNING', 1)).toBe(0.5)
    expect(resolveLeaveDays('AFTERNOON', 5)).toBe(0.5)
  })
  it('CUSTOM 09:00–13:00 กะ 8 ชม. → 0.5', () => {
    expect(resolveLeaveDays('CUSTOM', 1, '09:00', '13:00', 8)).toBe(0.5)
  })
  it('CUSTOM 09:00–17:00 กะ 8 ชม. → 1', () => {
    expect(resolveLeaveDays('CUSTOM', 1, '09:00', '17:00', 8)).toBe(1)
  })
  it('CUSTOM 2 ชม. → ปัดขึ้นขั้นต่ำ 0.5', () => {
    expect(resolveLeaveDays('CUSTOM', 1, '09:00', '11:00', 8)).toBe(0.5)
  })
  it('CUSTOM ปัดเป็นทวีคูณ 0.5 (6 ชม./8 = 0.75 → 1)', () => {
    expect(resolveLeaveDays('CUSTOM', 1, '09:00', '15:00', 8)).toBe(1)
  })
  it('CUSTOM กะสั้น 6 ชม.: 3 ชม. → 0.5', () => {
    expect(resolveLeaveDays('CUSTOM', 1, '09:00', '12:00', 6)).toBe(0.5)
  })
  it('CUSTOM ช่วงเวลาไม่ถูกต้อง → throw', () => {
    expect(() => resolveLeaveDays('CUSTOM', 1, '13:00', '09:00', 8)).toThrow('INVALID_TIME_RANGE')
    expect(() => resolveLeaveDays('CUSTOM', 1, null, null, 8)).toThrow('INVALID_TIME_RANGE')
  })
})
