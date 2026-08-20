// server/src/modules/weekly-off/weekly-off-period.service.ts
import { prisma } from '../../common/utils/prisma'
import { lineMulticast } from '../announcement/announcement.service'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
function fmtMonthTH(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_TH[m - 1]} ${y + 543}`
}

export async function listPeriods(tenantId: string, month: string) {
  // ดึง periods ที่มีอยู่
  const periods = await prisma.weeklyOffPeriod.findMany({
    where: { tenant_id: tenantId, month },
    include: { branch: { select: { id: true, name: true } } },
  })

  // ดึงสาขาทั้งหมดของ tenant
  const branches = await prisma.branch.findMany({
    where: { tenant_id: tenantId, deleted_at: null, is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // รวม: สาขาที่ยังไม่มี period → is_open = false (ยังไม่ได้เปิด)
  return branches.map(b => {
    const period = periods.find(p => p.branch_id === b.id)
    return period ?? {
      id: null,
      tenant_id: tenantId,
      branch_id: b.id,
      month,
      is_open: false,
      deadline: null,
      note: null,
      branch: b,
    }
  })
}

export async function openPeriod(tenantId: string, data: {
  branch_id: string; month: string; deadline?: string | null; note?: string | null
}) {
  const existing = await prisma.weeklyOffPeriod.findUnique({
    where: { tenant_id_branch_id_month: { tenant_id: tenantId, branch_id: data.branch_id, month: data.month } },
  })
  // เพิ่งเปิดจริง (ปิดอยู่ก่อน หรือยังไม่เคยมี record เลย) — ใช้ตัดสินว่าต้องแจ้งเตือน
  // Line ไหม กันไม่ให้ spam ทุกครั้งที่ admin แค่แก้ deadline/note ของช่วงที่เปิดอยู่แล้ว
  const justOpened = !existing?.is_open

  const period = await prisma.weeklyOffPeriod.upsert({
    where: { tenant_id_branch_id_month: { tenant_id: tenantId, branch_id: data.branch_id, month: data.month } },
    create: {
      tenant_id:  tenantId,
      branch_id:  data.branch_id,
      month:      data.month,
      is_open:    true,
      deadline:   data.deadline ? new Date(data.deadline) : null,
      note:       data.note ?? null,
    },
    update: {
      is_open:  true,
      deadline: data.deadline !== undefined ? (data.deadline ? new Date(data.deadline) : null) : undefined,
      note:     data.note !== undefined ? data.note : undefined,
    },
    include: { branch: { select: { id: true, name: true } } },
  })

  return { period, justOpened }
}

// ── แจ้งเตือน Line เมื่อเปิดจองวันหยุดใหม่ — ส่งลิงก์เปิดตรงไปหน้าจองในแอป ──────
// ไม่ throw ออกไปเลย (แค่ log/return error info) กันไม่ให้การเปิดจองล้มเหลวเพราะ Line ส่งไม่ได้
export async function notifyPeriodOpened(tenantId: string, branchId: string, month: string) {
  console.log(`[notifyPeriodOpened] start tenant=${tenantId} branch=${branchId} month=${month}`)
  const lineConfig = await prisma.tenantLineConfig.findUnique({
    where: { tenant_id: tenantId },
    select: { line_channel_access_token: true, line_liff_id: true },
  })
  if (!lineConfig?.line_channel_access_token || !lineConfig.line_liff_id) {
    console.log('[notifyPeriodOpened] no LINE config — skipped')
    return { error: 'LINE ยังไม่ได้ตั้งค่าไว้' }
  }

  const branch = await prisma.branch.findFirst({ where: { id: branchId, tenant_id: tenantId }, select: { name: true } })

  const employees = await prisma.employee.findMany({
    where: { tenant_id: tenantId, branch_id: branchId, line_user_id: { not: null }, deleted_at: null, is_active: true },
    select: { line_user_id: true },
  })
  const lineUserIds = employees.map(e => e.line_user_id!)
  console.log(`[notifyPeriodOpened] branch=${branch?.name} recipients=${lineUserIds.length}`)
  if (lineUserIds.length === 0) return { sent: 0 }

  // liff.state = path จริงในแอปที่จะเปิดหลัง LIFF init เสร็จ (มาตรฐาน LIFF deep-link)
  // ใส่ lid ต่อท้ายด้วยเพราะแอปฝั่ง employee อ่าน LIFF ID จาก query ?lid= เป็นหลัก
  // (sessionStorage มักหายไปตอนเปิด LIFF รอบใหม่จากลิงก์ข้อความ ไม่ใช่จากในแอปเดิม)
  const targetPath = `/leave?tab=booking&lid=${lineConfig.line_liff_id}`
  const url = `https://liff.line.me/${lineConfig.line_liff_id}?liff.state=${encodeURIComponent(targetPath)}`

  const message = `📅 เปิดจองวันหยุดประจำเดือน ${fmtMonthTH(month)} แล้ว\nสาขา: ${branch?.name ?? ''}\n\nกดลิงก์เพื่อจองวันหยุดได้เลย\n${url}`

  try {
    const result = await lineMulticast(lineConfig.line_channel_access_token, lineUserIds, message)
    console.log(`[notifyPeriodOpened] sent ok:`, JSON.stringify(result))
    return result
  } catch (err: any) {
    console.error(`[notifyPeriodOpened] LINE send FAILED:`, err.message)
    return { error: err.message }
  }
}

export async function closePeriod(tenantId: string, branchId: string, month: string) {
  const count = await prisma.weeklyOffPeriod.updateMany({
    where: { tenant_id: tenantId, branch_id: branchId, month },
    data:  { is_open: false },
  })
  return count.count > 0
}

export async function updatePeriod(tenantId: string, id: string, data: {
  is_open?: boolean; deadline?: string | null; note?: string | null
}) {
  const count = await prisma.weeklyOffPeriod.updateMany({
    where: { id, tenant_id: tenantId },
    data: {
      ...(data.is_open !== undefined ? { is_open: data.is_open } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(data.deadline) : null } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  })
  return count.count > 0
}

// Employee: เช็คว่า period เปิดอยู่ไหม
export async function checkPeriodOpen(tenantId: string, branchId: string, month: string): Promise<boolean> {
  const period = await prisma.weeklyOffPeriod.findUnique({
    where: { tenant_id_branch_id_month: { tenant_id: tenantId, branch_id: branchId, month } },
  })
  if (!period || !period.is_open) return false
  if (period.deadline && new Date() > period.deadline) return false
  return true
}
