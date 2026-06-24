// admin/src/pages/weekly-off/index.tsx
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Trash2, Plus, CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock, Settings2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  employee_code: string; branch: { id: string; name: string }
}
interface WeeklyOffRequest {
  id: string; employee_id: string; week_start: string; day_of_week: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; reject_note: string | null
  employee: ApiEmployee
}
interface ApiBranch { id: string; name: string }
interface WeeklyOffPeriod {
  id: string | null; branch_id: string; month: string
  is_open: boolean; deadline: string | null; note: string | null
  branch: { id: string; name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS_TH     = ['อา','จ','อ','พ','พฤ','ศ','ส']
const MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

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
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`
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

const STATUS_CFG = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ปฏิเสธ',   color: '#dc2626', bg: '#fee2e2' },
}

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
        {DAYS_TH.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>{d}</div>)}
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
              background: isSelected ? '#f97316' : 'transparent',
              color: isSelected ? '#fff' : isDisabled ? '#d1d5db' : '#374151',
              fontSize: '0.78rem', fontWeight: isSelected ? 700 : 400,
            }}>{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ─── PeriodManager component ──────────────────────────────────────────────────
function PeriodManager({ month }: { month: string }) {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editDeadline, setEditDeadline] = useState('')
  const [editNote, setEditNote] = useState('')

  const { data: periods = [], isLoading } = useQuery<WeeklyOffPeriod[]>({
    queryKey: ['admin', 'weekly-off-periods', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off/periods', { params: { month } }).then((r: any) => r.data.data),
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

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
  if (periods.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่มีสาขา</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {periods.map(p => {
        const isEditing = editId === p.branch_id
        const deadlinePast = p.deadline ? new Date() > new Date(p.deadline) : false
        const effectiveOpen = p.is_open && !deadlinePast

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
                {p.deadline && (
                  <div style={{ fontSize: '0.72rem', color: deadlinePast ? '#dc2626' : '#6b7280', marginTop: 2 }}>
                    {deadlinePast ? '⛔ หมดเวลาแล้ว' : `⏰ deadline: ${fmtDate(p.deadline.slice(0, 10))}`}
                  </div>
                )}
              </div>
              {/* Status badge */}
              <span style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700,
                background: effectiveOpen ? '#dcfce7' : '#f3f4f6',
                color: effectiveOpen ? '#16a34a' : '#9ca3af',
              }}>
                {effectiveOpen ? '🟢 เปิดจอง' : '🔴 ปิดจอง'}
              </span>
            </div>

            {/* Note */}
            {p.note && !isEditing && (
              <div style={{ fontSize: '0.78rem', color: '#6b7280', background: '#f9fafb', borderRadius: 7, padding: '6px 10px' }}>
                📝 {p.note}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>Deadline (ไม่บังคับ)</label>
                  <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: '0.82rem', marginTop: 3, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>หมายเหตุถึงพนักงาน</label>
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
                  }} style={{ flex: 1, padding: '6px', borderRadius: 7, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
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
              <div style={{ display: 'flex', gap: 6 }}>
                {!effectiveOpen ? (
                  <button onClick={() => openMutation.mutate({ branch_id: p.branch_id, month })}
                    disabled={openMutation.isPending}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Unlock size={13} /> เปิดจอง
                  </button>
                ) : (
                  <button onClick={() => closeMutation.mutate({ branch_id: p.branch_id, month })}
                    disabled={closeMutation.isPending}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Lock size={13} /> ปิดจอง
                  </button>
                )}
                <button onClick={() => {
                  setEditId(p.branch_id)
                  setEditDeadline(p.deadline ? p.deadline.slice(0, 10) : '')
                  setEditNote(p.note ?? '')
                }} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <Settings2 size={13} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [tab, setTab]     = useState<'requests' | 'periods' | 'overview'>('periods')
  const [branchFilter, setBranch] = useState('')
  const [statusFilter, setStatus] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('')
  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState({ employee_id: '', date: '' })
  const [showCalendar, setShowCalendar] = useState(false)
  const [rejectId, setRejectId]   = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'weekly-off', month] })

  const { data: requests = [], isLoading } = useQuery<WeeklyOffRequest[]>({
    queryKey: ['admin', 'weekly-off', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month } }).then((r: any) => r.data.data),
  })
  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then((r: any) => r.data.data),
  })
  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then((r: any) => r.data.data),
  })

  const filtered = useMemo(() => requests.filter(r => {
    if (branchFilter && r.employee.branch.id !== branchFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  }).sort((a, b) => {
    const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 }
    return order[a.status] - order[b.status] || a.week_start.localeCompare(b.week_start)
  }), [requests, branchFilter, statusFilter])

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
    mutationFn: (id: string) => api.post(`/api/v1/admin/weekly-off/${id}/approve`),
    onSuccess: () => { invalidate(); showToast('success', 'อนุมัติสำเร็จ') },
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
    onError: (err: any) => {
      const code = err.response?.data?.error?.code
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
            <ChevronLeft size={16} color="#6b7280" />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: isMobile ? 100 : 130, textAlign: 'center' }}>{fmtYM(month)}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={16} color="#6b7280" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, flexWrap: 'wrap', gap: 2 }}>
          {([['periods', isMobile ? '🔓 เปิด/ปิด' : '🔓 เปิด/ปิดการจอง'], ['requests', isMobile ? '📋 คำขอ' : '📋 รายการคำขอ'], ['overview', isMobile ? '📅 ภาพรวม' : '📅 ภาพรวม']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{
              padding: isMobile ? '6px 10px' : '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#f97316' : '#6b7280',
              fontWeight: tab === t ? 700 : 500,
              fontSize: isMobile ? '0.75rem' : '0.82rem',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

      </div>

      {/* Periods tab */}
      {tab === 'periods' && <PeriodManager month={month} />}

      {/* Requests tab content below */}
      {tab === 'requests' && <>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {summary.pending > 0 && (
          <button onClick={() => approveAllMutation.mutate()} disabled={approveAllMutation.isPending}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> อนุมัติทั้งหมด ({summary.pending})
          </button>
        )}
        <button onClick={() => { setShowAdd(s => !s); setShowCalendar(false) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: showAdd ? '#6b7280' : '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> {showAdd ? 'ยกเลิก' : 'เพิ่มวันหยุด'}
        </button>
      </div>

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
                  color: addForm.date ? '#111827' : '#9ca3af', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CalendarDays size={15} color="#9ca3af" />
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
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#ea580c' }}>
                <strong>{selectedEmp.first_name} {selectedEmp.last_name}</strong> จะหยุด{' '}
                <strong>{fmtDate(addForm.date)} ({DAYS_TH[new Date(addForm.date + 'T00:00:00').getDay()]})</strong>
              </div>
            )}

            <button onClick={handleAdd} disabled={addMutation.isPending || !addForm.employee_id || !addForm.date}
              style={{ padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', opacity: (!addForm.employee_id || !addForm.date) ? 0.5 : 1 }}>
              {addMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {/* Branch filter */}
      <div style={{ marginBottom: 12 }}>
        <select value={branchFilter} onChange={e => setBranch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่มีรายการวันหยุดในเดือนนี้</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#fff7ed' }}>
                {['พนักงาน', 'สาขา', 'วันที่หยุด', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const sc   = STATUS_CFG[r.status]
                const date = resolveDate(r.week_start, r.day_of_week)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.employee.first_name} {r.employee.last_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        {r.employee.employee_code}{r.employee.nickname ? ` · ${r.employee.nickname}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{r.employee.branch.name}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                      {fmtDate(date)}
                      <span style={{ marginLeft: 6, fontSize: '0.72rem', background: '#f3f4f6', color: '#6b7280', borderRadius: 4, padding: '1px 5px' }}>
                        {DAYS_TH[r.day_of_week]}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {sc.label}
                      </span>
                      {r.status === 'REJECTED' && r.reject_note && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 3 }}>{r.reject_note}</div>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {r.status === 'PENDING' && <>
                          <button onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <Check size={12} /> อนุมัติ
                          </button>
                          <button onClick={() => { setRejectId(r.id); setRejectNote('') }}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <X size={12} /> ปฏิเสธ
                          </button>
                        </>}
                        <button onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending}
                          style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Reject inline dialog */}
                      {rejectId === r.id && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      </>}

      {/* ── ภาพรวม tab ─────────────────────────────────────────────────── */}
      {tab === 'overview' && <OverviewTab requests={requests} isLoading={isLoading} month={month} branches={branches} />}
    </div>
  )
}

