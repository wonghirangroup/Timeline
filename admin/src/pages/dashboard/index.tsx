// admin/src/pages/dashboard/index.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, XCircle, CalendarDays, ClipboardList, Clock, Users, BarChart2, Zap, MapPin, UserMinus, UserPlus, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useActiveOffsite } from '../../hooks/useActiveOffsite'
import { api } from '../../lib/axios'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

// ─── Range KPI types ────────────────────────────────────────────────────────
type RangePreset = 'today' | '7d' | '1m' | '3m' | '6m' | 'year' | 'custom'

interface RangePerson { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } | null; late_count?: number }
interface DashboardSummary {
  totalEmployees: number
  late:     { count: number; employees: RangePerson[] }
  resigned: { count: number; employees: RangePerson[] }
  newHires: { count: number; employees: RangePerson[] }
}

const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'วันนี้' },
  { id: '7d',    label: '7 วัน' },
  { id: '1m',    label: '1 เดือน' },
  { id: '3m',    label: '3 เดือน' },
  { id: '6m',    label: '6 เดือน' },
  { id: 'year',  label: 'ปีนี้' },
  { id: 'custom', label: 'เลือกเดือน' },
]

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

// คำนวณช่วงวันที่จาก preset — ทุกอันนับถอยหลังจากวันนี้ (rolling window) ยกเว้น
// custom ที่ล็อกเป็นเดือนปฏิทินที่เลือก
function resolveRange(preset: RangePreset, customMonth: string): { startDate: string; endDate: string } {
  const today = new Date()
  const endDate = isoDate(today)
  if (preset === 'custom') {
    const [y, m] = customMonth.split('-').map(Number)
    return { startDate: `${customMonth}-01`, endDate: isoDate(new Date(y, m, 0)) }
  }
  const start = new Date(today)
  if (preset === 'today') { /* ช่วงเดียวกับ endDate */ }
  else if (preset === '7d')   start.setDate(start.getDate() - 6)
  else if (preset === '1m')   start.setMonth(start.getMonth() - 1)
  else if (preset === '3m')   start.setMonth(start.getMonth() - 3)
  else if (preset === '6m')   start.setMonth(start.getMonth() - 6)
  else if (preset === 'year') start.setFullYear(start.getFullYear() - 1)
  return { startDate: isoDate(start), endDate }
}

function personLabel(p: RangePerson) {
  const full = `${p.first_name} ${p.last_name}`.trim()
  return p.nickname ? `${full} (${p.nickname})` : full
}

