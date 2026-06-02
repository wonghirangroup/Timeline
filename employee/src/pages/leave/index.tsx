// employee/src/pages/leave/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, liffLogin } from '../../lib/axios'
import { initLiff } from '../../lib/liff'

interface EmployeeInfo { id: string; first_name: string; last_name: string }
interface LeaveBalance { leave_type: string; total_days: number; used_days: number }
interface LeaveRequest {
  id: string; leave_type: string; start_date: string; end_date: string
  days: number; reason: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_at: string | null; reject_note: string | null
}
interface WeeklyOffRequest {
  id: string; week_start: string; day_of_week: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; reject_note: string | null
}

const STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}
const LEAVE_TYPES = [
  { code: 'SICK',      label: 'ลาป่วย',    color: '#3b82f6' },
  { code: 'PERSONAL',  label: 'ลากิจ',     color: '#8b5cf6' },
  { code: 'VACATION',  label: 'ลาพักร้อน', color: '#f59e0b' },
  { code: 'MATERNITY', label: 'ลาคลอด',   color: '#ec4899' },
]
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

function countDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end)
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
const WO_STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}

function getMondayStr(date: Date): string {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}
function addWeeks(baseMonday: string, n: number): string {
  const d = new Date(baseMonday + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().slice(0, 10)
}
function fmtWeekRange(monday: string): string {
  const start = new Date(monday.slice(0, 10) + 'T00:00:00')
  const end   = new Date(monday.slice(0, 10) + 'T00:00:00')
  end.setDate(end.getDate() + 6)
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${start.getDate()} ${m[start.getMonth()]} – ${end.getDate()} ${m[end.getMonth()]} ${end.getFullYear()+543}`
}

type Tab = 'history' | 'request' | 'weekly'

export default function LeavePage() {
  const navigate    = useNavigate()
  const [employee,  setEmployee]  = useState<EmployeeInfo | null>(null)
  const [balances,  setBalances]  = useState<LeaveBalance[]>([])
  const [requests,  setRequests]  = useState<LeaveRequest[]>([])
  const [booting,   setBooting]   = useState(true)
  const [tab,        setTab]        = useState<Tab>('history')
  const [form,       setForm]       = useState({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  // weekly off
  const [woRequests,   setWoRequests]   = useState<WeeklyOffRequest[]>([])
  const [woWeek,       setWoWeek]       = useState(() => getMondayStr(new Date()))
  const [woSelectedDay, setWoDay]       = useState<number | null>(null)
  const [woSubmitting, setWoSubmitting] = useState(false)
  const [woDone,       setWoDone]       = useState(false)

  const load = useCallback(async (empId: string) => {
    const [reqRes, balRes, woRes] = await Promise.all([
      api.get('/employee/leave-requests', { params: { employeeId: empId } }),
      api.get('/employee/leave-balances',  { params: { employeeId: empId, year: new Date().getFullYear() } }),
      api.get('/employee/weekly-off',      { params: { employeeId: empId } }),
    ])
    setRequests((reqRes.data.data ?? []).sort((a: LeaveRequest, b: LeaveRequest) => b.start_date.localeCompare(a.start_date)))
    setBalances(balRes.data.data ?? [])
    setWoRequests(woRes.data.data ?? [])
  }, [])

  useEffect(() => {
    ;(async () => {
      try { await initLiff() } catch (e: any) { setBooting(false); return }
      try { await liffLogin() } catch (e: any) {
        if (e?.response?.data?.error?.code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setBooting(false); return
      }
      try {
        const res = await api.get('/employee/me')
        const emp = res.data.data.employee
        setEmployee(emp)
        await load(emp.id)
      } catch { /* ignore */ }
      finally { setBooting(false) }
    })()
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!employee || !form.startDate || !form.endDate || !form.reason.trim()) return
    const days = countDays(form.startDate, form.endDate)
    if (days === 0) { setErrorMsg('วันที่เลือกไม่มีวันทำงาน'); return }
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await api.post('/employee/leave-requests', {
        employee_id: employee.id,
        leave_type:  form.leaveType,
        start_date:  form.startDate,
        end_date:    form.endDate,
        days,
        reason:      form.reason,
      })
      await load(employee.id)
      setSubmitDone(true)
      setForm({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'LEAVE_OVERLAP')        setErrorMsg('มีวันลาที่ทับซ้อนกันอยู่แล้ว')
      else if (code === 'INSUFFICIENT_BALANCE') setErrorMsg('วันลาคงเหลือไม่เพียงพอ')
      else setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
    } finally { setSubmitting(false) }
  }, [employee, form, load])

  const handleWeeklyOff = useCallback(async () => {
    if (!employee || woSelectedDay === null) return
    setWoSubmitting(true)
    setErrorMsg(null)
    try {
      await api.post('/employee/weekly-off', {
        employee_id: employee.id,
        week_start:  woWeek,
        day_of_week: woSelectedDay,
      })
      await load(employee.id)
      setWoDone(true)
      setWoDay(null)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'ALREADY_REQUESTED') setErrorMsg('มีการขอวันหยุดสัปดาห์นี้แล้ว')
      else setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
    } finally { setWoSubmitting(false) }
  }, [employee, woSelectedDay, woWeek, load])

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  const days = countDays(form.startDate, form.endDate)
  const canSubmit = !!form.startDate && !!form.endDate && !!form.reason.trim() && days > 0

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>วันลา</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>จัดการคำขอวันลา</div>
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(balances.length, 4)}, 1fr)`, gap: 8, margin: '0 16px' }}>
          {balances.map((b, i) => {
            const cfg = LEAVE_TYPES.find(t => t.code === b.leave_type)
            const remaining = b.total_days - b.used_days
            const pct = b.total_days > 0 ? Math.round((b.used_days / b.total_days) * 100) : 0
            return (
              <div key={b.leave_type} className="glass-card animate-slide-up" style={{ padding: '14px 12px', animationDelay: `${i * 60}ms` }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cfg?.label ?? b.leave_type}
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.06)', marginBottom: 8 }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: cfg?.color ?? '#94a3b8' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{remaining}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/{b.total_days} วัน</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, margin: '16px 16px 0', background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 4 }}>
        {(['history', 'request', 'weekly'] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setSubmitDone(false); setWoDone(false); setErrorMsg(null) }}
            style={{ flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 600, fontSize: '0.72rem', background: tab === t ? '#fff' : 'transparent', color: tab === t ? 'var(--accent-start)' : 'var(--text-secondary)', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t === 'history' ? '📋 ประวัติ' : t === 'request' ? '✏️ ขอลา' : '📅 หยุดสัปดาห์'}
          </button>
        ))}
      </div>

      {/* History tab */}
      {tab === 'history' && (
        <div style={{ margin: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
              <div>ยังไม่มีคำขอวันลา</div>
            </div>
          )}
          {requests.map((r, i) => {
            const s = STATUS_CFG[r.status]
            const cfg = LEAVE_TYPES.find(t => t.code === r.leave_type)
            return (
              <div key={r.id} className="glass-card animate-slide-up" style={{ padding: '14px 16px', animationDelay: `${i * 50}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg?.color ?? '#94a3b8', flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cfg?.label ?? r.leave_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`}
                        {' '}· {r.days} วัน
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {r.reason && <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: 20, fontStyle: 'italic' }}>"{r.reason}"</div>}
                {r.reject_note && <div style={{ marginTop: 4, fontSize: '0.72rem', color: '#dc2626', paddingLeft: 20 }}>เหตุผล: {r.reject_note}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Request tab */}
      {tab === 'request' && (
        <div style={{ margin: '14px 16px 0' }}>
          {submitDone ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง LINE</div>
              <button onClick={() => { setSubmitDone(false); setTab('history') }}
                style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                ดูประวัติ
              </button>
            </div>
          ) : (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              {/* Leave type */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>ประเภทการลา</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {LEAVE_TYPES.map(lt => {
                    const bal = balances.find(b => b.leave_type === lt.code)
                    const remaining = bal ? bal.total_days - bal.used_days : null
                    return (
                      <button key={lt.code} onClick={() => setForm(f => ({ ...f, leaveType: lt.code }))}
                        style={{ flex: '1 0 40%', padding: '10px 6px', borderRadius: 12, border: `2px solid ${form.leaveType === lt.code ? lt.color : 'transparent'}`, cursor: 'pointer', background: form.leaveType === lt.code ? `${lt.color}15` : 'rgba(0,0,0,0.04)', transition: 'all 0.15s' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: form.leaveType === lt.code ? lt.color : 'var(--text-secondary)' }}>{lt.label}</div>
                        {remaining !== null && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{remaining} วันเหลือ</div>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[{ label: 'วันที่เริ่มลา', key: 'startDate' as const }, { label: 'วันที่สิ้นสุด', key: 'endDate' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                    <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{ width: '100%', padding: '11px 12px', borderRadius: 12, border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              {days > 0 && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,107,53,0.06)', fontSize: '0.82rem', color: 'var(--accent-start)', fontWeight: 600 }}>
                  📅 รวม {days} วันทำงาน
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>เหตุผล *</div>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลในการลา..." rows={3}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.55, fontFamily: 'inherit' }} />
              </div>

              {errorMsg && (
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', color: 'var(--error)', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>
              )}

              <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', background: canSubmit ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' : 'rgba(0,0,0,0.08)', color: canSubmit ? '#fff' : 'var(--text-muted)', fontSize: '1rem', fontWeight: 700, transition: 'all 0.2s' }}>
                {submitting ? 'กำลังส่ง...' : '📤 ส่งคำขอลา'}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Weekly Off tab */}
      {tab === 'weekly' && (
        <div style={{ margin: '14px 16px 0' }}>
          {woDone ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📅</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>รอผู้จัดการพิจารณา</div>
              <button onClick={() => setWoDone(false)} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>ขอสัปดาห์ถัดไป</button>
            </div>
          ) : (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              {/* Week selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={() => setWoWeek(addWeeks(woWeek, -1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}>‹</button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{fmtWeekRange(woWeek)}</div>
                </div>
                <button onClick={() => setWoWeek(addWeeks(woWeek, 1))} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', cursor: 'pointer', fontSize: '1rem' }}>›</button>
              </div>

              {/* สถานะสัปดาห์นี้ */}
              {(() => {
                const existing = woRequests.find(w => w.week_start.slice(0,10) === woWeek)
                if (existing) {
                  const cfg = WO_STATUS_CFG[existing.status]
                  return (
                    <div style={{ padding: '14px', borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.color}33`, marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, color: cfg.color, fontSize: '0.9rem' }}>{cfg.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        วัน{DAYS_FULL[existing.day_of_week]} — {fmtWeekRange(woWeek)}
                      </div>
                      {existing.reject_note && <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4 }}>เหตุผล: {existing.reject_note}</div>}
                    </div>
                  )
                }
                return null
              })()}

              {!woRequests.find(w => w.week_start.slice(0,10) === woWeek) && (
                <>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>เลือกวันหยุด (1 วัน)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 16 }}>
                    {DAYS_FULL.map((d, i) => (
                      <button key={i} onClick={() => setWoDay(woSelectedDay === i ? null : i)}
                        style={{ padding: '10px 4px', borderRadius: 10, border: `2px solid ${woSelectedDay === i ? 'var(--accent-start)' : 'rgba(0,0,0,0.08)'}`, background: woSelectedDay === i ? 'rgba(255,107,53,0.08)' : '#fff', color: woSelectedDay === i ? 'var(--accent-start)' : i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : 'var(--text-primary)', fontWeight: woSelectedDay === i ? 700 : 500, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {d.slice(0, 2)}
                      </button>
                    ))}
                  </div>

                  {errorMsg && (
                    <div style={{ marginBottom: 12, padding: '10px', borderRadius: 10, background: 'var(--error-bg)', color: 'var(--error)', fontSize: '0.82rem' }}>⚠️ {errorMsg}</div>
                  )}

                  <button onClick={handleWeeklyOff} disabled={woSelectedDay === null || woSubmitting}
                    style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', cursor: woSelectedDay !== null ? 'pointer' : 'not-allowed', background: woSelectedDay !== null ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' : 'rgba(0,0,0,0.08)', color: woSelectedDay !== null ? '#fff' : 'var(--text-muted)', fontSize: '1rem', fontWeight: 700, transition: 'all 0.2s' }}>
                    {woSubmitting ? 'กำลังส่ง...' : woSelectedDay !== null ? `📅 ขอหยุดวัน${DAYS_FULL[woSelectedDay]}` : 'เลือกวันก่อน'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ประวัติ Weekly Off */}
          {woRequests.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', paddingLeft: 4 }}>ประวัติ</div>
              {woRequests.slice().sort((a, b) => b.week_start.localeCompare(a.week_start)).slice(0, 8).map(w => {
                const cfg = WO_STATUS_CFG[w.status]
                return (
                  <div key={w.id} className="glass-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>วัน{DAYS_FULL[w.day_of_week]}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtWeekRange(w.week_start.slice(0,10))}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '3px 10px' }}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
