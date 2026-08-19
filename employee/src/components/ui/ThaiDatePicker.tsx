// employee/src/components/ui/ThaiDatePicker.tsx
// แทน <input type="date"> เดิม — ปฏิทิน popup ของเครื่อง (โดยเฉพาะใน LINE in-app
// browser) เด้งทับ layout กันเอง และโชว์ปี ค.ศ. ไม่ใช่ พ.ศ. ตัวนี้คุมทุกอย่างเอง
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { COLOR } from './tokens'

const MONTHS_TH  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส']

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad(m + 1)}-${pad(d)}` }
function parseDateStr(s: string): { y: number; m: number; d: number } | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m: m - 1, d }
}
function fmtShort(s: string) {
  const p = parseDateStr(s)
  if (!p) return ''
  return `${p.d} ${MONTHS_SHORT[p.m]} ${p.y + 543}`
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDow(y: number, m: number)    { return new Date(y, m, 1).getDay() }

interface ThaiDatePickerProps {
  value:      string  // 'YYYY-MM-DD' (ค.ศ., เก็บ/ส่งให้ backend เหมือนเดิม)
  onChange:   (dateStr: string) => void
  min?:       string  // 'YYYY-MM-DD'
  placeholder?: string
}

export function ThaiDatePicker({ value, onChange, min, placeholder = 'เลือกวันที่' }: ThaiDatePickerProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const sel   = parseDateStr(value)
  const today = new Date()
  const [viewY, setViewY] = useState(sel?.y ?? today.getFullYear())
  const [viewM, setViewM] = useState(sel?.m ?? today.getMonth())
  const minP = parseDateStr(min ?? '')

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function openPicker() {
    if (sel) { setViewY(sel.y); setViewM(sel.m) }
    setOpen(o => !o)
  }

  function changeMonth(delta: number) {
    let m = viewM + delta, y = viewY
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewM(m); setViewY(y)
  }

  const daysInMonth = getDaysInMonth(viewY, viewM)
  const firstDow    = getFirstDow(viewY, viewM)
  const totalCells  = Math.ceil((daysInMonth + firstDow) / 7) * 7

  function isBeforeMin(y: number, m: number, d: number) {
    if (!minP) return false
    const t = toDateStr(y, m, d)
    return t < (min as string)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" onClick={openPicker} style={{
        width: '100%', padding: '11px 12px', borderRadius: 12, border: `1.5px solid ${COLOR.primaryBorder}`,
        fontSize: '0.88rem', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', color: value ? COLOR.textPrimary : COLOR.textMuted,
      }}>
        <Calendar size={16} color={COLOR.primary} />
        {value ? fmtShort(value) : placeholder}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          background: '#fff', borderRadius: 16, padding: 14, width: 260,
          boxShadow: '0 12px 32px rgba(0,0,0,0.16)', border: '1px solid #f1f5f9',
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => changeMonth(-1)} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={14} color="#374151" />
            </button>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: COLOR.textPrimary }}>
              {MONTHS_TH[viewM]} {viewY + 543}
            </div>
            <button type="button" onClick={() => changeMonth(1)} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
              <ChevronRight size={14} color="#374151" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDow + 1
              if (day < 1 || day > daysInMonth) return <div key={i} style={{ height: 30 }} />
              const dateStr  = toDateStr(viewY, viewM, day)
              const isSel    = value === dateStr
              const disabled = isBeforeMin(viewY, viewM, day)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(dateStr); setOpen(false) }}
                  style={{
                    height: 30, borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem', fontWeight: isSel ? 800 : 500, fontFamily: 'inherit',
                    background: isSel ? COLOR.primary : 'transparent',
                    color: isSel ? '#fff' : disabled ? '#d1d5db' : COLOR.textPrimary,
                  }}
                >{day}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
