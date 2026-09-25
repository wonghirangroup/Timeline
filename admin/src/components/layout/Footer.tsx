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
//
// รอบ 2 (feedback 2026-09-25 "ขอเป็นแทบสีขาว และโลโก้ใหญ่ๆกับ Text ใหญ่...
// เอาโลโก้และชื่อ Timeline ออก เอา Yoonai ใส่แทน"): เดิมโปร่งใส (เห็นสีเทา
// อ่อนของพื้นหลังหน้าทะลุ) เปลี่ยนเป็นแถบพื้นขาวชัดเจน + ขนาดโลโก้/ตัวอักษร
// ใหญ่ขึ้นทั้งหมด + ตัดคำว่า "TimeLine HR" (ชื่อ+โลโก้เดิม) ออกจากฝั่งซ้าย
// ใช้โลโก้ YooNai (มี wordmark ในตัวอยู่แล้ว) แทนที่ตรงนั้นเลย
//
// รอบ 3 (feedback 2026-09-25 "เอาออกด้วยทั้งระบบเลย เอา Yoonai มาแทน — ทำ
// เป็น Footer สิ ติดกับขอบจอร่างเลย แบบตัวอย่างที่ส่งให้"): ขยายสโคปคำว่า
// "TimeLine" → "YooNai" ไปทั้งระบบ (Sidebar/Topbar/login ทั้ง 3 แอป ไม่ใช่
// แค่ Footer แล้ว) + Footer ย้ายออกจาก <main> (ที่มี padding+maxWidth) ไป
// เป็น sibling หลัง <main> ใน Layout.tsx แทน ให้เป็นแถบเต็มความกว้างจริง
// ติดขอบจอ (ไม่ scroll ไปกับเนื้อหา เพราะอยู่นอก container ที่ overflow-y:
// auto) ตามภาพตัวอย่าง "SafeMind AI" ที่ user ส่งมา — เอา border-radius/
// border-all-sides/margin แบบการ์ดออก เหลือแค่ border-top บาง ๆ
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'

const APP_VERSION = 'v225'
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
      flexShrink: 0, padding: '16px 32px',
      background: '#FFFFFF', borderTop: '1px solid #e5e7eb',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 20, flexWrap: 'wrap',
      fontSize: '13px', color: 'var(--text-muted)',
    }}>
      {/* ซ้าย: โลโก้ YooNai (แทนชื่อ+โลโก้ TimeLine เดิม) + เวอร์ชัน + ลิขสิทธิ์ + โลโก้ tenant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <img src="/yoonai-logo.png" alt="YooNai" style={{ height: 40, objectFit: 'contain' }} />
        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{APP_VERSION}</span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span style={{ fontSize: '13.5px' }}>© {buddhistYear()} {data?.name ?? '…'}</span>
        <img src="/wonghirang-logo.png" alt="วงษ์หิรัญ" style={{ height: 34, objectFit: 'contain' }} />
      </div>

      {/* กลาง: Powered by Smart Jigsaw */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>POWERED BY</span>
        <img src={PARTNER_LOGO_URL} alt={PARTNER_NAME} style={{ height: 32, objectFit: 'contain' }} />
      </div>

      {/* ขวา: ลิงก์นโยบาย/ติดต่อ — TODO: ยังไม่มีหน้าจริงรองรับ ใส่เมื่อมีเนื้อหาแล้ว */}
    </footer>
  )
}
