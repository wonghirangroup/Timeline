// admin/src/components/ui/TabBar.tsx
// แถบแท็บเมนูกลางของทุกหน้า — แบนเนอร์สีน้ำเงิน (โทนเดียวกับ sidebar) แท็บที่เลือกอยู่จะเป็นแผ่นสีขาว
// ตัวอักษร/ไอคอนเปลี่ยนเป็นสีของแท็บนั้น (ใส่ color ต่อแท็บได้ ไม่ใส่ = น้ำเงินหลัก) แท็บที่ไม่ได้เลือกเป็นตัวอักษรขาวจางบนพื้นน้ำเงิน
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CSSProperties, ReactNode } from 'react'

export interface TabItem<K extends string> {
  key: K
  label: ReactNode
  /** ป้ายสั้นสำหรับจอมือถือ (ไม่ใส่ = ใช้ label) */
  mobileLabel?: ReactNode
  icon?: ReactNode
  /** เลขแจ้งเตือนบนแท็บ (0/undefined = ไม่แสดง) */
  badge?: number
  /** สีตัวอักษร/ไอคอนตอนเลือกแท็บนี้ */
  color?: string
}

interface Props<K extends string> {
  tabs: TabItem<K>[]
  value: K
  onChange: (key: K) => void
  /** ของที่วางชิดขวาของแบนเนอร์ เช่น ปุ่ม ⓘ */
  trailing?: ReactNode
  style?: CSSProperties
  className?: string
}

export const TAB_BLUE = '#244B83'

export default function TabBar<K extends string>({ tabs, value, onChange, trailing, style, className }: Props<K>) {
  const isMobile = useIsMobile()
  return (
    <div
      className={className}
      role="tablist"
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: 5, borderRadius: 14,
        background: 'linear-gradient(135deg, #131C45 0%, #244B83 100%)',
        boxShadow: '0 4px 14px rgba(19,28,69,0.22)',
        overflowX: 'auto', marginBottom: 20,
        ...style,
      }}
    >
      {tabs.map(t => {
        const active = t.key === value
        const accent = t.color ?? TAB_BLUE
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, flexShrink: 0, whiteSpace: 'nowrap',
              padding: isMobile ? '8px 12px' : '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: isMobile ? '0.78rem' : '0.875rem', fontWeight: active ? 700 : 600,
              background: active ? '#fff' : 'transparent',
              color: active ? accent : 'rgba(255,255,255,0.78)',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.78)' } }}
          >
            {t.icon && <span style={{ display: 'flex' }}>{t.icon}</span>}
            {isMobile && t.mobileLabel ? t.mobileLabel : t.label}
            {!!t.badge && (
              <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#ef4444', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        )
      })}
      {trailing && <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 8px', color: '#fff' }}>{trailing}</span>}
    </div>
  )
}
