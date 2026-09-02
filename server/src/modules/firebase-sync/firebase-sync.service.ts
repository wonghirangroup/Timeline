// server/src/modules/firebase-sync/firebase-sync.service.ts
// ซิงค์ข้อมูลจากระบบเก่า (Firebase Firestore) → MySQL รายวัน — bespoke tooling
// สำหรับช่วงที่ tenant ยังใช้ระบบเก่าคู่ขนานกับ TimeLine อยู่ (ยืนยันจริงแล้วว่า
// ยังมีคนกรอกเช็คอิน/วันลาผ่านระบบเก่าต่อเนื่องถึงปัจจุบัน — ดู brain/_LOG_VIEW.txt
// v081-v082) ไม่ใช่ feature ทั่วไปของ SaaS — Super Admin เปิด/ปิดได้ต่อ tenant ผ่าน
// Tenant.firebase_sync_enabled เมื่อไหร่ที่ tenant เลิกใช้ระบบเก่าแล้ว (ย้าย SQL
// เต็มตัว) ให้ปิด toggle นี้ทิ้ง ไม่ต้องลบโค้ด — ปลอดภัยเพราะทุกส่วนออกแบบให้ idempotent
// (leave/holiday: 3-phase reconcile ตรงอยู่แล้ว/แก้/สร้าง, check-in: create-only
// ไม่แตะ record เดิมเลย กันทับการแก้ไขที่แอดมินอาจทำผ่าน TimeLine เอง)
//
// ประวัติ: เดิมเป็นสคริปต์แยก (migrate-firebase-leave.ts, gitignored — รันมือจาก
// เครื่อง dev เท่านั้น) ย้ายมาเป็น service ที่ deploy ไปกับ backend จริงตอนนี้ เพื่อให้
// cron job (server/src/jobs/firebase-sync.job.ts) เรียกอัตโนมัติทุกวันได้
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { v4 as uuid } from 'uuid'
import * as path from 'path'
import { prisma } from '../../common/utils/prisma'

const LEAVE_TYPE_MAP: Record<string, string> = {
  'ลาป่วย':           'SICK',
  'ลากิจ':            'PERSONAL',
  'พักร้อน':          'VACATION',
  'หยุด':             'PERSONAL',        // วันหยุดประจำสัปดาห์ → PERSONAL
  'หยุดนักขัตฤกษ์':  'COMPENSATE',      // หยุดนักขัตฤกษ์ → COMPENSATE
}
const DAY = 24 * 60 * 60 * 1000

const BRANCH_SHIFT_MAP: Record<string, Record<number, string>> = {
  'วงษ์หิรัญ':              { 1: '6e720e67-1f0a-49e6-b97e-d269e3b731ba', 2: '6af8d713-c052-4414-847a-e7caa44fd0bc' },
  'ฟุคุโระ ไนท์สวนหมาก':    { 1: 'b39dc56c-b241-47aa-b1a8-c060f5c9f69b', 2: '7f965bca-e070-457a-9df5-c3eb1d029997' },
  'ฟุคุโระ แม่กิมเฮง':      { 1: '648e7323-4048-4833-a174-067ada9050b0', 2: 'efc9adb5-1fc8-4eaa-97af-aa29b402a2f3' },
  'ฟุคุโระ ตลาดย่าโม':      { 1: 'a0c4bbbe-33db-4a74-86c3-a37eb9555995', 2: '6f6b085e-508b-428f-8204-5693825a1c1c' },
  'ฟุคุโระ เทิดไท':         { 1: '10662a51-2da0-46c9-8741-b394740288dd', 2: '0f4e65f6-60cf-4b6c-8bd9-4253a915d018' },
  'ME Group Enterprise Co,. Ltd.': { 1: '6e720e67-1f0a-49e6-b97e-d269e3b731ba', 2: '6af8d713-c052-4414-847a-e7caa44fd0bc' },
}

let firebaseApp: App | null = null
function getDb(): Firestore {
  if (!getApps().length) {
    // path config ได้ผ่าน env (docker mount ไฟล์เข้า container ตอน deploy) — fallback
    // เป็น path เดิมที่ใช้ตอน dev local (server/firebase-service-account.json)
    const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      || path.join(__dirname, '../../../firebase-service-account.json')
    firebaseApp = initializeApp({ credential: cert(credPath) })
  }
  return getFirestore()
}

