// admin/src/components/shared/OrgFilterBar.tsx
// ตัวกรองร่วม กลุ่ม → สาขา / แผนก → ตำแหน่ง ใช้ซ้ำได้ทุกหน้าที่มีพนักงาน/ข้อมูล
// ผูกพนักงาน (feedback 2026-09-02) — สาขาผูกกับกลุ่มตรงๆ (Branch.group_id),
// แผนก/ตำแหน่งผูกกับกลุ่มผ่านฝ่าย (Department.division.group_id) — เป็นแขนงคู่
// ขนานกันใต้กลุ่ม ไม่ใช่สาขา ⊃ แผนก ⊃ ตำแหน่ง เรียงชั้นเดียวกัน
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'

export interface OrgFilterValue { groupId: string; branchId: string; departmentId: string; positionId: string }
export const EMPTY_ORG_FILTER: OrgFilterValue = { groupId: '', branchId: '', departmentId: '', positionId: '' }

interface ApiGroupLite { id: string; name: string }
interface ApiBranchLite { id: string; name: string; group_id?: string | null }
interface ApiDepartmentLite { id: string; name: string; division: { id: string; name: string; group_id: string } | null }
interface ApiPositionLite { id: string; name: string; department: { id: string; name: string; division: { id: string; name: string; group_id: string } | null } | null }

// queryKey ตรงกับที่หน้าอื่นๆ ใช้อยู่แล้ว (['groups']/['branches']/['positions'])
// ตั้งใจให้ตรงกันเพื่อ react-query cache ใช้ร่วมกันได้ ไม่ fetch ซ้ำถ้าหน้านั้น
// ดึงข้อมูลชุดเดียวกันอยู่แล้วด้วย key เดิม
export function useOrgFilterOptions() {
  const { data: groups = [] } = useQuery<ApiGroupLite[]>({
    queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data),
  })
  const { data: branches = [] } = useQuery<ApiBranchLite[]>({
    queryKey: ['branches'], queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: departments = [] } = useQuery<ApiDepartmentLite[]>({
    queryKey: ['org-departments'], queryFn: () => api.get('/api/v1/admin/departments').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPositionLite[]>({
    queryKey: ['positions'], queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  return { groups, branches, departments, positions }
}

const selStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem',
  background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
}

export function OrgFilterBar({ value, onChange }: {
  value: OrgFilterValue
  onChange: (v: OrgFilterValue) => void
}) {
  const { groups, branches, departments, positions } = useOrgFilterOptions()

  const branchOptions = value.groupId ? branches.filter(b => b.group_id === value.groupId) : branches
  const deptOptions   = value.groupId ? departments.filter(d => d.division?.group_id === value.groupId) : departments
  const posOptions    = value.departmentId
    ? positions.filter(p => p.department?.id === value.departmentId)
    : value.groupId ? positions.filter(p => p.department?.division?.group_id === value.groupId) : positions

  const hasActive = !!(value.groupId || value.branchId || value.departmentId || value.positionId)

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {groups.length > 1 && (
        <select style={selStyle} value={value.groupId}
          onChange={e => onChange({ groupId: e.target.value, branchId: '', departmentId: '', positionId: '' })}>
          <option value="">ทุกกลุ่ม</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      )}
      <select style={selStyle} value={value.branchId} onChange={e => onChange({ ...value, branchId: e.target.value })}>
        <option value="">ทุกสาขา</option>
        {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      {departments.length > 0 && (
        <select style={selStyle} value={value.departmentId}
          onChange={e => onChange({ ...value, departmentId: e.target.value, positionId: '' })}>
          <option value="">ทุกแผนก</option>
          {deptOptions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      {positions.length > 0 && (
        <select style={selStyle} value={value.positionId} onChange={e => onChange({ ...value, positionId: e.target.value })}>
          <option value="">ทุกตำแหน่ง</option>
          {posOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {hasActive && (
        <button onClick={() => onChange(EMPTY_ORG_FILTER)}
          style={{ ...selStyle, color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2', fontWeight: 600 }}>
          ล้างตัวกรอง
        </button>
      )}
    </div>
  )
}

// ── employee_id → ข้อมูลกลุ่ม/สาขา/แผนก/ตำแหน่ง — ใช้กรองข้อมูลที่ผูกกับพนักงาน ──
// (วันลา, วันหยุด, OT, นอกสถานที่, รายงาน ฯลฯ) โดยไม่ต้องแก้ backend include ของ
// แต่ละ endpoint เลย — ดึง employees + positions (มี department.division.group_id
// เต็มอยู่แล้วจาก /api/v1/admin/positions) มา join เอาเองฝั่ง frontend เพราะแต่ละ
// หน้าไม่ได้ nest ข้อมูลผังองค์กรเต็มๆ ไว้ในตัว employee เหมือนกันหมด
export interface EmployeeOrgInfo { groupId: string | null; branchId: string | null; departmentId: string | null; positionId: string | null }

interface EmployeeForOrgMap {
  id: string
  branch_id?: string | null
  branch?: { id: string; group_id?: string | null } | null
  position_id?: string | null
  position?: { id?: string; department?: { id: string; division?: { group_id?: string | null } | null } | null } | null
}
interface PositionForOrgMap {
  id: string
  department?: { id: string; division?: { group_id?: string | null } | null } | null
}

export function buildEmployeeOrgMap(employees: EmployeeForOrgMap[], positions: PositionForOrgMap[] = []): Record<string, EmployeeOrgInfo> {
  const posById = new Map(positions.map(p => [p.id, p]))
  const map: Record<string, EmployeeOrgInfo> = {}
  for (const e of employees) {
    const branchId = e.branch?.id ?? e.branch_id ?? null
    const posId = e.position_id ?? e.position?.id ?? null
    // ข้อมูลตำแหน่งอาจมาจาก employee.position ที่ nest ไว้แล้ว หรือต้อง join กับ
    // positions list แยกต่างหาก (แล้วแต่ว่าหน้านั้น include อะไรมา) — ลองทั้งคู่
    const dept = e.position?.department ?? (posId ? posById.get(posId)?.department : undefined)
    // สาขาเป็นหลักเสมอ (มีครบทุกคน) ตำแหน่งผังองค์กรเป็นแค่ fallback สำรอง —
    // สอดคล้องกับ employeeGroupId ใน TeamCalendarTab.tsx (v075)
    const groupId = e.branch?.group_id ?? dept?.division?.group_id ?? null
    map[e.id] = { groupId, branchId, departmentId: dept?.id ?? null, positionId: posId }
  }
  return map
}

export function matchesOrgFilter(info: EmployeeOrgInfo | undefined, filter: OrgFilterValue): boolean {
  const noFilter = !filter.groupId && !filter.branchId && !filter.departmentId && !filter.positionId
  if (noFilter) return true
  if (!info) return false
  if (filter.groupId && info.groupId !== filter.groupId) return false
  if (filter.branchId && info.branchId !== filter.branchId) return false
  if (filter.departmentId && info.departmentId !== filter.departmentId) return false
  if (filter.positionId && info.positionId !== filter.positionId) return false
  return true
}
