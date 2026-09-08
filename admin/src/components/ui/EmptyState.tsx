// admin/src/components/ui/EmptyState.tsx
// สถานะว่าง — ไม่ใช่แค่ "ไม่มีข้อมูล" แต่บอกว่าอะไรจะมาอยู่ตรงนี้ + ทำอะไรต่อ
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  hint?: string
  action?: { label: string; onClick: () => void }
  compact?: boolean
}

export default function EmptyState({ icon, title, hint, action, compact }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '32px 20px' : '56px 24px', maxWidth: 360, margin: '0 auto' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: 'var(--bg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
        color: 'var(--text-muted)',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</div>
      {hint && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55 }}>{hint}</div>}
      {action && (
        <button onClick={action.onClick}
          style={{ marginTop: 16, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
