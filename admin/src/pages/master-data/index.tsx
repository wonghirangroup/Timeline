// admin/src/pages/master-data/index.tsx
// Master Data พนักงาน — มุมมองผู้บริหาร: ตารางเดียวเห็นข้อมูลสำคัญของพนักงานทุกคน
// พร้อมกัน (org structure, สถานะ, LINE, กะหลัก, วันลาคงเหลือ) หน้านี้ดูอย่างเดียว
// ไม่มีปุ่มแก้ไข/ลบ — ถ้าจะแก้ข้อมูลพนักงานให้ไปที่หน้า "พนักงาน" ตามปกติ
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Smartphone, ExternalLink } from 'lucide-react'
import { api } from '../../lib/axios'
import { deptName } from '../../lib/format'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

// ─── Types ──────────────────────────────────────────────────────────────────
type EmployeeStatusValue = 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'

interface ApiEmployee {
  id: string; employee_code: string
  first_name: string; last_name: string; nickname: string | null
  department: string | null; phone: string | null; hired_at: string | null
  line_user_id: string | null; status: EmployeeStatusValue
  branch: { id: string; name: string; group_id?: string | null }
  weekly_off_mode: 'WEEKLY' | 'MONTHLY_BATCH'
  default_shift_id: string | null
  position_id: string | null
  position?: { id: string; name: string } | null
  employee_status_type?: { id: string; name: string } | null
  pending_fine: string
}
interface ApiPosition { id: string; department?: { id: string; division?: { group_id?: string | null } | null } | null }
interface ApiGroup  { id: string; name: string }
interface ApiShift  { id: string; name: string }
interface ApiLeaveBalance {
  employee_id: string
  sick:       { total: number; used: number }
  personal:   { total: number; used: number }
  vacation:   { total: number; used: number }
  compensate: { total: number; used: number }
}

const STATUS_CFG: Record<EmployeeStatusValue, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:     { label: 'ใช้งาน',    color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  INACTIVE:   { label: 'ไม่ใช้งาน', color: 'var(--text-muted)', bg: '#f3f4f6', border: '#e5e7eb' },
  RESIGNED:   { label: 'ลาออก',    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  TERMINATED: { label: 'เลิกจ้าง', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}
const STATUS_OPTIONS: { value: EmployeeStatusValue | 'ALL'; label: string }[] = [
  { value: 'ACTIVE',     label: 'ใช้งาน (ค่าเริ่มต้น)' },
  { value: 'ALL',        label: 'ทั้งหมดทุกสถานะ' },
  { value: 'INACTIVE',   label: 'ไม่ใช้งาน' },
  { value: 'RESIGNED',   label: 'ลาออก' },
  { value: 'TERMINATED', label: 'เลิกจ้าง' },
]

const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDateShort(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-').map(Number)
  return `${day} ${MONTH_TH[m - 1]} ${y + 543}`
}
function tenureShort(d: string | null): string {
  if (!d) return '—'
  const start = new Date(d), now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  if (now.getDate() < start.getDate()) months--
  if (months < 0) { years--; months += 12 }
  if (years <= 0 && months <= 0) return 'น้อยกว่า 1 เดือน'
  const parts: string[] = []
  if (years > 0) parts.push(`${years} ปี`)
  if (months > 0) parts.push(`${months} เดือน`)
  return parts.join(' ')
}

const th: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
  background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', fontSize: '0.82rem', color: '#374151',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
}

function BalanceCell({ v }: { v?: { total: number; used: number } }) {
  if (!v) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const left = v.total - v.used
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: left <= 0 ? '#dc2626' : '#374151', fontWeight: left <= 0 ? 700 : 400 }}>
      {v.used}/{v.total}
    </span>
  )
}

