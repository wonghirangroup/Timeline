// harness: เปิดแอดมินจริงบน vite local แต่ดักทุก /api/ แล้วตอบด้วยข้อมูลสมมติ (ไม่แตะฐานข้อมูลจริง)
const puppeteer = require('puppeteer-core')
const fx = require('./fixtures')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
const BASE = process.env.MANUAL_BASE || 'http://localhost:5199'

async function launch() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--lang=th-TH'] })
  return browser
}

async function newPage(browser, { authed = true, w = 1440, h = 900 } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const unmatched = new Set()
  await page.setRequestInterception(true)
  page.on('request', req => {
    const u = new URL(req.url())
    if (u.origin === BASE && u.pathname.startsWith('/api/')) {
      const r = fx.route(req.method(), u.pathname, u.searchParams)
      if (r === undefined) unmatched.add(req.method() + ' ' + u.pathname)
      return req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ success: true, data: r === undefined ? [] : r }) })
    }
    // ฟอนต์/รูปภายนอก ปล่อยผ่าน
    req.continue()
  })
  if (authed) {
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('access_token', 'demo'); localStorage.setItem('role', 'ADMIN')
      localStorage.setItem('tenant_id', 'demo-tenant'); localStorage.setItem('name', 'ผู้ดูแลระบบ (ตัวอย่าง)')
      localStorage.setItem('is_root_admin', '1')
      localStorage.setItem('yoonai_guide_seen', '1')
    })
  }
  page.unmatched = unmatched
  return page
}

// วาดกรอบ + วงเลข ทับบน element ที่ระบุ (selector หรือ ข้อความในปุ่ม) ก่อนแคปภาพ
async function annotate(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll('.__mk').forEach(e => e.remove())
    const find = (m) => {
      if (m.selector) { const vis = [...document.querySelectorAll(m.selector)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }); return m.pick === 'last' ? vis[vis.length - 1] : vis[m.nth || 0] }
      const scope = m.within ? document.querySelector(m.within) : document
      const els = [...(scope || document).querySelectorAll(m.tag || 'button, a, h1, h2, h3, label, span, div, th, td, select, input')]
      const cands = els.filter(e => e.textContent && (m.exact ? e.textContent.trim() === m.text : e.textContent.trim().includes(m.text)) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0)
      // เลือกตัวที่เล็กที่สุดที่มีข้อความนั้น (ลึกสุด)
      cands.sort((a, b) => (a.getBoundingClientRect().width * a.getBoundingClientRect().height) - (b.getBoundingClientRect().width * b.getBoundingClientRect().height))
      return m.pick === 'last' ? cands[cands.length - 1] : cands[m.nth || 0]
    }
    marks.forEach((m, i) => {
      let el = find(m)
      if (!el) { console.warn('mark not found', m); return }
      if (m.card) { let p = el; while (p.parentElement) { const cs = getComputedStyle(p); const rr = p.getBoundingClientRect(); if (rr.width >= 110 && rr.height >= 48 && parseFloat(cs.borderTopLeftRadius) >= 8) break; p = p.parentElement } el = p }
      if (m.up) { for (let k = 0; k < m.up && el.parentElement; k++) el = el.parentElement }
      const r = el.getBoundingClientRect()
      const pad = m.pad ?? 3
      const box = document.createElement('div')
      box.className = '__mk'
      Object.assign(box.style, { position: 'fixed', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px',
        border: '3px solid #ef2d56', borderRadius: '10px', boxShadow: '0 0 0 2px rgba(255,255,255,.85)', zIndex: 99999, pointerEvents: 'none' })
      const dot = document.createElement('div')
      dot.className = '__mk'
      dot.textContent = String(m.n ?? i + 1)
      const side = m.side || 'tl'
      const pos = side === 'l' ? { left: r.left - 42 + 'px', top: r.top + r.height / 2 - 14 + 'px' } : side === 'tr' ? { left: r.right - 10 + 'px', top: r.top - 16 + 'px' } : side === 'bl' ? { left: r.left - 16 + 'px', top: r.bottom - 12 + 'px' } : { left: r.left - 16 + 'px', top: r.top - 16 + 'px' }
      Object.assign(dot.style, { position: 'fixed', ...pos, width: '28px', height: '28px', borderRadius: '50%', background: '#ef2d56', color: '#fff', font: '800 15px/28px Sarabun, sans-serif',
        textAlign: 'center', boxShadow: '0 0 0 3px #fff', zIndex: 100000, pointerEvents: 'none' })
      document.body.append(box, dot)
    })
  }, marks)
}

module.exports = { launch, newPage, annotate, BASE }
