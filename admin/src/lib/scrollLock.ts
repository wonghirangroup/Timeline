// ล็อกการเลื่อนหน้า (body) ตอนเปิด modal/bottom sheet แบบนับจำนวนชั้น
// เดิมแต่ละ overlay จำค่า body.overflow "ก่อนเปิด" ไว้แล้วคืนค่านั้นตอนปิด — พอมี 2 ชั้นซ้อนกัน (เช่น ยืนยันเช็คอิน → ผลเช็คอิน)
// ชั้นที่สองจะจำค่า 'hidden' ที่ชั้นแรกตั้งไว้ แล้วปิดทีหลังชั้นแรก ก็คืนเป็น 'hidden' ค้างตลอด → หน้าเลื่อนไม่ได้จนต้องเปิดแอปใหม่
// ใช้ lockScroll() แล้วเรียกฟังก์ชันที่ได้คืนตอนปิด — คืนค่าจริงเมื่อไม่มีชั้นไหนเหลือเท่านั้น
let count = 0
let saved = ''

export function lockScroll(): () => void {
  if (count === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  count++
  let released = false
  return () => {
    if (released) return
    released = true
    count = Math.max(0, count - 1)
    if (count === 0) document.body.style.overflow = saved
  }
}
