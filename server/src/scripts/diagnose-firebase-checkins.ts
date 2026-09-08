// server/src/scripts/diagnose-firebase-checkins.ts
// hardening D5a — จัดหมวด employee_checkin ใน Firebase ที่ syncCheckins ข้าม (skippedNoEmp/NoShift)
// รันครั้งเดียวเพื่อดูว่าอันไหน "คนจริงที่เช็คอินหาย" (ต้องตามแก้) vs seed/คนออก/ขยะ (ปล่อยได้)
//
//   cd server && npx tsx src/scripts/diagnose-firebase-checkins.ts
//   (ต้องมี firebase-service-account.json — รันบน VPS หรือ dell ที่มีไฟล์ cred)
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { PrismaClient } from '@prisma/client'
import * as path from 'path'

const prisma = new PrismaClient()
const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.join(__dirname, '../../firebase-service-account.json')
const TENANT_ID = process.env.DIAG_TENANT_ID || 'tenant-demo-001'

// ต้อง sync กับ firebase-sync.service.ts
const FIREBASE_CODE_ALIAS: Record<string, string> = { '68-02-004': '68-02-005', '69-02-002': '69-02-004', '69-04-004': '69-04-002' }
const KNOWN_BRANCHES = new Set([
  'วงษ์หิรัญ', 'ฟุคุโระ ไนท์สวนหมาก', 'ฟุคุโระ แม่กิมเฮง', 'ฟุคุโระ ตลาดย่าโม',
  'ฟุคุโระ เทิดไท', 'ME Group Enterprise Co,. Ltd.',
])

function fmt(n: number, total: number) {
  return `${String(n).padStart(5)} (${((n / total) * 100).toFixed(1)}%)`
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(SERVICE_ACCOUNT) })
  const db = getFirestore()

  const employees = await prisma.employee.findMany({
    where: { tenant_id: TENANT_ID },
    select: { id: true, employee_code: true, deleted_at: true, first_name: true, last_name: true },
  })
  const activeByCode = new Map(employees.filter(e => !e.deleted_at).map(e => [e.employee_code, e]))
  const deletedByCode = new Map(employees.filter(e => e.deleted_at).map(e => [e.employee_code, e]))

  const snap = await db.collection('employee_checkin').get()

  const cat: Record<string, number> = {
    total: 0, matchActive: 0, matchViaAlias: 0,
    noEmp_deletedRecordExists: 0, noEmp_codeUnknown: 0,
    noShift_branchUnknown: 0, noShift_branchKnownButNoMap: 0,
  }
  const unknownCodes = new Map<string, { count: number; firstDate: string; lastDate: string }>()
  const unknownBranches = new Map<string, number>()
  const deletedHits = new Map<string, { name: string; count: number; firstDate: string; lastDate: string }>()

  for (const doc of snap.docs) {
    const d = doc.data()
    cat.total++
    const rawCode = d.employeeId as string
    const aliased = FIREBASE_CODE_ALIAS[rawCode]
    const code = aliased ?? rawCode

    if (activeByCode.has(code)) {
      cat.matchActive++
      if (aliased) cat.matchViaAlias++
      continue
    }

    // ไม่ match active — จัดหมวดว่าทำไม
    const del = deletedByCode.get(code)
    if (del) {
      cat.noEmp_deletedRecordExists++
      const key = code
      const prev = deletedHits.get(key)
      const dateStr = String(d.date ?? '')
      if (!prev) deletedHits.set(key, { name: `${del.first_name} ${del.last_name}`, count: 1, firstDate: dateStr, lastDate: dateStr })
      else {
        prev.count++
        if (dateStr < prev.firstDate) prev.firstDate = dateStr
        if (dateStr > prev.lastDate) prev.lastDate = dateStr
      }
    } else {
      cat.noEmp_codeUnknown++
      const ds = String(d.date ?? '')
      const prev = unknownCodes.get(rawCode)
      if (!prev) unknownCodes.set(rawCode, { count: 1, firstDate: ds, lastDate: ds })
      else { prev.count++; if (ds < prev.firstDate) prev.firstDate = ds; if (ds > prev.lastDate) prev.lastDate = ds }
    }

    // แยกดูปัญหา branch/shift ด้วย (เผื่ออันที่ code ใช้ได้แต่ไป fail ที่ shift)
    const br = String(d.branch ?? '')
    if (!br) cat.noShift_branchUnknown++
    else if (!KNOWN_BRANCHES.has(br)) {
      cat.noShift_branchKnownButNoMap++
      unknownBranches.set(br, (unknownBranches.get(br) ?? 0) + 1)
    }
  }

  const t = cat.total
  console.log('\n═══ Firebase employee_checkin — ' + t + ' docs ═══')
  console.log('  match active employee    :', fmt(cat.matchActive, t), cat.matchViaAlias ? `(ผ่าน alias ${cat.matchViaAlias})` : '')
  console.log('  ─ skippedNoEmp ─')
  console.log('  code = พนักงานที่ถูกลบแล้ว :', fmt(cat.noEmp_deletedRecordExists, t), '← ตามแก้ด้วย alias/repair')
  console.log('  code ไม่รู้จักเลย          :', fmt(cat.noEmp_codeUnknown, t), '← seed/คนออกก่อน migrate/ขยะ')
  console.log('  ─ branch (อาจซ้อนกับด้านบน) ─')
  console.log('  branch ว่าง               :', fmt(cat.noShift_branchUnknown, t))
  console.log('  branch ไม่อยู่ใน MAP       :', fmt(cat.noShift_branchKnownButNoMap, t))

  if (deletedHits.size) {
    console.log('\n── code ที่ชนพนักงานที่ถูกลบ (ผู้ต้องสงสัย employee-code-swap) ──')
    for (const [code, v] of [...deletedHits.entries()].sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  ${code}  ${v.name.padEnd(24)}  ${String(v.count).padStart(4)} รายการ  ${v.firstDate} → ${v.lastDate}`)
    }
  }
  if (unknownCodes.size) {
    console.log('\n── code ที่ไม่รู้จักเลย (เรียงตามวันล่าสุด — ล่าสุดใกล้ปัจจุบัน = อาจเป็นคนจริงที่ตกหล่น) ──')
    for (const [code, v] of [...unknownCodes.entries()].sort((a, b) => (a[1].lastDate < b[1].lastDate ? 1 : -1))) {
      console.log(`  ${code}  ${String(v.count).padStart(4)} รายการ  ${v.firstDate} → ${v.lastDate}`)
    }
  }
  if (unknownBranches.size) {
    console.log('\n── branch ที่ไม่อยู่ใน BRANCH_SHIFT_MAP ──')
    for (const [br, n] of [...unknownBranches.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  "${br}"  ${String(n).padStart(4)} รายการ`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
