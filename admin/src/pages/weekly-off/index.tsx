// admin/src/pages/weekly-off/index.tsx
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Trash2, Plus, CalendarDays, ChevronLeft, ChevronRight, Unlock, Settings2, Ban, Clock, Circle, FileText, ClipboardList, Download, AlertTriangle, Repeat, Gift, CalendarClock, FileSpreadsheet, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useIsReadOnly } from '../../stores/authStore'
import { useFocusHighlight } from '../../hooks/useFocusHighlight'
import Pagination from '../../components/ui/Pagination'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { deptName } from '../../lib/format'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter, useOrgFilterOptions } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue, EmployeeOrgInfo } from '../../components/shared/OrgFilterBar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  employee_code: string; branch: { id: string; name: string }
}
interface ApiEmployeeFull {
  id: string; branch_id?: string | null; branch?: { id: string; group_id?: string | null } | null
  position_id?: string | null
}
interface ApiPosition {
  id: string; department?: { id: string; division?: { group_id?: string | null } | null } | null
}
interface WeeklyOffRequest {
  id: string; employee_id: string; week_start: string; day_of_week: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; reject_note: string | null
  employee: ApiEmployee
  has_conflict?: boolean   // มีพนักงานตำแหน่งเดียวกันจองวันเดียวกันไว้แล้ว — ให้แอดมินตัดสินใจ
}
interface ApiBranch { id: string; name: string }
interface WorkedOffAlert {
  id: string; date: string
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } | null }
}
interface WeeklyOffPeriod {
  id: string | null; branch_id: string; month: string
  is_open: boolean; deadline: string | null; note: string | null
  branch: { id: string; name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS_TH     = ['อา','จ','อ','พ','พฤ','ศ','ส']
const MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function addMonths(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtYM(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_FULL[m - 1]} ${y + 543}`
}
function fmtDate(iso: string) {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`
}
// ช่วงวันที่ของเดือนนั้น (1 ถึงวันสุดท้าย) — "เปิดจอง" ตอนนี้เปิดทั้งเดือนเสมอ ไม่มีเปิดเฉพาะบางสัปดาห์
function monthRangeLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${fmtDate(`${ym}-01`)} – ${fmtDate(`${ym}-${String(lastDay).padStart(2, '0')}`)}`
}

// แปลง week_start + day_of_week → วันที่จริง
// ถ้า week_start ตรงกับ day_of_week (monthly-off) ใช้ตรงๆ
// ถ้าไม่ตรง (weekly-off format) offset จาก Monday
function resolveDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  if (d.getUTCDay() === dayOfWeek) return weekStart.slice(0, 10)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

// สวิตช์เปิด/ปิด (เดิมเป็น 2 ปุ่ม "เปิดจอง"/"ปิดจอง" สลับกันตามสถานะ ใช้ไอคอน
// กุญแจ Lock/Unlock — feedback 2026-09-15: "เป็นปุ่ม Toggle เปิดปิดเอา แทนไอคอน
// กุญแจ") กดครั้งเดียวสลับสถานะได้เลย ไม่ต้องหาว่าปุ่มไหนคือปุ่มที่ต้องกด
function ToggleSwitch({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled} role="switch" aria-checked={on}
      style={{
        width: 42, height: 23, borderRadius: 99, border: 'none', padding: 0, flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
        background: on ? '#16a34a' : '#d1d5db', opacity: disabled ? 0.6 : 1,
        transition: 'background 0.2s',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 22 : 3, width: 17, height: 17, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s',
      }} />
    </button>
  )
}

function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function fmtDateRange(start: string, end: string): string {
  if (start === end) return fmtDate(start)
  const d1 = new Date(start + 'T00:00:00'), d2 = new Date(end + 'T00:00:00')
  if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()) {
    return `${d1.getDate()} – ${d2.getDate()} ${MONTHS_FULL[d1.getMonth()]} ${d1.getFullYear() + 543}`
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

interface OffBlock {
  ids: string[]; items: WeeklyOffRequest[]
  startDate: string; endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  hasConflict: boolean
  rejectNote: string | null
}
// รวมวันที่ต่อเนื่องกัน (สถานะเดียวกัน) เป็นแถวเดียว — feedback 2026-09-15: "ถ้ามี
// ขอหยุดมากกว่า 1 วัน ให้นับเป็นแถวเดียว เช่น 2-4 พ.ย. ไม่ใช่ 2 พ.ย. 3 พ.ย. 4 พ.ย."
// (ต้องรับ items ที่ sort ตามวันที่มาก่อนแล้ว)
function groupConsecutiveDays(items: WeeklyOffRequest[]): OffBlock[] {
  const blocks: OffBlock[] = []
  for (const r of items) {
    const date = resolveDate(r.week_start, r.day_of_week)
    const last = blocks[blocks.length - 1]
    if (last && last.status === r.status && addDaysStr(last.endDate, 1) === date) {
      last.ids.push(r.id); last.items.push(r); last.endDate = date
      last.hasConflict = last.hasConflict || !!r.has_conflict
      if (!last.rejectNote) last.rejectNote = r.reject_note
    } else {
      blocks.push({ ids: [r.id], items: [r], startDate: date, endDate: date, status: r.status, hasConflict: !!r.has_conflict, rejectNote: r.reject_note })
    }
  }
  return blocks
}

const STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ปฏิเสธ',   color: '#dc2626', bg: '#fee2e2' },
}

const WEEKLY_OFF_MODE_LABEL: Record<'WEEKLY' | 'MONTHLY_BATCH', string> = {
  WEEKLY:        'รายสัปดาห์ (จองทีละสัปดาห์)',
  MONTHLY_BATCH: 'รายเดือน (ต้องจองครบทุกสัปดาห์)',
}

// ── สีต่อคน + localStorage key เดียวกับ "ตารางแยกกลุ่ม" ของหน้าปฏิทินรวม
// (leave/TeamCalendarTab.tsx) — ตั้งใจใช้ key เดียวกันเพื่อให้พนักงานคนเดียวกัน
// ได้สีเดียวกันไม่ว่า export จากหน้าไหน (feedback 2026-09-14: export ให้เหมือน
// ปฏิทินรวม แยกกลุ่ม + แบ่งสี)
const ROSTER_COLOR_PALETTE = [
  '#EC6F44', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899',
  '#F59E0B', '#06B6D4', '#EF4444', '#84CC16', '#6366F1',
  '#14B8A6', '#D946EF',
]
const ROSTER_COLOR_KEY = 'tl_roster_colors'
function loadRosterColors(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(ROSTER_COLOR_KEY) ?? '{}') } catch { return {} }
}

// แผนก — สำเนาจาก employee/index.tsx (ตามธรรมเนียมของโปรเจกต์นี้ที่ define ค่าคงที่ต่อไฟล์)
const DEPARTMENTS = [
  '01 ผู้บริหาร',
  '02 Office',
  '03 พนักงานขาย',
  '04 พนักงานขนส่ง',
]

// ─── Mini calendar picker ──────────────────────────────────────────────────────
function DatePicker({ month, value, onChange, disabledDates = [] }: {
  month: string; value: string; onChange: (d: string) => void; disabledDates?: string[]
}) {
  const [ym, setYm] = useState(value ? value.slice(0, 7) : month)
  const [y, m] = ym.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDow    = new Date(y, m - 1, 1).getDay()
  const totalCells  = Math.ceil((daysInMonth + firstDow) / 7) * 7

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, minWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => setYm(addMonths(ym, -1))} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 700 }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{fmtYM(ym)}</span>
        <button onClick={() => setYm(addMonths(ym, 1))}  style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 700 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_TH.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstDow + 1
          if (day < 1 || day > daysInMonth) return <div key={i} />
          const dateStr    = `${ym}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === value
          const isDisabled = disabledDates.includes(dateStr)
          return (
            <button key={i} onClick={() => !isDisabled && onChange(dateStr)} style={{
              padding: '5px 2px', borderRadius: 6, border: 'none', cursor: isDisabled ? 'not-allowed' : 'pointer',
              background: isSelected ? '#EC6F44' : 'transparent',
              color: isSelected ? '#fff' : isDisabled ? '#d1d5db' : '#374151',
              fontSize: '0.78rem', fontWeight: isSelected ? 700 : 400,
            }}>{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Bulk: ตั้งค่าโหมดจองวันหยุดทั้งแผนก ───────────────────────────────────────
function BulkModePanel() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [bulkDept, setBulkDept] = useState('')
  const [bulkMode, setBulkMode] = useState<'WEEKLY' | 'MONTHLY_BATCH'>('MONTHLY_BATCH')
  const [confirmAll, setConfirmAll] = useState(false)

  const bulkModeMutation = useMutation({
    mutationFn: () => api.patch('/api/v1/admin/employees/bulk-weekly-off-mode', { department: bulkDept, mode: bulkMode }).then(r => r.data.data),
    onSuccess: (data: { count: number }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', `ตั้งค่าโหมดจองวันหยุดให้ ${data.count} คนสำเร็จ`)
      setBulkDept('')
    },
    onError: () => showToast('error', 'ตั้งค่าไม่สำเร็จ'),
  })

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' as const, width: 'auto', flex: isMobile ? '1 1 100%' : 'none', minWidth: 160 }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}><Settings2 size={14} /> ตั้งค่าโหมดจองวันหยุดทั้งแผนก:</span>
      <select value={bulkDept} onChange={e => setBulkDept(e.target.value)} style={selectStyle}>
        <option value="">— เลือกแผนก —</option>
        <option value="ALL">— ทุกแผนก (ทั้งบริษัท) —</option>
        {DEPARTMENTS.map(d => <option key={d} value={d}>{deptName(d)}</option>)}
      </select>
      <select value={bulkMode} onChange={e => setBulkMode(e.target.value as any)} style={{ ...selectStyle, minWidth: 200 }}>
        <option value="MONTHLY_BATCH">{WEEKLY_OFF_MODE_LABEL.MONTHLY_BATCH}</option>
        <option value="WEEKLY">{WEEKLY_OFF_MODE_LABEL.WEEKLY}</option>
      </select>
      <button onClick={() => bulkDept === 'ALL' ? setConfirmAll(true) : bulkModeMutation.mutate()}
        disabled={!bulkDept || bulkModeMutation.isPending}
        style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: !bulkDept ? '#d1d5db' : bulkDept === 'ALL' ? '#dc2626' : '#374151', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: !bulkDept ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
        {bulkModeMutation.isPending ? 'กำลังบันทึก...' : bulkDept === 'ALL' ? 'ใช้กับพนักงานทั้งหมด' : 'ใช้กับทั้งแผนกนี้'}
      </button>

      {confirmAll && (
        <ConfirmDialog
          variant="warning"
          title="ตั้งค่าให้พนักงานทุกคนในบริษัท?"
          message={`โหมดจองวันหยุดของพนักงานทุกแผนกจะถูกเปลี่ยนเป็น "${WEEKLY_OFF_MODE_LABEL[bulkMode]}"`}
          confirmLabel="ใช้กับทั้งบริษัท"
          onConfirm={() => { setConfirmAll(false); bulkModeMutation.mutate() }}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </div>
  )
}

// ─── PeriodManager component ──────────────────────────────────────────────────
function PeriodManager({ month, requests, onApprove, onReject }: {
  month: string; requests: WeeklyOffRequest[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [periodView, setPeriodView] = useState<'card' | 'table'>('card')
  const [editId, setEditId] = useState<string | null>(null)
  const [editDeadline, setEditDeadline] = useState('')
  const [editNote, setEditNote] = useState('')
  const [viewBookingsBranch, setViewBookingsBranch] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  useEffect(() => { setSelectedIds(new Set()) }, [viewBookingsBranch]) // เคลียร์ที่เลือกไว้ทุกครั้งที่เปิด modal สาขาใหม่

  const { data: periods = [], isLoading } = useQuery<WeeklyOffPeriod[]>({
    queryKey: ['admin', 'weekly-off-periods', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off/periods', { params: { month } }).then((r: any) => r.data.data),
  })

  // อนุมัติหลายรายการพร้อมกัน (ทั้งหมด/เฉพาะที่เลือกใน modal ดูรายการจองของสาขา) — ยิง
  // per-item endpoint เดิมพร้อมกันแทนการเพิ่ม endpoint bulk ใหม่ (จำนวนต่อสาขาไม่เยอะ)
  const approveManyMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.post(`/api/v1/admin/weekly-off/${id}/approve`))),
    onSuccess: (_data, ids) => {
      qc.invalidateQueries({ queryKey: ['admin', 'weekly-off', month] })
      showToast('success', `อนุมัติ ${ids.length} รายการสำเร็จ`)
      setSelectedIds(new Set())
    },
    onError: () => showToast('error', 'อนุมัติบางรายการไม่สำเร็จ — เช็คสถานะแล้วลองใหม่'),
  })

  const openMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/weekly-off/periods', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weekly-off-periods', month] }); showToast('success', 'เปิดการจองแล้ว') },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })
  const closeMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/weekly-off/periods/close', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weekly-off-periods', month] }); showToast('success', 'ปิดการจองแล้ว') },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.patch(`/api/v1/admin/weekly-off/periods/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'weekly-off-periods', month] }); showToast('success', 'บันทึกแล้ว'); setEditId(null) },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
  if (periods.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่มีสาขา</div>

  return (
    <div>
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setPeriodView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: periodView === v ? 700 : 500, background: periodView === v ? '#fff' : 'transparent', color: periodView === v ? '#EC6F44' : 'var(--text-muted)', boxShadow: periodView === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(isMobile || periodView === 'card') && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {periods.map(p => {
        const isEditing = editId === p.branch_id
        const deadlinePast = p.deadline ? new Date() > new Date(p.deadline) : false
        const effectiveOpen = p.is_open && !deadlinePast
        const bookings = requests
          .filter(r => r.employee.branch.id === p.branch_id && resolveDate(r.week_start, r.day_of_week).slice(0, 7) === p.month)
          .sort((a, b) => resolveDate(a.week_start, a.day_of_week).localeCompare(resolveDate(b.week_start, b.day_of_week)))
        const pendingBookings = bookings.filter(b => b.status === 'PENDING').length

        return (
          <div key={p.branch_id} style={{
            background: '#fff', borderRadius: 14,
            border: `2px solid ${effectiveOpen ? '#86efac' : '#e5e7eb'}`,
            padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.branch.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  <CalendarDays size={11} /> {monthRangeLabel(p.month)}
                </div>
                {p.deadline && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: deadlinePast ? '#dc2626' : 'var(--text-muted)', marginTop: 2 }}>
                    {deadlinePast ? <><Ban size={11} /> หมดเวลาแล้ว</> : <><Clock size={11} /> deadline: {fmtDate(p.deadline.slice(0, 10))}</>}
                  </div>
                )}
              </div>
              {/* Status badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                background: effectiveOpen ? '#dcfce7' : '#f3f4f6',
                color: effectiveOpen ? '#16a34a' : 'var(--text-muted)',
              }}>
                <Circle size={8} fill={effectiveOpen ? '#16a34a' : '#9ca3af'} stroke="none" />
                {effectiveOpen ? 'เปิดจอง' : 'ปิดจอง'}
              </span>
            </div>

            {/* Note */}
            {p.note && !isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 7, padding: '6px 10px' }}>
                <FileText size={12} /> {p.note}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Deadline (ไม่บังคับ)</label>
                  <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.82rem', marginTop: 3, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  {editDeadline && <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 3 }}>{fmtDate(editDeadline)}</span>}
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>หมายเหตุถึงพนักงาน</label>
                  <input value={editNote} onChange={e => setEditNote(e.target.value)}
                    placeholder="เช่น กรุณาจองภายใน 20 มิ.ย."
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.82rem', marginTop: 3, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => {
                    if (p.id) {
                      updateMutation.mutate({ id: p.id, data: { deadline: editDeadline || null, note: editNote || null } })
                    } else {
                      openMutation.mutate({ branch_id: p.branch_id, month, deadline: editDeadline || null, note: editNote || null })
                      setEditId(null)
                    }
                  }} style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    บันทึก
                  </button>
                  <button onClick={() => setEditId(null)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fafafa' }}>
                  <ToggleSwitch on={effectiveOpen}
                    disabled={openMutation.isPending || closeMutation.isPending}
                    onChange={() => effectiveOpen
                      ? closeMutation.mutate({ branch_id: p.branch_id, month })
                      : openMutation.mutate({ branch_id: p.branch_id, month })} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: effectiveOpen ? '#16a34a' : 'var(--text-muted)' }}>
                    {effectiveOpen ? 'เปิดรับจอง' : 'ปิดรับจอง'}
                  </span>
                </div>
                <button onClick={() => {
                  setEditId(p.branch_id)
                  setEditDeadline(p.deadline ? p.deadline.slice(0, 10) : '')
                  setEditNote(p.note ?? '')
                }} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <Settings2 size={13} />
                </button>
              </div>
            )}

            {/* ดูรายการจอง */}
            {!isEditing && bookings.length > 0 && (
              <button onClick={() => setViewBookingsBranch(p.branch_id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                <CalendarDays size={13} />
                ดูรายการจอง ({bookings.length}){pendingBookings > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', borderRadius: 99, padding: '1px 7px' }}>{pendingBookings} รอ</span>}
              </button>
            )}
          </div>
        )
      })}
      </div>
      )}

      {/* Table view (desktop only) */}
      {!isMobile && periodView === 'table' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['สาขา', 'สถานะ', 'Deadline', 'หมายเหตุ', 'การจอง', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, idx) => {
                const deadlinePast = p.deadline ? new Date() > new Date(p.deadline) : false
                const effectiveOpen = p.is_open && !deadlinePast
                const bookings = requests
                  .filter(r => r.employee.branch.id === p.branch_id && resolveDate(r.week_start, r.day_of_week).slice(0, 7) === p.month)
                const pendingBookings = bookings.filter(b => b.status === 'PENDING').length
                return (
                  <tr key={p.branch_id} style={{ borderBottom: idx < periods.length - 1 ? '1px solid #E6ECF4' : 'none' }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', fontWeight: 700, color: '#111827' }}>{p.branch.name}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ToggleSwitch on={effectiveOpen}
                          disabled={openMutation.isPending || closeMutation.isPending}
                          onChange={() => effectiveOpen
                            ? closeMutation.mutate({ branch_id: p.branch_id, month })
                            : openMutation.mutate({ branch_id: p.branch_id, month })} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: effectiveOpen ? '#16a34a' : 'var(--text-muted)' }}>
                          {effectiveOpen ? 'เปิดรับจอง' : 'ปิดรับจอง'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: deadlinePast ? '#dc2626' : '#64748b' }}>
                      {p.deadline ? (deadlinePast ? 'หมดเวลาแล้ว' : fmtDate(p.deadline.slice(0, 10))) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b' }}>{p.note || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {bookings.length === 0 ? <span style={{ color: '#cbd5e1' }}>—</span> : (
                        <button onClick={() => setViewBookingsBranch(p.branch_id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#EC6F44', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'inherit' }}>
                          {bookings.length} รายการ
                          {pendingBookings > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', borderRadius: 99, padding: '1px 7px' }}>{pendingBookings} รอ</span>}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button onClick={() => {
                        setEditId(p.branch_id)
                        setEditDeadline(p.deadline ? p.deadline.slice(0, 10) : '')
                        setEditNote(p.note ?? '')
                      }} title="ตั้งค่า"
                        style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Settings2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* แก้ deadline/note จาก table view — ใช้ modal เดียวกับปุ่มตั้งค่าในการ์ด */}
      {!isMobile && periodView === 'table' && editId && (() => {
        const p = periods.find(pp => pp.branch_id === editId)
        if (!p) return null
        return (
          <div onClick={() => setEditId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, width: 340, maxWidth: '100%', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.branch.name}</div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Deadline (ไม่บังคับ)</label>
                <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.82rem', marginTop: 3, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                {editDeadline && <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 3 }}>{fmtDate(editDeadline)}</span>}
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>หมายเหตุถึงพนักงาน</label>
                <input value={editNote} onChange={e => setEditNote(e.target.value)}
                  placeholder="เช่น กรุณาจองภายใน 20 มิ.ย."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.82rem', marginTop: 3, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => {
                  if (p.id) {
                    updateMutation.mutate({ id: p.id, data: { deadline: editDeadline || null, note: editNote || null } })
                  } else {
                    openMutation.mutate({ branch_id: p.branch_id, month, deadline: editDeadline || null, note: editNote || null })
                    setEditId(null)
                  }
                }} style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                  บันทึก
                </button>
                <button onClick={() => setEditId(null)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Bookings modal */}
      {viewBookingsBranch && (() => {
        const p = periods.find(pp => pp.branch_id === viewBookingsBranch)
        const bookings = requests
          .filter(r => r.employee.branch.id === viewBookingsBranch && resolveDate(r.week_start, r.day_of_week).slice(0, 7) === month)
          .sort((a, b) => resolveDate(a.week_start, a.day_of_week).localeCompare(resolveDate(b.week_start, b.day_of_week)))
        const pendingIds = bookings.filter(b => b.status === 'PENDING').map(b => b.id)
        const selectedPendingCount = pendingIds.filter(id => selectedIds.has(id)).length
        const toggleSelect = (id: string) => setSelectedIds(prev => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id); else next.add(id)
          return next
        })
        return (
          <div onClick={() => setViewBookingsBranch(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 14, width: 420, maxWidth: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #E6ECF4', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p?.branch.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtYM(month)} · {bookings.length} รายการ</div>
                  </div>
                  <button onClick={() => setViewBookingsBranch(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
                {!isReadOnly && pendingIds.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => approveManyMutation.mutate(pendingIds)} disabled={approveManyMutation.isPending}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Check size={13} /> อนุมัติทั้งหมด ({pendingIds.length})
                    </button>
                    <button onClick={() => approveManyMutation.mutate([...selectedIds])} disabled={approveManyMutation.isPending || selectedPendingCount === 0}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: selectedPendingCount > 0 ? '#FEF8F6' : '#f9fafb', color: selectedPendingCount > 0 ? '#EC6F44' : '#9ca3af', fontSize: '0.76rem', fontWeight: 700, cursor: selectedPendingCount > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Check size={13} /> อนุมัติที่เลือก ({selectedPendingCount})
                    </button>
                  </div>
                )}
              </div>
              <div style={{ overflowY: 'auto', padding: '8px 10px' }}>
                {bookings.map(b => {
                  const sc = STATUS_CFG[b.status]
                  const isPending = b.status === 'PENDING'
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9 }}>
                      {isPending && !isReadOnly && (
                        <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} style={{ flexShrink: 0, width: 15, height: 15 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                          {b.employee.first_name} {b.employee.last_name}{b.employee.nickname ? ` (${b.employee.nickname})` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          {fmtDate(resolveDate(b.week_start, b.day_of_week))}
                        </div>
                      </div>
                      {isPending && !isReadOnly ? (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => onApprove(b.id)}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Check size={12} /> อนุมัติ
                          </button>
                          <button onClick={() => onReject(b.id)}
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const isReadOnly = useIsReadOnly()
  const now = new Date()
  // กระดิ่งแจ้งเตือนไลน์ส่ง ?month=&focus= มา — เดิมไม่อ่านเลย เข้าหน้านี้ทีไรเจอ
  // เดือนปัจจุบันเสมอ (ไม่ใช่เดือนที่พนักงานจองจริง) + แท็บในย่อยเริ่มที่ "เปิด/ปิด
  // การจอง" ไม่ใช่ "รายการคำขอ" เลยดูเหมือนกดแล้วไม่ไปไหน (feedback 2026-09-15:
  // "กดแล้วมันไม่ไปยังหน้านั้นเลย")
  const [sp] = useSearchParams()
  const focusMonth = sp.get('month')
  const { focusId, focusRef, rowHighlight } = useFocusHighlight()
  const [month, setMonth] = useState(focusMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [tab, setTab]     = useState<'requests' | 'periods' | 'overview' | 'exceptions'>(focusId ? 'requests' : 'periods')
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [statusFilter, setStatus] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('')
  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState({ employee_id: '', date: '' })
  const [forcePrompt, setForcePrompt] = useState<any>(null)  // body ที่รอ retry ด้วย force=true เมื่อ cascade ปิดสิทธิ์จอง หรือเกินโควต้า 10 วัน/เดือน
  const [forcePromptReason, setForcePromptReason] = useState<'BOOKING_DISABLED' | 'MONTHLY_CAP_EXCEEDED'>('BOOKING_DISABLED')
  const [showCalendar, setShowCalendar] = useState(false)
  const [rejectId, setRejectId]   = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  // ปฏิเสธหลายรายการพร้อมกัน (ต่อการ์ดพนักงาน) — เก็บ employee_id ไว้ด้วยเพื่อ
  // ปิดกล่อง note ของการ์ดที่ถูกต้องเท่านั้น (การ์ดอื่นกดปฏิเสธทั้งหมดพร้อมกันได้)
  const [bulkRejectFor, setBulkRejectFor] = useState<{ employeeId: string; ids: string[] } | null>(null)
  const [bulkRejectNote, setBulkRejectNote] = useState('')
  // ปฏิเสธทั้งช่วง — สำหรับแถวที่รวมวันต่อเนื่องกันแล้ว (groupConsecutiveDays) แยกจาก
  // bulkRejectFor ด้านบน (นั้นคือ "ปฏิเสธทั้งหมดของการ์ด" ระดับพนักงาน คนละปุ่มกัน)
  const [rangeRejectFor, setRangeRejectFor] = useState<string[] | null>(null)
  const [rangeRejectNote, setRangeRejectNote] = useState('')
  // แถว/บล็อกที่กำลังจะอนุมัติแบบมี conflict — เปิดตัวเลือก "หักจากไหน" ก่อนยืนยัน
  // (feedback 2026-09-15 ข้อ 1) เก็บเป็น id เดียว — บล็อกที่รวมหลายวันให้อนุมัติทีละวัน
  const [conflictApproveId, setConflictApproveId] = useState<string | null>(null)
  const [conflictDeductType, setConflictDeductType] = useState<string | null>(null)
  // วันที่ทั้งหมดของพนักงาน 1 คนรวมเป็นแถวชิปเดียว กดชิปไหนถึงกางแผงจัดการของ
  // วันนั้นออกมา (feedback 2026-09-15: "ตรงวันที่มันดูเยอะเกิน ทำให้เป็นแถวเดียว
  // ได้ไหม" — เดิมวันไม่ต่อเนื่องกันแยกเป็นคนละแถวเสมอ กินพื้นที่มาก)
  const [openBlockKey, setOpenBlockKey] = useState<string | null>(null)
  function toggleBlock(key: string) {
    setOpenBlockKey(k => k === key ? null : key)
    setRejectId(null); setConflictApproveId(null); setRangeRejectFor(null)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'weekly-off', month] })

  const { data: requests = [], isLoading } = useQuery<WeeklyOffRequest[]>({
    queryKey: ['admin', 'weekly-off', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month } }).then((r: any) => r.data.data),
  })
  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then((r: any) => r.data.data),
  })
  const { data: workedAlerts = [] } = useQuery<WorkedOffAlert[]>({
    queryKey: ['admin', 'weekly-off-worked-alerts'],
    queryFn: () => api.get('/api/v1/admin/weekly-off/worked-alerts').then((r: any) => r.data.data),
  })
  const { data: employeesFull = [] } = useQuery<ApiEmployeeFull[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then((r: any) => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then((r: any) => r.data.data),
  })
  const employeeOrgMap = useMemo(() => buildEmployeeOrgMap(employeesFull, positions), [employeesFull, positions])

  const filtered = useMemo(() => requests.filter(r => {
    if (!matchesOrgFilter(employeeOrgMap[r.employee_id], orgFilter)) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  }).sort((a, b) => {
    const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 }
    return order[a.status] - order[b.status] || a.week_start.localeCompare(b.week_start)
  }), [requests, orgFilter, employeeOrgMap, statusFilter])

  // จัดกลุ่มตามพนักงาน — คนเดียวจองหลายวันในเดือนนี้ให้รวมเป็นการ์ดเดียว
  // (feedback 2026-09-14: "อนุมัติวันลาที่จองมากกว่า 1 วันให้รวมเป็นการ์ดเดียว
  // อนุมัติ/ปฏิเสธได้ในครั้งเดียว") — เดิมตารางเก่า 1 แถว/1 วัน ทำให้คนที่จอง
  // 3 วันต้องกดอนุมัติ 3 ครั้งแยกกัน
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, { employee: WeeklyOffRequest['employee']; items: WeeklyOffRequest[] }>()
    for (const r of filtered) {
      if (!map.has(r.employee_id)) map.set(r.employee_id, { employee: r.employee, items: [] })
      map.get(r.employee_id)!.items.push(r)
    }
    const groups = [...map.values()].map(g => ({
      ...g,
      items: [...g.items].sort((a, b) => resolveDate(a.week_start, a.day_of_week).localeCompare(resolveDate(b.week_start, b.day_of_week))),
    }))
    // การ์ดที่มีรายการรอพิจารณาขึ้นก่อน แล้วเรียงชื่อ
    groups.sort((a, b) => {
      const aPending = a.items.some(i => i.status === 'PENDING') ? 0 : 1
      const bPending = b.items.some(i => i.status === 'PENDING') ? 0 : 1
      return aPending - bPending || a.employee.first_name.localeCompare(b.employee.first_name, 'th')
    })
    return groups
  }, [filtered])

  const [reqPage, setReqPage] = useState(1)
  const REQ_PAGE_SIZE = 10   // การ์ด/หน้า (คนละหน่วยกับตารางเดิมที่นับเป็นแถว)
  const reqTotalPages = Math.max(1, Math.ceil(groupedByEmployee.length / REQ_PAGE_SIZE))
  const reqPaginated = groupedByEmployee.slice((reqPage - 1) * REQ_PAGE_SIZE, reqPage * REQ_PAGE_SIZE)
  useEffect(() => { setReqPage(1) }, [orgFilter, statusFilter, month])
  useEffect(() => { if (reqPage > reqTotalPages) setReqPage(reqTotalPages) }, [reqTotalPages]) // eslint-disable-line react-hooks/exhaustive-deps

  // กระดิ่งแจ้งเตือนส่ง ?focus=<requestId> มา — หา block/การ์ดที่มีรายการนั้น แล้ว
  // เปิดหน้า+กางชิปให้อัตโนมัติ ไม่งั้นต้องไล่หาเองทีละหน้า/ทีละชิป
  useEffect(() => {
    if (!focusId) return
    const idx = groupedByEmployee.findIndex(g => g.items.some(i => i.id === focusId))
    if (idx === -1) return
    setReqPage(Math.floor(idx / REQ_PAGE_SIZE) + 1)
    const block = groupConsecutiveDays(groupedByEmployee[idx].items).find(b => b.ids.includes(focusId))
    if (block) setOpenBlockKey(block.ids.join(','))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, groupedByEmployee])

  const summary = useMemo(() => ({
    pending:  requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests])

  // วันที่ที่จองแล้ว (disable ใน calendar)
  const bookedDates = useMemo(() =>
    requests.filter(r => r.status !== 'REJECTED' && addForm.employee_id === r.employee_id)
      .map(r => resolveDate(r.week_start, r.day_of_week)),
    [requests, addForm.employee_id]
  )

  const approveMutation = useMutation({
    mutationFn: ({ id, deductType }: { id: string; deductType?: string | null }) =>
      api.post(`/api/v1/admin/weekly-off/${id}/approve`, { conflict_deduct_type: deductType || undefined }),
    onSuccess: () => { invalidate(); showToast('success', 'อนุมัติสำเร็จ'); setConflictApproveId(null); setConflictDeductType(null) },
    onError:   () => showToast('error', 'อนุมัติไม่สำเร็จ'),
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.post(`/api/v1/admin/weekly-off/${id}/reject`, { reject_note: note || undefined }),
    onSuccess: () => { invalidate(); showToast('success', 'ปฏิเสธแล้ว'); setRejectId(null); setRejectNote('') },
    onError:   () => showToast('error', 'ไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/weekly-off/${id}`),
    onSuccess: () => { invalidate(); showToast('success', 'ลบแล้ว') },
    onError:   () => showToast('error', 'ลบไม่สำเร็จ'),
  })
  const addMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/weekly-off', body),
    onSuccess: () => {
      invalidate(); showToast('success', 'เพิ่มวันหยุดสำเร็จ')
      setAddForm({ employee_id: '', date: '' }); setShowAdd(false); setShowCalendar(false)
    },
    onError: (err: any, body: any) => {
      const code = err.response?.data?.error?.code
      if (code === 'BOOKING_DISABLED' || code === 'MONTHLY_CAP_EXCEEDED') {
        setForcePromptReason(code); setForcePrompt({ ...body, force: true }); return
      }
      showToast('error', code === 'ALREADY_REQUESTED' ? 'พนักงานนี้มีวันหยุดในสัปดาห์นี้แล้ว' : 'เพิ่มไม่สำเร็จ')
    },
  })
  const approveAllMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/weekly-off/approve-all', { month }),
    onSuccess: (res: any) => {
      invalidate()
      showToast('success', `อนุมัติ ${res.data?.data?.count ?? ''} รายการสำเร็จ`)
    },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })
  // อนุมัติ/ปฏิเสธหลายรายการพร้อมกัน — ใช้กับปุ่ม "อนุมัติทั้งหมด/ปฏิเสธทั้งหมด" ต่อ
  // การ์ดพนักงาน (feedback 2026-09-14: พนักงานคนเดียวจองหลายวัน อยากอนุมัติ/ปฏิเสธ
  // ทีเดียวจากการ์ดเดียว ไม่ต้องกดทีละวัน) — ยิง per-item endpoint เดิมพร้อมกันผ่าน
  // Promise.all แทนเพิ่ม endpoint bulk ใหม่ (pattern เดียวกับ PeriodManager)
  const approveManyMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.post(`/api/v1/admin/weekly-off/${id}/approve`))),
    onSuccess: (_data, ids) => { invalidate(); showToast('success', `อนุมัติ ${ids.length} รายการสำเร็จ`) },
    onError:   () => showToast('error', 'อนุมัติบางรายการไม่สำเร็จ — เช็คสถานะแล้วลองใหม่'),
  })
  const rejectManyMutation = useMutation({
    mutationFn: ({ ids, note }: { ids: string[]; note: string }) =>
      Promise.all(ids.map(id => api.post(`/api/v1/admin/weekly-off/${id}/reject`, { reject_note: note || undefined }))),
    onSuccess: (_data, { ids }) => {
      invalidate(); showToast('success', `ปฏิเสธ ${ids.length} รายการแล้ว`)
      setBulkRejectFor(null); setBulkRejectNote('')
      setRangeRejectFor(null); setRangeRejectNote('')
    },
    onError:   () => showToast('error', 'ปฏิเสธบางรายการไม่สำเร็จ — เช็คสถานะแล้วลองใหม่'),
  })
  // ลบหลายวันพร้อมกัน — ใช้กับแถวที่รวมวันต่อเนื่องกันแล้ว (groupConsecutiveDays)
  const deleteManyMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => api.delete(`/api/v1/admin/weekly-off/${id}`))),
    onSuccess: (_data, ids) => { invalidate(); showToast('success', `ลบ ${ids.length} วันแล้ว`) },
    onError:   () => showToast('error', 'ลบบางรายการไม่สำเร็จ — เช็คสถานะแล้วลองใหม่'),
  })

  function handleAdd() {
    if (!addForm.employee_id || !addForm.date) { showToast('error', 'กรุณาเลือกพนักงานและวันที่'); return }
    const d = new Date(addForm.date + 'T00:00:00Z')
    addMutation.mutate({ employee_id: addForm.employee_id, week_start: addForm.date, day_of_week: d.getUTCDay() })
  }

  const selectedEmp = employees.find(e => e.id === addForm.employee_id)

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px', flexShrink: 0 }}>
          <button onClick={() => setMonth(m => addMonths(m, -1))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={16} color="var(--text-muted)" />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: isMobile ? 100 : 130, textAlign: 'center' }}>{fmtYM(month)}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, flexWrap: 'wrap', gap: 2 }}>
          {([
            ['periods', Unlock, isMobile ? 'เปิด/ปิด' : 'เปิด/ปิดการจอง'],
            ['requests', ClipboardList, isMobile ? 'คำขอ' : 'รายการคำขอ'],
            ['overview', CalendarDays, 'ภาพรวม'],
            ['exceptions', AlertTriangle, isMobile ? 'พิเศษ' : 'แจ้งเตือน & สลับ'],
          ] as const).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: isMobile ? '6px 10px' : '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#EC6F44' : 'var(--text-muted)',
              fontWeight: tab === t ? 700 : 500,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
            }}>
              <Icon size={13} /> {label}
              {t === 'exceptions' && workedAlerts.length > 0 && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#fee2e2', color: '#dc2626' }}>{workedAlerts.length}</span>
              )}
            </button>
          ))}
        </div>

      </div>

      {/* Periods tab */}
      {tab === 'periods' && (
        <>
          <BulkModePanel />
          <PeriodManager month={month} requests={requests}
            onApprove={id => approveMutation.mutate({ id })}
            onReject={id => rejectMutation.mutate({ id, note: '' })}
          />
        </>
      )}

      {/* Requests tab content below */}
      {tab === 'requests' && <>

      {/* Actions */}
      {!isReadOnly && (
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {summary.pending > 0 && (
          <button onClick={() => approveAllMutation.mutate()} disabled={approveAllMutation.isPending}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> อนุมัติทั้งหมด ({summary.pending})
          </button>
        )}
        <button onClick={() => { setShowAdd(s => !s); setShowCalendar(false) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: showAdd ? 'var(--text-muted)' : '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> {showAdd ? 'ยกเลิก' : 'เพิ่มวันหยุด'}
        </button>
      </div>
      )}

      {/* KPI */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
          const cfg   = STATUS_CFG[s]
          const count = summary[s.toLowerCase() as keyof typeof summary]
          return (
            <button key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${statusFilter === s ? cfg.color : '#e5e7eb'}`, background: statusFilter === s ? cfg.bg : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: cfg.color }}>{count}</div>
              <div style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600 }}>{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16, maxWidth: 560 }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '0.95rem' }}>+ เพิ่มวันหยุดให้พนักงาน</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>พนักงาน *</label>
              <select value={addForm.employee_id}
                onChange={e => { setAddForm(f => ({ ...f, employee_id: e.target.value, date: '' })); setShowCalendar(false) }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit' }}>
                <option value="">— เลือกพนักงาน —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''} · {e.branch.name}</option>
                ))}
              </select>
            </div>

            {addForm.employee_id && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>วันที่หยุด *</label>
                <button onClick={() => setShowCalendar(c => !c)} style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem',
                  color: addForm.date ? '#111827' : 'var(--text-muted)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CalendarDays size={15} color="var(--text-muted)" />
                  {addForm.date
                    ? `${fmtDate(addForm.date)} (${DAYS_TH[new Date(addForm.date + 'T00:00:00').getDay()]})`
                    : 'เลือกวันที่'}
                </button>
                {showCalendar && (
                  <div style={{ marginTop: 6 }}>
                    <DatePicker month={month} value={addForm.date}
                      onChange={d => { setAddForm(f => ({ ...f, date: d })); setShowCalendar(false) }}
                      disabledDates={bookedDates} />
                  </div>
                )}
              </div>
            )}

            {addForm.date && selectedEmp && (
              <div style={{ background: '#FEF8F6', border: '1px solid #F8CCBE', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#EC6F44' }}>
                <strong>{selectedEmp.first_name} {selectedEmp.last_name}</strong> จะหยุด{' '}
                <strong>{fmtDate(addForm.date)} ({DAYS_TH[new Date(addForm.date + 'T00:00:00').getDay()]})</strong>
              </div>
            )}

            <button onClick={handleAdd} disabled={addMutation.isPending || !addForm.employee_id || !addForm.date}
              style={{ padding: '9px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', opacity: (!addForm.employee_id || !addForm.date) ? 0.5 : 1 }}>
              {addMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {forcePrompt && (
        <ConfirmDialog
          variant="warning"
          title={forcePromptReason === 'MONTHLY_CAP_EXCEEDED' ? 'เกินโควต้ารวม 10 วัน/เดือน' : 'สาขา/กลุ่มปิดสิทธิ์จองวันหยุด'}
          message={forcePromptReason === 'MONTHLY_CAP_EXCEEDED'
            ? 'รวมวันหยุดที่จอง + วันลาพักร้อนของพนักงานคนนี้เดือนนี้เกิน 10 วันแล้ว ยืนยันเพิ่มวันหยุดให้อยู่ดีหรือไม่? (ระบบจะบันทึกว่าคุณเป็นผู้ยืนยัน)'
            : 'พนักงานคนนี้อยู่ในสาขา/กลุ่มที่ปิดสิทธิ์จองวันหยุด ยืนยันเพิ่มวันหยุดให้อยู่ดีหรือไม่? (ระบบจะบันทึกว่าคุณเป็นผู้ยืนยัน)'}
          confirmLabel="ยืนยันเพิ่มให้"
          onConfirm={() => { const b = forcePrompt; setForcePrompt(null); addMutation.mutate(b) }}
          onCancel={() => setForcePrompt(null)}
        />
      )}

      {/* Org filter */}
      <div style={{ marginBottom: 12 }}>
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
      </div>

      {/* Cards — 1 การ์ด/พนักงาน รวมทุกวันที่จองในเดือนนี้ (feedback 2026-09-14) */}
      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่มีรายการวันหยุดในเดือนนี้</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reqPaginated.map(g => {
            const pendingIds = g.items.filter(i => i.status === 'PENDING').map(i => i.id)
            const isBulkRejecting = bulkRejectFor?.employeeId === g.employee.id
            return (
              <div key={g.employee.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {/* Card header — ชื่อพนักงาน + ปุ่ม bulk (เฉพาะเมื่อมีรอพิจารณา >1 วัน) */}
                <div style={{ padding: '12px 14px', background: '#FEF8F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                      {g.employee.first_name} {g.employee.last_name}{g.employee.nickname ? ` (${g.employee.nickname})` : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {g.employee.employee_code} · {g.employee.branch.name} · {g.items.length} วัน
                    </div>
                  </div>
                  {!isReadOnly && pendingIds.length > 1 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => approveManyMutation.mutate(pendingIds)} disabled={approveManyMutation.isPending}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} /> อนุมัติทั้งหมด ({pendingIds.length})
                      </button>
                      <button onClick={() => { setBulkRejectFor({ employeeId: g.employee.id, ids: pendingIds }); setBulkRejectNote('') }}
                        style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={12} /> ปฏิเสธทั้งหมด
                      </button>
                    </div>
                  )}
                </div>

                {/* Bulk reject note — ปฏิเสธทุกวันที่รอพิจารณาของการ์ดนี้พร้อมกัน */}
                {isBulkRejecting && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #fecaca' }}>
                    <input value={bulkRejectNote} onChange={e => setBulkRejectNote(e.target.value)}
                      placeholder={`หมายเหตุ — ใช้กับทั้ง ${bulkRejectFor!.ids.length} วัน (ไม่บังคับ)`} autoFocus
                      style={{ flex: 1, padding: '6px 9px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '12px', fontFamily: 'inherit' }}
                      onKeyDown={e => { if (e.key === 'Enter') rejectManyMutation.mutate({ ids: bulkRejectFor!.ids, note: bulkRejectNote }) }}
                    />
                    <button onClick={() => rejectManyMutation.mutate({ ids: bulkRejectFor!.ids, note: bulkRejectNote })} disabled={rejectManyMutation.isPending}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ยืนยันปฏิเสธ {bulkRejectFor!.ids.length} วัน
                    </button>
                    <button onClick={() => setBulkRejectFor(null)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                      ยกเลิก
                    </button>
                  </div>
                )}

                {/* วันทั้งหมดของพนักงานคนนี้รวมเป็นแถวชิปเดียว (กดชิปเพื่อกางแผง
                    จัดการของวันนั้น) — feedback 2026-09-15: "ตรงวันที่มันดูเยอะเกิน
                    ทำให้เป็นแถวเดียวได้ไหม" (เดิมวันไม่ต่อเนื่องกันแยกคนละแถวเสมอ
                    ต่อเนื่องกันถึงรวมเป็น range แบบ "2-4 พ.ย." ได้ — groupConsecutiveDays
                    ยังทำงานเหมือนเดิม แค่เปลี่ยนวิธีแสดงผลรวม) + ชิปที่ชนตำแหน่งเดียวกัน
                    ขึ้นไอคอนเตือนในตัวชิปเลย */}
                {(() => {
                  const blocks = groupConsecutiveDays(g.items)
                  const openBlock = blocks.find(b => b.ids.join(',') === openBlockKey)
                  return (
                    <>
                      <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {blocks.map(block => {
                          const key = block.ids.join(',')
                          const sc = STATUS_CFG[block.status]
                          const isRange = block.items.length > 1
                          const isOpen = openBlockKey === key
                          const isFocused = !!focusId && block.ids.includes(focusId)
                          return (
                            <button key={key} ref={isFocused ? (focusRef as any) : undefined} onClick={() => toggleBlock(key)}
                              title={block.hasConflict ? 'มีพนักงานตำแหน่งเดียวกันจองวันที่ทับซ้อนไว้แล้ว' : undefined}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 4px 10px', borderRadius: 99,
                                border: `1.5px solid ${block.hasConflict ? '#fca5a5' : (isOpen ? sc.color : sc.bg)}`,
                                background: isOpen ? sc.bg : '#fff', color: sc.color,
                                fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                ...(isFocused ? rowHighlight(focusId!) : {}),
                              }}>
                              {fmtDateRange(block.startDate, block.endDate)}
                              {isRange
                                ? <span style={{ fontWeight: 700 }}>({block.items.length}วัน)</span>
                                : <span style={{ opacity: 0.65, fontWeight: 500 }}>{DAYS_TH[block.items[0].day_of_week]}</span>}
                              {block.hasConflict && <AlertTriangle size={11} color="#dc2626" />}
                            </button>
                          )
                        })}
                      </div>

                      {openBlock && (() => {
                        const block = openBlock
                        const sc = STATUS_CFG[block.status]
                        const isRange = block.items.length > 1
                        const r = block.items[0] // ใช้เมื่อเป็นวันเดียว (isRange = false)
                        const isRowRejecting = rangeRejectFor?.join(',') === block.ids.join(',')
                        return (
                          <div style={{ padding: '10px 14px', borderTop: '1px dashed #e5e7eb', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                {fmtDateRange(block.startDate, block.endDate)}
                                {!isRange && (
                                  <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#f3f4f6', color: 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>{DAYS_TH[r.day_of_week]}</span>
                                )}
                                {isRange && (
                                  <span style={{ marginLeft: 6, fontSize: '0.7rem', background: '#FEF8F6', color: '#EC6F44', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>{block.items.length} วัน</span>
                                )}
                              </span>
                              {block.hasConflict && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fef2f2', color: '#dc2626', borderRadius: 5, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>
                                  <AlertTriangle size={10} /> ชนตำแหน่ง
                                </span>
                              )}
                              <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 600 }}>{sc.label}</span>
                            </div>
                            {block.status === 'REJECTED' && block.rejectNote && (
                              <div style={{ fontSize: '0.72rem', color: '#dc2626', flexBasis: '100%' }}>หมายเหตุ: {block.rejectNote}</div>
                            )}
                            {!isReadOnly && (
                              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                {block.status === 'PENDING' && <>
                                  <button onClick={() => {
                                    if (isRange) { approveManyMutation.mutate(block.ids); return }
                                    // มี conflict → เปิดตัวเลือกหักโควต้าก่อน ไม่อนุมัติทันที (feedback
                                    // 2026-09-15 ข้อ 1) — ไม่มี conflict อนุมัติตรงๆ เหมือนเดิม
                                    if (block.hasConflict) { setConflictApproveId(r.id); setConflictDeductType(null); return }
                                    approveMutation.mutate({ id: r.id })
                                  }}
                                    disabled={isRange ? approveManyMutation.isPending : approveMutation.isPending}
                                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                    <Check size={12} /> {isRange ? `อนุมัติทั้งหมด (${block.items.length})` : 'อนุมัติ'}
                                  </button>
                                  <button onClick={() => isRange ? (setRangeRejectFor(block.ids), setRangeRejectNote('')) : (setRejectId(r.id), setRejectNote(''))}
                                    style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                    <X size={12} /> ปฏิเสธ
                                  </button>
                                </>}
                                <button onClick={() => isRange ? deleteManyMutation.mutate(block.ids) : deleteMutation.mutate(r.id)}
                                  disabled={isRange ? deleteManyMutation.isPending : deleteMutation.isPending}
                                  style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                            {!isRange && conflictApproveId === r.id && (
                              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6, flexBasis: '100%', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '8px 10px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>ชนตำแหน่งเดียวกัน — เลือกว่าจะหัก 1 วันจากโควต้าไหน</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select value={conflictDeductType ?? ''} onChange={e => setConflictDeductType(e.target.value || null)}
                                    style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #fde68a', fontSize: '12px', fontFamily: 'inherit', background: '#fff' }}>
                                    <option value="">ไม่หัก (ค่าเริ่มต้น)</option>
                                    <option value="VACATION">พักร้อน</option>
                                    <option value="PERSONAL">ลากิจ</option>
                                    <option value="COMPENSATE">วันหยุดชดเชย</option>
                                  </select>
                                  <button onClick={() => approveMutation.mutate({ id: r.id, deductType: conflictDeductType })} disabled={approveMutation.isPending}
                                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    ยืนยันอนุมัติ
                                  </button>
                                  <button onClick={() => setConflictApproveId(null)}
                                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            )}
                            {!isRange && rejectId === r.id && (
                              <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexBasis: '100%' }}>
                                <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                                  placeholder="หมายเหตุ (ไม่บังคับ)" autoFocus
                                  style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '12px', fontFamily: 'inherit' }}
                                  onKeyDown={e => { if (e.key === 'Enter') rejectMutation.mutate({ id: r.id, note: rejectNote }) }}
                                />
                                <button onClick={() => rejectMutation.mutate({ id: r.id, note: rejectNote })} disabled={rejectMutation.isPending}
                                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                                  ยืนยัน
                                </button>
                                <button onClick={() => setRejectId(null)}
                                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                                  ยกเลิก
                                </button>
                              </div>
                            )}
                            {isRange && isRowRejecting && (
                              <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexBasis: '100%' }}>
                                <input value={rangeRejectNote} onChange={e => setRangeRejectNote(e.target.value)}
                                  placeholder={`หมายเหตุ — ใช้กับทั้ง ${block.items.length} วัน (ไม่บังคับ)`} autoFocus
                                  style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '12px', fontFamily: 'inherit' }}
                                  onKeyDown={e => { if (e.key === 'Enter') rejectManyMutation.mutate({ ids: block.ids, note: rangeRejectNote }) }}
                                />
                                <button onClick={() => rejectManyMutation.mutate({ ids: block.ids, note: rangeRejectNote })} disabled={rejectManyMutation.isPending}
                                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                                  ยืนยันปฏิเสธ {block.items.length} วัน
                                </button>
                                <button onClick={() => setRangeRejectFor(null)}
                                  style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                                  ยกเลิก
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      <Pagination page={reqPage} totalPages={reqTotalPages} onChange={setReqPage} totalItems={groupedByEmployee.length} itemLabel="คน" />
      </>}

      {/* ── ภาพรวม tab ─────────────────────────────────────────────────── */}
      {tab === 'overview' && <OverviewTab requests={requests} isLoading={isLoading} month={month} employeeOrgMap={employeeOrgMap} />}

      {/* ── แจ้งเตือน & สลับ tab ────────────────────────────────────────── */}
      {tab === 'exceptions' && <ExceptionsTab requests={requests} workedAlerts={workedAlerts} month={month} />}
    </div>
  )
}

// ─── แจ้งเตือน "เช็คอินวันที่จองไว้เอง" + สลับวันหยุดกัน 2 คน ──────────────────
function ExceptionsTab({ requests, workedAlerts, month }: {
  requests: WeeklyOffRequest[]; workedAlerts: WorkedOffAlert[]; month: string
}) {
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const qc = useQueryClient()
  const [resolveTarget, setResolveTarget] = useState<{ alert: WorkedOffAlert; action: 'RESCHEDULE' | 'COMPENSATE' } | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [swapAId, setSwapAId] = useState('')
  const [swapBId, setSwapBId] = useState('')

  const invalidateAlerts = () => qc.invalidateQueries({ queryKey: ['admin', 'weekly-off-worked-alerts'] })
  const invalidateOff = () => qc.invalidateQueries({ queryKey: ['admin', 'weekly-off', month] })

  const resolveMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'RESCHEDULE' | 'COMPENSATE'; note: string }) =>
      api.post(`/api/v1/admin/weekly-off/worked-alerts/${id}/resolve`, { action, note: note || undefined }),
    onSuccess: (_, { action }) => {
      invalidateAlerts()
      showToast('success', action === 'RESCHEDULE' ? 'ยกเลิกวันหยุดเดิมแล้ว พนักงานจองวันใหม่ได้' : 'ให้วันหยุดชดเชยเรียบร้อย')
      setResolveTarget(null); setResolveNote('')
    },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })

  const swapMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/weekly-off/swap', { employee_a_off_id: swapAId, employee_b_off_id: swapBId }),
    onSuccess: () => {
      invalidateOff()
      showToast('success', 'สลับวันหยุดสำเร็จ')
      setSwapAId(''); setSwapBId('')
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      showToast('error', code === 'CONFLICT' ? 'มีฝั่งใดฝั่งหนึ่งจองวันหยุดสัปดาห์นั้นไว้แล้ว' : 'สลับไม่สำเร็จ')
    },
  })

  // เฉพาะรายการที่ยังมีสิทธิ์เอาไปสลับได้ (ไม่เอาที่ถูกปฏิเสธไปแล้ว)
  const swappable = useMemo(() =>
    requests.filter(r => r.status !== 'REJECTED').sort((a, b) => resolveDate(a.week_start, a.day_of_week).localeCompare(resolveDate(b.week_start, b.day_of_week))),
    [requests])
  const offA = swappable.find(r => r.id === swapAId)
  const offB = swappable.find(r => r.id === swapBId)
  const empName = (e: { first_name: string; last_name: string; nickname: string | null }) => `${e.first_name} ${e.last_name}${e.nickname ? ` (${e.nickname})` : ''}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Alert: เช็คอินวันที่จองไว้เอง */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E6ECF4', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#d97706" />
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>เช็คอินในวันที่จองวันหยุดไว้เอง</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>— รอ HR ตรวจสอบว่าเกิดจากอะไร</span>
        </div>
        {workedAlerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ไม่มีรายการค้าง — ไม่มีใครเช็คอินในวันที่จองหยุดไว้เอง</div>
        ) : (
          <div>
            {workedAlerts.map((a, idx) => (
              <div key={a.id} style={{ padding: '12px 18px', borderBottom: idx < workedAlerts.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{empName(a.employee)}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {fmtDate(a.date.slice(0, 10))} · {a.employee.employee_code}{a.employee.branch ? ` · ${a.employee.branch.name}` : ''}
                  </div>
                </div>
                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setResolveTarget({ alert: a, action: 'RESCHEDULE' })}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #F8CCBE', background: '#FEF8F6', color: '#EC6F44', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CalendarClock size={13} /> เลื่อนวันหยุด
                    </button>
                    <button onClick={() => setResolveTarget({ alert: a, action: 'COMPENSATE' })}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Gift size={13} /> ให้วันชดเชย
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swap panel */}
      {!isReadOnly && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Repeat size={16} color="#374151" />
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>สลับวันหยุดกันระหว่าง 2 คน</div>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            เลือกวันหยุดที่จองไว้แล้วของทั้งสองฝ่าย (เดือน {fmtYM(month)}) ระบบจะสลับวันให้ทันทีและ mark อนุมัติทั้งคู่
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>คนที่ 1</label>
              <select value={swapAId} onChange={e => setSwapAId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <option value="">— เลือกวันหยุดที่จองไว้ —</option>
                {swappable.filter(r => r.id !== swapBId).map(r => (
                  <option key={r.id} value={r.id}>{empName(r.employee)} · {fmtDate(resolveDate(r.week_start, r.day_of_week))} ({STATUS_CFG[r.status].label})</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', paddingBottom: 9 }}>⇄</div>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>คนที่ 2</label>
              <select value={swapBId} onChange={e => setSwapBId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                <option value="">— เลือกวันหยุดที่จองไว้ —</option>
                {swappable.filter(r => r.id !== swapAId && r.employee_id !== offA?.employee_id).map(r => (
                  <option key={r.id} value={r.id}>{empName(r.employee)} · {fmtDate(resolveDate(r.week_start, r.day_of_week))} ({STATUS_CFG[r.status].label})</option>
                ))}
              </select>
            </div>
          </div>

          {offA && offB && (
            <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 10, padding: '12px 14px', fontSize: '0.82rem', color: '#374151' }}>
              หลังสลับ: <strong>{empName(offA.employee)}</strong> จะหยุด <strong>{fmtDate(resolveDate(offB.week_start, offB.day_of_week))}</strong> แทน,{' '}
              <strong>{empName(offB.employee)}</strong> จะหยุด <strong>{fmtDate(resolveDate(offA.week_start, offA.day_of_week))}</strong> แทน
            </div>
          )}

          <button onClick={() => swapMutation.mutate()} disabled={!offA || !offB || swapMutation.isPending}
            style={{ marginTop: 14, padding: '9px 20px', borderRadius: 8, border: 'none', background: (!offA || !offB) ? '#d1d5db' : '#374151', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: (!offA || !offB) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Repeat size={14} /> {swapMutation.isPending ? 'กำลังสลับ...' : 'ยืนยันสลับวันหยุด'}
          </button>
        </div>
      )}

      {/* Resolve confirm modal */}
      {resolveTarget && (
        <div onClick={() => setResolveTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 400, maxWidth: '100%', padding: 22, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {resolveTarget.action === 'RESCHEDULE' ? <CalendarClock size={18} color="#EC6F44" /> : <Gift size={18} color="#16a34a" />}
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                {resolveTarget.action === 'RESCHEDULE' ? 'เลื่อนวันหยุด' : 'ให้วันหยุดชดเชย'}
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
              <strong>{empName(resolveTarget.alert.employee)}</strong> เช็คอินวันที่ {fmtDate(resolveTarget.alert.date.slice(0, 10))} ทั้งที่จองวันหยุดไว้เอง<br />
              {resolveTarget.action === 'RESCHEDULE'
                ? 'ระบบจะยกเลิกวันหยุดเดิมที่จองไว้วันนี้ — พนักงานไปจองวันหยุดใหม่แทนได้เลย'
                : 'ระบบจะให้วันหยุดชดเชย 1 วันเข้าโควต้า "ชดเชย" เหมือนมาทำงานในวันหยุดนักขัตฤกษ์'}
            </div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>หมายเหตุ (ไม่บังคับ)</label>
            <input value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="เช่น คุยกับพนักงานแล้ว ลืมว่าวันนี้หยุด"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setResolveTarget(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => resolveMutation.mutate({ id: resolveTarget.alert.id, action: resolveTarget.action, note: resolveNote })}
                disabled={resolveMutation.isPending}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: resolveTarget.action === 'RESCHEDULE' ? '#EC6F44' : '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                {resolveMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Calendar + Export ───────────────────────────────────────────────
function OverviewTab({ requests, isLoading, month, employeeOrgMap }: {
  requests: WeeklyOffRequest[]; isLoading: boolean; month: string; employeeOrgMap: Record<string, EmployeeOrgInfo>
}) {
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [statusFilter, setStatus] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('APPROVED')
  const { groups } = useOrgFilterOptions()
  const [rosterColors] = useState<Record<string, string>>(() => loadRosterColors())

  const filtered = useMemo(() => requests.filter(r => {
    if (!matchesOrgFilter(employeeOrgMap[r.employee_id], orgFilter)) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  }), [requests, orgFilter, employeeOrgMap, statusFilter])

  // map date → requests
  const byDate = useMemo(() => {
    const map: Record<string, WeeklyOffRequest[]> = {}
    for (const r of filtered) {
      const d = resolveDate(r.week_start, r.day_of_week)
      if (!map[d]) map[d] = []
      map[d].push(r)
    }
    return map
  }, [filtered])

  // calendar grid
  const [y, mo] = month.split('-').map(Number)
  const firstDow    = new Date(y, mo - 1, 1).getDay()   // 0=อา
  const daysInMonth = new Date(y, mo, 0).getDate()
  const totalCells  = Math.ceil((daysInMonth + firstDow) / 7) * 7

  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  function exportCsv() {
    const rows = [
      ['รหัสพนักงาน','ชื่อ','นามสกุล','ชื่อเล่น','สาขา','วันที่หยุด','วันในสัปดาห์','สถานะ'],
      ...filtered.map(r => {
        const date = resolveDate(r.week_start, r.day_of_week)
        return [
          r.employee.employee_code, r.employee.first_name, r.employee.last_name,
          r.employee.nickname ?? '', r.employee.branch.name,
          date, DAYS_TH[r.day_of_week], STATUS_CFG[r.status].label,
        ]
      }),
    ]
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `วันหยุด_${month}.csv`; a.click()
  }

  // ── Export "ตารางแยกกลุ่ม" (Excel สี) — ให้เหมือนหน้าปฏิทินรวม (TeamCalendarTab)
  // feedback 2026-09-14: "ปฎิทิน Export เหมือนกับหน้าปฏิทินรวม แยกกลุ่มให้ด้วย +
  // แบ่งสีสำหรับจองวันหยุด" — ไม่กรองตาม orgFilter/statusFilter บนจอ (ดูทุกคน/ทุก
  // สถานะที่ไม่ใช่ปฏิเสธในเดือนนี้เสมอ เหมือน roster export ของปฏิทินรวม) จัดกลุ่ม
  // ตามกลุ่มสาขา แต่ละคนมีสีประจำตัว (localStorage key เดียวกับปฏิทินรวม เพื่อให้
  // สีตรงกันข้ามหน้า)
  function buildRosterGroups(): { groupName: string; employees: ApiEmployee[] }[] {
    const byId = new Map<string, ApiEmployee>()
    for (const r of requests) if (r.status !== 'REJECTED') byId.set(r.employee_id, r.employee)
    const byGroup = new Map<string, ApiEmployee[]>()
    const noGroup: ApiEmployee[] = []
    for (const emp of byId.values()) {
      const gid = employeeOrgMap[emp.id]?.groupId
      if (!gid) { noGroup.push(emp); continue }
      if (!byGroup.has(gid)) byGroup.set(gid, [])
      byGroup.get(gid)!.push(emp)
    }
    const result = groups
      .filter(g => (byGroup.get(g.id)?.length ?? 0) > 0)
      .map(g => ({ groupName: g.name, employees: byGroup.get(g.id)! }))
    if (noGroup.length > 0) result.push({ groupName: 'ไม่มีกลุ่ม', employees: noGroup })
    return result
  }
  function rosterCellFor(employeeId: string, dateStr: string): { pending: boolean } | null {
    const req = requests.find(r => r.employee_id === employeeId && r.status !== 'REJECTED' && resolveDate(r.week_start, r.day_of_week) === dateStr)
    return req ? { pending: req.status === 'PENDING' } : null
  }
  function colorForEmployee(id: string, orderedIds: string[]): string {
    if (rosterColors[id]) return rosterColors[id]
    const idx = orderedIds.indexOf(id)
    return ROSTER_COLOR_PALETTE[idx % ROSTER_COLOR_PALETTE.length]
  }

  // ไฟล์ .xlsx จริง (ไม่ใช่ CSV) เพราะต้องการสีพื้นหลังต่อช่อง — โหลด ExcelJS
  // แบบ dynamic import กันบวมขนาดหน้าเว็บตอนโหลดปกติ (ตาม pattern เดียวกับ
  // TeamCalendarTab.exportRosterExcel)
  async function exportRosterExcel() {
    const ExcelJS = (await import('exceljs')).default
    const rosterGroups = buildRosterGroups()
    const orderedIds = rosterGroups.flatMap(g => g.employees.map(e => e.id))

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(fmtYM(month).slice(0, 31))

    const THIN = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
    const CELL_BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN }

    const fixedCols = ['ชื่อ', 'รหัส', 'สาขา']
    const totalCols = fixedCols.length + daysInMonth
    const headerRow = ws.addRow([...fixedCols, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)])
    headerRow.eachCell({ includeEmpty: true }, c => { c.font = { bold: true, color: { argb: 'FF6B7280' } }; c.alignment = { horizontal: 'center' }; c.border = CELL_BORDER })
    ws.getColumn(1).width = 22
    ws.getColumn(2).width = 12
    ws.getColumn(3).width = 12
    for (let i = 0; i < daysInMonth; i++) ws.getColumn(fixedCols.length + 1 + i).width = 6

    for (const grp of rosterGroups) {
      const groupRow = ws.addRow([`${grp.groupName} (${grp.employees.length} คน)`])
      ws.mergeCells(groupRow.number, 1, groupRow.number, totalCols)
      groupRow.getCell(1).font = { bold: true, size: 12 }
      groupRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      groupRow.getCell(1).border = CELL_BORDER

      for (const e of grp.employees) {
        const color = colorForEmployee(e.id, orderedIds).replace('#', '').toUpperCase()
        const row = ws.addRow([`${e.nickname || e.first_name} ${e.last_name}`, e.employee_code ?? '', e.branch.name])
        row.getCell(1).font = { bold: true }
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `20${color}` } }

        for (let i = 0; i < daysInMonth; i++) {
          const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
          const cell = rosterCellFor(e.id, dateStr)
          const xlCell = row.getCell(fixedCols.length + 1 + i)
          xlCell.alignment = { horizontal: 'center' }
          if (cell) {
            xlCell.value = 'หยุด'
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
    a.download = `วันหยุดแยกกลุ่ม_${month}.xlsx`; a.click()
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />

        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
          {([['', 'ทั้งหมด'], ['PENDING', 'รอ'], ['APPROVED', 'อนุมัติ'], ['REJECTED', 'ปฏิเสธ']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v as any)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem',
              background: statusFilter === v ? '#fff' : 'transparent',
              color: statusFilter === v ? '#EC6F44' : 'var(--text-muted)',
              fontWeight: statusFilter === v ? 700 : 500,
              boxShadow: statusFilter === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{filtered.length} รายการ</span>

        <button onClick={exportCsv} disabled={filtered.length === 0}
          style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.82rem', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: filtered.length === 0 ? 0.5 : 1 }}>
          <Download size={14} /> Export CSV
        </button>

        <button onClick={exportRosterExcel} disabled={requests.filter(r => r.status !== 'REJECTED').length === 0}
          title="Export Excel แยกกลุ่ม + สีต่อคน เหมือนหน้าปฏิทินรวม (ไม่ขึ้นกับตัวกรองบนจอ)"
          style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #F8CCBE', background: '#FEF8F6', color: '#C85E3A', fontWeight: 600, fontSize: '0.82rem', cursor: requests.filter(r => r.status !== 'REJECTED').length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: requests.filter(r => r.status !== 'REJECTED').length === 0 ? 0.5 : 1 }}>
          <FileSpreadsheet size={14} /> Export Excel (แยกกลุ่ม+สี)
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#FEF8F6' }}>
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
              <div key={d} style={{
                padding: '10px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem',
                color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#C85E3A',
                borderRight: i < 6 ? '1px solid #fde8d0' : 'none',
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {Array.from({ length: totalCells }, (_, idx) => {
              const dayNum = idx - firstDow + 1
              if (dayNum < 1 || dayNum > daysInMonth) {
                return <div key={idx} style={{ minHeight: 100, background: '#fafafa', borderTop: '1px solid #f3f4f6', borderRight: (idx % 7) < 6 ? '1px solid #f3f4f6' : 'none' }} />
              }
              const dateStr = `${month}-${String(dayNum).padStart(2,'0')}`
              const dow     = (firstDow + dayNum - 1) % 7
              const entries = byDate[dateStr] ?? []
              const isToday = dateStr === todayStr
              const isSun   = dow === 0
              const isSat   = dow === 6

              return (
                <div key={idx} style={{
                  minHeight: 100, padding: '6px 5px',
                  borderTop: '1px solid #f3f4f6',
                  borderRight: (idx % 7) < 6 ? '1px solid #f3f4f6' : 'none',
                  background: isToday ? '#FEF8F6' : entries.length > 0 ? '#fffbf5' : '#fff',
                }}>
                  {/* Date number */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                    background: isToday ? '#EC6F44' : 'transparent',
                    fontSize: '0.8rem', fontWeight: isToday ? 800 : 600,
                    color: isToday ? '#fff' : isSun ? '#dc2626' : isSat ? '#2563eb' : '#374151',
                  }}>{dayNum}</div>

                  {/* Employee chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {entries.map(r => {
                      const sc      = STATUS_CFG[r.status]
                      const display = r.employee.nickname || r.employee.first_name
                      return (
                        <div key={r.id} title={`${r.employee.first_name} ${r.employee.last_name} · ${r.employee.branch.name}`}
                          style={{
                            padding: '2px 6px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600,
                            background: sc.bg, color: sc.color,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            maxWidth: '100%', cursor: 'default',
                          }}>
                          {display}
                        </div>
                      )
                    })}
                    {entries.length > 0 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', paddingLeft: 2 }}>
                        {entries.length} คน
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: v.bg, border: `1.5px solid ${v.color}`, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#EC6F44', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>วันนี้</span>
        </div>
      </div>
    </div>
  )
}
