// server/src/modules/org-structure/org-structure.service.ts
// ผังองค์กร 4 ชั้น: Department → Division → Section → Position — ข้ามชั้นได้
// (Division/Section/Position ผูกกับพ่อแม่ชั้นบนสุดเท่าที่มีจริง ไม่บังคับสร้างครบทุกชั้น
// เช่น ตำแหน่งแนบตรงกับแผนกได้เลยถ้าไม่มีฝ่าย/ส่วน หรือสร้างลอยไม่ผูกอะไรเลยก็ได้)
import { prisma } from '../../common/utils/prisma'

// ── Department ──────────────────────────────────────────────
export async function listDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { divisions: true, sections_direct: true, positions_direct: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createDepartment(tenantId: string, data: { name: string; code?: string }) {
  return prisma.department.create({
    data: { tenant_id: tenantId, name: data.name, code: data.code },
  })
}

export async function updateDepartment(tenantId: string, id: string, data: { name?: string; code?: string; is_active?: boolean }) {
  const count = await prisma.department.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.department.findFirst({ where: { id } })
}

async function departmentChildCount(tenantId: string, id: string) {
  const [divisions, sections, positions] = await Promise.all([
    prisma.division.count({ where: { department_id: id, tenant_id: tenantId, deleted_at: null } }),
    prisma.section.count({ where: { department_id: id, tenant_id: tenantId, deleted_at: null } }),
    prisma.position.count({ where: { department_id: id, tenant_id: tenantId, deleted_at: null } }),
  ])
  return divisions + sections + positions
}

export async function deleteDepartment(tenantId: string, id: string) {
  if (await departmentChildCount(tenantId, id) > 0) throw new Error('IN_USE')
  const count = await prisma.department.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Division ─────────────────────────────────────────────────
export async function listDivisions(tenantId: string, departmentId?: string) {
  return prisma.division.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(departmentId ? { department_id: departmentId } : {}) },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { sections: true, positions_direct: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

// department_id เป็น optional — ฝ่ายลอยไม่ผูกแผนกก็สร้างได้
export async function createDivision(tenantId: string, data: { department_id?: string; name: string }) {
  if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
    if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
  }
  return prisma.division.create({ data: { tenant_id: tenantId, department_id: data.department_id ?? null, name: data.name } })
}

export async function updateDivision(tenantId: string, id: string, data: { name?: string; department_id?: string | null; is_active?: boolean }) {
  const count = await prisma.division.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.division.findFirst({ where: { id } })
}

async function divisionChildCount(tenantId: string, id: string) {
  const [sections, positions] = await Promise.all([
    prisma.section.count({ where: { division_id: id, tenant_id: tenantId, deleted_at: null } }),
    prisma.position.count({ where: { division_id: id, tenant_id: tenantId, deleted_at: null } }),
  ])
  return sections + positions
}

export async function deleteDivision(tenantId: string, id: string) {
  if (await divisionChildCount(tenantId, id) > 0) throw new Error('IN_USE')
  const count = await prisma.division.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Section ──────────────────────────────────────────────────
export async function listSections(tenantId: string, divisionId?: string) {
  return prisma.section.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(divisionId ? { division_id: divisionId } : {}) },
    include: {
      division: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { positions: true } },
    },
    orderBy: { created_at: 'asc' },
  })
}

// division_id ข้ามได้ — ถ้าไม่มีฝ่ายให้แนบ ผูกตรงกับ department_id ได้เลย
export async function createSection(tenantId: string, data: { division_id?: string; department_id?: string; name: string }) {
  if (data.division_id) {
    const div = await prisma.division.findFirst({ where: { id: data.division_id, tenant_id: tenantId, deleted_at: null } })
    if (!div) throw new Error('DIVISION_NOT_FOUND')
  } else if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
    if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
  }
  return prisma.section.create({
    data: {
      tenant_id: tenantId, name: data.name,
      division_id: data.division_id ?? null,
      department_id: data.division_id ? null : (data.department_id ?? null),
    },
  })
}

export async function updateSection(tenantId: string, id: string, data: { name?: string; division_id?: string | null; department_id?: string | null; is_active?: boolean }) {
  const count = await prisma.section.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.section.findFirst({ where: { id } })
}

export async function deleteSection(tenantId: string, id: string) {
  const childCount = await prisma.position.count({ where: { section_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
  const count = await prisma.section.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return count.count > 0
}

// ── Position ─────────────────────────────────────────────────
const POSITION_PARENT_INCLUDE = {
  section: {
    select: {
      id: true, name: true,
      division: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
      department: { select: { id: true, name: true } },
    },
  },
  division: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
  department: { select: { id: true, name: true } },
} as const

export async function listPositions(tenantId: string, sectionId?: string) {
  return prisma.position.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(sectionId ? { section_id: sectionId } : {}) },
    include: { ...POSITION_PARENT_INCLUDE, _count: { select: { employees: true } } },
    orderBy: { created_at: 'asc' },
  })
}

