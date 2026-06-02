// admin/src/pages/weekly-off/index.tsx
import { useState, useMemo, useEffect, useCallback } from 'react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

type WeeklyOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface WeeklyOffBooking {
  id: string; employee_id: string; week_start: string; day_of_week: number; status: WeeklyOffStatus
  reject_note?: string | null
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } }
}
interface ApiBranch   { id: string; name: string }
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null; branch: { id: string; name: string } }

// ── Config ────────────────────────────────────────────────────────────────────
const DAYS_TH   = ['อา','จ','อ','พ','พฤ','ศ','ส']
const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const BRANCH_COLORS = ['#f97316','#6366f1','#0891b2','#16a34a','#a21caf','#d97706','#dc2626']

const WO_CFG: Record<WeeklyOffStatus,{ label: string; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  REJECTED: { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}

// ── Date utils ────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date)   { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function toYYYYMM(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}` }

// คำนวณวันที่จริงจาก week_start (Monday) + day_of_week
function actualDate(weekStart: string, dow: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function empName(w: WeeklyOffBooking)   { return w.employee.nickname ?? w.employee.first_name }
function empFull(w: WeeklyOffBooking)   { return `${w.employee.first_name} ${w.employee.last_name}` }
function empBranch(w: WeeklyOffBooking) { return w.employee.branch.name }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const today    = new Date()
  const [month,  setMonth]  = useState(toYYYYMM(today))   // YYYY-MM
  const [bookings, setBookings] = useState<WeeklyOffBooking[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [branches,  setBranches]  = useState<ApiBranch[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)

  // UI state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showPreview,  setShowPreview]  = useState(false)
  const [branchFilter, setBranchFilter] = useState('')
  const [modal, setModal]    = useState<{ mode: 'add'; date: string } | { mode: 'edit'; booking: WeeklyOffBooking } | null>(null)
  const [form,  setForm]     = useState({ employee_id: '', day_of_week: 1 })
  const [deleteTarget, setDeleteTarget] = useState<WeeklyOffBooking | null>(null)

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admin/weekly-off', { params: { month } })
      setBookings(res.data.data ?? [])
    } catch { showToast('error', 'โหลดไม่สำเร็จ') }
    finally { setLoading(false) }
  }, [month])

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/admin/employees').then(r => setEmployees(r.data.data ?? [])).catch(() => {}),
      api.get('/api/v1/admin/branches').then(r => setBranches(r.data.data ?? [])).catch(() => {}),
    ])
  }, [])

  useEffect(() => { load() }, [load])

  // ── Calendar days ─────────────────────────────────────────────────────────────
  const [y, m] = month.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1).getDay()   // 0=Sun
  const daysInMonth = new Date(y, m, 0).getDate()

  // ปฏิทินเริ่มจันทร์ (Mon=0)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // map date → bookings
  const byDate = useMemo(() => {
    const map: Record<string, WeeklyOffBooking[]> = {}
    bookings.forEach(w => {
      const d = actualDate(w.week_start, w.day_of_week)
      if (!map[d]) map[d] = []
      if (!branchFilter || w.employee.branch.id === branchFilter) map[d].push(w)
    })
    return map
  }, [bookings, branchFilter])

  const branchColor = (name: string) => {
    const list = [...new Set(bookings.map(w => empBranch(w)))]
    return BRANCH_COLORS[list.indexOf(name) % BRANCH_COLORS.length]
  }

  // pending ทั้งเดือน
  const pendingAll = bookings.filter(w => w.status === 'PENDING' && (!branchFilter || w.employee.branch.id === branchFilter))
    .sort((a, b) => actualDate(a.week_start, a.day_of_week).localeCompare(actualDate(b.week_start, b.day_of_week)))

  const selectedBookings = selectedDate ? (byDate[selectedDate] ?? []) : []

  // ── Handlers ──────────────────────────────────────────────────────────────────
  async function handleApprove(id: string) {
    setSaving(true)
    try {
      await api.post(`/api/v1/admin/weekly-off/${id}/approve`)
      showToast('success', 'อนุมัติสำเร็จ')
      await load()
    } catch { showToast('error', 'ไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handleReject(id: string) {
    setSaving(true)
    try {
      await api.post(`/api/v1/admin/weekly-off/${id}/reject`)
      showToast('info', 'ปฏิเสธแล้ว')
      await load()
    } catch { showToast('error', 'ไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handleApproveAll() {
    setSaving(true)
    try {
      const res = await api.post('/api/v1/admin/weekly-off/approve-all', { month })
      showToast('success', `อนุมัติ ${res.data.data?.count ?? 0} รายการ`)
      setShowPreview(false)
      await load()
    } catch { showToast('error', 'ไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await api.delete(`/api/v1/admin/weekly-off/${deleteTarget.id}`)
      showToast('success', `ลบวันหยุด ${empName(deleteTarget)} แล้ว`)
      setDeleteTarget(null)
      if (selectedDate && (byDate[selectedDate] ?? []).length <= 1) setSelectedDate(null)
      await load()
    } catch { showToast('error', 'ลบไม่สำเร็จ') }
    finally { setSaving(false) }
  }

  async function handleSave() {
    if (!form.employee_id) { showToast('error', 'กรุณาเลือกพนักงาน'); return }
    setSaving(true)
    try {
      if (modal?.mode === 'add') {
        await api.post('/api/v1/admin/weekly-off', { employee_id: form.employee_id, week_start: modal.date, day_of_week: form.day_of_week })
        showToast('success', `เพิ่มวันหยุด วัน${DAYS_FULL[form.day_of_week]}`)
      } else if (modal?.mode === 'edit') {
        await api.patch(`/api/v1/admin/weekly-off/${modal.booking.id}`, { day_of_week: form.day_of_week })
        showToast('success', `เปลี่ยนวันหยุด → วัน${DAYS_FULL[form.day_of_week]}`)
      }
      setModal(null)
      await load()
    } catch (e: any) {
      const code = e?.response?.data?.error?.code
      if (code === 'ALREADY_REQUESTED') showToast('error', 'มีวันหยุดสัปดาห์นี้แล้ว')
      else showToast('error', 'บันทึกไม่สำเร็จ')
    } finally { setSaving(false) }
  }

  // ── Styles ────────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
  const btn: React.CSSProperties  = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>📅 วันหยุดประจำสัปดาห์</h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>จัดการวันหยุด 1 วัน/สัปดาห์ ต่อพนักงาน</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pendingAll.length > 0 && (
            <button onClick={() => setShowPreview(true)}
              style={{ ...btn, background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', fontWeight: 700 }}>
              👁 Preview {pendingAll.length} รายการ
            </button>
          )}
          <button onClick={() => { setForm({ employee_id: '', day_of_week: 1 }); setModal({ mode: 'add', date: fmt(today) }) }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            + เพิ่มวันหยุด
          </button>
        </div>
      </div>

      {/* ── Month nav + filters ── */}
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { const d = new Date(y, m-2, 1); setMonth(toYYYYMM(d)); setSelectedDate(null) }} style={{ ...btn, padding: '7px 12px', fontSize: '1rem' }}>‹</button>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', flex: 1, textAlign: 'center' }}>
          {MONTHS_TH[m-1]} {y+543}
        </div>
        <button onClick={() => { const d = new Date(y, m, 1); setMonth(toYYYYMM(d)); setSelectedDate(null) }} style={{ ...btn, padding: '7px 12px', fontSize: '1rem' }}>›</button>
        <button onClick={() => { setMonth(toYYYYMM(today)); setSelectedDate(null) }} style={{ ...btn, fontSize: '12px', color: '#f97316', borderColor: '#fed7aa' }}>วันนี้</button>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', fontFamily: 'inherit' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'รอพิจารณา', value: bookings.filter(w => w.status === 'PENDING').length, color: '#d97706', bg: '#fef3c7' },
          { label: 'อนุมัติ',   value: bookings.filter(w => w.status === 'APPROVED').length, color: '#16a34a', bg: '#dcfce7' },
          { label: 'ไม่อนุมัติ',value: bookings.filter(w => w.status === 'REJECTED').length, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Calendar ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Day headers (Mon–Sun) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          {['จ','อ','พ','พฤ','ศ','ส','อา'].map((d, i) => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: i === 6 ? '#dc2626' : '#6b7280' }}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} style={{ borderRight: idx % 7 < 6 ? '1px solid #f3f4f6' : 'none', borderBottom: '1px solid #f3f4f6', background: '#fafafa', minHeight: 70 }} />

              const dateStr  = `${y}-${pad(m)}-${pad(day)}`
              const dayItems = byDate[dateStr] ?? []
              const isToday  = dateStr === fmt(today)
              const isSel    = dateStr === selectedDate
              const dow      = (startOffset + day - 1) % 7   // 0=Mon
              const isSun    = dow === 6
              const hasPending = dayItems.some(w => w.status === 'PENDING')

              return (
                <div key={idx} onClick={() => setSelectedDate(isSel ? null : dateStr)}
                  style={{
                    borderRight: idx % 7 < 6 ? '1px solid #f3f4f6' : 'none',
                    borderBottom: '1px solid #f3f4f6',
                    minHeight: 70, padding: '6px 5px', cursor: 'pointer',
                    background: isSel ? '#fff7ed' : isToday ? '#fff7ed' : isSun ? '#fafafa' : '#fff',
                    borderLeft: isSel ? '2px solid #f97316' : '2px solid transparent',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#fff7ed' }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = isSun ? '#fafafa' : isToday ? '#fff7ed' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#f97316' : isSun ? '#dc2626' : '#374151', width: 22, height: 22, borderRadius: '50%', background: isToday ? '#fff7ed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {day}
                    </span>
                    {hasPending && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayItems.slice(0, isMobile ? 1 : 2).map(w => {
                      const cfg = WO_CFG[w.status]; const bc = branchColor(empBranch(w))
                      return (
                        <div key={w.id} onClick={e => { e.stopPropagation(); setForm({ employee_id: w.employee_id, day_of_week: w.day_of_week }); setModal({ mode: 'edit', booking: w }) }}
                          style={{ padding: '2px 5px', borderRadius: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: bc, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 40 : 54 }}>
                              {empName(w)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {dayItems.length > (isMobile ? 1 : 2) && (
                      <div style={{ fontSize: '0.6rem', color: '#9ca3af', textAlign: 'center' }}>+{dayItems.length - (isMobile ? 1 : 2)}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Day Detail (inline) ── */}
        {selectedDate && selectedBookings.length > 0 && (
          <div style={{ borderTop: '2px solid #f97316', background: '#fffbf7', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#111827' }}>
                {(() => { const d = new Date(selectedDate + 'T00:00:00'); return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()+543}` })()}
                <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>{selectedBookings.length} รายการ</span>
              </div>
              <button onClick={() => setSelectedDate(null)} style={{ ...btn, padding: '4px 10px', fontSize: '12px', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedBookings.map(w => {
                const cfg = WO_CFG[w.status]; const bc = branchColor(empBranch(w))
                return (
                  <div key={w.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${cfg.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                      {empName(w).slice(0,2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{empName(w)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{empFull(w)} · {empBranch(w)}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {w.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(w.id)} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✓</button>
                          <button onClick={() => handleReject(w.id)}  disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✗</button>
                        </>
                      )}
                      <button onClick={() => { setForm({ employee_id: w.employee_id, day_of_week: w.day_of_week }); setModal({ mode: 'edit', booking: w }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer' }}>✎</button>
                      <button onClick={() => setDeleteTarget(w)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Preview & Approve All Modal ── */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
          onClick={() => setShowPreview(false)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16, width: '100%', maxWidth: 560, maxHeight: isMobile ? '85vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>👁 Preview วันหยุดรอพิจารณา</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{MONTHS_TH[m-1]} {y+543} — {pendingAll.length} รายการ</div>
              </div>
              <button onClick={() => setShowPreview(false)} style={{ ...btn, padding: '4px 10px', color: '#9ca3af' }}>✕</button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingAll.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>ไม่มีรายการรอพิจารณา</div>
              ) : pendingAll.map(w => {
                const ad = actualDate(w.week_start, w.day_of_week)
                const d  = new Date(ad + 'T00:00:00')
                const bc = branchColor(empBranch(w))
                return (
                  <div key={w.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                      {empName(w).slice(0,2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{empName(w)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{empBranch(w)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>วัน{DAYS_FULL[d.getDay()]}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{d.getDate()} {MONTHS_TH[d.getMonth()]}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => handleApprove(w.id)} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✓</button>
                      <button onClick={() => handleReject(w.id)}  disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>✗</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: Approve all */}
            {pendingAll.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setShowPreview(false)} style={btn}>ปิด</button>
                <button onClick={handleApproveAll} disabled={saving}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'กำลังอนุมัติ...' : `✓ อนุมัติทั้งหมด ${pendingAll.length} รายการ`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 14, padding: isMobile ? '24px 20px 32px' : 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontWeight: 800 }}>
              {modal.mode === 'add' ? '+ เพิ่มวันหยุด' : `✎ แก้ไขวันหยุด — ${empName(modal.booking)}`}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal.mode === 'add' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 5 }}>พนักงาน *</label>
                  <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">— เลือกพนักงาน —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.nickname ?? e.first_name} ({e.first_name} {e.last_name})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>วันหยุด</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
                  {DAYS_TH.map((d, i) => (
                    <button key={i} type="button" onClick={() => setForm(f => ({ ...f, day_of_week: i }))}
                      style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${form.day_of_week === i ? '#f97316' : '#e5e7eb'}`, background: form.day_of_week === i ? '#fff7ed' : '#fff', color: form.day_of_week === i ? '#f97316' : i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#374151', fontWeight: form.day_of_week === i ? 700 : 400, fontSize: '0.78rem', cursor: 'pointer' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={btn}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
              ลบวันหยุดของ <strong>{empName(deleteTarget)}</strong> วัน{DAYS_FULL[deleteTarget.day_of_week]}?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteTarget(null)} style={btn}>ยกเลิก</button>
              <button onClick={handleDelete} disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
