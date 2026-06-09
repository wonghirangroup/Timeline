import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastCtx {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const CONFIG: Record<ToastType, { bg: string; border: string; color: string; icon: JSX.Element }> = {
  success: {
    bg: '#f0fdf4', border: '#86efac', color: '#15803d',
    icon: <CheckCircle size={16} />,
  },
  error: {
    bg: '#fef2f2', border: '#fca5a5', color: '#dc2626',
    icon: <XCircle size={16} />,
  },
  warning: {
    bg: '#fffbeb', border: '#fcd34d', color: '#d97706',
    icon: <AlertTriangle size={16} />,
  },
  info: {
    bg: '#eff6ff', border: '#93c5fd', color: '#2563eb',
    icon: <Info size={16} />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const cfg = CONFIG[t.type]
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                color: cfg.color, fontSize: '13px', fontWeight: 500,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                minWidth: 260, maxWidth: 360,
                pointerEvents: 'all',
                animation: 'slideInRight 0.25s ease',
              }}
            >
              <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: cfg.color, opacity: 0.6, flexShrink: 0, display: 'flex' }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </ToastContext.Provider>
  )
}