function toDateOnly(dateStr: string): Date {
  // "YYYY-MM-DD" → UTC เที่ยงคืนพอดี ไม่มีการ shift ตามเขตเวลา — ตรงกับที่โค้ดส่วน
  // อื่นๆ ของแอปแปลง date-only string กัน (ต่างจากบั๊กเดิมที่แนบ +07:00 แล้วเพี้ยน
  // ถอยหลัง 1 วันเสมอ — ดู brain/_LOG_VIEW.txt v081)
  return new Date(dateStr)
}

export interface LeaveSyncResult {
  alreadyCorrect: number; repaired: number; created: number; leftoverDeleted: number
  skippedUnknown: number; fsDuplicates: number; errors: number
}

async function syncLeave(db: Firestore, tenantId: string): Promise<LeaveSyncResult> {
  const employees = await prisma.employee.findMany({ where: { tenant_id: tenantId }, select: { id: true, employee_code: true } })
  const empMap = new Map(employees.map(e => [e.employee_code, e.id]))

  const existingLeave = await prisma.leaveRequest.findMany({
    where: { tenant_id: tenantId, reason: { in: Object.keys(LEAVE_TYPE_MAP).map(t => `[${t}]`) } },
    select: { id: true, employee_id: true, start_date: true, leave_type: true },
  })
  const currentByGroup = new Map<string, Map<number, string[]>>()
  for (const r of existingLeave) {
    const gk = `${r.employee_id}|${r.leave_type}`
    if (!currentByGroup.has(gk)) currentByGroup.set(gk, new Map())
    const byTime = currentByGroup.get(gk)!
    const t = r.start_date.getTime()
    if (!byTime.has(t)) byTime.set(t, [])
    byTime.get(t)!.push(r.id)
  }

  const targetsByGroup = new Map<string, Set<number>>()
  const typeByGroupTime = new Map<string, Record<string, string>>()
  const seenFs = new Set<string>()
  let skippedUnknown = 0, fsDuplicates = 0

  const snap = await db.collection('employee_leave').get()
  for (const doc of snap.docs) {
    const d = doc.data()
    const employeeId = empMap.get(d.employeeId)
    const leaveType = LEAVE_TYPE_MAP[d.type]
    if (!employeeId || !leaveType) { skippedUnknown++; continue }

    const fsKey = `${employeeId}|${d.date}|${leaveType}`
    if (seenFs.has(fsKey)) { fsDuplicates++; continue }
    seenFs.add(fsKey)

    const gk = `${employeeId}|${leaveType}`
    if (!targetsByGroup.has(gk)) targetsByGroup.set(gk, new Set())
    const t = toDateOnly(d.date).getTime()
    targetsByGroup.get(gk)!.add(t)
    if (!typeByGroupTime.has(gk)) typeByGroupTime.set(gk, {})
    typeByGroupTime.get(gk)![String(t)] = d.type
  }

  let alreadyCorrect = 0, repaired = 0, created = 0, errors = 0, leftoverDeleted = 0

  for (const [gk, targetSet] of targetsByGroup) {
    const [employeeId, leaveType] = gk.split('|')
    const current = currentByGroup.get(gk) ?? new Map<number, string[]>()
    const types = typeByGroupTime.get(gk)!

    // เรียงเป้าหมายจากล่าสุด → เก่าสุดเสมอ กันชนกันตอนคลี่ "โซ่" วันติดกัน (เช่น
    // หยุด 4-5 วันรวด) — ดู brain/_LOG_VIEW.txt v081 บั๊กที่ 2
    const targets = [...targetSet].sort((a, b) => b - a)
    const relevantTimes = new Set<number>()
    for (const t of targets) { relevantTimes.add(t); relevantTimes.add(t - DAY) }

    for (const t of targets) {
      const exactBucket = current.get(t)
      if (exactBucket && exactBucket.length > 0) { exactBucket.pop(); alreadyCorrect++; continue }

      const wrongBucket = current.get(t - DAY)
      if (wrongBucket && wrongBucket.length > 0) {
        const rowId = wrongBucket.pop()!
        try {
          await prisma.leaveRequest.update({ where: { id: rowId }, data: { start_date: new Date(t), end_date: new Date(t) } })
        } catch (e: any) { errors++; continue }
        repaired++
        continue
      }

      try {
        await prisma.leaveRequest.create({
          data: {
            id: uuid(), tenant_id: tenantId, employee_id: employeeId, leave_type: leaveType as any,
            start_date: new Date(t), end_date: new Date(t), days: 1, status: 'APPROVED',
            reviewed_at: new Date(),
            reason: `[${types[String(t)] ?? leaveType}]`,
          },
        })
      } catch (e: any) { errors++; continue }
      created++
    }

    // แถวเกิน/ซ้ำ — เฉพาะเวลาที่ target ใดๆ เคยอ้างถึงจริงเท่านั้น (กันลบ record
    // ที่ไม่เกี่ยวข้องเลย เช่น วันหยุดชื่อพ้องกันปีอื่น — ดู brain/_LOG_VIEW.txt v081 บั๊กที่ 3)
    for (const [t, ids] of current) {
      if (!relevantTimes.has(t)) continue
      for (const id of ids) {
        try { await prisma.leaveRequest.delete({ where: { id } }) } catch (e: any) { errors++; continue }
        leftoverDeleted++
      }
    }
  }

  return { alreadyCorrect, repaired, created, leftoverDeleted, skippedUnknown, fsDuplicates, errors }
}

