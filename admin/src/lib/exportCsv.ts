// admin/src/lib/exportCsv.ts
// ดาวน์โหลด rows เป็นไฟล์ .csv — ใช้ร่วมกันทุกหน้ารายงาน (เดิม define ซ้ำใน
// report/index.tsx จุดเดียว, ดึงมาเป็น shared util ตอนขยาย Export ไปหน้ารายงาน
// ย่อยอื่นๆ) BOM (﻿) นำหน้ากัน Excel อ่านภาษาไทยเพี้ยนเป็นตัวการันต์
export function downloadCsv(rows: string[][], filename: string) {
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
}
