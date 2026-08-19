// employee/src/components/ui/BottomSheet.tsx
// Sheet ครึ่งจอที่เลื่อนขึ้นจากด้านล่าง — ปิดได้ทั้งแตะ backdrop, ปุ่มปิด (ถ้ามี),
// และ "สไลด์ลง" ด้วยนิ้ว (touch) ไม่มี gesture library ในโปรเจกต์นี้ เลยเขียนเอง
// แบบง่าย: ลาก drag-handle แล้ววัดระยะ Y ถ้าลากพ้น threshold หรือปล่อยตอน velocity
// สูงพอ ถือว่าปิด ไม่งั้น sheet เด้งกลับตำแหน่งเดิม
import { useRef, useState, type ReactNode } from 'react'

const CLOSE_DISTANCE = 100  // px ที่ต้องลากลงถึงจะปิด
const CLOSE_VELOCITY = 0.5  // px/ms ที่ถือว่า "ปัดเร็ว" ปิดได้แม้ลากไม่ถึงระยะ

interface BottomSheetProps {
  children: ReactNode
  onClose: () => void
  maxWidth?: number
  zIndex?: number
}

export function BottomSheet({ children, onClose, maxWidth = 430, zIndex = 200 }: BottomSheetProps) {
  const [dragY, setDragY]         = useState(0)
  const [dragging, setDragging]   = useState(false)
  const startY   = useRef(0)
  const startT   = useRef(0)
  const lastY    = useRef(0)
  const lastT    = useRef(0)

  function handleTouchStart(e: React.TouchEvent) {
    const y = e.touches[0].clientY
    startY.current = y; lastY.current = y
    startT.current = Date.now(); lastT.current = startT.current
    setDragging(true)
  }
  function handleTouchMove(e: React.TouchEvent) {
    const y = e.touches[0].clientY
    const delta = Math.max(0, y - startY.current) // ลากขึ้นไม่มีผล ลากลงเท่านั้น
    lastY.current = y; lastT.current = Date.now()
    setDragY(delta)
  }
  function handleTouchEnd() {
    setDragging(false)
    const dt = Math.max(1, lastT.current - startT.current)
    const velocity = (lastY.current - startY.current) / dt
    if (dragY > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in"
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '32px 32px 0 0', width: '100%', maxWidth, margin: '0 auto',
          padding: '24px 24px 40px', boxShadow: '0 -16px 48px rgba(0,0,0,0.12)',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
        className="animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{ width: 40, height: 5, borderRadius: 99, background: '#E5E7EB', margin: '0 auto 24px', touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {children}
      </div>
    </div>
  )
}
