import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'

// อ่าน ?focus=<id> หรือ ?approve=<id> จาก URL (กระดิ่งแจ้งเตือนส่งมา)
//  - เลื่อนไปที่แถวนั้น + ไฮไลต์ชั่วคราว
//  - ถ้าเป็น ?approve= → autoApprove=true ให้หน้านั้นเปิด popup อนุมัติเลย
// ใช้: const { focusId, autoApprove, focusRef, rowHighlight } = useFocusHighlight()
//      <div ref={id === focusId ? focusRef : undefined} style={{ ...base, ...rowHighlight(id) }}>
export function useFocusHighlight() {
  const [sp, setSp] = useSearchParams()
  const focusId = sp.get('approve') || sp.get('focus')
  const autoApprove = !!sp.get('approve')
  const focusRef = useRef<HTMLElement | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!focusId) return
    const t1 = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlash(focusId)
    }, 280)
    const t2 = setTimeout(() => {
      setFlash(null)
      const next = new URLSearchParams(sp)
      next.delete('focus'); next.delete('approve')
      setSp(next, { replace: true })
    }, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId])

  const rowHighlight = (id: string): CSSProperties =>
    flash === id
      ? { boxShadow: '0 0 0 2px var(--action-primary), 0 0 0 6px var(--accent-light)', borderRadius: 10, transition: 'box-shadow 0.25s ease' }
      : {}

  return { focusId, autoApprove, focusRef, rowHighlight }
}