// ─── Overview Calendar + Export ───────────────────────────────────────────────
function OverviewTab({ requests, isLoading, month, branches }: {
  requests: WeeklyOffRequest[]; isLoading: boolean; month: string; branches: ApiBranch[]
}) {
  const [branchFilter, setBranch] = useState('')
  const [statusFilter, setStatus] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('APPROVED')

  const filtered = useMemo(() => requests.filter(r => {
    if (branchFilter && r.employee.branch.id !== branchFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    return true
  }), [requests, branchFilter, statusFilter])

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

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={branchFilter} onChange={e => setBranch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
          {([['', 'ทั้งหมด'], ['PENDING', 'รอ'], ['APPROVED', 'อนุมัติ'], ['REJECTED', 'ปฏิเสธ']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setStatus(v as any)} style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem',
              background: statusFilter === v ? '#fff' : 'transparent',
              color: statusFilter === v ? '#f97316' : '#6b7280',
              fontWeight: statusFilter === v ? 700 : 500,
              boxShadow: statusFilter === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#6b7280' }}>{filtered.length} รายการ</span>

        <button onClick={exportCsv} disabled={filtered.length === 0}
          style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.82rem', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: filtered.length === 0 ? 0.5 : 1 }}>
          ⬇️ Export CSV
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#fff7ed' }}>
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
              <div key={d} style={{
                padding: '10px 4px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem',
                color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#c2410c',
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
                  background: isToday ? '#fff7ed' : entries.length > 0 ? '#fffbf5' : '#fff',
                }}>
                  {/* Date number */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                    background: isToday ? '#f97316' : 'transparent',
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
                      <div style={{ fontSize: '0.62rem', color: '#9ca3af', paddingLeft: 2 }}>
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
            <span style={{ color: '#6b7280' }}>{v.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f97316', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>วันนี้</span>
        </div>
      </div>
    </div>
  )
}
