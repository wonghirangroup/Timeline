// admin/src/pages/employee/detail.tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Thermometer, ClipboardList, Sun, RefreshCw, ChevronLeft, BarChart2, CalendarDays, Umbrella, Info, CheckCircle2, Clock, XCircle, Scale, Folder, Phone, Building2, Smartphone, AlertTriangle, Users } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MOCK_EMPLOYEES, MOCK_LEAVE_BALANCES, MOCK_LEAVE_REQUESTS,
  genEmployeeLog, MOCK_BRANCHES, MOCK_DEPARTMENTS, MOCK_SHIFTS,
} from '../../lib/mock'
import type { AttendanceStatus } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function thDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return `${day}/${m}/${y + 543}`
}

function yearsFrom(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365))
}

// ── Status config ─────────────────────────────────────────────────────────────
type StatusCfg = { label: string; color: string; bg: string }

const STATUS_CFG: Record<AttendanceStatus, StatusCfg> = {
  ON_TIME:     { label: 'ตรงเวลา',    color: '#059669', bg: '#d1fae5' },
  LATE_1:      { label: 'สาย 1',      color: '#d97706', bg: '#fef3c7' },
  LATE_2:      { label: 'สาย 2',      color: '#ea580c', bg: '#ffedd5' },
  ABSENT:      { label: 'ขาด',        color: '#dc2626', bg: '#fee2e2' },
  LEAVE:       { label: 'ลากิจ',      color: '#2563eb', bg: '#dbeafe' },
  VACATION:    { label: 'พักร้อน',    color: '#7c3aed', bg: '#ede9fe' },
  WEEKLY_OFF:  { label: 'หยุดประจำ',  color: '#64748b', bg: '#f1f5f9' },
  SAT_OFF:     { label: 'หยุดเสาร์',  color: '#64748b', bg: '#f1f5f9' },
  SUN_OFF:     { label: 'หยุดอาทิตย์',color: '#64748b', bg: '#f1f5f9' },
  HOLIDAY:     { label: 'วันหยุด',    color: '#0891b2', bg: '#e0f2fe' },
  HALF_DAY:    { label: 'ลาครึ่งวัน', color: '#0891b2', bg: '#e0f2fe' },
  MANAGER:     { label: 'ผู้บริหาร',  color: '#6d28d9', bg: '#ede9fe' },
}

const AVATAR_PALETTES = [
  ['#fde68a','#78350f'], ['#bfdbfe','#1e3a8a'], ['#bbf7d0','#14532d'],
  ['#fecaca','#7f1d1d'], ['#ddd6fe','#4c1d95'], ['#fed7aa','#7c2d12'],
]

