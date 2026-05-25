// admin/src/pages/leave/index.tsx
import { useState } from 'react'
import { MOCK_EMPLOYEES, MOCK_LEAVE_BALANCES, MOCK_LEAVE_REQUESTS, MOCK_BRANCHES, MOCK_WEEKLY_OFF_BOOKINGS } from '../../lib/mock'
import type { LeaveType, LeaveBalance, LeaveRequest, LeaveStatus, WeeklyOffBooking } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

type EventType = { date: string; nickname: string; type: LeaveType; label: string; color: string; bg: string }

const TYPE_CONFIG: Record<LeaveType, { label: string; color: string; bg: string }> = {
  HOLIDAY:    { label: 'วันหยุด',         color: '#dc2626', bg: '#fee2e2' },
  SICK:       { label: 'ลาป่วย',          color: '#16a34a', bg: '#dcfce7' },
  PERSONAL:   { label: 'ลากิจ',           color: '#2563eb', bg: '#dbeafe' },
  VACATION:   { label: 'พักร้อน',         color: '#d97706', bg: '#fef3c7' },
  COMPENSATE: { label: 'หยุดชดเชย',       color: '#7c3aed', bg: '#ede9fe' },
  WEEKLY_OFF: { label: 'หยุดประจำสัปดาห์',color: '#64748b', bg: '#f1f5f9' },
  HALF_DAY:   { label: 'ลาครึ่งวัน',      color: '#0891b2', bg: '#e0f2fe' },
}

const STATUS_CFG: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'รอพิจารณา', color: '#d97706', bg: '#fef3c7' },
  APPROVED:  { label: 'อนุมัติ',   color: '#16a34a', bg: '#dcfce7' },
  REJECTED:  { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'ยกเลิก',    color: '#6b7280', bg: '#f3f4f6' },
}

function buildEvents(): EventType[] {
  const events: EventType[] = []
  const nicknames = MOCK_EMPLOYEES.map(e => e.nickname)
  const yr = 2026; const mo = 5
  const daysInMonth = new Date(yr, mo, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(yr, mo - 1, d)
    const dow = date.getDay()
    const dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    nicknames.forEach((nick, idx) => {
      if (dow === idx % 7) events.push({ date: dateStr, nickname: nick, type: 'WEEKLY_OFF', ...TYPE_CONFIG['WEEKLY_OFF'] })
    })
  }
  events.push({ date: '2026-05-01', nickname: 'ทุกคน',  type: 'HOLIDAY',   ...TYPE_CONFIG['HOLIDAY'] })
  events.push({ date: '2026-05-18', nickname: 'ปิ๊ว',   type: 'VACATION',  ...TYPE_CONFIG['VACATION'] })
  events.push({ date: '2026-05-19', nickname: 'ปิ๊ว',   type: 'VACATION',  ...TYPE_CONFIG['VACATION'] })
  events.push({ date: '2026-05-10', nickname: 'เฟิร์ส', type: 'SICK',      ...TYPE_CONFIG['SICK'] })
  events.push({ date: '2026-05-15', nickname: 'แพร',    type: 'PERSONAL',  ...TYPE_CONFIG['PERSONAL'] })
  events.push({ date: '2026-05-22', nickname: 'มิลส์',  type: 'COMPENSATE',...TYPE_CONFIG['COMPENSATE'] })
  events.push({ date: '2026-05-21', nickname: 'สมาย',   type: 'HALF_DAY',  ...TYPE_CONFIG['HALF_DAY'] })
  return events
}
const EVENTS = buildEvents()

// ── Weekly Off helpers ────────────────────────────────────────────────────────
const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']

const WEEKLY_STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fee2e2' },
}

function getWeekStart(offset: number): string {
  const base = new Date(2026, 4, 25) // Mon 25 May 2026 = current week
  base.setDate(base.getDate() + offset * 7)
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`
}

function formatWeekRange(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y, m-1, d)
  const end   = new Date(y, m-1, d+6)
  const mn = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${start.getDate()} ${mn[start.getMonth()]} – ${end.getDate()} ${mn[end.getMonth()]} ${end.getFullYear()+543}`
}

