// harness จับภาพแอปพนักงาน (LIFF) ด้วยข้อมูลสมมติ — ใช้กับ dev server พอร์ต 5201
const puppeteer = require('puppeteer-core')
const API = 'http://localhost:3999'
const today = new Date(); const iso = d => d.toISOString().slice(0, 10)
const EMP = { id: 'e1', first_name: 'สมหญิง', last_name: 'ใจดี', employee_code: 'EMP-0012', branch: { id: 'b1', name: 'สาขาสยาม', latitude: 13.7455, longitude: 100.5342 }, weekly_off_mode: 'FIXED', employee_status_type: 'ACTIVE', nickname: 'หญิง', position: { name: 'พนักงานขาย' } }
const ROUTES = require('./emp_fixtures')(EMP, iso, today)
module.exports = async function run(shots) {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const miss = new Set()
  await p.setRequestInterception(true)
  p.on('request', req => {
    const u = new URL(req.url())
    if (u.origin !== API) return req.continue()
    const h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: h })
    const key = req.method() + ' ' + u.pathname
    let data = ROUTES(key, u)
    if (data === undefined) { miss.add(key); data = [] }
    req.respond({ status: 200, contentType: 'application/json', headers: h, body: JSON.stringify({ success: true, data }) })
  })
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 160)))
  await p.evaluateOnNewDocument(() => { localStorage.setItem('dev_employee_id', 'e1') })
  for (const s of shots) {
    await p.goto('http://localhost:5201' + s.path, { waitUntil: 'networkidle2' }).catch(() => {})
    await new Promise(r => setTimeout(r, 1500))
    if (s.act) await s.act(p)
    await p.screenshot({ path: s.out })
    console.log('shot', s.out)
  }
  console.log('UNMATCHED:\n' + [...miss].join('\n'))
  await b.close()
}
