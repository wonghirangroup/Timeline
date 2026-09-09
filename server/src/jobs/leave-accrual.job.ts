// server/src/jobs/leave-accrual.job.ts
// รัน runAccrualForMonth() ให้ทุก tenant ที่เปิดฟีเจอร์ leave_accrual + มี rule active
// อัตโนมัติ ทุกวันที่ 1 ของเดือน 02:00 (เวลาไทย) — แต่เดิมต้องกดปุ่มเองในหน้าตั้งค่า
// runAccrualForMonth กัน last_run_ym อยู่แล้ว → รันซ้ำปลอดภัย (idempotent ต่อเดือน)
import cron from 'node-cron'
import { prisma } from '../common/utils/prisma'
import { isFeatureEnabled } from '../common/utils/features'
import { runAccrualForMonth } from '../modules/leave-types/leave-types.service'

let running = false

async function runForEnabledTenants() {
  if (running) { console.log('[leave-accrual] รอบก่อนยังไม่เสร็จ ข้าม'); return }
  running = true
  try {
    const tenants = await prisma.tenant.findMany({
      where: { deleted_at: null, is_active: true },
      select: { id: true, name: true, enabled_features: true },
    })
    for (const t of tenants) {
      if (!isFeatureEnabled(t.enabled_features, 'leave_accrual')) continue
      const activeRules = await prisma.leaveAccrualRule.count({ where: { tenant_id: t.id, active: true } })
      if (activeRules === 0) continue
      try {
        const res = await runAccrualForMonth(t.id)
        console.log(`[leave-accrual] "${t.name}" (${t.id}):`, JSON.stringify(res))
      } catch (e: any) {
        console.error(`[leave-accrual] "${t.name}" ล้มเหลว:`, e.message)
      }
    }
  } finally {
    running = false
  }
}

export function startLeaveAccrualCron() {
  // วันที่ 1 ของเดือน 02:00 น. เวลาไทย
  cron.schedule('0 2 1 * *', () => {
    runForEnabledTenants().catch(e => console.error('[leave-accrual] cron tick ล้มเหลว:', e))
  }, { timezone: 'Asia/Bangkok' })
  console.log('[leave-accrual] ตั้ง cron แล้ว — วันที่ 1 ของเดือน 02:00 น. (Asia/Bangkok)')
}

export { runForEnabledTenants as runLeaveAccrualForEnabledTenants }
