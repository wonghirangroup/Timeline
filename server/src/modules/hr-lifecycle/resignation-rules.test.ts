import { describe, it, expect } from 'vitest'
import { isResignationEffective } from './resignation-rules'

describe('isResignationEffective', () => {
  it('วันทำงานสุดท้ายยังไม่ถึง → ยังไม่มีผล', () => {
    expect(isResignationEffective('2026-12-28', '2026-10-14')).toBe(false)
  })
  it('วันนี้คือวันทำงานสุดท้าย → ยังเช็คอินได้ ยังไม่มีผล', () => {
    expect(isResignationEffective('2026-12-28', '2026-12-28')).toBe(false)
  })
  it('วันถัดจากวันทำงานสุดท้าย → มีผล', () => {
    expect(isResignationEffective('2026-12-28', '2026-12-29')).toBe(true)
  })
  it('วันทำงานสุดท้ายผ่านมานานแล้ว → มีผล', () => {
    expect(isResignationEffective('2026-09-01', '2026-10-14')).toBe(true)
  })
  it('รับ Date (UTC-midnight จากคอลัมน์ DATE) ได้', () => {
    expect(isResignationEffective(new Date('2026-12-28T00:00:00.000Z'), '2026-12-28')).toBe(false)
    expect(isResignationEffective(new Date('2026-12-28T00:00:00.000Z'), '2026-12-29')).toBe(true)
  })
  it('ข้ามปี: 31 ธ.ค. → 1 ม.ค.', () => {
    expect(isResignationEffective('2026-12-31', '2027-01-01')).toBe(true)
  })
})
