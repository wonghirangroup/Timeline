// admin/src/components/ui/Pagination.tsx
// Shared pagination control — numbered pages + prev/next arrows.
// แบนเนอร์สีน้ำเงินเหมือน TabBar — หน้าที่เลือกอยู่เป็นแผ่นสีขาว ตัวอักษรน้ำเงิน
// Used across list pages per SYS-3 (คงข้อมูลต่อหน้าไว้ ~15 แถว ไม่ให้ไหลยาวไม่จบ)
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  totalItems: number
  itemLabel?: string
  compact?: boolean
}

export default function Pagination({ page, totalPages, onChange, totalItems, itemLabel = 'รายการ', compact = false }: PaginationProps) {
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 14px', background: 'linear-gradient(135deg, #131C45 0%, #244B83 100%)', borderRadius: 14, boxShadow: '0 4px 14px rgba(19,28,69,0.22)', marginTop: 10 }}>
      {!compact && (
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
          หน้า {page}/{totalPages} · {totalItems} {itemLabel}
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
