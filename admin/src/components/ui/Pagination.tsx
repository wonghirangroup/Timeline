// admin/src/components/ui/Pagination.tsx
// Shared pagination control — numbered pages + prev/next arrows.
// แบนเนอร์สีน้ำเงินเหมือน TabBar — หน้าที่เลือกอยู่เป็นแผ่นสีขาว ตัวอักษรน้ำเงิน
// Used across list pages per SYS-3 (คงข้อมูลต่อหน้าไว้ ~15 แถว ไม่ให้ไหลยาวไม่จบ)
import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  totalItems: number
  itemLabel?: string
  compact?: boolean
}

// ปัดบนมือถือ: ปัดซ้าย = หน้าถัดไป, ปัดขวา = หน้าก่อนหน้า — ฟังที่ระดับเอกสาร แล้วจำกัดให้ตอบสนองเฉพาะการปัดที่เริ่มในพื้นที่เดียวกับแถบนี้
// (ตัวแม่ของแถบ ขยับขึ้นจนกว่าจะมีลูกมากกว่า 1) จึงใช้ได้กับทุกหน้าที่ใช้ Pagination โดยไม่ต้องผูกมือกับ list แต่ละอัน
// ข้ามเมื่อ: เริ่มปัดในตารางที่เลื่อนแนวนอนได้ / ช่องกรอก / แผนที่ / ป๊อปอัป (position: fixed) / องค์ประกอบที่ใส่ data-no-swipe
export function startsInSwipeBlocker(el: HTMLElement | null): boolean {
  if (el?.closest('input, textarea, select, .leaflet-container')) return true
  while (el && el !== document.body) {
    if (el.hasAttribute('data-no-swipe')) return true
    const st = getComputedStyle(el)
    if (st.position === 'fixed') return true
    if ((st.overflowX === 'auto' || st.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true
    el = el.parentElement
  }
  return false
}

export default function Pagination({ page, totalPages, onChange, totalItems, itemLabel = 'รายการ', compact = false }: PaginationProps) {
  const isMobile = useIsMobile()
  const rootRef = useRef<HTMLDivElement>(null)
  const live = useRef({ page, totalPages, onChange })
  live.current = { page, totalPages, onChange }

  useEffect(() => {
    if (!isMobile) return
    let sx = 0, sy = 0, ok = false
    const onStart = (e: TouchEvent) => {
      const root = rootRef.current
      const t = e.target as HTMLElement | null
      ok = false
      if (!root || !t || root.offsetParent === null || e.touches.length !== 1) return  // ซ่อนอยู่ (เช่นแท็บที่ไม่ได้เปิด) = ไม่ตอบสนอง
      let scope = root.parentElement
      while (scope && scope.children.length === 1) scope = scope.parentElement
      if (!scope || !scope.contains(t) || startsInSwipeBlocker(t)) return
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; ok = true
    }
    const onEnd = (e: TouchEvent) => {
      if (!ok) return
      ok = false
      if ((e as any).__pageSwiped) return  // แถบอื่นในหน้าเดียวกันจัดการไปแล้ว
      const dx = sx - e.changedTouches[0].clientX
      const dy = sy - e.changedTouches[0].clientY
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const { page: p, totalPages: n, onChange: go } = live.current
      const next = dx > 0 ? Math.min(n, p + 1) : Math.max(1, p - 1)
      if (next === p) return
      ;(e as any).__pageSwiped = true
      go(next)
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => { document.removeEventListener('touchstart', onStart); document.removeEventListener('touchend', onEnd) }
  }, [isMobile])

  if (totalPages <= 1) return null

  // Show at most 7 page numbers; collapse the middle with '…' when there are many pages
  const pageNumbers: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i)
  } else {
    pageNumbers.push(1)
    if (page > 3) pageNumbers.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pageNumbers.push(i)
    if (page < totalPages - 2) pageNumbers.push('…')
    pageNumbers.push(totalPages)
  }

  const btnBase = { padding: '5px 10px', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 8, cursor: 'pointer' as const, display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontFamily: 'inherit' }

  return (
    <div ref={rootRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 14px', background: 'linear-gradient(135deg, #131C45 0%, #244B83 100%)', borderRadius: 14, boxShadow: '0 4px 14px rgba(19,28,69,0.22)', marginTop: 10 }}>
      {!compact && (
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
          หน้า {page}/{totalPages} · {totalItems} {itemLabel}
          {isMobile && <span style={{ display: 'block', fontSize: '0.66rem', color: 'rgba(255,255,255,0.6)' }}>← ปัดซ้าย/ขวาเพื่อเปลี่ยนหน้า →</span>}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: compact ? 0 : 'auto' }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          style={{ ...btnBase, background: page === 1 ? 'transparent' : 'rgba(255,255,255,0.12)', color: page === 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>…</span>
          : (
            <button key={p} onClick={() => onChange(p)}
              style={{ ...btnBase, minWidth: 28, justifyContent: 'center', background: page === p ? '#fff' : 'transparent', color: page === p ? '#244B83' : '#fff', borderColor: page === p ? '#fff' : 'rgba(255,255,255,0.22)', fontWeight: page === p ? 700 : 500, boxShadow: page === p ? '0 2px 8px rgba(0,0,0,0.18)' : 'none' }}>
              {p}
            </button>
          ))}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          style={{ ...btnBase, background: page === totalPages ? 'transparent' : 'rgba(255,255,255,0.12)', color: page === totalPages ? 'rgba(255,255,255,0.3)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
