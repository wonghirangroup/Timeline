// employee/src/pages/leave/index.tsx
import { useState } from 'react'
import { MOCK_LEAVE_BALANCES, MOCK_LEAVE_REQUESTS } from '../../lib/mock'
import type { LeaveStatus } from '../../types'

const STATUS_MAP: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'รอพิจารณา', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED:  { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  REJECTED:  { label: 'ไม่อนุมัติ', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  CANCELLED: { label: 'ยกเลิกแล้ว', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

const LEAVE_TYPES = [
  { code: 'SICK',     label: 'ลาป่วย',    color: '#3b82f6' },
  { code: 'PERSONAL', label: 'ลากิจ',     color: '#8b5cf6' },
  { code: 'VACATION', label: 'ลาพักร้อน', color: '#f59e0b' },
]

// ── Weekly Off constants ──────────────────────────────────────────────────────
const DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส']
const DAYS_FULL  = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']

// Colleague counts per day (0=Sun…6=Sat) — would come from API in real app
const COLLEAGUE_COUNTS: Record<WeekKey, number[]> = {
  this: [0, 2, 1, 3, 1, 1, 0],
  next: [0, 1, 2, 1, 0, 1, 0],
}

const WEEK_RANGE_LABEL: Record<WeekKey, string> = {
  this: 'จ. 25 พ.ค. – อา. 31 พ.ค. 2569',
  next: 'จ. 1 มิ.ย. – อา. 7 มิ.ย. 2569',
}

const WEEKLY_STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา',  color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  REJECTED: { label: 'ไม่อนุมัติ',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
}

type WeekKey = 'this' | 'next'
type WeeklyBookingRec = { dayOfWeek: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null
type Tab = 'history' | 'request' | 'weekly'
type FormState = { leaveType: string; startDate: string; endDate: string; reason: string }
type SubmitState = 'idle' | 'loading' | 'done'

export default function LeavePage() {
  const [tab, setTab] = useState<Tab>('history')
  const [form, setForm] = useState<FormState>({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const requests = [...MOCK_LEAVE_REQUESTS].sort((a, b) => b.created_at.localeCompare(a.created_at))

  // Weekly off state
  const [weeklyWeek, setWeeklyWeek] = useState<WeekKey>('this')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [weeklySubmit, setWeeklySubmit] = useState<SubmitState>('idle')
  const [myBookings, setMyBookings] = useState<Record<WeekKey, WeeklyBookingRec>>({
    this: { dayOfWeek: 4, status: 'APPROVED' }, // Thu approved (demo)
    next: null,
  })

  function handleSubmit() {
    if (!form.startDate || !form.endDate || !form.reason.trim()) return
    setSubmitState('loading')
    setTimeout(() => setSubmitState('done'), 1500)
  }

  function handleWeeklySubmit() {
    if (selectedDay === null) return
    setWeeklySubmit('loading')
    const day = selectedDay
    setTimeout(() => {
      setMyBookings(prev => ({ ...prev, [weeklyWeek]: { dayOfWeek: day, status: 'PENDING' as const } }))
      setSelectedDay(null)
      setWeeklySubmit('done')
    }, 1500)
  }

  const myBooking = myBookings[weeklyWeek]
  const colleagues = COLLEAGUE_COUNTS[weeklyWeek]
  const conflictCount = selectedDay !== null ? colleagues[selectedDay] : 0

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>วันลา</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>จัดการคำขอวันลาของคุณ</div>
      </div>

      {/* Balance Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, margin: '0 16px' }}>
        {MOCK_LEAVE_BALANCES.map((b, i) => {
          const pct = Math.round((b.used_days / b.entitled_days) * 100)
          const remaining = b.entitled_days - b.used_days
          return (
            <div key={b.leave_type_code} className="glass-card animate-slide-up" style={{ padding: '14px 12px', animationDelay: `${i * 60}ms` }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.leave_type}
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.06)', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: b.color }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{remaining}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/{b.entitled_days} วัน</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, margin: '16px 16px 0', background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 4 }}>
        {(['history', 'request', 'weekly'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSubmitState('idle'); setWeeklySubmit('idle'); setSelectedDay(null) }}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', borderRadius: 10,
              fontWeight: 600, fontSize: '0.78rem',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? 'var(--accent-start)' : 'var(--text-secondary)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'history' ? '📋 ประวัติ' : t === 'request' ? '✏️ ขอลา' : '📅 จองหยุด'}
          </button>
        ))}
      </div>

      {/* ── History Tab ──────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ margin: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((req, i) => {
            const s = STATUS_MAP[req.status]
            const isSameDay = req.start_date === req.end_date
            return (
              <div key={req.id} className="glass-card animate-slide-up" style={{ padding: '14px 16px', animationDelay: `${i * 50}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: req.leave_type_color, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{req.leave_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {isSameDay ? formatThaiDate(req.start_date) : `${formatThaiDate(req.start_date)} – ${formatThaiDate(req.end_date)}`}
                        {' '}· {req.days_count} วัน
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {req.reason && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: 20, fontStyle: 'italic' }}>
                    "{req.reason}"
                  </div>
                )}
                {req.approved_by && (
                  <div style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: 20 }}>
                    โดย: {req.approved_by}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Request Tab ──────────────────────────────────────────────────────── */}
      {tab === 'request' && (
        <div style={{ margin: '14px 16px 0' }}>
          {submitState === 'done' ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
                รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง Line
              </div>
              <button
                onClick={() => { setSubmitState('idle'); setForm({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' }); setTab('history') }}
                style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}
              >
                ดูประวัติ
              </button>
            </div>
          ) : (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              {/* Leave Type */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>ประเภทการลา</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {LEAVE_TYPES.map(lt => {
                    const bal = MOCK_LEAVE_BALANCES.find(b => b.leave_type_code === lt.code)
                    const isSelected = form.leaveType === lt.code
                    return (
                      <button
                        key={lt.code}
                        onClick={() => setForm(f => ({ ...f, leaveType: lt.code }))}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: 12, border: `2px solid ${isSelected ? lt.color : 'transparent'}`,
                          cursor: 'pointer', background: isSelected ? `${lt.color}15` : 'rgba(0,0,0,0.04)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? lt.color : 'var(--text-secondary)' }}>{lt.label}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {bal ? `${bal.entitled_days - bal.used_days} วันเหลือ` : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'วันที่เริ่มลา', key: 'startDate' as const },
                  { label: 'วันที่สิ้นสุด', key: 'endDate' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                    <input
                      type="date"
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{
                        width: '100%', padding: '11px 12px', borderRadius: 12,
                        border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem',
                        background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>เหตุผล</div>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลในการลา..."
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem',
                    background: 'rgba(255,255,255,0.85)', outline: 'none',
                    boxSizing: 'border-box', resize: 'none', lineHeight: 1.55,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.startDate || !form.endDate || !form.reason.trim() || submitState === 'loading'}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  cursor: (form.startDate && form.endDate && form.reason.trim()) ? 'pointer' : 'not-allowed',
                  background: (form.startDate && form.endDate && form.reason.trim())
                    ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))'
                    : 'rgba(0,0,0,0.08)',
                  color: (form.startDate && form.endDate && form.reason.trim()) ? '#fff' : 'var(--text-muted)',
                  fontSize: '1rem', fontWeight: 700,
                  boxShadow: (form.startDate && form.endDate && form.reason.trim()) ? '0 4px 16px rgba(255,107,53,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {submitState === 'loading' ? 'กำลังส่ง...' : '📤 ส่งคำขอลา'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Off Tab ──────────────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <div style={{ margin: '14px 16px 0' }}>
          {/* Week selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 }}>
            {(['this', 'next'] as WeekKey[]).map(wk => (
              <button
                key={wk}
                onClick={() => { setWeeklyWeek(wk); setSelectedDay(null); setWeeklySubmit('idle') }}
                style={{
                  flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', borderRadius: 8,
                  fontWeight: 600, fontSize: '0.84rem',
                  background: weeklyWeek === wk ? '#fff' : 'transparent',
                  color: weeklyWeek === wk ? 'var(--accent-start)' : 'var(--text-secondary)',
                  boxShadow: weeklyWeek === wk ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {wk === 'this' ? 'สัปดาห์นี้' : 'สัปดาห์หน้า'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14, textAlign: 'center' }}>
            {WEEK_RANGE_LABEL[weeklyWeek]}
          </div>

          {/* Already booked */}
          {myBooking !== null ? (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>
                การจองวันหยุดของคุณ
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                }}>
                  🗓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    วัน{DAYS_FULL[myBooking.dayOfWeek]}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {WEEK_RANGE_LABEL[weeklyWeek]}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 600, borderRadius: 99, padding: '4px 12px',
                  color: WEEKLY_STATUS_CFG[myBooking.status].color,
                  background: WEEKLY_STATUS_CFG[myBooking.status].bg,
                }}>
                  {WEEKLY_STATUS_CFG[myBooking.status].label}
                </span>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: '0.78rem',
                background: myBooking.status === 'APPROVED' ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
                color: myBooking.status === 'APPROVED' ? '#16a34a' : '#d97706',
              }}>
                {myBooking.status === 'APPROVED'
                  ? '✅ วันหยุดของคุณได้รับการอนุมัติแล้ว'
                  : '⏳ รอผู้จัดการพิจารณา คุณจะได้รับแจ้งผลทาง Line'}
              </div>
            </div>

          ) : weeklySubmit === 'done' ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📅</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>จองวันหยุดแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
                รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง Line
              </div>
            </div>

          ) : (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                เลือกวันหยุดของคุณ
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  (1 วัน/สัปดาห์)
                </span>
              </div>

              {/* Day picker — Mon(1)…Sat(6) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {[1,2,3,4,5,6].map(dow => {
                  const cnt = colleagues[dow]
                  const isSelected = selectedDay === dow
                  const levelColor = cnt <= 1 ? '#16a34a' : cnt === 2 ? '#d97706' : '#dc2626'
                  const levelBg   = cnt <= 1 ? 'rgba(22,163,74,0.06)' : cnt === 2 ? 'rgba(217,119,6,0.06)' : 'rgba(220,38,38,0.06)'
                  return (
                    <button
                      key={dow}
                      onClick={() => setSelectedDay(dow === selectedDay ? null : dow)}
                      style={{
                        padding: '12px 8px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                        border: `2px solid ${isSelected ? 'var(--accent-start)' : 'rgba(0,0,0,0.07)'}`,
                        background: isSelected ? 'rgba(255,107,53,0.08)' : levelBg,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? 'var(--accent-start)' : 'var(--text-primary)', marginBottom: 4 }}>
                        {DAYS_SHORT[dow]}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: levelColor, fontWeight: 600 }}>
                        {cnt === 0 ? 'ว่าง' : `${cnt} คน`}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Conflict warnings */}
              {selectedDay !== null && conflictCount >= 3 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                  ⚠ วัน{DAYS_FULL[selectedDay]}มีเพื่อนร่วมงาน {conflictCount} คนหยุดแล้ว — ผู้จัดการอาจไม่อนุมัติ
                </div>
              )}
              {selectedDay !== null && conflictCount === 2 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(217,119,6,0.08)', fontSize: '0.78rem', color: '#d97706' }}>
                  ⚠ วัน{DAYS_FULL[selectedDay]}มีเพื่อนร่วมงาน {conflictCount} คนหยุดแล้ว
                </div>
              )}

              <button
                onClick={handleWeeklySubmit}
                disabled={selectedDay === null || weeklySubmit === 'loading'}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  cursor: selectedDay !== null ? 'pointer' : 'not-allowed',
                  background: selectedDay !== null
                    ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))'
                    : 'rgba(0,0,0,0.08)',
                  color: selectedDay !== null ? '#fff' : 'var(--text-muted)',
                  fontSize: '1rem', fontWeight: 700,
                  boxShadow: selectedDay !== null ? '0 4px 16px rgba(255,107,53,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {weeklySubmit === 'loading'
                  ? 'กำลังส่ง...'
                  : selectedDay !== null
                    ? `📅 จองวัน${DAYS_FULL[selectedDay]}`
                    : 'เลือกวันก่อน'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
