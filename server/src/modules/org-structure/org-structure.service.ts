// server/src/modules/org-structure/org-structure.service.ts
// ผังองค์กร 4 ชั้น: Department → Division → Section → Position
import { prisma } from '../../common/utils/prisma'

// ── Department ──────────────────────────────────────────────
export async function listDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    include: { _count: { select: { divisions: true } } },
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

export async function deleteDepartment(tenantId: string, id: string) {
  const childCount = await prisma.division.count({ where: { department_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
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
    include: { department: { select: { id: true, name: true } }, _count: { select: { sections: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createDivision(tenantId: string, data: { department_id: string; name: string }) {
  const dept = await prisma.department.findFirst({ where: { id: data.department_id, tenant_id: tenantId, deleted_at: null } })
  if (!dept) throw new Error('DEPARTMENT_NOT_FOUND')
  return prisma.division.create({ data: { tenant_id: tenantId, department_id: data.department_id, name: data.name } })
}

export async function updateDivision(tenantId: string, id: string, data: { name?: string; department_id?: string; is_active?: boolean }) {
  const count = await prisma.division.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.division.findFirst({ where: { id } })
}

export async function deleteDivision(tenantId: string, id: string) {
  const childCount = await prisma.section.count({ where: { division_id: id, tenant_id: tenantId, deleted_at: null } })
  if (childCount > 0) throw new Error('IN_USE')
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
    include: { division: { select: { id: true, name: true } }, _count: { select: { positions: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createSection(tenantId: string, data: { division_id: string; name: string }) {
  const div = await prisma.division.findFirst({ where: { id: data.division_id, tenant_id: tenantId, deleted_at: null } })
  if (!div) throw new Error('DIVISION_NOT_FOUND')
  return prisma.section.create({ data: { tenant_id: tenantId, division_id: data.division_id, name: data.name } })
}

export async function updateSection(tenantId: string, id: string, data: { name?: string; division_id?: string; is_active?: boolean }) {
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
export async function listPositions(tenantId: string, sectionId?: string) {
  return prisma.position.findMany({
    where: { tenant_id: tenantId, deleted_at: null, ...(sectionId ? { section_id: sectionId } : {}) },
    include: { section: { select: { id: true, name: true } }, _count: { select: { employees: true } } },
    orderBy: { created_at: 'asc' },
  })
}

export async function createPosition(tenantId: string, data: { section_id: string; name: string }) {
  const sec = await prisma.section.findFirst({ where: { id: data.section_id, tenant_id: tenantId, deleted_at: null } })
  if (!sec) throw new Error('SECTION_NOT_FOUND')
  return prisma.position.create({ data: { tenant_id: tenantId, section_id: data.section_id, name: data.name } })
}

export async function updatePosition(tenantId: string, id: string, data: { name?: string; section_id?: string; is_active?: boolean }) {
  const count = await prisma.position.updateMany({ where: { id, tenant_id: tenantId, deleted_at: null }, data })
  if (count.count === 0) return null
  return prisma.position.findFirst({ where: { id } })
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
export async function getOrgTree(tenantId: string) {
  return prisma.department.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    orderBy: { created_at: 'asc' },
    include: {
      divisions: {
        where: { deleted_at: null },
        orderBy: { created_at: 'asc' },
        include: {
          sections: {
            where: { deleted_at: null },
            orderBy: { created_at: 'asc' },
            include: {
              positions: {
                where: { deleted_at: null },
                orderBy: { created_at: 'asc' },
                include: { _count: { select: { employees: true } } },
              },
            },
          },
        },
      },
    },
  })
}
