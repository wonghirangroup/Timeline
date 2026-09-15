import { describe, it, expect } from 'vitest'
import { isVacationEligible, resolveVacationEntitlementFromChain, type VacationEmployeeShape } from './vacation-policy.service'

const TODAY = new Date('2027-06-01T00:00:00Z')

function emp(o: Partial<{
  hiredAt: string; mode: 'WEEKLY' | 'MONTHLY_BATCH'; status: string
  probationEnd: string | null; probationResult: string | null
  base: number | null; incDays: number | null; incYears: number | null
}>): VacationEmployeeShape {
  return {
    hired_at: o.hiredAt ? new Date(o.hiredAt) : null,
    weekly_off_mode: o.mode ?? 'MONTHLY_BATCH',
    status: o.status ?? 'ACTIVE',
    probation_end_date: o.probationEnd === undefined ? null : (o.probationEnd ? new Date(o.probationEnd) : null),
    probation_result: o.probationResult ?? null,
    position: {
      vacation_base_days: 'base' in o ? o.base : 11,
      vacation_increment_days: 'incDays' in o ? o.incDays : 1,
      vacation_increment_years: 'incYears' in o ? o.incYears : 2,
    },
  }
}

describe('isVacationEligible', () => {
  it('null employee → ไม่มีสิทธิ์', () => {
    expect(isVacationEligible(null, TODAY).eligible).toBe(false)
  })
  it('ไม่ ACTIVE → ไม่มีสิทธิ์', () => {
    expect(isVacationEligible(emp({ hiredAt: '2020-01-01', status: 'INACTIVE' }), TODAY).eligible).toBe(false)
  })
  it('โหมด WEEKLY (รายวัน) → ไม่มีสิทธิ์ (โปรแกรมนี้เฉพาะพนักงานประจำ)', () => {
    expect(isVacationEligible(emp({ hiredAt: '2020-01-01', mode: 'WEEKLY' }), TODAY).eligible).toBe(false)
  })
  it('ยังอยู่ในโปร (probation_end_date ในอนาคต) → ไม่มีสิทธิ์', () => {
    expect(isVacationEligible(emp({ hiredAt: '2027-01-01', probationEnd: '2027-12-31' }), TODAY).eligible).toBe(false)
  })
  it('ผ่านโปรแล้ว (probation_end_date ผ่านมาแล้ว) → เช็คเงื่อนไขอื่นต่อ', () => {
    const r = isVacationEligible(emp({ hiredAt: '2020-01-01', probationEnd: '2020-04-01' }), TODAY)
    expect(r.eligible).toBe(true)
  })
  it('ไม่มี probation_end_date เลย → ถือว่าผ่านแล้ว (ตาม runAccrualForMonth predicate เดิม)', () => {
    expect(isVacationEligible(emp({ hiredAt: '2020-01-01', probationEnd: null }), TODAY).eligible).toBe(true)
  })
  it('อายุงานไม่ถึง 1 ปี → ไม่มีสิทธิ์', () => {
    expect(isVacationEligible(emp({ hiredAt: '2027-01-01' }), TODAY).eligible).toBe(false)
  })
  it('ตำแหน่งไม่ได้ตั้งค่าโปรแกรมพักร้อน (base=null) → ไม่มีสิทธิ์', () => {
    expect(isVacationEligible(emp({ hiredAt: '2020-01-01', base: null }), TODAY).eligible).toBe(false)
  })
  it('ครบทุกเงื่อนไข → มีสิทธิ์', () => {
    expect(isVacationEligible(emp({ hiredAt: '2020-01-01' }), TODAY).eligible).toBe(true)
  })
})

describe('resolveVacationEntitlementFromChain — สูตร base + increment ทุก N ปี', () => {
  it('ไม่มีสิทธิ์ → 0 วัน', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2027-01-01' }), TODAY)).toBe(0)
  })
  it('ครบ 1 ปีพอดี (base=11, +1 ทุก 2 ปี) → 11 วัน', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2026-01-01' }), TODAY)).toBe(11)
  })
  it('ครบ 2 ปี (ยังไม่ถึงรอบเพิ่ม) → 11 วัน', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2025-01-01' }), TODAY)).toBe(11)
  })
  it('ครบ 3 ปี (รอบเพิ่มแรก) → 12 วัน', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2024-01-01' }), TODAY)).toBe(12)
  })
  it('ครบ 5 ปี (รอบเพิ่มที่ 2) → 13 วัน', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2022-01-01' }), TODAY)).toBe(13)
  })
  it('increment_years=0/null → คงที่ที่ base ตลอด ไม่ว่าอายุงานเท่าไหร่', () => {
    expect(resolveVacationEntitlementFromChain(emp({ hiredAt: '2010-01-01', incYears: null }), TODAY)).toBe(11)
  })
})
