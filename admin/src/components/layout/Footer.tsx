// admin/src/components/layout/Footer.tsx
// Template เปล่า — รอค่าจริงจาก user (feedback 2026-09-23): version ที่จะโชว์,
// ปี พ.ศ. ลิขสิทธิ์ (คำนวณอัตโนมัติอยู่แล้ว ไม่ต้องแก้), โลโก้ partner (ถ้ามี),
// ชื่อบริษัทผู้พัฒนา — ทุกจุดที่เป็น placeholder ทำเครื่องหมาย TODO ไว้ให้หาง่าย
const APP_VERSION = 'v1.0.0' // TODO: ใส่เลขเวอร์ชันจริงที่จะโชว์ให้ user เห็น
const DEVELOPER_NAME = '' // TODO: ชื่อบริษัท/ทีมผู้พัฒนา เช่น "พัฒนาโดย ชื่อบริษัท จำกัด"
const PARTNER_LOGO_URL: string | null = null // TODO: URL โลโก้ partner (ถ้ามี) — null = ไม่แสดง

function buddhistYear(): number {
  return new Date().getFullYear() + 543
}

export default function Footer() {
  return (
    <footer style={{
      flexShrink: 0, marginTop: 24, paddingTop: 16, paddingBottom: 4,
      borderTop: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
      fontSize: '11.5px', color: 'var(--text-muted)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>© {buddhistYear()} TimeLine HR{DEVELOPER_NAME ? ` · ${DEVELOPER_NAME}` : ''}</span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span>{APP_VERSION}</span>
      </div>
      {PARTNER_LOGO_URL && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Partner</span>
          <img src={PARTNER_LOGO_URL} alt="Partner" style={{ height: 18, objectFit: 'contain' }} />
        </div>
      )}
    </footer>
  )
}