async function syncHolidays(db: Firestore, tenantId: string): Promise<LeaveSyncResult> {
  const existingHolidays = await prisma.holiday.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true, date: true } })
  const currentByGroup = new Map<string, Map<number, string[]>>()
  for (const h of existingHolidays) {
    if (!currentByGroup.has(h.name)) currentByGroup.set(h.name, new Map())
    const byTime = currentByGroup.get(h.name)!
    const t = h.date.getTime()
    if (!byTime.has(t)) byTime.set(t, [])
    byTime.get(t)!.push(h.id)
  }

  const targetsByName = new Map<string, Set<number>>()
  const snap = await db.collection('public_holidays').get()
  for (const doc of snap.docs) {
    const d = doc.data()
    if (!d.date || !d.title) continue
    if (!targetsByName.has(d.title)) targetsByName.set(d.title, new Set())
    targetsByName.get(d.title)!.add(toDateOnly(d.date).getTime())
  }

  let alreadyCorrect = 0, repaired = 0, created = 0, errors = 0, leftoverDeleted = 0

  for (const [name, targetSet] of targetsByName) {
    const current = currentByGroup.get(name) ?? new Map<number, string[]>()
    const targets = [...targetSet].sort((a, b) => b - a)
    // ชื่อวันหยุดซ้ำกันได้ทุกปี (เช่น "วันรัฐธรรมนูญ" ปีนี้/ปีหน้า) — จำกัด "แถวเกิน"
    // ไว้แค่เวลาที่ target รอบนี้เคยอ้างถึงจริง กันลบวันหยุดปีอื่นที่ชื่อพ้องกันทิ้ง
    const relevantTimes = new Set<number>()
    for (const t of targets) { relevantTimes.add(t); relevantTimes.add(t - DAY) }

    for (const t of targets) {
      const exactBucket = current.get(t)
      if (exactBucket && exactBucket.length > 0) { exactBucket.pop(); alreadyCorrect++; continue }

      const wrongBucket = current.get(t - DAY)
      if (wrongBucket && wrongBucket.length > 0) {
        const rowId = wrongBucket.pop()!
        try { await prisma.holiday.update({ where: { id: rowId }, data: { date: new Date(t) } }) }
        catch (e: any) { errors++; continue }
        repaired++
        continue
      }

      try { await prisma.holiday.create({ data: { id: uuid(), tenant_id: tenantId, name, date: new Date(t), type: 'NATIONAL' } }) }
      catch (e: any) { errors++; continue }
      created++
    }

    for (const [t, ids] of current) {
      if (!relevantTimes.has(t)) continue
      for (const id of ids) {
        try { await prisma.holiday.delete({ where: { id } }) } catch (e: any) { errors++; continue }
        leftoverDeleted++
      }
    }
  }

  return { alreadyCorrect, repaired, created, leftoverDeleted, skippedUnknown: 0, fsDuplicates: 0, errors }
}

export interface CheckinSyncResult { created: number; skippedExisting: number; skippedNoEmp: number; skippedNoShift: number; errors: number }

