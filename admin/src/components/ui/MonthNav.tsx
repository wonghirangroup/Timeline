// admin/src/components/ui/MonthNav.tsx
// แถบเลือกเดือนกลาง (◀ ชื่อเดือน ▶) — แถบสีน้ำเงินกรมท่าไล่สีเดียวกับ TabBar/Pagination เป็นจุดดึงสายตาของหน้า
// ใช้ได้ทั้งแบบกดเดือนก่อน/ถัดไปอย่างเดียว และแบบกดที่ชื่อเดือนเพื่อเปิดตัวเลือกเดือน/ปี (onLabelClick + children = กล่อง popup ที่ตำแหน่งสัมพันธ์กับแถบ)
import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'

interface MonthNavProps {
  label: string
  onPrev: () => void
  onNext: () => void
  /** ใส่เมื่อกดที่ชื่อเดือนแล้วจะเปิดตัวเลือกเดือน/ปี (ตัว popup ส่งมาเป็น children) */
  onLabelClick?: () => void
  /** กล่อง popup ตัวเลือกเดือน/ปี — วางเป็น position:absolute ได้ เทียบกับแถบนี้ */
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

const arrowBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.16)', border: 'none', borderRadius: 10, width: 34, height: 34, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

export default function MonthNav({ label, onPrev, onNext, onLabelClick, children, className, style }: MonthNavProps) {
  const isMobile = useIsMobile()
  const labelStyle: CSSProperties = {
    fontSize: isMobile ? '0.9rem' : '1.05rem', fontWeight: 800, color: '#fff', minWidth: isMobile ? 120 : 170,
    textAlign: 'center', letterSpacing: '0.2px', fontFamily: 'inherit',
  }
  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 5, borderRadius: 14, background: 'linear-gradient(135deg, #131C45 0%, #244B83 100%)', boxShadow: '0 4px 14px rgba(19,28,69,0.25)' }}>
        <button onClick={onPrev} aria-label="เดือนก่อนหน้า" style={arrowBtn}><ChevronLeft size={18} color="#fff" /></button>
        {onLabelClick ? (
          <button onClick={onLabelClick} title="เลือกเดือน/ปี"
            style={{ ...labelStyle, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, padding: '4px 6px' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
            {label}
          </button>
        ) : (
          <span style={labelStyle}>{label}</span>
        )}
        <button onClick={onNext} aria-label="เดือนถัดไป" style={arrowBtn}><ChevronRight size={18} color="#fff" /></button>
      </div>
      {children}
    </div>
  )
}
