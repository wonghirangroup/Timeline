// admin/src/components/ui/Modal.tsx
// overlay primitive ตัวเดียวสำหรับทุก dialog ในแอป — จัดการ a11y ให้ครบ:
//   • Esc ปิด  • focus trap (Tab วนอยู่ใน dialog)  • คืน focus ให้ปุ่มที่เปิด
//   • role="dialog" + aria-modal  • ล็อก scroll พื้นหลัง  • คลิก backdrop ปิด (ปิดได้)
// z-index มาจาก scale เดียว (z.ts) — เลิกใส่เลขมั่ว
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Z } from './z'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** ปิดเมื่อคลิกพื้นหลัง (default: true) */
  dismissable?: boolean
  /** ความกว้าง card (default 400) */
  width?: number
  labelledBy?: string
  describedBy?: string
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({ onClose, children, dismissable = true, width = 400, labelledBy, describedBy }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // โฟกัสตัวแรกที่โฟกัสได้ใน dialog (ไม่งั้นโฟกัสที่ card เอง)
    const first = cardRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? cardRef.current)?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissable) { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const nodes = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) { e.preventDefault(); return }
      const list = Array.from(nodes)
      const idx = list.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey && (idx <= 0)) { e.preventDefault(); list[list.length - 1].focus() }
      else if (!e.shiftKey && idx === list.length - 1) { e.preventDefault(); list[0].focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      returnFocusRef.current?.focus?.()
    }
  }, [onClose, dismissable])

  // portal ไป document.body — modal ไม่โดนซ่อนถ้า ancestor เป็น display:none
  // (เช่น แท็บที่ไม่ได้ active ในหน้าการลา ที่ mount ไว้ตลอดด้วย display:none)
  return createPortal((
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: Z.modal, padding: 16 }}
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', outline: 'none' }}
        className="animate-slide-up"
      >
        {children}
      </div>
    </div>
  ), document.body)
}
