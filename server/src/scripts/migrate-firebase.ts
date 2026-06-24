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

// map เลข shift จาก Firebase → shift_id ใน MySQL
// แก้ตรงนี้ให้ตรงกับ shift จริงใน DB
// วิธีดู: SELECT id, name FROM shifts WHERE tenant_id = 'tenant-demo-001';
const SHIFT_MAP: Record<number, string> = {
  1: 'SHIFT_ID_FOR_1',   // ← แทนด้วย UUID จริง
  2: 'SHIFT_ID_FOR_2',   // ← แทนด้วย UUID จริง
  3: 'SHIFT_ID_FOR_3',   // ← แทนด้วย UUID จริง (ถ้ามี)
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
    const shiftId    = SHIFT_MAP[Number(d.shift)]

    if (!employeeId) {
      // พนักงานไม่มีใน DB (อาจถูก skip ตอน migrate employees)
      skipped++
      continue
    }
    if (!shiftId || shiftId.startsWith('SHIFT_ID_FOR')) {
      console.warn(`⚠️  shift ${d.shift} ยังไม่ได้ map — ข้าม ${d.employeeId} วันที่ ${d.date}`)
      skipped++
      continue
    }

    const date = parseThaiDate(d.date)

    try {
      await prisma.attendanceRecord.upsert({
        where:  { employee_id_shift_id_date: { employee_id: employeeId, shift_id: shiftId, date } },
        update: {
          check_in_at:  d.timestamp    ? parseThaiDateTime(d.timestamp)        : null,
          check_out_at: d.checkoutTimestamp ? parseThaiDateTime(d.checkoutTimestamp) : null,
          is_late:      d.status === 'มาสาย',
          note:         d.fine > 0 ? `ค่าปรับ: ${d.fine}` : null,
        },
        create: {
          id:              uuid(),
          tenant_id:       TENANT_ID,
          employee_id:     employeeId,
          shift_id:        shiftId,
          date,
          check_in_at:     d.timestamp    ? parseThaiDateTime(d.timestamp)        : null,
          check_out_at:    d.checkoutTimestamp ? parseThaiDateTime(d.checkoutTimestamp) : null,
          check_in_method: 'LIFF',
          is_late:         d.status === 'มาสาย',
          late_minutes:    0,
          note:            d.fine > 0 ? `ค่าปรับ: ${d.fine}` : null,
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
