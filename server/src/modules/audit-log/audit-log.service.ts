// server/src/modules/audit-log/audit-log.service.ts
// รวม feed "กิจกรรมพนักงาน" จาก 2 แหล่ง (feedback 2026-09-28 "admin ดูได้สาขา
// ตัวเอง ว่ามีการเพิ่มลบ แก้ไข หรือแจ้งเตือนอะไรไหม / superadmin ดูล็อคของแต่ละ
// บริษัทได้"):
//   - AuditLog: เพิ่ม/แก้ไข/ลบพนักงาน (เขียนจาก employee.route.ts)
//   - LineMessageLog (recipient_type=EMPLOYEE): แจ้งเตือนที่ส่งถึงพนักงานจริง —
//     ใช้ตารางที่มีอยู่แล้ว ไม่สร้างซ้ำ (เดิมใช้ทำรายงาน "การส่งข้อความไลน์")
// LineMessageLog ไม่ได้เก็บ branch_id ไว้ตรงๆ (เก็บแค่ recipient_id) — resolve
// สาขาแบบ batch จาก Employee ทีเดียว ไม่ join ต่อแถว
import { prisma } from '../../common/utils/prisma'

export interface MergedLogEntry {
  id:          string
  action:      string
  actor_name:  string
  entity_name: string
  message:     string
  branch_id:   string | null
  created_at:  Date
}

// branchId = 'none' → เฉพาะกิจกรรมที่ไม่ผูกสาขา (เช่น บัญชีแอดมินส่วนกลางที่ไม่ได้ผูกกับพนักงาน)
export const NO_BRANCH = 'none'

export async function getMergedAuditFeed(tenantId: string, opts: { branchId?: string; limit?: number } = {}): Promise<MergedLogEntry[]> {
  const limit = opts.limit ?? 50

  const [auditRows, lineRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: { tenant_id: tenantId, ...(opts.branchId ? { branch_id: opts.branchId === NO_BRANCH ? null : opts.branchId } : {}) },
      orderBy: { created_at: 'desc' }, take: limit,
    }),
    prisma.lineMessageLog.findMany({
      where: { tenant_id: tenantId, recipient_type: 'EMPLOYEE' },
      orderBy: { created_at: 'desc' }, take: limit,
    }),
  ])

  const employeeIds = [...new Set(lineRows.map(r => r.recipient_id).filter((v): v is string => !!v))]
  const employees = employeeIds.length
    ? await prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, branch_id: true } })
    : []
  const branchByEmployee = new Map(employees.map(e => [e.id, e.branch_id]))

  const merged: MergedLogEntry[] = [
    ...auditRows.map(r => ({
      id: r.id, action: r.action, actor_name: r.actor_name, entity_name: r.entity_name,
      message: r.message, branch_id: r.branch_id, created_at: r.created_at,
    })),
    ...lineRows
      .map(r => ({
        id: r.id, action: 'NOTIFICATION_SENT', actor_name: 'ระบบ (LINE)', entity_name: r.recipient_label,
        message: `${r.success ? 'ส่งแจ้งเตือน' : 'ส่งแจ้งเตือนไม่สำเร็จ'} "${r.title}" ถึง ${r.recipient_label}`,
        branch_id: r.recipient_id ? (branchByEmployee.get(r.recipient_id) ?? null) : null,
        created_at: r.created_at,
      }))
      .filter(r => !opts.branchId || r.branch_id === (opts.branchId === NO_BRANCH ? null : opts.branchId)),
  ]

  merged.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
  return merged.slice(0, limit)
}
