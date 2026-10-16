// admin/src/components/ui/InfoTooltip.tsx
// ปุ่ม "i" อธิบายความหมายของปุ่ม/ฟีเจอร์เดี่ยวๆ — โชว์ตอนเอาเมาส์ไปชี้ค้างไว้
// (hover) เหมือน tooltip ทั่วไป ไม่ต้องคลิก (feedback 2026-10-01: "เอาเป็นแบบ
// เมาส์ไป Hover ที่ปุ่มค้างไว้ก็ได้") — ใช้กับเนื้อหาอธิบาย "ความหมาย" (อ้างอิง)
// เท่านั้น ถ้าเป็นขั้นตอนทำงานหลายสเต็ป ให้ใช้ GuidedTour แทน (เหมือนปุ่ม "วิธีใช้"
// เดิมที่มีอยู่แล้วในหน้าสาขา/กะ) ไม่ใช่ตัวนี้
// บนมือถือไม่มี hover เลยรองรับ tap-to-toggle ด้วย (onClick)
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  // ตำแหน่งแบบ fixed คำนวณจากปุ่ม แล้วหนีบให้อยู่ในจอเสมอ (เดิม absolute ตกขอบจอเมื่อปุ่มอยู่ชิดขวา/ซ้าย)
  const [pos, setPos] = useState<{ top: number; left: number; w: number } | null>(null)
  const iconSize = size === 'md' ? 14 : 11
  const btnSize  = size === 'md' ? 20 : 16

  function place() {
    const r = btnRef.current?.getBoundingClientRect(); if (!r) return
    const margin = 8, w = Math.min(width, window.innerWidth * 0.82, window.innerWidth - margin * 2)
    const wantLeft = placement === 'bottom-end' ? r.right - w : r.left
    setPos({ top: r.bottom + 6, left: Math.max(margin, Math.min(wantLeft, window.innerWidth - w - margin)), w })
  }
  useEffect(() => {
    if (!open) return
    place()
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  function show() { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true) }
  function hideSoon() { closeTimer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        onFocus={show}
        onBlur={hideSoon}
        aria-label={title ? `ความหมาย: ${title}` : 'ความหมาย'}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: btnSize, height: btnSize, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${open ? '#244B83' : '#cbd5e1'}`,
          background: open ? '#244B83' : '#fff',
          color: open ? '#fff' : '#94a3b8',
          cursor: 'help', padding: 0, lineHeight: 0,
        }}
      >
        <Info size={iconSize} />
      </button>
      {open && pos && (
        <div
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            zIndex: Z.tooltip,
            background: '#1f2937', color: '#f9fafb',
            borderRadius: 10, padding: '11px 14px',
            boxShadow: '0 14px 34px rgba(15,23,42,0.28)',
            width: pos.w,
            fontSize: '0.78rem', lineHeight: 1.6,
            fontWeight: 400, textTransform: 'none', letterSpacing: 'normal',
            pointerEvents: 'auto',
          }}
        >
          {title && <div style={{ fontWeight: 700, marginBottom: 5, color: '#fff', fontSize: '0.82rem' }}>{title}</div>}
          <div style={{ color: '#e5e7eb' }}>{content}</div>
        </div>
      )}
    </span>
  )
}
