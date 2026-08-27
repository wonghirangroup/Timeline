// admin/src/pages/leave/TeamCalendarTab.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X, CalendarDays, Stethoscope, Briefcase, Sun, Heart, Printer, FileSpreadsheet, Flag, Pencil, Trash2, Move, Plus, Search, Table2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

// ─── API types ────────────────────────────────────────────────────────────────
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string; employee_code?: string; branch: { id: string; name: string; group_id?: string | null } }
interface ApiEmployeeFull extends ApiEmployee { position?: { department?: { division?: { group?: { id: string; name: string } | null } | null } | null } | null }
interface ApiGroup { id: string; name: string }
interface ApiWeeklyOff { id: string; employee_id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; employee: ApiEmployee }
interface ApiLeave { id: string; employee_id: string; leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'; start_date: string; end_date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; reason?: string; employee: ApiEmployee }
interface ApiHoliday { id: string; date: string; name: string; target_branches: string[] | null; target_departments: string[] | null }
interface ApiBranch { id: string; name: string }

// ─── Local display types ──────────────────────────────────────────────────────
interface DayOff { id: string; date: string; employee_id: string; name: string; nickname: string; branch_id: string; branch_name: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface LeaveReq { id: string; employee_id: string; name: string; nickname: string; branch_id: string; branch_name: string; leave_type: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'; display_label: string; start_date: string; end_date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface Holiday { date: string; name: string; target_branches: string[] | null }

// ─── Config ───────────────────────────────────────────────────────────────────
const MONTHS_LONG = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_SHORT  = ['อา','จ','อ','พ','พฤ','ศ','ส']

const STATUS_LABEL_TH: Record<string, string> = { PENDING: 'รอพิจารณา', APPROVED: 'อนุมัติ', REJECTED: 'ปฏิเสธ' }

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

// ── สีต่อคนสำหรับตารางแยกกลุ่ม (roster) — ตั้งเองได้ (manual) แล้วจำไว้ในเครื่อง
// นี้ (localStorage) ไม่ต้องเลือกใหม่ทุกครั้งที่ export — ถ้ายังไม่เคยตั้งเอง
// จะสุ่มจาก palette ให้อัตโนมัติตามลำดับคนในตาราง
const ROSTER_COLOR_PALETTE = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#06B6D4', '#EF4444', '#84CC16', '#6366F1',
  '#14B8A6', '#D946EF',
]
const ROSTER_COLOR_KEY = 'tl_roster_colors'

function loadRosterColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ROSTER_COLOR_KEY) ?? '{}') } catch { return {} }
}
function saveRosterColors(colors: Record<string, string>) {
  try { localStorage.setItem(ROSTER_COLOR_KEY, JSON.stringify(colors)) } catch { /* ignore เช่น private mode */ }
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
    id:          w.id,
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
  return LEAVE_CFG[l.leave_type] ? { ...LEAVE_CFG[l.leave_type], label: l.display_label } : { color: 'var(--text-muted)', light: '#f3f4f6', icon: null, label: l.display_label }
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
  const holiday = holidays.find(h =>
    h.date.slice(0, 10) === date &&
    (branchFilter === 'all' || !h.target_branches?.length || h.target_branches.includes(branchFilter))
  )
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

// ─── Drag payload — ลากพนักงานจาก cell หนึ่งไปวางอีก cell เพื่อย้ายวันหยุด/วันลา ──────
type DragPayload = { kind: 'dayoff' | 'leave'; id: string; label: string }
const DND_MIME = 'application/x-timeline-calendar-item'

// ─── Calendar cell ─────────────────────────────────────────────────────────────
function DayCell({ day, month, branchFilter, isToday, isSelected, onClick, dayOffs, leaves, holidays, compact = false, onDropItem }: {
  day: number; month: string; branchFilter: string; isToday: boolean; isSelected: boolean; onClick: () => void
  dayOffs: DayOff[]; leaves: LeaveReq[]; holidays: Holiday[]; compact?: boolean
  onDropItem: (payload: DragPayload, date: string) => void
}) {
  const dateStr = toDateStr(month, day)
  const { dayOffs: evDayOffs, leaves: evLeaves, holiday } = getEventsForDate(dateStr, branchFilter, dayOffs, leaves, holidays)
  const pendingCount = evDayOffs.filter(d => d.status === 'PENDING').length
  const totalOff   = evDayOffs.length
  const totalLeave = evLeaves.filter(l => l.status !== 'REJECTED').length
  const hasEvent   = totalOff > 0 || totalLeave > 0
  const [dragOver, setDragOver] = useState(false)

  const MAX_SHOW = 3
  const shown    = evDayOffs.slice(0, MAX_SHOW)
  const overflow = totalOff - MAX_SHOW

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(DND_MIME)) return
    e.preventDefault()
    setDragOver(true)
  }
  function handleDrop(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(DND_MIME)) return
    e.preventDefault()
    setDragOver(false)
    try {
      const payload: DragPayload = JSON.parse(e.dataTransfer.getData(DND_MIME))
      onDropItem(payload, dateStr)
    } catch { /* ignore malformed payload */ }
  }

  return (
    <button
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        background: dragOver ? '#fff7ed' : holiday ? '#fef2f2' : isSelected ? '#fff7ed' : '#fff',
        border: dragOver ? '2px dashed #f97316' : isSelected ? '2px solid #f97316' : '1px solid #f1f5f9',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.58rem', color: '#dc2626', fontWeight: 600, marginBottom: 3, lineHeight: 1.3 }}>
          <Flag size={9} /> {holiday.name.length > 10 ? holiday.name.slice(0, 10) + '…' : holiday.name}
        </div>
      )}

      {/* Day-off name chips */}
      {totalOff > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 3 }}>
          {shown.map(d => {
            const short = d.nickname || d.name.split(' ')[0]
            return (
              <div key={d.id} title={`${d.name} · ลากเพื่อย้ายวันหยุด`} draggable
                onDragStart={e => { e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: 'dayoff', id: d.id, label: d.name } as DragPayload)); e.dataTransfer.effectAllowed = 'move' }}
                style={{
                fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.5,
                padding: '0px 5px', borderRadius: 5, cursor: 'grab',
                background: '#FFF7ED', color: '#c2410c',
                border: d.status === 'PENDING' ? '1px dashed #ea580c' : '1px solid #ea580c55',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {short}
              </div>
            )
          })}
          {overflow > 0 && (
            <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 2 }}>+{overflow} คน</div>
          )}
        </div>
      )}

      {/* Leave name chips */}
      {totalLeave > 0 && (() => {
        const activeLeaves = evLeaves.filter(l => l.status !== 'REJECTED')
        const LEAVE_MAX_SHOW = 3
        const shownLeaves = activeLeaves.slice(0, LEAVE_MAX_SHOW)
        const leaveOverflow = activeLeaves.length - LEAVE_MAX_SHOW
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {shownLeaves.map(l => {
              const cfg  = getLeaveCfg(l)
              const short = l.nickname || l.name.split(' ')[0]
              const isSingleDay = l.start_date === l.end_date
              return (
                <div key={l.id} title={isSingleDay ? `${l.display_label} — ${l.name} · ลากเพื่อย้ายวันลา` : `${l.display_label} — ${l.name}`}
                  draggable={isSingleDay}
                  onDragStart={isSingleDay ? e => { e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: 'leave', id: l.id, label: l.name } as DragPayload)); e.dataTransfer.effectAllowed = 'move' } : undefined}
                  style={{
                  fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.5,
                  padding: '0px 5px', borderRadius: 5, cursor: isSingleDay ? 'grab' : 'default',
                  background: cfg.light, color: cfg.color,
                  border: l.status === 'PENDING' ? `1px dashed ${cfg.color}` : `1px solid ${cfg.color}55`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {short}
                </div>
              )
            })}
            {leaveOverflow > 0 && (
              <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 2 }}>+{leaveOverflow} คน</div>
            )}
          </div>
        )
      })()}

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

