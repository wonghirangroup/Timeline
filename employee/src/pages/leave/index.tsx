// employee/src/pages/leave/index.tsx  [MOCK MODE — FinWise layout]
import { useState, useCallback } from 'react'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeaveBalance { leave_type: string; total_days: number; used_days: number }
interface LeaveRequest {
  id: string; leave_type: string; start_date: string; end_date: string
  days: number; reason: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_at: string | null; reject_note: string | null
}
interface ColleagueOff {
  id: string; date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  employee: { first_name: string; last_name: string; nickname: string | null }
}
interface SavedOff { dateStr: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }

// ─── Employee types & quota ───────────────────────────────────────────────────
type EmployeeType = 'FULL_TIME' | 'PART_TIME'

const DAY_OFF_QUOTA: Record<EmployeeType, number> = {
  FULL_TIME: 5,   // พนักงานประจำ
  PART_TIME: 4,   // รายวัน / part-time
}

const EMP_TYPE_LABEL: Record<EmployeeType, string> = {
  FULL_TIME: 'พนักงานประจำ',
  PART_TIME: 'รายวัน / Part-time',
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_EMPLOYEE = {
  id: 'emp-001', first_name: 'สมชาย', last_name: 'ใจดี',
  branch_id: 'br-01', employee_type: 'FULL_TIME' as EmployeeType,
}

// ─── Day-off slot config (Admin-configured per branch per month) ──────────────
// key = `${branchId}::${monthStr}` → sorted date strings that are bookable
const MOCK_ALLOWED_SLOTS: Record<string, string[]> = {
  'br-01::2026-06': ['2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23', '2026-06-30'],
  'br-01::2026-07': ['2026-07-07', '2026-07-14', '2026-07-21', '2026-07-28'],
}

function getAllowedDates(branchId: string, monthStr: string): string[] | null {
  const key = `${branchId}::${monthStr}`
  return MOCK_ALLOWED_SLOTS[key] ?? null
}

const MOCK_BALANCES: LeaveBalance[] = [
  { leave_type: 'SICK',     total_days: 30, used_days: 2 },
  { leave_type: 'PERSONAL', total_days: 3,  used_days: 1 },
  { leave_type: 'VACATION', total_days: 10, used_days: 3 },
]

const pad = (n: number) => String(n).padStart(2, '0')
const y     = new Date().getFullYear()
const prevM = new Date().getMonth() === 0 ? 12 : new Date().getMonth()
const prevY = new Date().getMonth() === 0 ? y - 1 : y
const curM  = pad(new Date().getMonth() + 1)

const MOCK_REQUESTS_INIT: LeaveRequest[] = [
  { id: 'lr-001', leave_type: 'SICK',     start_date: `${prevY}-${pad(prevM)}-10`, end_date: `${prevY}-${pad(prevM)}-10`, days: 1, reason: 'ป่วยเป็นไข้',  status: 'APPROVED', reviewed_at: null, reject_note: null },
  { id: 'lr-002', leave_type: 'PERSONAL', start_date: `${prevY}-${pad(prevM)}-20`, end_date: `${prevY}-${pad(prevM)}-21`, days: 2, reason: 'ธุระส่วนตัว',  status: 'APPROVED', reviewed_at: null, reject_note: null },
  { id: 'lr-003', leave_type: 'SICK',     start_date: `${y}-${curM}-05`,           end_date: `${y}-${curM}-05`,           days: 1, reason: 'ไม่สบาย',      status: 'PENDING',  reviewed_at: null, reject_note: null },
]

// Colleagues who have booked days off (date format: YYYY-MM-DD)
const MOCK_COLLEAGUES: ColleagueOff[] = [
  { id: 'mc-1', date: `${y}-${curM}-08`, status: 'APPROVED', employee: { first_name: 'มานี',    last_name: 'รักเรียน', nickname: 'มานี'  } },
  { id: 'mc-2', date: `${y}-${curM}-08`, status: 'PENDING',  employee: { first_name: 'วิชัย',  last_name: 'ดีงาม',   nickname: 'อ้น'   } },
  { id: 'mc-3', date: `${y}-${curM}-15`, status: 'APPROVED', employee: { first_name: 'สมหญิง', last_name: 'ใจงาม',   nickname: null    } },
  { id: 'mc-4', date: `${y}-${curM}-22`, status: 'PENDING',  employee: { first_name: 'ประภา',  last_name: 'ดีมาก',   nickname: 'ป้อม'  } },
  { id: 'mc-5', date: `${y}-${curM}-22`, status: 'APPROVED', employee: { first_name: 'ชัยณรงค์',last_name: 'ขยัน', nickname: 'เอก'   } },
]

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
  const d = new Date(s + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}
function fmtDateShort(s: string) {
  const d = new Date(s + 'T00:00:00')
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

// ─── Mock personal day-off bookings (for calendar view) ───────────────────────
const MOCK_MY_DAY_OFFS = [
  { date: `${y}-${curM}-02`, status: 'APPROVED' as const },
  { date: `${y}-${curM}-09`, status: 'APPROVED' as const },
  { date: `${y}-${curM}-16`, status: 'PENDING'  as const },
  { date: `${y}-${curM}-23`, status: 'APPROVED' as const },
]

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

  const getMyOff    = (d: string) => MOCK_MY_DAY_OFFS.find(x => x.date === d) ?? null
  const getMyLeaves = (d: string) => requests.filter(r => r.start_date <= d && r.end_date >= d && r.status !== 'REJECTED')
  const getColls    = (d: string) => colleagues.filter(c => c.date === d)
  const getHoliday  = (d: string) => MOCK_PUB_HOLIDAYS.find(h => h.date === d) ?? null

  // How many of my day-offs confirmed this month
  const myOffThisMonth = MOCK_MY_DAY_OFFS.filter(d => d.date.startsWith(month) && d.status === 'APPROVED').length

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
            const isApprOff = myOff?.status === 'APPROVED'
            const isPendOff = myOff?.status === 'PENDING'
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

          {selMyOff && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: '#FFF7ED', border: '1.5px solid #FED7AA' }}>
              <span style={{ fontSize: '1.6rem' }}>🏖️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#EA580C', fontSize: '0.9rem' }}>วันหยุดของฉัน</div>
                <div style={{ fontSize: '0.75rem', marginTop: 2, fontWeight: 600, color: selMyOff.status === 'APPROVED' ? '#16a34a' : '#D97706' }}>
                  {selMyOff.status === 'APPROVED' ? '✅ ผู้จัดการอนุมัติแล้ว' : '⏳ รอผู้จัดการอนุมัติ'}
                </div>
              </div>
            </div>
          )}

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
// Monthly Off Booking Tab
// ═══════════════════════════════════════════════════════════════════════════════
function MonthlyBooking({ colleagues, branchId, employeeType }: {
  colleagues: ColleagueOff[]; branchId: string; employeeType: EmployeeType
}) {
  const today      = new Date().toISOString().slice(0, 10)
  const todayMonth = today.slice(0, 7)

  const [month,      setMonth]      = useState(() => getMonthStr(new Date()))
  const [picks,      setPicks]      = useState<Record<number, string>>({})   // weekRow → dateStr
  const [saved,      setSaved]      = useState<SavedOff[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)

  const totalDays   = getDaysInMonth(month)
  const firstDow    = getFirstDow(month)
  const totalWeeks  = Math.ceil((firstDow + totalDays) / 7)
  const isPastMonth = month < todayMonth

  // Quota per employee type — 1 วัน/สัปดาห์ ไม่จำกัดวัน
  const quota        = totalWeeks   // เลือกได้สูงสุด 1 วันต่อสัปดาห์ (จำนวนสัปดาห์ในเดือน)
  const effectiveMax = totalWeeks

  // Colleague map: date → ColleagueOff[]
  const colleagueMap = new Map<string, ColleagueOff[]>()
  colleagues.filter(c => c.date.startsWith(month)).forEach(c => {
    if (!colleagueMap.has(c.date)) colleagueMap.set(c.date, [])
    colleagueMap.get(c.date)!.push(c)
  })

  // Saved dates for this month
  const savedThisMonth = saved.filter(s => s.dateStr.startsWith(month))

  function toggleDay(day: number) {
    const dateStr = `${month}-${pad(day)}`
    if (dateStr < today) return          // ไม่เลือกวันที่ผ่านมาแล้ว
    const wRow = weekRow(day, firstDow)
    setPicks(prev => {
      const next = { ...prev }
      if (next[wRow] === dateStr) {
        delete next[wRow]               // กดซ้ำ = ยกเลิก
      } else {
        next[wRow] = dateStr            // เปลี่ยนวันในสัปดาห์นั้น (1 วัน/สัปดาห์ auto-replace)
      }
      return next
    })
    setDone(false); setErrorMsg(null)
  }

  function changeMonth(delta: number) {
    setMonth(m => addMonths(m, delta))
    setPicks({}); setDone(false); setErrorMsg(null)
  }

  async function handleSubmit() {
    const dates = Object.values(picks).sort()
    if (dates.length === 0) { setErrorMsg('กรุณาเลือกอย่างน้อย 1 วัน'); return }
    setSubmitting(true); setErrorMsg(null)
    await new Promise(r => setTimeout(r, 900))
    setSaved(prev => [
      ...prev.filter(s => !s.dateStr.startsWith(month)),
      ...dates.map(d => ({ dateStr: d, status: 'PENDING' as const })),
    ])
    setPicks({}); setDone(true); setSubmitting(false)
  }

  const pickedDates  = Object.values(picks).sort()
  const pickedCount  = pickedDates.length
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
          <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>
            เลือกได้ 1 วัน/สัปดาห์ · {totalWeeks} สัปดาห์
          </div>
        </div>
        <button style={navBtnStyle} onClick={() => changeMonth(1)}>
          <ChevronRight size={18} color="#6B7D90" />
        </button>
      </div>

      {/* Employee type + quota strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: employeeType === 'FULL_TIME' ? '#3B82F6' : '#8B5CF6', borderRadius: 99, padding: '3px 10px' }}>
            {EMP_TYPE_LABEL[employeeType]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: quota }).map((_, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%',
              background: i < Object.keys(picks).length ? COLOR.primary : 'rgba(0,0,0,0.12)',
              transition: 'background 0.2s',
            }} />
          ))}
          <span style={{ fontSize: '0.7rem', color: '#6B7D90', marginLeft: 4, fontWeight: 600 }}>
            {Object.keys(picks).length}/{totalWeeks} สัปดาห์
          </span>
        </div>
      </div>

      {/* Saved bookings badge */}
      {savedThisMonth.length > 0 && (
        <div style={{ background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#16A34A', marginBottom: 8 }}>✅ จองแล้วเดือนนี้</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {savedThisMonth.map(s => (
              <span key={s.dateStr} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.1)', borderRadius: 99, padding: '4px 12px' }}>
                {fmtDateShort(s.dateStr)}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#9CA3AF' }}>รอผู้จัดการพิจารณา · แจ้งผลทาง LINE</div>
        </div>
      )}

      {/* Calendar */}
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
          const pickedForWeek = picks[wIdx]
          const savedForWeek  = savedThisMonth.find(s => weekRow(parseInt(s.dateStr.slice(8)), firstDow) === wIdx)

          return (
            <div key={wIdx} style={{ marginBottom: 4 }}>
              {/* Week label strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: '20px repeat(7, 1fr)', gap: 2, alignItems: 'center',
                background: pickedForWeek ? 'rgba(255,107,53,0.05)' : savedForWeek ? 'rgba(22,163,74,0.04)' : 'transparent',
                borderRadius: 10, padding: '2px 0',
              }}>
                {/* สป.N */}
                <div style={{ fontSize: '8px', fontWeight: 800, textAlign: 'center', lineHeight: 1.2,
                  color: pickedForWeek ? COLOR.primary : savedForWeek ? '#16A34A' : '#D1D5DB' }}>
                  ส{wIdx + 1}
                </div>

                {Array.from({ length: 7 }).map((_, dow) => {
                  const day = wIdx * 7 + dow - firstDow + 1
                  if (day < 1 || day > totalDays) return <div key={dow} />

                  const dateStr      = `${month}-${pad(day)}`
                  const isPast       = dateStr < today || isPastMonth
                  const isToday      = dateStr === today
                  const isPickedThis = picks[wIdx] === dateStr
                  const isSaved      = savedThisMonth.some(s => s.dateStr === dateStr)
                  const collegues    = colleagueMap.get(dateStr) ?? []
                  const dayColor     = dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#1A2B3C'

                  let cellBg     = !isPast && !isSaved ? 'rgba(255,107,53,0.04)' : 'transparent'
                  let cellBorder = !isPast && !isSaved ? `1.5px solid ${COLOR.primary}22` : '1.5px solid transparent'
                  let numColor   = isPast ? '#D1D5DB' : dayColor

                  if (isPickedThis) {
                    cellBg = COLOR.primary; cellBorder = `1.5px solid ${COLOR.primary}`; numColor = '#fff'
                  } else if (isSaved) {
                    cellBg = 'rgba(22,163,74,0.12)'; cellBorder = '1.5px solid rgba(22,163,74,0.3)'; numColor = '#16A34A'
                  } else if (isToday) {
                    cellBorder = `1.5px solid ${COLOR.primary}66`
                  }

                  return (
                    <button key={dow}
                      onClick={() => !isSaved && toggleDay(day)}
                      style={{
                        position: 'relative', border: cellBorder, borderRadius: 8,
                        background: cellBg, padding: '5px 1px 4px',
                        cursor: isPast || isSaved ? 'default' : 'pointer',
                        textAlign: 'center', transition: 'all 0.12s',
                        opacity: isPast && !isSaved ? 0.25 : 1,
                        minHeight: 42,
                      }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: isPickedThis || isSaved ? 700 : 400, color: numColor, lineHeight: 1 }}>
                        {day}
                      </div>
                      {/* Colleague dots */}
                      {collegues.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3, flexWrap: 'wrap' }}>
                          {collegues.slice(0, 3).map((c, ci) => (
                            <div key={ci} style={{ width: 4, height: 4, borderRadius: '50%',
                              background: isPickedThis ? 'rgba(255,255,255,0.8)'
                                : c.status === 'APPROVED' ? '#16A34A' : '#D97706' }} />
                          ))}
                          {collegues.length > 3 && (
                            <span style={{ fontSize: '7px', color: isPickedThis ? 'rgba(255,255,255,0.7)' : '#9CA3AF', lineHeight: '4px' }}>+{collegues.length - 3}</span>
                          )}
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
            { el: <div style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)' }} />, label: 'จองแล้ว' },
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

      {/* Selection summary */}
      {pickedCount > 0 && (
        <div style={{ background: 'rgba(255,107,53,0.06)', border: `1px solid ${COLOR.primary}22`, borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: COLOR.primary, marginBottom: 8 }}>
            เลือก {pickedCount} วัน จาก {totalWeeks} สัปดาห์
            {pickedCount >= totalWeeks && <span style={{ fontSize: '0.7rem', color: '#16A34A', marginLeft: 8 }}>✅ ครบทุกสัปดาห์</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pickedDates.map(d => (
              <span key={d} style={{ fontSize: '0.78rem', fontWeight: 700, color: COLOR.primary, background: `${COLOR.primary}15`, borderRadius: 99, padding: '4px 12px' }}>
                {fmtDateShort(d)} · {fmtDate(d).split(' ')[1]}
              </span>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: 12 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Submit button */}
      {savedThisMonth.length === 0 ? (
        <button
          onClick={handleSubmit}
          disabled={pickedCount === 0 || submitting || isPastMonth}
          style={{
            width: '100%', padding: '15px', borderRadius: 16, border: 'none', fontFamily: 'inherit',
            cursor: pickedCount > 0 && !isPastMonth ? 'pointer' : 'not-allowed',
            background: pickedCount > 0 && !isPastMonth
              ? `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`
              : 'rgba(0,0,0,0.08)',
            color: pickedCount > 0 && !isPastMonth ? '#fff' : '#9CA3AF',
            fontSize: '1rem', fontWeight: 700, fontFamily: 'inherit',
            boxShadow: pickedCount > 0 && !isPastMonth ? `0 4px 16px ${COLOR.primary}44` : 'none',
            transition: 'all 0.2s',
          }}
        >
          {submitting
            ? '⏳ กำลังส่ง...'
            : isPastMonth
            ? 'เดือนที่ผ่านมาแล้ว'
            : pickedCount > 0
            ? `📅 ขอหยุด ${pickedCount} วัน ใน${fmtMonthTH(month)}`
            : `กดเลือกวันหยุดจากปฏิทิน (1 วัน/สัปดาห์)`}
        </button>
      ) : (
        <button
          onClick={() => { setSaved(prev => prev.filter(s => !s.dateStr.startsWith(month))); setDone(false) }}
          style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid #DC2626', background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
        >
          ยกเลิกการจองเดือนนี้
        </button>
      )}

      {/* Colleague list */}
      {MOCK_COLLEAGUES.filter(c => c.date.startsWith(month)).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 10 }}>เพื่อนร่วมสาขาเดือนนี้</div>
          {MOCK_COLLEAGUES.filter(c => c.date.startsWith(month)).map((c, i) => {
            const cfg  = STATUS_CFG[c.status]
            const name = c.employee.nickname ?? `${c.employee.first_name} ${c.employee.last_name}`
            return (
              <div key={c.id} className="fw-row" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="icon-bubble icon-bubble-blue" style={{ borderRadius: 14, width: 40, height: 40 }}>
                  <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>{name.charAt(0)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1A2B3C' }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>{fmtDate(c.date)}</div>
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
  const [balances,   setBalances]  = useState<LeaveBalance[]>(MOCK_BALANCES)
  const [requests,   setRequests]  = useState<LeaveRequest[]>(MOCK_REQUESTS_INIT)
  const [tab,        setTab]       = useState<Tab>('calendar')
  const [form,       setForm]      = useState({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [errorMsg,   setErrorMsg]  = useState<string | null>(null)
  const employee = MOCK_EMPLOYEE

  const handleSubmitLeave = useCallback(async () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) return
    const days = countDays(form.startDate, form.endDate)
    if (days === 0) { setErrorMsg('วันที่เลือกไม่มีวันทำงาน'); return }
    setSubmitting(true); setErrorMsg(null)
    await new Promise(r => setTimeout(r, 900))
    const newReq: LeaveRequest = {
      id: `lr-${Date.now()}`, leave_type: form.leaveType,
      start_date: form.startDate, end_date: form.endDate, days,
      reason: form.reason, status: 'PENDING', reviewed_at: null, reject_note: null,
    }
    setRequests(prev => [newReq, ...prev])
    setBalances(prev => prev.map(b => b.leave_type === form.leaveType ? { ...b, used_days: b.used_days + days } : b))
    setSubmitDone(true)
    setForm({ leaveType: 'SICK', startDate: '', endDate: '', reason: '' })
    setSubmitting(false)
  }, [form])

  const days     = countDays(form.startDate, form.endDate)
  const canSubmit= !!form.startDate && !!form.endDate && !!form.reason.trim() && days > 0

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>วันลา</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {employee.first_name} {employee.last_name} · จัดการวันลา
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

        {/* Mock badge */}
        <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
          🧪 MOCK MODE — ข้อมูลจำลอง
        </div>

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
          <PersonalCalendar requests={requests} colleagues={MOCK_COLLEAGUES} onBooking={() => setTab('booking')} onRequest={() => setTab('request')} />
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
          <MonthlyBooking colleagues={MOCK_COLLEAGUES} branchId={employee.branch_id} employeeType={employee.employee_type} />
        )}
      </div>
    </div>
  )
}
