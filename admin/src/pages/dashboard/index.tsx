// admin/src/pages/dashboard/index.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, XCircle, CalendarDays, ClipboardList, Clock, Users, BarChart2, Zap } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiRecord {
  id: string
  employee_id: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  employee: {
    id: string; first_name: string; last_name: string
    nickname: string | null; employee_code: string
    branch: { id: string; name: string }
  }
  shift: { id: string; name: string }
}
interface ApiBranch   { id: string; name: string }
interface ApiEmployee { id: string; branch_id: string; branch: { id: string; name: string } }
interface ApiLeave    { id: string; status: string }

type DashStatus = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'PENDING'

const STATUS_CFG: Record<DashStatus, { label: string; color: string; bg: string; dot: string }> = {
  ON_TIME: { label: 'มาปกติ',    color: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
  LATE_1:  { label: 'มาสาย',    color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  LATE_2:  { label: 'สายมาก',   color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  PENDING: { label: 'ยังไม่เช็ค', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
}

function deriveStatus(r: ApiRecord | null): DashStatus {
  if (!r || !r.check_in_at) return 'PENDING'
  if (!r.is_late) return 'ON_TIME'
  if (r.late_minutes >= 20) return 'LATE_2'
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
  const name      = useAuthStore(s => s.name)
  const isMobile  = useIsMobile()
  const today     = useMemo(todayStr, [])
  const [branchFilter, setBranch] = useState('all')

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })

  const { data: records = [] } = useQuery<ApiRecord[]>({
    queryKey: ['admin', 'attendance', today],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { date: today } }).then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const { data: pendingLeaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'leave-requests', 'PENDING'],
    queryFn: () => api.get('/api/v1/admin/leave-requests', { params: { status: 'PENDING' } }).then(r => r.data.data),
  })

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
    branchFilter === 'all' ? allRows : allRows.filter(r => r.branch.id === branchFilter),
  [allRows, branchFilter])

  const onTime  = filtered.filter(r => r.status === 'ON_TIME').length
  const late    = filtered.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length
  const pending = filtered.filter(r => r.status === 'PENDING').length
  const total   = filtered.length

  // ── Greeting ──────────────────────────────────────────────────────────────
  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
  })()
  const todayLabel = (() => {
    const d = new Date()
    const DAYS   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return `วัน${DAYS[d.getDay()]}ที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  })()

  const pendingLeaveCount = pendingLeaves.length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 24, alignItems: 'start' }}>

      {/* ── Left Column ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Greeting ─────────────────────────────────────────────── */}
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{greeting}, {name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{todayLabel}</div>
        </div>

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

        {/* ── KPI cards ────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            วันนี้ · สถานะพนักงาน
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'ทั้งหมด',    value: total,   icon: <Users size={18}/>,         color: 'var(--info)',    bg: 'var(--info-bg)',    iconColor: '#3b82f6' },
              { label: 'เข้างานปกติ', value: onTime,  icon: <CheckCircle2 size={18}/>,  color: 'var(--success)', bg: 'var(--success-bg)', iconColor: '#10b981' },
              { label: 'มาสาย',      value: late,    icon: <AlertTriangle size={18}/>, color: 'var(--warning)', bg: 'var(--warning-bg)', iconColor: '#f59e0b' },
              { label: 'ยังไม่เช็ค', value: pending, icon: <Clock size={18}/>,         color: 'var(--text-muted)', bg: '#f8fafc',       iconColor: '#94a3b8' },
            ].map(card => (
              <div key={card.label} className="premium-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: '36px', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</div>
              </div>
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

        {/* Branch filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[{ id: 'all', name: 'ทั้งหมด' }, ...branches].map(b => (
            <button key={b.id} onClick={() => setBranch(b.id)}
              style={{ padding: '4px 14px', borderRadius: 99, border: '2px solid #f97316', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: branchFilter === b.id ? '#f97316' : '#fff',
                color: branchFilter === b.id ? '#fff' : '#f97316', transition: 'background 0.15s, color 0.15s' }}>
              {b.name}
            </button>
          ))}
        </div>

        {/* List card */}
        <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>รายชื่อวันนี้</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, background: '#e2e8f0', padding: '2px 10px', borderRadius: 99 }}>{filtered.length} คน</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
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
                    <div key={row.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none', background: 'var(--bg-card)', transition: 'background 0.2s' }}
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
