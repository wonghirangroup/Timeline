// แบ่งหน้าฝั่ง client สำหรับลิสต์ที่ดึงมาครบแล้ว (15 แถว/หน้า ตามหน้าอื่นๆ ที่ใช้ <Pagination>)
// - resetKey เปลี่ยน (เช่น ตัวกรอง/คำค้น) → กลับหน้า 1
// - focusId (ลิงก์จากกระดิ่งแจ้งเตือน ?approve=/?focus=) → กระโดดไปหน้าที่มีแถวนั้น ไม่งั้นแถวที่ต้องไฮไลต์อาจอยู่หน้า 2+ แล้วหาไม่เจอ
import { useEffect, useMemo, useState } from 'react'

export function usePagination<T>(items: T[], opts: { pageSize?: number; resetKey?: unknown; focusId?: string | null; idOf?: (item: T) => string } = {}) {
  const pageSize = opts.pageSize ?? 15
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => { setPage(1) }, [opts.resetKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  useEffect(() => {
    if (!opts.focusId || !opts.idOf) return
    const i = items.findIndex(it => opts.idOf!(it) === opts.focusId)
    if (i >= 0) setPage(Math.floor(i / pageSize) + 1)
  }, [opts.focusId, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const paged = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize])
  return { page, setPage, totalPages, paged, total: items.length }
}
