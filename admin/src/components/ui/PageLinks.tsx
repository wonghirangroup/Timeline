// admin/src/components/ui/PageLinks.tsx
// ปุ่มลัดไปหน้าที่เกี่ยวข้องกัน (เช่น เช็คอิน ⇄ รายงานการเช็คอิน ⇄ การลา และ วันหยุด) — ซ่อนอัตโนมัติถ้าผู้ใช้ไม่มีสิทธิ์ "ดู"
// หน้านั้น หรือบริษัทปิดฟีเจอร์นั้นอยู่ (เงื่อนไขเดียวกับเมนูใน Sidebar)
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export interface PageLink {
  to: string
  label: string
  icon?: ReactNode
  /** key ของระบบสิทธิ์ละเอียด (เดียวกับ permKey ใน Sidebar) */
  permKey?: string
  /** ฟีเจอร์ของแพ็กเกจที่ต้องเปิดอยู่ */
  feature?: string
}

export default function PageLinks({ links, className, style }: { links: PageLink[]; className?: string; style?: CSSProperties }) {
  const permissions = useAuthStore(s => s.permissions)
  const enabledFeatures = useAuthStore(s => s.enabledFeatures) as Record<string, boolean> | null | undefined
  const shown = links.filter(l => {
    if (l.feature && enabledFeatures && enabledFeatures[l.feature] === false) return false
    if (l.permKey && permissions && permissions[l.permKey]?.view === false) return false
    return true
  })
  if (shown.length === 0) return null
  return (
    <div className={className} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {shown.map(l => (
        <Link
          key={l.to}
          to={l.to}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, textDecoration: 'none',
            background: 'linear-gradient(135deg, #131C45 0%, #244B83 100%)', color: '#fff',
            fontSize: '0.8rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0, boxShadow: '0 2px 8px rgba(19,28,69,0.2)', whiteSpace: 'nowrap',
          }}
        >
          {l.icon}{l.label}
        </Link>
      ))}
    </div>
  )
}
