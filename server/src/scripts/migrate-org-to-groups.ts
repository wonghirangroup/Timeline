/**
 * migrate-org-to-groups.ts
 * Re-seed ผังองค์กรหลัง migration 20260826145758_group_layer_and_org_restructure
 * (ตาราง departments/divisions/sections/positions เดิมถูก DROP ไปตอน migrate เพราะ
 * โครงสร้างเปลี่ยนความหมาย — สคริปต์นี้สร้างของใหม่ตาม mapping ที่บันทึกไว้จากข้อมูลเดิม)
 *
 * Mapping (ตรวจสอบจากข้อมูลจริงก่อน migrate):
 *   เก่า Department (4 แถว, ใหญ่สุด)  → ใหม่ Division (ฝ่าย)
 *   เก่า Division (2 แถว, ลูก Dept)   → ใหม่ Department (แผนก) ใต้ Division ที่แม็พมา
 *   เก่า Section "โกดัง" (ลูก Division "ขายหน้าร้าน") → ตัดออก (ไม่มีชั้นนี้แล้ว)
 *   เก่า Position "แคชเชียร์" (ลูก Section "โกดัง")   → ใหม่ Position ใต้ Department "ขายหน้าร้าน" ตรงๆ
 *
 * ทุก tenant ได้ Group เริ่มต้น 1 กลุ่ม (ชื่อ = ชื่อ tenant) คุม branch ทุกสาขาของ tenant นั้น
 * ไปก่อน — แยกกลุ่มจริงตาม usecase (เช่น "วงษ์" vs "สมาร์ทจิ๊กซอว์") เป็นงานของ Phase 2/
 * admin ทำเองทีหลังผ่านหน้า "จัดการกลุ่ม" ใหม่
 *
 * รัน: npx tsx src/scripts/migrate-org-to-groups.ts   (DRY_RUN=1 เพื่อดูก่อนไม่เขียนจริง)
 */
import { PrismaClient } from '@prisma/client'
import { v4 as uuid } from 'uuid'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN === '1'

// employee_id เก่า (record ที่ถูกปิดใช้งานไปแล้วช่วงเช้านี้) → employee_id ใหม่ (ตัวจริง)
// ที่ต้องได้ position เดียวกันด้วย เพราะ Position "แคชเชียร์" เดิมผูกอยู่กับ record เก่า
const CONSOLIDATE_POSITION_TO = new Map<string, string>([
  ['18770129-33d8-43d2-823e-5dbf1ead03a5', '649113b1-9693-444c-a842-1a5b16fafaae'], // จิรพงศ์ เก่า→ใหม่
  ['b5d09f19-de85-4fd1-ab6f-62cd591df452', 'b5298b31-5ae9-4696-9f4e-7c859e3adbd6'], // กิตตินันท์ เก่า→ใหม่
])

