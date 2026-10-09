// ถ่ายภาพ "ตรงกับงานย่อย" สำหรับแนบใน WongWorkpath — ใช้ข้อมูลจำลองเหมือนชุดคู่มือ (ไม่มีข้อมูลจริง)
// ต่างจาก capture.js: ไม่มีวงเลข แต่มีกรอบแดง + ป้ายข้อความบอกว่าตรงกับงานข้อไหน · ออกที่ task-shots/ (PNG)
// ใช้: node capture_tasks.js [id ...]   (ต้องรัน admin ที่ :5199 เหมือน capture.js)
const fs = require('fs')
const path = require('path')
const fx = require('./fixtures')
const { launch, newPage, BASE } = require('./harness')
// ข้อมูลจำลองเพิ่มเฉพาะชุดนี้ (ไม่แก้ fixtures.js): พนักงาน 1 คนหยุดประจำสัปดาห์วันนี้ · อีกคนตั้ง "ไม่ต้องเช็คอิน" → ให้เห็นป้ายสถานะ หยุด/ไม่ต้องเช็ค ในตารางเช็คอิน
fx.employees[10].checkin_exempt = true
const origRoute = fx.route
fx.route = (m, p, q) => {
  const r = origRoute(m, p, q)
  if (p.replace('/api/v1', '') === '/admin/weekly-off' && Array.isArray(r) && r.length) {
    const t = new Date(Date.now() + 7 * 3600 * 1000); const dow = t.getUTCDay()
    const mon = new Date(t); mon.setUTCDate(t.getUTCDate() - ((dow + 6) % 7))
    const base = r.find(x => x.status === 'APPROVED') || r[0]
    return [...r, { ...base, id: 'wx1', employee_id: fx.employees[9].id, employee: { ...base.employee, id: fx.employees[9].id, first_name: fx.employees[9].first_name, last_name: fx.employees[9].last_name, nickname: fx.employees[9].nickname, employee_code: fx.employees[9].employee_code }, week_start: mon.toISOString().slice(0, 10), day_of_week: dow, status: 'APPROVED' }]
  }
  if (p.replace('/api/v1', '') === '/admin/shifts' && Array.isArray(r)) return r.map(x => ({ ...x, branch: x.branch || fx.branches.find(b => b.id === x.branch_id) || fx.branches[0], _count: x._count || { employees: 2 }, is_active: x.is_active ?? true }))
  return r
}
const OUT = process.env.TASK_SHOTS_OUT || 'C:/Users/User/Downloads/timeline/task-shots/'
fs.mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))

const clickText = async (page, text, tag = 'button, a, [role=tab], div, span', nth = 0) => {
  const pt = await page.evaluate((text, tag, nth) => {
    const els = [...document.querySelectorAll(tag)].filter(e => e.textContent.includes(text) && e.getBoundingClientRect().width > 0)
    els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)
    const el = els[nth]; if (!el) throw new Error('click: ' + text)
    el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, text, tag, nth)
  await page.mouse.click(pt.x, pt.y)
}

// กรอบแดง + ป้ายข้อความ (ไม่ใช่เลข) ทับ element ที่ระบุ
async function highlight(page, items) {
  await page.evaluate((items) => {
    document.querySelectorAll('.__hl').forEach(e => e.remove())
    const find = (m) => {
      if (m.selector) { const vis = [...document.querySelectorAll(m.selector)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }); return vis[m.nth || 0] }
      const els = [...document.querySelectorAll(m.tag || 'button, a, h1, h2, h3, label, span, div, th, td, select, input')]
      const c = els.filter(e => e.textContent && (m.exact ? e.textContent.trim() === m.text : e.textContent.trim().includes(m.text)) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0)
      c.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))
      return c[m.nth || 0]
    }
    items.forEach(m => {
      let el = find(m)
      if (!el) { console.warn('hl not found', JSON.stringify(m)); return }
      if (m.card) { let p = el; while (p.parentElement) { const cs = getComputedStyle(p); const rr = p.getBoundingClientRect(); if (rr.width >= 110 && rr.height >= 48 && parseFloat(cs.borderTopLeftRadius) >= 8) break; p = p.parentElement } el = p }
      if (m.up) { for (let k = 0; k < m.up && el.parentElement; k++) el = el.parentElement }
      const r = el.getBoundingClientRect(); const pad = m.pad ?? 4
      const box = document.createElement('div'); box.className = '__hl'
      Object.assign(box.style, { position: 'fixed', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', border: '3px solid #ef2d56', borderRadius: '10px', boxShadow: '0 0 0 2px rgba(255,255,255,.85)', zIndex: 99999, pointerEvents: 'none' })
      document.body.append(box)
      if (m.label) {
        const tag = document.createElement('div'); tag.className = '__hl'; tag.textContent = m.label
        const below = m.below === true
        Object.assign(tag.style, { position: 'fixed', left: Math.max(8, r.left - pad) + 'px', top: below ? r.bottom + pad + 6 + 'px' : Math.max(6, r.top - pad - 34) + 'px', background: '#ef2d56', color: '#fff', font: '700 14px/1.2 "Noto Sans Thai", Sarabun, sans-serif', padding: '6px 12px', borderRadius: '8px', zIndex: 100000, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.25)', maxWidth: '520px' })
        document.body.append(tag)
      }
    })
  }, items)
}

