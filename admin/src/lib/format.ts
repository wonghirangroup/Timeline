// admin/src/lib/format.ts
// Shared display-formatting helpers used across pages.

// แผนกเก็บใน DB เป็น "01 ผู้บริหาร" / "02 Office" ฯลฯ (เลขนำหน้าติดมากับค่าจริง
// เพื่อคง sort order + option value เดิม) — ตอนแสดงผลให้ผู้ใช้ดู ตัดเลขนำหน้าออก
// เหลือแค่ชื่อแผนกเฉยๆ เช่น "ผู้บริหาร"
export function deptName(dept?: string | null): string {
  if (!dept) return '—'
  return dept.replace(/^\d+\s*/, '') || dept
}
