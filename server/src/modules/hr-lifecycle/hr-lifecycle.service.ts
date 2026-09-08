// server/src/modules/hr-lifecycle/hr-lifecycle.service.ts
// HR lifecycle add-ons (Tier A): เอกสารพนักงาน / ทดลองงาน / หนังสือเตือน / ลาออก
// แต่ละอันเป็น feature ที่ Super Admin เปิด/ปิดต่อ tenant ได้ (ดู common/utils/features.ts)
import { prisma } from '../../common/utils/prisma'
import { bangkokToday, bangkokAddDays } from '../../common/utils/time'
import { changeEmployeeStatus } from '../employee/employee.service'

// ── helper: ตรวจว่า employeeId อยู่ใน scope ของ DEPT_HEAD ──────────────────
function assertScope(employeeId: string, scoped?: string[]) {
  if (scoped && !scoped.includes(employeeId)) throw new Error('OUT_OF_SCOPE')
}

// ═══ เอกสารพนักงาน ═══════════════════════════════════════════════════════════
export const DOC_TYPES = ['CONTRACT', 'ID_CARD', 'HOUSE_REG', 'WORK_PERMIT', 'VISA', 'LICENSE', 'CERT', 'OTHER'] as const

export async function listEmployeeDocuments(tenantId: string, employeeId: string, scoped?: string[]) {
  assertScope(employeeId, scoped)
  return prisma.employeeDocument.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: [{ expiry_date: 'asc' }, { created_at: 'desc' }],
  })
}

export async function createEmployeeDocument(tenantId: string, data: {
  employee_id: string; type: string; name: string; file_url: string
  issued_date?: string | null; expiry_date?: string | null; note?: string | null; uploaded_by?: string
}, scoped?: string[]) {
  assertScope(data.employee_id, scoped)
  return prisma.employeeDocument.create({
    data: {
      tenant_id: tenantId, employee_id: data.employee_id, type: data.type, name: data.name, file_url: data.file_url,
      issued_date: data.issued_date ? new Date(data.issued_date) : null,
      expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
      note: data.note ?? null, uploaded_by: data.uploaded_by ?? null,
    },
  })
}

export async function updateEmployeeDocument(tenantId: string, id: string, data: {
  type?: string; name?: string; file_url?: string; issued_date?: string | null; expiry_date?: string | null; note?: string | null
}) {
  const doc = await prisma.employeeDocument.findFirst({ where: { id, tenant_id: tenantId } })
  if (!doc) return null
  return prisma.employeeDocument.update({
    where: { id },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.file_url !== undefined ? { file_url: data.file_url } : {}),
      ...(data.issued_date !== undefined ? { issued_date: data.issued_date ? new Date(data.issued_date) : null } : {}),
      ...(data.expiry_date !== undefined ? { expiry_date: data.expiry_date ? new Date(data.expiry_date) : null } : {}),
      ...(data.note !== undefined ? { note: data.note } : {}),
    },
  })
}

export async function deleteEmployeeDocument(tenantId: string, id: string) {
  const count = await prisma.employeeDocument.deleteMany({ where: { id, tenant_id: tenantId } })
  return count.count > 0
}

// เอกสารที่ใกล้หมดอายุ/หมดแล้ว — สำหรับการ์ดเตือนบน Dashboard (default หน้าต่าง 45 วัน)
export async function listExpiringDocuments(tenantId: string, withinDays = 45, scoped?: string[]) {
  const cutoff = bangkokAddDays(bangkokToday(), withinDays)
  const docs = await prisma.employeeDocument.findMany({
    where: {
      tenant_id: tenantId,
      expiry_date: { not: null, lte: cutoff },
      employee: { deleted_at: null, status: 'ACTIVE', ...(scoped ? { id: { in: scoped } } : {}) },
    },
    orderBy: { expiry_date: 'asc' },
    include: { employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true } } },
    take: 100,
  })
  const today = bangkokToday()
  return docs.map(d => ({
    id: d.id, type: d.type, name: d.name,
    expiry_date: d.expiry_date!.toISOString().slice(0, 10),
    days_left: Math.round((d.expiry_date!.getTime() - today.getTime()) / 86400000),
    employee: d.employee,
  }))
}

// ═══ ทดลองงาน (probation) ══════════════════════════════════════════════════
export async function setProbation(tenantId: string, employeeId: string, data: {
  probation_end_date?: string | null
  probation_result?: 'PASS' | 'FAIL' | null
  probation_note?: string | null
}, scoped?: string[]) {
  assertScope(employeeId, scoped)
  const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenant_id: tenantId, deleted_at: null } })
  if (!emp) return null
  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(data.probation_end_date !== undefined ? { probation_end_date: data.probation_end_date ? new Date(data.probation_end_date) : null } : {}),
      ...(data.probation_result !== undefined ? { probation_result: data.probation_result } : {}),
      ...(data.probation_note !== undefined ? { probation_note: data.probation_note } : {}),
    },
  })
}

// พนักงานที่ครบทดลองงานภายใน N วัน และยังไม่ได้ประเมิน — การ์ดเตือน Dashboard
export async function listProbationDue(tenantId: string, withinDays = 14, scoped?: string[]) {
  const cutoff = bangkokAddDays(bangkokToday(), withinDays)
  const emps = await prisma.employee.findMany({
    where: {
      tenant_id: tenantId, deleted_at: null, status: 'ACTIVE',
      probation_end_date: { not: null, lte: cutoff },
      probation_result: null,
      ...(scoped ? { id: { in: scoped } } : {}),
    },
    orderBy: { probation_end_date: 'asc' },
    select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, probation_end_date: true },
    take: 100,
  })
  const today = bangkokToday()
  return emps.map(e => ({
    id: e.id, first_name: e.first_name, last_name: e.last_name, nickname: e.nickname, employee_code: e.employee_code,
    probation_end_date: e.probation_end_date!.toISOString().slice(0, 10),
    days_left: Math.round((e.probation_end_date!.getTime() - today.getTime()) / 86400000),
  }))
}

