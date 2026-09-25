// admin/src/components/layout/Footer.tsx
// Layout อ้างอิงจากภาพตัวอย่างที่ user ส่งมา (feedback 2026-09-24): ซ้าย =
// ชื่อระบบ+เวอร์ชัน+ลิขสิทธิ์, กลาง = "POWERED BY" + โลโก้พาร์ตเนอร์, ขวา =
// ลิงก์นโยบาย/ติดต่อ — ลิงก์นโยบาย/เงื่อนไข/ติดต่อ ยังไม่มีหน้าจริงรองรับเลย
// (ไม่มี route ไหนในระบบตอนนี้) เลย "ยังไม่ใส่" แทนที่จะลิงก์ไปหน้าที่ไม่มีอยู่
// จริง — ชื่อบริษัท (ลิขสิทธิ์) ใช้ Tenant.name จริงจาก API (ไม่ใช่ข้อมูลปลอม)
//
// โลโก้จริง 3 อัน (feedback 2026-09-25): "Powered by" = Smart Jigsaw (ผู้
// พัฒนา/hosting) อยู่กลาง — วงษ์หิรัญ (โลโก้ tenant จริง) + YooNai (มาสคอต
// ของระบบ) อยู่ฝั่งซ้ายต่อท้ายชื่อระบบ/ลิขสิทธิ์
// เลขเวอร์ชัน (feedback 2026-09-25 "อิงจาก v ใน Logview") = v ล่าสุดใน
// brain/_LOG_VIEW.txt ตอนที่แก้ไฟล์นี้ครั้งล่าสุด — อัปเดตเลขนี้เองด้วยมือทุก
// ครั้งที่ touch ไฟล์นี้ ไม่ได้ sync อัตโนมัติจาก log
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'

const APP_VERSION = 'v223'
const PARTNER_LOGO_URL = '/smartjigsaw-logo.jpg'
const PARTNER_NAME = 'Smart Jigsaw'

function buddhistYear(): number {
  return new Date().getFullYear() + 543
}

interface TenantSettings { name: string }

export default function Footer() {
  const { data } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data),
    staleTime: 5 * 60_000,
  })

  return (
    <footer style={{
      flexShrink: 0, marginTop: 24, paddingTop: 16, paddingBottom: 4,
      borderTop: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
      fontSize: '11.5px', color: 'var(--text-muted)',
    }}>
      {/* ซ้าย: ชื่อระบบ + เวอร์ชัน + ลิขสิทธิ์ + โลโก้ tenant/มาสคอต */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#374151' }}>TimeLine HR <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{APP_VERSION}</span></span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span>© {buddhistYear()} {data?.name ?? '…'}</span>
        <img src="/wonghirang-logo.png" alt="วงษ์หิรัญ" style={{ height: 20, objectFit: 'contain' }} />
        <img src="/yoonai-logo.png" alt="YooNai" style={{ height: 18, objectFit: 'contain' }} />
      </div>

      {/* กลาง: Powered by Smart Jigsaw */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>POWERED BY</span>
        <img src={PARTNER_LOGO_URL} alt={PARTNER_NAME} style={{ height: 18, objectFit: 'contain' }} />
      </div>

      {/* ขวา: ลิงก์นโยบาย/ติดต่อ — TODO: ยังไม่มีหน้าจริงรองรับ ใส่เมื่อมีเนื้อหาแล้ว */}
    </footer>
  )
}