// create-only เสมอ — ไม่แตะ AttendanceRecord ที่มีอยู่แล้วเลย เพราะแยกไม่ออกว่า
// record ไหนโดนแอดมินแก้เวลาด้วยมือผ่านหน้า "รายงานเช็คชื่อ" ไปแล้วบ้าง (endpoint
// แก้ไข PATCH /admin/attendance/:id ไม่ได้เปลี่ยน check_in_method ตอนแก้ เลยเช็คแยก
// ไม่ได้จาก field นี้) — เขียนทับของเดิมเสี่ยงลบการแก้ไขจริงของแอดมินทิ้งโดยไม่ตั้งใจ
async function syncCheckins(db: Firestore, tenantId: string): Promise<CheckinSyncResult> {
  const employees = await prisma.employee.findMany({ where: { tenant_id: tenantId }, select: { id: true, employee_code: true } })
  const employeeMap = new Map(employees.map(e => [e.employee_code, e.id]))

  const existingRows = await prisma.attendanceRecord.findMany({ where: { tenant_id: tenantId }, select: { employee_id: true, shift_id: true, date: true } })
  const existingKeys = new Set(existingRows.map(r => `${r.employee_id}|${r.shift_id}|${r.date.getTime()}`))

  const snap = await db.collection('employee_checkin').get()
  let created = 0, skippedExisting = 0, skippedNoEmp = 0, skippedNoShift = 0, errors = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    const employeeId = employeeMap.get(d.employeeId)
    const branchShifts = BRANCH_SHIFT_MAP[d.branch]
    const shiftNum = d.shift !== undefined && d.shift !== null ? Number(d.shift) : 1
    const shiftId = branchShifts?.[shiftNum] ?? branchShifts?.[1]

    if (!employeeId) { skippedNoEmp++; continue }
    if (!shiftId) { skippedNoShift++; continue }

    const date = parseThaiDate(d.date)
    const key = `${employeeId}|${shiftId}|${date.getTime()}`
    if (existingKeys.has(key)) { skippedExisting++; continue }

    const hasCheckin  = d.checkinTime  && d.checkinTime  !== '-'
    const hasCheckout = d.checkoutTime && d.checkoutTime !== '-'
    const checkInAt   = hasCheckin  && d.timestamp         ? parseThaiDateTime(d.timestamp)         : null
    const checkOutAt  = hasCheckout && d.checkoutTimestamp ? parseThaiDateTime(d.checkoutTimestamp) : null
    const method       = d.isManual ? 'ADMIN' : 'LIFF'

    try {
      await prisma.attendanceRecord.create({
        data: {
          id: uuid(), tenant_id: tenantId, employee_id: employeeId, shift_id: shiftId, date,
          check_in_at: checkInAt, check_out_at: checkOutAt, check_in_method: method as any,
          is_late: d.status === 'มาสาย (ระดับ 1)' || d.status === 'มาสาย (ระดับ 2)' || d.status === 'ขาดงาน/สายมาก',
          is_outside_area: d.status === 'นอกพื้นที่', late_minutes: 0, note: buildNote(d),
        },
      })
      created++
      existingKeys.add(key) // กัน Firebase doc ซ้ำกันเองภายใน run เดียวกันชนกัน
    } catch (e: any) {
      errors++
    }
  }

  return { created, skippedExisting, skippedNoEmp, skippedNoShift, errors }
}

function parseThaiDateTime(s: any): Date {
  if (typeof s !== 'string') return s?.toDate ? s.toDate() : new Date(s)
  const [datePart, timePart] = s.split(' ')
  return new Date(`${datePart}T${timePart}+07:00`)
}
function parseThaiDate(s: any): Date {
  if (typeof s !== 'string') {
    const dt: Date = s?.toDate ? s.toDate() : new Date(s)
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  }
  const [y, mo, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d))
}
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

export interface FirebaseSyncSummary {
  ranAt: string
  leave: LeaveSyncResult
  holiday: LeaveSyncResult
  checkin: CheckinSyncResult
}

// เรียกจาก cron job รายวัน หรือจาก endpoint "sync ตอนนี้เลย" ของ Super Admin —
// ทำเฉพาะ tenant ที่ระบุ + firebase_sync_enabled=true เท่านั้น (เช็คจาก caller)
export async function runFirebaseSync(tenantId: string): Promise<FirebaseSyncSummary> {
  const db = getDb()
  const leave = await syncLeave(db, tenantId)
  const holiday = await syncHolidays(db, tenantId)
  const checkin = await syncCheckins(db, tenantId)
  return { ranAt: new Date().toISOString(), leave, holiday, checkin }
}
