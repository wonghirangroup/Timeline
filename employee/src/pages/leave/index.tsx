// employee/src/pages/leave/index.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaveBalance { leave_type: string; total_days: number; used_days: number }
interface LeaveRequest {
  id: string; leave_type: string; start_date: string; end_date: string
  days: number; reason: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_at: string | null; reject_note: string | null
}
interface ColleagueOff {
  id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  employee: { id: string; first_name: string; last_name: string; nickname: string | null }
}
interface WeeklyOffRecord {
  id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  employee: { id: string; first_name: string; last_name: string; nickname: string | null }
}
interface PeriodStatus { is_open: boolean; deadline: string | null; note: string | null }

const pad = (n: number) => String(n).padStart(2, '0')

function resolveDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  if (d.getUTCDay() === dayOfWeek) return weekStart.slice(0, 10)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ',  color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
}
const LEAVE_TYPES = [
  { code: 'SICK',      label: 'ลาป่วย',    color: '#3B82F6' },
  { code: 'PERSONAL',  label: 'ลากิจ',     color: '#8B5CF6' },
  { code: 'VACATION',  label: 'ลาพักร้อน', color: '#F59E0B' },
  { code: 'MATERNITY', label: 'ลาคลอด',   color: '#EC4899' },
]
const MONTHS_TH   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const MONTHS_LONG = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_SHORT  = ['อา','จ','อ','พ','พฤ','ศ','ส']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  const d = new Date(s.slice(0, 10) + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}
function fmtDateShort(s: string) {
  const d = new Date(s.slice(0, 10) + 'T00:00:00')
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`
}
function countDays(start: string, end: string) {
  if (!start || !end) return 0
  const s = new Date(start), e = new Date(end)
  let n = 0; const c = new Date(s)
  while (c <= e) { if (c.getDay() !== 0 && c.getDay() !== 6) n++; c.setDate(c.getDate() + 1) }
  return n
}
function getMonthStr(d: Date) { return d.toISOString().slice(0, 7) }
function addMonths(ym: string, n: number) {
  const [yy, mm] = ym.split('-').map(Number)
  const d = new Date(yy, mm - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonthTH(ym: string) {
  const [yy, mm] = ym.split('-').map(Number)
  return `${MONTHS_LONG[mm - 1]} ${yy + 543}`
}
function getDaysInMonth(ym: string) { const [yy, mm] = ym.split('-').map(Number); return new Date(yy, mm, 0).getDate() }
function getFirstDow(ym: string)    { const [yy, mm] = ym.split('-').map(Number); return new Date(yy, mm - 1, 1).getDay() }
function weekRow(day: number, firstDow: number) { return Math.floor((day - 1 + firstDow) / 7) }
function toDateStr(ym: string, d: number) { return `${ym}-${String(d).padStart(2, '0')}` }

type Tab = 'calendar' | 'booking' | 'request'

const MOCK_PUB_HOLIDAYS = [
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา (ชดเชย)' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Calendar Tab
// ═══════════════════════════════════════════════════════════════════════════════
function PersonalCalendar({ requests, colleagues, onBooking, onRequest }: {
  requests: LeaveRequest[]; colleagues: ColleagueOff[]
  onBooking: () => void; onRequest: () => void
}) {
  const today     = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const [month,  setMonth]  = useState(thisMonth)
  const [selDay, setSelDay] = useState<string | null>(null)

  const totalDays  = getDaysInMonth(month)
  const firstDow   = getFirstDow(month)
  const totalCells = Math.ceil((totalDays + firstDow) / 7) * 7

  const getMyOff    = (_d: string) => null
  const getMyLeaves = (d: string) => requests.filter(r => r.start_date <= d && r.end_date >= d && r.status !== 'REJECTED')
  const getColls    = (d: string) => colleagues.filter(c => resolveDate(c.week_start, c.day_of_week) === d)
  const getHoliday  = (d: string) => MOCK_PUB_HOLIDAYS.find(h => h.date === d) ?? null

  const myOffThisMonth = 0

  const selMyOff  = selDay ? getMyOff(selDay)    : null
  const selLeaves = selDay ? getMyLeaves(selDay)  : []
  const selColls  = selDay ? getColls(selDay)     : []
  const selHol    = selDay ? getHoliday(selDay)   : null
  const selEmpty  = !selMyOff && !selLeaves.length && !selColls.length && !selHol

  return (
    <div>
      {/* ── Quick action buttons ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={onBooking} style={{
          padding: '14px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#FB923C,#EA580C)', color: '#fff',
          fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: '0 4px 12px rgba(249,115,22,0.35)',
        }}>
          <span style={{ fontSize: '1.4rem' }}>✋</span>
          <span>จองวันหยุด</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 400 }}>เดือนนี้ {myOffThisMonth}/5 วัน</span>
        </button>
        <button onClick={onRequest} style={{
          padding: '14px 10px', borderRadius: 16, border: '1.5px solid #e5e7eb', cursor: 'pointer',
          background: '#fff', color: '#374151',
          fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: '1.4rem' }}>📝</span>
          <span>ขอลา</span>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>ป่วย / กิจ / พักร้อน</span>
        </button>
      </div>

      {/* ── Calendar ─────────────────────────────────────────── */}
      <div style={{ background: '#FAFAFA', borderRadius: 20, padding: '16px 12px', marginBottom: 16 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => { setMonth(m => addMonths(m, -1)); setSelDay(null) }}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronLeft size={16} color="#374151" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1A2B3C' }}>{fmtMonthTH(month)}</div>
            {month === thisMonth && (
              <div style={{ fontSize: '0.68rem', color: '#EA580C', fontWeight: 600, marginTop: 1 }}>
                หยุดแล้ว {myOffThisMonth} วัน เดือนนี้
              </div>
            )}
          </div>
          <button onClick={() => { setMonth(m => addMonths(m, 1)); setSelDay(null) }}
            style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', display: 'flex', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 6 }}>
          {DAYS_SHORT.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, paddingBottom: 2,
              color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstDow + 1
            if (day < 1 || day > totalDays) return <div key={i} style={{ height: 72 }} />

            const dateStr   = toDateStr(month, day)
            const myOff     = getMyOff(dateStr)
            const myLeaves  = getMyLeaves(dateStr)
            const colls     = getColls(dateStr)
            const holiday   = getHoliday(dateStr)
            const isToday   = dateStr === today
            const isSel     = selDay === dateStr
            const isApprOff = false
            const isPendOff = false
            const firstLeave = myLeaves[0]
            const lCfg       = firstLeave ? LEAVE_TYPES.find(t => t.code === firstLeave.leave_type) : null
            const isPast     = dateStr < today

            // Cell background rules — easy to read at a glance
            let cellBg = '#fff'
            if (holiday)     cellBg = '#FFF1F2'
            if (isApprOff)   cellBg = '#FFF7ED'
            if (isPendOff)   cellBg = '#FFFBEB'

            return (
              <button key={i} onClick={() => setSelDay(p => p === dateStr ? null : dateStr)}
                style={{
                  height: 72, borderRadius: 12, border: isSel ? '2px solid #EA580C'
                    : isApprOff ? '1.5px solid #FED7AA'
                    : isPendOff ? '1.5px dashed #FCD34D'
                    : '1px solid transparent',
                  cursor: 'pointer', background: cellBg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingTop: 7, paddingBottom: 5, gap: 3,
                  opacity: isPast && !myOff && !myLeaves.length ? 0.45 : 1,
                  transition: 'all 0.12s', fontFamily: 'inherit',
                  boxShadow: isApprOff || isSel ? '0 2px 8px rgba(249,115,22,0.15)' : 'none',
                }}>

                {/* Date number */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', fontSize: '0.82rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isToday ? '#fff' : holiday ? '#dc2626' : isApprOff ? '#EA580C' : '#1A2B3C',
                  background: isToday ? 'linear-gradient(135deg,#FB923C,#EA580C)' : 'transparent',
                }}>{day}</div>

                {/* My day-off mark — big and clear */}
                {isApprOff && !firstLeave && (
                  <div style={{ fontSize: '0.7rem', color: '#EA580C', fontWeight: 800, lineHeight: 1 }}>หยุด</div>
                )}
                {isPendOff && !firstLeave && (
                  <div style={{ fontSize: '0.62rem', color: '#D97706', fontWeight: 700, lineHeight: 1 }}>รออนุมัติ</div>
                )}

                {/* Leave bar */}
                {firstLeave && lCfg && (
                  <div style={{ width: '75%', height: 5, borderRadius: 99, background: lCfg.color, opacity: firstLeave.status === 'PENDING' ? 0.55 : 1 }} />
                )}

                {/* Colleague dots */}
                {colls.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {colls.slice(0, 3).map((c, ci) => (
                      <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c.status === 'APPROVED' ? '#16a34a' : '#d97706' }} />
                    ))}
                    {colls.length > 3 && <span style={{ fontSize: '0.42rem', color: '#9ca3af' }}>+{colls.length - 3}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { bg: '#FFF7ED', border: '1.5px solid #FED7AA', label: 'วันหยุดของฉัน' },
            { bg: '#FFFBEB', border: '1.5px dashed #FCD34D', label: 'รออนุมัติ' },
            { bg: '#fff', border: '1.5px solid #e5e7eb', label: 'วันทำงาน', dot: '#3B82F6' },
            { bg: '#FFF1F2', border: '1px solid #fecdd3', label: 'วันหยุดราชการ' },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: it.bg, border: it.border, flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{it.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day detail card */}
      {selDay && (
        <div style={{ marginBottom: 20, background: '#fff', borderRadius: 18, padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A2B3C', marginBottom: 12 }}>
            {fmtDate(selDay)}
          </div>

          {selEmpty && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>😊</div>
              <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>ไม่มีกำหนดการในวันนี้</div>
              <button onClick={onBooking} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: '#FFF7ED', color: '#EA580C', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                จองวันหยุดวันนี้ →
              </button>
            </div>
          )}

          {selHol && (
            <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 12, background: '#FFF1F2', border: '1px solid #fecdd3', fontSize: '0.85rem', color: '#BE123C', fontWeight: 700 }}>
              🎌 {selHol.name}
            </div>
          )}

          {false && selMyOff && null}

          {selLeaves.map(lr => {
            const cfg = LEAVE_TYPES.find(t => t.code === lr.leave_type)
            const s   = STATUS_CFG[lr.status]
            if (!cfg) return null
            return (
              <div key={lr.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${cfg.color}10`, border: `1.5px solid ${cfg.color}30` }}>
                <span style={{ fontSize: '1.4rem' }}>🗓️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1A2B3C', fontSize: '0.88rem' }}>{cfg.label}</div>
                  {lr.reason && <div style={{ fontSize: '0.73rem', color: '#9CA3AF', marginTop: 1 }}>{lr.reason}</div>}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 99 }}>{s.label}</span>
              </div>
            )
          })}

          {selColls.length > 0 && (
            <div style={{ marginTop: selMyOff || selLeaves.length ? 10 : 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>👥 เพื่อนร่วมงานที่หยุดด้วย</div>
              {selColls.map(c => {
                const name = c.employee.nickname ?? c.employee.first_name
                const s    = STATUS_CFG[c.status]
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6C89F5,#5B6CF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {c.employee.first_name.charAt(0)}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1A2B3C' }}>{name}</div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: 99 }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Recent requests ──────────────────────────────────── */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ประวัติการขอลาล่าสุด
        </div>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.82rem' }}>
            ยังไม่มีประวัติการลา
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.slice(0, 5).map(r => {
              const s   = STATUS_CFG[r.status]
              const cfg = LEAVE_TYPES.find(t => t.code === r.leave_type)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg?.color ?? '#94A3B8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                    🗓️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C' }}>{cfg?.label ?? r.leave_type}</div>
                    <div style={{ fontSize: '0.73rem', color: '#9CA3AF', marginTop: 2 }}>
                      {r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`} · {r.days} วัน
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Monthly Off Booking Tab (real API)
// ═══════════════════════════════════════════════════════════════════════════════
function MonthlyBooking({ employeeId, branchId }: { employeeId: string; branchId: string }) {
  const today      = new Date().toISOString().slice(0, 10)
  const todayMonth = today.slice(0, 7)
  const qc         = useQueryClient()

  const [month,      setMonth]   = useState(todayMonth)
  const [selDate,    setSelDate] = useState('')
  const [errorMsg,   setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccess]  = useState(false)

  const isPastMonth = month < todayMonth

  function changeMonth(delta: number) {
    setMonth(m => addMonths(m, delta))
    setSelDate(''); setErrorMsg(null); setSuccess(false)
  }

  const periodQ = useQuery<PeriodStatus>({
    queryKey: ['employee', 'weekly-off-period', branchId, month],
    queryFn: () => api.get('/employee/weekly-off/period-status', { params: { branchId, month } }).then((r: any) => r.data.data),
    enabled: !!branchId,
  })
  const viewQ = useQuery<{ own: WeeklyOffRecord[]; colleagues: ColleagueOff[] }>({
    queryKey: ['employee', 'weekly-off-view', employeeId, month],
    queryFn: () => api.get('/employee/weekly-off/month-view', { params: { employeeId, month } }).then((r: any) => r.data.data),
    enabled: !!employeeId,
  })

  const isOpen    = periodQ.data?.is_open ?? false
  const ownOff    = viewQ.data?.own?.[0] ?? null
  const colleagues = viewQ.data?.colleagues ?? []
  const ownDate   = ownOff ? resolveDate(ownOff.week_start, ownOff.day_of_week) : null

  // Colleague map: date → ColleagueOff[]
  const colleagueMap = new Map<string, ColleagueOff[]>()
  colleagues.forEach(c => {
    const d = resolveDate(c.week_start, c.day_of_week)
    if (!colleagueMap.has(d)) colleagueMap.set(d, [])
    colleagueMap.get(d)!.push(c)
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post('/employee/weekly-off/monthly', { employee_id: employeeId, date: selDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view', employeeId, month] })
      setSelDate(''); setSuccess(true); setErrorMsg(null)
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      setErrorMsg(code === 'ALREADY_REQUESTED' ? 'คุณมีการจองวันหยุดเดือนนี้แล้ว' : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    },
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employee/weekly-off/${id}`, { params: { employeeId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view', employeeId, month] })
      setSuccess(false)
    },
    onError: () => setErrorMsg('ยกเลิกไม่สำเร็จ'),
  })

  const totalDays  = getDaysInMonth(month)
  const firstDow   = getFirstDow(month)
  const totalWeeks = Math.ceil((firstDow + totalDays) / 7)
  const navBtnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <div>
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button style={navBtnStyle} onClick={() => changeMonth(-1)}>
          <ChevronLeft size={18} color="#6B7D90" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1A2B3C' }}>{fmtMonthTH(month)}</div>
          <div style={{ fontSize: '0.68rem', color: isOpen ? '#16A34A' : '#DC2626', marginTop: 2, fontWeight: 600 }}>
            {isOpen ? '🟢 เปิดรับการจอง' : '🔴 ปิดการจองแล้ว'}
          </div>
        </div>
        <button style={navBtnStyle} onClick={() => changeMonth(1)}>
          <ChevronRight size={18} color="#6B7D90" />
        </button>
      </div>

      {/* Period note from admin */}
      {periodQ.data?.note && (
        <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, marginBottom: 12, fontSize: '0.8rem', color: '#EA580C', fontWeight: 600 }}>
          📋 {periodQ.data.note}
        </div>
      )}

      {/* Period closed banner */}
      {!isOpen && !periodQ.isLoading && (
        <div style={{ padding: '14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>🔒</div>
          <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>ยังไม่เปิดรับการจองเดือนนี้</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>รอประกาศจากผู้จัดการก่อนนะครับ</div>
        </div>
      )}

      {/* Own booking badge */}
      {ownOff && ownDate && (
        <div style={{ background: ownOff.status === 'APPROVED' ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${ownOff.status === 'APPROVED' ? 'rgba(22,163,74,0.25)' : '#FDE68A'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: ownOff.status === 'APPROVED' ? '#16A34A' : '#D97706' }}>
              {ownOff.status === 'APPROVED' ? '✅ อนุมัติแล้ว' : '⏳ รอพิจารณา'}
            </div>
            {ownOff.status === 'PENDING' && (
              <button onClick={() => cancelMutation.mutate(ownOff.id)} disabled={cancelMutation.isPending}
                style={{ padding: '4px 12px', borderRadius: 99, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {cancelMutation.isPending ? '...' : 'ยกเลิก'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.8rem' }}>🏖️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A2B3C' }}>วันหยุดเดือนนี้</div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 2 }}>{fmtDate(ownDate)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success flash */}
      {successMsg && !ownOff && (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, marginBottom: 14, textAlign: 'center', fontWeight: 700, color: '#16A34A', fontSize: '0.88rem' }}>
          📨 ส่งคำขอแล้ว รอผู้จัดการพิจารณา
        </div>
      )}

      {/* Calendar (visible only when period open and no existing booking) */}
      {isOpen && !ownOff && (
      <div style={{ background: '#F9FAFB', borderRadius: 18, padding: '14px 10px', marginBottom: 16, border: '1px solid rgba(0,0,0,0.05)' }}>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', marginBottom: 6 }}>
          <div />
          {DAYS_SHORT.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, padding: '3px 0',
              color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {Array.from({ length: totalWeeks }).map((_, wIdx) => {
          const _unused = wIdx

          return (
            <div key={wIdx} style={{ marginBottom: 4 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: 2, alignItems: 'center', borderRadius: 10, padding: '2px 0' }}>
                <div style={{ fontSize: '8px', fontWeight: 800, textAlign: 'center', lineHeight: 1.2, color: '#D1D5DB' }}>ส{wIdx + 1}</div>
                {Array.from({ length: 7 }).map((_, dow) => {
                  const day = wIdx * 7 + dow - firstDow + 1
                  if (day < 1 || day > totalDays) return <div key={dow} />
                  const dateStr    = `${month}-${pad(day)}`
                  const isPast     = dateStr < today || isPastMonth
                  const isToday    = dateStr === today
                  const isSelected = selDate === dateStr
                  const collegues  = colleagueMap.get(dateStr) ?? []
                  const dayColor   = dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#1A2B3C'

                  let cellBg = isPast ? 'transparent' : 'rgba(255,107,53,0.04)'
                  let cellBorder = isPast ? '1.5px solid transparent' : `1.5px solid ${COLOR.primary}22`
                  let numColor = isPast ? '#D1D5DB' : dayColor

                  if (isSelected) { cellBg = COLOR.primary; cellBorder = `1.5px solid ${COLOR.primary}`; numColor = '#fff' }
                  else if (isToday) { cellBorder = `1.5px solid ${COLOR.primary}66` }

                  return (
                    <button key={dow}
                      onClick={() => { if (!isPast) setSelDate(p => p === dateStr ? '' : dateStr) }}
                      style={{ position: 'relative', border: cellBorder, borderRadius: 8, background: cellBg, padding: '5px 1px 4px', cursor: isPast ? 'default' : 'pointer', textAlign: 'center', transition: 'all 0.12s', opacity: isPast ? 0.25 : 1, minHeight: 42 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 400, color: numColor, lineHeight: 1 }}>{day}</div>
                      {collegues.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3, flexWrap: 'wrap' }}>
                          {collegues.slice(0, 3).map((c, ci) => (
                            <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : c.status === 'APPROVED' ? '#16A34A' : '#D97706' }} />
                          ))}
                          {collegues.length > 3 && <span style={{ fontSize: '7px', color: '#9CA3AF' }}>+{collegues.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          {[
            { el: <div style={{ width: 12, height: 12, borderRadius: 4, background: COLOR.primary }} />, label: 'เลือกแล้ว' },
            { el: <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />, label: 'เพื่อน(ok)' },
            { el: <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />, label: 'เพื่อน(รอ)' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {l.el}
              <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Selected date confirm box */}
      {isOpen && !ownOff && selDate && (
        <div style={{ background: `${COLOR.primary}08`, border: `1px solid ${COLOR.primary}22`, borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: COLOR.primary }}>📅 เลือกวันที่ {fmtDate(selDate)}</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>กดยืนยันเพื่อส่งคำขอหยุด 1 วัน</div>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Submit button */}
      {isOpen && !ownOff && (
        <button
          onClick={() => submitMutation.mutate()}
          disabled={!selDate || submitMutation.isPending || isPastMonth}
          style={{
            width: '100%', padding: '15px', borderRadius: 16, border: 'none', fontFamily: 'inherit',
            cursor: selDate && !isPastMonth ? 'pointer' : 'not-allowed',
            background: selDate && !isPastMonth
              ? `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`
              : 'rgba(0,0,0,0.08)',
            color: selDate && !isPastMonth ? '#fff' : '#9CA3AF',
            fontSize: '1rem', fontWeight: 700,
            boxShadow: selDate && !isPastMonth ? `0 4px 16px ${COLOR.primary}44` : 'none',
            transition: 'all 0.2s',
          }}
        >
          {submitMutation.isPending ? '⏳ กำลังส่ง...'
            : isPastMonth ? 'เดือนที่ผ่านมาแล้ว'
            : selDate ? `📅 ขอหยุด ${fmtDate(selDate)}`
            : 'กดเลือกวันจากปฏิทิน'}
        </button>
      )}

      {/* Colleague list */}
      {colleagues.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 10 }}>เพื่อนร่วมสาขาเดือนนี้</div>
          {colleagues.map((c, i) => {
            const cfg  = STATUS_CFG[c.status]
            const name = c.employee.nickname ?? `${c.employee.first_name} ${c.employee.last_name}`
            const date = resolveDate(c.week_start, c.day_of_week)
            return (
              <div key={c.id} className="fw-row" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="icon-bubble icon-bubble-blue" style={{ borderRadius: 14, width: 40, height: 40 }}>
                  <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>{name.charAt(0)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1A2B3C' }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>{fmtDate(date)}</div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main LeavePage
// ═══════════════════════════════════════════════════════════════════════════════
export default function LeavePage() {
  const employee = useAuthStore(s => s.employee)
  const qc       = useQueryClient()

  const [tab,        setTab]       = useState<Tab>('calendar')
  const [form,       setForm]      = useState({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
  const [submitDone, setSubmitDone] = useState(false)
  const [errorMsg,   setErrorMsg]  = useState<string | null>(null)

  const { data: balances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['employee', 'leave-balances', employee?.id],
    queryFn: () =>
      api.get('/employee/leave-balances', { params: { employeeId: employee?.id } })
         .then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const { data: requests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['employee', 'leave-requests', employee?.id],
    queryFn: () =>
      api.get('/employee/leave-requests', { params: { employeeId: employee?.id } })
         .then(r => (r.data.data as any[]).map((x: any) => ({
           ...x,
           start_date: x.start_date?.slice(0, 10) ?? x.start_date,
           end_date:   x.end_date?.slice(0, 10)   ?? x.end_date,
         }))),
    enabled: !!employee?.id,
  })

  const submitMutation = useMutation({
    mutationFn: (payload: object) =>
      api.post('/employee/leave-requests', payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'leave-requests'] })
      qc.invalidateQueries({ queryKey: ['employee', 'leave-balances'] })
      setSubmitDone(true)
      setForm({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      if (code === 'LEAVE_OVERLAP')        setErrorMsg('มีวันลาที่ทับซ้อนกันอยู่แล้ว')
      else if (code === 'INSUFFICIENT_BALANCE') setErrorMsg('วันลาคงเหลือไม่เพียงพอ')
      else setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่')
    },
  })

  const handleSubmitLeave = useCallback(() => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) return
    const days = countDays(form.startDate, form.endDate)
    if (days === 0) { setErrorMsg('วันที่เลือกไม่มีวันทำงาน'); return }
    setErrorMsg(null)
    submitMutation.mutate({
      employee_id: employee?.id,
      leave_type:  form.leaveType,
      start_date:  form.startDate,
      end_date:    form.endDate,
      days,
      reason: form.reason,
    })
  }, [form, employee, submitMutation])

  const days      = countDays(form.startDate, form.endDate)
  const submitting = submitMutation.isPending
  const canSubmit  = !!form.startDate && !!form.endDate && !!form.reason.trim() && days > 0

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>วันลา</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {employee?.first_name} {employee?.last_name} · จัดการวันลา
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        {/* Leave balance stat row */}
        <div className="header-stat-row">
          {balances.slice(0, 3).map((b, i) => {
            const cfg = LEAVE_TYPES.find(t => t.code === b.leave_type)
            return (
              <div key={b.leave_type} className="header-stat-col">
                <div className="header-stat-label">{cfg?.label ?? b.leave_type}</div>
                <div className="header-stat-value">{b.total_days - b.used_days} <span style={{ fontSize: '11px', fontWeight: 500, opacity: 0.7 }}>วัน</span></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ padding: '20px 16px 100px' }}>

        {/* Tabs */}
        <div className="fw-tabs">
          {([
            { id: 'calendar', label: '📅 ปฏิทิน' },
            { id: 'booking',  label: '✋ จองหยุด' },
            { id: 'request',  label: '📝 ขอลา'   },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} className={`fw-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setSubmitDone(false); setErrorMsg(null) }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ปฏิทิน ─────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <PersonalCalendar requests={requests} colleagues={[]} onBooking={() => setTab('booking')} onRequest={() => setTab('request')} />
        )}

        {/* ── Request ─────────────────────────────────────────── */}
        {tab === 'request' && (
          submitDone ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F9FAFB', borderRadius: 18 }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1A2B3C' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 6, lineHeight: 1.6 }}>รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง LINE</div>
              <button onClick={() => { setSubmitDone(false); setTab('calendar') }}
                style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryMid})`, color: '#fff', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit' }}>
                ดูประวัติ
              </button>
            </div>
          ) : (
            <div style={{ background: '#F9FAFB', borderRadius: 18, padding: '20px 16px' }}>
              {/* Leave type */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 8 }}>ประเภทการลา</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {LEAVE_TYPES.map(lt => {
                    const bal = balances.find(b => b.leave_type === lt.code)
                    const remaining = bal ? bal.total_days - bal.used_days : null
                    const active = form.leaveType === lt.code
                    return (
                      <button key={lt.code} onClick={() => setForm(f => ({ ...f, leaveType: lt.code }))}
                        style={{ flex: '1 0 40%', padding: '10px 6px', borderRadius: 12, border: `2px solid ${active ? lt.color : 'transparent'}`, cursor: 'pointer', background: active ? `${lt.color}15` : 'rgba(0,0,0,0.04)', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? lt.color : '#9CA3AF' }}>{lt.label}</div>
                        {remaining !== null && <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{remaining} วันเหลือ</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[{ label: 'วันที่เริ่มลา', key: 'startDate' as const }, { label: 'วันที่สิ้นสุด', key: 'endDate' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>{label}</div>
                    <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{ width: '100%', padding: '11px 12px', borderRadius: 12, border: `1.5px solid rgba(255,107,53,0.2)`, fontSize: '0.88rem', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                ))}
              </div>
              {days > 0 && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: `${COLOR.primary}08`, fontSize: '0.82rem', color: COLOR.primary, fontWeight: 600 }}>
                  📅 รวม {days} วันทำงาน
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>เหตุผล *</div>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลในการลา..." rows={3}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid rgba(255,107,53,0.2)`, fontSize: '0.88rem', background: '#fff', outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.55, fontFamily: 'inherit' }} />
              </div>
              {errorMsg && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>}
              <button onClick={handleSubmitLeave} disabled={!canSubmit || submitting}
                style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryMid})` : 'rgba(0,0,0,0.08)', color: canSubmit ? '#fff' : '#9CA3AF', fontSize: '1rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {submitting ? '⏳ กำลังส่ง...' : '📤 ส่งคำขอลา'}
              </button>
            </div>
          )
        )}

        {/* ── จองหยุด ─────────────────────────────────────────── */}
        {tab === 'booking' && (
          <MonthlyBooking employeeId={employee?.id ?? ''} branchId={employee?.branch?.id ?? ''} />
        )}
      </div>
    </div>
  )
}
