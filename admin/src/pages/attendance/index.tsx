// admin/src/pages/attendance/index.tsx
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Users, CheckCircle2, AlertTriangle, AlertCircle, XCircle, Clock, MapPin, Info, X, Wallet, Search } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useSwipePage } from '../../hooks/useSwipePage'
import { useActiveOffsite } from '../../hooks/useActiveOffsite'
import { api } from '../../lib/axios'

// ─── Types ───────────────────────────────────────────────────────────
interface ApiBranch  { id: string; name: string }
interface ApiShift   {
  id: string; name: string; branch_id: string; start_time: string; end_time: string
  late_threshold_1: string | null; late_threshold_2: string | null; absent_threshold: string | null
  late_fine_1: string | null; late_fine_2: string | null
}

interface ApiRecord {
  id: string
  employee_id: string
  shift_id: string
  date: string
  check_in_at:    string | null
  check_out_at:   string | null
  check_in_method: 'LIFF' | 'QR' | 'ADMIN' | 'WEB_FALLBACK' | 'SELFIE' | 'OFFSITE'
  is_late:         boolean
  late_minutes:    number
  is_absent:       boolean
  fine:            string
  carried_fine:    string
  is_outside_area: boolean
  gps_lat: number | null
  gps_lng: number | null
  note: string | null
  employee: {
    id: string; first_name: string; last_name: string
    nickname: string | null; employee_code: string
    branch: { id: string; name: string }
  }
  shift: ApiShift
}

interface ApiEmployee {
  id: string; employee_code: string
  first_name: string; last_name: string; nickname: string | null
  branch_id: string; branch: { id: string; name: string }
}


type Status = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'PENDING' | 'ABSENT'

interface Row {
  key: string
  employee: ApiEmployee
  record: ApiRecord | null
  status: Status
}

// ─── Helpers ─────────────────────────────────────────────────────────
const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  ON_TIME: { label: 'มาปกติ',            color: '#16a34a', bg: '#dcfce7' },
  LATE_1:  { label: 'สายระดับ 1',        color: '#d97706', bg: '#fef3c7' },
  LATE_2:  { label: 'สายระดับ 2 / ขาด', color: '#dc2626', bg: '#fee2e2' },
  PENDING: { label: 'ยังไม่เช็ค',       color: '#64748b', bg: '#f1f5f9' },
  ABSENT:  { label: 'ขาดงาน',            color: '#7f1d1d', bg: '#fef2f2' },
}

