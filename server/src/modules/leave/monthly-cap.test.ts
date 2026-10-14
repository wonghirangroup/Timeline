import { describe, it, expect } from 'vitest'
import { MonthlyCapError, capMessage } from './monthly-cap'

describe('capMessage', () => {
  it('บอกตัวเลขจองหยุด + พักร้อน และจำนวนที่เกิน', () => {
    const m = capMessage({ dayOff: 9, vacation: 1, total: 10, cap: 10, adding: 2 }, 'x')
    expect(m).toContain('จองหยุด 9 วัน')
    expect(m).toContain('ลาพักร้อน 1 วัน')
    expect(m).toContain('= 10 วัน')
    expect(m).toContain('จะเป็น 12 วัน')
    expect(m).toContain('เกิน 2 วัน')
  })
  it('ไม่มี detail → ใช้ข้อความสำรอง', () => {
    expect(capMessage(undefined, 'ข้อความเดิม')).toBe('ข้อความเดิม')
  })
  it('MonthlyCapError ยังมี message เดิม (โค้ดเดิมที่เทียบ e.message ใช้ได้)', () => {
    const e = new MonthlyCapError({ dayOff: 5, vacation: 5, total: 10, cap: 10, adding: 1 })
    expect(e.message).toBe('MONTHLY_CAP_EXCEEDED')
    expect(e.detail.adding).toBe(1)
  })
})
