// ปิดการใช้งานแล้ว: การปัดซ้าย/ขวาเปลี่ยนหน้าย้ายไปอยู่ใน components/ui/Pagination.tsx ทำงานกับทุกหน้าที่ใช้ Pagination อัตโนมัติ
// เก็บ hook นี้ไว้คืนค่า handler ว่าง เพื่อให้หน้าเดิมที่ยัง spread {...swipeHandlers} อยู่ไม่ปัดซ้ำจนข้าม 2 หน้า
export function useSwipePage(_onNext?: () => void, _onPrev?: () => void, _threshold?: number): React.HTMLAttributes<HTMLElement> {
  return {}
}
