// server/src/jobs/firebase-sync.job.ts
// รัน server/src/modules/firebase-sync ให้ทุก tenant ที่เปิด firebase_sync_enabled
// อัตโนมัติหลายรอบต่อวัน (เวลาไทย) — 03:00 = full sync ตอนคนใช้น้อย + รอบกลางวันให้
// "เรียลไทม์วันนี้" บน Dashboard ไม่ตกยุคเกิน ~3 ชม. ระหว่างที่ยังใช้ Firebase คู่ขนาน
// ปิดได้ต่อ tenant จาก Super Admin เมื่อ tenant เลิกใช้ระบบเก่าแล้ว ย้าย SQL เต็มตัว
import cron from 'node-cron'
import { prisma } from '../common/utils/prisma'
import { runFirebaseSync } from '../modules/firebase-sync/firebase-sync.service'

// เวลาไทยที่ให้รันซิงค์ — ครอบชั่วโมงทำงาน
const SYNC_HOURS_BKK = '3,10,13,16,19'

let running = false

async function runForEnabledTenants() {
  if (running) {
    console.log('[firebase-sync] รอบก่อนหน้ายังไม่เสร็จ ข้ามรอบนี้')
    return
  }
  running = true
  try {
    await _runForEnabledTenants()
  } finally {
    running = false
  }
}

async function _runForEnabledTenants() {
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
  cron.schedule(`0 ${SYNC_HOURS_BKK} * * *`, () => {
    runForEnabledTenants().catch(e => console.error('[firebase-sync] cron tick ล้มเหลว:', e))
  }, { timezone: 'Asia/Bangkok' })
  console.log(`[firebase-sync] ตั้ง cron แล้ว — ${SYNC_HOURS_BKK} น. (Asia/Bangkok)`)
}

// เผื่อ Super Admin กด "ซิงค์ตอนนี้เลย" จาก UI — เรียกตรงๆ ได้โดยไม่ต้องรอ cron
export { runForEnabledTenants }
