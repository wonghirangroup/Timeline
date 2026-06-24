/**
 * 2-import-to-mysql.ts
 * ขั้นตอนที่ 2: อ่าน JSON จาก firebase-export/ แล้ว import เข้า MySQL
 *
 * รัน:
 *   npx ts-node src/scripts/2-import-to-mysql.ts
 */

import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4: uuid } = require('uuid')
import * as fs           from 'fs'
import * as path         from 'path'

const prisma  = new PrismaClient()
const IN_DIR  = path.join(__dirname, '../../firebase-export')

// ── ตั้งค่าก่อนรัน ────────────────────────────────────────────────────────────
const TENANT_ID = 'tenant-demo-001'


// map ประเภทลาจาก Firebase → LeaveType enum ใน MySQL
const LEAVE_TYPE_MAP: Record<string, string> = {
  'ลาป่วย':          'SICK',
  'ลากิจ':           'PERSONAL',
  'ลาพักร้อน':       'VACATION',
  'พักร้อน':         'VACATION',   // Firebase ใช้ชื่อย่อ
  'ลาคลอด':         'MATERNITY',
  'ชดเชย':          'COMPENSATE',
  'หยุด':            'PERSONAL',
  'หยุดนักขัตฤกษ์': 'PERSONAL',   // วันหยุดราชการที่พนักงานลา → PERSONAL
}

const LEAVE_STATUS_MAP: Record<string, string> = {
  'Approved': 'APPROVED',
  'Pending':  'PENDING',
  'Rejected': 'REJECTED',
}
// ─────────────────────────────────────────────────────────────────────────────

