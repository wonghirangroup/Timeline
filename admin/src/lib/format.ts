// admin/src/lib/format.ts
// Shared display-formatting helpers used across pages.

// แผนกใน DB มี 2 รูปแบบปนกัน: "01 ผู้บริหาร" (สร้างผ่าน dropdown ของ Admin UI —
// เลขติดมากับชื่อในสตริงเดียว) กับ "01" ล้วนๆ (ข้อมูลเก่า/migrate จาก Firebase ที่ไม่มี
// ชื่อแนบมาด้วยเลย) — ตัดเลขนำหน้าออกจากสตริงเดิมอย่างเดียวไม่พอ เพราะ "01" เฉยๆ ตัดแล้ว
// จะเหลือค่าว่าง ต้อง lookup ชื่อจากรหัสโดยตรงเป็นหลัก
const DEPT_CODE_MAP: Record<string, string> = {
  '01': 'ผู้บริหาร',
  '02': 'Office',
  '03': 'พนักงานขาย',
  '04': 'พนักงานขนส่ง',
}

export function deptName(dept?: string | null): string {
  if (!dept) return '—'
  const code = dept.trim().match(/^\d+/)?.[0]
  if (code && DEPT_CODE_MAP[code]) return DEPT_CODE_MAP[code]
  // รหัสไม่รู้จัก (แผนกใหม่ในอนาคต) — อย่างน้อยตัดเลขนำหน้าออกถ้ามีชื่อแนบมาด้วย
  return dept.replace(/^\d+\s*/, '') || dept
}

// วันที่แบบไทยเต็ม "26 กันยายน 2569" — ใช้เป็นมาตรฐานเดียวกันทุกจุดที่โชว์วันที่
// เจาะจง (ต่างจาก label ช่วงเดือนที่ไม่มีวันที่ ซึ่งใช้ fmtThaiMonth แทน)
// (feedback 2026-09-16 "แก้ Format วันที่ให้เป็น 26 กันยายน 2569 ทุกที่")
export function fmtThaiDate(date?: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ป้ายกำกับ "กันยายน 2569" — สำหรับ context ที่เลือกทั้งเดือน (ไม่มีวันที่เจาะจง)
export function fmtThaiMonth(date?: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
}