// ─── Quick-add: เพิ่มวันหยุดประจำ/วันลาให้พนักงานตรงจากปฏิทิน ──────────────────
const QUICK_LEAVE_TYPES: { value: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'; label: string }[] = [
  { value: 'SICK', label: 'ลาป่วย' }, { value: 'PERSONAL', label: 'ลากิจ' },
  { value: 'VACATION', label: 'ลาพักร้อน' }, { value: 'MATERNITY', label: 'ลาคลอด' },
]

function QuickAddForm({ date, employees, onAddDayOff, onAddLeave, onDone }: {
  date: string; employees: ApiEmployee[]
  onAddDayOff: (employeeId: string) => void
  onAddLeave: (employeeId: string, leaveType: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY') => void
  onDone: () => void
}) {
  const [kind, setKind] = useState<'dayoff' | 'leave'>('dayoff')
  const [leaveType, setLeaveType] = useState<'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'>('SICK')
  const [q, setQ] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query.length === 0 ? employees : employees.filter(e => `${e.first_name} ${e.last_name} ${e.nickname ?? ''}`.toLowerCase().includes(query))

  function submit() {
    if (!employeeId) return
    if (kind === 'dayoff') onAddDayOff(employeeId)
    else onAddLeave(employeeId, leaveType)
    onDone()
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setKind('dayoff')} style={{ flex: 1, padding: '5px', borderRadius: 7, border: `1.5px solid ${kind === 'dayoff' ? '#ea580c' : '#e5e7eb'}`, background: kind === 'dayoff' ? '#fff7ed' : '#fff', color: kind === 'dayoff' ? '#ea580c' : '#64748b', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>หยุดประจำ</button>
        <button onClick={() => setKind('leave')} style={{ flex: 1, padding: '5px', borderRadius: 7, border: `1.5px solid ${kind === 'leave' ? '#3b82f6' : '#e5e7eb'}`, background: kind === 'leave' ? '#eff6ff' : '#fff', color: kind === 'leave' ? '#3b82f6' : '#64748b', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>วันลา</button>
      </div>
      {kind === 'leave' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {QUICK_LEAVE_TYPES.map(t => (
            <button key={t.value} onClick={() => setLeaveType(t.value)}
              style={{ padding: '3px 9px', borderRadius: 99, border: `1px solid ${leaveType === t.value ? LEAVE_CFG[t.value].color : '#e5e7eb'}`, background: leaveType === t.value ? LEAVE_CFG[t.value].light : '#fff', color: leaveType === t.value ? LEAVE_CFG[t.value].color : '#64748b', fontWeight: 700, fontSize: '0.66rem', cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาพนักงาน..."
          style={{ width: '100%', padding: '6px 8px 6px 26px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.76rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} size={q ? 4 : undefined}
        style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.76rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
        <option value="">— เลือกพนักงาน —</option>
        {filtered.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''}</option>)}
      </select>
      <button onClick={submit} disabled={!employeeId}
        style={{ padding: '7px', borderRadius: 7, border: 'none', background: !employeeId ? '#d1d5db' : '#374151', color: '#fff', fontWeight: 700, fontSize: '0.76rem', cursor: !employeeId ? 'not-allowed' : 'pointer' }}>
        + เพิ่มให้วันที่นี้
      </button>
    </div>
  )
}

// ─── Day detail panel ─────────────────────────────────────────────────────────
function DayDetailPanel({ date, branchFilter, onClose, dayOffs, leaves, holidays, employees, onMoveDayOff, onMoveLeave, onDeleteDayOff, onDeleteLeave, onAddDayOff, onAddLeave }: {
  date: string; branchFilter: string; onClose: () => void
  dayOffs: DayOff[]; leaves: LeaveReq[]; holidays: Holiday[]; employees: ApiEmployee[]
  onMoveDayOff: (id: string, date: string) => void
  onMoveLeave: (id: string, date: string) => void
  onDeleteDayOff: (id: string, label: string) => void
  onDeleteLeave: (id: string, label: string) => void
  onAddDayOff: (employeeId: string) => void
  onAddLeave: (employeeId: string, leaveType: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY') => void
}) {
  const { dayOffs: evDayOffs, leaves: evLeaves, holiday } = getEventsForDate(date, branchFilter, dayOffs, leaves, holidays)
  const approved     = evDayOffs.filter(d => d.status === 'APPROVED')
  const pending      = evDayOffs.filter(d => d.status === 'PENDING')
  const activeLeaves = evLeaves.filter(l => l.status !== 'REJECTED')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  function RowActions({ id, onDelete }: { id: string; onDelete: () => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button onClick={() => setMovingId(m => m === id ? null : id)} title="ย้ายวันที่"
          style={{ width: 24, height: 24, border: 'none', background: movingId === id ? '#fff7ed' : 'none', cursor: 'pointer', color: movingId === id ? '#ea580c' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
          onMouseEnter={e => { if (movingId !== id) e.currentTarget.style.background = '#f3f4f6' }} onMouseLeave={e => { if (movingId !== id) e.currentTarget.style.background = 'none' }}>
          <Pencil size={12} />
        </button>
        <button onClick={onDelete} title="ลบ"
          style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5 }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <Trash2 size={12} />
        </button>
      </div>
    )
  }

  function MoveDateRow({ id, onMove }: { id: string; onMove: (date: string) => void }) {
    if (movingId !== id) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 8px', marginLeft: 36 }}>
        <Move size={11} color="var(--text-muted)" />
        <input type="date" defaultValue={date} autoFocus
          onChange={e => { if (e.target.value) { onMove(e.target.value); setMovingId(null) } }}
          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.72rem', fontFamily: 'inherit' }} />
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
      padding: 20, width: 340, maxWidth: '100%', maxHeight: '80vh', overflowY: 'auto',
      boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            รายละเอียด
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 2 }}>
            {fmtDateFull(date)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowAdd(a => !a)} title="เพิ่มวันหยุด/วันลา"
            style={{ background: showAdd ? '#fff7ed' : '#f3f4f6', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: showAdd ? '#ea580c' : 'var(--text-muted)', display: 'flex' }}>
            <Plus size={14} />
          </button>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {showAdd && (
        <QuickAddForm date={date} employees={employees}
          onAddDayOff={onAddDayOff} onAddLeave={onAddLeave}
          onDone={() => setShowAdd(false)} />
      )}

      {/* Holiday */}
      {holiday && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
          <Flag size={13} /> {holiday.name}
        </div>
      )}

      {/* Nothing to show */}
      {evDayOffs.length === 0 && activeLeaves.length === 0 && !holiday && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
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
            <div key={d.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                borderBottom: movingId === d.id ? 'none' : '1px solid #f9fafb',
              }}>
                <AvatarChip name={d.name} isPending={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{d.nickname || d.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.branch_name}</div>
                </div>
                <RowActions id={d.id} onDelete={() => onDeleteDayOff(d.id, d.nickname || d.name)} />
              </div>
              <MoveDateRow id={d.id} onMove={newDate => onMoveDayOff(d.id, newDate)} />
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
            <div key={d.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                borderBottom: movingId === d.id ? 'none' : '1px solid #f9fafb',
              }}>
                <AvatarChip name={d.name} isPending={true} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{d.nickname || d.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.branch_name}</div>
                </div>
                <RowActions id={d.id} onDelete={() => onDeleteDayOff(d.id, d.nickname || d.name)} />
              </div>
              <MoveDateRow id={d.id} onMove={newDate => onMoveDayOff(d.id, newDate)} />
            </div>
          ))}
        </div>
      )}

      {/* Leaves */}
      {activeLeaves.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CalendarDays size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              วันลา ({activeLeaves.length})
            </span>
          </div>
          {activeLeaves.map(l => {
            const cfg = getLeaveCfg(l)
            const isSingleDay = l.start_date === l.end_date
            return (
              <div key={l.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                  borderBottom: movingId === l.id ? 'none' : '1px solid #f9fafb',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{l.nickname || l.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{l.display_label} · {l.branch_name}</div>
                  </div>
                  {l.status === 'PENDING' && (
                    <span style={{ fontSize: '0.6rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                      รอ
                    </span>
                  )}
                  {isSingleDay
                    ? <RowActions id={l.id} onDelete={() => onDeleteLeave(l.id, l.nickname || l.name)} />
                    : (
                      <button onClick={() => onDeleteLeave(l.id, l.nickname || l.name)} title="ลบ"
                        style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <Trash2 size={12} />
                      </button>
                    )}
                </div>
                {isSingleDay && <MoveDateRow id={l.id} onMove={newDate => onMoveLeave(l.id, newDate)} />}
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
  const { showToast } = useToast()
  const qc = useQueryClient()

  const [month,        setMonth]        = useState(todayYM)
  const [branchFilter, setBranchFilter] = useState('all')
  const [groupFilter,  setGroupFilter]  = useState('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'dayoff' | 'leave'; id: string; label: string } | null>(null)
  const [showRosterSettings, setShowRosterSettings] = useState(false)
  const [rosterCols, setRosterCols] = useState({ code: true, branch: true })
  const [rosterColors, setRosterColors] = useState<Record<string, string>>(() => loadRosterColors())

  function colorForEmployee(id: string, orderedIds: string[]): string {
    if (rosterColors[id]) return rosterColors[id]
    const idx = orderedIds.indexOf(id)
    return ROSTER_COLOR_PALETTE[idx % ROSTER_COLOR_PALETTE.length]
  }
  function setEmployeeColor(id: string, color: string) {
    setRosterColors(prev => { const next = { ...prev, [id]: color }; saveRosterColors(next); return next })
  }

  const year = Number(month.slice(0, 4))

  const invalidateCalendar = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'weekly-off'] })
    qc.invalidateQueries({ queryKey: ['admin', 'leave-requests-cal'] })
    qc.invalidateQueries({ queryKey: ['admin', 'leave-requests'] })
  }

  // ย้ายวันหยุดประจำ (weekly-off) ไปวันที่อื่น — ใช้ทั้ง popup date-picker และ drag-drop
  const moveDayOffMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      api.patch(`/api/v1/admin/weekly-off/${id}`, { week_start: date, day_of_week: new Date(date + 'T00:00:00Z').getUTCDay() }),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'ย้ายวันหยุดสำเร็จ') },
    onError: (e: any) => {
      const code = e?.response?.data?.error?.code
      showToast('error', code === 'ALREADY_REQUESTED' ? 'พนักงานนี้มีวันหยุดในสัปดาห์ที่ย้ายไปแล้ว' : 'ย้ายไม่สำเร็จ')
    },
  })

  // ย้ายวันลา (เฉพาะวันลาแบบ 1 วัน — เก็บจำนวนวันเท่าเดิม)
  const moveLeaveMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      api.patch(`/api/v1/admin/leave-requests/${id}`, { start_date: date, end_date: date }),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'ย้ายวันลาสำเร็จ') },
    onError: (e: any) => {
      const code = e?.response?.data?.error?.code
      showToast('error', code === 'LEAVE_OVERLAP' ? 'มีวันลาที่ทับซ้อนกันอยู่แล้ว' : 'ย้ายไม่สำเร็จ')
    },
  })

  const deleteDayOffMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/weekly-off/${id}`),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'ลบวันหยุดแล้ว'); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })
  const deleteLeaveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/leave-requests/${id}`),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'ลบวันลาแล้ว'); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

  // เพิ่มวันหยุดประจำ/วันลาให้พนักงานตรงจากปฏิทิน (feedback backlog 2026-08-27)
  const addDayOffMutation = useMutation({
    mutationFn: ({ employeeId, date }: { employeeId: string; date: string }) =>
      api.post('/api/v1/admin/weekly-off', { employee_id: employeeId, week_start: date, day_of_week: new Date(date + 'T00:00:00Z').getUTCDay() }),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'เพิ่มวันหยุดสำเร็จ') },
    onError: (e: any) => {
      const code = e?.response?.data?.error?.code
      showToast('error', code === 'ALREADY_REQUESTED' ? 'พนักงานนี้มีวันหยุดในสัปดาห์นี้แล้ว' : 'เพิ่มไม่สำเร็จ')
    },
  })
  const addLeaveMutation = useMutation({
    mutationFn: ({ employeeId, leaveType, date }: { employeeId: string; leaveType: string; date: string }) =>
      api.post('/api/v1/admin/leave-requests', { employee_id: employeeId, leave_type: leaveType, start_date: date, end_date: date, days: 1 }),
    onSuccess: () => { invalidateCalendar(); showToast('success', 'เพิ่มวันลาสำเร็จ (อนุมัติอัตโนมัติ)') },
    onError: (e: any) => {
      const code = e?.response?.data?.error?.code
      showToast('error', code === 'LEAVE_OVERLAP' ? 'มีวันลาที่ทับซ้อนกันอยู่แล้ว' : code === 'INSUFFICIENT_BALANCE' ? 'วันลาคงเหลือไม่พอ' : 'เพิ่มไม่สำเร็จ')
    },
  })

  function handleMoveDayOff(id: string, date: string) { moveDayOffMutation.mutate({ id, date }) }
  function handleMoveLeave(id: string, date: string)  { moveLeaveMutation.mutate({ id, date }) }
  function handleConfirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'dayoff') deleteDayOffMutation.mutate(deleteTarget.id)
    else deleteLeaveMutation.mutate(deleteTarget.id)
  }

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

  const { data: groups = [] } = useQuery<ApiGroup[]>({
    queryKey: ['admin', 'groups'],
    queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data),
  })

  const { data: employeesFull = [] } = useQuery<ApiEmployeeFull[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const employees: ApiEmployee[] = employeesFull

  // employee_id → group_id (ผ่าน position→department→division→group) — ใช้กรอง
  // ปฏิทินแยกตามกลุ่ม (dropdown แสดงเฉพาะตอนมีมากกว่า 1 กลุ่ม ไม่รบกวน tenant
  // ทั่วไปที่มีกลุ่มเดียว)
  // เอาสาขาที่สังกัดเป็นหลัก (มีข้อมูลครบทุกคนอยู่แล้ว) — ผังองค์กร (ตำแหน่ง→แผนก→
  // ฝ่าย→กลุ่ม) เป็นแค่ fallback เพราะพนักงานส่วนใหญ่ยังไม่ได้ผูกตำแหน่งในผังองค์กร
  const employeeGroupId: Record<string, string | null> = {}
  for (const e of employeesFull) employeeGroupId[e.id] = e.branch.group_id ?? e.position?.department?.division?.group?.id ?? null

  const dayOffsRaw: DayOff[]  = rawWeeklyOff.filter(w => w.status !== 'REJECTED').map(toDisplayDayOff)
  const leavesRaw: LeaveReq[] = rawLeaves.map(toDisplayLeave)
  const dayOffs: DayOff[]    = groupFilter === 'all' ? dayOffsRaw : dayOffsRaw.filter(d => employeeGroupId[d.employee_id] === groupFilter)
  const leaves: LeaveReq[]   = groupFilter === 'all' ? leavesRaw  : leavesRaw.filter(l => employeeGroupId[l.employee_id] === groupFilter)
  const holidays: Holiday[]  = rawHolidays.map(h => ({ date: h.date.slice(0, 10), name: h.name, target_branches: h.target_branches }))

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

  const branchLabel = branchFilter === 'all' ? 'ทุกสาขา' : (branches.find(b => b.id === branchFilter)?.name ?? 'ทุกสาขา')

  function exportExcel() {
    const header = ['วันที่', 'ประเภท', 'พนักงาน', 'สาขา', 'รายละเอียด', 'สถานะ']
    const rows: string[][] = []
    for (const d of [...allDayOffsThisMonth].sort((a, b) => a.date.localeCompare(b.date))) {
      rows.push([d.date, 'หยุดประจำ', d.name, d.branch_name, '', STATUS_LABEL_TH[d.status]])
    }
    for (const l of [...allLeavesThisMonth].sort((a, b) => a.start_date.localeCompare(b.start_date))) {
      const range = l.start_date === l.end_date ? l.start_date : `${l.start_date} – ${l.end_date}`
      rows.push([range, 'วันลา', l.name, l.branch_name, l.display_label, STATUS_LABEL_TH[l.status]])
    }
    const csv = '﻿' + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `ปฏิทินรวม_${month}.csv`; a.click()
  }

  function exportPdf() {
    const win = window.open('', '_blank'); if (!win) return

    function cellHtml(day: number): string {
      if (day < 1 || day > daysInMonth) return '<td class="empty"></td>'
      const dateStr = toDateStr(month, day)
      const dow = (firstDow + day - 1) % 7
      const { dayOffs: evDayOffs, leaves: evLeaves, holiday } = getEventsForDate(dateStr, branchFilter, dayOffs, leaves, holidays)
      const activeOffs   = evDayOffs.filter(d => d.status !== 'REJECTED')
      const activeLeaves = evLeaves.filter(l => l.status !== 'REJECTED')
      const offChips = activeOffs.map(d => {
        const short = d.nickname || d.name.split(' ')[0]
        return `<div class="chip off${d.status === 'PENDING' ? ' pending' : ''}">${short}</div>`
      }).join('')
      const leaveChips = activeLeaves.map(l => {
        const cfg   = getLeaveCfg(l)
        const short = l.nickname || l.name.split(' ')[0]
        return `<div class="chip" style="background:${cfg.light};color:${cfg.color};border-color:${cfg.color}">${short}</div>`
      }).join('')
      const holidayHtml = holiday ? `<div class="holiday">🎌 ${holiday.name}</div>` : ''
      return `<td class="${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}${holiday ? ' hol' : ''}">
        <div class="daynum">${day}</div>${holidayHtml}${offChips}${leaveChips}
      </td>`
    }

    const weeks: string[] = []
    for (let w = 0; w < totalCells / 7; w++) {
      const cells = Array.from({ length: 7 }, (_, c) => cellHtml(w * 7 + c - firstDow + 1)).join('')
      weeks.push(`<tr>${cells}</tr>`)
    }

    const legendItems = [
      ['#ea580c', 'หยุดประจำ'],
      ...Object.values(LEAVE_CFG).map(c => [c.color, c.label] as [string, string]),
    ]

    win.document.write(`<html><head><title>ปฏิทินรวม — ${fmtMonthTH(month)}</title>
      <style>
        @page { size: landscape; margin: 14mm; }
        /* เบราว์เซอร์ปิดพื้นหลังสีตอน print/Save as PDF โดย default (ประหยัดหมึก) —
           บังคับให้พิมพ์สีจริงตามที่เห็นบนจอเสมอ ไม่งั้น highlight หายหมด */
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
        body{font-family:'Sarabun',sans-serif;padding:16px;color:#1e293b}
        h1{font-size:20px;margin:0 0 2px}
        .sub{font-size:13px;color:#6b7280;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;table-layout:fixed}
        thead th{font-size:11px;color:#6b7280;font-weight:700;padding:4px 0;border-bottom:1px solid #e5e7eb}
        td{border:1px solid #e5e7eb;vertical-align:top;height:80px;padding:3px;font-size:9px;overflow:hidden}
        td.empty{background:#fafafa;border-color:#f3f4f6}
        td.sun .daynum{color:#dc2626}
        td.sat .daynum{color:#2563eb}
        td.hol{background:#fef2f2}
        .daynum{font-size:11px;font-weight:700;margin-bottom:2px}
        .holiday{font-size:8px;color:#dc2626;font-weight:700;margin-bottom:2px}
        .chip{font-size:8px;font-weight:700;line-height:1.5;padding:0 4px;border-radius:4px;border:1px solid;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chip.off{background:#FFF7ED;color:#c2410c;border-color:#ea580c}
        .chip.off.pending{border-style:dashed}
        .legend{display:flex;gap:14px;margin-top:14px;flex-wrap:wrap}
        .legend span{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#374151}
        .dot{width:9px;height:9px;border-radius:3px;display:inline-block}
      </style></head><body>
      <h1>ปฏิทินรวม — ${fmtMonthTH(month)}</h1>
      <div class="sub">${branchLabel}</div>
      <table>
        <thead><tr>${DAYS_SHORT.map(d => `<th>${d}</th>`).join('')}</tr></thead>
        <tbody>${weeks.join('')}</tbody>
      </table>
      <div class="legend">
        ${legendItems.map(([color, label]) => `<span><span class="dot" style="background:${color}"></span>${label}</span>`).join('')}
      </div>
      </body></html>`)
    win.document.close(); win.print()
  }

  // ── Export ตารางแยกกลุ่ม (Roster) — ก้อนตามกลุ่มสาขา x วันที่ 1-31 เหมือนชีท
  // Excel เดิมที่ user ใช้อยู่ (feedback 2026-08-27, ส่งภาพตัวอย่างมาให้ดู) —
  // ไม่ผูกกับ groupFilter/branchFilter บนจอตอนนี้ เพราะ export นี้ตั้งใจโชว์
  // "ทุกกลุ่ม" แยกก้อนเสมอไม่ว่าจอจะกรองอะไรอยู่ก็ตาม
  function buildRosterGroups(): { groupName: string; employees: ApiEmployeeFull[] }[] {
    const byGroup = new Map<string, ApiEmployeeFull[]>()
    const noGroup: ApiEmployeeFull[] = []
    for (const e of employeesFull) {
      const gid = employeeGroupId[e.id]
      if (!gid) { noGroup.push(e); continue }
      if (!byGroup.has(gid)) byGroup.set(gid, [])
      byGroup.get(gid)!.push(e)
    }
    const result = groups
      .filter(g => (byGroup.get(g.id)?.length ?? 0) > 0)
      .map(g => ({ groupName: g.name, employees: byGroup.get(g.id)! }))
    if (noGroup.length > 0) result.push({ groupName: 'ไม่มีกลุ่ม', employees: noGroup })
    return result
  }

  // สถานะของพนักงานคนหนึ่งในวันที่หนึ่ง — ไม่ผ่าน groupFilter/branchFilter (ดูทุกคนเสมอ)
  // สีแยกตามคน (ตั้งเองได้ ดู rosterColors ด้านบน) ไม่ใช่ตามประเภทเหมือนปฏิทินหลัก
  // — ใช้ label ข้อความแยกประเภท (หยุด/ป่วย/กิจ/...) แทน
  function rosterCellFor(employeeId: string, dateStr: string): { label: string; pending: boolean } | null {
    const off = dayOffsRaw.find(d => d.employee_id === employeeId && d.date === dateStr && d.status !== 'REJECTED')
    if (off) return { label: 'หยุด', pending: off.status === 'PENDING' }
    const leave = leavesRaw.find(l => l.employee_id === employeeId && l.start_date <= dateStr && l.end_date >= dateStr && l.status !== 'REJECTED')
    if (leave) { const cfg = getLeaveCfg(leave); return { label: cfg.label, pending: leave.status === 'PENDING' } }
    return null
  }

  // ไฟล์ .xlsx จริง (ไม่ใช่ CSV) เพราะต้องการ highlight สีพื้นหลังต่อช่องจริงๆ —
  // CSV ทำไม่ได้ (เป็นแค่ข้อความล้วน) ใช้ ExcelJS โหลดแบบ dynamic import กัน
  // บวมขนาดหน้าเว็บตอนโหลดปกติ (โหลดเฉพาะตอนกด export ตารางแยกกลุ่มจริงๆ)
  async function exportRosterExcel() {
    const ExcelJS = (await import('exceljs')).default
    const rosterGroups = buildRosterGroups()
    const orderedIds = rosterGroups.flatMap(g => g.employees.map(e => e.id))

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(fmtMonthTH(month).slice(0, 31))

    // กรอบบางๆ รอบทุกช่อง — ให้เห็นเป็นตารางชัดเจนเหมือนสเปรดชีตทั่วไป (ExcelJS
    // ไม่ใส่กรอบให้เองเป็น default ต่างจาก gridlines ที่โปรแกรมแสดงเฉยๆ ไม่ติดไปกับไฟล์)
    const THIN = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
    const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

    const fixedCols = ['ชื่อ', ...(rosterCols.code ? ['รหัส'] : []), ...(rosterCols.branch ? ['สาขา'] : [])]
    const totalCols = fixedCols.length + daysInMonth
    const headerRow = ws.addRow([...fixedCols, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)])
    headerRow.eachCell({ includeEmpty: true }, c => { c.font = { bold: true, color: { argb: 'FF6B7280' } }; c.alignment = { horizontal: 'center' }; c.border = CELL_BORDER })
    ws.getColumn(1).width = 22
    for (let i = 0; i < fixedCols.length - 1; i++) ws.getColumn(2 + i).width = 12
    for (let i = 0; i < daysInMonth; i++) ws.getColumn(fixedCols.length + 1 + i).width = 6

    for (const grp of rosterGroups) {
      const groupRow = ws.addRow([`${grp.groupName} (${grp.employees.length} คน)`])
      ws.mergeCells(groupRow.number, 1, groupRow.number, totalCols)
      groupRow.getCell(1).font = { bold: true, size: 12 }
      groupRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      groupRow.getCell(1).border = CELL_BORDER

      for (const e of grp.employees) {
        const color = colorForEmployee(e.id, orderedIds).replace('#', '').toUpperCase()
        const rowValues = [
          `${e.nickname || e.first_name} ${e.last_name}`,
          ...(rosterCols.code ? [e.employee_code ?? ''] : []),
          ...(rosterCols.branch ? [e.branch.name] : []),
        ]
        const row = ws.addRow(rowValues)
        row.getCell(1).font = { bold: true }
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `20${color}` } }

        for (let i = 0; i < daysInMonth; i++) {
          const cell = rosterCellFor(e.id, toDateStr(month, i + 1))
          const xlCell = row.getCell(fixedCols.length + 1 + i)
          xlCell.alignment = { horizontal: 'center' }
          if (cell) {
            xlCell.value = cell.label
            xlCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } }
            xlCell.font = { bold: !cell.pending, italic: cell.pending, color: { argb: 'FFFFFFFF' } }
          }
        }
        row.eachCell({ includeEmpty: true }, c => { c.border = CELL_BORDER })
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    a.download = `ตารางแยกกลุ่ม_${month}.xlsx`; a.click()
  }

  function exportRosterPdf() {
    const win = window.open('', '_blank'); if (!win) return
    const rosterGroups = buildRosterGroups()
    const orderedIds = rosterGroups.flatMap(g => g.employees.map(e => e.id))

    function dayHeaderCells(): string {
      return Array.from({ length: daysInMonth }, (_, i) => {
        const dow = (firstDow + i) % 7
        return `<th class="${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''}"><div class="dow">${DAYS_SHORT[dow]}</div>${i + 1}</th>`
      }).join('')
    }

    function groupSectionHtml(grp: { groupName: string; employees: ApiEmployeeFull[] }): string {
      const rows = grp.employees.map(e => {
        const empColor = colorForEmployee(e.id, orderedIds)
        const cells = Array.from({ length: daysInMonth }, (_, i) => {
          const cell = rosterCellFor(e.id, toDateStr(month, i + 1))
          if (!cell) return '<td></td>'
          return `<td class="mark${cell.pending ? ' pending' : ''}" style="background:${empColor};border-color:${empColor}">${cell.label}</td>`
        }).join('')
        const codeHtml   = rosterCols.code   && e.employee_code ? `<span class="code">${e.employee_code}</span>` : ''
        const branchHtml = rosterCols.branch ? `<div class="branch">${e.branch.name}</div>` : ''
        const nameLabel = `<span class="dot" style="background:${empColor}"></span>${e.nickname || e.first_name} ${codeHtml}`
        return `<tr><td class="name">${nameLabel}${branchHtml}</td>${cells}</tr>`
      }).join('')
      return `<h2>${grp.groupName} <span class="count">(${grp.employees.length} คน)</span></h2>
        <table>
          <thead><tr><th class="namecol">พนักงาน</th>${dayHeaderCells()}</tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }

    win.document.write(`<html><head><title>ตารางแยกกลุ่ม — ${fmtMonthTH(month)}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        /* เบราว์เซอร์ปิดพื้นหลังสีตอน print/Save as PDF โดย default (ประหยัดหมึก) —
           บังคับให้พิมพ์สีจริงตามที่เห็นบนจอเสมอ ไม่งั้น highlight หายหมด */
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
        body{font-family:'Sarabun',sans-serif;padding:16px;color:#1e293b}
        h1{font-size:20px;margin:0 0 2px}
        .sub{font-size:13px;color:#6b7280;margin:0 0 16px}
        h2{font-size:14px;margin:22px 0 8px;color:#111827}
        h2 .count{font-size:11px;font-weight:400;color:#9ca3af}
        table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px}
        th,td{border:1px solid #e5e7eb;font-size:9px;text-align:center;padding:3px 1px}
        th{color:#6b7280;font-weight:700;background:#f9fafb}
        th .dow{font-size:7.5px;color:#9ca3af;font-weight:400}
        th.sun{color:#dc2626} th.sat{color:#2563eb}
        .namecol,td.name{width:110px;text-align:left;padding-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        td.name{font-weight:700;font-size:10px}
        td.name .code{font-weight:400;color:#9ca3af;font-size:8px;margin-left:4px}
        td.name .branch{font-weight:400;color:#9ca3af;font-size:8px}
        td.mark{font-weight:700;border-width:1px;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,0.35)}
        td.mark.pending{border-style:dashed;font-style:italic;opacity:0.75}
        .legend{margin-top:16px;font-size:10px;color:#6b7280}
        .dot{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:4px;vertical-align:middle}
      </style></head><body>
      <h1>ตารางแยกกลุ่ม — ${fmtMonthTH(month)}</h1>
      <div class="sub">แยกตามกลุ่มสาขา — วันหยุดประจำ + วันลา ทุกคนไม่ว่าตัวกรองบนจอจะตั้งไว้ยังไง</div>
      ${rosterGroups.map(groupSectionHtml).join('')}
      <div class="legend">สีของแต่ละแถว = สีประจำตัวพนักงาน (ตั้งเองได้ก่อน export) — ข้อความในช่อง: "หยุด" = วันหยุดประจำ, อื่นๆ = ประเภทวันลา (เส้นประ = รออนุมัติ)</div>
      </body></html>`)
    win.document.close(); win.print()
  }

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
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flex: isMobile ? '1 1 auto' : 'none' }}>
          {groups.length > 1 && (
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer', flex: isMobile ? '1 1 auto' : 'none' }}
            >
              <option value="all">ทุกกลุ่ม</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer', flex: isMobile ? '1 1 auto' : 'none' }}
          >
            <option value="all">ทุกสาขา</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

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

        {/* Export */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={exportExcel} title="Export Excel (CSV)"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={exportPdf} title="Export PDF (Print)"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={14} /> PDF
          </button>
          <div style={{ width: 1, background: '#e5e7eb', margin: '2px 2px' }} />
          <button onClick={() => setShowRosterSettings(true)} title="ตั้งค่า + Export ตารางแยกกลุ่ม — เลือกคอลัมน์ / สีต่อคนเอง"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Table2 size={14} /> ตารางแยกกลุ่ม
          </button>
        </div>
      </div>

      {/* Calendar grid (always full width) */}
      <div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isMobile ? 2 : 4, marginBottom: isMobile ? 2 : 4 }}>
          {DAYS_SHORT.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>
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
                onDropItem={(payload, date) => {
                  if (payload.kind === 'dayoff') handleMoveDayOff(payload.id, date)
                  else handleMoveLeave(payload.id, date)
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Detail panel — popup ทั้งมือถือ (bottom sheet) และ desktop (modal กลางจอ) */}
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
                employees={employees}
                onMoveDayOff={handleMoveDayOff}
                onMoveLeave={handleMoveLeave}
                onDeleteDayOff={(id, label) => setDeleteTarget({ kind: 'dayoff', id, label })}
                onDeleteLeave={(id, label) => setDeleteTarget({ kind: 'leave', id, label })}
                onAddDayOff={employeeId => addDayOffMutation.mutate({ employeeId, date: selectedDate })}
                onAddLeave={(employeeId, leaveType) => addLeaveMutation.mutate({ employeeId, leaveType, date: selectedDate })}
              />
            </div>
          </>
        ) : (
          <>
            {/* Desktop: backdrop */}
            <div
              onClick={() => setSelectedDate(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            >
              {/* Modal panel — stopPropagation กันปิดตอนคลิกในกล่อง */}
              <div onClick={e => e.stopPropagation()}>
                <DayDetailPanel
                  date={selectedDate}
                  branchFilter={branchFilter}
                  onClose={() => setSelectedDate(null)}
                  dayOffs={dayOffs}
                  leaves={leaves}
                  holidays={holidays}
                  employees={employees}
                  onMoveDayOff={handleMoveDayOff}
                  onMoveLeave={handleMoveLeave}
                  onDeleteDayOff={(id, label) => setDeleteTarget({ kind: 'dayoff', id, label })}
                  onDeleteLeave={(id, label) => setDeleteTarget({ kind: 'leave', id, label })}
                  onAddDayOff={employeeId => addDayOffMutation.mutate({ employeeId, date: selectedDate })}
                  onAddLeave={(employeeId, leaveType) => addLeaveMutation.mutate({ employeeId, leaveType, date: selectedDate })}
                />
              </div>
            </div>
          </>
        )
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.kind === 'dayoff' ? 'ลบวันหยุดประจำ?' : 'ลบวันลา?'}
          message={`ลบรายการของ "${deleteTarget.label}" — ยกเลิกไม่ได้`}
          confirmLabel="ลบ"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Roster export settings — เลือกคอลัมน์ + สีต่อคน (manual) ก่อน export */}
      {showRosterSettings && (() => {
        const rosterGroups = buildRosterGroups()
        const orderedIds = rosterGroups.flatMap(g => g.employees.map(e => e.id))
        return (
          <div onClick={() => setShowRosterSettings(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, width: 480, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>ตั้งค่า Export ตารางแยกกลุ่ม</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtMonthTH(month)}</div>
                </div>
                <button onClick={() => setShowRosterSettings(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
              </div>

              <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* คอลัมน์ที่จะ export */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>คอลัมน์ที่จะ export (นอกจากชื่อ)</div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={rosterCols.code} onChange={e => setRosterCols(c => ({ ...c, code: e.target.checked }))} />
                      รหัสพนักงาน
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={rosterCols.branch} onChange={e => setRosterCols(c => ({ ...c, branch: e.target.checked }))} />
                      ชื่อสาขา
                    </label>
                  </div>
                </div>

                {/* สีต่อคน — ตั้งเองได้ (manual) จำไว้ในเครื่องนี้ */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 2 }}>สีประจำตัวแต่ละคน</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>คลิกวงกลมสีเพื่อเปลี่ยนเอง — ระบบจำไว้ในเครื่องนี้ ไม่ต้องเลือกใหม่ทุกครั้ง</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
                    {rosterGroups.map(grp => (
                      <div key={grp.groupName}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', marginBottom: 5 }}>{grp.groupName}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {grp.employees.map(e => {
                            const color = colorForEmployee(e.id, orderedIds)
                            return (
                              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                                <input type="color" value={color} onChange={ev => setEmployeeColor(e.id, ev.target.value)}
                                  style={{ width: 22, height: 22, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: '#374151' }}>{e.nickname || `${e.first_name} ${e.last_name}`}</span>
                                {e.employee_code && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.employee_code}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {rosterGroups.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>ยังไม่มีพนักงานที่อยู่ในกลุ่ม</div>}
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={exportRosterExcel} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
                <button onClick={exportRosterPdf} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Printer size={14} /> Export PDF
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Legend */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 16, marginTop: 16, flexWrap: 'wrap', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#fb923c,#ea580c)', flexShrink: 0 }} />
          หยุดประจำ (อนุมัติ)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', border: '2px dashed #f59e0b', flexShrink: 0 }} />
          หยุดประจำ (รอ)
        </div>
        {Object.entries(LEAVE_CFG).map(([k, cfg]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            {cfg.label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fef2f2', border: '1px solid #fecaca', flexShrink: 0 }} />
          วันหยุดนักขัตฤกษ์
        </div>
      </div>
    </div>
  )
}
