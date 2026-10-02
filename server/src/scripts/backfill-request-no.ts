// เติมเลขที่คำขอ (request_no) ย้อนหลังให้แถวที่ยังเป็น null — เรียงตาม created_at ต่อ tenant/ประเภท/ปี
// ใช้ nextRequestNo() ตัวเดียวกับโค้ดจริง (ตัวนับ atomic) จึงรันซ้ำได้/รันขนานกับระบบที่กำลังออกเลขใหม่ได้ไม่ชนกัน
// รัน: node dist/scripts/backfill-request-no.js
import { prisma } from '../common/utils/prisma'
import { nextRequestNo, REQUEST_PREFIX } from '../common/utils/requestNo'

const MODELS = ['documentRequest', 'leaveRequest', 'otRequest', 'resignationRequest', 'weeklyOffRequest', 'offsiteCheckin'] as const

async function main() {
  for (const model of MODELS) {
    const delegate = (prisma as any)[model]
    const rows: { id: string; tenant_id: string; created_at: Date }[] = await delegate.findMany({
      where: { request_no: null },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      select: { id: true, tenant_id: true, created_at: true },
    })
    for (const r of rows) {
      const no = await nextRequestNo(r.tenant_id, REQUEST_PREFIX[model], r.created_at)
      await delegate.update({ where: { id: r.id }, data: { request_no: no } })
    }
    console.log(`${model}: เติม ${rows.length} แถว`)
  }
  await prisma.$disconnect()
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
