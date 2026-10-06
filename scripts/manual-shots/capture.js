const fs = require('fs')
const { launch, newPage, annotate, BASE } = require('./harness')
const path = require('path')
const OUT = path.join(__dirname, '../../admin/public/manual/') + ''
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

const SHOTS = require('./shots_def')
;(async () => {
  const only = process.argv.slice(2)
  const b = await launch()
  for (const s of SHOTS) {
    if (only.length && !only.includes(s.id)) continue
    const page = await newPage(b, { authed: s.path !== 'login', w: s.w || 1440, h: s.h || 900 })
    page.on('pageerror', e => console.log('PAGEERROR', s.id, e.message.slice(0, 140)))
    await page.goto(BASE + '/' + s.path, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto', e.message))
    await sleep(1200)
    if (s.setup) await s.setup(page, { clickText, sleep })
    await sleep(500)
    if (s.marks) await annotate(page, s.marks)
    await sleep(200)
    const opt = { path: OUT + s.id + '.webp', type: 'webp', quality: 86 }
    if (s.clip) opt.clip = s.clip
    await page.screenshot(opt)
    console.log('ok', s.id, s.clip ? '(clip)' : '', page.unmatched.size ? 'unmatched: ' + [...page.unmatched].join(' | ') : '')
    await page.close()
  }
  await b.close()
})()
