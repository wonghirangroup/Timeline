// admin/src/components/ui/InfoTooltip.tsx
// ปุ่ม "i" อธิบายความหมาย/วิธีใช้งาน — ใช้ได้ 2 ระดับ: ระดับหน้า/แท็บ (ใส่ title
// + content ยาวเป็น bullet ได้) และระดับปุ่ม/ช่องเดี่ยวๆ (content สั้นบรรทัดเดียว
// ไม่ต้องใส่ title) (feedback 2026-10-01: "เพิ่มเครื่องหมาย i ในแต่ละหน้าแต่ละ
// tab แต่ละเมนู ... ให้รู้ความหมายของปุ่มและวิธีการใช้งาน")
import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Z } from './z'

interface InfoTooltipProps {
  content: ReactNode
  title?: string
  size?: 'sm' | 'md'
  placement?: 'bottom-start' | 'bottom-end'
  width?: number
}

export default function InfoTooltip({ content, title, size = 'sm', placement = 'bottom-start', width = 260 }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const iconSize = size === 'md' ? 14 : 11
  const btnSize  = size === 'md' ? 20 : 16

  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={title ? `ช่วยเหลือ: ${title}` : 'ช่วยเหลือ'}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: btnSize, height: btnSize, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${open ? '#244B83' : '#cbd5e1'}`,
          background: open ? '#244B83' : '#fff',
          color: open ? '#fff' : '#94a3b8',
          cursor: 'pointer', padding: 0, lineHeight: 0,
        }}
      >
        <Info size={iconSize} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: Z.tooltip - 1 }} />
          <div
            role="tooltip"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)',
              ...(placement === 'bottom-end' ? { right: 0 } : { left: 0 }),
              zIndex: Z.tooltip,
              background: '#1f2937', color: '#f9fafb',
              borderRadius: 10, padding: '11px 14px',
              boxShadow: '0 14px 34px rgba(15,23,42,0.28)',
              width, maxWidth: '82vw',
              fontSize: '0.78rem', lineHeight: 1.6,
              fontWeight: 400, textTransform: 'none', letterSpacing: 'normal',
            }}
          >
            {title && <div style={{ fontWeight: 700, marginBottom: 5, color: '#fff', fontSize: '0.82rem' }}>{title}</div>}
            <div style={{ color: '#e5e7eb' }}>{content}</div>
          </div>
        </>
      )}
    </span>
  )
}
