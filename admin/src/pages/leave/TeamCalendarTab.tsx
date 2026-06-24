// admin/src/pages/leave/TeamCalendarTab.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X, CalendarDays, Stethoscope, Briefcase, Sun, Heart } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── API types ────────────────────────────────────────────────────────────────
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string; branch: { id: string; name: string } }
interface ApiWeeklyOff { id: string; employee_id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; employee: ApiEmployee }
interface ApiLeave { id: string; employee_id: string; leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'; start_date: string; end_date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; reason?: string; employee: ApiEmployee }
interface ApiHoliday { id: string; date: string; name: string }
interface ApiBranch { id: string; name: string }

// ─── Local display types ──────────────────────────────────────────────────────
interface DayOff { date: string; employee_id: string; name: string; nickname: string; branch_id: string; branch_name: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface LeaveReq { id: string; employee_id: string; name: string; nickname: string; branch_id: string; branch_name: string; leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'; display_label: string; start_date: string; end_date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface Holiday { date: string; name: string }

// ─── Config ───────────────────────────────────────────────────────────────────
const MONTHS_LONG = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_SHORT  = ['อา','จ','อ','พ','พฤ','ศ','ส']

const LEAVE_CFG: Record<string, { label: string; color: string; light: string; icon: React.ReactNode }> = {
  SICK:      { label: 'ลาป่วย',    color: '#3B82F6', light: '#EFF6FF', icon: <Stethoscope size={12}/> },
  PERSONAL:  { label: 'ลากิจ',     color: '#8B5CF6', light: '#F5F3FF', icon: <Briefcase   size={12}/> },
  VACATION:  { label: 'ลาพักร้อน', color: '#F59E0B', light: '#FFFBEB', icon: <Sun         size={12}/> },
  MATERNITY: { label: 'ลาคลอด',   color: '#EC4899', light: '#FDF2F8', icon: <Heart       size={12}/> },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addMonths(ym: string, n: number) {
  const [yy, mm] = ym.split('-').map(Number)
  const d = new Date(yy, mm - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function getDaysInMonth(ym: string) { const [yy, mm] = ym.split('-').map(Number); return new Date(yy, mm, 0).getDate() }
function getFirstDow(ym: string)    { const [yy, mm] = ym.split('-').map(Number); return new Date(yy, mm - 1, 1).getDay() }
function fmtMonthTH(ym: string) {
  const [yy, mm] = ym.split('-').map(Number)
  return `${MONTHS_LONG[mm - 1]} ${yy + 543}`
}
function toDateStr(ym: string, d: number) { return `${ym}-${String(d).padStart(2, '0')}` }
function initials(name: string) {
  const parts = name.split(' ')
  return parts.length >= 2 ? parts[0].charAt(0) + parts[1].charAt(0) : name.charAt(0)
}
function fmtDateFull(s: string) {
  const d = new Date(s + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear() + 543}`
}

// week_start = Monday, day_of_week = 0 (Sun) – 6 (Sat) as JS getUTCDay()
function weeklyOffToDate(weekStart: string, dayOfWeek: number): string {
  const monday = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  monday.setUTCDate(monday.getUTCDate() + offset)
  return monday.toISOString().slice(0, 10)
}

function toDisplayDayOff(w: ApiWeeklyOff): DayOff {
  return {
    date:        weeklyOffToDate(w.week_start, w.day_of_week),
    employee_id: w.employee_id,
    name:        `${w.employee.first_name} ${w.employee.last_name}`,
    nickname:    w.employee.nickname,
    branch_id:   w.employee.branch.id,
    branch_name: w.employee.branch.name,
    status:      w.status,
  }
}

function getLeaveLabel(leave_type: string, reason?: string): string {
  const bracket = reason?.match(/^\[(.+?)\]/)?.[1]
  if (bracket) return bracket
  return LEAVE_CFG[leave_type]?.label ?? leave_type
}

const HOLIDAY_LABELS = new Set(['หยุด', 'หยุดนักขัตฤกษ์'])

function getLeaveCfg(l: LeaveReq) {
  if (HOLIDAY_LABELS.has(l.display_label)) {
    return { color: '#EF4444', light: '#FEE2E2', icon: LEAVE_CFG.PERSONAL.icon, label: l.display_label }
  }
  return LEAVE_CFG[l.leave_type] ? { ...LEAVE_CFG[l.leave_type], label: l.display_label } : { color: '#6b7280', light: '#f3f4f6', icon: null, label: l.display_label }
}

function toDisplayLeave(l: ApiLeave): LeaveReq {
  return {
    id:            l.id,
    employee_id:   l.employee_id,
    name:          `${l.employee.first_name} ${l.employee.last_name}`,
    nickname:      l.employee.nickname,
    branch_id:     l.employee.branch.id,
    branch_name:   l.employee.branch.name,
    leave_type:    l.leave_type,
    display_label: getLeaveLabel(l.leave_type, l.reason),
    start_date:    l.start_date.slice(0, 10),
    end_date:      l.end_date.slice(0, 10),
    status:        l.status,
  }
}

// ─── Get events for a specific date ───────────────────────────────────────────
function getEventsForDate(date: string, branchFilter: string, dayOffs: DayOff[], leaves: LeaveReq[], holidays: Holiday[]) {
  const filteredDayOffs = dayOffs.filter(e =>
    e.date === date && (branchFilter === 'all' || e.branch_id === branchFilter)
  )
  const filteredLeaves = leaves.filter(l =>
    l.start_date <= date && l.end_date >= date &&
    (branchFilter === 'all' || l.branch_id === branchFilter)
  )
  const holiday = holidays.find(h => h.date.slice(0, 10) === date)
  return { dayOffs: filteredDayOffs, leaves: filteredLeaves, holiday }
}

// ─── Avatar chip ──────────────────────────────────────────────────────────────
function AvatarChip({ name, isPending }: { name: string; isPending: boolean }) {
  return (
    <div title={name} style={{
      width: 24, height: 24, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem',
      fontWeight: 700, color: '#fff', flexShrink: 0,
      background: isPending
        ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
        : 'linear-gradient(135deg,#fb923c,#ea580c)',
      border: isPending ? '2px dashed #f59e0b' : '2px solid #ea580c',
    }}>
      {initials(name)}
    </div>
  )
}

// ─── Calendar cell ─────────────────────────────────────────────────────────────
function DayCell({ day, month, branchFilter, isToday, isSelected, onClick, dayOffs, leaves, holidays, compact = false }: {
  day: number; month: string; branchFilter: string; isToday: boolean; isSelected: boolean; onClick: () => void
  dayOffs: DayOff[]; leaves: LeaveReq[]; holidays: Holiday[]; compact?: boolean
}) {
  const dateStr = toDateStr(month, day)
  const { dayOffs: evDayOffs, leaves: evLeaves, holiday } = getEventsForDate(dateStr, branchFilter, dayOffs, leaves, holidays)
  const pendingCount = evDayOffs.filter(d => d.status === 'PENDING').length
  const totalOff   = evDayOffs.length
  const totalLeave = evLeaves.filter(l => l.status !== 'REJECTED').length
  const hasEvent   = totalOff > 0 || totalLeave > 0

  const MAX_SHOW = 3
  const shown    = evDayOffs.slice(0, MAX_SHOW)
  const overflow = totalOff - MAX_SHOW

  return (
    <button
      onClick={onClick}
      style={{
        background: holiday ? '#fef2f2' : isSelected ? '#fff7ed' : '#fff',
        border: isSelected ? '2px solid #f97316' : '1px solid #f1f5f9',
        borderRadius: compact ? 6 : 10, padding: compact ? '5px 3px 4px' : '8px 6px 6px',
        minHeight: compact ? 58 : 88, cursor: 'pointer', textAlign: 'left',
        position: 'relative', transition: 'all 0.12s',
        boxShadow: isSelected ? '0 0 0 3px rgba(249,115,22,0.15)' : hasEvent ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = holiday ? '#fef2f2' : '#fff' }}
    >
      {/* Date number */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 2 : 5 }}>
        <span style={{
          fontSize: compact ? '0.75rem' : '0.85rem', fontWeight: isToday ? 700 : 500,
          color: isToday ? '#fff' : holiday ? '#dc2626' : '#374151',
          background: isToday ? 'linear-gradient(135deg,#fb923c,#ea580c)' : 'transparent',
          borderRadius: '50%', width: compact ? 20 : 24, height: compact ? 20 : 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {day}
        </span>
        {/* Count badge */}
        {(totalOff + totalLeave) > 0 && (
          <span style={{
            fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px',
            borderRadius: 999, background: '#f97316', color: '#fff', lineHeight: 1.6,
          }}>
            {totalOff + totalLeave}
          </span>
        )}
      </div>

      {/* Holiday label */}
      {holiday && (
        <div style={{ fontSize: '0.58rem', color: '#dc2626', fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
          🎌 {holiday.name.length > 10 ? holiday.name.slice(0, 10) + '…' : holiday.name}
        </div>
      )}

      {/* Day-off avatar chips */}
      {totalOff > 0 && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 3 }}>
          {shown.map(d => <AvatarChip key={d.employee_id} name={d.name} isPending={d.status === 'PENDING'} />)}
          {overflow > 0 && (
            <div style={{
              width: 24, height: 24, borderRadius: '50%', fontSize: '0.58rem',
              fontWeight: 700, color: '#6b7280', background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              +{overflow}
            </div>
          )}
        </div>
      )}

      {/* Leave dots */}
      {totalLeave > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {evLeaves.filter(l => l.status !== 'REJECTED').slice(0, 3).map(l => {
            const cfg = getLeaveCfg(l)
            return (
              <div key={l.id} title={`${l.display_label} — ${l.name}`} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cfg.color,
                border: l.status === 'PENDING' ? `2px dashed ${cfg.color}` : `2px solid ${cfg.color}`,
                flexShrink: 0,
              }} />
            )
          })}
        </div>
      )}

      {/* Pending indicator */}
      {pendingCount > 0 && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 6, height: 6, borderRadius: '50%',
          background: '#fbbf24',
        }} />
      )}
    </button>
  )
}

// ─── Day detail panel ─────────────────────────────────────────────────────────
function DayDetailPanel({ date, branchFilter, onClose, dayOffs, leaves, holidays }: {
  date: string; branchFilter: string; onClose: () => void
  dayOffs: DayOff[]; leaves: LeaveReq[]; holidays: Holiday[]
}) {
  const { dayOffs: evDayOffs, leaves: evLeaves, holiday } = getEventsForDate(date, branchFilter, dayOffs, leaves, holidays)
  const approved     = evDayOffs.filter(d => d.status === 'APPROVED')
  const pending      = evDayOffs.filter(d => d.status === 'PENDING')
  const activeLeaves = evLeaves.filter(l => l.status !== 'REJECTED')

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
      padding: 20, minWidth: 260, flexShrink: 0,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            รายละเอียด
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 2 }}>
            {fmtDateFull(date)}
          </div>
        </div>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
          <X size={14} />
        </button>
      </div>

      {/* Holiday */}
      {holiday && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
          🎌 {holiday.name}
        </div>
      )}

      {/* Nothing to show */}
      {evDayOffs.length === 0 && activeLeaves.length === 0 && !holiday && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: '0.8rem' }}>
          ไม่มีการลาหรือวันหยุดในวันนี้
        </div>
      )}

      {/* Day-offs approved */}
      {approved.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CalendarDays size={13} color="#ea580c" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c' }}>
              วันหยุดประจำ — อนุมัติแล้ว ({approved.length})
            </span>
          </div>
          {approved.map(d => (
            <div key={d.employee_id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: '1px solid #f9fafb',
            }}>
              <AvatarChip name={d.name} isPending={false} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{d.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{d.branch_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day-offs pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CalendarDays size={13} color="#d97706" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
              วันหยุดประจำ — รออนุมัติ ({pending.length})
            </span>
          </div>
          {pending.map(d => (
            <div key={d.employee_id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: '1px solid #f9fafb',
            }}>
              <AvatarChip name={d.name} isPending={true} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{d.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{d.branch_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaves */}
      {activeLeaves.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CalendarDays size={13} color="#6b7280" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280' }}>
              วันลา ({activeLeaves.length})
            </span>
          </div>
          {activeLeaves.map(l => {
            const cfg = getLeaveCfg(l)
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                borderBottom: '1px solid #f9fafb',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{l.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{l.display_label} · {l.branch_name}</div>
                </div>
                {l.status === 'PENDING' && (
                  <span style={{ fontSize: '0.6rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                    รอ
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TeamCalendarTab() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayYM  = todayStr.slice(0, 7)
  const isMobile = useIsMobile()

  const [month,        setMonth]        = useState(todayYM)
  const [branchFilter, setBranchFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = Number(month.slice(0, 4))

  const { data: rawWeeklyOff = [] } = useQuery<ApiWeeklyOff[]>({
    queryKey: ['admin', 'weekly-off', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month } }).then(r => r.data.data),
  })

  const { data: rawLeaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'leave-requests-cal', month],
    queryFn: () => api.get('/api/v1/admin/leave-requests', { params: { month } }).then(r => r.data.data),
  })

  const { data: rawHolidays = [] } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'holidays', year],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year } }).then(r => r.data.data),
  })

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const dayOffs: DayOff[]    = rawWeeklyOff.filter(w => w.status !== 'REJECTED').map(toDisplayDayOff)
  const leaves: LeaveReq[]   = rawLeaves.map(toDisplayLeave)
  const holidays: Holiday[]  = rawHolidays.map(h => ({ date: h.date.slice(0, 10), name: h.name }))

  const daysInMonth = getDaysInMonth(month)
  const firstDow    = getFirstDow(month)
  const totalCells  = Math.ceil((daysInMonth + firstDow) / 7) * 7

  const allDayOffsThisMonth = dayOffs.filter(d => {
    const match    = d.date.startsWith(month)
    const branchOk = branchFilter === 'all' || d.branch_id === branchFilter
    return match && branchOk
  })
  const allLeavesThisMonth = leaves.filter(l => {
    const overlap  = l.start_date.slice(0, 7) <= month && l.end_date.slice(0, 7) >= month
    const branchOk = branchFilter === 'all' || l.branch_id === branchFilter
    return overlap && branchOk && l.status !== 'REJECTED'
  })
  const pendingCount = [...allDayOffsThisMonth, ...allLeavesThisMonth].filter(e => (e as any).status === 'PENDING').length

  function handleDayClick(day: number) {
    const dateStr = toDateStr(month, day)
    setSelectedDate(prev => prev === dateStr ? null : dateStr)
  }

  return (
    <div>
      {/* Stats row — 2×2 on mobile, 4 cols on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
        {[
          { label: 'หยุดประจำ',    value: `${allLeavesThisMonth.filter(l => HOLIDAY_LABELS.has(l.display_label)).length}`, unit: 'ครั้ง', color: '#ef4444', bg: '#fef2f2' },
          { label: 'วันหยุดพิเศษ', value: `${allDayOffsThisMonth.length}`,                                                  unit: 'คำขอ',  color: '#ea580c', bg: '#fff7ed' },
          { label: 'วันลาเดือนนี้', value: `${allLeavesThisMonth.filter(l => !HOLIDAY_LABELS.has(l.display_label)).length}`, unit: 'ครั้ง', color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รออนุมัติ',    value: `${pendingCount}`,                                                                 unit: 'รายการ', color: '#d97706', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: isMobile ? '10px 12px' : '12px 16px', border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer', outline: 'none', flex: isMobile ? '1 1 auto' : 'none' }}
        >
          <option value="all">ทุกสาขา</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setMonth(m => addMonths(m, -1))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={16} color="#374151" />
          </button>
          <span style={{ fontSize: isMobile ? '0.82rem' : '0.95rem', fontWeight: 700, color: '#111827', minWidth: isMobile ? 110 : 160, textAlign: 'center' }}>
            {fmtMonthTH(month)}
          </span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>
      </div>

      {/* Calendar grid (always full width) */}
      <div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 2 : 4, marginBottom: isMobile ? 2 : 4 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', padding: '4px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 2 : 4 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDow + 1
            if (day < 1 || day > daysInMonth) {
              return <div key={i} style={{ minHeight: isMobile ? 56 : 88, background: '#f8fafc', borderRadius: isMobile ? 6 : 10, opacity: 0.3 }} />
            }
            const dateStr   = toDateStr(month, day)
            const isToday   = dateStr === todayStr
            const isSelected = selectedDate === dateStr
            return (
              <DayCell
                key={i}
                day={day}
                month={month}
                branchFilter={branchFilter}
                isToday={isToday}
                isSelected={isSelected}
                onClick={() => handleDayClick(day)}
                dayOffs={dayOffs}
                leaves={leaves}
                holidays={holidays}
                compact={isMobile}
              />
            )
          })}
        </div>
      </div>

      {/* Detail panel — bottom sheet on mobile, inline on desktop */}
      {selectedDate && (
        isMobile ? (
          <>
            {/* Mobile: backdrop */}
            <div
              onClick={() => setSelectedDate(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
            />
            {/* Mobile: bottom sheet */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: '#fff', borderRadius: '16px 16px 0 0',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
              maxHeight: '70vh', overflowY: 'auto',
              padding: '20px 16px',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 16px' }} />
              <DayDetailPanel
                date={selectedDate}
                branchFilter={branchFilter}
                onClose={() => setSelectedDate(null)}
                dayOffs={dayOffs}
                leaves={leaves}
                holidays={holidays}
              />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16 }}>
            <DayDetailPanel
              date={selectedDate}
              branchFilter={branchFilter}
              onClose={() => setSelectedDate(null)}
              dayOffs={dayOffs}
              leaves={leaves}
              holidays={holidays}
            />
          </div>
        )
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginTop: 16, flexWrap: 'wrap', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: '#6b7280' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#fb923c,#ea580c)', flexShrink: 0 }} />
          หยุดประจำ (อนุมัติ)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: '#6b7280' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: '2px dashed #f59e0b', flexShrink: 0 }} />
          หยุดประจำ (รอ)
        </div>
        {Object.entries(LEAVE_CFG).map(([k, cfg]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: '#6b7280' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            {cfg.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: '#6b7280' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fef2f2', border: '1px solid #fecaca', flexShrink: 0 }} />
          วันหยุดนักขัตฤกษ์
        </div>
      </div>
    </div>
  )
}
