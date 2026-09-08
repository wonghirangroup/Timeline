// admin/src/components/ui/z.ts
// z-index scale — ลำดับชั้น semantic ตัวเดียวทั้งแอป (เลิกใส่เลขมั่วอย่าง 999/9999)
// อ้างอิง DESIGN.md: sidebar 100 / topbar 98 (กำหนดใน layout เอง)
export const Z = {
  base:          1,
  dropdown:      300,
  sticky:        500,
  modalBackdrop: 1000,
  modal:         1000,
  toast:         1100,
  tooltip:       1200,
} as const
