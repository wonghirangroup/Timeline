// server/src/modules/notifications/notifications.service.ts
// รวมทุก "สิ่งที่แอดมินควรรู้/ต้องจัดการ" มาไว้ในกระดิ่งเดียว
//   - คำขอรออนุมัติ (ลา / OT / ลาออก / วันหยุดประจำสัปดาห์)
//   - พนักงานตำแหน่งเดียวกันลา/จองวันหยุดทับกัน  (has_conflict)
//   - เช็คอินในวันที่จองวันหยุดไว้เอง (รอ HR resolve)
//   - เอกสารใกล้หมดอายุ / ครบกำหนดทดลองงาน (ตาม feature ที่เปิด)
//   - การสลับวันหยุดกันระหว่าง 2 คน (ล่าสุด — informational)
// scopedEmployeeIds: undefined = เห็นทั้ง tenant, array = DEPT_HEAD เห็นเฉพาะแผนกที่ดูแล
import { prisma } from '../../common/utils/prisma'
import { isFeatureEnabled } from '../../common/utils/features'
import { listExpiringDocuments, listProbationDue } from '../hr-lifecycle/hr-lifecycle.service'
import { listWorkedOnOwnDayOffAlerts } from '../weekly-off/weekly-off.service'

export type NotifSeverity = 'action' | 'warn' | 'info'

export interface NotifItem {
  id: string            // `<kind>:<rowId>` — stable, ใช้ track อ่านแล้ว/ยังฝั่ง client
  kind: string
  severity: NotifSeverity
  title: string
  detail: string
  link: string          // route ในแอดมิน — กดแล้วไปหน้านั้น + โฟกัสรายการ/พนักงาน
  employee_id?: string
  employee_name?: string
  at: string            // ISO
}

const EMP_SELECT = {
  select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true },
} as const

const LEAVE_LABEL: Record<string, string> = {
  SICK: 'ลาป่วย', PERSONAL: 'ลากิจ', VACATION: 'ลาพักร้อน',
  MATERNITY: 'ลาคลอด', COMPENSATE: 'หยุดชดเชย', OTHER: 'ลา (อื่นๆ)',
}
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function empName(e: { first_name: string; last_name: string; nickname: string | null }) {
  return e.nickname ? `${e.first_name} (${e.nickname})` : `${e.first_name} ${e.last_name}`
}
function d(dt: Date) {
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })
}

