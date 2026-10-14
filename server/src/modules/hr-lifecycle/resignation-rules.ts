// server/src/modules/hr-lifecycle/resignation-rules.ts
// กติกา "ลาออกมีผลเมื่อไหร่" — pure function ไม่แตะ DB (unit test ได้)
// feedback 2026-10-14: อนุมัติลาออกแล้วพนักงานต้องยังเช็คอินได้จนถึง "วันทำงานสุดท้าย" (รวมวันนั้น)
// สถานะ RESIGNED จึงมีผลตั้งแต่ "วันถัดจากวันทำงานสุดท้าย" เป็นต้นไป

/** วันทำงานสุดท้ายผ่านไปแล้ว (วันนี้ > วันสุดท้าย) → เปลี่ยนสถานะเป็นลาออกได้เลย · วันสุดท้ายเป็นวันนี้ = ยังทำงานอยู่ ยังไม่เปลี่ยน */
export function isResignationEffective(lastWorkingDate: Date | string, todayYmd: string): boolean {
  const lwd = typeof lastWorkingDate === 'string' ? lastWorkingDate.slice(0, 10) : lastWorkingDate.toISOString().slice(0, 10)
  return lwd < todayYmd
}