function BalanceBar({ used, quota, color }: { used: number; quota: number; color: string }) {
  const pct = quota === 0 ? 0 : Math.min((used / quota) * 100, 100)
  const remaining = quota - used
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
        <span style={{ color: remaining <= 0 ? '#dc2626' : '#374151', fontWeight: 600 }}>{Math.max(0, remaining)} วัน</span>
        <span style={{ color: '#9ca3af' }}>/{quota}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#f3f4f6' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#dc2626' : color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [mainTab, setMainTab] = useState<'calendar'|'balance'|'requests'|'weekly'>('calendar')
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5)
  const [empFilter, setEmpFilter] = useState('')
  const [balances, setBalances] = useState<LeaveBalance[]>(MOCK_LEAVE_BALANCES)
  const [balBranch, setBalBranch] = useState('')
  const [balSearch, setBalSearch] = useState('')
  const [editModal, setEditModal] = useState<LeaveBalance | null>(null)
  const [editForm, setEditForm] = useState<Partial<LeaveBalance>>({})
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS)
  const [reqStatus, setReqStatus] = useState<LeaveStatus | ''>('')
  const [rejectModal, setRejectModal] = useState<LeaveRequest | null>(null)

  // Weekly off state
  const [weeklyOffset, setWeeklyOffset] = useState(0)
  const [weeklyBranch, setWeeklyBranch] = useState('')
  const [weeklyBookings, setWeeklyBookings] = useState<WeeklyOffBooking[]>(MOCK_WEEKLY_OFF_BOOKINGS)
  const [weeklyRejectModal, setWeeklyRejectModal] = useState<WeeklyOffBooking | null>(null)

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthEvents = EVENTS.filter(e => { const [ey, em] = e.date.split('-').map(Number); return ey === year && em === month })
  function getEventsForDay(d: number) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return monthEvents.filter(e => e.date === dateStr && (!empFilter || e.nickname.includes(empFilter)))
  }
  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  const filteredBal = balances.filter(b => (!balBranch || b.branch_name === balBranch) && (!balSearch || b.full_name.includes(balSearch) || b.nickname.includes(balSearch)))
  function openEdit(b: LeaveBalance) { setEditForm({ ...b }); setEditModal(b) }
  function saveEdit() {
    setBalances(prev => prev.map(b => b.employee_id === editModal!.employee_id ? { ...b, ...editForm } as LeaveBalance : b))
    showToast('success', `บันทึกโควต้าวันลา "${editModal!.full_name}" เรียบร้อยแล้ว`)
    setEditModal(null)
  }

  const filteredReq = requests.filter(r => !reqStatus || r.status === reqStatus)
  function approveReq(id: string) {
    const req = requests.find(r => r.id === id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r))
    if (req) showToast('success', `อนุมัติวันลา "${req.leave_type}" ของ "${req.full_name}"`)
  }
  function confirmReject() {
    if (!rejectModal) return
    setRequests(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: 'REJECTED' } : r))
    showToast('info', `ไม่อนุมัติวันลา "${rejectModal.leave_type}" ของ "${rejectModal.full_name}"`)
    setRejectModal(null)
  }

  const inputSt: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const pendingCount = requests.filter(r => r.status === 'PENDING').length
  const overQuotaCount = balances.filter(b =>
    b.sick_used > b.sick_quota || b.personal_used > b.personal_quota ||
    b.vacation_used > b.vacation_quota || b.compensate_used > b.compensate_quota
  ).length

  // Weekly off computed
  const currentWeekStart = getWeekStart(weeklyOffset)
  const weekBookings = weeklyBookings.filter(b =>
    b.week_start === currentWeekStart &&
    (!weeklyBranch || b.branch_name === weeklyBranch)
  )
  const weeklyPendingCount = weeklyBookings.filter(b =>
    b.week_start === getWeekStart(0) && b.status === 'PENDING'
  ).length
  function getDayCount(dow: number) { return weekBookings.filter(b => b.day_of_week === dow).length }
  function approveWeekly(id: string) {
    const b = weeklyBookings.find(w => w.id === id)
    setWeeklyBookings(prev => prev.map(w => w.id === id ? { ...w, status: 'APPROVED' as const } : w))
    if (b) showToast('success', `อนุมัติวันหยุดวัน${DAYS_FULL[b.day_of_week]}ของ "${b.full_name}"`)
  }
  function confirmWeeklyReject() {
    if (!weeklyRejectModal) return
    setWeeklyBookings(prev => prev.map(w => w.id === weeklyRejectModal.id ? { ...w, status: 'REJECTED' as const } : w))
    showToast('info', `ไม่อนุมัติวันหยุดวัน${DAYS_FULL[weeklyRejectModal.day_of_week]}ของ "${weeklyRejectModal.full_name}"`)
    setWeeklyRejectModal(null)
  }
  const bottomSheetStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center', zIndex: 200,
  }
  const sheetBox = (width = 440): React.CSSProperties => ({
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : 16,
    padding: '24px',
    width: isMobile ? '100%' : width,
    maxHeight: isMobile ? '85vh' : '90vh',
    overflowY: 'auto',
    paddingBottom: isMobile ? 'max(24px,env(safe-area-inset-bottom))' : 24,
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>📅 วันลา & วันหยุด</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>จัดการวันลา, โควต้า, และปฏิทิน</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        {([
          ['calendar', '📅 ปฏิทิน'],
          ['balance', `📋 โควต้า${overQuotaCount > 0 ? ` 🚨${overQuotaCount}` : ''}`],
          ['requests', `📝 คำขอ${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
          ['weekly',   `🗓 จองวันหยุด${weeklyPendingCount > 0 ? ` (${weeklyPendingCount})` : ''}`],
        ] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setMainTab(tab)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: isMobile ? '0.82rem' : '0.875rem', fontWeight: mainTab === tab ? 700 : 400, background: mainTab === tab ? '#f97316' : '#f3f4f6', color: mainTab === tab ? '#fff' : '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Calendar Tab ── */}
      {mainTab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '1rem' }}>‹</button>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '1rem' }}>›</button>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{MONTHS_TH[month-1]} {year+543}</h3>
            <button onClick={() => { setYear(2026); setMonth(5) }} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.82rem', marginLeft: 'auto' }}>วันนี้</button>
          </div>
          {!isMobile && (
            <div style={{ marginBottom: 10 }}>
              <input value={empFilter} onChange={e => setEmpFilter(e.target.value)} placeholder="🔍 ค้นหาพนักงาน..." style={{ ...inputSt, width: 220 }} />
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #e5e7eb' }}>
              {DAYS_TH.map((d, i) => (
                <div key={d} style={{ padding: isMobile ? '8px 4px' : '10px 8px', textAlign: 'center', fontSize: isMobile ? '0.75rem' : '0.82rem', fontWeight: 600, color: i === 0 || i === 6 ? '#dc2626' : '#2563eb', background: '#f8fafc' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`e${i}`} style={{ minHeight: isMobile ? 48 : 90, borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1
                const dayEvents = getEventsForDay(d)
                const isToday = year === 2026 && month === 5 && d === 20
                const dow = (firstDay + i) % 7
                const isWeekend = dow === 0 || dow === 6
                return (
                  <div key={d} style={{ minHeight: isMobile ? 48 : 90, borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', padding: isMobile ? '4px' : '6px', background: isWeekend ? '#fafafa' : '#fff' }}>
                    <div style={{ fontSize: isMobile ? '0.72rem' : '0.82rem', fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isWeekend ? '#9ca3af' : '#374151', width: isMobile ? 20 : 24, height: isMobile ? 20 : 24, borderRadius: '50%', background: isToday ? '#f97316' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>{d}</div>
                    {!isMobile && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 2).map((ev, ei) => (
                          <div key={ei} style={{ fontSize: '0.68rem', fontWeight: 600, color: ev.color, background: ev.bg, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.nickname}
                          </div>
                        ))}
                        {dayEvents.length > 2 && <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>+{dayEvents.length - 2}</div>}
                      </div>
                    )}
                    {isMobile && dayEvents.length > 0 && (
                      <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {dayEvents.slice(0, 3).map((ev, ei) => (
                          <div key={ei} style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'WEEKLY_OFF').map(([k, v]) => (
              <span key={k} style={{ fontSize: '0.7rem', fontWeight: 600, color: v.color, background: v.bg, borderRadius: 99, padding: '2px 8px' }}>{v.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Balance Tab ── */}
      {mainTab === 'balance' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
            {[
              { label: 'ลาป่วยรวม',   value: balances.reduce((s,b)=>s+b.sick_used,0),       color: '#16a34a', bg: '#f0fdf4' },
              { label: 'ลากิจรวม',    value: balances.reduce((s,b)=>s+b.personal_used,0),   color: '#2563eb', bg: '#eff6ff' },
              { label: 'พักร้อนรวม',  value: balances.reduce((s,b)=>s+b.vacation_used,0),   color: '#d97706', bg: '#fef3c7' },
              { label: 'ชดเชยรวม',    value: balances.reduce((s,b)=>s+b.compensate_used,0), color: '#7c3aed', bg: '#ede9fe' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: isMobile ? '10px 12px' : '14px 18px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 700, color: s.color }}>{s.value} <span style={{ fontSize: '0.78rem', fontWeight: 400 }}>วัน</span></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={balSearch} onChange={e => setBalSearch(e.target.value)} placeholder="🔍 ค้นหาพนักงาน..." style={{ ...inputSt, flex: 1, minWidth: 160 }} />
            <select value={balBranch} onChange={e => setBalBranch(e.target.value)} style={{ ...inputSt }}>
              <option value="">ทุกสาขา</option>
              {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBal.map(b => (
                <div key={b.employee_id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{b.full_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{b.nickname} · {b.branch_name}</div>
                    </div>
                    <button onClick={() => openEdit(b)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.78rem', color: '#374151', flexShrink: 0 }}>✏ แก้ไข</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><div style={{ fontSize: '0.72rem', color: '#16a34a', marginBottom: 4, fontWeight: 600 }}>🏥 ลาป่วย</div><BalanceBar used={b.sick_used} quota={b.sick_quota} color="#16a34a" /></div>
                    <div><div style={{ fontSize: '0.72rem', color: '#2563eb', marginBottom: 4, fontWeight: 600 }}>📋 ลากิจ</div><BalanceBar used={b.personal_used} quota={b.personal_quota} color="#2563eb" /></div>
                    <div><div style={{ fontSize: '0.72rem', color: '#d97706', marginBottom: 4, fontWeight: 600 }}>🏖 พักร้อน</div><BalanceBar used={b.vacation_used} quota={b.vacation_quota} color="#d97706" /></div>
                    <div><div style={{ fontSize: '0.72rem', color: '#7c3aed', marginBottom: 4, fontWeight: 600 }}>🔄 ชดเชย</div><BalanceBar used={b.compensate_used} quota={b.compensate_quota} color="#7c3aed" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe' }}>
                      {['พนักงาน','สาขา','🏥 ลาป่วย','📋 ลากิจ','🏖 พักร้อน','🔄 ชดเชย','จัดการ'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBal.map((b, i) => (
                      <tr key={b.employee_id} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding: '12px 14px' }}><div style={{ fontWeight: 600 }}>{b.full_name}</div><div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{b.nickname}</div></td>
                        <td style={{ padding: '12px 14px', fontSize: '0.82rem' }}>{b.branch_name}</td>
                        <td style={{ padding: '12px 14px' }}><BalanceBar used={b.sick_used} quota={b.sick_quota} color="#16a34a" /></td>
                        <td style={{ padding: '12px 14px' }}><BalanceBar used={b.personal_used} quota={b.personal_quota} color="#2563eb" /></td>
                        <td style={{ padding: '12px 14px' }}><BalanceBar used={b.vacation_used} quota={b.vacation_quota} color="#d97706" /></td>
                        <td style={{ padding: '12px 14px' }}><BalanceBar used={b.compensate_used} quota={b.compensate_quota} color="#7c3aed" /></td>
                        <td style={{ padding: '12px 14px' }}><button onClick={() => openEdit(b)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.8rem' }}>✏ แก้ไขโควต้า</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Requests Tab ── */}
      {mainTab === 'requests' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {(['','PENDING','APPROVED','REJECTED','CANCELLED'] as const).map(s => (
              <button key={s} onClick={() => setReqStatus(s as any)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: '12px', cursor: 'pointer', fontWeight: 500, border: reqStatus === s ? '1.5px solid #f97316' : '1px solid #e5e7eb', background: reqStatus === s ? '#fff7ed' : '#fff', color: reqStatus === s ? '#ea580c' : '#4b5563', whiteSpace: 'nowrap' }}>
                {s === '' ? 'ทั้งหมด' : STATUS_CFG[s as LeaveStatus].label}
              </button>
            ))}
          </div>

          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredReq.map(r => {
                const sc = STATUS_CFG[r.status]
                return (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{r.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{r.branch_name}</div>
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{sc.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ background: `${r.leave_type_color}18`, color: r.leave_type_color, borderRadius: 99, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{r.leave_type}</span>
                      <span style={{ fontSize: '0.78rem', color: '#374151' }}>{r.start_date === r.end_date ? r.start_date : `${r.start_date} – ${r.end_date}`}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{r.days} วัน</span>
                    </div>
                    {r.reason && <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 6 }}>{r.reason}</div>}
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => approveReq(r.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>✓ อนุมัติ</button>
                        <button onClick={() => setRejectModal(r)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #dc2626', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>✕ ไม่อนุมัติ</button>
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredReq.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่มีคำขอวันลา</div>}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#dbeafe' }}>
                      {['พนักงาน','สาขา','ประเภทลา','วันที่ลา','จำนวน','เหตุผล','สถานะ','จัดการ'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReq.map((r, i) => {
                      const sc = STATUS_CFG[r.status]
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: i%2===0?'#fff':'#fafafa' }}>
                          <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 600 }}>{r.full_name}</div><div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.nickname}</div></td>
                          <td style={{ padding: '11px 14px', fontSize: '0.82rem' }}>{r.branch_name}</td>
                          <td style={{ padding: '11px 14px' }}><span style={{ background: `${r.leave_type_color}18`, color: r.leave_type_color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{r.leave_type}</span></td>
                          <td style={{ padding: '11px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{r.start_date === r.end_date ? r.start_date : `${r.start_date} – ${r.end_date}`}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700 }}>{r.days} วัน</td>
                          <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem', maxWidth: 160 }}>{r.reason || '—'}</td>
                          <td style={{ padding: '11px 14px' }}><span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{sc.label}</span></td>
                          <td style={{ padding: '11px 14px' }}>
                            {r.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => approveReq(r.id)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>✓ อนุมัติ</button>
                                <button onClick={() => setRejectModal(r)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #dc2626', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>✕</button>
                              </div>
                            ) : <span style={{ color: '#9ca3af' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Off Tab ── */}
      {mainTab === 'weekly' && (
        <div>
          {/* Week navigation + branch filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setWeeklyOffset(o => o-1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '1rem' }}>‹</button>
            <button onClick={() => setWeeklyOffset(o => o+1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '1rem' }}>›</button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatWeekRange(currentWeekStart)}</span>
            {weeklyOffset !== 0 && (
              <button onClick={() => setWeeklyOffset(0)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.78rem' }}>สัปดาห์นี้</button>
            )}
            <select value={weeklyBranch} onChange={e => setWeeklyBranch(e.target.value)} style={{ ...inputSt, marginLeft: 'auto' }}>
              <option value="">ทุกสาขา</option>
              {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {/* Day conflict overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 4 : 8, marginBottom: 16 }}>
            {[1,2,3,4,5,6,0].map(dow => {
              const cnt = getDayCount(dow)
              const bg    = cnt === 0 ? '#f8fafc' : cnt === 1 ? '#dcfce7' : cnt === 2 ? '#fef3c7' : '#fee2e2'
              const color = cnt === 0 ? '#9ca3af' : cnt === 1 ? '#16a34a' : cnt === 2 ? '#d97706' : '#dc2626'
              return (
                <div key={dow} style={{ textAlign: 'center', background: bg, borderRadius: 10, padding: isMobile ? '8px 2px' : '12px 6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 4 }}>{DAYS_TH[dow]}</div>
                  <div style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 700, color }}>{cnt}</div>
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>คน</div>
                </div>
              )
            })}
          </div>

          {/* Bookings list */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {weekBookings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>ยังไม่มีการจองวันหยุดสัปดาห์นี้</div>
              )}
              {[...weekBookings].sort((a,b) => a.day_of_week - b.day_of_week).map(bk => {
                const sc = WEEKLY_STATUS_CFG[bk.status]
                const sameDayCnt = weekBookings.filter(x => x.day_of_week === bk.day_of_week).length
                return (
                  <div key={bk.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${sameDayCnt >= 3 ? '#fca5a5' : '#e5e7eb'}`, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bk.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{bk.nickname} · {bk.branch_name}</div>
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{sc.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 99, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>วัน{DAYS_FULL[bk.day_of_week]}</span>
                      {sameDayCnt >= 3 && <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>⚠ {sameDayCnt} คนวันเดียวกัน</span>}
                    </div>
                    {bk.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => approveWeekly(bk.id)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>✓ อนุมัติ</button>
                        <button onClick={() => setWeeklyRejectModal(bk)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #dc2626', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>✕ ไม่อนุมัติ</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    {['พนักงาน','สาขา','วันหยุด','คนวันเดียวกัน','สถานะ','จัดการ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekBookings.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีการจองวันหยุดสัปดาห์นี้</td></tr>
                  )}
                  {[...weekBookings].sort((a,b) => a.day_of_week - b.day_of_week).map((bk, i) => {
                    const sc = WEEKLY_STATUS_CFG[bk.status]
                    const sameDayCnt = weekBookings.filter(x => x.day_of_week === bk.day_of_week).length
                    return (
                      <tr key={bk.id} style={{ borderBottom: '1px solid #f3f4f6', background: sameDayCnt >= 3 ? '#fef2f2' : i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 600 }}>{bk.full_name}</div><div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{bk.nickname}</div></td>
                        <td style={{ padding: '11px 14px', fontSize: '0.82rem' }}>{bk.branch_name}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 99, padding: '3px 12px', fontSize: '0.82rem', fontWeight: 600 }}>วัน{DAYS_FULL[bk.day_of_week]}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ color: sameDayCnt >= 3 ? '#dc2626' : sameDayCnt >= 2 ? '#d97706' : '#16a34a', fontWeight: 700 }}>{sameDayCnt} คน</span>
                          {sameDayCnt >= 3 && <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#dc2626' }}>⚠ เต็มมาก</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{sc.label}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {bk.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => approveWeekly(bk.id)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>✓ อนุมัติ</button>
                              <button onClick={() => setWeeklyRejectModal(bk)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #dc2626', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>✕</button>
                            </div>
                          ) : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Balance Modal */}
      {editModal && (
        <div style={bottomSheetStyle} onClick={() => setEditModal(null)}>
          <div style={sheetBox(440)} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>✏ แก้ไขโควต้าวันลา</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>{editModal.full_name} ({editModal.nickname})</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'sick_quota', label: '🏥 ลาป่วย', used: editModal.sick_used },
                { key: 'personal_quota', label: '📋 ลากิจ', used: editModal.personal_used },
                { key: 'vacation_quota', label: '🏖 พักร้อน', used: editModal.vacation_used },
                { key: 'compensate_quota', label: '🔄 ชดเชย', used: editModal.compensate_used },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>{f.label}</label>
                  <input type="number" min={0} max={365} value={(editForm as any)[f.key] ?? 0} onChange={e => setEditForm(p => ({ ...p, [f.key]: Number(e.target.value) }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>ใช้ {f.used} วัน</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={saveEdit} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 600 }}>💾 บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Off Reject Modal */}
      {weeklyRejectModal && (
        <div style={bottomSheetStyle} onClick={() => setWeeklyRejectModal(null)}>
          <div style={sheetBox(380)} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>ไม่อนุมัติวันหยุดประจำสัปดาห์</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
              {weeklyRejectModal.full_name} · วัน{DAYS_FULL[weeklyRejectModal.day_of_week]}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setWeeklyRejectModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={confirmWeeklyReject} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 600 }}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={bottomSheetStyle} onClick={() => setRejectModal(null)}>
          <div style={sheetBox(380)} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>ไม่อนุมัติวันลา</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>{rejectModal.full_name} · {rejectModal.leave_type} · {rejectModal.days} วัน</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={confirmReject} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 600 }}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
