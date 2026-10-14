// ถ่ายภาพหน้าจอระบบ (ข้อมูลจำลอง ไม่มีข้อมูลจริง) สำหรับเว็บไซต์ YooNai — ไม่มีวงเลข/กรอบแดง ออกที่ ../yoonai-website/public/shots/ (โปรเจกต์เว็บไซต์แยกต่างหาก)
// ใช้: node capture_website.js   (ต้องรัน admin ที่ :5199 เหมือน capture.js)
const fs = require('fs')
const path = require('path')
const { launch, newPage, BASE } = require('./harness')
const OUT = process.env.WEBSITE_SHOTS_OUT || 'C:/Users/User/Downloads/yoonai-website/public/shots/'
fs.mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const SHOTS = [
  { id: 'dashboard', path: 'dashboard' },
  { id: 'calendar', path: 'leave?tab=calendar' },
  { id: 'checkin', path: 'shift' },
  { id: 'report', path: 'report/executive' },
  { id: 'leave', path: 'leave' },
]
;(async () => {
  const b = await launch()
  for (const s of SHOTS) {
    const page = await newPage(b, { authed: true, w: 1440, h: 900 })
    page.on('pageerror', e => console.log('PAGEERROR', s.id, e.message.slice(0, 120)))
    await page.goto(BASE + '/' + s.path, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('goto', e.message))
    await sleep(1800)
    // ซ่อนแถบด้านบน/ชื่อผู้ใช้ตัวอย่างไม่ต้อง — ถ่ายเต็มหน้าจอให้เห็น Sidebar โทนสว่าง + มาสคอต
    await page.screenshot({ path: OUT + s.id + '.webp', type: 'webp', quality: 88 })
    console.log('ok', s.id)
    await page.close()
  }
  await b.close()
})()
