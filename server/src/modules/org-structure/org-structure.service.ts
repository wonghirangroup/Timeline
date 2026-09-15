// server/src/modules/org-structure/org-structure.service.ts
// ผังองค์กร 3 ชั้นใต้กลุ่ม: Division (ฝ่าย) → Department (แผนก) → Position (ตำแหน่ง)
// ต่างจากเวอร์ชันเดิม (Department ใหญ่สุด, ผูกข้ามชั้นได้อิสระ, มี Section) — ตอนนี้ทุกชั้น
// ต้องมี parent ชัดเจนเสมอ (บังคับ ไม่ nullable) เพราะแต่ละชั้นเป็นที่อยู่ของ policy cascade
// ด้วย (ดู group.service.ts resolveBookingEnabled()) ไม่ใช่แค่ label เฉยๆ แบบเดิม
import { prisma } from '../../common/utils/prisma'

// นโยบายที่ทุกชั้น (ฝ่าย/แผนก/ตำแหน่ง) รับได้ — null = inherit จากชั้นบน
type DR = 'WORK' | 'OFF' | 'OFFSITE'
type OrgPolicyInput = {
  booking_enabled?: boolean | null; leave_enabled?: boolean | null
  saturday_rule?: DR | null; sunday_rule?: DR | null; booking_quota?: number | null
}
const orgPolicyData = (d: OrgPolicyInput) => ({
  booking_enabled: d.booking_enabled ?? null,
  leave_enabled: d.leave_enabled ?? null,
  saturday_rule: d.saturday_rule ?? null,
  sunday_rule: d.sunday_rule ?? null,
  booking_quota: d.booking_quota ?? null,
})

// สิทธิ์พักร้อนตามอายุงาน — เฉพาะ Position เท่านั้น (feedback 2026-09-15 ข้อ 6) ไม่ใช้
// OrgPolicyInput/orgPolicyData ร่วมกับชั้นอื่น เพราะ group/division/department ไม่มี
// คอลัมน์นี้ — null ทั้ง 3 = ตำแหน่งนี้ไม่มีโปรแกรมพักร้อนตามอายุงาน
type PositionVacationInput = {
  vacation_base_days?: number | null
  vacation_increment_days?: number | null
  vacation_increment_years?: number | null
}
const positionVacationData = (d: PositionVacationInput) => ({
  vacation_base_days: d.vacation_base_days ?? null,
  vacation_increment_days: d.vacation_increment_days ?? null,
  vacation_increment_years: d.vacation_increment_years ?? null,
})

