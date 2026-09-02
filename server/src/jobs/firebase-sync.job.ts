// server/src/jobs/firebase-sync.job.ts
// รัน server/src/modules/firebase-sync ให้ทุก tenant ที่เปิด firebase_sync_enabled
// ไว้ทุกวันอัตโนมัติ (03:00 เวลาไทย) — ปิดได้ต่อ tenant จาก Super Admin เมื่อไหร่ที่
// tenant เลิกใช้ระบบเก่า (Firebase) แล้ว ย้าย SQL เต็มตัว
import cron from 'node-cron'
import { prisma } from '../common/utils/prisma'
import { runFirebaseSync } from '../modules/firebase-sync/firebase-sync.service'

async function runForEnabledTenants() {
  const tenants = await prisma.tenant.findMany({
    where: { firebase_sync_enabled: true, deleted_at: null },
    select: { id: true, name: true },
  })
  if (tenants.length === 0) {
    console.log('[firebase-sync] ไม่มี tenant ไหนเปิดซิงค์ไว้ ข้าม')
    return
  }
  for (const t of tenants) {
    console.log(`[firebase-sync] เริ่มซิงค์ tenant "${t.name}" (${t.id})`)
    try {
      const result = await runFirebaseSync(t.id)
      console.log(`[firebase-sync] "${t.name}" เสร็จ:`, JSON.stringify(result))
    } catch (e: any) {
      console.error(`[firebase-sync] "${t.name}" ล้มเหลว:`, e.message)
    }
  }
}

export function startFirebaseSyncCron() {
  // 03:00 ทุกวัน เวลาไทย — ช่วงคนใช้งานน้อยสุด
  cron.schedule('0 3 * * *', () => {
    runForEnabledTenants().catch(e => console.error('[firebase-sync] cron tick ล้มเหลว:', e))
  }, { timezone: 'Asia/Bangkok' })
  console.log('[firebase-sync] ตั้ง cron รายวันแล้ว (03:00 Asia/Bangkok)')
}

// เผื่อ Super Admin กด "ซิงค์ตอนนี้เลย" จาก UI — เรียกตรงๆ ได้โดยไม่ต้องรอ cron
export { runForEnabledTenants }
