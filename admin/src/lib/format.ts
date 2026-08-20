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
