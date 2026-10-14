import { describe, it, expect } from 'vitest'
import { FEATURE_KEYS, ENFORCED_FEATURES, isFeatureEnabled } from './features'

describe('package features: groups / line_notify', () => {
  it('มีใน FEATURE_KEYS และบังคับใช้จริง', () => {
    expect(FEATURE_KEYS).toContain('groups')
    expect(FEATURE_KEYS).toContain('line_notify')
    expect(ENFORCED_FEATURES).toContain('groups')
    expect(ENFORCED_FEATURES).toContain('line_notify')
  })
  it('tenant เดิมที่ไม่มี key = เปิด (ไม่ต้อง backfill)', () => {
    expect(isFeatureEnabled({ leave_management: true }, 'groups')).toBe(true)
    expect(isFeatureEnabled(null, 'line_notify')).toBe(true)
  })
  it('ตั้ง false = ปิด', () => {
    expect(isFeatureEnabled({ groups: false }, 'groups')).toBe(false)
    expect(isFeatureEnabled({ line_notify: false }, 'line_notify')).toBe(false)
  })
})
