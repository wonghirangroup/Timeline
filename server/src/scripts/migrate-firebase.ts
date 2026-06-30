/**
 * migrate-firebase.ts
 * รัน: npx ts-node src/scripts/migrate-firebase.ts
 *
 * ต้องมี:
 *   1. firebase-service-account.json ใน root ของ server/
 *   2. npm install firebase-admin (ถ้ายังไม่มี)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { PrismaClient } from '@prisma/client'
import { v4 as uuid } from 'uuid'
import * as path from 'path'

const prisma = new PrismaClient()

// ── config ────────────────────────────────────────────────────────────────────
const TENANT_ID         = 'tenant-demo-001'           // tenant ที่จะ import เข้า
const SERVICE_ACCOUNT   = path.join(__dirname, '../../firebase-service-account.json')

// map: branchName → shiftNumber → shift_id ใน MySQL
const BRANCH_SHIFT_MAP: Record<string, Record<number, string>> = {
  'วงษ์หิรัญ':              { 1: '6e720e67-1f0a-49e6-b97e-d269e3b731ba', 2: '6af8d713-c052-4414-847a-e7caa44fd0bc' },
  'ฟุคุโระ ไนท์สวนหมาก':    { 1: 'b39dc56c-b241-47aa-b1a8-c060f5c9f69b', 2: '7f965bca-e070-457a-9df5-c3eb1d029997' },
  'ฟุคุโระ แม่กิมเฮง':      { 1: '648e7323-4048-4833-a174-067ada9050b0', 2: 'efc9adb5-1fc8-4eaa-97af-aa29b402a2f3' },
  'ฟุคุโระ ตลาดย่าโม':      { 1: 'a0c4bbbe-33db-4a74-86c3-a37eb9555995', 2: '6f6b085e-508b-428f-8204-5693825a1c1c' },
  'ฟุคุโระ เทิดไท':         { 1: '10662a51-2da0-46c9-8741-b394740288dd', 2: '0f4e65f6-60cf-4b6c-8bd9-4253a915d018' },
}

// ── helpers ───────────────────────────────────────────────────────────────────
function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  return {
    first_name: parts[0]            || fullName,
    last_name:  parts.slice(1).join(' ') || '',
  }
}

/** "2025-12-30 09:50:59" → Date object (Asia/Bangkok → UTC) */
function parseThaiDateTime(s: string): Date {
  // ต้องบวก 7 ชั่วโมงเพราะ MySQL เก็บ UTC
  const [datePart, timePart] = s.split(' ')
  return new Date(`${datePart}T${timePart}+07:00`)
}

function parseThaiDate(s: string): Date {
  return new Date(`${s}T00:00:00+07:00`)
}

// ── step 1: map branch name → branch_id ──────────────────────────────────────
async function buildBranchMap(): Promise<Map<string, string>> {
  const branches = await prisma.branch.findMany({
    where: { tenant_id: TENANT_ID, deleted_at: null },
    select: { id: true, name: true },
  })
  const map = new Map<string, string>()
  for (const b of branches) map.set(b.name, b.id)
  console.log(`✅ โหลด ${branches.length} สาขา:`, [...map.keys()])
  return map
}

// ── step 2: import employees ──────────────────────────────────────────────────
async function migrateEmployees(
  db: FirebaseFirestore.Firestore,
  branchMap: Map<string, string>,
): Promise<Map<string, string>> {
  const snap = await db.collection('employees').get()
  const employeeMap = new Map<string, string>() // employeeId → MySQL id

  let created = 0, skipped = 0, errors = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    const { first_name, last_name } = splitName(d.name)
    const branchId = branchMap.get(d.branch)

    if (!branchId) {
      console.warn(`⚠️  ไม่พบสาขา "${d.branch}" สำหรับ ${d.employeeId} — ข้ามไป`)
      errors++
      continue
    }

    try {
      const emp = await prisma.employee.upsert({
        where: { tenant_id_employee_code: { tenant_id: TENANT_ID, employee_code: d.employeeId } },
        update: {
          line_user_id: d.lineUserId || null,
          nickname:     d.nickname   || null,
          phone:        d.phone      || null,
        },
        create: {
          id:            uuid(),
          tenant_id:     TENANT_ID,
          branch_id:     branchId,
          employee_code: d.employeeId,
          first_name,
          last_name,
          nickname:      d.nickname  || null,
          department:    d.department || null,
          phone:         d.phone     || null,
          line_user_id:  d.lineUserId || null,
          hired_at:      d.joinDate ? parseThaiDate(d.joinDate) : null,
        },
      })
      employeeMap.set(d.employeeId, emp.id)
      created++
    } catch (e: any) {
      console.error(`❌ employee ${d.employeeId}:`, e.message)
      errors++
    }
  }

  console.log(`✅ พนักงาน: สร้าง/อัป ${created}, ข้าม ${skipped}, error ${errors}`)
  return employeeMap
}

