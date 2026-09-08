import type { ReactNode } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmDialogProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT = {
  danger:  { btn: 'var(--action-danger)',  hover: 'var(--action-danger-hover)',  icon: 'var(--error-bg)',   iconColor: 'var(--action-danger)' },
  warning: { btn: 'var(--warning)',         hover: 'var(--warning-text)',          icon: 'var(--warning-bg)', iconColor: 'var(--warning-text)' },
  default: { btn: 'var(--action-primary)',  hover: 'var(--action-primary-hover)',  icon: 'var(--accent-light)', iconColor: 'var(--action-primary)' },
}

export default function ConfirmDialog({
  title, message,
  confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก',
  variant = 'danger',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  const v = VARIANT[variant]

  return (
    <Modal onClose={onCancel} width={360} labelledBy="confirm-title" describedBy="confirm-msg">
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: v.icon, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {variant === 'danger' ? <Trash2 size={22} color={v.iconColor} /> : <AlertTriangle size={22} color={v.iconColor} />}
          </div>
          <div>
            <p id="confirm-title" style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>{title}</p>
            <p id="confirm-msg" style={{ fontSize: '13px', color: 'var(--text-gray)', margin: '6px 0 0', lineHeight: 1.5 }}>{message}</p>
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
    </Modal>
  )
}
