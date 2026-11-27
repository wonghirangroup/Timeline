// server/src/modules/roster-template/roster-template.service.ts
// เทมเพลต "Export ตารางแยกกลุ่ม" ของปฏิทินรวม — เก็บที่ server เป็นของทั้งบริษัท (ทุกแอดมินเห็นร่วมกัน)
// ทุก query กรอง tenant_id เสมอ · soft delete (deleted_at) · ชื่อไม่ซ้ำต่อบริษัท (upsert ตามชื่อ)
import { prisma } from '../../common/utils/prisma'

export const MAX_NAME_LEN = 40
export const MAX_TEMPLATES_PER_TENANT = 50
const MAX_DATA_BYTES = 200_000

export interface RosterTemplateData {
  cols: { code: boolean; branch: boolean }
  colors: Record<string, string>
  groupOverrides: Record<string, string>
  customGroups: string[]
  hidden: string[]
  splitPositions: string[]
  groupId: string
  deptId: string
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : [])
const strMap = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {}
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (isStr(val)) out[k] = val
  }
  return out
}

// รับเฉพาะฟิลด์ที่รู้จักและชนิดถูกต้อง — กันข้อมูลขยะ/ก้อนใหญ่ผิดปกติถูกเก็บลง DB
export function sanitizeTemplateData(raw: unknown): RosterTemplateData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const cols = (d.cols && typeof d.cols === 'object' ? d.cols : {}) as Record<string, unknown>
  const out: RosterTemplateData = {
    cols: { code: cols.code !== false, branch: cols.branch !== false },
    colors: strMap(d.colors),
    groupOverrides: strMap(d.groupOverrides),
    customGroups: strArr(d.customGroups),
    hidden: strArr(d.hidden),
    splitPositions: strArr(d.splitPositions),
    groupId: isStr(d.groupId) ? d.groupId : '',
    deptId: isStr(d.deptId) ? d.deptId : '',
  }
  if (Buffer.byteLength(JSON.stringify(out), 'utf8') > MAX_DATA_BYTES) throw new Error('TEMPLATE_TOO_LARGE')
  return out
}

export async function listRosterTemplates(tenantId: string) {
  return prisma.rosterTemplate.findMany({
    where: { tenant_id: tenantId, deleted_at: null },
    select: { id: true, name: true, data: true, created_by: true, updated_by: true, created_at: true, updated_at: true },
    orderBy: { name: 'asc' },
  })
}

export async function saveRosterTemplate(tenantId: string, name: string, data: unknown, actor: string | null) {
  const clean = name.trim()
  if (!clean || clean.length > MAX_NAME_LEN) throw new Error('INVALID_NAME')
  const payload = sanitizeTemplateData(data)

  const existing = await prisma.rosterTemplate.findFirst({ where: { tenant_id: tenantId, name: clean } })
  if (existing) {
    return prisma.rosterTemplate.update({
      where: { id: existing.id },
      data: { data: payload as any, updated_by: actor, deleted_at: null },
      select: { id: true, name: true, data: true, created_by: true, updated_by: true, created_at: true, updated_at: true },
    })
  }
  const count = await prisma.rosterTemplate.count({ where: { tenant_id: tenantId, deleted_at: null } })
  if (count >= MAX_TEMPLATES_PER_TENANT) throw new Error('TOO_MANY_TEMPLATES')
  return prisma.rosterTemplate.create({
    data: { tenant_id: tenantId, name: clean, data: payload as any, created_by: actor, updated_by: actor },
    select: { id: true, name: true, data: true, created_by: true, updated_by: true, created_at: true, updated_at: true },
  })
}

export async function deleteRosterTemplate(tenantId: string, id: string) {
  const res = await prisma.rosterTemplate.updateMany({
    where: { id, tenant_id: tenantId, deleted_at: null },
    data: { deleted_at: new Date() },
  })
  return res.count > 0
}