// ═══ หนังสือเตือน (disciplinary) ═══════════════════════════════════════════
export const DISC_CATEGORIES = ['LATE', 'ABSENCE', 'MISCONDUCT', 'PERFORMANCE', 'SAFETY', 'OTHER'] as const

export async function listDisciplinary(tenantId: string, employeeId: string, scoped?: string[]) {
  assertScope(employeeId, scoped)
  return prisma.disciplinaryRecord.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: { incident_date: 'desc' },
  })
}

export async function createDisciplinary(tenantId: string, data: {
  employee_id: string; level: number; category: string; detail: string
  incident_date: string; issued_by?: string; attachment_url?: string | null
}, scoped?: string[]) {
  assertScope(data.employee_id, scoped)
  return prisma.disciplinaryRecord.create({
    data: {
      tenant_id: tenantId, employee_id: data.employee_id, level: data.level, category: data.category,
      detail: data.detail, incident_date: new Date(data.incident_date),
      issued_by: data.issued_by ?? null, attachment_url: data.attachment_url ?? null,
    },
  })
}

export async function updateDisciplinary(tenantId: string, id: string, data: {
  level?: number; category?: string; detail?: string; incident_date?: string; attachment_url?: string | null
}) {
  const rec = await prisma.disciplinaryRecord.findFirst({ where: { id, tenant_id: tenantId } })
  if (!rec) return null
  return prisma.disciplinaryRecord.update({
    where: { id },
    data: {
      ...(data.level !== undefined ? { level: data.level } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.detail !== undefined ? { detail: data.detail } : {}),
      ...(data.incident_date !== undefined ? { incident_date: new Date(data.incident_date) } : {}),
      ...(data.attachment_url !== undefined ? { attachment_url: data.attachment_url } : {}),
    },
  })
}

export async function deleteDisciplinary(tenantId: string, id: string) {
  const count = await prisma.disciplinaryRecord.deleteMany({ where: { id, tenant_id: tenantId } })
  return count.count > 0
}

// LIFF: พนักงานดูหนังสือเตือนของตัวเอง + กดรับทราบ
export async function listOwnDisciplinary(tenantId: string, employeeId: string) {
  return prisma.disciplinaryRecord.findMany({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: { incident_date: 'desc' },
    select: { id: true, level: true, category: true, detail: true, incident_date: true, acknowledged_at: true, created_at: true },
  })
}

export async function acknowledgeDisciplinary(tenantId: string, id: string, employeeId: string) {
  const count = await prisma.disciplinaryRecord.updateMany({
    where: { id, tenant_id: tenantId, employee_id: employeeId, acknowledged_at: null },
    data: { acknowledged_at: new Date() },
  })
  return count.count > 0
}

// ═══ ลาออก (resignation) ═══════════════════════════════════════════════════
export async function listResignations(tenantId: string, filters: { status?: string; scoped?: string[] }) {
  return prisma.resignationRequest.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.scoped ? { employee_id: { in: filters.scoped } } : {}),
    },
    orderBy: { created_at: 'desc' },
    include: { employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true, branch: { select: { name: true } } } } },
  })
}

// LIFF: พนักงานยื่นลาออก (กันยื่นซ้ำถ้ามี PENDING ค้าง)
export async function createResignation(tenantId: string, data: {
  employee_id: string; reason?: string | null; last_working_date: string
}) {
  const existing = await prisma.resignationRequest.findFirst({
    where: { tenant_id: tenantId, employee_id: data.employee_id, status: 'PENDING' },
  })
  if (existing) throw new Error('ALREADY_PENDING')
  return prisma.resignationRequest.create({
    data: {
      tenant_id: tenantId, employee_id: data.employee_id,
      reason: data.reason ?? null, last_working_date: new Date(data.last_working_date),
    },
  })
}

export async function getOwnResignation(tenantId: string, employeeId: string) {
  return prisma.resignationRequest.findFirst({
    where: { tenant_id: tenantId, employee_id: employeeId },
    orderBy: { created_at: 'desc' },
  })
}

// แอดมินอนุมัติ → set Employee.status = RESIGNED (ใช้กลไก changeEmployeeStatus เดิม
// ที่เขียน EmployeeStatusLog ให้อยู่แล้ว)
export async function reviewResignation(tenantId: string, id: string, data: {
  approve: boolean; reviewed_by: string; reject_note?: string
}, scoped?: string[]) {
  const req = await prisma.resignationRequest.findFirst({ where: { id, tenant_id: tenantId } })
  if (!req || req.status !== 'PENDING') return null
  if (scoped && !scoped.includes(req.employee_id)) throw new Error('OUT_OF_SCOPE')

  const updated = await prisma.resignationRequest.update({
    where: { id },
    data: {
      status: data.approve ? 'APPROVED' : 'REJECTED',
      reviewed_by: data.reviewed_by, reviewed_at: new Date(),
      reject_note: data.approve ? null : (data.reject_note ?? null),
    },
  })
  if (data.approve) {
    await changeEmployeeStatus(tenantId, req.employee_id, {
      to_status: 'RESIGNED',
      reason: `ลาออก (วันสุดท้าย ${req.last_working_date.toISOString().slice(0, 10)})${req.reason ? ` — ${req.reason}` : ''}`,
      changed_by: data.reviewed_by,
    })
  }
  return updated
}