function avatarPalette(id: string) {
  const i = id.charCodeAt(id.length - 1) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[i]
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'attendance' | 'leave' | 'info'

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ employeeId, fullName }: { employeeId: string; fullName: string }) {
  const balance  = MOCK_LEAVE_BALANCES.find(b => b.employee_id === employeeId)
  const log      = genEmployeeLog(employeeId, 2026, 5)
  const workRows = log.filter(r => !['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(r.status))

  const stats = {
    work:   workRows.filter(r => ['ON_TIME','LATE_1','LATE_2'].includes(r.status)).length,
    late:   workRows.filter(r => ['LATE_1','LATE_2'].includes(r.status)).length,
    absent: workRows.filter(r => r.status === 'ABSENT').length,
    leave:  workRows.filter(r => ['LEAVE','VACATION','HALF_DAY'].includes(r.status)).length,
    fine:   log.reduce((s, r) => s + r.fine, 0),
  }

  const leaveTypes = [
    { key: 'sick',       label: 'ลาป่วย',    icon: <Thermometer  size={16}/>, color: '#dc2626', bg: '#fee2e2', used: balance?.sick_used ?? 0,       quota: balance?.sick_quota ?? 30 },
    { key: 'personal',   label: 'ลากิจ',     icon: <ClipboardList size={16}/>, color: '#d97706', bg: '#fef3c7', used: balance?.personal_used ?? 0,   quota: balance?.personal_quota ?? 3 },
    { key: 'vacation',   label: 'พักร้อน',   icon: <Sun           size={16}/>, color: '#059669', bg: '#d1fae5', used: balance?.vacation_used ?? 0,   quota: balance?.vacation_quota ?? 6 },
    { key: 'compensate', label: 'ลาชดเชย',   icon: <RefreshCw     size={16}/>, color: '#2563eb', bg: '#dbeafe', used: balance?.compensate_used ?? 0, quota: balance?.compensate_quota ?? 0 },
  ]

  const recentLog = [...log].reverse().slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Month stats */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>สถิติเดือนพฤษภาคม 2569</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {([
            { label: 'วันทำงาน',  value: stats.work,   icon: <CheckCircle2 size={18}/>, color: '#059669', bg: '#d1fae5' },
            { label: 'มาสาย',    value: stats.late,   icon: <Clock size={18}/>,        color: '#d97706', bg: '#fef3c7' },
            { label: 'ขาดงาน',   value: stats.absent, icon: <XCircle size={18}/>,      color: '#dc2626', bg: '#fee2e2' },
            { label: 'วันลา',    value: stats.leave,  icon: <CalendarDays size={18}/>, color: '#2563eb', bg: '#dbeafe' },
            { label: 'ค่าปรับ',  value: `฿${stats.fine}`, icon: <Scale size={18}/>,   color: '#7c3aed', bg: '#ede9fe' },
          ] as { label: string; value: number | string; icon: ReactNode; color: string; bg: string }[]).map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 12px', textAlign: 'center', border: `1px solid ${s.color}20` }}>
              <div style={{ marginBottom: 4, color: s.color, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave balance */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>โควต้าวันลาคงเหลือ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {leaveTypes.map(lt => {
            const remaining = Math.max(0, lt.quota - lt.used)
            const pct = lt.quota === 0 ? 0 : Math.min(100, Math.round((lt.used / lt.quota) * 100))
            const barColor = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#10b981'
            return (
              <div key={lt.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: '1rem' }}>{lt.icon}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: lt.color }}>{lt.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: lt.quota === 0 ? '#94a3b8' : lt.color, lineHeight: 1 }}>
                  {lt.quota === 0 ? '—' : remaining}
                  {lt.quota > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8', marginLeft: 2 }}>/{lt.quota} วัน</span>}
                </div>
                {lt.quota > 0 && (
                  <>
                    <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', margin: '8px 0 4px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ใช้ไป {lt.used} วัน ({pct}%)</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent attendance */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>บันทึกล่าสุด 7 วัน</div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {recentLog.map((row, idx) => {
            const sc = STATUS_CFG[row.status]
            const isOff = ['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(row.status)
            return (
              <div key={row.date} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: idx < recentLog.length - 1 ? '1px solid #f8fafc' : 'none', opacity: isOff ? 0.6 : 1 }}>
                <div style={{ width: 50, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{row.day_th}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{row.date.slice(8)} {MONTH_TH[Number(row.date.slice(5,7))-1].slice(0,3)}</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sc.bg, color: sc.color, flexShrink: 0 }}>{sc.label}</span>
                <div style={{ flex: 1, display: 'flex', gap: 16 }}>
                  {row.check_in_time && <span style={{ fontSize: '0.8rem', color: '#374151' }}>เข้า <strong>{row.check_in_time}</strong></span>}
                  {row.check_out_time && <span style={{ fontSize: '0.8rem', color: '#374151' }}>ออก <strong>{row.check_out_time}</strong></span>}
                  {row.late_minutes > 0 && <span style={{ fontSize: '0.75rem', color: '#d97706' }}>สาย {row.late_minutes} นาที</span>}
                  {row.note && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{row.note}</span>}
                </div>
                {row.fine > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', flexShrink: 0 }}>฿{row.fine}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Attendance Tab ────────────────────────────────────────────────────────────
function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [month, setMonth] = useState(5)
  const [year, setYear] = useState(2026)

  const log = genEmployeeLog(employeeId, year, month)

  const workRows = log.filter(r => !['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(r.status))
  const summary = {
    work:   workRows.filter(r => ['ON_TIME','LATE_1','LATE_2'].includes(r.status)).length,
    late:   workRows.filter(r => ['LATE_1','LATE_2'].includes(r.status)).length,
    absent: workRows.filter(r => r.status === 'ABSENT').length,
    leave:  workRows.filter(r => ['LEAVE','VACATION','HALF_DAY'].includes(r.status)).length,
    fine:   log.reduce((s, r) => s + r.fine, 0),
    lateMin:log.reduce((s, r) => s + r.late_minutes, 0),
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>‹ ก่อนหน้า</button>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_TH[month-1]} {year} ({year+543})</span>
        <button onClick={nextMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>ถัดไป ›</button>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: `ทำงาน ${summary.work} วัน`,    color: '#059669', bg: '#d1fae5' },
          { label: `สาย ${summary.late} ครั้ง`,    color: '#d97706', bg: '#fef3c7' },
          { label: `ขาด ${summary.absent} วัน`,    color: '#dc2626', bg: '#fee2e2' },
          { label: `ลา ${summary.leave} วัน`,      color: '#2563eb', bg: '#dbeafe' },
          { label: `สายรวม ${summary.lateMin} นาที`, color: '#7c3aed', bg: '#ede9fe' },
          { label: `ค่าปรับ ฿${summary.fine}`,     color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <span key={s.label} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
        ))}
      </div>

      {/* Log table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 70px 90px 90px 100px 60px 60px 1fr', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {['วันที่','กะ','เวลาเข้า','เวลาออก','สถานะ','สาย(นาที)','ค่าปรับ','หมายเหตุ'].map(h => (
            <div key={h} style={{ padding: '9px 12px', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
          ))}
        </div>
        {log.map((row, idx) => {
          const sc = STATUS_CFG[row.status]
          const isOff = ['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY'].includes(row.status)
          return (
            <div key={row.date} style={{
              display: 'grid', gridTemplateColumns: '90px 70px 90px 90px 100px 60px 60px 1fr',
              borderBottom: idx < log.length - 1 ? '1px solid #f8fafc' : 'none',
              background: isOff ? '#fafbff' : row.status === 'ABSENT' ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fafafa',
              opacity: isOff ? 0.7 : 1,
            }}>
              <div style={{ padding: '9px 12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{row.day_th} {row.date.slice(8)}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{MONTH_TH[month-1].slice(0,3)}</div>
              </div>
              <div style={{ padding: '9px 12px', fontSize: '0.8rem', color: '#374151', display: 'flex', alignItems: 'center' }}>
                {row.shift_no ? `กะ ${row.shift_no}` : '—'}
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: row.check_in_time ? '#059669' : '#94a3b8', fontFamily: 'monospace' }}>
                  {row.check_in_time ?? '—'}
                </span>
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: row.check_out_time ? '#374151' : '#94a3b8', fontFamily: 'monospace' }}>
                  {row.check_out_time ?? '—'}
                </span>
              </div>
              <div style={{ padding: '9px 8px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                  {sc.label}
                </span>
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: row.late_minutes > 0 ? '#d97706' : '#94a3b8', fontWeight: row.late_minutes > 0 ? 700 : 400 }}>
                  {row.late_minutes > 0 ? row.late_minutes : '—'}
                </span>
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: row.fine > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.fine > 0 ? 700 : 400 }}>
                  {row.fine > 0 ? `฿${row.fine}` : '—'}
                </span>
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{row.note || ''}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Leave Tab ─────────────────────────────────────────────────────────────────
function LeaveTab({ fullName }: { fullName: string }) {
  const requests = MOCK_LEAVE_REQUESTS.filter(r => r.full_name === fullName)

  const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
    PENDING:   { color: '#d97706', bg: '#fef3c7' },
    APPROVED:  { color: '#059669', bg: '#d1fae5' },
    REJECTED:  { color: '#dc2626', bg: '#fee2e2' },
    CANCELLED: { color: '#64748b', bg: '#f1f5f9' },
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'รอ', APPROVED: 'อนุมัติ', REJECTED: 'ปฏิเสธ', CANCELLED: 'ยกเลิก',
  }

  if (requests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.4 }}><CalendarDays size={40}/></div>
        <div style={{ fontSize: '0.9rem' }}>ยังไม่มีประวัติการลา</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '130px 120px 80px 80px 1fr 90px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {['ประเภท','ช่วงวันที่','จำนวน','ช่วง','เหตุผล','สถานะ'].map(h => (
          <div key={h} style={{ padding: '9px 12px', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
        ))}
      </div>
      {requests.map((r, idx) => {
        const sc = STATUS_COLOR[r.status] ?? { color: '#64748b', bg: '#f1f5f9' }
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '130px 120px 80px 80px 1fr 90px', borderBottom: idx < requests.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: r.leave_type_color + '20', color: r.leave_type_color }}>{r.leave_type}</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{thDate(r.start_date)}</div>
              {r.end_date !== r.start_date && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ถึง {thDate(r.end_date)}</div>}
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{r.days}</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 3 }}>วัน</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {r.half_day_period === 'AM' ? 'ช่วงเช้า' : r.half_day_period === 'PM' ? 'ช่วงบ่าย' : '—'}
              </span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sc.bg, color: sc.color }}>{STATUS_LABEL[r.status]}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Info Tab ──────────────────────────────────────────────────────────────────
function InfoTab({ employeeId }: { employeeId: string }) {
  const emp = MOCK_EMPLOYEES.find(e => e.id === employeeId)!
  const dept = MOCK_DEPARTMENTS.find(d => d.name === emp.department)
  const shift = MOCK_SHIFTS.find(s => s.id === emp.default_shift_id)

  const rows = [
    { label: 'รหัสพนักงาน',  value: emp.code,              mono: true },
    { label: 'ชื่อ-สกุล',    value: emp.full_name },
    { label: 'ชื่อเล่น',     value: emp.nickname },
    { label: 'แผนก',         value: `${dept?.code ?? ''} — ${emp.department}` },
    { label: 'กะทำงาน',      value: shift ? `${shift.name}  ${shift.start_time} – ${shift.end_time}  (${shift.branch_name})` : '—' },
    { label: 'เบอร์โทร',     value: emp.phone,             mono: true },
    { label: 'วันที่เริ่มงาน', value: thDate(emp.hire_date) },
    { label: 'อายุงาน',      value: `${yearsFrom(emp.hire_date)} ปี` },
    { label: 'สถานะ',        value: emp.status === 'ACTIVE' ? 'ปฏิบัติงานอยู่' : 'ไม่ได้ปฏิบัติงาน' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={{ width: 140, padding: '13px 16px', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>{r.label}</div>
            <div style={{ flex: 1, padding: '13px 16px', fontSize: '0.875rem', color: '#0f172a', fontFamily: r.mono ? 'monospace' : 'inherit', fontWeight: r.mono ? 600 : 400 }}>{r.value}</div>
          </div>
        ))}
      </div>

      {/* Line Account */}
      <div style={{ background: '#fff', border: `1px solid ${emp.line_user_id ? '#e2e8f0' : '#fde68a'}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 140, padding: '13px 16px', background: emp.line_user_id ? '#f8fafc' : '#fffbeb', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>Line Account</div>
          <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {emp.line_user_id ? (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#15803d' }}>✓ ผูกแล้ว</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {emp.line_user_id.slice(0, 8)}••••••••{emp.line_user_id.slice(-4)}
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>⚠ ยังไม่ผูก</span>
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>พนักงานต้องกดลิงก์ยืนยันตัวตนก่อนใช้ LIFF</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Branches */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 140, padding: '13px 16px', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>สังกัดสาขา</div>
          <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {emp.branches.map(b => {
              const br = MOCK_BRANCHES.find(x => x.name === b)
              return (
                <div key={b} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '5px 10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c' }}>{b}</div>
                  {br && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 1 }}>{br.address.slice(0, 30)}…</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [inviteSent, setInviteSent] = useState(false)

  function handleSendInvite() {
    setInviteSent(true)
    setTimeout(() => setInviteSent(false), 3000)
  }

  const emp = MOCK_EMPLOYEES.find(e => e.id === id)

  if (!emp) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', opacity: 0.4 }}><Users size={36}/></div>
        <div style={{ fontSize: '1rem', color: '#64748b' }}>ไม่พบข้อมูลพนักงาน</div>
        <button onClick={() => navigate('/employee')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={14}/>กลับรายการ</button>
      </div>
    )
  }

  const [avatarBg, avatarText] = avatarPalette(emp.id)
  const balance = MOCK_LEAVE_BALANCES.find(b => b.employee_id === emp.id)

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'overview',   label: 'ภาพรวม',         icon: <BarChart2 size={15}/> },
    { key: 'attendance', label: 'ประวัติเช็คอิน',  icon: <ClipboardList size={15}/> },
    { key: 'leave',      label: 'วันลา',           icon: <Umbrella size={15}/> },
    { key: 'info',       label: 'ข้อมูลส่วนตัว',   icon: <Info size={15}/> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Profile Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px' }}>
        {/* Back */}
        <button
          onClick={() => navigate('/employee')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.84rem', marginBottom: 16, padding: 0 }}
        >
          <ChevronLeft size={16}/>
          รายการพนักงาน
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 18, flexShrink: 0,
            background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: avatarText,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          }}>
            {emp.nickname.slice(0, 2)}
          </div>

          {/* Name block */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{emp.full_name}</h1>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({emp.nickname})</span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: emp.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                color: emp.status === 'ACTIVE' ? '#059669' : '#dc2626',
              }}>{emp.status === 'ACTIVE' ? '● ปฏิบัติงาน' : '○ ไม่ได้ปฏิบัติงาน'}</span>
              {emp.line_user_id ? (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                  ✓ ผูก Line แล้ว
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                  ⚠ ยังไม่ผูก Line
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f1f5f9', padding: '3px 10px', borderRadius: 7, color: '#374151', fontWeight: 600 }}>{emp.code}</span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Folder size={13}/>{emp.department}</span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13}/>{emp.phone}</span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={13}/>เริ่มงาน {thDate(emp.hire_date)} ({yearsFrom(emp.hire_date)} ปี)</span>
            </div>

            {/* Branches + Shift */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {emp.branches.map(b => (
                <span key={b} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={11}/>{b}
                </span>
              ))}
              {(() => {
                const sh = MOCK_SHIFTS.find(s => s.id === emp.default_shift_id)
                if (!sh) return null
                return (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11}/>{sh.name} {sh.start_time}–{sh.end_time}
                  </span>
                )
              })()}
            </div>
          </div>

          {/* Quick leave balance */}
          {balance && (
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {[
                { label: 'ป่วย',    used: balance.sick_used,       quota: balance.sick_quota,       color: '#dc2626' },
                { label: 'กิจ',     used: balance.personal_used,   quota: balance.personal_quota,   color: '#d97706' },
                { label: 'พักร้อน', used: balance.vacation_used,   quota: balance.vacation_quota,   color: '#059669' },
              ].map(b => (
                <div key={b.label} style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: b.color }}>{Math.max(0, b.quota - b.used)}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>เหลือ{b.label}</div>
                  <div style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>{b.used}/{b.quota} วัน</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Line warning banner */}
        {!emp.line_user_id && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#92400e' }}>พนักงานยังไม่ได้ผูก Line account</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>ไม่สามารถเช็คอินผ่าน Line LIFF ได้จนกว่าจะผูก account — กดส่งลิงก์ให้พนักงานทำขั้นตอนผูกบัญชีเอง</div>
            </div>
            {inviteSent ? (
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '6px 14px', borderRadius: 8 }}>✓ ส่งแล้ว!</span>
            ) : (
              <button
                onClick={handleSendInvite}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Smartphone size={14}/>
                ส่งลิงก์ผูก Line
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 20, borderBottom: '2px solid #f1f5f9' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 18px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: tab === t.key ? 700 : 500,
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? '#ea580c' : '#64748b',
                borderBottom: tab === t.key ? '2px solid #f97316' : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '24px 28px' }}>
        {tab === 'overview'   && <OverviewTab   employeeId={emp.id} fullName={emp.full_name} />}
        {tab === 'attendance' && <AttendanceTab employeeId={emp.id} />}
        {tab === 'leave'      && <LeaveTab      fullName={emp.full_name} />}
        {tab === 'info'       && <InfoTab       employeeId={emp.id} />}
      </div>
    </div>
  )
}