// ── helpers ───────────────────────────────────────────────────────────────────
function buildNote(d: any): string | null {
  const parts: string[] = []
  if (d.status === 'มาสาย (ระดับ 1)')  parts.push('สาย ระดับ 1')
  if (d.status === 'มาสาย (ระดับ 2)')  parts.push('สาย ระดับ 2')
  if (d.status === 'ขาดงาน/สายมาก')   parts.push('สาย ระดับ 2')
  if (d.status === 'นอกพื้นที่')        parts.push('นอกพื้นที่')
  if (d.status === 'ขาดงาน')           parts.push('ขาดงาน')
  if (d.fine > 0)                       parts.push(`ค่าปรับ: ${d.fine}`)
  return parts.length > 0 ? parts.join(' | ') : null
}

// ── step 3: import check-in records ──────────────────────────────────────────
async function migrateCheckins(
  db: FirebaseFirestore.Firestore,
  employeeMap: Map<string, string>,
  branchMap: Map<string, string>,
): Promise<void> {
  const snap = await db.collection('employee_checkin').get()

  let created = 0, skipped = 0, errors = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    const employeeId = employeeMap.get(d.employeeId)
    const branchShifts = BRANCH_SHIFT_MAP[d.branch]
    const shiftId = branchShifts?.[Number(d.shift)]

    if (!employeeId) {
      skipped++
      continue
    }
    if (!shiftId) {
      console.warn(`⚠️  ไม่พบ shift ${d.shift} สำหรับสาขา "${d.branch}" — ข้าม ${d.employeeId} ${d.date}`)
      skipped++
      continue
    }

    const date = parseThaiDate(d.date)

    try {
      await prisma.attendanceRecord.upsert({
        where:  { employee_id_shift_id_date: { employee_id: employeeId, shift_id: shiftId, date } },
        update: {
          check_in_at:     d.timestamp         ? parseThaiDateTime(d.timestamp)         : null,
          check_out_at:    d.checkoutTimestamp  ? parseThaiDateTime(d.checkoutTimestamp) : null,
          is_late:         d.status === 'มาสาย (ระดับ 1)' || d.status === 'มาสาย (ระดับ 2)' || d.status === 'ขาดงาน/สายมาก',
          is_outside_area: d.status === 'นอกพื้นที่',
          note:            buildNote(d),
        },
        create: {
          id:              uuid(),
          tenant_id:       TENANT_ID,
          employee_id:     employeeId,
          shift_id:        shiftId,
          date,
          check_in_at:     d.timestamp         ? parseThaiDateTime(d.timestamp)         : null,
          check_out_at:    d.checkoutTimestamp  ? parseThaiDateTime(d.checkoutTimestamp) : null,
          check_in_method: 'LIFF',
          is_late:         d.status === 'มาสาย (ระดับ 1)' || d.status === 'มาสาย (ระดับ 2)' || d.status === 'ขาดงาน/สายมาก',
          is_outside_area: d.status === 'นอกพื้นที่',
          late_minutes:    0,
          note:            buildNote(d),
        },
      })
      created++
    } catch (e: any) {
      console.error(`❌ checkin ${d.employeeId} ${d.date}:`, e.message)
      errors++
    }
  }

  console.log(`✅ เช็คอิน: สร้าง/อัป ${created}, ข้าม ${skipped}, error ${errors}`)
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 เริ่ม migrate Firebase → MySQL')
  console.log(`   Tenant: ${TENANT_ID}`)

  if (!getApps().length) {
    initializeApp({ credential: cert(SERVICE_ACCOUNT) })
  }
  const db = getFirestore()

  const branchMap   = await buildBranchMap()
  const employeeMap = await migrateEmployees(db, branchMap)
  await migrateCheckins(db, employeeMap, branchMap)

  console.log('\n🎉 migrate เสร็จสิ้น')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