async function main() {
  console.log('🚀 Re-seed ผังองค์กร (Group→Division→Department→Position)')
  console.log(DRY_RUN ? '   (DRY RUN)' : '   (LIVE RUN)')

  const tenants = await prisma.tenant.findMany({ where: { deleted_at: null } })

  for (const tenant of tenants) {
    const branches = await prisma.branch.findMany({ where: { tenant_id: tenant.id, deleted_at: null, group_id: null } })
    if (branches.length === 0) { console.log(`- ${tenant.name}: ไม่มีสาขาที่ยังไม่มีกลุ่ม ข้าม`); continue }

    console.log(`\n=== ${tenant.name} (${tenant.id}) — ${branches.length} สาขา ===`)
    let groupId = 'DRY_RUN_GROUP_ID'
    if (!DRY_RUN) {
      const group = await prisma.group.create({
        data: { id: uuid(), tenant_id: tenant.id, name: tenant.name, booking_enabled: true },
      })
      groupId = group.id
      await prisma.branch.updateMany({ where: { id: { in: branches.map(b => b.id) }, tenant_id: tenant.id }, data: { group_id: groupId } })
    }
    console.log(`  ✅ สร้างกลุ่มเริ่มต้น "${tenant.name}" (${groupId}) ผูก ${branches.length} สาขา:`, branches.map(b => b.name).join(', '))

    // เฉพาะ tenant-demo-001 มีข้อมูลผังองค์กรเดิมจริงที่ต้อง remap (เช็คแล้วก่อน migrate)
    if (tenant.id !== 'tenant-demo-001') continue

    const divisionMap: Record<string, string> = {
      'ออฟฟิศ': 'DRY_RUN', 'พนักงานขนส่ง': 'DRY_RUN', 'บริหาร': 'DRY_RUN', 'พนักงานขาย': 'DRY_RUN',
    }
    if (!DRY_RUN) {
      for (const name of Object.keys(divisionMap)) {
        const d = await prisma.division.create({ data: { id: uuid(), tenant_id: tenant.id, group_id: groupId, name } })
        divisionMap[name] = d.id
      }
    }
    console.log('  ✅ สร้าง Division (ฝ่าย):', Object.keys(divisionMap).join(', '))

    // เก่า Division "ขายหน้าร้าน"/"cashvan" → ใหม่ Department ใต้ฝ่ายที่แม็พมา
    const departmentMap: Record<string, string> = {
      'ขายหน้าร้าน': 'DRY_RUN', // เดิมลูกของ Dept "พนักงานขาย"
      'cashvan':      'DRY_RUN', // เดิมลูกของ Dept "พนักงานขนส่ง"
    }
    if (!DRY_RUN) {
      departmentMap['ขายหน้าร้าน'] = (await prisma.department.create({
        data: { id: uuid(), tenant_id: tenant.id, division_id: divisionMap['พนักงานขาย'], name: 'ขายหน้าร้าน' },
      })).id
      departmentMap['cashvan'] = (await prisma.department.create({
        data: { id: uuid(), tenant_id: tenant.id, division_id: divisionMap['พนักงานขนส่ง'], name: 'cashvan' },
      })).id
    }
    console.log('  ✅ สร้าง Department (แผนก): ขายหน้าร้าน (ใต้พนักงานขาย), cashvan (ใต้พนักงานขนส่ง)')

    // เก่า Position "แคชเชียร์" (เดิมอยู่ใต้ Section "โกดัง" ใต้ Division "ขายหน้าร้าน") →
    // ใหม่ผูกตรงกับ Department "ขายหน้าร้าน" เลย (ตัด Section ออก)
    let positionId = 'DRY_RUN'
    if (!DRY_RUN) {
      positionId = (await prisma.position.create({
        data: { id: uuid(), tenant_id: tenant.id, department_id: departmentMap['ขายหน้าร้าน'], name: 'แคชเชียร์' },
      })).id
    }
    console.log('  ✅ สร้าง Position: แคชเชียร์ (ใต้ขายหน้าร้าน, ตัด Section "โกดัง" ออก)')

    // เซ็ต employee.position_id ใหม่ — ให้ทั้ง record เก่า (เผื่อมีคนอ้างถึง) และ record ใหม่
    // (ตัวจริงหลัง consolidate เช้านี้) ชี้ไป position เดียวกัน
    const targetEmployeeIds = [...CONSOLIDATE_POSITION_TO.keys(), ...CONSOLIDATE_POSITION_TO.values()]
    if (!DRY_RUN) {
      await prisma.employee.updateMany({
        where: { id: { in: targetEmployeeIds }, tenant_id: tenant.id },
        data: { position_id: positionId },
      })
    }
    console.log(`  ✅ ผูก position_id ให้ ${targetEmployeeIds.length} employee (จิรพงศ์/กิตตินันท์ ทั้ง record เก่า+ใหม่):`, targetEmployeeIds.join(', '))
  }

  console.log('\n🎉 เสร็จสิ้น')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
