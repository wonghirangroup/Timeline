// admin/src/pages/hr-documents/CertCanvas.tsx
// Canvas หน้า A4 เดียว ใช้ render ร่วมกันทั้ง 3 จุด: หน้าออกแบบเทมเพลต (editable),
// แท็บ "ดูตัวอย่าง" ในหน้าออกแบบ, และหน้าพิมพ์จริง (ทั้งคู่ editable=false) — ให้แน่ใจว่า
// สิ่งที่เห็นตอนออกแบบ/ดูตัวอย่าง ตรงกับของจริงตอนพิมพ์เป๊ะ เพราะเป็น component เดียวกัน
// ลาก/ปรับขนาด element ทำเองด้วย pointer events (ไม่ใช้ drag-drop library ใหม่) หน่วยเป็น
// มม. บนหน้า A4 (210×297) เหมือนกับ `page` style เดิมใน templates.tsx
import { useRef } from 'react'
import type { CertData, TemplateElement } from './certTemplate'
import { resolveTemplateText } from './certTemplate'

const PAGE_MM = { w: 210, h: 297 }

const pageStyle: React.CSSProperties = {
  width: `${PAGE_MM.w}mm`, minHeight: `${PAGE_MM.h}mm`, margin: '0 auto', background: '#fff',
  position: 'relative', boxSizing: 'border-box', fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
  color: '#111827',
}

export default function CertCanvas({ elements, data, editable = false, selectedId, onSelect, onChange }: {
  elements: TemplateElement[]
  data: CertData
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onChange?: (elements: TemplateElement[]) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)

  function pxPerMm() {
    const rect = canvasRef.current?.getBoundingClientRect()
    return rect ? rect.width / PAGE_MM.w : 3.78 // fallback ≈ 96dpi
  }

  function updateEl(id: string, patch: Partial<TemplateElement>) {
    onChange?.(elements.map(e => (e.id === id ? { ...e, ...patch } : e)))
  }

  function startDrag(e: React.PointerEvent, el: TemplateElement) {
    if (!editable) return
    e.stopPropagation()
    onSelect?.(el.id)
    const ratio = pxPerMm()
    const startX = e.clientX, startY = e.clientY
    const origX = el.x, origY = el.y
    function onMove(ev: PointerEvent) {
      const dxMm = (ev.clientX - startX) / ratio
      const dyMm = (ev.clientY - startY) / ratio
      updateEl(el.id, {
        x: Math.max(0, Math.round((origX + dxMm) * 2) / 2),
        y: Math.max(0, Math.round((origY + dyMm) * 2) / 2),
      })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function startResize(e: React.PointerEvent, el: TemplateElement) {
    if (!editable) return
    e.stopPropagation()
    onSelect?.(el.id)
    const ratio = pxPerMm()
    const startX = e.clientX, startY = e.clientY
    const origW = el.w, origH = el.h
    function onMove(ev: PointerEvent) {
      const dwMm = (ev.clientX - startX) / ratio
      const dhMm = (ev.clientY - startY) / ratio
      updateEl(el.id, {
        w: Math.max(10, Math.round((origW + dwMm) * 2) / 2),
        h: Math.max(4, Math.round((origH + dhMm) * 2) / 2),
      })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={canvasRef} style={pageStyle} onPointerDown={() => editable && onSelect?.(null)}>
      {elements.map(el => {
        const selected = editable && selectedId === el.id
        const base: React.CSSProperties = {
          position: 'absolute', left: `${el.x}mm`, top: `${el.y}mm`, width: `${el.w}mm`,
        }
        if (el.kind === 'line') {
          return (
            <div key={el.id} onPointerDown={e => startDrag(e, el)}
              style={{ ...base, height: 0, borderTop: `${selected ? 2 : 1}px solid ${selected ? '#244B83' : '#9ca3af'}`, cursor: editable ? 'move' : 'default' }} />
          )
        }
        if (el.kind === 'image') {
          return (
            <div key={el.id} onPointerDown={e => startDrag(e, el)}
              style={{ ...base, height: `${el.h}mm`, outline: selected ? '2px solid #244B83' : editable ? '1px dashed #cbd5e1' : 'none', cursor: editable ? 'move' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data.company.logo_url
                ? <img src={data.company.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : editable ? <span style={{ fontSize: '9px', color: '#94a3b8' }}>โลโก้บริษัท</span> : null}
              {selected && <ResizeHandle onPointerDown={e => startResize(e, el)} />}
            </div>
          )
        }
        return (
          <div key={el.id} onPointerDown={e => startDrag(e, el)}
            style={{
              ...base, minHeight: `${el.h}mm`, padding: editable ? 2 : 0,
              outline: selected ? '2px solid #244B83' : editable ? '1px dashed #cbd5e1' : 'none',
              cursor: editable ? 'move' : 'default',
              fontSize: `${el.fontSize ?? 13}pt`, fontWeight: el.bold ? 800 : 400,
              textAlign: el.align ?? 'left', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
            {resolveTemplateText(el.content ?? '', data)}
            {selected && <ResizeHandle onPointerDown={e => startResize(e, el)} />}
          </div>
        )
      })}
    </div>
  )
}

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div onPointerDown={onPointerDown}
      style={{ position: 'absolute', right: -5, bottom: -5, width: 11, height: 11, borderRadius: 3, background: '#244B83', cursor: 'nwse-resize' }} />
  )
}
