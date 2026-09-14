// employee/src/components/ui/BottomSheet.tsx
// Sheet ครึ่งจอที่เลื่อนขึ้นจากด้านล่าง — ปิดได้ทั้งแตะ backdrop, ปุ่มปิด (ถ้ามี),
// และ "สไลด์ลง" ด้วยนิ้ว (touch) ไม่มี gesture library ในโปรเจกต์นี้ เลยเขียนเอง
// แบบง่าย: ลาก drag-handle แล้ววัดระยะ Y ถ้าลากพ้น threshold หรือปล่อยตอน velocity
// สูงพอ ถือว่าปิด ไม่งั้น sheet เด้งกลับตำแหน่งเดิม
//
// render ผ่าน createPortal ไป document.body ตรงๆ (feedback 2026-09-14: user
// ยัง report ว่าเลื่อนดูไม่ได้ + nav bar ล่างโผล่ทะลุมาบัง แม้แก้ maxHeight
// เป็น vh แล้ว) — เดิม sheet render อยู่ใน component tree ปกติของหน้านั้นๆ
// ถ้ามี ancestor ไหนตั้ง transform/filter/perspective ไว้ (แม้แค่ระหว่าง
// animation) มันจะกลายเป็น containing block ของลูกที่เป็น position:fixed
// แทนที่จะอ้างอิง viewport จริง ทำให้ sheet เพี้ยนตำแหน่ง/ความสูงได้ — portal
// ตัดปัญหานี้ทิ้งไปเลย ไม่ต้องตามหาว่า ancestor ไหนเป็นต้นเหตุ
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  const cardRef  = useRef<HTMLDivElement>(null)

  // onClose มักเป็น inline arrow function ที่ parent สร้างใหม่ทุกครั้งที่ re-render
  // (เช่น onClose={() => setSwapPickerFor(null)}) — ถ้า effect ผูกกับ [onClose]
  // ตรงๆ มันจะ cleanup+รันใหม่ทุกครั้งที่ parent re-render (เช่น react-query
  // refetch พื้นหลัง) แต่ละรอบ cleanup จะ "คืนค่า overflow เดิม" (ซึ่งตอนนั้น
  // ถูกตั้งเป็น 'hidden' ไปแล้วจากรอบก่อน) แล้วรันใหม่จับ prevOverflow เป็น
  // 'hidden' แทนค่าจริงก่อนเปิด sheet — พอปิด sheet จริงๆ เลย "คืนค่า" กลับเป็น
  // 'hidden' ค้างตลอดไป ทั้งหน้าเลื่อนไม่ได้แม้ปิด sheet ไปแล้ว (feedback
  // 2026-09-14: "ตอนนี้จอมันเลื่อนไม่ได้ เลย") — แก้โดยแยก onClose ออกเป็น ref
  // ให้ effect หลักรันแค่ตอน mount/unmount ครั้งเดียวจริงๆ ไม่ผูกกับ identity
  // ของ onClose เลย
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.querySelector<HTMLElement>('button,a,input,textarea,select,[tabindex]')?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current() } }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [])

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

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        style={{
          background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth, margin: '0 auto',
          padding: '24px 24px 40px', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
          // เนื้อหาอาจสูงเกินจอ (เช่น รายชื่อเพื่อนยาวๆ) — ต้อง scroll ได้เองถ้าเกิน
          // maxHeight ที่เผื่อพื้นที่ด้านบนไว้หน่อย ไม่งั้นเนื้อหาจะโดนตัดจอโดยเลื่อนดูไม่ได้เลย
          // ใช้หน่วย vh ไม่ใช่ dvh — เว็บวิว LINE in-app บางเวอร์ชันไม่รู้จัก dvh เลย
          // เมิน (ignore) ค่าทั้งค่า ทำให้ maxHeight ไม่ถูกกำหนดเลย บั๊กเดิมกลับมาเหมือนไม่ได้แก้
          // (feedback 2026-09-14: แก้ครั้งแรกด้วย dvh แล้วยังเลื่อนไม่ได้เหมือนเดิม)
          maxHeight: '85vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
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
    </div>,
    document.body,
  )
}
