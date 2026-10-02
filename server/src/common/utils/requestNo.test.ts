import { describe, it, expect } from 'vitest'
import { buddhistYearBangkok, formatRequestNo } from './requestNo'

describe('requestNo', () => {
  it('formats prefix-year-seq with 4-digit padding', () => {
    expect(formatRequestNo('LV', 2569, 1)).toBe('LV-2569-0001')
    expect(formatRequestNo('DOC', 2569, 123)).toBe('DOC-2569-0123')
    expect(formatRequestNo('OT', 2570, 12345)).toBe('OT-2570-12345')
  })
  it('uses the Buddhist year in Bangkok time', () => {
    expect(buddhistYearBangkok(new Date('2026-06-15T05:00:00Z'))).toBe(2569)
  })
  it('rolls the year over at Bangkok midnight, not UTC midnight', () => {
    expect(buddhistYearBangkok(new Date('2026-12-31T16:59:59Z'))).toBe(2569) // 23:59:59 ไทย ยังเป็นปีเดิม
    expect(buddhistYearBangkok(new Date('2026-12-31T17:00:00Z'))).toBe(2570) // 00:00 ไทยวันที่ 1 ม.ค. 2570
  })
})