function pad(n: number) { return String(n).padStart(2, '0') }
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false })
}
function timeToStr(iso: string | null): string {
  if (!iso) return ''
  const bkk = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${pad(bkk.getHours())}:${pad(bkk.getMinutes())}`
}

const METHOD_CFG: Record<string, { label: string; color: string; bg: string }> = {
  LIFF:         { label: 'LINE App', color: '#2563eb', bg: '#dbeafe' },
  QR:           { label: 'QR',      color: '#7c3aed', bg: '#ede9fe' },
  ADMIN:        { label: 'Admin',   color: '#0891b2', bg: '#cffafe' },
  WEB_FALLBACK: { label: 'Web',     color: '#64748b', bg: '#f1f5f9' },
  SELFIE:       { label: 'Selfie',  color: '#be185d', bg: '#fce7f3' },
  OFFSITE:      { label: 'Offsite', color: '#b45309', bg: '#fef3c7' },
}

function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// "YYYY-MM-DD" → "DD/MM/YYYY" (ปีคริสต์ศักราช ตรงกับที่ใช้แสดงในโมดัลแก้ไข)
function thDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ─── Edit modal: สถานะ override (แยกจาก Status ด้านบนที่มี PENDING เพราะตอนแก้ไข
// ต้องมี record อยู่แล้วเสมอ ไม่มีสถานะ "ยังไม่เช็ค") ───────────────────────
type EditStatus = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT'
const EDIT_STATUS_CFG: Record<EditStatus, string> = {
  ON_TIME: 'มาปกติ', LATE_1: 'มาสาย (ระดับ 1)', LATE_2: 'มาสาย (ระดับ 2)', ABSENT: 'ขาดงาน',
}

// mirror ของ computeLateStatus ฝั่ง backend (attendance.service.ts) — ใช้พรีวิว
// สถานะ/ค่าปรับให้เห็นทันทีตอนแก้เวลา/กะในหน้านี้เท่านั้น ไม่ใช่ค่าที่ยึดเป็นจริง
// เสมอไป — ตอนบันทึกจริงถ้า admin ไม่ได้แก้สถานะ/ค่าปรับเองมือ จะไม่ส่งค่านี้ไป
// ปล่อยให้ backend คำนวณอัตโนมัติ (authoritative) แทน กันกรณี edge case ที่ mirror
// นี้ไม่ครบ (เช่น legacy late_threshold แบบเก่าที่ backend ยังรองรับ fallback อยู่)
function previewStatus(shift: ApiShift, checkInHHMM: string): EditStatus {
  if (!checkInHHMM) return 'ON_TIME'
  const ciMins = toMins(checkInHHMM)
  const startMins = toMins(shift.start_time)
  if (ciMins <= startMins) return 'ON_TIME'
  const absentM = shift.absent_threshold  ? toMins(shift.absent_threshold)  : null
  const late2M  = shift.late_threshold_2  ? toMins(shift.late_threshold_2)  : null
  const late1M  = shift.late_threshold_1  ? toMins(shift.late_threshold_1)  : null
  if (absentM != null && ciMins >= absentM) return 'ABSENT'
  if (late2M  != null && ciMins >= late2M)  return 'LATE_2'
  if (late1M  != null && ciMins >= late1M)  return 'LATE_1'
  return 'ON_TIME' // สายแต่ยังไม่ถึงเกณฑ์ไหน (grace period)
}
function previewFine(shift: ApiShift, status: EditStatus): number {
  if (status === 'LATE_1') return shift.late_fine_1 ? Number(shift.late_fine_1) : 0
  if (status === 'LATE_2') return shift.late_fine_2 ? Number(shift.late_fine_2) : 0
  return 0 // ON_TIME/ABSENT ไม่คิดจาก fine field นี้ (ABSENT ใช้ absent_fine ยกไปหักวันถัดไปคนละกลไก)
}

function deriveStatus(record: ApiRecord | null, dateStr: string): Status {
  if (!record) {
    return dateStr < todayStr() ? 'ABSENT' : 'PENDING'
  }
  if (record.is_absent) return 'ABSENT'   // เช็คอินจริง แต่สายเกินเกณฑ์จนนับเป็นขาด (มี check_in_at อยู่ ไม่ใช่ไม่มาเลย)
  if (!record.is_late) return 'ON_TIME'

  // คำนวณระดับสายจาก threshold ของกะ
  if (record.check_in_at) {
    const ci = new Date(record.check_in_at)
    const ciMins = ci.getHours() * 60 + ci.getMinutes()

    // ถ้าเกิน late_threshold_2 → สายระดับ 2
    if (record.shift.late_threshold_2 && ciMins >= toMins(record.shift.late_threshold_2)) {
      return 'LATE_2'
    }
  }
  return 'LATE_1'
}

// ─── Component ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box',
  width: '100%', fontFamily: 'inherit',
}

export default function AttendancePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const qc = useQueryClient()
  const swipeHandlers = useSwipePage(
    () => setPage(p => Math.min(totalPages, p + 1)),
    () => setPage(p => Math.max(1, p - 1)),
  )

  const [date, setDate]           = useState(todayStr())
  const [branchFilter, setBranch] = useState('')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const pageSize                  = 7

  // modal state
  const [editTarget, setEditTarget]     = useState<Row | null>(null)
  const [manualTarget, setManualTarget] = useState<ApiEmployee | null>(null)
  const [resetTarget, setResetTarget]   = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({
    branch_id: '', shift_id: '', check_in_at: '', check_out_at: '',
    status: 'ON_TIME' as EditStatus, fine: '0', note: '',
  })
  // สถานะ/ค่าปรับที่ admin แก้เองด้วยมือ (ต่างจาก auto-calc ล่าสุด) — ถ้า true จะส่ง
  // ค่านี้ไป backend เป็น override ตอนบันทึก ถ้า false ปล่อยให้ backend คำนวณเอง
  const [editStatusTouched, setEditStatusTouched] = useState(false)
  const [editFineTouched,   setEditFineTouched]   = useState(false)
  const [manualForm, setManualForm]     = useState({ shift_id: '', check_in_at: '', check_out_at: '', note: '' })

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  // ทุกกะทุกสาขา (ไม่กรองตาม branchFilter ของหน้า) — ใช้ในโมดัลแก้ไข/ลงเวลา
  // เพื่อให้เลือกสาขา/กะที่ไม่ตรงกับ filter ปัจจุบันของหน้าได้ด้วย
  const { data: allShifts = [] } = useQuery<ApiShift[]>({
    queryKey: ['admin', 'shifts', 'all'],
    queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data),
  })

  const { data: employees = [], isLoading: empLoading } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees', branchFilter],
    queryFn: () =>
      // includeInactive: หน้านี้ดูวันที่ย้อนหลังได้ พนักงานที่ลาออก/เลิกจ้างไปแล้วต้องยังเห็นได้
      api.get('/api/v1/admin/employees', { params: { ...(branchFilter ? { branchId: branchFilter } : {}), includeInactive: true } })
         .then(r => r.data.data),
  })
  const { activeOffsiteByEmployee } = useActiveOffsite()

  const { data: records = [], isLoading: recLoading, refetch } = useQuery<ApiRecord[]>({
    queryKey: ['admin', 'attendance', date, branchFilter],
    queryFn: () =>
      api.get('/api/v1/admin/attendance', {
        params: { date, ...(branchFilter ? { branchId: branchFilter } : {}) },
      }).then(r => r.data.data),
  })

  const { data: shifts = [] } = useQuery<ApiShift[]>({
    queryKey: ['admin', 'shifts', branchFilter],
    queryFn: () =>
      api.get('/api/v1/admin/shifts', { params: branchFilter ? { branchId: branchFilter } : {} })
         .then(r => r.data.data),
  })

  const loading = empLoading || recLoading

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      api.patch(`/api/v1/admin/attendance/${id}`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] })
      showToast('success', 'แก้ไขเวลาสำเร็จ')
      setEditTarget(null)
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      if (code === 'ALREADY_CHECKED_IN') showToast('error', 'พนักงานนี้มีบันทึกในกะที่เลือกของวันนี้อยู่แล้ว')
      else if (code === 'SHIFT_NOT_FOUND') showToast('error', 'ไม่พบกะที่เลือก')
      else showToast('error', 'แก้ไขไม่สำเร็จ')
    },
  })

  const manualMutation = useMutation({
    mutationFn: (body: object) =>
      api.post('/api/v1/admin/attendance', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] })
      showToast('success', `ลงเวลา ${manualTarget?.first_name} สำเร็จ`)
      setManualTarget(null)
    },
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
      if (code === 'ALREADY_CHECKED_IN') showToast('error', 'พนักงานนี้มีบันทึกในกะนี้แล้ว')
      else showToast('error', 'ลงเวลาไม่สำเร็จ')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/admin/attendance/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'attendance'] })
      showToast('success', `รีเซ็ตเวลา ${resetTarget?.employee.first_name} สำเร็จ`)
      setResetTarget(null)
    },
    onError: () => showToast('error', 'รีเซ็ตไม่สำเร็จ'),
  })

  const saving = editMutation.isPending || manualMutation.isPending || deleteMutation.isPending

  // ── Merge employees + records ────────────────────────────────────────
  const rows = useMemo<Row[]>(() => {
    // records keyed by employee_id (one employee may have multiple shifts → multiple records)
    const byEmp: Record<string, ApiRecord[]> = {}
    for (const r of records) {
      if (!byEmp[r.employee_id]) byEmp[r.employee_id] = []
      byEmp[r.employee_id].push(r)
    }

    const result: Row[] = []

    for (const emp of employees) {
      const empRecords = byEmp[emp.id] ?? []
      if (empRecords.length > 0) {
        // one row per record (multiple shifts possible)
        for (const rec of empRecords) {
          result.push({ key: rec.id, employee: emp, record: rec, status: deriveStatus(rec, date) })
        }
      } else {
        // no record → show as pending/absent
        result.push({ key: `no-${emp.id}`, employee: emp, record: null, status: deriveStatus(null, date) })
      }
    }

    return result
  }, [employees, records, date])

  const filtered = useMemo(() => rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    const e = r.employee
    return `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q)
  }), [rows, search])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page])

  useEffect(() => { setPage(1) }, [branchFilter, search, date])

  // ── Summaries ────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total:   employees.length,
    onTime:  rows.filter(r => r.status === 'ON_TIME').length,
    late1:   rows.filter(r => r.status === 'LATE_1').length,
    late2:   rows.filter(r => r.status === 'LATE_2').length,
    absent:  rows.filter(r => r.status === 'ABSENT').length,
    pending: rows.filter(r => r.status === 'PENDING').length,
  }), [rows, employees])

  function openEdit(row: Row) {
    if (!row.record) return
    setEditForm({
      branch_id:    row.record.shift.branch_id,
      shift_id:     row.record.shift_id,
      check_in_at:  timeToStr(row.record.check_in_at),
      check_out_at: timeToStr(row.record.check_out_at),
      status:       row.status === 'PENDING' ? 'ON_TIME' : row.status,
      fine:         String(Number(row.record.fine) || 0),
      note:         row.record.note ?? '',
    })
    setEditStatusTouched(false)
    setEditFineTouched(false)
    setEditTarget(row)
  }

  // เปลี่ยนเวลาเข้า/กะ = auto-calculation สถานะ+ค่าปรับใหม่ (พรีวิวฝั่ง browser
  // ตาม previewStatus/previewFine) — reset touched flag เพราะถือว่าเป็นค่า auto
  // ล่าสุดแล้ว ไม่ใช่ที่ admin ตั้งเองอีกต่อไป
  function recalcEditForm(nextShiftId: string, nextCheckIn: string) {
    const shift = allShifts.find(s => s.id === nextShiftId)
    if (!shift || !nextCheckIn) return
    const status = previewStatus(shift, nextCheckIn)
    const fine   = previewFine(shift, status)
    setEditForm(f => ({ ...f, status, fine: String(fine) }))
    setEditStatusTouched(false)
    setEditFineTouched(false)
  }

  function handleEditBranchChange(branchId: string) {
    // เปลี่ยนสาขา = กะเดิมอาจไม่อยู่ในสาขาใหม่แล้ว เลือกกะแรกของสาขานั้นให้อัตโนมัติ
    const shiftsInBranch = allShifts.filter(s => s.branch_id === branchId)
    const nextShiftId = shiftsInBranch.some(s => s.id === editForm.shift_id) ? editForm.shift_id : (shiftsInBranch[0]?.id ?? '')
    setEditForm(f => ({ ...f, branch_id: branchId, shift_id: nextShiftId }))
    recalcEditForm(nextShiftId, editForm.check_in_at)
  }

  function handleEditShiftChange(shiftId: string) {
    setEditForm(f => ({ ...f, shift_id: shiftId }))
    recalcEditForm(shiftId, editForm.check_in_at)
  }

  function handleEditCheckInChange(checkIn: string) {
    setEditForm(f => ({ ...f, check_in_at: checkIn }))
    recalcEditForm(editForm.shift_id, checkIn)
  }

  function handleEdit() {
    if (!editTarget?.record) return
    editMutation.mutate({
      id: editTarget.record.id,
      body: {
        shift_id:     editForm.shift_id !== editTarget.record.shift_id ? editForm.shift_id : undefined,
        check_in_at:  editForm.check_in_at  || undefined,
        check_out_at: editForm.check_out_at || undefined,
        // ส่ง status/fine เป็น override เฉพาะตอนที่ admin แก้เองด้วยมือเท่านั้น —
        // ถ้าไม่แตะเลยปล่อยให้ backend คำนวณอัตโนมัติ (authoritative กว่า preview
        // ฝั่ง browser เพราะรองรับ edge case ครบกว่า)
        status: editStatusTouched ? editForm.status : undefined,
        fine:   editFineTouched   ? Number(editForm.fine) : undefined,
        note: editForm.note || undefined,
      },
    })
  }

  function openManual(emp: ApiEmployee) {
    setManualForm({ shift_id: '', check_in_at: '', check_out_at: '', note: '' })
    setManualTarget(emp)
  }

  function handleManual() {
    if (!manualTarget || !manualForm.shift_id || !manualForm.check_in_at) {
      showToast('error', 'กรุณาเลือกกะและกรอกเวลาเข้างาน')
      return
    }
    manualMutation.mutate({
      employee_id:  manualTarget.id,
      shift_id:     manualForm.shift_id,
      date,
      check_in_at:  manualForm.check_in_at,
      check_out_at: manualForm.check_out_at || undefined,
      note:         manualForm.note || undefined,
    })
  }

  function handleReset() {
    if (!resetTarget?.record) return
    deleteMutation.mutate(resetTarget.record.id)
  }

  // ── Render ───────────────────────────────────────────────────────────
  // กะที่เลือกในโมดัล "ลงเวลาแทนพนักงาน" ต้องกรองตามสาขาของ "พนักงานที่เลือก" เสมอ
  // (ไม่ใช่ branch filter ของหน้า — ไม่งั้นถ้าหน้าเลือก "ทุกสาขา" อยู่ กะจากทุกสาขาจะ
  // ปนกันมาให้เลือกหมด ทั้งที่พนักงานคนนี้ทำงานสาขาเดียว)
  const manualTargetShifts = manualTarget
    ? shifts.filter(s => (s as any).branch_id === manualTarget.branch_id)
    : []

  return (
    <div>
      {/* KPI bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          สถานะวันนี้
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'ทั้งหมด',    value: summary.total,   icon: <Users size={15}/>,         color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe' },
            { label: 'มาปกติ',     value: summary.onTime,  icon: <CheckCircle2 size={15}/>,   color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0' },
            { label: 'ยังไม่เช็ค', value: summary.pending, icon: <Clock size={15}/>,          color: '#64748b', bg: '#f8fafc',  border: '#e2e8f0' },
            { label: 'สายระดับ 1', value: summary.late1,   icon: <AlertTriangle size={15}/>,  color: '#d97706', bg: '#fffbeb',  border: '#fde68a' },
            { label: 'สายระดับ 2', value: summary.late2,   icon: <AlertCircle size={15}/>,    color: '#dc2626', bg: '#fef2f2',  border: '#fecaca' },
            { label: 'ขาดงาน',     value: summary.absent,  icon: <XCircle size={15}/>,        color: '#dc2626', bg: '#fef2f2',  border: '#fecaca' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '12px 10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: k.color, display: 'flex' }}>{k.icon}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Branch filter */}
        <div>
          <select value={branchFilter} onChange={e => { setBranch(e.target.value); setPage(1) }}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <option value="">ทุกสาขา</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {/* Compact controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...inp, width: 'auto', borderRadius: 10 }} />
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / รหัส"
              style={{ ...inp, width: '100%', paddingLeft: 30, borderRadius: 10, boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => refetch()} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>↻</button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>กำลังโหลด...</p>}

      {/* Table */}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {isMobile ? (
            <div {...swipeHandlers}>
              {filtered.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</p>}
              {paginated.map(row => {
                const s = STATUS_CFG[row.status]
                const e = row.employee
                return (
                  <div key={row.key} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.first_name} {e.last_name}
                          {e.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>({e.nickname})</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {e.employee_code} · {e.branch.name}
                          {row.record && ` · ${row.record.shift.name}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                        {date === todayStr() && activeOffsiteByEmployee.has(e.id) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 600 }}>
                            <MapPin size={9} /> นอกสถานที่
                          </span>
                        )}
                        {row.record && (Number(row.record.fine) + Number(row.record.carried_fine)) > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#dc2626' }}><Wallet size={10} /> {Number(row.record.fine) + Number(row.record.carried_fine)} ฿</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>เข้า: <b style={{ color: '#1e40af' }}>{fmtTime(row.record?.check_in_at ?? null)}</b></span>
                      {row.record?.check_in_at && !row.record?.check_out_at
                        ? <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626' }}>ลืมเช็คออก</span>
                        : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ออก: <b>{fmtTime(row.record?.check_out_at ?? null) || '—'}</b></span>}
                      {row.record?.check_in_method && (() => {
                        const m = METHOD_CFG[row.record.check_in_method] ?? METHOD_CFG.LIFF
                        return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>
                      })()}
                      {row.record?.is_outside_area && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={10}/>นอกพื้นที่</span>
                      )}
                      {row.record?.gps_lat && row.record?.gps_lng && (
                        <a href={`https://maps.google.com/?q=${row.record.gps_lat},${row.record.gps_lng}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                          <MapPin size={10}/>ดูพิกัด
                        </a>
                      )}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {row.record ? (
                          <>
                            <button onClick={() => openEdit(row)} aria-label={`แก้ไข ${row.employee.first_name} ${row.employee.last_name}`} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}><Pencil size={13}/></button>
                            <button onClick={() => setResetTarget(row)} aria-label={`รีเซ็ตเวลาของ ${row.employee.first_name} ${row.employee.last_name}`} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}><Trash2 size={13}/></button>
                          </>
                        ) : (
                          <button onClick={() => openManual(row.employee)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #f97316', background: '#fff7ed', color: '#f97316', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>+ ลงเวลา</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#fff7ed' }}>
                    {['รหัส', 'ชื่อ-สกุล', 'สาขา', 'กะ', 'เวลาเข้า', 'เวลาออก', 'วิธี', 'สาย', 'สถานะ', 'จัดการ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบข้อมูล</td></tr>
                  )}
                  {paginated.map((row, i) => {
                    const s = STATUS_CFG[row.status]
                    const e = row.employee
                    return (
                      <tr key={row.key} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.employee_code}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</div>
                          {e.nickname && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.nickname}</div>}
                        </td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.branch.name}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record
                            ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600 }}>{row.record.shift.name}</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {row.record?.check_in_at
                              ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 10px', fontWeight: 700, width: 'fit-content' }}>{fmtTime(row.record.check_in_at)}</span>
                              : <span style={{ color: '#d1d5db' }}>—</span>}
                            {row.record?.is_outside_area && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#fef3c7', color: '#d97706', width: 'fit-content' }}><AlertTriangle size={9} /> นอกพื้นที่</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record?.check_in_at && !row.record?.check_out_at
                            ? <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626' }}>ลืมเช็คออก</span>
                            : <span style={{ color: '#374151' }}>{fmtTime(row.record?.check_out_at ?? null) || '—'}</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            {row.record?.check_in_method ? (() => {
                              const m = METHOD_CFG[row.record.check_in_method] ?? METHOD_CFG.LIFF
                              return <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>
                            })() : <span style={{ color: '#d1d5db' }}>—</span>}
                            {row.record?.gps_lat && row.record?.gps_lng && (
                              <a href={`https://maps.google.com/?q=${row.record.gps_lat},${row.record.gps_lng}`} target="_blank" rel="noreferrer"
                                style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                                <MapPin size={10}/>ดูพิกัด
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.78rem' }}>
                          {row.record?.is_late
                            ? <span style={{ color: '#d97706', fontWeight: 600 }}>{row.record.late_minutes} นาที</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                            <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span>
                            {date === todayStr() && activeOffsiteByEmployee.has(e.id) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 600 }}>
                                <MapPin size={9} /> นอกสถานที่
                              </span>
                            )}
                            {row.record && (Number(row.record.fine) + Number(row.record.carried_fine)) > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, color: '#dc2626' }}>
                                <Wallet size={10} /> {Number(row.record.fine) + Number(row.record.carried_fine)} ฿
                                {Number(row.record.carried_fine) > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (รวมยกมา {Number(row.record.carried_fine)})</span>}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => openEdit(row)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={12}/> แก้ไข</button>
                              <button onClick={() => setResetTarget(row)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }} title="รีเซ็ต" aria-label="รีเซ็ตเวลา"><Trash2 size={13}/></button>
                            </div>
                          ) : (
                            <button onClick={() => openManual(row.employee)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #f97316', background: '#fff7ed', color: '#f97316', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>+ ลงเวลา</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filtered.length)} จาก {filtered.length} รายการ
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isMobile && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <div key={i} onClick={() => setPage(i + 1)} style={{ width: page === i + 1 ? 18 : 7, height: 7, borderRadius: 99, cursor: 'pointer', background: page === i + 1 ? '#f97316' : '#e5e7eb', transition: 'all 0.2s' }} />
                      ))}
                    </div>
                  )}
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="หน้าก่อนหน้า" disabled={page === 1}
                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="หน้าถัดไป" disabled={page === totalPages}
                    style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              {isMobile && <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>← ปัดซ้ายขวาเพื่อเปลี่ยนหน้า →</span>}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && editTarget.record && (() => {
        const shiftsInBranch = allShifts.filter(s => s.branch_id === editForm.branch_id)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setEditTarget(null)}>
            <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: '24px', width: isMobile ? '100%' : 460, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pencil size={16} /> แก้ไขข้อมูล: {editTarget.employee.first_name} {editTarget.employee.last_name}
                  <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-muted)' }}>({thDateShort(date)})</span>
                </h3>
                <button onClick={() => setEditTarget(null)} aria-label="ปิด" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><X size={18} /></button>
              </div>

              {/* Auto Calculation info banner */}
              <div style={{ display: 'flex', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginBottom: 18 }}>
                <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>Auto Calculation</div>
                  <div style={{ fontSize: '0.76rem', color: '#1e40af', marginTop: 2, lineHeight: 1.5 }}>
                    เปลี่ยนเวลาเข้า/กะ/สาขา = คำนวณสถานะใหม่อัตโนมัติ (อิงตามเวลาสาขา) — แก้สถานะ/ค่าปรับเองด้วยมือได้ทีหลังถ้าต้องการ
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>กะการทำงาน</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {shiftsInBranch.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ไม่มีกะในสาขานี้</span>}
                      {shiftsInBranch.map(s => (
                        <button key={s.id} type="button" onClick={() => handleEditShiftChange(s.id)}
                          style={{
                            flex: '1 1 auto', padding: '9px 10px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            border: editForm.shift_id === s.id ? '2px solid #f97316' : '1px solid #e5e7eb',
                            background: editForm.shift_id === s.id ? '#f97316' : '#fff',
                            color: editForm.shift_id === s.id ? '#fff' : '#374151',
                          }}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>สาขา</label>
                    <select value={editForm.branch_id} onChange={e => handleEditBranchChange(e.target.value)} style={inp}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาเข้างาน</label>
                    <input type="time" value={editForm.check_in_at} onChange={e => handleEditCheckInChange(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาออกงาน</label>
                    <input type="time" value={editForm.check_out_at} onChange={e => setEditForm(f => ({ ...f, check_out_at: e.target.value }))} style={inp} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}><span style={{ color: '#ef4444' }}>*</span> สถานะ</label>
                    <select value={editForm.status} onChange={e => { setEditForm(f => ({ ...f, status: e.target.value as EditStatus })); setEditStatusTouched(true) }} style={inp}>
                      {(Object.keys(EDIT_STATUS_CFG) as EditStatus[]).map(s => <option key={s} value={s}>{EDIT_STATUS_CFG[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>ค่าปรับ (บาท)</label>
                    <div style={{ position: 'relative' }}>
                      <Wallet size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                      <input type="number" min={0} value={editForm.fine}
                        onChange={e => { setEditForm(f => ({ ...f, fine: e.target.value })); setEditFineTouched(true) }}
                        style={{ ...inp, paddingLeft: 32 }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                  <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="ไม่บังคับ" rows={2}
                    style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button onClick={() => setEditTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
                <button onClick={handleEdit} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pencil size={14} /> {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Manual Check-in Modal */}
      {manualTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setManualTarget(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: '24px', width: isMobile ? '100%' : 420, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>+ ลงเวลาแทนพนักงาน</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {manualTarget.first_name} {manualTarget.last_name} · {manualTarget.branch.name} · {date}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>กะ *</label>
                <select value={manualForm.shift_id} onChange={e => setManualForm(f => ({ ...f, shift_id: e.target.value }))} style={inp}>
                  <option value="">— เลือกกะ —</option>
                  {manualTargetShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาเข้างาน *</label>
                <input type="time" value={manualForm.check_in_at} onChange={e => setManualForm(f => ({ ...f, check_in_at: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาออกงาน</label>
                <input type="time" value={manualForm.check_out_at} onChange={e => setManualForm(f => ({ ...f, check_out_at: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                <input value={manualForm.note} onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))} placeholder="เช่น ลืมเช็คอิน" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setManualTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleManual} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'ลงเวลา'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setResetTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', width: 360, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#ef4444' }}><Trash2 size={32}/></div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700, textAlign: 'center' }}>รีเซ็ตบันทึกเช็คชื่อ?</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {resetTarget.employee.first_name} {resetTarget.employee.last_name}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              กะ: {resetTarget.record?.shift.name} · เวลาเข้า: {fmtTime(resetTarget.record?.check_in_at ?? null)}
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }}/>บันทึกนี้จะถูกลบออก พนักงานสามารถเช็คอินใหม่ได้อีกครั้ง
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setResetTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>ยกเลิก</button>
              <button onClick={handleReset} disabled={saving}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังลบ...' : 'รีเซ็ต'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
