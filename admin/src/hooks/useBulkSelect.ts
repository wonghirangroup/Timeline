// admin/src/hooks/useBulkSelect.ts
// เลือกหลายรายการ + คีย์ลัด สำหรับตาราง triage (อนุมัติ/ปฏิเสธคำขอ)
//   a = อนุมัติที่เลือก · r = ปฏิเสธที่เลือก · Esc = ล้าง
// selection ถูกตัดอัตโนมัติเมื่อ id หลุดจาก selectableIds (อนุมัติไปแล้ว/ฟิลเตอร์เปลี่ยน)
import { useCallback, useEffect, useMemo, useState } from 'react'

export function useBulkSelect(selectableIds: string[], opts?: {
  disabled?: boolean
  onApproveKey?: () => void
  onRejectKey?: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const idKey = selectableIds.join(',')
  useEffect(() => {
    const valid = new Set(selectableIds)
    setSelected(prev => {
      const next = new Set([...prev].filter(id => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [idKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback((id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  }), [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const setAll = useCallback((on: boolean) => setSelected(on ? new Set(selectableIds) : new Set()), [idKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))

  useEffect(() => {
    if (selected.size === 0 || opts?.disabled) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Escape') clear()
      else if (e.key === 'a') { e.preventDefault(); opts?.onApproveKey?.() }
      else if (e.key === 'r') { e.preventDefault(); opts?.onRejectKey?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected.size, opts?.disabled, opts?.onApproveKey, opts?.onRejectKey, clear])

  return useMemo(() => ({
    selected, ids: [...selected], count: selected.size,
    has: (id: string) => selected.has(id),
    toggle, clear, setAll, allSelected,
  }), [selected, toggle, clear, setAll, allSelected])
}
