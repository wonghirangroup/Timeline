import { describe, it, expect } from 'vitest'
import { bangkokNow, bangkokToday, bangkokDateStr, bangkokAddDays } from './time'

describe('bangkok time helpers', () => {
  // 2026-09-08 20:00 UTC = 2026-09-09 03:00 ICT → วันไทยคือ 9
  const lateNightUtc = new Date('2026-09-08T20:00:00.000Z')
  // 2026-09-08 02:00 UTC = 2026-09-08 09:00 ICT → วันไทยคือ 8
  const morningUtc = new Date('2026-09-08T02:00:00.000Z')

  it('bangkokDateStr — ข้ามเที่ยงคืนไทยแต่ยังเป็นเมื่อวานใน UTC', () => {
    expect(bangkokDateStr(lateNightUtc)).toBe('2026-09-09')
    expect(bangkokDateStr(morningUtc)).toBe('2026-09-08')
  })

  it('bangkokToday — UTC-midnight ของวันไทย', () => {
    expect(bangkokToday(lateNightUtc).toISOString()).toBe('2026-09-09T00:00:00.000Z')
    expect(bangkokToday(morningUtc).toISOString()).toBe('2026-09-08T00:00:00.000Z')
  })

  it('bangkokNow — component เป็นเวลาไทย', () => {
    const b = bangkokNow(lateNightUtc)
    expect(b.getFullYear()).toBe(2026)
    expect(b.getMonth()).toBe(8) // ก.ย. = 8
    expect(b.getDate()).toBe(9)
    expect(b.getHours()).toBe(3)
  })

  it('bangkokAddDays — บวก/ลบวันจาก UTC-midnight', () => {
    const base = new Date('2026-09-09T00:00:00.000Z')
    expect(bangkokAddDays(base, -7).toISOString()).toBe('2026-09-02T00:00:00.000Z')
    expect(bangkokAddDays(base, 1).toISOString()).toBe('2026-09-10T00:00:00.000Z')
    expect(bangkokAddDays(base, 0).toISOString()).toBe('2026-09-09T00:00:00.000Z')
  })

  it('ลบวันข้ามเดือน', () => {
    const base = new Date('2026-09-02T00:00:00.000Z')
    expect(bangkokAddDays(base, -5).toISOString()).toBe('2026-08-28T00:00:00.000Z')
  })
})
