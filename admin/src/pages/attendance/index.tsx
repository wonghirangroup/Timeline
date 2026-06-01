// admin/src/pages/attendance/index.tsx
import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/axios'
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
  check_in_at:  string | null
  check_out_at: string | null
  is_late: boolean
  late_minutes: number
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
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function timeToStr(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
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

  const [branches, setBranches]   = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [records, setRecords]     = useState<ApiRecord[]>([])
  const [shifts, setShifts]       = useState<ApiShift[]>([])

  // modal state
  const [editTarget, setEditTarget]   = useState<Row | null>(null)       // แก้ไขเวลา
  const [manualTarget, setManualTarget] = useState<ApiEmployee | null>(null) // ลงเวลาแทน
  const [editForm, setEditForm]       = useState({ check_in_at: '', check_out_at: '', note: '' })
  const [manualForm, setManualForm]   = useState({ shift_id: '', check_in_at: '', check_out_at: '', note: '' })
  const [saving, setSaving]           = useState(false)

  // ── Load ────────────────────────────────────────────────────────────
  async function loadBranchesAndShifts() {
    const [br, sh] = await Promise.all([
      api.get('/api/v1/admin/branches'),
      api.get('/api/v1/admin/shifts'),
    ])
    setBranches(br.data.data ?? [])
    setShifts(sh.data.data ?? [])
  }

  async function loadData() {
    setLoading(true)
    try {
      const params: Record<string, string> = { date }
      if (branchFilter) params.branchId = branchFilter

      const [empRes, attRes] = await Promise.all([
        api.get('/api/v1/admin/employees', { params: branchFilter ? { branchId: branchFilter } : {} }),
        api.get('/api/v1/admin/attendance', { params }),
      ])
      setEmployees(empRes.data.data ?? [])
      setRecords(attRes.data.data ?? [])
    } catch {
      showToast('error', 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBranchesAndShifts() }, [])
  useEffect(() => { loadData() }, [date, branchFilter])

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

  // ── Summaries ────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total:   employees.length,
    onTime:  rows.filter(r => r.status === 'ON_TIME').length,
    late1:   rows.filter(r => r.status === 'LATE_1').length,
    late2:   rows.filter(r => r.status === 'LATE_2').length,
    absent:  rows.filter(r => r.status === 'ABSENT').length,
    pending: rows.filter(r => r.status === 'PENDING').length,
  }), [rows, employees])

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
    try {
      await api.patch(`/api/v1/admin/attendance/${editTarget.record.id}`, {
        check_in_at:  editForm.check_in_at  || undefined,
        check_out_at: editForm.check_out_at || undefined,
        note:         editForm.note         || undefined,
      })
      showToast('success', 'แก้ไขเวลาสำเร็จ')
      setEditTarget(null)
      await loadData()
    } catch {
      showToast('error', 'แก้ไขไม่สำเร็จ')
    } finally { setSaving(false) }
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
    try {
      await api.post('/api/v1/admin/attendance', {
        employee_id:  manualTarget.id,
        shift_id:     manualForm.shift_id,
        date,
        check_in_at:  manualForm.check_in_at,
        check_out_at: manualForm.check_out_at || undefined,
        note:         manualForm.note         || undefined,
      })
      showToast('success', `ลงเวลา ${manualTarget.first_name} สำเร็จ`)
      setManualTarget(null)
      await loadData()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'ลงเวลาไม่สำเร็จ'
      showToast('error', msg)
    } finally { setSaving(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────
  const branchShifts = branchFilter
    ? shifts.filter(s => (s as any).branch_id === branchFilter)
    : shifts

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>📅 เช็คชื่อรายวัน</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>ตรวจสอบ / แก้ไขเวลาเข้า-ออกงาน</p>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { label: 'พนักงานทั้งหมด',    value: summary.total,              color: '#6366f1', bg: '#eef2ff' },
          { label: 'มาปกติ',           value: summary.onTime,             color: '#16a34a', bg: '#dcfce7' },
          { label: 'สายระดับ 1',       value: summary.late1,              color: '#d97706', bg: '#fef3c7' },
          { label: 'สายระดับ 2 / ขาด', value: summary.late2,              color: '#dc2626', bg: '#fee2e2' },
          { label: 'ขาดงาน',           value: summary.absent,             color: '#7f1d1d', bg: '#fef2f2' },
          { label: 'ยังไม่เช็ค',      value: summary.pending,            color: '#64748b', bg: '#f1f5f9' },
        ] as const).map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.color}22`, borderRadius: 10, padding: '10px 16px', minWidth: 90, flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: k.color, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inp, width: 'auto' }} />
        <select value={branchFilter} onChange={e => setBranch(e.target.value)}
          style={{ ...inp, width: 'auto' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาชื่อ / รหัส"
          style={{ ...inp, flex: 1, minWidth: 160 }} />
        <button onClick={loadData} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>↻ รีเฟรช</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>กำลังโหลด...</p>}

      {/* Table */}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {isMobile ? (
            <div>
              {filtered.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</p>}
              {filtered.map(row => {
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
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>เข้า: <b style={{ color: '#1e40af' }}>{fmtTime(row.record?.check_in_at ?? null)}</b></span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>ออก: {fmtTime(row.record?.check_out_at ?? null)}</span>
                      <div style={{ marginLeft: 'auto' }}>
                        {row.record
                          ? <button onClick={() => openEdit(row)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.78rem' }}>✏ แก้ไข</button>
                          : <button onClick={() => openManual(row.employee)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #f97316', background: '#fff7ed', color: '#f97316', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>+ ลงเวลา</button>
                        }
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
                  <tr style={{ background: '#dbeafe' }}>
                    {['รหัส', 'ชื่อ-สกุล', 'สาขา', 'กะ', 'เวลาเข้า', 'เวลาออก', 'สาย', 'สถานะ', 'จัดการ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</td></tr>
                  )}
                  {filtered.map((row, i) => {
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
                          {row.record?.check_in_at
                            ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 10px', fontWeight: 700 }}>{fmtTime(row.record.check_in_at)}</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#374151' }}>{fmtTime(row.record?.check_out_at ?? null)}</td>
                        <td style={{ padding: '11px 14px', fontSize: '0.78rem' }}>
                          {row.record?.is_late
                            ? <span style={{ color: '#d97706', fontWeight: 600 }}>{row.record.late_minutes} นาที</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {row.record
                            ? <button onClick={() => openEdit(row)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#374151' }}>✏ แก้ไข</button>
                            : <button onClick={() => openManual(row.employee)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #f97316', background: '#fff7ed', color: '#f97316', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>+ ลงเวลา</button>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>✏ แก้ไขเวลา</h3>
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
    </div>
  )
}