function readJson(name: string): any[] {
  const file = path.join(IN_DIR, `${name}.json`)
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  ไม่พบ ${file} — ข้ามไป`)
    return []
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function splitName(fullName: string) {
  const parts = (fullName || '').trim().split(/\s+/)
  return { first_name: parts[0] || fullName, last_name: parts.slice(1).join(' ') || '' }
}

/** วันที่เท่านั้น (Date field) — ใช้ UTC midnight เพื่อให้ MySQL เก็บตรง */
function toDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00.000Z')
  return isNaN(d.getTime()) ? null : d
}

/** วันที่ + เวลา (DateTime field) — แปลง +07:00 */
function toUtc(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  const base = dateStr.slice(0, 10)
  const time = timeStr || '00:00:00'
  const d = new Date(`${base}T${time.length === 5 ? time + ':00' : time}+07:00`)
  return isNaN(d.getTime()) ? null : d
}

// ── 0. สร้าง "กะประวัติ" per branch สำหรับ historical import ────────────────
// branchId → shift_id ของกะประวัติ
const HISTORY_SHIFT: Map<string, string> = new Map()

async function buildHistoryShifts(branchMap: Map<string, string>): Promise<void> {
  for (const [branchName, branchId] of branchMap) {
    let shift = await prisma.shift.findFirst({
      where: { branch_id: branchId, name: 'ประวัติ (นำเข้า)', deleted_at: null },
    })
    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          id:        uuid(),
          tenant_id: TENANT_ID,
          branch_id: branchId,
          name:      'ประวัติ (นำเข้า)',
          start_time: '00:00',
          end_time:   '23:59',
          is_active:  false,   // ซ่อนจาก UI ปกติ
        },
      })
      console.log(`   ↳ สร้างกะประวัติ: ${branchName}`)
    }
    HISTORY_SHIFT.set(branchId, shift.id)
  }
  console.log(`✅ กะประวัติ: ${HISTORY_SHIFT.size} สาขา`)
}

// ── 1. map branch name → branch_id ───────────────────────────────────────────
async function buildBranchMap(): Promise<Map<string, string>> {
  const branches = await prisma.branch.findMany({
    where: { tenant_id: TENANT_ID, deleted_at: null },
    select: { id: true, name: true },
  })
  const map = new Map(branches.map(b => [b.name, b.id]))
  console.log(`✅ สาขาใน DB: ${[...map.keys()].join(', ')}`)
  return map
}

// ── 2. import employees ───────────────────────────────────────────────────────
async function importEmployees(branchMap: Map<string, string>): Promise<Map<string, string>> {
  const rows = readJson('employees')
  const empMap = new Map<string, string>()
  let created = 0, updated = 0, skipped = 0

  for (const d of rows) {
    const branchId = branchMap.get(d.branch)
    if (!branchId) {
      console.warn(`  ⚠️  ไม่พบสาขา "${d.branch}" → ข้าม ${d.employeeId}`)
      skipped++; continue
    }

    const { first_name, last_name } = splitName(d.name)

    const emp = await prisma.employee.upsert({
      where:  { tenant_id_employee_code: { tenant_id: TENANT_ID, employee_code: d.employeeId } },
      update: { line_user_id: d.lineUserId || null, nickname: d.nickname || null, phone: d.phone || null },
      create: {
        id:            uuid(),
        tenant_id:     TENANT_ID,
        branch_id:     branchId,
        employee_code: d.employeeId,
        first_name,
        last_name,
        nickname:      d.nickname   || null,
        department:    d.department || null,
        phone:         d.phone      || null,
        line_user_id:  d.lineUserId || null,
        hired_at:      d.joinDate   ? toUtc(d.joinDate) : null,
      },
    }).then(e => { created++; return e })
      .catch(async () => {
        // ถ้า upsert fail ให้ findFirst แทน
        const e = await prisma.employee.findFirst({
          where: { tenant_id: TENANT_ID, employee_code: d.employeeId },
        })
        if (e) { updated++; return e }
        skipped++; return null
      })

    if (emp) empMap.set(d.employeeId, emp.id)
  }

  console.log(`✅ พนักงาน: ${created} สร้าง, ${updated} อัป, ${skipped} ข้าม`)
  return empMap
}

// ── 3. import check-in records ────────────────────────────────────────────────
async function importCheckins(empMap: Map<string, string>) {
  const rows = readJson('employee_checkin')
  let created = 0, skipped = 0, duplicates = 0

  // pre-load employee → branch_id เพื่อไม่ต้อง query ทีละ record
  const empIds = [...empMap.values()]
  const empBranchList = await prisma.employee.findMany({
    where: { id: { in: empIds } },
    select: { id: true, branch_id: true },
  })
  const empBranchMap = new Map(empBranchList.map(e => [e.id, e.branch_id]))

  console.log(`   📋 เช็คอินทั้งหมด: ${rows.length} records — กำลัง insert...`)
  let i = 0
  for (const d of rows) {
    i++
    if (i % 100 === 0) process.stdout.write(`\r   ⏳ ${i}/${rows.length}`)

    const employeeId = empMap.get(d.employeeId)
    if (!employeeId) { skipped++; continue }

    const branchId = empBranchMap.get(employeeId)
    const shiftId  = branchId ? HISTORY_SHIFT.get(branchId) : undefined
    if (!shiftId) { skipped++; continue }

    const date       = toDate(d.date)
    if (!date) { skipped++; continue }

    const checkInAt  = d.checkinTime  ? toUtc(d.date, d.checkinTime)  : null
    const checkOutAt = d.checkoutTime ? toUtc(d.date, d.checkoutTime) : null

    try {
      await prisma.attendanceRecord.create({
        data: {
          id:              uuid(),
          tenant_id:       TENANT_ID,
          employee_id:     employeeId,
          shift_id:        shiftId,
          date,
          check_in_at:     checkInAt,
          check_out_at:    checkOutAt,
          check_in_method: 'LIFF',
          is_late:         d.status?.includes('มาสาย') ?? false,
          late_minutes:    0,
          note:            [
            d.status && d.status !== 'มาปกติ' ? d.status : null,
            d.fine > 0 ? `ค่าปรับ: ${d.fine}` : null,
          ].filter(Boolean).join(' | ') || null,
        },
      })
      created++
    } catch (e: any) {
      if (e.code === 'P2002') { duplicates++; continue } // ซ้ำ — ข้ามเงียบๆ
      console.error(`  ❌ checkin ${d.employeeId} ${d.date}: ${e.message}`)
      skipped++
    }
  }

  console.log(`✅ เช็คอิน: ${created} สร้าง, ${duplicates} ซ้ำ(ข้าม/อัป), ${skipped} ข้าม`)
}

// ── 4. import leave requests ──────────────────────────────────────────────────
async function importLeaves(empMap: Map<string, string>) {
  const rows = readJson('employee_leave')
  let created = 0, skipped = 0, errors = 0

  for (const d of rows) {
    const employeeId = empMap.get(d.employeeId)
    if (!employeeId) { skipped++; continue }

    const leaveType   = LEAVE_TYPE_MAP[d.type]
    const leaveStatus = LEAVE_STATUS_MAP[d.status] || 'PENDING'

    if (!leaveType) {
      console.warn(`  ⚠️  ประเภทลา "${d.type}" ไม่รู้จัก → ข้าม ${d.employeeId} ${d.date}`)
      skipped++; continue
    }

    const date = toDate(d.date)

    try {
      // ใช้ eventId จาก Firebase เป็น key ตรวจสอบ (เก็บใน note)
      const existing = await prisma.leaveRequest.findFirst({
        where: { employee_id: employeeId, start_date: date, leave_type: leaveType as any },
      })
      const STANDARD_TYPES = ['ลาป่วย','ลากิจ','ลาพักร้อน','ลาคลอด']
      const reason = STANDARD_TYPES.includes(d.type)
        ? `นำเข้าจากระบบเก่า (${d.eventId})`
        : `[${d.type}] นำเข้าจากระบบเก่า (${d.eventId})`

      if (!existing) {
        await prisma.leaveRequest.create({
          data: {
            id:          uuid(),
            tenant_id:   TENANT_ID,
            employee_id: employeeId,
            leave_type:  leaveType as any,
            start_date:  date,
            end_date:    date,
            days:        1,
            status:      leaveStatus as any,
            reason,
            created_at:  d.createdAt ? new Date(d.createdAt) : new Date(),
          },
        })
        created++
      } else {
        // อัป reason ให้ตรงกับประเภทเดิมจาก Firebase
        await prisma.leaveRequest.update({
          where: { id: existing.id },
          data:  { reason },
        })
        skipped++
      }
    } catch (e: any) {
      console.error(`  ❌ leave ${d.employeeId} ${d.date}: ${e.message}`)
      errors++
    }
  }

  console.log(`✅ วันลา: ${created} สร้าง, ${skipped} ข้าม, ${errors} error`)
}

// ── 5. import public holidays ─────────────────────────────────────────────────
async function importHolidays() {
  const rows = readJson('public_holidays')
  let created = 0, skipped = 0

  for (const d of rows) {
    const date = toUtc(d.date || d.Date)
    const name = d.name || d.Name || d.title || 'วันหยุดนักขัตฤกษ์'

    const existing = await prisma.holiday.findFirst({
      where: { tenant_id: TENANT_ID, date },
    })
    if (!existing) {
      await prisma.holiday.create({
        data: { id: uuid(), tenant_id: TENANT_ID, name, date, type: 'NATIONAL' },
      }).then(() => created++).catch(() => skipped++)
    } else {
      skipped++
    }
  }

  console.log(`✅ วันหยุดนักขัตฤกษ์: ${created} สร้าง, ${skipped} ข้าม`)
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 เริ่ม import Firebase JSON → MySQL')
  console.log(`   Tenant: ${TENANT_ID}\n`)

  if (!fs.existsSync(IN_DIR)) {
    console.error('❌ ไม่พบ folder firebase-export/')
    console.error('   รัน step 1 ก่อน: node src/scripts/1-export-firebase.js')
    process.exit(1)
  }

  const branchMap = await buildBranchMap()
  const empMap    = await importEmployees(branchMap)

  console.log()
  await buildHistoryShifts(branchMap)
  await importCheckins(empMap)
  await importLeaves(empMap)
  await importHolidays()

  console.log('\n🎉 import เสร็จสิ้น')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
