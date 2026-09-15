// server/src/jobs/vacation-policy.job.ts
// นโยบายพักร้อนตามอายุงาน (feedback 2026-09-15) — 2 cron แยกกัน:
//   1) โบนัส "หยุดไม่ครบโควต้า" — ทุกวันที่ 1 ของเดือน 03:00 (เวลาไทย) ให้กับเดือนที่
//      เพิ่งจบไป — ตั้งเวลาห่างจาก leave-accrual (02:00) 1 ชม. กันชนกันบน balance เดียวกัน
//   2) reset ประจำปีตามสูตรอายุงาน — 1 ม.ค. 04:00 (เวลาไทย)
// ทั้งคู่ idempotent ผ่าน vacation_grant_logs (unique employee+source+year+ym) — รันซ้ำ
// ปลอดภัย เหมือน leave-accrual.job.ts เดิม
import cron from 'node-cron'
import { prisma } from '../common/utils/prisma'
import { isFeatureEnabled } from '../common/utils/features'
import { bangkokNow } from '../common/utils/time'
import { grantUnderQuotaBonus, runVacationAnnualReset } from '../modules/leave/vacation-policy.service'

let runningBonus = false
let runningReset = false

function prevYm(): string {
  const b = bangkokNow()
  const d = new Date(Date.UTC(b.getFullYear(), b.getMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function runBonusForEnabledTenants() {
  if (runningBonus) { console.log('[vacation-policy] โบนัสรอบก่อนยังไม่เสร็จ ข้าม'); return }
  runningBonus = true
  try {
    const ym = prevYm()
    const tenants = await prisma.tenant.findMany({
      where: { deleted_at: null, is_active: true },
      select: { id: true, name: true, enabled_features: true },
    })
    for (const t of tenants) {
      if (!isFeatureEnabled(t.enabled_features, 'vacation_policy')) continue
      try {
        const res = await grantUnderQuotaBonus(t.id, ym)
        console.log(`[vacation-policy] โบนัส "${t.name}" (${t.id}):`, JSON.stringify(res))
      } catch (e: any) {
        console.error(`[vacation-policy] โบนัส "${t.name}" ล้มเหลว:`, e.message)
      }
    }
  } finally {
    runningBonus = false
  }
}

async function runResetForEnabledTenants() {
  if (runningReset) { console.log('[vacation-policy] reset รอบก่อนยังไม่เสร็จ ข้าม'); return }
  runningReset = true
  try {
    const year = bangkokNow().getFullYear()
    const tenants = await prisma.tenant.findMany({
      where: { deleted_at: null, is_active: true },
      select: { id: true, name: true, enabled_features: true },
    })
    for (const t of tenants) {
      if (!isFeatureEnabled(t.enabled_features, 'vacation_policy')) continue
      try {
        const res = await runVacationAnnualReset(t.id, year)
        console.log(`[vacation-policy] reset "${t.name}" (${t.id}):`, JSON.stringify(res))
      } catch (e: any) {
        console.error(`[vacation-policy] reset "${t.name}" ล้มเหลว:`, e.message)
      }
    }
  } finally {
    runningReset = false
  }
}

export function startVacationPolicyCron() {
  cron.schedule('0 3 1 * *', () => {
    runBonusForEnabledTenants().catch(e => console.error('[vacation-policy] bonus cron tick ล้มเหลว:', e))
  }, { timezone: 'Asia/Bangkok' })
  cron.schedule('0 4 1 1 *', () => {
    runResetForEnabledTenants().catch(e => console.error('[vacation-policy] reset cron tick ล้มเหลว:', e))
  }, { timezone: 'Asia/Bangkok' })
  console.log('[vacation-policy] ตั้ง cron แล้ว — โบนัสวันที่ 1 ของเดือน 03:00 น., reset ประจำปี 1 ม.ค. 04:00 น. (Asia/Bangkok)')
}

export { runBonusForEnabledTenants as runVacationBonusForEnabledTenants, runResetForEnabledTenants as runVacationResetForEnabledTenants }
