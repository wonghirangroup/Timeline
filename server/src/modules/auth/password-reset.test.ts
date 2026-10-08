import { describe, it, expect } from 'vitest'
import { generateOtp, otpEmail, OTP_TTL_MIN } from './password-reset.service'

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
