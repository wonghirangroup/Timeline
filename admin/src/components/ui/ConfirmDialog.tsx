import { Trash2, AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT = {
  danger:  { btn: '#ef4444', hover: '#dc2626', icon: '#fef2f2', iconColor: '#ef4444' },
  warning: { btn: '#f59e0b', hover: '#d97706', icon: '#fffbeb', iconColor: '#f59e0b' },
  default: { btn: '#f97316', hover: '#ea580c', icon: '#fff7ed', iconColor: '#f97316' },
}

export default function ConfirmDialog({
  title, message,
  confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const v = VARIANT[variant]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: 360, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: v.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {variant === 'danger' ? (
              <Trash2 size={22} color={v.iconColor} />
            ) : (
              <AlertTriangle size={22} color={v.iconColor} />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>{title}</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: v.btn, color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = v.hover }}
            onMouseLeave={e => { e.currentTarget.style.background = v.btn }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
