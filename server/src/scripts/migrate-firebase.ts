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
  // "ME Group Enterprise Co,. Ltd." ไม่ใช่ branch จริงแยกต่างหากใน MySQL —
  // เป็นแค่ tag สาขาที่สองของพนักงานคนเดียว (68-02-004 จิรพงศ์ ศรีอำไพ,
  // สาขาหลัก วงษ์หิรัญ, branches: [วงษ์หิรัญ, ME Group...]) เลย map ไปที่
  // กะเดียวกับวงษ์หิรัญแทนการสร้าง Branch/Shift ปลอมใหม่
  'ME Group Enterprise Co,. Ltd.': { 1: '6e720e67-1f0a-49e6-b97e-d269e3b731ba', 2: '6af8d713-c052-4414-847a-e7caa44fd0bc' },
}

// ── helpers ───────────────────────────────────────────────────────────────────
function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  return {
    first_name: parts[0]            || fullName,
    last_name:  parts.slice(1).join(' ') || '',
  }
}

/** "2025-12-30 09:50:59" หรือ Firestore Timestamp → Date object */
function parseThaiDateTime(s: any): Date {
  if (typeof s !== 'string') {
    return s?.toDate ? s.toDate() : new Date(s)
  }
  const [datePart, timePart] = s.split(' ')
  return new Date(`${datePart}T${timePart}+07:00`)
}

function parseThaiDate(s: any): Date {
  if (typeof s !== 'string') {
    // Firestore Timestamp object
    const dt: Date = s?.toDate ? s.toDate() : new Date(s)
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  }
  const [y, mo, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d))
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

// รหัสพนักงาน (เช่น "69-03-008") บางครั้งฝั่ง Firebase เอากลับมาใช้ซ้ำเมื่อคนเก่า
// ลาออกแล้วรับคนใหม่เข้ามาแทนรหัสเดิม — ถ้า upsert โดยจับคู่แค่ employee_code
// อย่างเดียว จะไปทับ record ของคนเก่าโดยไม่รู้ตัว (นามสกุล/สาขาเป็นของคนเก่า
// แต่ nickname/เบอร์/Line กลายเป็นของคนใหม่ — ข้อมูลปนกัน)
// ป้องกันด้วยการ "บวกเลขต่อท้ายไปเรื่อยๆ" จนกว่าจะเจอรหัสที่ว่างจริงในระบบ
function nextAvailableCode(baseCode: string, usedCodes: Set<string>): string {
  if (!usedCodes.has(baseCode)) return baseCode
  const m = baseCode.match(/^(.*-)(\d+)$/)
  if (!m) {
    // รูปแบบรหัสไม่ตรง pattern "xxx-NNN" — fallback ต่อท้ายด้วย -2, -3, ...
    let n = 2
    while (usedCodes.has(`${baseCode}-${n}`)) n++
    return `${baseCode}-${n}`
  }
  const [, prefix, numStr] = m
  let n = Number(numStr) + 1
  const width = numStr.length
  while (usedCodes.has(`${prefix}${String(n).padStart(width, '0')}`)) n++
  return `${prefix}${String(n).padStart(width, '0')}`
}