export async function listAdminNotifications(tenantId: string, scopedEmployeeIds?: string[]) {
  const empScope = scopedEmployeeIds ? { employee_id: { in: scopedEmployeeIds } } : {}
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { enabled_features: true } })
  const feat = (k: any) => isFeatureEnabled(tenant?.enabled_features, k)

  const since = new Date(Date.now() - 7 * 864e5) // 7 วันย้อนหลัง สำหรับ event ที่ไม่มี "resolved"

  const [
    pendingLeave, pendingOt, pendingResign, pendingWeeklyOff,
    workedOwnOff, swaps,
    expiringDocs, probationDue,
  ] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { tenant_id: tenantId, status: 'PENDING', ...empScope },
      include: { employee: EMP_SELECT }, orderBy: { created_at: 'desc' }, take: 40,
    }),
    prisma.otRequest.findMany({
      where: { tenant_id: tenantId, status: 'PENDING', ...empScope },
      include: { employee: EMP_SELECT }, orderBy: { created_at: 'desc' }, take: 40,
    }),
    prisma.resignationRequest.findMany({
      where: { tenant_id: tenantId, status: 'PENDING', ...empScope },
      include: { employee: EMP_SELECT }, orderBy: { created_at: 'desc' }, take: 20,
    }),
    prisma.weeklyOffRequest.findMany({
      where: { tenant_id: tenantId, status: 'PENDING', ...empScope },
      include: { employee: EMP_SELECT }, orderBy: { created_at: 'desc' }, take: 40,
    }),
    listWorkedOnOwnDayOffAlerts(tenantId, scopedEmployeeIds, 30),
    prisma.weeklyOffSwap.findMany({
      where: { tenant_id: tenantId, created_at: { gte: since } },
      orderBy: { created_at: 'desc' }, take: 10,
    }),
    feat('employee_documents') ? listExpiringDocuments(tenantId, 45, scopedEmployeeIds).catch(() => []) : Promise.resolve([]),
    feat('probation') ? listProbationDue(tenantId, 14, scopedEmployeeIds).catch(() => []) : Promise.resolve([]),
  ])

  const items: NotifItem[] = []

  for (const r of pendingLeave) {
    items.push({
      id: `leave:${r.id}`, kind: 'pending_leave',
      severity: r.has_conflict ? 'warn' : 'action',
      title: r.has_conflict ? 'ใบลา — ตำแหน่งเดียวกันลาทับ' : 'ใบลารออนุมัติ',
      detail: `${empName(r.employee)} · ${LEAVE_LABEL[r.leave_type] ?? r.leave_type} ${d(r.start_date)}${
        r.end_date > r.start_date ? `–${d(r.end_date)}` : ''}${r.has_conflict ? ' · ⚠ ทับกับคนตำแหน่งเดียวกัน' : ''}`,
      link: `/leave?tab=requests&approve=${r.id}`,
      employee_id: r.employee.id, employee_name: empName(r.employee),
      at: r.created_at.toISOString(),
    })
  }

  for (const r of pendingOt) {
    items.push({
      id: `ot:${r.id}`, kind: 'pending_ot', severity: 'action',
      title: 'คำขอ OT รออนุมัติ',
      detail: `${empName(r.employee)} · ${d(r.date)} ${r.start_time}–${r.end_time} (${Number(r.hours)} ชม.)`,
      link: `/ot?approve=${r.id}`,
      employee_id: r.employee.id, employee_name: empName(r.employee),
      at: r.created_at.toISOString(),
    })
  }

  for (const r of pendingResign) {
    items.push({
      id: `resign:${r.id}`, kind: 'pending_resignation', severity: 'action',
      title: 'คำขอลาออกรอพิจารณา',
      detail: `${empName(r.employee)} · วันทำงานสุดท้าย ${d(r.last_working_date)}`,
      link: `/resignations?approve=${r.id}`,
      employee_id: r.employee.id, employee_name: empName(r.employee),
      at: r.created_at.toISOString(),
    })
  }

  for (const r of pendingWeeklyOff) {
    items.push({
      id: `weeklyoff:${r.id}`, kind: 'pending_weekly_off',
      severity: r.has_conflict ? 'warn' : 'action',
      title: r.has_conflict ? 'จองวันหยุด — ตำแหน่งเดียวกันจองทับ' : 'จองวันหยุดรออนุมัติ',
      detail: `${empName(r.employee)} · หยุดวัน${DOW[r.day_of_week]} สัปดาห์ ${d(r.week_start)}${
        r.has_conflict ? ' · ⚠ ทับกับคนตำแหน่งเดียวกัน' : ''}`,
      link: `/leave?tab=time-off&focus=${r.id}`,
      employee_id: r.employee.id, employee_name: empName(r.employee),
      at: r.created_at.toISOString(),
    })
  }

  for (const a of workedOwnOff) {
    items.push({
      id: `workedoff:${a.id}`, kind: 'worked_on_own_day_off', severity: 'action',
      title: 'เช็คอินในวันที่จองวันหยุดไว้เอง',
      detail: `${empName(a.employee)} · ${d(a.date)} — เลือกเลื่อนวันหยุด หรือให้วันชดเชย`,
      link: `/leave?tab=time-off&worked=${a.id}`,
      employee_id: a.employee.id, employee_name: empName(a.employee),
      at: a.date.toISOString(),
    })
  }

  if (swaps.length) {
    // รวมชื่อคู่สลับให้อ่านง่าย (เก็บ id แบบ loose — ต้อง lookup ชื่อเอง)
    const ids = [...new Set(swaps.flatMap(s => [s.employee_a_id, s.employee_b_id]))]
    const emps = await prisma.employee.findMany({ where: { id: { in: ids } }, ...EMP_SELECT })
    const byId = new Map(emps.map(e => [e.id, e]))
    for (const s of swaps) {
      const a = byId.get(s.employee_a_id), b = byId.get(s.employee_b_id)
      items.push({
        id: `swap:${s.id}`, kind: 'weekly_off_swap', severity: 'info',
        title: 'สลับวันหยุดกันแล้ว',
        detail: `${a ? empName(a) : '?'} ⇄ ${b ? empName(b) : '?'} · ${d(s.created_at)}`,
        link: `/leave?tab=time-off`,
        at: s.created_at.toISOString(),
      })
    }
  }

  for (const doc of expiringDocs as any[]) {
    const e = doc.employee
    items.push({
      id: `doc:${doc.id}`, kind: 'expiring_document', severity: 'warn',
      title: 'เอกสารพนักงานใกล้/หมดอายุ',
      detail: `${empName(e)} · ${doc.name}${doc.expiry_date ? ` — หมดอายุ ${d(new Date(doc.expiry_date))}` : ''}`,
      link: `/employee/${e.id}?tab=hr`,
      employee_id: e.id, employee_name: empName(e),
      at: (doc.expiry_date ? new Date(doc.expiry_date) : new Date()).toISOString(),
    })
  }

  for (const emp of probationDue as any[]) {
    items.push({
      id: `probation:${emp.id}`, kind: 'probation_due', severity: 'warn',
      title: 'ครบกำหนดทดลองงาน',
      detail: `${empName(emp)} · ครบ ${emp.probation_end_date ? d(new Date(emp.probation_end_date)) : ''} — ยังไม่บันทึกผล`,
      link: `/employee/${emp.id}?tab=hr`,
      employee_id: emp.id, employee_name: empName(emp),
      at: (emp.probation_end_date ? new Date(emp.probation_end_date) : new Date()).toISOString(),
    })
  }

  const RANK: Record<NotifSeverity, number> = { action: 0, warn: 1, info: 2 }
  items.sort((x, y) => RANK[x.severity] - RANK[y.severity] || (x.at < y.at ? 1 : -1))

  return {
    items,
    count: items.filter(i => i.severity === 'action').length,
    warn_count: items.filter(i => i.severity === 'warn').length,
  }
}
