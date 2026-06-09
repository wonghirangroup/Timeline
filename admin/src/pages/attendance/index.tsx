// admin/src/pages/attendance/index.tsx  [MOCK MODE]
import { useState, useMemo, useEffect } from 'react'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── Types ───────────────────────────────────────────────────────────
interface ApiBranch  { id: string; name: string }
interface ApiShift   { id: string; name: string; start_time: string; end_time: string; late_threshold_1: string | null; late_threshold_2: string | null }

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
  is_outside_area: boolean
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

// ── Mock Data ──────────────────────────────────────────────────────────────────
let _attSeq = 100
function genAttId() { return `att-mock-${_attSeq++}` }

const MOCK_BRANCHES_ATT: ApiBranch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ' },
  { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' },
  { id: 'br-03', name: 'ฟุคุโระ ตลาดย่าโม' },
]
const MOCK_SHIFTS_ATT: ApiShift[] = [
  { id: 'sh-01', name: 'กะเช้า',  start_time: '08:00', end_time: '17:00', late_threshold_1: '08:05', late_threshold_2: '08:20' },
  { id: 'sh-02', name: 'กะบ่าย', start_time: '13:00', end_time: '22:00', late_threshold_1: '13:05', late_threshold_2: '13:20' },
  { id: 'sh-03', name: 'กะเช้า (แม่กิมเฮง)', start_time: '09:00', end_time: '18:00', late_threshold_1: '09:05', late_threshold_2: '09:30' },
]
const MOCK_EMPLOYEES_ATT: ApiEmployee[] = [
  { id: 'em-01', employee_code: '2567-03-001', first_name: 'สมชาย',   last_name: 'ใจดี',     nickname: 'ชาย',  branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-02', employee_code: '2567-02-002', first_name: 'วิภาวดี', last_name: 'ศรีสุข',   nickname: 'แนน',  branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-03', employee_code: '2567-04-003', first_name: 'ธนวัฒน์', last_name: 'มงคล',     nickname: 'วัฒน์',branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-04', employee_code: '2567-03-004', first_name: 'นันทิชา', last_name: 'พรหมบุตร', nickname: 'แพรว', branch_id: 'br-02', branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
  { id: 'em-07', employee_code: '2567-04-007', first_name: 'บุญมา',   last_name: 'สีดา',      nickname: 'บุญ',  branch_id: 'br-03', branch: { id: 'br-03', name: 'ฟุคุโระ ตลาดย่าโม' } },
]

function makeMockRecords(dateStr: string): ApiRecord[] {
  return [
    { id: 'att-01', employee_id: 'em-01', shift_id: 'sh-01', date: dateStr, check_in_at: `${dateStr}T01:02:00Z`, check_out_at: `${dateStr}T10:05:00Z`, check_in_method: 'LIFF',  is_late: false, late_minutes: 0,  is_outside_area: false, note: null, employee: { ...MOCK_EMPLOYEES_ATT[0] }, shift: MOCK_SHIFTS_ATT[0] },
    { id: 'att-02', employee_id: 'em-02', shift_id: 'sh-01', date: dateStr, check_in_at: `${dateStr}T01:08:00Z`, check_out_at: null,                    check_in_method: 'QR',    is_late: true,  late_minutes: 3,  is_outside_area: false, note: null, employee: { ...MOCK_EMPLOYEES_ATT[1] }, shift: MOCK_SHIFTS_ATT[0] },
    { id: 'att-03', employee_id: 'em-04', shift_id: 'sh-03', date: dateStr, check_in_at: `${dateStr}T02:25:00Z`, check_out_at: `${dateStr}T11:01:00Z`,  check_in_method: 'LIFF',  is_late: true,  late_minutes: 25, is_outside_area: true,  note: 'นอกพื้นที่', employee: { ...MOCK_EMPLOYEES_ATT[3] }, shift: MOCK_SHIFTS_ATT[2] },
  ]
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
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function timeToStr(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const METHOD_CFG: Record<string, { label: string; color: string; bg: string }> = {
  LIFF:         { label: 'LIFF',    color: '#2563eb', bg: '#dbeafe' },
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

function deriveStatus(record: ApiRecord | null, dateStr: string): Status {
  if (!record) {
    return dateStr < todayStr() ? 'ABSENT' : 'PENDING'
  }
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
  fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  width: '100%', fontFamily: 'inherit',
}

export default function AttendancePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const [date, setDate]           = useState(todayStr())
  const [branchFilter, setBranch] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  
  const [page, setPage]           = useState(1)
  const pageSize                  = 7

  const [branches, setBranches]   = useState<ApiBranch[]>(MOCK_BRANCHES_ATT)
  const [employees, setEmployees] = useState<ApiEmployee[]>(MOCK_EMPLOYEES_ATT)
  const [records, setRecords]     = useState<ApiRecord[]>(() => makeMockRecords(todayStr()))
  const [shifts, setShifts]       = useState<ApiShift[]>(MOCK_SHIFTS_ATT)

  // modal state
  const [editTarget, setEditTarget]     = useState<Row | null>(null)
  const [manualTarget, setManualTarget] = useState<ApiEmployee | null>(null)
  const [resetTarget, setResetTarget]   = useState<Row | null>(null)
  const [editForm, setEditForm]         = useState({ check_in_at: '', check_out_at: '', note: '' })
  const [manualForm, setManualForm]   = useState({ shift_id: '', check_in_at: '', check_out_at: '', note: '' })
  const [saving, setSaving]           = useState(false)

  function loadData() {
    const base = makeMockRecords(date)
    const filtered = branchFilter
      ? base.filter(r => r.employee.branch.id === branchFilter)
      : base
    const filteredEmps = branchFilter
      ? MOCK_EMPLOYEES_ATT.filter(e => e.branch_id === branchFilter)
      : MOCK_EMPLOYEES_ATT
    setRecords(filtered)
    setEmployees(filteredEmps)
  }

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

  // ── Reset (ลบ) record ────────────────────────────────────────────────
  async function handleReset() {
    if (!resetTarget?.record) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setRecords(prev => prev.filter(r => r.id !== resetTarget.record!.id))
    showToast('success', `รีเซ็ตเวลา ${resetTarget.employee.first_name} สำเร็จ`)
    setResetTarget(null)
    setSaving(false)
  }

  // ── Edit existing record ─────────────────────────────────────────────
  function openEdit(row: Row) {
    setEditForm({
      check_in_at:  timeToStr(row.record?.check_in_at ?? null),
      check_out_at: timeToStr(row.record?.check_out_at ?? null),
      note: row.record?.note ?? '',
    })
    setEditTarget(row)
  }

  async function handleEdit() {
    if (!editTarget?.record) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setRecords(prev => prev.map(r => {
      if (r.id !== editTarget.record!.id) return r
      const ciISO = editForm.check_in_at  ? `${date}T${editForm.check_in_at}:00Z` : r.check_in_at
      const coISO = editForm.check_out_at ? `${date}T${editForm.check_out_at}:00Z` : r.check_out_at
      return { ...r, check_in_at: ciISO, check_out_at: coISO, note: editForm.note || r.note, check_in_method: 'ADMIN' as const }
    }))
    showToast('success', 'แก้ไขเวลาสำเร็จ')
    setEditTarget(null)
    setSaving(false)
  }

  // ── Manual check-in ─────────────────────────────────────────────────
  function openManual(emp: ApiEmployee) {
    setManualForm({ shift_id: '', check_in_at: '', check_out_at: '', note: '' })
    setManualTarget(emp)
  }

  async function handleManual() {
    if (!manualTarget || !manualForm.shift_id || !manualForm.check_in_at) {
      showToast('error', 'กรุณาเลือกกะและกรอกเวลาเข้างาน')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const shift = shifts.find(s => s.id === manualForm.shift_id) ?? shifts[0]
    const ciISO = `${date}T${manualForm.check_in_at}:00Z`
    const coISO = manualForm.check_out_at ? `${date}T${manualForm.check_out_at}:00Z` : null
    const newRec: ApiRecord = {
      id: genAttId(), employee_id: manualTarget.id, shift_id: manualForm.shift_id, date,
      check_in_at: ciISO, check_out_at: coISO, check_in_method: 'ADMIN',
      is_late: false, late_minutes: 0, is_outside_area: false,
      note: manualForm.note || null,
      employee: { id: manualTarget.id, first_name: manualTarget.first_name, last_name: manualTarget.last_name, nickname: manualTarget.nickname, employee_code: manualTarget.employee_code, branch: manualTarget.branch },
      shift,
    }
    setRecords(prev => [...prev, newRec])
    showToast('success', `ลงเวลา ${manualTarget.first_name} สำเร็จ`)
    setManualTarget(null)
    setSaving(false)
  }

  // ── Render ───────────────────────────────────────────────────────────
  const branchShifts = branchFilter
    ? shifts.filter(s => (s as any).branch_id === branchFilter)
    : shifts

  return (
    <div>
      {/* Mock banner */}
      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(30,64,175,0.07)', border: '1px solid rgba(30,64,175,0.2)', fontSize: '0.72rem', color: '#1e40af', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
        🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
      </div>

      {/* Header removed */}

      {/* KPI bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          สถานะวันนี้
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {([
            { label: 'ทั้งหมด',    value: summary.total,   emoji: '👥', color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe' },
            { label: 'มาปกติ',     value: summary.onTime,  emoji: '✅', color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0' },
            { label: 'สายระดับ 1', value: summary.late1,   emoji: '⚠️', color: '#d97706', bg: '#fffbeb',  border: '#fde68a' },
            { label: 'สายระดับ 2', value: summary.late2,   emoji: '🔴', color: '#dc2626', bg: '#fef2f2',  border: '#fecaca' },
            { label: 'ขาดงาน',     value: summary.absent,  emoji: '❌', color: '#dc2626', bg: '#fef2f2',  border: '#fecaca' },
            { label: 'ยังไม่เช็ค', value: summary.pending, emoji: '⏳', color: '#64748b', bg: '#f8fafc',  border: '#e2e8f0' },
          ] as const).map(k => (
            <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '12px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '1rem' }}>{k.emoji}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          กรอง
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...inp, width: 'auto', borderRadius: 10 }} />
          {/* Branch Filter */}
          <select 
            value={branchFilter} 
            onChange={e => setBranch(e.target.value)}
            style={{ ...inp, width: 'auto', borderRadius: 10, cursor: 'pointer', padding: '8px 12px' }}
          >
            <option value="">ทุกสาขา</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ค้นหาชื่อ / รหัส"
            style={{ ...inp, flex: 1, minWidth: 160, borderRadius: 10 }} />
          <button onClick={loadData} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>↻</button>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>กำลังโหลด...</p>}

      {/* Table */}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {isMobile ? (
            <div>
              {filtered.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</p>}
              {paginated.map(row => {
                const s = STATUS_CFG[row.status]
                const e = row.employee
                return (
                  <div key={row.key} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.first_name} {e.last_name}
                          {e.nickname && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>({e.nickname})</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                          {e.employee_code} · {e.branch.name}
                          {row.record && ` · ${row.record.shift.name}`}
                        </div>
                      </div>
                      <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>เข้า: <b style={{ color: '#1e40af' }}>{fmtTime(row.record?.check_in_at ?? null)}</b></span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>ออก: {fmtTime(row.record?.check_out_at ?? null)}</span>
                      {row.record?.check_in_method && (() => {
                        const m = METHOD_CFG[row.record.check_in_method] ?? METHOD_CFG.LIFF
                        return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>
                      })()}
                      {row.record?.is_outside_area && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: '#fef3c7', color: '#d97706' }}>⚠️ นอกพื้นที่</span>
                      )}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {row.record ? (
                          <>
                            <button onClick={() => openEdit(row)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}><Pencil size={13}/></button>
                            <button onClick={() => setResetTarget(row)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem' }}><Trash2 size={13}/></button>
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
                    <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</td></tr>
                  )}
                  {paginated.map((row, i) => {
                    const s = STATUS_CFG[row.status]
                    const e = row.employee
                    return (
                      <tr key={row.key} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>{e.employee_code}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{e.first_name} {e.last_name}</div>
                          {e.nickname && <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{e.nickname}</div>}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{e.branch.name}</td>
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
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#fef3c7', color: '#d97706', width: 'fit-content' }}>⚠️ นอกพื้นที่</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#374151' }}>{fmtTime(row.record?.check_out_at ?? null)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record?.check_in_method ? (() => {
                            const m = METHOD_CFG[row.record.check_in_method] ?? METHOD_CFG.LIFF
                            return <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.bg, color: m.color }}>{m.label}</span>
                          })() : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.78rem' }}>
                          {row.record?.is_late
                            ? <span style={{ color: '#d97706', fontWeight: 600 }}>{row.record.late_minutes} นาที</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => openEdit(row)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={12}/> แก้ไข</button>
                              <button onClick={() => setResetTarget(row)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }} title="รีเซ็ต"><Trash2 size={13}/></button>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#9ca3af' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#9ca3af' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setEditTarget(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: '24px', width: isMobile ? '100%' : 420, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>แก้ไขเวลา</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6b7280' }}>
              {editTarget.employee.first_name} {editTarget.employee.last_name} · {editTarget.record?.shift.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาเข้างาน</label>
                <input type="time" value={editForm.check_in_at} onChange={e => setEditForm(f => ({ ...f, check_in_at: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>เวลาออกงาน</label>
                <input type="time" value={editForm.check_out_at} onChange={e => setEditForm(f => ({ ...f, check_out_at: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                <input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="ไม่บังคับ" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleEdit} disabled={saving} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal */}
      {manualTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setManualTarget(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: '24px', width: isMobile ? '100%' : 420, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>+ ลงเวลาแทนพนักงาน</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6b7280' }}>
              {manualTarget.first_name} {manualTarget.last_name} · {date}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>กะ *</label>
                <select value={manualForm.shift_id} onChange={e => setManualForm(f => ({ ...f, shift_id: e.target.value }))} style={inp}>
                  <option value="">— เลือกกะ —</option>
                  {(branchShifts.length > 0 ? branchShifts : shifts).map(s => (
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
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 700, textAlign: 'center' }}>รีเซ็ตบันทึกเช็คชื่อ?</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>
              {resetTarget.employee.first_name} {resetTarget.employee.last_name}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6b7280', textAlign: 'center' }}>
              กะ: {resetTarget.record?.shift.name} · เวลาเข้า: {fmtTime(resetTarget.record?.check_in_at ?? null)}
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626', marginBottom: 20 }}>
              ⚠️ บันทึกนี้จะถูกลบออก พนักงานสามารถเช็คอินใหม่ได้อีกครั้ง
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
