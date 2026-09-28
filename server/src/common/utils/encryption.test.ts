import { describe, it, expect, beforeAll } from 'vitest'
import { encryptField, decryptField } from './encryption'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test_key_exactly_32_characters__'
})

describe('encryptField / decryptField', () => {
  it('round-trips a plain value', () => {
    const encrypted = encryptField('1234567890123')
    expect(encrypted).not.toBe('1234567890123')
    expect(encrypted.startsWith('enc:v1:')).toBe(true)
    expect(decryptField(encrypted)).toBe('1234567890123')
  })

  it('produces different ciphertext for the same input each time (random IV)', () => {
    const a = encryptField('1234567890123')
    const b = encryptField('1234567890123')
    expect(a).not.toBe(b)
  })

  it('passes legacy plain-text values through unchanged (pre-encryption records)', () => {
    expect(decryptField('1234567890123')).toBe('1234567890123')
  })

  it('handles null/undefined', () => {
    expect(decryptField(null)).toBeNull()
    expect(decryptField(undefined)).toBeNull()
  })

  it('returns null instead of throwing on corrupted ciphertext', () => {
    expect(decryptField('enc:v1:garbage:garbage:garbage')).toBeNull()
  })
})