// ── step 2: import employees ──────────────────────────────────────────────────
async function migrateEmployees(
  db: FirebaseFirestore.Firestore,
  branchMap: Map<string, string>,
): Promise<Map<string, string>> {
  const snap = await db.collection('employees').get()
  const employeeMap = new Map<string, string>() // employeeId → MySQL id

  const existing = await prisma.employee.findMany({
    where: { tenant_id: TENANT_ID },
    select: { id: true, employee_code: true, line_user_id: true },
  })
  const usedCodes = new Set(existing.map(e => e.employee_code))
  const byLineUserId = new Map(existing.filter(e => e.line_user_id).map(e => [e.line_user_id as string, e]))
  const byCode = new Map(existing.map(e => [e.employee_code, e]))

  let created = 0, updated = 0, splitNewCode = 0, errors = 0

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
      // จับคู่ "คนเดิมจริงๆ" ด้วย line_user_id ก่อน (identity ที่เชื่อถือได้กว่า
      // employee_code เพราะรหัสถูกรีไซเคิลได้) ถ้าไม่มี/ไม่เจอ ค่อย fallback ไปดูว่า
      // employee_code นี้ถูกใช้อยู่แล้วโดยคนอื่น (รหัสถูกรีไซเคิล) หรือว่าง
      const matchByLine = d.lineUserId ? byLineUserId.get(d.lineUserId) : undefined
      const codeOwner    = byCode.get(d.employeeId)
      const codeCollides = codeOwner && matchByLine && codeOwner.id !== matchByLine.id
      const codeTakenByOther = !matchByLine && codeOwner && codeOwner.line_user_id && codeOwner.line_user_id !== d.lineUserId

      const targetId = matchByLine?.id ?? (codeTakenByOther ? undefined : codeOwner?.id)
      const employeeCode = (matchByLine && codeCollides) || codeTakenByOther
        ? nextAvailableCode(d.employeeId, usedCodes)   // รหัสชนกับคนอื่น → บวกรหัสใหม่ให้คนนี้
        : d.employeeId

      const data = {
        branch_id:     branchId,
        first_name,
        last_name,
        nickname:      d.nickname   || null,
        department:    d.department || null,
        phone:         d.phone      || null,
        line_user_id:  d.lineUserId || null,
        hired_at:      d.joinDate ? parseThaiDate(d.joinDate) : null,
      }

      let emp
      if (targetId) {
        emp = await prisma.employee.update({ where: { id: targetId }, data })
        updated++
      } else {
        emp = await prisma.employee.create({
          data: { id: uuid(), tenant_id: TENANT_ID, employee_code: employeeCode, ...data },
        })
        created++
        if (employeeCode !== d.employeeId) {
          splitNewCode++
          console.warn(`🔀 รหัส ${d.employeeId} ถูกใช้แล้วโดยคนอื่น (${codeOwner?.id}) — สร้าง "${d.name}" ด้วยรหัสใหม่ ${employeeCode} แทน (ควรตรวจ record เดิมของรหัส ${d.employeeId} ว่ายังใช่คนเดิมไหม)`)
        }
      }
      usedCodes.add(employeeCode)
      employeeMap.set(d.employeeId, emp.id)
    } catch (e: any) {
      console.error(`❌ employee ${d.employeeId}:`, e.message)
      errors++
    }
  }

  console.log(`✅ พนักงาน: สร้างใหม่ ${created} (ในนั้นรหัสชนแล้วแยกใหม่ ${splitNewCode}), อัปเดตของเดิม ${updated}, error ${errors}`)
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
  if (d.status === 'วันหยุด')          parts.push('วันหยุด')
  if (d.status === 'พักร้อน')          parts.push('พักร้อน')
  if (d.status === 'ลากิจ')            parts.push('ลากิจ')
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
    // fallback to shift 1 (กะเช้า) when shift field is undefined/null
    const shiftNum = d.shift !== undefined && d.shift !== null ? Number(d.shift) : 1
    const shiftId = branchShifts?.[shiftNum] ?? branchShifts?.[1]

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

    // "timestamp" ใน Firebase ไม่ใช่เวลาเช็คอินเสมอไป — สำหรับ record ที่เป็น
    // placeholder (isManual/isAutoAbsent เช่น status ขาดงาน/วันหยุด/พักร้อน/ลากิจ)
    // checkinTime/checkoutTime จะเป็น "-" และ timestamp คือเวลาที่ record ถูก
    // สร้าง/แก้ (audit metadata) ไม่ใช่เวลาเข้า-ออกงานจริง ต้องเช็ค checkinTime/
    // checkoutTime ก่อนเสมอ ไม่งั้นจะได้ check_in_at ปลอมที่พนักงานไม่ได้เช็คอินจริง
    const hasCheckin  = d.checkinTime  && d.checkinTime  !== '-'
    const hasCheckout = d.checkoutTime && d.checkoutTime !== '-'
    const checkInAt   = hasCheckin  && d.timestamp         ? parseThaiDateTime(d.timestamp)         : null
    const checkOutAt  = hasCheckout && d.checkoutTimestamp ? parseThaiDateTime(d.checkoutTimestamp) : null
    const method       = d.isManual ? 'ADMIN' : 'LIFF'

    try {
      await prisma.attendanceRecord.upsert({
        where:  { employee_id_shift_id_date: { employee_id: employeeId, shift_id: shiftId, date } },
        update: {
          check_in_at:     checkInAt,
          check_out_at:    checkOutAt,
          check_in_method: method,
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
          check_in_at:     checkInAt,
          check_out_at:    checkOutAt,
          check_in_method: method,
          is_late:         d.status === 'มาสาย (ระดับ 1)' || d.status === 'มาสาย (ระดับ 2)' || d.status === 'ขาดงาน/สายมาก',
          is_outside_area: d.status === 'นอกพื้นที่',
          late_minutes:    0,
          note:            buildNote(d),
        },
      })
      created++
    } catch (e: any) {
      // unique constraint = duplicate (timezone mismatch with existing records) — skip silently
      if (e.code === 'P2002' || (e.message as string).includes('Unique constraint')) {
        skipped++
      } else {
        console.error(`❌ checkin ${d.employeeId} ${d.date}:`, e.message)
        errors++
      }
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
