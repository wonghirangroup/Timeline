// admin/src/components/shared/ReportExportBar.tsx
// ปุ่ม Export CSV + พิมพ์/บันทึกเป็น PDF ใช้ร่วมกันทุกหน้ารายงาน (feedback
// 2026-09-28 "หน้ารายงานต้อง Export PDF/CSV ได้ด้วย") — PDF ใช้ปุ่มพิมพ์ของ
// เบราว์เซอร์แทน generate ไฟล์ตรงๆ (เหมือน hr-documents/print.tsx) กัน Thai
// font เพี้ยน ดู @media print ใน index.css (ซ่อน Sidebar/Topbar/Footer/.no-print
// อัตโนมัติตอนกดพิมพ์)
import type { CSSProperties } from 'react'
import { Download, Printer } from 'lucide-react'

export default function ReportExportBar({ onExportCsv, disabled, mobile }: { onExportCsv: () => void; disabled?: boolean; mobile?: boolean }) {
  const btnStyle: CSSProperties = {
    padding: mobile ? '5px 12px' : '6px 14px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontWeight: 600,
    fontSize: mobile ? '0.75rem' : '0.78rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: 'inherit',
  }
  const iconSize = mobile ? 12 : 13

  return (
    <div className="no-print" style={{ display: 'flex', gap: 6, marginLeft: mobile ? 0 : 'auto' }}>
      <button onClick={onExportCsv} disabled={disabled} style={btnStyle}>
        <Download size={iconSize} /> {mobile ? 'CSV' : 'Export CSV'}
      </button>
      <button onClick={() => window.print()} disabled={disabled} style={btnStyle}>
        <Printer size={iconSize} /> {mobile ? 'PDF' : 'พิมพ์ / PDF'}
      </button>
    </div>
  )
}
