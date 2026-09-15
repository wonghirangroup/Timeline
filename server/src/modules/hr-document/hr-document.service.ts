// server/src/modules/hr-document/hr-document.service.ts
// เอกสาร HR ที่แอดมินสร้างในระบบ (สลิปเงินเดือน/หนังสือรับรองเงินเดือน/ใบลาออก) —
// feedback 2026-09-15: เทมเพลตที่แอดมินใช้จริงนอกระบบ (Word) ดึงข้อมูลพนักงาน/บริษัทที่
// มีอยู่แล้วมาเติมอัตโนมัติ ส่วนตัวเลขการเงินแอดมินกรอกเองเสมอ (ระบบไม่มีข้อมูลการเงิน)
// บันทึกเป็น snapshot ถาวร (เก็บไว้จริง มีเลขที่เอกสาร + ประวัติย้อนหลัง — ตามที่ยืนยัน)
import { prisma } from '../../common/utils/prisma'

export const HR_DOC_TYPES = ['PAYSLIP', 'SALARY_CERT', 'RESIGNATION_LETTER'] as const
export type HrDocType = (typeof HR_DOC_TYPES)[number]

// ข้อมูลตั้งต้นให้ฟอร์มสร้างเอกสาร — ส่วนที่ระบบมีอยู่แล้ว (เติมอัตโนมัติ) แยกจาก
// ส่วนที่ไม่มี (แอดมินกรอกเอง) ชัดเจนที่ฝั่ง frontend
export async function getDocData(tenantId: string, employeeId: string, type: HrDocType) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenant_id: tenantId, deleted_at: null },
    select: {
      id: true, employee_code: true, first_name: true, last_name: true, nickname: true,
      hired_at: true,
      position: { select: { name: true } },
      branch: { select: { name: true } },
    },
  })
  if (!employee) return null

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, deleted_at: null },
    select: { name: true, address: true, tax_id: true, logo_url: true, signer_name: true, signer_title: true },
  })

  const suggested_doc_number = (type === 'PAYSLIP' || type === 'SALARY_CERT')
    ? await nextDocNumber(tenantId, type)
    : null

  return {
    employee: {
      id: employee.id,
      employee_code: employee.employee_code,
      full_name: `${employee.first_name} ${employee.last_name}`,
      nickname: employee.nickname,
      position_name: employee.position?.name ?? null,
      branch_name: employee.branch?.name ?? null,
      hired_at: employee.hired_at,
    },
    tenant,
    suggested_doc_number,
  }
}

// เลขที่เอกสาร รูปแบบ HR-<ปี ค.ศ.><ลำดับ 3 หลัก> นับจากจำนวนเอกสารประเภทเดียวกันที่
// ออกไปแล้วในปีนั้นของ tenant นี้ — แค่ "แนะนำ" แอดมินแก้เองได้ก่อนบันทึก ไม่ใช่ตัวนับ
// atomic (ชนกันได้ถ้าสร้างพร้อมกันเป๊ะๆ แต่โอกาสเกิดน้อยมากสำหรับเครื่องมือแอดมินภายใน)
export async function nextDocNumber(tenantId: string, type: HrDocType) {
  const year = new Date().getFullYear()
  const start = new Date(Date.UTC(year, 0, 1))
  const end   = new Date(Date.UTC(year + 1, 0, 1))
  const count = await prisma.hrDocument.count({
    where: { tenant_id: tenantId, type, created_at: { gte: start, lt: end } },
  })
  return `HR-${year}${String(count + 1).padStart(3, '0')}`
}

export async function createHrDocument(tenantId: string, userId: string, input: {
  employee_id: string
  type: HrDocType
  doc_number?: string | null
  period?: string | null
  document_request_id?: string | null
  data: Record<string, unknown>
}, scoped?: string[]) {
  const employee = await prisma.employee.findFirst({ where: { id: input.employee_id, tenant_id: tenantId, deleted_at: null } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')
  if (scoped && !scoped.includes(employee.id)) throw new Error('OUT_OF_SCOPE')

  if (input.document_request_id) {
    const reqRow = await prisma.documentRequest.findFirst({ where: { id: input.document_request_id, tenant_id: tenantId } })
    if (!reqRow) throw new Error('REQUEST_NOT_FOUND')
  }

  return prisma.hrDocument.create({
    data: {
      tenant_id: tenantId,
      employee_id: input.employee_id,
      type: input.type,
      doc_number: input.doc_number ?? null,
      period: input.period ?? null,
      document_request_id: input.document_request_id ?? null,
      created_by: userId,
      data: input.data as any,
    },
  })
}

export async function listHrDocuments(tenantId: string, filters: { employee_id?: string; type?: HrDocType; scoped?: string[] }) {
  return prisma.hrDocument.findMany({
    where: {
      tenant_id: tenantId,
      ...(filters.employee_id ? { employee_id: filters.employee_id } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.scoped ? { employee_id: { in: filters.scoped } } : {}),
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, type: true, doc_number: true, period: true, created_at: true,
      employee: { select: { id: true, first_name: true, last_name: true, nickname: true, employee_code: true } },
    },
  })
}

// พิมพ์ซ้ำ — render จาก data snapshot ล้วนๆ ไม่ join ข้อมูลพนักงาน/บริษัทสดใหม่ เพื่อให้
// เอกสารที่พิมพ์ซ้ำค่าตรงกับตอนออกจริงเป๊ะ แม้พนักงาน/ตำแหน่ง/ที่อยู่บริษัทจะเปลี่ยนไปแล้ว
export async function getHrDocument(tenantId: string, id: string, scoped?: string[]) {
  const row = await prisma.hrDocument.findFirst({ where: { id, tenant_id: tenantId } })
  if (!row) return null
  if (scoped && !scoped.includes(row.employee_id)) throw new Error('OUT_OF_SCOPE')
  return row
}