// ─── Range KPI card — คลิกขยายดูรายชื่อได้ ────────────────────────────────────
function RangeKpiCard({ label, count, unit, color, bg, icon, people, emptyLabel, extraLine }: {
  label: string; count: number; unit: string; color: string; bg: string; icon: React.ReactNode
  people: RangePerson[]; emptyLabel: string; extraLine?: (p: RangePerson) => string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => count > 0 && setOpen(o => !o)}
        style={{ width: '100%', padding: '18px 20px', border: 'none', background: 'var(--bg-card)', cursor: count > 0 ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '30px', fontWeight: 800, color, lineHeight: 1 }}>{count}</span>
            {count > 0 && <ChevronDown size={16} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />}
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: 8 }}>{label} <span style={{ fontWeight: 400 }}>({unit})</span></div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', maxHeight: 240, overflowY: 'auto' }}>
          {people.length === 0 ? (
            <div style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>{emptyLabel}</div>
          ) : people.map((p, i) => {
            const extra = extraLine?.(p)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: i < people.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personLabel(p)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 1 }}>{p.employee_code}{p.branch ? ` · ${p.branch.name}` : ''}</div>
                </div>
                {extra && <span style={{ fontSize: '11px', fontWeight: 700, color, background: bg, borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}>{extra}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Range KPI section ────────────────────────────────────────────────────────
function RangeKpiSection({ branchFilter }: { branchFilter: string }) {
  const isMobile = useIsMobile()
  const now = useMemo(() => new Date(), [])
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [customMonth, setCustomMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const { startDate, endDate } = useMemo(() => resolveRange(preset, customMonth), [preset, customMonth])

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['admin', 'dashboard-summary', startDate, endDate, branchFilter],
    queryFn: () => api.get('/api/v1/admin/dashboard/summary', {
      params: { startDate, endDate, branchId: branchFilter === 'all' ? undefined : branchFilter },
    }).then(r => r.data.data),
  })

  const isYearView = preset === 'year'
  const total = summary?.totalEmployees ?? 0
  const resignPct  = isYearView && total > 0 ? (summary!.resigned.count / total * 100) : null
  const newHirePct = isYearView && total > 0 ? (summary!.newHires.count / total * 100) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ภาพรวมตามช่วงเวลา
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {RANGE_PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)}
              style={{ padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                background: preset === p.id ? '#1e293b' : '#f1f5f9', color: preset === p.id ? '#fff' : 'var(--text-muted)' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div style={{ marginBottom: 12 }}>
          <input type="month" value={customMonth} onChange={e => setCustomMonth(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', background: '#fff' }} />
        </div>
      )}

      {isLoading || !summary ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>กำลังโหลด...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
            <RangeKpiCard label="มาสาย" unit="คน" count={summary.late.count} color="#d97706" bg="var(--warning-bg)"
              icon={<AlertTriangle size={18} />} people={summary.late.employees} emptyLabel="ไม่มีใครมาสายในช่วงนี้"
              extraLine={p => p.late_count ? `${p.late_count} ครั้ง` : null} />
            <RangeKpiCard label="ลาออก / เลิกจ้าง" unit="คน" count={summary.resigned.count} color="#dc2626" bg="#fef2f2"
              icon={<UserMinus size={18} />} people={summary.resigned.employees} emptyLabel="ไม่มีใครลาออกในช่วงนี้" />
            <RangeKpiCard label="เข้าใหม่" unit="คน" count={summary.newHires.count} color="#16a34a" bg="var(--success-bg)"
              icon={<UserPlus size={18} />} people={summary.newHires.employees} emptyLabel="ไม่มีคนเข้าใหม่ในช่วงนี้" />
          </div>

          {isYearView && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 16 }}>
              <div className="premium-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}><TrendingDown size={18} /></div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{resignPct?.toFixed(1)}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>อัตราลาออก/เลิกจ้าง (จากพนักงานทั้งหมด {total} คน)</div>
                </div>
              </div>
              <div className="premium-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}><TrendingUp size={18} /></div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{newHirePct?.toFixed(1)}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>อัตราเข้าใหม่ (จากพนักงานทั้งหมด {total} คน)</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiRecord {
  id: string
  employee_id: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  is_absent:    boolean
  employee: {
    id: string; first_name: string; last_name: string
    nickname: string | null; employee_code: string
    branch: { id: string; name: string }
  }
  shift: { id: string; name: string; late_threshold_2: string | null }
}
interface ApiBranch   { id: string; name: string }
interface ApiEmployee { id: string; branch_id: string; branch: { id: string; name: string; group_id?: string | null }; position_id?: string | null }
interface ApiLeave    { id: string; status: string }
interface ApiPosition { id: string; department?: { id: string; division?: { group_id?: string | null } | null } | null }

type DashStatus = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT' | 'PENDING'

const STATUS_CFG: Record<DashStatus, { label: string; color: string; bg: string; dot: string }> = {
  ON_TIME: { label: 'มาปกติ',    color: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
  LATE_1:  { label: 'มาสาย',    color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  LATE_2:  { label: 'สายมาก',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  ABSENT:  { label: 'ขาด',      color: '#7f1d1d', bg: '#fef2f2', dot: '#dc2626' },
  PENDING: { label: 'ยังไม่เช็ค', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
}

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function deriveStatus(r: ApiRecord | null): DashStatus {
  if (!r || !r.check_in_at) return 'PENDING'
  if (r.is_absent) return 'ABSENT'
  if (!r.is_late) return 'ON_TIME'
  // เทียบกับ late_threshold_2 จริงของกะ แทนการ hardcode 20 นาที
  if (r.shift.late_threshold_2) {
    const ci = new Date(r.check_in_at)
    const bkk = new Date(ci.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    const ciMins = bkk.getHours() * 60 + bkk.getMinutes()
    if (ciMins >= toMins(r.shift.late_threshold_2)) return 'LATE_2'
  }
  return 'LATE_1'
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const today     = useMemo(todayStr, [])
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  // 'all' sentinel คงไว้เพื่อ RangeKpiSection (ยิง branchId param ไป server) — derive จาก orgFilter
  const branchFilter = orgFilter.branchId || 'all'

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const employeeOrgMap = useMemo(() => buildEmployeeOrgMap(employees, positions), [employees, positions])

  const { data: records = [] } = useQuery<ApiRecord[]>({
    queryKey: ['admin', 'attendance', today],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { date: today } }).then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const { data: pendingLeaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'leave-requests', 'PENDING'],
    queryFn: () => api.get('/api/v1/admin/leave-requests', { params: { status: 'PENDING' } }).then(r => r.data.data),
  })

  const { activeOffsite } = useActiveOffsite()

  // ── Merge employees + records into rows ───────────────────────────────────
  const allRows = useMemo(() => {
    const byEmpId: Record<string, ApiRecord[]> = {}
    for (const r of records) {
      if (!byEmpId[r.employee_id]) byEmpId[r.employee_id] = []
      byEmpId[r.employee_id].push(r)
    }

    const rows: { key: string; empId: string; name: string; nickname: string | null; branch: { id: string; name: string }; record: ApiRecord | null; status: DashStatus }[] = []

    // employees with records
    for (const r of records) {
      rows.push({
        key: r.id, empId: r.employee_id,
        name: `${r.employee.first_name} ${r.employee.last_name}`,
        nickname: r.employee.nickname,
        branch: r.employee.branch,
        record: r, status: deriveStatus(r),
      })
    }

    // employees without records → PENDING
    const seenIds = new Set(records.map(r => r.employee_id))
    for (const e of employees) {
      if (!seenIds.has(e.id)) {
        rows.push({
          key: `no-${e.id}`, empId: e.id,
          name: (e as any).first_name ? `${(e as any).first_name} ${(e as any).last_name}` : e.id,
          nickname: (e as any).nickname ?? null,
          branch: e.branch,
          record: null, status: 'PENDING',
        })
      }
    }

    return rows
  }, [records, employees])

  const filtered = useMemo(() =>
    allRows.filter(r => matchesOrgFilter(employeeOrgMap[r.empId], orgFilter)),
  [allRows, orgFilter, employeeOrgMap])

  const onTime  = filtered.filter(r => r.status === 'ON_TIME').length
  const late    = filtered.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length
  const pending = filtered.filter(r => r.status === 'PENDING').length
  const total   = filtered.length

  const pendingLeaveCount = pendingLeaves.length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 24, alignItems: 'start' }}>

      {/* ── Left Column ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── ภาพรวมตามช่วงเวลา (Dashboard requirement) ──────────────── */}
        <RangeKpiSection branchFilter={branchFilter} />

        {/* ── Action required ──────────────────────────────────────── */}
        {pendingLeaveCount > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={12} style={{ color: '#f59e0b' }}/> ต้องดำเนินการ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <button onClick={() => navigate('/leave')} className="premium-card"
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', cursor: 'pointer', textAlign: 'left', background: 'var(--warning-bg)', border: '1.5px solid #fcd34d' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}><ClipboardList size={20}/></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>ใบลา รออนุมัติ</div>
                  <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 600, marginTop: 2 }}>{pendingLeaveCount} รายการ</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── กำลังนอกสถานที่ตอนนี้ ───────────────────────────────────── */}
        {activeOffsite.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} style={{ color: '#2563eb' }}/> กำลังนอกสถานที่ตอนนี้ ({activeOffsite.length})
            </div>
            <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
              {activeOffsite.map((r, i) => (
                <button key={r.id} onClick={() => navigate('/offsite')}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    borderBottom: i < activeOffsite.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: 'var(--bg-card)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <MapPin size={16}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{r.employee.first_name} {r.employee.last_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      ตั้งแต่ {fmtTime(r.check_in_at)} · {r.check_in_address ?? r.employee.branch.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            เรียลไทม์วันนี้ · สถานะพนักงาน
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'ทั้งหมด',    value: total,   icon: <Users size={18}/>,         color: 'var(--info)',    bg: 'var(--info-bg)',    iconColor: '#3b82f6' },
              { label: 'เข้างานปกติ', value: onTime,  icon: <CheckCircle2 size={18}/>,  color: 'var(--success)', bg: 'var(--success-bg)', iconColor: '#10b981' },
              { label: 'มาสาย',      value: late,    icon: <AlertTriangle size={18}/>, color: 'var(--warning)', bg: 'var(--warning-bg)', iconColor: '#f59e0b' },
              { label: 'ยังไม่เช็ค', value: pending, icon: <Clock size={18}/>,         color: 'var(--text-muted)', bg: '#f8fafc',       iconColor: '#94a3b8' },
            ].map(card => (
              <button key={card.label} onClick={() => navigate('/report')} className="premium-card"
                style={{ padding: '20px', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Quick links ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
          {[
            { label: 'จัดการพนักงาน', icon: <Users size={20}/>,    path: '/employee' },
            { label: 'รายงานเช็คชื่อ', icon: <BarChart2 size={20}/>, path: '/attendance' },
            { label: 'จัดการกะ',       icon: <Clock size={20}/>,    path: '/shift' },
          ].map(q => (
            <button key={q.path} onClick={() => navigate(q.path)} className="premium-card"
              style={{ padding: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc', textAlign: 'center', fontFamily: 'inherit' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#64748b' }}>{q.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{q.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right Column (รายชื่อวันนี้) ──────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: isMobile ? 'auto' : 'calc(100vh - 110px)' }}>

        {/* Org filter */}
        <div>
          <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
        </div>

        {/* List card */}
        <div className="premium-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>รายชื่อวันนี้</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, background: '#e2e8f0', padding: '2px 10px', borderRadius: 99 }}>{filtered.length} คน</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ marginBottom: 12, opacity: 0.4, display: 'flex', justifyContent: 'center' }}><CalendarDays size={40}/></div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>ไม่มีข้อมูล</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((row, i) => {
                  const s = STATUS_CFG[row.status]
                  return (
                    <div key={row.key} onClick={() => navigate(`/employee/${row.empId}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none', background: 'var(--bg-card)', transition: 'background 0.2s', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, hsl(${(i * 47) % 360},60%,60%), hsl(${(i * 47 + 30) % 360},70%,45%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                        {row.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.name}{row.nickname ? ` (${row.nickname})` : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {fmtTime(row.record?.check_in_at ?? null)} · {s.label}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: s.dot }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
