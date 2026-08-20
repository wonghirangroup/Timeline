// employee/src/pages/leave/index.tsx
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar, CalendarDays, Palmtree, FileText,
  Flag, Users, ClipboardList, Lock, Send, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'
import { ThaiDatePicker } from '../../components/ui'
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
// 4 ประเภทที่พนักงานขอผ่านฟอร์มนี้ได้จริง (ตรงกับ leave_type enum ที่
// POST /employee/leave-requests รับ)
const LEAVE_TYPES = [
  { code: 'SICK',      label: 'ลาป่วย',    color: '#3B82F6' },
  { code: 'PERSONAL',  label: 'ลากิจ',     color: '#8B5CF6' },
  { code: 'VACATION',  label: 'ลาพักร้อน', color: '#F59E0B' },
  { code: 'MATERNITY', label: 'ลาคลอด',   color: '#EC4899' },
]
// + COMPENSATE (วันหยุดชดเชย) — Admin เป็นคนกำหนดโควต้าให้เท่านั้น (เช่น
// ชดเชยวันที่มาทำงานในวันหยุดนักขัตฤกษ์) พนักงานขอผ่านฟอร์มนี้ไม่ได้ (backend
// ปฏิเสธ leave_type นี้ตอนสร้างคำขอ) — แยก list ไว้ต่างหาก ใช้แค่โชว์ label/
// สีตอนแสดงยอดคงเหลือ ไม่เอาไปรวมกับปุ่มเลือกประเภทตอนขอลา
const DISPLAY_LEAVE_TYPES = [
  ...LEAVE_TYPES,
  { code: 'COMPENSATE', label: 'วันหยุดชดเชย', color: '#10B981' },
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
function toDateStr(ym: string, d: number) { return `${ym}-${String(d).padStart(2, '0')}` }
// เหมือน toDateStr แต่รับ day ที่ overflow นอกเดือนได้ (0, -1, daysInMonth+1, ...)
// ให้ Date object ของ JS normalize เดือน/ปีให้เอง — ใช้เติมวันของเดือนก่อน/ถัดไปในช่อง
// ปฏิทินที่เกินขอบเดือน ให้ตารางเต็มทุกแถว 7 ช่อง (อา-ส) เสมอ
function cellDateStr(ym: string, day: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Tab = 'calendar' | 'booking' | 'request'

interface Holiday { date: string; name: string }

// ═══════════════════════════════════════════════════════════════════════════════
// Personal Calendar Tab
// ═══════════════════════════════════════════════════════════════════════════════
function PersonalCalendar({ requests, colleagues, holidays, onBooking }: {
  requests: LeaveRequest[]; colleagues: ColleagueOff[]; holidays: Holiday[]
  onBooking: () => void
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
  const getHoliday  = (d: string) => holidays.find(h => h.date === d) ?? null

  const myOffThisMonth = 0

  const selMyOff  = selDay ? getMyOff(selDay)    : null
  const selLeaves = selDay ? getMyLeaves(selDay)  : []
  const selColls  = selDay ? getColls(selDay)     : []
  const selHol    = selDay ? getHoliday(selDay)   : null
  const selEmpty  = !selMyOff && !selLeaves.length && !selColls.length && !selHol

  return (
    <div>
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
            const lCfg       = firstLeave ? DISPLAY_LEAVE_TYPES.find(t => t.code === firstLeave.leave_type) : null
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
              <Calendar size={32} color="#D1D5DB" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>ไม่มีกำหนดการในวันนี้</div>
              <button onClick={onBooking} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 20, border: 'none', background: '#FFF7ED', color: '#EA580C', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                จองวันหยุดวันนี้ →
              </button>
            </div>
          )}

          {selHol && (
            <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 12, background: '#FFF1F2', border: '1px solid #fecdd3', fontSize: '0.85rem', color: '#BE123C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flag size={15} /> {selHol.name}
            </div>
          )}

          {false && selMyOff && null}

          {selLeaves.map(lr => {
            const cfg = DISPLAY_LEAVE_TYPES.find(t => t.code === lr.leave_type)
            const s   = STATUS_CFG[lr.status]
            if (!cfg) return null
            return (
              <div key={lr.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${cfg.color}10`, border: `1.5px solid ${cfg.color}30` }}>
                <CalendarDays size={22} color={cfg.color} />
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
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Users size={13} /> เพื่อนร่วมงานที่หยุดด้วย</div>
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
              const cfg = DISPLAY_LEAVE_TYPES.find(t => t.code === r.leave_type)
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cfg?.color ?? '#94A3B8'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CalendarDays size={19} color={cfg?.color ?? '#94A3B8'} />
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
// Weekly Off Booking Tab
// ═══════════════════════════════════════════════════════════════════════════════

const DISPLAY_TO_DOW = [1, 2, 3, 4, 5, 6, 0]  // display col (Mon→Sun) → backend day_of_week
const DAYS_DISPLAY   = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function getThisWeekMonday(): string {
  const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  const dow  = bkk.getDay()
  bkk.setDate(bkk.getDate() + (dow === 0 ? -6 : 1 - dow))
  return `${bkk.getFullYear()}-${pad(bkk.getMonth() + 1)}-${pad(bkk.getDate())}`
}
function addWeeks(mondayStr: string, n: number): string {
  const d = new Date(mondayStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n * 7)
  return d.toISOString().slice(0, 10)
}
function getWeekDays(mondayStr: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}
function fmtWeekRange(mondayStr: string): string {
  const days = getWeekDays(mondayStr)
  const m0 = new Date(days[0] + 'T00:00:00Z')
  const m6 = new Date(days[6] + 'T00:00:00Z')
  if (m0.getUTCMonth() === m6.getUTCMonth()) {
    return `${m0.getUTCDate()}–${m6.getUTCDate()} ${MONTHS_TH[m0.getUTCMonth()]} ${m0.getUTCFullYear() + 543}`
  }
  return `${m0.getUTCDate()} ${MONTHS_TH[m0.getUTCMonth()]} – ${m6.getUTCDate()} ${MONTHS_TH[m6.getUTCMonth()]} ${m6.getUTCFullYear() + 543}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// Monthly Batch Booking Tab (weekly_off_mode = MONTHLY_BATCH)
// ต้องเลือกให้ครบทุกสัปดาห์ของเดือนก่อนถึงจะส่งคำขอได้ (all-or-nothing)
// ═══════════════════════════════════════════════════════════════════════════════

function getTodayStr(): string {
  const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${bkk.getFullYear()}-${pad(bkk.getMonth() + 1)}-${pad(bkk.getDate())}`
}
function getMondayOfDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}
function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
// ทุกสัปดาห์ (Monday) ของเดือนนี้ — ไม่กรองอะไร ใช้สำหรับ match ประวัติที่ส่งไปแล้ว
// (รวมสัปดาห์ที่ผ่านไปแล้ว เพื่อให้ยังเห็น record เก่าในเดือนนี้ครบ)
function getAllWeeksOfMonth(month: string): string[] {
  const days = getDaysInMonth(month)
  const mondays = new Set<string>()
  for (let day = 1; day <= days; day++) mondays.add(getMondayOfDate(toDateStr(month, day)))
  return [...mondays].sort()
}
// สัปดาห์ที่ "ต้องเลือกให้ครบ" ในตัวเลือกปฏิทิน — ไม่นับสัปดาห์ที่ผ่านไปแล้วทั้งสัปดาห์
// (ถ้านับ ผู้ใช้จะติด deadlock: สัปดาห์ที่ผ่านไปแล้วทุกวันถูก disable จาก isPast
// แต่ requiredWeeks ยังนับรวมอยู่ → ไม่มีทางเลือกให้ครบ (0/6) ได้เลยถ้าเปิดดูกลางเดือน)
// สัปดาห์ปัจจุบัน (ที่ยังไม่จบ) ยังนับรวมอยู่ — เลือกได้แค่วันที่เหลือของสัปดาห์นั้น
function getWeeksOfMonth(month: string, todayStr: string): string[] {
  return getAllWeeksOfMonth(month).filter(monday => addDaysStr(monday, 6) >= todayStr)
}

function MonthlyBatchBooking({ employeeId, branchId }: { employeeId: string; branchId: string }) {
  const qc = useQueryClient()
  const todayStr  = getTodayStr()
  const thisMonth = todayStr.slice(0, 7)
  const [month, setMonth] = useState(thisMonth)
  const [picks, setPicks] = useState<Record<string, string>>({})   // mondayISO → dateStr เลือกไว้
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const requiredWeeks = getWeeksOfMonth(month, todayStr)
  const daysInMonth   = getDaysInMonth(month)
  const firstDow      = getFirstDow(month)
  // ต้องใช้จำนวน "สัปดาห์ที่แตะเดือนนี้จริง" (ไม่ใช่แค่ปัดเศษจากจำนวนวัน) เป็นตัวกำหนด
  // ขนาดตาราง เพราะ 2 อย่างนี้ไม่เท่ากันเสมอไป — เคสท้ายเดือนที่วันสุดท้ายตรงกับวันจันทร์พอดี
  // (เช่น พ.ย. 2569 มี 30 วัน วันแรกเป็นอาทิตย์ → ปัดเศษได้พอดี 5 แถว แต่จริงๆ มี 6 สัปดาห์ที่
  // แตะเดือนนี้ เพราะสัปดาห์สุดท้ายเริ่มวันที่ 30 พ.ย. ยาวไปจนถึง 6 ธ.ค.) ถ้าใช้แค่ปัดเศษจะขาด
  // แถวสุดท้ายไป ทำให้เลือกวันของสัปดาห์ที่ 6 (ต้องเลือกให้ครบ) ไม่ได้เลย
  const totalCells    = getAllWeeksOfMonth(month).length * 7

  const periodQ = useQuery<PeriodStatus>({
    queryKey: ['employee', 'weekly-off-period', branchId, month],
    queryFn:  () => api.get('/employee/weekly-off/period-status', { params: { branchId, month } }).then((r: any) => r.data.data),
    enabled:  !!branchId,
  })
  const historyQ = useQuery<WeeklyOffRecord[]>({
    queryKey: ['employee', 'weekly-off-history', employeeId],
    queryFn:  () => api.get('/employee/weekly-off', { params: { employeeId } }).then((r: any) => r.data.data),
    enabled:  !!employeeId,
  })
  const colleagueQ = useQuery<{ own: WeeklyOffRecord[]; colleagues: ColleagueOff[] }>({
    queryKey: ['employee', 'weekly-off-view', employeeId, month],
    queryFn:  () => api.get('/employee/weekly-off/month-view', { params: { employeeId, month } }).then((r: any) => r.data.data),
    enabled:  !!employeeId,
  })

  const isOpen     = periodQ.data?.is_open ?? false
  const allOwn     = historyQ.data ?? []
  const ownThisMonth = allOwn.filter(r => getAllWeeksOfMonth(month).includes(r.week_start.slice(0, 10)))
  const colleagues = colleagueQ.data?.colleagues ?? []
  const pickedCount = Object.keys(picks).length
  const complete     = pickedCount === requiredWeeks.length

  const submitMutation = useMutation({
    mutationFn: () => api.post('/employee/weekly-off/monthly-batch', { employee_id: employeeId, month, dates: Object.values(picks) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-history'] })
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view'] })
      setPicks({}); setErrorMsg(null)
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      setErrorMsg(
        code === 'ALREADY_REQUESTED' ? 'มีการขอวันหยุดสัปดาห์ใดสัปดาห์หนึ่งในเดือนนี้ไปแล้ว' :
        code === 'INCOMPLETE_MONTH'  ? 'กรุณาเลือกวันหยุดให้ครบทุกสัปดาห์ก่อนส่ง' :
        'เกิดข้อผิดพลาด กรุณาลองใหม่'
      )
    },
  })
  const cancelAllMutation = useMutation({
    mutationFn: () => Promise.all(ownThisMonth.map(r => api.delete(`/employee/weekly-off/${r.id}`, { params: { employeeId } }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-history'] })
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view'] })
    },
  })

  function changeMonth(delta: number) {
    setMonth(m => {
      const [y, mo] = m.split('-').map(Number)
      const d = new Date(y, mo - 1 + delta, 1)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    })
    setPicks({}); setErrorMsg(null)
  }

  function toggleDay(dateStr: string) {
    const monday = getMondayOfDate(dateStr)
    setPicks(p => {
      if (p[monday] === dateStr) { const next = { ...p }; delete next[monday]; return next }
      return { ...p, [monday]: dateStr }
    })
  }

  const navBtnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const allSubmittedPending = ownThisMonth.length > 0 && ownThisMonth.every(r => r.status === 'PENDING')

  return (
    <div>
      {/* ── Month navigator ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => changeMonth(-1)} style={navBtnStyle}>
          <ChevronLeft size={18} color="#6B7D90" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A2B3C' }}>{fmtMonthTH(month)}</div>
          <div style={{ fontSize: '0.68rem', marginTop: 2, fontWeight: 600, color: isOpen ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpen ? '#16A34A' : '#DC2626', display: 'inline-block' }} />
            {isOpen ? 'เปิดรับการจอง' : 'ยังไม่เปิดรับการจอง'}
          </div>
        </div>
        <button onClick={() => changeMonth(1)} style={navBtnStyle}>
          <ChevronRight size={18} color="#6B7D90" />
        </button>
      </div>

      {periodQ.data?.note && (
        <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, marginBottom: 12, fontSize: '0.8rem', color: '#EA580C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> {periodQ.data.note}
        </div>
      )}

      {/* ── Period closed ───────────────────────────────────────── */}
      {!isOpen && ownThisMonth.length === 0 && !periodQ.isLoading && (
        <div style={{ padding: '14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, marginBottom: 14, textAlign: 'center' }}>
          <Lock size={26} color="#DC2626" style={{ marginBottom: 4 }} />
          <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>ยังไม่เปิดรับการจองเดือนนี้</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>รอประกาศจากผู้จัดการก่อนนะ</div>
        </div>
      )}

      {/* ── Already submitted this month — read-only summary ───── */}
      {ownThisMonth.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {[...ownThisMonth].sort((a, b) => a.week_start.localeCompare(b.week_start)).map(r => {
            const cfg = STATUS_CFG[r.status]
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 14, marginBottom: 8,
              }}>
                <Palmtree size={22} color={cfg.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1A2B3C', fontSize: '0.85rem' }}>
                    {fmtDate(resolveDate(r.week_start, r.day_of_week))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 700 }}>{cfg.label}</div>
                </div>
              </div>
            )
          })}
          {allSubmittedPending && (
            <button onClick={() => cancelAllMutation.mutate()} disabled={cancelAllMutation.isPending}
              style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              {cancelAllMutation.isPending ? '...' : 'ยกเลิกคำขอทั้งเดือน'}
            </button>
          )}
        </div>
      )}

      {/* ── เดือนที่ผ่านไปแล้วทั้งเดือน — ไม่มีสัปดาห์ให้จอง ───────── */}
      {isOpen && ownThisMonth.length === 0 && requiredWeeks.length === 0 && (
        <div style={{ padding: '14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, textAlign: 'center', color: '#6B7D90', fontSize: '0.82rem' }}>
          เดือนนี้ผ่านไปแล้ว ไม่สามารถจองย้อนหลังได้
        </div>
      )}

      {/* ── Month grid picker ───────────────────────────────────── */}
      {isOpen && ownThisMonth.length === 0 && requiredWeeks.length > 0 && (
        <>
          <div style={{ fontSize: '0.78rem', color: '#6B7D90', fontWeight: 600, marginBottom: 10 }}>
            เลือกวันหยุด 1 วัน/สัปดาห์ ให้ครบทุกสัปดาห์ ({pickedCount}/{requiredWeeks.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, padding: '2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 16 }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const day = i - firstDow + 1
              const inMonth = day >= 1 && day <= daysInMonth
              const dateStr = cellDateStr(month, day)
              const monday  = getMondayOfDate(dateStr)
              // ช่องนอกเดือน (เดือนก่อน/ถัดไป) เติมไว้ให้ตารางครบ 7 ช่องทุกแถว — เลือกได้
              // เฉพาะตอนที่สัปดาห์นั้นเป็นสัปดาห์ที่ "ต้องเลือกให้ครบ" ของเดือนนี้จริงๆ (สัปดาห์คาบ
              // เกี่ยวต้นเดือน/ท้ายเดือน) ไม่งั้นเป็นแค่ตัวเลขจางๆ ให้เห็นบริบทของสัปดาห์เฉยๆ
              const isRequiredWeek = requiredWeeks.includes(monday)
              const isPast     = dateStr < todayStr
              const isPickable = isRequiredWeek && !isPast
              const isSel      = picks[monday] === dateStr
              const hasColleague = colleagues.some(c => resolveDate(c.week_start, c.day_of_week) === dateStr)
              return (
                <button key={i} disabled={!isPickable} onClick={() => toggleDay(dateStr)} style={{
                  aspectRatio: '1', borderRadius: 10, border: isSel ? `2px solid ${COLOR.primary}` : '1px solid #E5E7EB',
                  background: isSel ? COLOR.primary : !isPickable ? '#F9FAFB' : '#fff',
                  color: isSel ? '#fff' : !inMonth ? '#E5E7EB' : !isPickable ? '#D1D5DB' : '#1A2B3C',
                  fontSize: '0.78rem', fontWeight: isSel ? 800 : 500, cursor: isPickable ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', position: 'relative', padding: 0,
                }}>
                  {day >= 1 && day <= daysInMonth ? day : Number(dateStr.slice(8))}
                  {hasColleague && (
                    <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.8)' : '#F59E0B' }} />
                  )}
                </button>
              )
            })}
          </div>

          <button onClick={() => submitMutation.mutate()} disabled={!complete || submitMutation.isPending}
            style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none', fontFamily: 'inherit',
              cursor: complete ? 'pointer' : 'not-allowed',
              background: complete ? `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})` : 'rgba(0,0,0,0.08)',
              color: complete ? '#fff' : '#9CA3AF', fontSize: '1rem', fontWeight: 700,
              boxShadow: complete ? `0 4px 16px ${COLOR.primary}44` : 'none', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {submitMutation.isPending
              ? <><Loader2 size={17} className="animate-spin" /> กำลังส่ง...</>
              : complete ? <><CheckCircle2 size={17} /> ส่งคำขอหยุด {requiredWeeks.length} วัน</> : `เลือกให้ครบทุกสัปดาห์ก่อน (${pickedCount}/${requiredWeeks.length})`}
          </button>
        </>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}
    </div>
  )
}

function WeeklyBooking({ employeeId, branchId }: { employeeId: string; branchId: string }) {
  const qc          = useQueryClient()
  const thisMonday  = getThisWeekMonday()
  const [weekStart, setWeekStart] = useState(thisMonday)
  const [selDow,    setSelDow]    = useState<number | null>(null)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isCurrentWeek = weekStart === thisMonday
  const isPastWeek    = weekStart < thisMonday
  const month         = weekStart.slice(0, 7)

  function changeWeek(delta: number) {
    setWeekStart(w => addWeeks(w, delta))
    setSelDow(null); setErrorMsg(null); setSubmitted(false)
  }

  const navBtnStyle: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  const periodQ = useQuery<PeriodStatus>({
    queryKey: ['employee', 'weekly-off-period', branchId, month],
    queryFn:  () => api.get('/employee/weekly-off/period-status', { params: { branchId, month } }).then((r: any) => r.data.data),
    enabled:  !!branchId,
  })
  const historyQ = useQuery<WeeklyOffRecord[]>({
    queryKey: ['employee', 'weekly-off-history', employeeId],
    queryFn:  () => api.get('/employee/weekly-off', { params: { employeeId } }).then((r: any) => r.data.data),
    enabled:  !!employeeId,
  })
  const colleagueQ = useQuery<{ own: WeeklyOffRecord[]; colleagues: ColleagueOff[] }>({
    queryKey: ['employee', 'weekly-off-view', employeeId, month],
    queryFn:  () => api.get('/employee/weekly-off/month-view', { params: { employeeId, month } }).then((r: any) => r.data.data),
    enabled:  !!employeeId,
  })

  const isOpen      = periodQ.data?.is_open ?? false
  const allOwn      = historyQ.data ?? []
  const weekDays    = getWeekDays(weekStart)
  const mondayMonth = new Date(weekStart + 'T00:00:00Z').getUTCMonth()
  const thisWeekOwn = allOwn.find(r => r.week_start.slice(0, 10) === weekStart)
  const colleagues  = (colleagueQ.data?.colleagues ?? []).filter(c => c.week_start.slice(0, 10) === weekStart)

  const submitMutation = useMutation({
    mutationFn: () => api.post('/employee/weekly-off', { employee_id: employeeId, week_start: weekStart, day_of_week: selDow }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-history'] })
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view'] })
      setSubmitted(true); setErrorMsg(null)
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.code === 'ALREADY_REQUESTED'
        ? 'คุณจองวันหยุดสัปดาห์นี้แล้ว' : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    },
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employee/weekly-off/${id}`, { params: { employeeId } }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-history'] })
      qc.invalidateQueries({ queryKey: ['employee', 'weekly-off-view'] })
      setSubmitted(false)
    },
  })

  const canBook = isCurrentWeek && isOpen && !thisWeekOwn && !submitted

  return (
    <div>
      {/* ── Week navigator ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => changeWeek(-1)} style={navBtnStyle}>
          <ChevronLeft size={18} color="#6B7D90" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A2B3C' }}>{fmtWeekRange(weekStart)}</div>
          <div style={{ fontSize: '0.68rem', marginTop: 2, fontWeight: 600,
            color: isCurrentWeek ? (isOpen ? '#16A34A' : '#DC2626') : '#9CA3AF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {isCurrentWeek
              ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: isOpen ? '#16A34A' : '#DC2626', display: 'inline-block' }} />{isOpen ? 'เปิดรับการจอง' : 'ยังไม่เปิดรับการจอง'}</>
              : isPastWeek ? 'สัปดาห์ที่ผ่านมา' : 'สัปดาห์หน้า'}
          </div>
        </div>
        <button onClick={() => changeWeek(1)} disabled={isCurrentWeek} style={{ ...navBtnStyle, opacity: isCurrentWeek ? 0.3 : 1 }}>
          <ChevronRight size={18} color="#6B7D90" />
        </button>
      </div>

      {/* ── Admin note ──────────────────────────────────────────── */}
      {periodQ.data?.note && isCurrentWeek && (
        <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, marginBottom: 12, fontSize: '0.8rem', color: '#EA580C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={14} /> {periodQ.data.note}
        </div>
      )}

      {/* ── Already booked this week ───────────────────────────── */}
      {thisWeekOwn && (
        <div style={{
          background: thisWeekOwn.status === 'APPROVED' ? '#F0FDF4' : '#FFFBEB',
          border: `1px solid ${thisWeekOwn.status === 'APPROVED' ? 'rgba(22,163,74,0.25)' : '#FDE68A'}`,
          borderRadius: 16, padding: '16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: thisWeekOwn.status === 'APPROVED' ? '#16A34A' : '#D97706', display: 'flex', alignItems: 'center', gap: 6 }}>
              {thisWeekOwn.status === 'APPROVED' ? <><CheckCircle2 size={15} /> อนุมัติแล้ว</> : <><Loader2 size={15} /> รอพิจารณา</>}
            </div>
            {thisWeekOwn.status === 'PENDING' && isCurrentWeek && (
              <button onClick={() => cancelMutation.mutate(thisWeekOwn.id)} disabled={cancelMutation.isPending}
                style={{ padding: '4px 12px', borderRadius: 99, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {cancelMutation.isPending ? '...' : 'ยกเลิก'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palmtree size={30} color={thisWeekOwn.status === 'APPROVED' ? '#16A34A' : '#D97706'} />
            <div>
              <div style={{ fontWeight: 700, color: '#1A2B3C' }}>
                หยุดวัน{DAYS_DISPLAY[DISPLAY_TO_DOW.indexOf(thisWeekOwn.day_of_week)]}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 2 }}>
                {fmtDate(resolveDate(thisWeekOwn.week_start, thisWeekOwn.day_of_week))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Period closed banner (current week, no booking) ────── */}
      {isCurrentWeek && !isOpen && !thisWeekOwn && !periodQ.isLoading && (
        <div style={{ padding: '14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, marginBottom: 14, textAlign: 'center' }}>
          <Lock size={26} color="#DC2626" style={{ marginBottom: 4 }} />
          <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>ยังไม่เปิดรับการจองสัปดาห์นี้</div>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>รอประกาศจากผู้จัดการก่อนนะ</div>
        </div>
      )}

      {/* ── Submitted flash ─────────────────────────────────────── */}
      {submitted && !thisWeekOwn && (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 14, marginBottom: 14, textAlign: 'center', fontWeight: 700, color: '#16A34A', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Send size={15} /> ส่งคำขอแล้ว รอผู้จัดการพิจารณา
        </div>
      )}

      {/* ── 7-day selector (current week, open, not yet booked) ── */}
      {canBook && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#6B7D90', fontWeight: 600, marginBottom: 10 }}>
            เลือกวันที่ต้องการหยุด — 1 วัน/สัปดาห์
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {weekDays.map((dateStr, displayIdx) => {
              const dow  = DISPLAY_TO_DOW[displayIdx]
              const d    = new Date(dateStr + 'T00:00:00Z')
              const day  = d.getUTCDate()
              const mon  = MONTHS_TH[d.getUTCMonth()]
              const spanMonth = d.getUTCMonth() !== mondayMonth
              const isSel = selDow === dow
              const isSat = displayIdx === 5
              const isSun = displayIdx === 6
              const hasColleague = colleagues.some(c => c.day_of_week === dow)

              return (
                <button key={displayIdx} onClick={() => setSelDow(p => p === dow ? null : dow)}
                  style={{
                    borderRadius: 14, border: isSel ? `2.5px solid ${COLOR.primary}` : '1.5px solid #E5E7EB',
                    background: isSel ? COLOR.primary : isSat || isSun ? '#F9FAFB' : '#fff',
                    padding: '10px 2px 8px', cursor: 'pointer', textAlign: 'center',
                    fontFamily: 'inherit', transition: 'all 0.12s', position: 'relative',
                    boxShadow: isSel ? `0 4px 12px ${COLOR.primary}44` : '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1,
                    color: isSel ? 'rgba(255,255,255,0.8)' : isSun ? '#EF4444' : isSat ? '#3B82F6' : '#9CA3AF' }}>
                    {DAYS_DISPLAY[displayIdx]}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: isSel ? '#fff' : isSat || isSun ? '#6B7280' : '#1A2B3C', marginTop: 4, lineHeight: 1 }}>
                    {day}
                  </div>
                  {spanMonth && (
                    <div style={{ fontSize: '0.52rem', color: isSel ? 'rgba(255,255,255,0.7)' : '#9CA3AF', marginTop: 3 }}>
                      {mon}
                    </div>
                  )}
                  {hasColleague && (
                    <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)',
                      width: 5, height: 5, borderRadius: '50%',
                      background: isSel ? 'rgba(255,255,255,0.7)' : '#F59E0B' }} />
                  )}
                </button>
              )
            })}
          </div>

          {selDow !== null && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: `${COLOR.primary}0C`, border: `1px solid ${COLOR.primary}22`, borderRadius: 12 }}>
              <span style={{ fontSize: '0.85rem', color: COLOR.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={15} /> เลือกหยุดวัน{DAYS_DISPLAY[DISPLAY_TO_DOW.indexOf(selDow)]} {fmtDate(weekDays[DISPLAY_TO_DOW.indexOf(selDow)])}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingLeft: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
              <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>เพื่อนจองแล้ว</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit button ───────────────────────────────────────── */}
      {canBook && (
        <button onClick={() => submitMutation.mutate()} disabled={selDow === null || submitMutation.isPending}
          style={{
            width: '100%', padding: '15px', borderRadius: 16, border: 'none', fontFamily: 'inherit',
            cursor: selDow !== null ? 'pointer' : 'not-allowed',
            background: selDow !== null ? `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})` : 'rgba(0,0,0,0.08)',
            color: selDow !== null ? '#fff' : '#9CA3AF',
            fontSize: '1rem', fontWeight: 700,
            boxShadow: selDow !== null ? `0 4px 16px ${COLOR.primary}44` : 'none',
            transition: 'all 0.2s', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {submitMutation.isPending
            ? <><Loader2 size={17} className="animate-spin" /> กำลังส่ง...</>
            : selDow !== null ? <><CheckCircle2 size={17} /> ยืนยันจองวัน{DAYS_DISPLAY[DISPLAY_TO_DOW.indexOf(selDow)]}</>
            : 'กดเลือกวันที่ต้องการหยุด'}
        </button>
      )}

      {errorMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {/* ── Colleagues this week ────────────────────────────────── */}
      {colleagues.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7D90', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={13} /> เพื่อนร่วมสาขาที่หยุดสัปดาห์นี้
          </div>
          {colleagues.map(c => {
            const cfg  = STATUS_CFG[c.status]
            const name = c.employee.nickname ?? c.employee.first_name
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F9FAFB', borderRadius: 10, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6C89F5,#5B6CF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.employee.first_name.charAt(0)}
                </div>
                <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#1A2B3C' }}>{name}</div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 99 }}>
                  วัน{DAYS_DISPLAY[DISPLAY_TO_DOW.indexOf(c.day_of_week)]}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF' }}>{cfg.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── History ─────────────────────────────────────────────── */}
      {allOwn.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#6B7D90', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ประวัติการจองวันหยุด
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...allOwn].reverse().map(r => {
              const cfg   = STATUS_CFG[r.status]
              const range = fmtWeekRange(r.week_start.slice(0, 10))
              const date  = resolveDate(r.week_start, r.day_of_week)
              const dLabel = DAYS_DISPLAY[DISPLAY_TO_DOW.indexOf(r.day_of_week)]
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Palmtree size={19} color={COLOR.primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A2B3C' }}>
                      หยุดวัน{dLabel} {fmtDate(date)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>{range}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
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

  // เปิดตรงไปแท็บที่ระบุผ่าน ?tab= ได้ (ใช้กับลิงก์แจ้งเตือน Line ตอนแอดมินเปิดจองวันหยุด)
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return (t === 'booking' || t === 'request' || t === 'calendar') ? t : 'calendar'
  })
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

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['employee', 'holidays', employee?.id],
    queryFn: () =>
      api.get('/employee/holidays').then((r: any) => (r.data.data as any[]).map(h => ({
        date: h.date?.slice(0, 10) ?? h.date,
        name: h.name,
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
        </div>

        {/* Leave balance stat row — วันลาคงเหลือทุกประเภท (ไม่ตัดแค่ 3 อันแรก) */}
        <div className="header-stat-row">
          {balances.map((b, i) => {
            const cfg = DISPLAY_LEAVE_TYPES.find(t => t.code === b.leave_type)
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
            { id: 'calendar', label: 'ปฏิทิน',   Icon: Calendar },
            { id: 'booking',  label: 'จองหยุด',  Icon: Palmtree },
            { id: 'request',  label: 'ขอลา',     Icon: FileText },
          ] as { id: Tab; label: string; Icon: typeof Calendar }[]).map(t => (
            <button key={t.id} className={`fw-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setSubmitDone(false); setErrorMsg(null) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── ปฏิทิน ─────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <PersonalCalendar requests={requests} colleagues={[]} holidays={holidays} onBooking={() => setTab('booking')} />
        )}

        {/* ── Request ─────────────────────────────────────────── */}
        {tab === 'request' && (
          submitDone ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F9FAFB', borderRadius: 18 }}>
              <Send size={44} color={COLOR.primary} className="animate-success-pop" style={{ marginBottom: 14 }} />
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
                    const active = form.leaveType === lt.code
                    return (
                      <button key={lt.code} onClick={() => setForm(f => ({ ...f, leaveType: lt.code }))}
                        style={{ flex: '1 0 40%', padding: '10px 6px', borderRadius: 12, border: `2px solid ${active ? lt.color : 'transparent'}`, cursor: 'pointer', background: active ? `${lt.color}15` : 'rgba(0,0,0,0.04)', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: active ? lt.color : '#9CA3AF' }}>{lt.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Leave balance — field แยกต่างหาก อัปเดตตามประเภทที่เลือกอยู่ */}
              {(() => {
                const selCfg = LEAVE_TYPES.find(t => t.code === form.leaveType)!
                const selBal = balances.find(b => b.leave_type === form.leaveType)
                const remaining = selBal ? selBal.total_days - selBal.used_days : null
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>วันลาคงเหลือ ({selCfg.label})</div>
                    <div style={{
                      padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${selCfg.color}30`,
                      background: `${selCfg.color}0C`, fontSize: '0.95rem', fontWeight: 800, color: selCfg.color,
                    }}>
                      {remaining !== null ? `${remaining} วัน` : '—'}
                    </div>
                  </div>
                )
              })()}
              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>วันที่เริ่มลา</div>
                  <ThaiDatePicker value={form.startDate} onChange={v => setForm(f => ({ ...f, startDate: v }))} min={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>วันที่สิ้นสุด</div>
                  <ThaiDatePicker value={form.endDate} onChange={v => setForm(f => ({ ...f, endDate: v }))} min={form.startDate || new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
              {days > 0 && (
                <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: `${COLOR.primary}08`, fontSize: '0.82rem', color: COLOR.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> รวม {days} วันทำงาน
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7D90', marginBottom: 6 }}>เหตุผล *</div>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลในการลา..." rows={3}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid rgba(255,107,53,0.2)`, fontSize: '0.88rem', background: '#fff', outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.55, fontFamily: 'inherit' }} />
              </div>
              {errorMsg && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {errorMsg}</div>}
              <button onClick={handleSubmitLeave} disabled={!canSubmit || submitting}
                style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryMid})` : 'rgba(0,0,0,0.08)', color: canSubmit ? '#fff' : '#9CA3AF', fontSize: '1rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><Loader2 size={17} className="animate-spin" /> กำลังส่ง...</> : <><Send size={17} /> ส่งคำขอลา</>}
              </button>
            </div>
          )
        )}

        {/* ── จองหยุด ─────────────────────────────────────────── */}
        {tab === 'booking' && (
          employee?.weekly_off_mode === 'MONTHLY_BATCH'
            ? <MonthlyBatchBooking employeeId={employee?.id ?? ''} branchId={employee?.branch?.id ?? ''} />
            : <WeeklyBooking employeeId={employee?.id ?? ''} branchId={employee?.branch?.id ?? ''} />
        )}
      </div>
    </div>
  )
}
