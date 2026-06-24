/**
 * 3-seed-branches.ts
 * สร้าง Branch + Shift จาก Firebase data เข้า MySQL
 *
 * รัน: npx ts-node src/scripts/3-seed-branches.ts
 */

import { PrismaClient } from '@prisma/client'
const { v4: uuid } = require('uuid')

const prisma    = new PrismaClient()
const TENANT_ID = 'tenant-demo-001'

function parseGps(gps: string): { lat: number; lng: number } | null {
  if (!gps) return null
  const [lat, lng] = gps.split(',').map(s => parseFloat(s.trim()))
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng }
}

const BRANCHES = [
  {
    name: 'วงษ์หิรัญ',
    address: 'X4X9+QG ตำบล หมื่นไวย อำเภอเมืองนครราชสีมา นครราชสีมา',
    gps: '14.999537444372937, 102.11878106968074',
    shift1: { start: '08:00', end: '18:00', checkout: '17:55', late1: '08:05', late2: '08:30' },
    shift2: null,
  },
  {
    name: 'ฟุคุโระ แม่กิมเฮง',
    address: '173 ถ. สุรนารี ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000',
    gps: '14.976407395813236, 102.0953132316107',
    shift1: { start: '08:00', end: '18:00', checkout: '18:00', late1: '08:10', late2: '08:30' },
    shift2: { start: '09:00', end: '20:00', checkout: '19:45', late1: '10:30', late2: '10:30' },
  },
  {
    name: 'ฟุคุโระ ตลาดย่าโม',
    address: 'X3GH+PMW ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา 30000',
    gps: '14.976832134706047, 102.07916957731089',
    shift1: { start: '08:00', end: '18:00', checkout: '18:00', late1: '08:10', late2: '08:30' },
    shift2: { start: '09:00', end: '20:00', checkout: '20:00', late1: '10:30', late2: '10:45' },
  },
  {
    name: 'ฟุคุโระ ไนท์สวนหมาก',
    address: 'X4F3+X5 เทศบาลนครนครราชสีมา ตำบลในเมือง อำเภอเมืองนครราชสีมา นครราชสีมา',
    gps: '14.974972994415765, 102.10291351231294',
    shift1: { start: '08:00', end: '18:00', checkout: '18:00', late1: '08:10', late2: '08:30' },
    shift2: { start: '09:00', end: '20:00', checkout: '19:05', late1: '10:15', late2: '10:45' },
  },
  {
    name: 'ME Group Enterprise Co,. Ltd.',
    address: '1229 Village No.4, ตำบล หนองจะบก อำเภอเมืองนครราชสีมา 30000',
    gps: '14.903636572326823, 102.05622238037202',
    shift1: { start: '09:00', end: '17:00', checkout: '16:00', late1: '09:05', late2: '09:30' },
    shift2: null,
  },
  {
    name: 'ฟุคุโระ เทิดไท',
    address: 'X22F+4FQ ถ. มิตรภาพ ตำบล บ้านใหม่ อำเภอเมืองนครราชสีมา นครราชสีมา 30000',
    gps: '14.950237609471293, 102.02364502865764',
    shift1: { start: '08:00', end: '18:00', checkout: '18:00', late1: '08:10', late2: '08:30' },
    shift2: { start: '09:00', end: '20:00', checkout: '20:00', late1: '10:30', late2: '11:30' },
  },
]

async function main() {
  console.log('🚀 สร้าง Branch + Shift สำหรับ tenant:', TENANT_ID, '\n')

  for (const b of BRANCHES) {
    const gps = parseGps(b.gps)

    // upsert branch
    const existing = await prisma.branch.findFirst({
      where: { tenant_id: TENANT_ID, name: b.name, deleted_at: null },
    })

    const branch = existing ?? await prisma.branch.create({
      data: {
        id:        uuid(),
        tenant_id: TENANT_ID,
        name:      b.name,
        location:  b.address,
        lat:       gps?.lat ?? null,
        lng:       gps?.lng ?? null,
        gps_radius: 200,
      },
    })

    const status = existing ? '(มีอยู่แล้ว)' : '(สร้างใหม่)'
    console.log(`✅ ${b.name} ${status}`)

    // สร้าง shift 1
    const shift1Exists = await prisma.shift.findFirst({
      where: { branch_id: branch.id, name: 'กะ 1', deleted_at: null },
    })
    if (!shift1Exists && b.shift1) {
      await prisma.shift.create({
        data: {
          id:              uuid(),
          tenant_id:       TENANT_ID,
          branch_id:       branch.id,
          name:            'กะ 1',
          start_time:      b.shift1.start,
          end_time:        b.shift1.end,
          min_checkout:    b.shift1.checkout,
          late_threshold_1: b.shift1.late1,
          late_threshold_2: b.shift1.late2,
        },
      })
      console.log(`   ↳ กะ 1: ${b.shift1.start}–${b.shift1.end}`)
    }

    // สร้าง shift 2 (ถ้ามี)
    if (b.shift2) {
      const shift2Exists = await prisma.shift.findFirst({
        where: { branch_id: branch.id, name: 'กะ 2', deleted_at: null },
      })
      if (!shift2Exists) {
        await prisma.shift.create({
          data: {
            id:              uuid(),
            tenant_id:       TENANT_ID,
            branch_id:       branch.id,
            name:            'กะ 2',
            start_time:      b.shift2.start,
            end_time:        b.shift2.end,
            min_checkout:    b.shift2.checkout,
            late_threshold_1: b.shift2.late1,
            late_threshold_2: b.shift2.late2,
          },
        })
        console.log(`   ↳ กะ 2: ${b.shift2.start}–${b.shift2.end}`)
      }
    }
  }

  console.log('\n🎉 เสร็จสิ้น — พร้อมรัน 2-import-to-mysql.ts')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
