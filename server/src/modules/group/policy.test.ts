import { describe, it, expect } from 'vitest'
import { resolvePolicyFromChain, type PolicyEmployeeShape } from './group.service'

// helper สร้าง employee shape เต็ม 6 ชั้น
const emp = (o: Partial<{
  ovr: boolean | null; pos: boolean | null; dept: boolean | null; div: boolean | null; br: boolean | null; grp: boolean | null
}>): PolicyEmployeeShape => ({
  leave_enabled_override: o.ovr ?? null,
  position: { leave_enabled: o.pos ?? null, department: { leave_enabled: o.dept ?? null, division: { leave_enabled: o.div ?? null } } },
  branch: { leave_enabled: o.br ?? null, group: { leave_enabled: o.grp ?? null } },
})

describe('resolvePolicyFromChain — leave', () => {
  it('chain ว่างทั้งหมด → true (default)', () => {
    expect(resolvePolicyFromChain(emp({}), 'leave')).toBe(true)
  })
  it('employee null → true', () => {
    expect(resolvePolicyFromChain(null, 'leave')).toBe(true)
  })
  it('กลุ่มปิด ชั้นอื่นว่าง → ปิด', () => {
    expect(resolvePolicyFromChain(emp({ grp: false }), 'leave')).toBe(false)
  })
  it('กลุ่มปิด แต่สาขาเปิดทับ → เปิด (เจาะจงกว่าชนะ)', () => {
    expect(resolvePolicyFromChain(emp({ grp: false, br: true }), 'leave')).toBe(true)
  })
  it('สาขาปิด แต่ตำแหน่งเปิดทับ → เปิด', () => {
    expect(resolvePolicyFromChain(emp({ br: false, pos: true }), 'leave')).toBe(true)
  })
  it('ทุกชั้นปิด แต่ override บุคคลเปิด → เปิด', () => {
    expect(resolvePolicyFromChain(emp({ ovr: true, pos: false, dept: false, div: false, br: false, grp: false }), 'leave')).toBe(true)
  })
  it('override บุคคลปิด ชนะทุกอย่าง', () => {
    expect(resolvePolicyFromChain(emp({ ovr: false, pos: true, grp: true }), 'leave')).toBe(false)
  })
  it('แผนกปิด แต่ฝ่าย(division)เปิด → แผนกเจาะจงกว่า ชนะ = ปิด', () => {
    expect(resolvePolicyFromChain(emp({ dept: false, div: true }), 'leave')).toBe(false)
  })
})

describe('resolvePolicyFromChain — booking แยกแกนจาก leave', () => {
  it('ปิดเฉพาะแกน booking ไม่กระทบ leave', () => {
    const e: PolicyEmployeeShape = {
      branch: { booking_enabled: false, leave_enabled: true },
    }
    expect(resolvePolicyFromChain(e, 'booking')).toBe(false)
    expect(resolvePolicyFromChain(e, 'leave')).toBe(true)
  })
})
