// admin/src/pages/leave/TeamCalendarTab.tsx  [MOCK MODE]
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, CalendarDays, Stethoscope, Briefcase, Sun, Heart } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface DayOff {
  date: string; employee_id: string; name: string; nickname: string
  branch_id: string; branch_name: string; status: 'PENDING' | 'APPROVED'
}
interface LeaveReq {
  id: string; employee_id: string; name: string; nickname: string
  branch_id: string; leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
  start_date: string; end_date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'
}
interface Holiday { date: string; name: string }

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_DAY_OFFS: DayOff[] = [
  { date: '2026-06-02', employee_id: 'e1', name: 'สมชาย ใจดี',     nickname: 'ชาย',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-02', employee_id: 'e2', name: 'มานี รักเรียน',   nickname: 'มานี', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-02', employee_id: 'e3', name: 'วิชัย ดีงาม',     nickname: 'อ้น',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'PENDING'  },
  { date: '2026-06-02', employee_id: 'e8', name: 'สุดา มีแรง',      nickname: 'ดา',   branch_id: 'br-02', branch_name: 'รัชดา',    status: 'APPROVED' },
  { date: '2026-06-09', employee_id: 'e1', name: 'สมชาย ใจดี',     nickname: 'ชาย',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-09', employee_id: 'e4', name: 'ประภา ดีมาก',     nickname: 'ป้อม', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-09', employee_id: 'e5', name: 'ชัยณรงค์ ขยัน',  nickname: 'เอก',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'PENDING'  },
  { date: '2026-06-09', employee_id: 'e6', name: 'สมหญิง ใจงาม',   nickname: 'หญิง', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-16', employee_id: 'e2', name: 'มานี รักเรียน',   nickname: 'มานี', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-16', employee_id: 'e3', name: 'วิชัย ดีงาม',     nickname: 'อ้น',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-16', employee_id: 'e9', name: 'บัว สวยงาม',      nickname: 'บัว',  branch_id: 'br-02', branch_name: 'รัชดา',    status: 'APPROVED' },
  { date: '2026-06-23', employee_id: 'e1', name: 'สมชาย ใจดี',     nickname: 'ชาย',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-23', employee_id: 'e4', name: 'ประภา ดีมาก',     nickname: 'ป้อม', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'PENDING'  },
  { date: '2026-06-30', employee_id: 'e5', name: 'ชัยณรงค์ ขยัน',  nickname: 'เอก',  branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
  { date: '2026-06-30', employee_id: 'e6', name: 'สมหญิง ใจงาม',   nickname: 'หญิง', branch_id: 'br-01', branch_name: 'ลาดพร้าว', status: 'APPROVED' },
]

const MOCK_LEAVES: LeaveReq[] = [
  { id: 'l1', employee_id: 'e3', name: 'วิชัย ดีงาม',    nickname: 'อ้น',  branch_id: 'br-01', leave_type: 'SICK',      start_date: '2026-06-05', end_date: '2026-06-05', status: 'APPROVED' },
  { id: 'l2', employee_id: 'e6', name: 'สมหญิง ใจงาม',  nickname: 'หญิง', branch_id: 'br-01', leave_type: 'PERSONAL',  start_date: '2026-06-11', end_date: '2026-06-12', status: 'PENDING'  },
  { id: 'l3', employee_id: 'e2', name: 'มานี รักเรียน',  nickname: 'มานี', branch_id: 'br-01', leave_type: 'VACATION',  start_date: '2026-06-17', end_date: '2026-06-19', status: 'APPROVED' },
  { id: 'l4', employee_id: 'e7', name: 'ปลา สวยงาม',    nickname: 'ปลา',  branch_id: 'br-01', leave_type: 'MATERNITY', start_date: '2026-06-01', end_date: '2026-06-30', status: 'APPROVED' },
  { id: 'l5', employee_id: 'e8', name: 'สุดา มีแรง',    nickname: 'ดา',   branch_id: 'br-02', leave_type: 'SICK',      start_date: '2026-06-24', end_date: '2026-06-25', status: 'APPROVED' },
]

const MOCK_HOLIDAYS: Holiday[] = [
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา (ชดเชย)' },
]

const BRANCHES = [
  { id: 'all', name: 'ทุกสาขา' },
  { id: 'br-01', name: 'ลาดพร้าว' },
  { id: 'br-02', name: 'รัชดา' },
  { id: 'br-03', name: 'สุขุมวิท' },
]

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

// ─── Get events for a specific date ───────────────────────────────────────────
function getEventsForDate(date: string, branchFilter: string) {
  const dayOffs = MOCK_DAY_OFFS.filter(e =>
    e.date === date && (branchFilter === 'all' || e.branch_id === branchFilter)
  )
  const leaves = MOCK_LEAVES.filter(l =>
    l.start_date <= date && l.end_date >= date &&
    (branchFilter === 'all' || l.branch_id === branchFilter)
  )
  const holiday = MOCK_HOLIDAYS.find(h => h.date === date)
  return { dayOffs, leaves, holiday }
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
function DayCell({ day, month, branchFilter, isToday, isSelected, onClick }: {
  day: number; month: string; branchFilter: string; isToday: boolean; isSelected: boolean; onClick: () => void
}) {
  const dateStr = toDateStr(month, day)
  const { dayOffs, leaves, holiday } = getEventsForDate(dateStr, branchFilter)
  const pendingCount = dayOffs.filter(d => d.status === 'PENDING').length
  const approvedCount = dayOffs.filter(d => d.status === 'APPROVED').length
  const totalOff = dayOffs.length
  const totalLeave = leaves.filter(l => l.status !== 'REJECTED').length
  const hasEvent = totalOff > 0 || totalLeave > 0

  const MAX_SHOW = 3
  const shown = dayOffs.slice(0, MAX_SHOW)
  const overflow = totalOff - MAX_SHOW

  return (
    <button
      onClick={onClick}
      style={{
        background: holiday ? '#fef2f2' : isSelected ? '#fff7ed' : '#fff',
        border: isSelected ? '2px solid #f97316' : '1px solid #f1f5f9',
        borderRadius: 10, padding: '8px 6px 6px',
        minHeight: 88, cursor: 'pointer', textAlign: 'left',
        position: 'relative', transition: 'all 0.12s',
        boxShadow: isSelected ? '0 0 0 3px rgba(249,115,22,0.15)' : hasEvent ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = holiday ? '#fef2f2' : '#fff' }}
    >
      {/* Date number */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{
          fontSize: '0.85rem', fontWeight: isToday ? 700 : 500,
          color: isToday ? '#fff' : holiday ? '#dc2626' : '#374151',
          background: isToday ? 'linear-gradient(135deg,#fb923c,#ea580c)' : 'transparent',
          borderRadius: '50%', width: 24, height: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {day}
        </span>
        {/* Count badge */}
        {(totalOff + totalLeave) > 0 && (
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
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
          {leaves.filter(l => l.status !== 'REJECTED').slice(0, 3).map(l => {
            const cfg = LEAVE_CFG[l.leave_type]
            return (
              <div key={l.id} title={`${cfg.label} — ${l.name}`} style={{
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
function DayDetailPanel({ date, branchFilter, onClose }: {
  date: string; branchFilter: string; onClose: () => void
}) {
  const { dayOffs, leaves, holiday } = getEventsForDate(date, branchFilter)
  const approved = dayOffs.filter(d => d.status === 'APPROVED')
  const pending  = dayOffs.filter(d => d.status === 'PENDING')
  const activeLeaves = leaves.filter(l => l.status !== 'REJECTED')

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
      {dayOffs.length === 0 && activeLeaves.length === 0 && !holiday && (
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
              <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#d97706', fontWeight: 700, background: '#fffbeb', padding: '2px 6px', borderRadius: 99 }}>รออนุมัติ</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaves */}
      {activeLeaves.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
            📋 วันลา ({activeLeaves.length})
          </div>
          {activeLeaves.map(l => {
            const cfg = LEAVE_CFG[l.leave_type]
            const isPending = l.status === 'PENDING'
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                background: cfg.light, borderRadius: 8, marginBottom: 6,
                border: `1px solid ${cfg.color}30`,
              }}>
                <div style={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{l.name}</div>
                  <div style={{ fontSize: '0.67rem', color: cfg.color, fontWeight: 600 }}>{cfg.label}</div>
                </div>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                  background: isPending ? '#fffbeb' : '#f0fdf4',
                  color: isPending ? '#d97706' : '#16a34a',
                }}>
                  {isPending ? 'รออนุมัติ' : 'อนุมัติ'}
                </span>
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

  const [month,        setMonth]        = useState('2026-06')
  const [branchFilter, setBranchFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(month)
  const firstDow    = getFirstDow(month)
  const totalCells  = Math.ceil((daysInMonth + firstDow) / 7) * 7

  // Stats for the month
  const allDayOffsThisMonth = MOCK_DAY_OFFS.filter(d => {
    const match = d.date.startsWith(month)
    const branchOk = branchFilter === 'all' || d.branch_id === branchFilter
    return match && branchOk
  })
  const allLeavesThisMonth = MOCK_LEAVES.filter(l => {
    const overlap = l.start_date.slice(0, 7) <= month && l.end_date.slice(0, 7) >= month
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
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'วันหยุดเดือนนี้', value: `${allDayOffsThisMonth.filter(d => d.status === 'APPROVED').length} ครั้ง`, color: '#ea580c', bg: '#fff7ed' },
          { label: 'วันลาเดือนนี้',   value: `${allLeavesThisMonth.length} ครั้ง`,                                       color: '#3b82f6', bg: '#eff6ff' },
          { label: 'รออนุมัติ',       value: `${pendingCount} รายการ`,                                                    color: '#d97706', bg: '#fffbeb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 16px', border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Branch filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <select 
            value={branchFilter} 
            onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer', outline: 'none' }}
          >
            {BRANCHES.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Month nav */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMonth(m => addMonths(m, -1))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={16} color="#374151" />
          </button>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', minWidth: 160, textAlign: 'center' }}>
            {fmtMonthTH(month)}
          </span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>
      </div>

      {/* Layout: Calendar + Detail panel */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDow + 1
              if (day < 1 || day > daysInMonth) {
                return <div key={i} style={{ minHeight: 88, background: '#f8fafc', borderRadius: 10, opacity: 0.3 }} />
              }
              const dateStr  = toDateStr(month, day)
              const isToday  = dateStr === todayStr
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
                />
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedDate && (
          <DayDetailPanel
            date={selectedDate}
            branchFilter={branchFilter}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', padding: '12px 16px', background: '#f8fafc', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6b7280' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#fb923c,#ea580c)' }} />
          วันหยุดประจำ (อนุมัติ)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6b7280' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: '2px dashed #f59e0b' }} />
          วันหยุดประจำ (รออนุมัติ)
        </div>
        {Object.entries(LEAVE_CFG).map(([k, cfg]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6b7280' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
            {cfg.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6b7280' }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#fef2f2', border: '1px solid #fecaca' }} />
          วันหยุดนักขัตฤกษ์
        </div>
      </div>
    </div>
  )
}
