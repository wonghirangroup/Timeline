// admin/src/pages/weekly-off/index.tsx
// ปฏิทินจองวันหยุดประจำสัปดาห์ — Admin จัดการ Manual ได้
import { useState, useMemo } from 'react'
import { useDemoStore } from '../../stores/demoStore'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { WeeklyOffBooking, WeeklyOffStatus } from '../../types'

const DAYS_TH  = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const STATUS_CFG: Record<WeeklyOffStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  REJECTED: { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}

// branch → color
const BRANCH_COLORS = ['#f97316','#6366f1','#0891b2','#16a34a','#a21caf','#d97706','#dc2626']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function fmtDisplay(date: Date): string {
  return `${date.getDate()} ${MONTHS_TH[date.getMonth()]} ${date.getFullYear()+543}`
}

type ModalMode = 'add' | 'edit' | null

const defaultForm = {
  employee_id: '',
  full_name: '',
  nickname: '',
  branch_name: '',
  day_of_week: 1,
}

export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const {
    weeklyOffBookings, addWeeklyOff, updateWeeklyOff, deleteWeeklyOff,
    employees, branches,
  } = useDemoStore()

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i - 1)) // อา ล่วงหน้า 1 สัปดาห์ก่อน จ
  // จริงๆ แสดง จ-อา (Mon=index0 … Sun=index6)
  const weekCols = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i) // Mon+0 … Mon+6
    return { date: d, dow: d.getDay(), dateStr: fmt(d) }
  })

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d,  7))
  const toThisWeek = () => setWeekStart(getMondayOf(new Date()))

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<WeeklyOffStatus | ''>('')
  const [search, setSearch] = useState('')

  // ── Bookings in this week ─────────────────────────────────────────────────────
  const weekStartStr = fmt(weekStart)
  const weekBookings = useMemo(() =>
    weeklyOffBookings.filter(w => {
      // match week_start (Monday) — compare just date part
      const wMon = fmt(getMondayOf(new Date(w.week_start)))
      if (wMon !== weekStartStr) return false
      if (branchFilter && w.branch_name !== branchFilter) return false
      if (statusFilter && w.status !== statusFilter) return false
      if (search && !w.full_name.includes(search) && !w.nickname.includes(search)) return false
      return true
    }), [weeklyOffBookings, weekStartStr, branchFilter, statusFilter, search])

  // group by day_of_week
  const byDay = useMemo(() => {
    const map: Record<number, WeeklyOffBooking[]> = {}
    for (let d = 0; d <= 6; d++) map[d] = []
    weekBookings.forEach(w => { map[w.day_of_week]?.push(w) })
    return map
  }, [weekBookings])

  // branch color map
  const branchList = [...new Set(weeklyOffBookings.map(w => w.branch_name))]
  const branchColor = (name: string) => BRANCH_COLORS[branchList.indexOf(name) % BRANCH_COLORS.length]

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<WeeklyOffBooking | null>(null)
  const [form, setForm] = useState({ ...defaultForm })
  const [deleteTarget, setDeleteTarget] = useState<WeeklyOffBooking | null>(null)

  function openAdd(dow?: number) {
    setForm({ ...defaultForm, day_of_week: dow ?? 1 })
    setEditTarget(null)
    setModal('add')
  }

  function openEdit(w: WeeklyOffBooking) {
    setForm({
      employee_id: w.employee_id,
      full_name: w.full_name,
      nickname: w.nickname,
      branch_name: w.branch_name,
      day_of_week: w.day_of_week,
    })
    setEditTarget(w)
    setModal('edit')
  }

  function handleSave() {
    if (!form.full_name && !form.employee_id) {
      showToast('error', 'กรุณาเลือกพนักงาน')
      return
    }
    if (modal === 'add') {
      addWeeklyOff({
        id: `wo-${Date.now()}`,
        employee_id: form.employee_id,
        full_name: form.full_name,
        nickname: form.nickname,
        branch_name: form.branch_name,
        week_start: weekStartStr,
        day_of_week: form.day_of_week,
        status: 'APPROVED',
        created_at: new Date().toISOString(),
      })
      showToast('success', `เพิ่มวันหยุด ${form.nickname || form.full_name} วัน${DAYS_FULL[form.day_of_week]}`)
    } else if (editTarget) {
      updateWeeklyOff(editTarget.id, {
        full_name: form.full_name,
        nickname: form.nickname,
        branch_name: form.branch_name,
        day_of_week: form.day_of_week,
      })
      showToast('success', `ย้ายวันหยุด ${form.nickname} → ${DAYS_FULL[form.day_of_week]}`)
    }
    setModal(null)
  }

  function handleApprove(w: WeeklyOffBooking) {
    updateWeeklyOff(w.id, { status: 'APPROVED' })
    showToast('success', `อนุมัติวันหยุด ${w.nickname} วัน${DAYS_FULL[w.day_of_week]}`)
  }

  function handleReject(w: WeeklyOffBooking) {
    updateWeeklyOff(w.id, { status: 'REJECTED' })
    showToast('info', `ไม่อนุมัติวันหยุด ${w.nickname}`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteWeeklyOff(deleteTarget.id)
    showToast('success', `ลบรายการวันหยุด ${deleteTarget.nickname} แล้ว`)
    setDeleteTarget(null)
  }

  // fill employee data from employees list
  function pickEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setForm(f => ({
      ...f,
      employee_id: emp.id,
      full_name: emp.full_name,
      nickname: emp.nickname,
      branch_name: emp.branches[0] ?? '',
    }))
  }

  // ── week label ───────────────────────────────────────────────────────────────
  const weekLabel = `${fmtDisplay(weekStart)} – ${fmtDisplay(addDays(weekStart, 6))}`

  // pending count
  const pendingCount = weekBookings.filter(w => w.status === 'PENDING').length

  // ── Styles ───────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }
  const inputS: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: '13px',
    borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff',
    fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
    background: '#fff', color: '#374151', fontSize: '13px',
    cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', fontFamily: 'inherit' }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 800, color: '#111827' }}>
            📅 ปฏิทินวันหยุดประจำสัปดาห์
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            จัดการวันหยุดพนักงาน — สลับวัน / เพิ่มกระทันหัน / อนุมัติ
          </p>
        </div>
        <button onClick={() => openAdd()} style={btnPrimary}>＋ เพิ่มวันหยุดด่วน</button>
      </div>

      {/* ── Week navigation + filters ────────────────────────────────────────── */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* prev/next */}
          <button onClick={prevWeek} style={{ ...btnSecondary, padding: '6px 12px' }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151', minWidth: 200, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={nextWeek} style={{ ...btnSecondary, padding: '6px 12px' }}>›</button>
          <button onClick={toThisWeek} style={{ ...btnSecondary, fontSize: '12px', color: '#f97316', borderColor: '#fed7aa' }}>สัปดาห์นี้</button>

          <div style={{ flex: 1 }} />

          {/* filters */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ/ชื่อเล่น..."
            style={{ ...inputS, width: 160, flex: 'none' }} />
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            style={{ ...inputS, width: 160, flex: 'none' }}>
            <option value="">ทุกสาขา</option>
            {[...new Set(weeklyOffBookings.map(w => w.branch_name))].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            style={{ ...inputS, width: 130, flex: 'none' }}>
            <option value="">ทุกสถานะ</option>
            <option value="PENDING">รอพิจารณา</option>
            <option value="APPROVED">อนุมัติ</option>
            <option value="REJECTED">ไม่อนุมัติ</option>
          </select>
        </div>

        {pendingCount > 0 && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⏳ มี <strong>{pendingCount} รายการ</strong> รอการพิจารณาในสัปดาห์นี้
          </div>
        )}
      </div>

      {/* ── Calendar Grid ────────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f3f4f6' }}>
          {weekCols.map(({ date, dow, dateStr }, idx) => {
            const isToday = dateStr === fmt(new Date())
            const isSunday = dow === 0
            const isSaturday = dow === 6
            return (
              <div key={idx} style={{
                padding: '10px 8px', textAlign: 'center', borderRight: idx < 6 ? '1px solid #f3f4f6' : 'none',
                background: isToday ? '#fff7ed' : isSunday || isSaturday ? '#fafafa' : '#fff',
              }}>
                <div style={{ fontSize: '0.7rem', color: isSunday ? '#dc2626' : isSaturday ? '#2563eb' : '#9ca3af', fontWeight: 600 }}>
                  {DAYS_TH[dow]}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isToday ? '#f97316' : isSunday ? '#dc2626' : '#374151', lineHeight: 1.2, marginTop: 2 }}>
                  {date.getDate()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{MONTHS_TH[date.getMonth()]}</div>
                {isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', margin: '4px auto 0' }} />}
              </div>
            )
          })}
        </div>

        {/* Booking cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 160 }}>
          {weekCols.map(({ dow, dateStr }, idx) => {
            const dayBookings = byDay[dow] ?? []
            const isSunday = dow === 0
            const isSaturday = dow === 6
            return (
              <div
                key={idx}
                onClick={() => openAdd(dow)}
                style={{
                  padding: '8px 6px', borderRight: idx < 6 ? '1px solid #f3f4f6' : 'none',
                  background: isSunday || isSaturday ? '#fafafa' : '#fff',
                  minHeight: 120, cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fff7ed' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSunday || isSaturday ? '#fafafa' : '#fff' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayBookings.map(w => {
                    const cfg = STATUS_CFG[w.status]
                    const bc = branchColor(w.branch_name)
                    return (
                      <div
                        key={w.id}
                        onClick={e => { e.stopPropagation(); openEdit(w) }}
                        style={{
                          padding: '3px 6px', borderRadius: 6,
                          background: cfg.bg, border: `1px solid ${cfg.border}`,
                          cursor: 'pointer', transition: 'opacity 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.75' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                        title={`${w.full_name} — ${cfg.label}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: bc, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                            {w.nickname || w.full_name}
                          </span>
                        </div>
                        {w.status === 'PENDING' && (
                          <div style={{ fontSize: '0.62rem', color: '#d97706', marginTop: 1 }}>⏳ รอ</div>
                        )}
                      </div>
                    )
                  })}
                  {dayBookings.length === 0 && (
                    <div style={{ fontSize: '0.65rem', color: '#d1d5db', textAlign: 'center', marginTop: 12 }}>—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── List table ───────────────────────────────────────────────────────── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>
            รายการสัปดาห์นี้ ({weekBookings.length} รายการ)
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['พนักงาน','สาขา','วัน','สถานะ','จัดการ'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekBookings.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>ไม่มีรายการวันหยุดในสัปดาห์นี้</td></tr>
              ) : weekBookings.map(w => {
                const cfg = STATUS_CFG[w.status]
                const bc = branchColor(w.branch_name)
                return (
                  <tr key={w.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                          {w.nickname.slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{w.nickname}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{w.full_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: bc + '18', color: bc, fontWeight: 600 }}>
                        {w.branch_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: w.day_of_week === 0 ? '#dc2626' : w.day_of_week === 6 ? '#2563eb' : '#374151' }}>
                      วัน{DAYS_FULL[w.day_of_week]}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {w.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApprove(w)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✓ อนุมัติ</button>
                            <button onClick={() => handleReject(w)}  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✗ ไม่อนุมัติ</button>
                          </>
                        )}
                        <button onClick={() => openEdit(w)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✎ แก้ไข</button>
                        <button onClick={() => setDeleteTarget(w)}   style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
              {modal === 'add' ? '＋ เพิ่มวันหยุดด่วน' : '✎ แก้ไข / สลับวันหยุด'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Employee picker */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>พนักงาน</label>
                <select value={form.employee_id} onChange={e => pickEmployee(e.target.value)} style={inputS}>
                  <option value="">— เลือกพนักงาน —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.nickname} ({e.full_name})</option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>สาขา</label>
                <select value={form.branch_name} onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))} style={inputS}>
                  <option value="">— เลือกสาขา —</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Day of week */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>วันหยุด</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {DAYS_TH.map((d, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => setForm(f => ({ ...f, day_of_week: i }))}
                      style={{
                        padding: '8px 4px', borderRadius: 8, border: '1.5px solid',
                        borderColor: form.day_of_week === i ? '#f97316' : '#e5e7eb',
                        background: form.day_of_week === i ? '#fff7ed' : '#fff',
                        color: form.day_of_week === i ? '#f97316' : i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#374151',
                        fontWeight: form.day_of_week === i ? 700 : 500,
                        fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{d}</button>
                  ))}
                </div>
              </div>

              {/* สัปดาห์ */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f9fafb', fontSize: '0.8rem', color: '#6b7280' }}>
                📅 สัปดาห์: <strong style={{ color: '#374151' }}>{weekLabel}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={btnSecondary}>ยกเลิก</button>
              <button onClick={handleSave} style={btnPrimary}>
                {modal === 'add' ? 'เพิ่มวันหยุด' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>ยืนยันการลบ</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
              ลบวันหยุดของ <strong>{deleteTarget.nickname}</strong> วัน{DAYS_FULL[deleteTarget.day_of_week]} ออกจากระบบ?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteTarget(null)} style={btnSecondary}>ยกเลิก</button>
              <button onClick={handleDelete} style={{ ...btnPrimary, background: '#dc2626' }}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