const goEmployeeEdit = async (p) => {
  await clickText(p, 'ยังไม่', 'button, span, div').catch(() => {})
}

const SHOTS = [
  // ── M01 เข้าสู่ระบบ ──
  { id: 'M01-login', path: 'login', clip: { x: 150, y: 90, width: 1060, height: 720 },
    setup: async (p) => { await p.type('input[placeholder="username"]', 'demo.admin'); await p.evaluate(() => { const l = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.includes('DEV only'))[0]; let el = l; while (el && el.parentElement && !el.parentElement.querySelector('input')) el = el.parentElement; if (el) el.remove() }) } },
  { id: 'M01-forgot-password', path: 'login', clip: { x: 150, y: 90, width: 1060, height: 720 },
    setup: async (p) => { await clickText(p, 'ลืมรหัสผ่าน', 'button, a'); await sleep(900) },
    hl: [{ text: 'OTP 6 หลัก', tag: 'p, div', label: 'ส่ง OTP 6 หลักทางอีเมล (ใช้ได้ 10 นาที)', card: false, pad: 8, below: true }] },
  // ── M02 ภาพรวม ──
  { id: 'M02-dashboard-cards', path: 'dashboard',
    hl: [{ text: 'มาสาย (คน)', tag: 'div, button, span', card: true, label: 'การ์ดสรุป — กดดูรายชื่อได้', below: true }] },
  { id: 'M02-dashboard-banner', path: 'dashboard', clip: { x: 260, y: 60, width: 1180, height: 300 } },
  // ── M03 สาขา กะ พนักงาน ──
  { id: 'M03-branch-geofence', path: 'branch',
    setup: async (p) => { await clickText(p, 'เพิ่มสาขา', 'button'); await sleep(800); await p.type('input[placeholder*="สำนักงานใหญ่"]', 'สาขาลาดพร้าว'); await clickText(p, 'ถัดไป', 'button'); await sleep(700); await clickText(p, 'ถัดไป', 'button'); await sleep(900) },
    hl: [{ text: 'โหมดนอกพื้นที่', tag: 'label, div, span', up: 1, label: 'รัศมี + โหมด WARN / BLOCK ตั้งต่อสาขา', below: true, pad: 8 }] },
  { id: 'M03-shift-radius', path: 'branch',
    setup: async (p) => { await clickText(p, 'จัดการกะ', 'button, a, [role=tab], div, span'); await sleep(1500); await clickText(p, 'แก้ไข', 'button', 0); await sleep(1100); await p.evaluate(() => { const el = [...document.querySelectorAll('p')].find(x => x.textContent.trim() === 'รัศมีเช็คอิน GPS'); if (el) el.scrollIntoView({ block: 'center' }) }); await sleep(500) },
    hl: [{ text: 'รัศมีเช็คอิน GPS', tag: 'p', up: 1, label: 'รัศมีต่อกะ — ว่าง/0 = ใช้ค่าของสาขา', pad: 8 }] },
  { id: 'M03-employee-exempt', path: 'employee', h: 1100,
    setup: async (p) => { await p.click('button:has(svg.lucide-pencil)').catch(async () => { await clickText(p, 'แก้ไข', 'button') }); await sleep(1200)
      await p.evaluate(() => { const e = [...document.querySelectorAll('label')].find(l => l.textContent.includes('ไม่ต้องเช็คอิน')); if (e) e.scrollIntoView({ block: 'center' }) }); await sleep(500) },
    hl: [{ text: 'ไม่ต้องเช็คอิน (เช่น ผู้บริหาร)', tag: 'label', label: 'ตั้งค่า "ไม่ต้องเช็คอิน" ต่อพนักงาน', pad: 6 }] },
  { id: 'M03-employee-list', path: 'employee' },
  { id: 'M03-group-policy', path: 'employee?tab=policy' },
  // ── M04 เช็คอิน ──
  { id: 'M04-attendance-statuses', path: 'shift', h: 1000,
    setup: async (p) => { await clickText(p, 'คำอธิบายสี', 'button'); await sleep(900) },
    hl: [{ text: 'วันหยุดประจำสัปดาห์ของพนักงาน', tag: 'span, div', up: 0, label: 'ป้าย "หยุด" สีม่วง — แยกจาก "ยังไม่เช็ค" (เทา) · เรียงหยุด/ลาขึ้นก่อน', below: true }] },
  { id: 'M04-attendance-manual', path: 'shift',
    setup: async (p) => { await clickText(p, '+ ลงบันทึก', 'button'); await sleep(1000) } },
  { id: 'M04-offsite', path: 'offsite' },
  // ── M05 ลา & วันหยุด ──
  { id: 'M05-team-calendar-cards', path: 'leave', setup: async (p) => { await clickText(p, 'ปฏิทินรวม', 'button, a, div'); await sleep(1500) },
    hl: [{ text: 'หยุดประจำ', exact: true, tag: 'div', card: true, label: 'การ์ด "หยุดประจำ" นับวันหยุดประจำของพนักงาน', below: true }] },
  { id: 'M05-leave-create-modal', path: 'leave',
    setup: async (p) => { await clickText(p, 'สร้างวันลา', 'button'); await sleep(1000) } },
  { id: 'M05-leave-requests', path: 'leave' },
  { id: 'M05-weekly-off-open', path: 'leave', setup: async (p) => { await clickText(p, 'จองวันหยุดประจำเดือน', 'button, a, div'); await sleep(1300) } },
  { id: 'M05-leave-quota', path: 'leave', setup: async (p) => { await clickText(p, 'โควต้า', 'button, a, div'); await sleep(1300) } },
  { id: 'M05-vacation-policy', path: 'leave', setup: async (p) => { await clickText(p, 'นโยบายพักร้อน', 'button, a, div'); await sleep(1300) } },
  // ── M06 OT ลาออก เอกสาร ──
  { id: 'M06-ot', path: 'ot' },
  { id: 'M06-resignations', path: 'resignations' },
  { id: 'M06-document-requests', path: 'document-requests' },
  // ── M07 ประกาศ ──
  { id: 'M07-announcement', path: 'announcement', h: 1000 },
  // ── M08 รายงาน ──
  { id: 'M08-report-checkin', path: 'report' },
  { id: 'M08-report-executive', path: 'report/executive' },
  { id: 'M08-report-employee', path: 'report/employee' },
  { id: 'M08-audit-log', path: 'audit-log' },
  // ── M09 ตั้งค่า ──
  { id: 'M09-settings-users', path: 'settings', setup: async (p) => { await clickText(p, 'ผู้ใช้งาน', 'button'); await sleep(1200) } },
  { id: 'M09-settings-user-recovery-email', path: 'settings', h: 1000,
    setup: async (p) => { await clickText(p, 'ผู้ใช้งาน', 'button'); await sleep(1000); await clickText(p, 'เพิ่มผู้ใช้งาน', 'button'); await sleep(1000) },
    hl: [{ text: 'อีเมลสำหรับกู้รหัสผ่าน', tag: 'label', up: 0, label: 'อีเมลกู้รหัสผ่าน (ไว้รับ OTP)', pad: 6, below: false }] },
  { id: 'M09-settings-features', path: 'settings', setup: async (p) => { await clickText(p, 'ฟีเจอร์', 'button'); await sleep(1200) } },
  { id: 'M09-settings-notify', path: 'settings', setup: async (p) => { await clickText(p, 'การแจ้งเตือน', 'button'); await sleep(1200) } },
  // ── M00 ทั้งระบบ ──
  { id: 'M00-sidebar-light', path: 'dashboard', clip: { x: 0, y: 0, width: 300, height: 900 } },
  { id: 'M00-sidebar-collapsed', path: 'dashboard', clip: { x: 0, y: 0, width: 300, height: 900 },
    setup: async (p) => { await p.click('button[title="ย่อ sidebar"]'); await sleep(700) } },
  { id: 'M00-sidebar-mobile', path: 'dashboard', w: 390, h: 844,
    setup: async (p) => { await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.querySelector('svg.lucide-menu')); if (b) b.click() }); await sleep(900) } },
  { id: 'M00-pagination-mobile', path: 'employee', w: 390, h: 900,
    setup: async (p) => { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(600) },
    hl: [{ text: 'ปัดซ้าย/ขวา', tag: 'span', up: 1, label: 'มือถือ: ปัดซ้าย/ขวาเปลี่ยนหน้า', pad: 6 }] },
]
module.exports = SHOTS

if (require.main === module) {
  ;(async () => {
    const only = process.argv.slice(2)
    const b = await launch()
    for (const s of SHOTS) {
      if (only.length && !only.some(o => s.id.startsWith(o))) continue
      const page = await newPage(b, { authed: s.path !== 'login', w: s.w || 1440, h: s.h || 900 })
      page.on('pageerror', e => console.log('PAGEERROR', s.id, e.message.slice(0, 140)))
      page.on('console', m => { if (m.text().startsWith('hl not found')) console.log('  ', s.id, m.text().slice(0, 160)) })
      await page.goto(BASE + '/' + s.path, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto', e.message))
      await sleep(1200)
      try { if (s.setup) await s.setup(page) } catch (e) { console.log('SETUP FAIL', s.id, e.message.slice(0, 120)) }
      await sleep(500)
      if (s.hl) await highlight(page, s.hl)
      await sleep(200)
      const opt = { path: OUT + s.id + '.png', type: 'png' }
      if (s.clip) opt.clip = s.clip
      await page.screenshot(opt)
      console.log('ok', s.id, page.unmatched.size ? 'unmatched: ' + [...page.unmatched].join(' | ') : '')
      await page.close()
    }
    await b.close()
  })()
}