// ── Division (ฝ่าย) ──────────────────────────────────────────
export async function listDivisions(tenantId: string, groupId?: string) {
  return prisma.division.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(groupId ? { group_id: groupId } : {}) },
    include: {
      group: { select: { id: true, name: true } },
      _count: { select: { departments: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

export async function createDivision(tenantId: string, data: { group_id: string; name: string } & OrgPolicyInput) {
  const group = await prisma.group.findFirst({ where: { id: data.group_id, tenant_id: tenantId, deleted_at: null } })
  if (!group) throw new Error('GROUP_NOT_FOUND')
  return prisma.division.create({
    data: { tenant_id: tenantId, group_id: data.group_id, name: data.name, ...orgPolicyData(data) },
  })
}

export async function updateDivision(tenantId: string, id: string, data: { name?: string; is_active?: boolean } & OrgPolicyInput) {
  const count = await prisma.division.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.division.findFirst({ where: { id } })
}

export async function deleteDivision(tenantId: string, id: string) {
  const childCount = await prisma.department.count({ where: { division_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
  const count = await prisma.division.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Department (แผนก) ────────────────────────────────────────
export async function listDepartments(tenantId: string, divisionId?: string) {
  return prisma.department.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(divisionId ? { division_id: divisionId } : {}) },
    include: {
      division: { select: { id: true, name: true, group_id: true } },
      _count: { select: { positions: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

export async function createDepartment(tenantId: string, data: { division_id: string; name: string } & OrgPolicyInput) {
  const division = await prisma.division.findFirst({ where: { id: data.division_id, tenant_id: tenantId, deleted_at: null } })
  if (!division) throw new Error('DIVISION_NOT_FOUND')
  return prisma.department.create({
    data: { tenant_id: tenantId, division_id: data.division_id, name: data.name, ...orgPolicyData(data) },
  })
}

export async function updateDepartment(tenantId: string, id: string, data: { name?: string; is_active?: boolean } & OrgPolicyInput) {
  const count = await prisma.department.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.department.findFirst({ where: { id } })
}

export async function deleteDepartment(tenantId: string, id: string) {
  const childCount = await prisma.position.count({ where: { department_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
  const count = await prisma.department.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Position (ตำแหน่ง) ───────────────────────────────────────
const POSITION_PARENT_INCLUDE = {
  department: {
    select: {
      id: true, name: true,
      division: { select: { id: true, name: true, group_id: true } },
    },
  },
} as const

export async function listPositions(tenantId: string, departmentId?: string) {
  return prisma.position.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(departmentId ? { department_id: departmentId } : {}) },
    include: { ...POSITION_PARENT_INCLUDE, _count: { select: { employees: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createPosition(tenantId: string, data: { department_id: string; name: string } & OrgPolicyInput & PositionVacationInput) {
  const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
  if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
  return prisma.position.create({
    data: { tenant_id: tenantId, department_id: data.department_id, name: data.name, ...orgPolicyData(data), ...positionVacationData(data) },
  })
}

export async function updatePosition(tenantId: string, id: string, data: { name?: string; department_id?: string; is_active?: boolean } & OrgPolicyInput & PositionVacationInput) {
  if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
    if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
  }
  const count = await prisma.position.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.position.findFirst({ where: { id }, include: POSITION_PARENT_INCLUDE })
}

export async function deletePosition(tenantId: string, id: string) {
  const childCount = await prisma.employee.count({ where: { position_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
  const count = await prisma.position.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Tree — โหลดผังทั้งหมดของ "กลุ่ม" เดียว หรือ "ทุกกลุ่มในเทแนนต์" (ถ้าไม่ระบุ groupId)
// ในคำเรียกเดียว (สำหรับหน้าจัดการผังองค์กร) — ทุกชั้นตอนนี้ผูก parent ชัดเจนเสมอ (ไม่มี
// "ลอย"/unassigned เหมือนเวอร์ชันเดิมอีกต่อไป) เพราะ Division ต้องมี group_id, Department
// ต้องมี division_id, Position ต้องมี department_id — groupId ไม่ระบุ = โหมด "ผังรวมทุกกลุ่ม"
// (feedback 2026-09-14: อยากเห็นผังทุกกลุ่มรวดเดียวไม่ต้องเลือกกลุ่มทีละอัน) แต่ละ division
// ที่คืนกลับยังมี group_id ติดมาด้วยเสมอ ให้ฝั่ง frontend จัดกลุ่มเป็นชั้นบนสุดเองได้
export async function getOrgTree(tenantId: string, groupId?: string) {
  const groupFilter = groupId ? { group_id: groupId } : {}
  const [departments, positions] = await Promise.all([
    prisma.department.findMany({
      where: { tenant_id: tenantId, deleted_at: null, division: { ...groupFilter } },
      orderBy: { created_at: 'asc' },
    }),
    prisma.position.findMany({
      where: { tenant_id: tenantId, deleted_at: null, department: { division: { ...groupFilter } } },
      include: { _count: { select: { employees: true } } },
      orderBy: { created_at: 'asc' },
    }),
  ])
  const divisions = await prisma.division.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...groupFilter },
    orderBy: { created_at: 'asc' },
  })

  return divisions.map(div => ({
    ...div,
    departments: departments
      .filter(dept => dept.division_id === div.id)
      .map(dept => ({ ...dept, positions: positions.filter(p => p.department_id === dept.id) })),
  }))
}
