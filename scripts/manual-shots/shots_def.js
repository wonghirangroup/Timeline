// รายการภาพคู่มือ: id = ชื่อไฟล์ใน admin/public/manual/<id>.webp · marks = วงเลขทับตำแหน่งจริงของ element
const hideDemo = page => page.evaluate(() => {
  // กล่อง "บัญชีสำหรับ Demo (DEV only)" มี username จริง — ลบทิ้งก่อนถ่าย (ลบเฉพาะบล็อกที่ไม่มี input)
  const label = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.includes('DEV only'))[0]
  let el = label
  while (el && el.parentElement && !el.parentElement.querySelector('input')) el = el.parentElement
  if (el) el.remove()
})

module.exports = [
  // ── เริ่มต้นใช้งาน ──
  { id: 'login', path: 'login', w: 1440, h: 900, clip: { x: 790, y: 200, width: 540, height: 470 },
    setup: async (page, { sleep }) => {
      await page.type('input[placeholder="username"]', 'demo.admin')
      await hideDemo(page)
      await page.type('input[type=password]', 'password123')
      await page.evaluate(() => { const i = document.querySelector('input[type=password]'); i.blur() })
    },
    marks: [
      { selector: 'input[placeholder="username"]', n: 1, side: 'l' },
      { selector: 'input[type=password]', n: 2, side: 'l' },
      { text: 'จดจำฉันไว้', tag: 'label, span', n: 3, side: 'l' },
      { text: 'ลืมรหัสผ่าน', tag: 'button, a', n: 4, side: 'tr' },
      { selector: 'button[type=submit]', n: 5, side: 'l' },
    ] },
  { id: 'dashboard', path: 'dashboard',
    marks: [
      { text: 'วันนี้', tag: 'button', n: 1 },
      { text: 'มาสาย (คน)', tag: 'div, button, span', n: 2, nth: 0, card: true },
      { text: 'ใบลา รออนุมัติ', tag: 'button, div', n: 3, card: true },
      { text: 'เข้างานปกติ', tag: 'button', n: 4, card: true },
      { text: 'รายชื่อวันนี้', tag: 'span', n: 5, pad: 8, side: 'tr' },
    ] },
  { id: 'navigation', path: 'dashboard',
    marks: [
      { text: 'ภาพรวม', tag: 'a, button', within: 'aside, nav', n: 1 },
      { text: 'พนักงาน', tag: 'a, button', within: 'aside, nav', n: 2, nth: 0 },
      { text: 'ผู้ดูแลระบบ (ตัวอย่าง)', tag: 'span', n: 3, side: 'l' },
      { text: 'ออกจากระบบ', tag: 'a, button, span', n: 4 },
    ] },

  // ── พนักงาน และ สาขา ──
  { id: 'employee-list', path: 'employee',
    marks: [
      { text: 'เพิ่มพนักงาน', tag: 'button', n: 1 },
      { selector: 'select', nth: 0, n: 2 },
      { selector: 'input[placeholder*="ค้นหา"]', n: 3 },
      { text: 'Export CSV', tag: 'button', n: 4 },
      { text: 'ผูกแล้ว', tag: 'span', n: 5, nth: 0 },
      { selector: 'button:has(svg.lucide-pencil)', n: 6 },
    ] },
  { id: 'branch-list', path: 'branch',
    marks: [
      { text: 'เพิ่มสาขา', tag: 'button', n: 1 },
      { text: 'สาขาสุขุมวิท', tag: 'div, span, h3, h4', n: 2, card: true, pad: 2, side: 'l' },
      { text: 'เพิ่มกะ', tag: 'button', n: 3, nth: 0 },
      { text: 'QR', tag: 'button', n: 4, nth: 0 },
      { text: 'แก้ไข', tag: 'button', n: 5, nth: 0 },
      { text: 'ลบ', tag: 'button', n: 6, nth: 0 },
    ] },

  // ── การลา และ วันหยุด ──
  { id: 'leave-requests', path: 'leave',
    marks: [
      { text: 'รอพิจารณา', tag: 'button', n: 1, nth: 0 },
      { text: 'สร้างวันลา', tag: 'button', n: 2 },
      { text: 'ประเภทการลา', tag: 'button', n: 3 },
      { selector: 'input[placeholder*="ค้นหา"]', n: 4 },
      { text: 'LV-2569-0102', tag: 'td, span', n: 5 },
    ] },
  { id: 'attendance-today', path: 'shift',
    marks: [
      { text: 'ยังไม่เช็ค', exact: true, tag: 'div', n: 1, card: true },
      { selector: 'input[type=date]', n: 2, side: 'l' },
      { selector: 'input[placeholder*="ค้นหาชื่อ"]', n: 3, side: 'l' },
      { text: 'รายงานการเช็คอิน', tag: 'a, button', n: 4 },
      { selector: 'button:has(svg.lucide-pencil)', n: 5, nth: 0 },
    ] },

  // ── modals / แท็บ ──
  { id: 'employee-add', path: 'employee',
    setup: async (p, { clickText, sleep }) => { await clickText(p, 'เพิ่มพนักงาน', 'button'); await sleep(900)
      await p.type('input[placeholder="ชื่อจริง"]', 'วิภา'); await p.type('input[placeholder="นามสกุล"]', 'ตัวอย่างดี'); await p.type('input[placeholder*="บาส"]', 'วิ'); await p.type('input[placeholder="08XXXXXXXX"]', '0812345678') },
    marks: [
      { text: 'ข้อมูลส่วนตัว', tag: 'div, span', n: 1, pad: 14, nth: 0, side: 'l' },
      { selector: 'input[placeholder="ชื่อจริง"]', n: 2 },
      { selector: 'input[placeholder="นามสกุล"]', n: 3, side: 'tr' },
      { selector: 'input[placeholder*="บาส"]', n: 4, side: 'l' },
      { selector: 'input[placeholder="08XXXXXXXX"]', n: 5 },
      { text: 'ข้อมูลเพิ่มเติม', tag: 'button', n: 6, side: 'l' },
      { text: 'ถัดไป', tag: 'button', n: 7 },
    ] },
  { id: 'branch-add', path: 'branch',
    setup: async (p, { clickText, sleep }) => { await clickText(p, 'เพิ่มสาขา', 'button'); await sleep(900)
      await p.type('input[placeholder*="สำนักงานใหญ่"]', 'สาขาลาดพร้าว'); await p.type('input[placeholder*="BR001"]', 'LPR'); await p.type('textarea', '99 ถนนลาดพร้าว กรุงเทพฯ'); await sleep(300) },
    marks: [
      { text: 'ข้อมูลสาขา', tag: 'div, span', n: 1, nth: 0, pad: 12, side: 'l' },
      { selector: 'input[placeholder*="สำนักงานใหญ่"]', n: 2, side: 'l' },
      { selector: 'input[placeholder*="BR001"]', n: 3, side: 'l' },
      { selector: 'textarea', n: 4, side: 'l' },
      { text: 'ใช้ค่าจากกลุ่ม', tag: 'button', n: 5, nth: 0, side: 'l' },
      { text: 'ถัดไป', tag: 'button', n: 6 },
    ] },
  { id: 'leave-create', path: 'leave',
    setup: async (p, { clickText, sleep }) => { await clickText(p, 'สร้างวันลา', 'button'); await sleep(900)
      await clickText(p, 'เลือกพนักงาน —', 'div, button, span'); await sleep(600); await clickText(p, 'วิภา สุขใจ', 'div, li, button, span'); await sleep(700)
      await p.evaluate(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
        const d = [...document.querySelectorAll('input[type=date]')]; const t = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10); d.forEach(x => set(x, t)) })
      await p.type('input[placeholder*="เหตุผล"]', 'ไปพบแพทย์'); await sleep(400) },
    marks: [
      { text: 'วิภา สุขใจ', tag: 'div, span', n: 1, side: 'l', pad: 8 },
      { text: 'ลาป่วย', tag: 'button', n: 2, nth: 0, side: 'l' },
      { text: 'เต็มวัน', tag: 'button', n: 3, side: 'l' },
      { selector: 'input[type=date]', n: 4, nth: 0, side: 'l' },
      { selector: 'input[type=date]', n: 5, nth: 1 },
      { selector: 'input[placeholder*="เหตุผล"]', n: 6, side: 'l' },
      { text: 'บันทึก', tag: 'button', n: 7 },
    ] },
  { id: 'weekly-off-open', path: 'leave', setup: async (p, { clickText, sleep }) => { await clickText(p, 'จองวันหยุดประจำเดือน', 'button, a, div'); await sleep(1200) },
    marks: [
      { text: 'ตุลาคม 2569', exact: true, tag: 'span, div, button', n: 1, nth: 0, side: 'l' },
      { text: 'เปิด/ปิดการจอง', tag: 'button', n: 2 },
      { text: 'เปิดรับจอง', exact: true, tag: 'span, div', n: 3, nth: 0, up: 1, side: 'l' },
      { text: 'ดูรายการจอง (5)', tag: 'button', n: 4 },
      { text: 'รายการคำขอ', tag: 'button', n: 5 },
    ] },
  { id: 'weekly-off-requests', path: 'leave', setup: async (p, { clickText, sleep }) => { await clickText(p, 'จองวันหยุดประจำเดือน', 'button, a, div'); await sleep(900); await clickText(p, 'รายการคำขอ', 'button'); await sleep(1200) },
    marks: [
      { text: 'ตุลาคม 2569', exact: true, tag: 'span, div', n: 1, nth: 0, side: 'l' },
      { text: 'รายการคำขอ', tag: 'button', n: 2 },
      { text: 'อนุมัติทั้งหมด (3)', tag: 'button', n: 3 },
      { text: 'เพิ่มวันหยุด', tag: 'button', n: 4 },
      { text: 'รอพิจารณา', tag: 'button', n: 5, nth: 0 },
      { selector: 'input[placeholder*="ค้นหาชื่อ"]', n: 6 },
      { text: 'ให้จองใหม่ทั้งเดือน', tag: 'button', n: 7, nth: 0 },
    ] },
  { id: 'team-calendar', path: 'leave', setup: async (p, { clickText, sleep }) => { await clickText(p, 'ปฏิทินรวม', 'button, a, div'); await sleep(1500) },
    marks: [
      { text: 'วันหยุดพิเศษ', tag: 'div', n: 1, card: true },
      { selector: 'select', n: 2, nth: 0 },
      { text: 'ลงวันหยุดรายคน', tag: 'button', n: 3 },
      { text: 'ลงวันหยุดหลายคน', tag: 'button', n: 4 },
      { text: 'Excel', tag: 'button', n: 5 },
      { text: 'ตุลาคม 2569', exact: true, tag: 'span, div', n: 6, nth: 0, side: 'l' },
    ] },
  { id: 'attendance-manual', path: 'shift',
    setup: async (p, { clickText, sleep }) => { await clickText(p, '+ ลงบันทึก', 'button'); await sleep(1000)
      await clickText(p, 'กะเช้า', 'button'); await sleep(300)
      await p.evaluate(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
        const t = [...document.querySelectorAll('input[type=time]')]; if (t[0]) set(t[0], '09:05') })
      await p.type('textarea', 'ลืมเช็คอิน เครื่องสแกนเสีย'); await sleep(400) },
    marks: [
      { text: 'มาทำงาน', tag: 'button', n: 1 },
      { text: 'กะเช้า', tag: 'button', n: 2 },
      { selector: 'input[type=time]', n: 3, nth: 0, side: 'l' },
      { selector: 'select', n: 4, pick: 'last', side: 'tr' },
      { selector: 'textarea', n: 5, side: 'l' },
      { text: 'ลงเวลา', tag: 'button', n: 6, pick: 'last' },
    ] },
]
