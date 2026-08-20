// admin/src/components/ui/Pagination.tsx
// Shared pagination control — numbered pages + prev/next arrows.
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

  const btnBase = { padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' as const, display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '10px 14px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginTop: 10 }}>
      {!compact && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          หน้า {page}/{totalPages} · {totalItems} {itemLabel}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: compact ? 0 : 'auto' }}>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          style={{ ...btnBase, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
          <ChevronLeft size={14} />
        </button>
        {pageNumbers.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#d1d5db', fontSize: '0.78rem' }}>…</span>
          : (
            <button key={p} onClick={() => onChange(p)}
              style={{ ...btnBase, minWidth: 28, justifyContent: 'center', background: page === p ? '#f97316' : '#fff', color: page === p ? '#fff' : '#374151', borderColor: page === p ? '#f97316' : '#e5e7eb', fontWeight: page === p ? 700 : 500 }}>
              {p}
            </button>
          ))}
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          style={{ ...btnBase, background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
