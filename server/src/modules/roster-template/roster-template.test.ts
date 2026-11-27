import { describe, it, expect } from 'vitest'
import { sanitizeTemplateData } from './roster-template.service'

describe('sanitizeTemplateData', () => {
  it('คงค่าที่ถูกต้องไว้ครบ', () => {
    const out = sanitizeTemplateData({
      cols: { code: false, branch: true },
      colors: { e1: '#244B83' }, groupOverrides: { e1: 'ทีม A' }, customGroups: ['ทีม A'],
      hidden: ['e2'], splitPositions: ['พนักงานขนส่ง'], groupId: 'g1', deptId: 'd1',
    })
    expect(out).toEqual({
      cols: { code: false, branch: true },
      colors: { e1: '#244B83' }, groupOverrides: { e1: 'ทีม A' }, customGroups: ['ทีม A'],
      hidden: ['e2'], splitPositions: ['พนักงานขนส่ง'], groupId: 'g1', deptId: 'd1',
    })
  })

  it('ตัดฟิลด์แปลกปลอมและชนิดผิดทิ้ง · ใส่ค่าเริ่มต้นให้ที่ขาด', () => {
    const out = sanitizeTemplateData({ evil: 'x', colors: { a: 1, b: '#fff' }, hidden: ['ok', 5, null], customGroups: 'nope' })
    expect(out.colors).toEqual({ b: '#fff' })
    expect(out.hidden).toEqual(['ok'])
    expect(out.customGroups).toEqual([])
    expect(out.cols).toEqual({ code: true, branch: true })
    expect(out.groupId).toBe('')
    expect((out as any).evil).toBeUndefined()
  })

  it('รับ null/ค่าไม่ใช่ object ได้โดยไม่พัง', () => {
    expect(sanitizeTemplateData(null).hidden).toEqual([])
    expect(sanitizeTemplateData('x').colors).toEqual({})
  })

  it('ใหญ่เกินกำหนดแล้วปฏิเสธ', () => {
    const big: Record<string, string> = {}
    for (let i = 0; i < 6000; i++) big['employee-' + i.toString().padStart(6, '0') + '-xxxxxxxxxxxxxxxxxxxxxxxxxxxx'] = '#244B83'
    expect(() => sanitizeTemplateData({ colors: big })).toThrow('TEMPLATE_TOO_LARGE')
  })
})
