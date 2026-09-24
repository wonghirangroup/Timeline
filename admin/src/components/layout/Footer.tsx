// admin/src/components/layout/Footer.tsx
// Layout อ้างอิงจากภาพตัวอย่างที่ user ส่งมา (feedback 2026-09-24): ซ้าย =
// ชื่อระบบ+เวอร์ชัน+ลิขสิทธิ์, กลาง = "POWERED BY" + โลโก้พาร์ตเนอร์, ขวา =
// ลิงก์นโยบาย/ติดต่อ — ยังไม่มีโลโก้พาร์ตเนอร์จริง ใช้ไอคอนแทนไปก่อนตามที่สั่ง
// ("เอาไอคอนมาวางไว้แทนรูปก่อน") ส่วนลิงก์นโยบาย/เงื่อนไข/ติดต่อ ยังไม่มีหน้า
// จริงรองรับเลย (ไม่มี route ไหนในระบบตอนนี้) เลย "ยังไม่ใส่" แทนที่จะลิงก์ไป
// หน้าที่ไม่มีอยู่จริง — ชื่อบริษัท (ลิขสิทธิ์) ใช้ Tenant.name จริงจาก API
// (ไม่ใช่ข้อมูลปลอม) ส่วน version ยังเป็นค่า placeholder รอเลขจริงจาก user
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { api } from '../../lib/axios'

const APP_VERSION = 'v1.0.0' // TODO: ใส่เลขเวอร์ชันจริงที่จะโชว์ให้ user เห็น
// TODO: โลโก้พาร์ตเนอร์จริง (URL รูป) — ตอนนี้ใช้ไอคอนแทนตามที่ user สั่งไว้ก่อน
const PARTNER_LOGO_URL: string | null = null
const PARTNER_NAME = 'TimeLine' // TODO: ชื่อพาร์ตเนอร์/ผู้พัฒนาจริง (ถ้ามีมากกว่า TimeLine เอง)

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
      {/* ซ้าย: ชื่อระบบ + เวอร์ชัน + ลิขสิทธิ์ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#374151' }}>TimeLine HR <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{APP_VERSION}</span></span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span>© {buddhistYear()} {data?.name ?? '…'}</span>
      </div>

      {/* กลาง: Powered by — ไอคอนแทนโลโก้จริงไปก่อน */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>POWERED BY</span>
        {PARTNER_LOGO_URL ? (
          <img src={PARTNER_LOGO_URL} alt={PARTNER_NAME} style={{ height: 18, objectFit: 'contain' }} />
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#475569' }}>
            <span style={{
              width: 20, height: 20, borderRadius: 6, background: '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0,
            }}>
              <ShieldCheck size={13} />
            </span>
            {PARTNER_NAME}
          </span>
        )}
      </div>

      {/* ขวา: ลิงก์นโยบาย/ติดต่อ — TODO: ยังไม่มีหน้าจริงรองรับ ใส่เมื่อมีเนื้อหาแล้ว */}
    </footer>
  )
}
