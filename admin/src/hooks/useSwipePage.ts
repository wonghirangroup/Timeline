import type { TouchEvent } from 'react'
import { useRef } from 'react'
import { startsInSwipeBlocker } from '../components/ui/Pagination'

// ปัดซ้าย = หน้าถัดไป, ปัดขวา = หน้าก่อนหน้า — spread ลงบน container ของรายการ (ใช้เฉพาะหน้าที่ทำแถบเลขหน้าเอง ไม่ได้ใช้ <Pagination/>
// เพราะ <Pagination/> จัดการการปัดให้เองอยู่แล้ว) · ไม่ตอบสนองเมื่อเริ่มปัดในตารางเลื่อนแนวนอน/ช่องกรอก/ป๊อปอัป (กติกาเดียวกับ Pagination)
export function useSwipePage(onNext?: () => void, onPrev?: () => void, threshold = 60): React.HTMLAttributes<HTMLElement> {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.target as HTMLElement
      start.current = e.touches.length === 1 && !startsInSwipeBlocker(t) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current; start.current = null
      if (!s) return
      const dx = s.x - e.changedTouches[0].clientX
      const dy = s.y - e.changedTouches[0].clientY
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx > 0) onNext?.(); else onPrev?.()
    },
  }
}
