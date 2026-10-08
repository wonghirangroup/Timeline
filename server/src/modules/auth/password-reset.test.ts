import { describe, it, expect } from 'vitest'
import { generateOtp, otpEmail, OTP_TTL_MIN, normalizeRecoveryEmail, isEmailLike } from './password-reset.service'

describe('password reset OTP', () => {
  it('generateOtp ได้ตัวเลข 6 หลักเสมอ (รวมเลขนำหน้า 0)', () => {
    for (let i = 0; i < 500; i++) expect(generateOtp()).toMatch(/^[0-9]{6}$/)
  })
  it('อีเมลมี OTP และบอกอายุโค้ด', () => {
    const m = otpEmail('012345', 'สมชาย')
    expect(m.subject).toContain('012345')
    expect(m.html).toContain('012345')
    expect(m.html).toContain(String(OTP_TTL_MIN))
    expect(m.text).toContain('012345')
  })
})

describe('recovery email', () => {
  it('ว่าง/ช่องว่างล้วน → null (ลบอีเมลกู้รหัส)', () => {
    expect(normalizeRecoveryEmail('')).toBeNull()
    expect(normalizeRecoveryEmail('   ')).toBeNull()
    expect(normalizeRecoveryEmail(undefined)).toBeNull()
  })
  it('ตัดช่องว่างและแปลงเป็นตัวพิมพ์เล็ก', () => {
    expect(normalizeRecoveryEmail('  Somchai@Example.COM ')).toBe('somchai@example.com')
  })
  it('รูปแบบผิด → throw INVALID_EMAIL', () => {
    for (const bad of ['abc', 'a@b', '@x.com', 'a b@c.com', 'x@y.']) expect(() => normalizeRecoveryEmail(bad)).toThrow('INVALID_EMAIL')
  })
  it('isEmailLike แยกชื่อผู้ใช้ธรรมดาออกจากอีเมล', () => {
    expect(isEmailLike('wonghi_admin')).toBe(false)
    expect(isEmailLike('58-01-001')).toBe(false)
    expect(isEmailLike('a@b.co')).toBe(true)
  })
})
