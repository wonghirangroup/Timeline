// server/src/jobs/resignation-effective.job.ts
// เปลี่ยนสถานะพนักงานเป็น "ลาออก" ให้คำขอที่อนุมัติแล้วและ "วันทำงานสุดท้ายผ่านไปแล้ว" (วันถัดจากวันสุดท้าย)
// ทุกวัน 00:10 น. เวลาไทย + รันรอบเดียวตอนเซิร์ฟเวอร์เริ่ม (เผื่อเซิร์ฟเวอร์ดับตอน cron) — idempotent: กรองด้วย applied_at
import cron from 'node-cron'
import { applyDueResignations } from '../modules/hr-lifecycle/hr-lifecycle.service'

let running = false
async function run(tag: string) {
  if (running) return
  running = true
  try {
    const n = await applyDueResignations()
    if (n > 0) console.log(`[resignation-effective] (${tag}) เปลี่ยนสถานะเป็นลาออก ${n} คน`)
  } catch (e: any) {
    console.error('[resignation-effective] ล้มเหลว:', e.message)
  } finally {
    running = false
  }
}

export function startResignationEffectiveCron() {
  cron.schedule('10 0 * * *', () => { void run('cron') }, { timezone: 'Asia/Bangkok' })
  console.log('[resignation-effective] ตั้ง cron แล้ว — ทุกวัน 00:10 น. (Asia/Bangkok)')
  void run('startup')
}
