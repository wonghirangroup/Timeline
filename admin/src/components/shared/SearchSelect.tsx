// admin/src/components/shared/SearchSelect.tsx
// Dropdown เลือกค่าเดียวที่พิมพ์ค้นหาได้ในตัว — ใช้แทน <select> รายชื่อพนักงานที่ยาวจนเลื่อนหาไม่ไหว
// ปุ่มหน้าตาเหมือน <select> เดิม (รับ style เดิมของแต่ละหน้าได้เลย) กดแล้วเปิดกล่องค้นหา + รายการ
// กล่องรายการ render ผ่าน portal ด้วย position: fixed เพื่อไม่ให้โดน modal ที่ overflow: auto ตัดขอบ
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'
import { Z } from '../ui/z'

export interface SearchSelectOption {
  value: string
  label: string
  // ข้อความเพิ่มสำหรับค้นหา (เช่น รหัสพนักงาน/สาขา) ที่ไม่อยากโชว์ใน label
  keywords?: string
}

interface Props {
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  style?: CSSProperties
}

const MAX_ROWS = 100

export default function SearchSelect({
  options, value, onChange,
  placeholder = '— เลือกพนักงาน —',
  searchPlaceholder = 'พิมพ์ชื่อ ชื่อเล่น หรือรหัสพนักงาน...',
  emptyText = 'ไม่พบพนักงาน',
  disabled, style,
}: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const query = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!query) return options
    const words = query.split(/\s+/)
    return options.filter(o => {
      const hay = `${o.label} ${o.keywords ?? ''}`.toLowerCase()
      return words.every(w => hay.includes(w))
    })
  }, [options, query])
  const shown = filtered.slice(0, MAX_ROWS)

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const panelH = 300
    const above = r.bottom + panelH > window.innerHeight && r.top > panelH
    setRect({ top: above ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, above })
  }

  const openPanel = () => {
    if (disabled) return
    place()
    setQ('')
    setActive(Math.max(0, options.findIndex(o => o.value === value)))
    setOpen(true)
  }
  const close = () => { setOpen(false); triggerRef.current?.focus() }
  const pick = (v: string) => { onChange(v); setOpen(false); triggerRef.current?.focus() }

  useLayoutEffect(() => { if (open) inputRef.current?.focus() }, [open])

  // ปิดเมื่อคลิกข้างนอก / ขยับตำแหน่งตามการ scroll-resize
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const onMove = () => place()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active].value) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPanel() } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
          fontSize: '13px', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
          ...style,
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'inherit' : '#6b7280' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: '#6b7280', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{
            position: 'fixed', left: rect.left, width: Math.max(rect.width, 240),
            ...(rect.above ? { bottom: window.innerHeight - rect.top } : { top: rect.top }),
            zIndex: Z.popover, background: '#fff', border: '1px solid #E6ECF4', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(19, 28, 69, 0.16)', overflow: 'hidden', fontFamily: 'inherit',
          }}
        >
          <div style={{ position: 'relative', padding: 8, borderBottom: '1px solid #F1F4F8' }}>
            <Search size={13} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div ref={listRef} style={{ maxHeight: 240, overflowY: 'auto' }}>
            {shown.length === 0 ? (
              <div style={{ padding: 14, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{emptyText}</div>
            ) : shown.map((o, i) => {
              const isSel = o.value === value
              const isActive = i === active
              return (
                <button
                  key={o.value}
                  type="button"
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: '1px solid #f8fafc',
                    background: isActive ? '#F4F6F9' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8rem', color: isSel ? '#131C45' : '#374151', fontWeight: isSel ? 700 : 500,
                  }}
                >
                  {o.label}
                </button>
              )
            })}
            {filtered.length > MAX_ROWS && (
              <div style={{ padding: '8px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                แสดง {MAX_ROWS} จาก {filtered.length} คน — พิมพ์เพิ่มเพื่อค้นหาให้แคบลง
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