// section_id/division_id/department_id ทั้งหมด optional — เลือกแนบชั้นไหนก็ได้ชั้นเดียว
// (ลำดับความสำคัญ: section > division > department) หรือไม่แนบเลย (สร้างลอยไว้ก่อน)
export async function createPosition(tenantId: string, data: { section_id?: string; division_id?: string; department_id?: string; name: string }) {
  let section_id: string | null = null, division_id: string | null = null, department_id: string | null = null

  if (data.section_id) {
    const sec = await prisma.section.findFirst({ where: { id: data.section_id, tenant_id: tenantId, deleted_at: null } })
    if (!sec) throw new Error('SECTION_NOT_FOUND')
    section_id = data.section_id
  } else if (data.division_id) {
    const div = await prisma.division.findFirst({ where: { id: data.division_id, tenant_id: tenantId, deleted_at: null } })
    if (!div) throw new Error('DIVISION_NOT_FOUND')
    division_id = data.division_id
  } else if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
    if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
    department_id = data.department_id
  }

  return prisma.position.create({ data: { tenant_id: tenantId, name: data.name, section_id, division_id, department_id } })
}

export async function updatePosition(tenantId: string, id: string, data: {
  name?: string; section_id?: string | null; division_id?: string | null; department_id?: string | null; is_active?: boolean
}) {
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

// ── Tree — โหลดทั้งผังในคำเรียกเดียว (สำหรับหน้าจัดการผังองค์กร) ──
// ดึงทั้ง 4 ตารางแบบ flat แล้วประกอบ tree เองในหน่วยความจำ (ง่ายกว่า nested include
// ที่ต้องไล่ทุกทางที่ Position/Section อาจข้ามชั้นไปแนบที่ไหนก็ได้)
export async function getOrgTree(tenantId: string) {
  const [departments, divisions, sections, positions] = await Promise.all([
    prisma.department.findMany({ where: { tenant_id: tenantId, deleted_at: null }, orderBy: { created_at: 'asc' } }),
    prisma.division.findMany({ where: { tenant_id: tenantId, deleted_at: null }, orderBy: { created_at: 'asc' } }),
    prisma.section.findMany({ where: { tenant_id: tenantId, deleted_at: null }, orderBy: { created_at: 'asc' } }),
    prisma.position.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      include: { _count: { select: { employees: true } } },
      orderBy: { created_at: 'asc' },
    }),
  ])

  const posByParent = (filter: (p: (typeof positions)[number]) => boolean) => positions.filter(filter)
  const secByParent = (filter: (s: (typeof sections)[number]) => boolean) => sections.filter(filter)

  const buildSection = (s: (typeof sections)[number]) => ({
    ...s,
    positions: posByParent(p => p.section_id === s.id),
  })
  const buildDivision = (d: (typeof divisions)[number]) => ({
    ...d,
    sections: secByParent(s => s.division_id === d.id).map(buildSection),
    positions_direct: posByParent(p => p.division_id === d.id && !p.section_id),
  })

  return departments.map(dept => ({
    ...dept,
    divisions: divisions.filter(d => d.department_id === dept.id).map(buildDivision),
    sections_direct: secByParent(s => s.department_id === dept.id && !s.division_id).map(buildSection),
    positions_direct: posByParent(p => p.department_id === dept.id && !p.division_id && !p.section_id),
  }))
}

// standalone — ไม่ผูกอะไรเลยสักชั้น (สร้างตำแหน่ง/ฝ่าย/ส่วนลอยไว้ก่อน ยังไม่จัดเข้าแผนก)
export async function getUnassigned(tenantId: string) {
  const [divisions, sections, positions] = await Promise.all([
    prisma.division.findMany({ where: { tenant_id: tenantId, deleted_at: null, department_id: null }, orderBy: { created_at: 'asc' } }),
    prisma.section.findMany({ where: { tenant_id: tenantId, deleted_at: null, division_id: null, department_id: null }, orderBy: { created_at: 'asc' } }),
    prisma.position.findMany({
      where: { tenant_id: tenantId, deleted_at: null, section_id: null, division_id: null, department_id: null },
      include: { _count: { select: { employees: true } } },
      orderBy: { created_at: 'asc' },
    }),
  ])
  return { divisions, sections, positions }
}