export default function MasterDataPage() {
  const navigate = useNavigate()
  const [search, setSearch]         = useState('')
  const [orgFilter, setOrgFilter]   = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusValue | 'ALL'>('ACTIVE')

  const includeInactive = statusFilter !== 'ACTIVE'

  const { data: employees = [], isLoading } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees', 'master-data', includeInactive],
    queryFn: () => api.get('/api/v1/admin/employees', { params: { includeInactive } }).then(r => r.data.data),
  })
  const { data: groups = [] } = useQuery<ApiGroup[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const { data: shifts = [] } = useQuery<ApiShift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data),
  })
  // วันลาคงเหลืออาจปิดใช้งานเป็นรายเทแนนต์ (feature toggle) — ถ้า 403/error ให้ปล่อย
  // เป็น [] เฉยๆ คอลัมน์วันลาจะโชว์ "—" แทนทั้งหมด ไม่บล็อกส่วนที่เหลือของหน้า
  const { data: balances = [] } = useQuery<ApiLeaveBalance[]>({
    queryKey: ['admin', 'leave-balances', 'master-data', new Date().getFullYear()],
    queryFn: () => api.get('/api/v1/admin/leave-balances/employees', { params: { year: new Date().getFullYear() } }).then(r => r.data.data),
    retry: false,
    throwOnError: false,
  })

  const groupName = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups])
  const shiftName  = useMemo(() => Object.fromEntries(shifts.map(s => [s.id, s.name])), [shifts])
  const balanceByEmp = useMemo(() => Object.fromEntries(balances.map(b => [b.employee_id, b])), [balances])
  const employeeOrgMap = useMemo(() => buildEmployeeOrgMap(employees, positions), [employees, positions])

  const filtered = useMemo(() => employees.filter(e => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false
    if (!matchesOrgFilter(employeeOrgMap[e.id], orgFilter)) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code} ${e.phone ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [employees, statusFilter, orgFilter, employeeOrgMap, search])

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="#f97316" /> Master Data พนักงาน
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            มุมมองรวมสำหรับผู้บริหาร — ดูอย่างเดียว แก้ไขข้อมูลได้ที่หน้า "พนักงาน"
          </p>
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px' }}>
          {filtered.length} / {employees.length} คน
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as EmployeeStatusValue | 'ALL')}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบพนักงานตามตัวกรองนี้</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, position: 'sticky', left: 0, zIndex: 1 }}>พนักงาน</th>
                  <th style={th}>เบอร์โทร</th>
                  <th style={th}>กลุ่ม</th>
                  <th style={th}>สาขา</th>
                  <th style={th}>แผนก</th>
                  <th style={th}>ตำแหน่ง</th>
                  <th style={th}>ประเภทพนักงาน</th>
                  <th style={th}>วันเริ่มงาน</th>
                  <th style={th}>อายุงาน</th>
                  <th style={th}>สถานะ</th>
                  <th style={th}>LINE</th>
                  <th style={th}>กะหลัก</th>
                  <th style={th}>โหมดวันหยุด</th>
                  <th style={th}>ลาป่วย</th>
                  <th style={th}>ลากิจ</th>
                  <th style={th}>พักร้อน</th>
                  <th style={th}>ชดเชย</th>
                  <th style={th}>ค่าปรับค้าง</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const bal = balanceByEmp[e.id]
                  const fine = Number(e.pending_fine)
                  return (
                    <tr key={e.id}
                      style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                      onClick={() => navigate(`/employee/${e.id}`)}
                    >
                      <td style={{ ...td, position: 'sticky', left: 0, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                            {(e.first_name.charAt(0) + e.last_name.charAt(0)).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''}
                              <ExternalLink size={11} color="#94a3b8" />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>{e.phone || '—'}</td>
                      <td style={td}>{(e.branch.group_id && groupName[e.branch.group_id]) || '—'}</td>
                      <td style={td}>{e.branch.name}</td>
                      <td style={td}>{deptName(e.department)}</td>
                      <td style={td}>{e.position?.name ?? '—'}</td>
                      <td style={td}>{e.employee_status_type?.name ?? '—'}</td>
                      <td style={td}>{thDateShort(e.hired_at)}</td>
                      <td style={td}>{tenureShort(e.hired_at)}</td>
                      <td style={td}>
                        <span style={{ background: STATUS_CFG[e.status].bg, color: STATUS_CFG[e.status].color, border: `1px solid ${STATUS_CFG[e.status].border}`, borderRadius: 99, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          ● {STATUS_CFG[e.status].label}
                        </span>
                      </td>
                      <td style={td}>
                        {e.line_user_id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 600 }}>
                            <Smartphone size={12} /> เชื่อมแล้ว
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>ยังไม่เชื่อม</span>
                        )}
                      </td>
                      <td style={td}>{e.default_shift_id ? (shiftName[e.default_shift_id] ?? '—') : '—'}</td>
                      <td style={td}>{e.weekly_off_mode === 'MONTHLY_BATCH' ? 'รายเดือน' : 'รายสัปดาห์'}</td>
                      <td style={td}><BalanceCell v={bal?.sick} /></td>
                      <td style={td}><BalanceCell v={bal?.personal} /></td>
                      <td style={td}><BalanceCell v={bal?.vacation} /></td>
                      <td style={td}><BalanceCell v={bal?.compensate} /></td>
                      <td style={{ ...td, color: fine > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: fine > 0 ? 700 : 400 }}>
                        {fine > 0 ? `${fine.toLocaleString()} บาท` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
