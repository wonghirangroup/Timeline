// admin/src/pages/weekly-off/index.tsx
// ปฏิทินจองวันหยุดประจำสัปดาห์ — Admin จัดการ Manual ได้ (Responsive)
import { useState, useMemo } from 'react'
import { useDemoStore } from '../../stores/demoStore'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { WeeklyOffBooking, WeeklyOffStatus } from '../../types'

const DAYS_TH   = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์']
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const STATUS_CFG: Record<WeeklyOffStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  REJECTED: { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}

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
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function fmtDisplay(date: Date): string {
  return `${date.getDate()} ${MONTHS_TH[date.getMonth()]} ${date.getFullYear()+543}`
}

type ModalMode = 'add' | 'edit' | null

const defaultForm = { employee_id: '', full_name: '', nickname: '', branch_name: '', day_of_week: 1 }

export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const { weeklyOffBookings, addWeeklyOff, updateWeeklyOff, deleteWeeklyOff, employees, branches } = useDemoStore()

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()))
  const weekCols = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: d, dow: d.getDay(), dateStr: fmt(d) }
  })
  const prevWeek    = () => setWeekStart(d => addDays(d, -7))
  const nextWeek    = () => setWeekStart(d => addDays(d,  7))
  const toThisWeek  = () => setWeekStart(getMondayOf(new Date()))
  const weekLabel   = `${fmtDisplay(weekStart)} – ${fmtDisplay(addDays(weekStart, 6))}`

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<WeeklyOffStatus | ''>('')
  const [search, setSearch]             = useState('')
  const [showFilters, setShowFilters]   = useState(false)

  // ── Selected day (mobile) ────────────────────────────────────────────────────
  const [selectedDow, setSelectedDow] = useState<number | null>(null)

  // ── Bookings ─────────────────────────────────────────────────────────────────
  const weekStartStr = fmt(weekStart)
  const weekBookings = useMemo(() =>
    weeklyOffBookings.filter(w => {
      const wMon = fmt(getMondayOf(new Date(w.week_start)))
      if (wMon !== weekStartStr) return false
      if (branchFilter && w.branch_name !== branchFilter) return false
      if (statusFilter && w.status !== statusFilter) return false
      if (search && !w.full_name.includes(search) && !w.nickname.includes(search)) return false
      return true
    }), [weeklyOffBookings, weekStartStr, branchFilter, statusFilter, search])

  const byDay = useMemo(() => {
    const map: Record<number, WeeklyOffBooking[]> = {}
    for (let d = 0; d <= 6; d++) map[d] = []
    weekBookings.forEach(w => { map[w.day_of_week]?.push(w) })
    return map
  }, [weekBookings])

  const branchList  = [...new Set(weeklyOffBookings.map(w => w.branch_name))]
  const branchColor = (name: string) => BRANCH_COLORS[branchList.indexOf(name) % BRANCH_COLORS.length]
  const pendingCount = weekBookings.filter(w => w.status === 'PENDING').length

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [modal, setModal]             = useState<ModalMode>(null)
  const [editTarget, setEditTarget]   = useState<WeeklyOffBooking | null>(null)
  const [form, setForm]               = useState({ ...defaultForm })
  const [deleteTarget, setDeleteTarget] = useState<WeeklyOffBooking | null>(null)

  function openAdd(dow?: number) {
    setForm({ ...defaultForm, day_of_week: dow ?? 1 })
    setEditTarget(null); setModal('add')
  }
  function openEdit(w: WeeklyOffBooking) {
    setForm({ employee_id: w.employee_id, full_name: w.full_name, nickname: w.nickname, branch_name: w.branch_name, day_of_week: w.day_of_week })
    setEditTarget(w); setModal('edit')
  }
  function handleSave() {
    if (!form.full_name && !form.employee_id) { showToast('error', 'กรุณาเลือกพนักงาน'); return }
    if (modal === 'add') {
      addWeeklyOff({ id: `wo-${Date.now()}`, employee_id: form.employee_id, full_name: form.full_name, nickname: form.nickname, branch_name: form.branch_name, week_start: weekStartStr, day_of_week: form.day_of_week, status: 'APPROVED', created_at: new Date().toISOString() })
      showToast('success', `เพิ่มวันหยุด ${form.nickname || form.full_name} วัน${DAYS_FULL[form.day_of_week]}`)
    } else if (editTarget) {
      updateWeeklyOff(editTarget.id, { full_name: form.full_name, nickname: form.nickname, branch_name: form.branch_name, day_of_week: form.day_of_week })
      showToast('success', `ย้ายวันหยุด ${form.nickname} → ${DAYS_FULL[form.day_of_week]}`)
    }
    setModal(null)
  }
  function handleApprove(w: WeeklyOffBooking) { updateWeeklyOff(w.id, { status: 'APPROVED' }); showToast('success', `อนุมัติวันหยุด ${w.nickname}`) }
  function handleReject(w: WeeklyOffBooking)  { updateWeeklyOff(w.id, { status: 'REJECTED' }); showToast('info', `ไม่อนุมัติวันหยุด ${w.nickname}`) }
  function handleDelete() {
    if (!deleteTarget) return
    deleteWeeklyOff(deleteTarget.id); showToast('success', `ลบรายการวันหยุด ${deleteTarget.nickname} แล้ว`); setDeleteTarget(null)
  }
  function pickEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    setForm(f => ({ ...f, employee_id: emp.id, full_name: emp.full_name, nickname: emp.nickname, branch_name: emp.branches[0] ?? '' }))
  }

  // ── Shared styles ────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
  const inputS: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 8, border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }
  const btnSecondary: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }

  // ── Selected day bookings (mobile) ────────────────────────────────────────────
  const selectedDayBookings = selectedDow !== null ? (byDay[selectedDow] ?? []) : []
  const selectedDayCol = selectedDow !== null ? weekCols.find(c => c.dow === selectedDow) : null

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', fontFamily: 'inherit', maxWidth: 1200 }}>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.35rem', fontWeight: 800, color: '#111827' }}>
            📅 ปฏิทินวันหยุดสัปดาห์
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
            สลับวันหยุด / เพิ่มกระทันหัน / อนุมัติ-ปฏิเสธ
          </p>
        </div>
        <button onClick={() => openAdd()} style={{ ...btnPrimary, fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '8px 14px' : '9px 18px' }}>
          ＋ เพิ่มวันหยุดด่วน
        </button>
      </div>

      {/* ── Week navigation ──────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: isMobile ? '12px' : '14px 18px', marginBottom: 12 }}>
        {/* Row 1: nav + this week */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={prevWeek} style={{ ...btnSecondary, padding: '7px 13px', fontSize: '1rem', lineHeight: 1 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.9rem', color: '#374151', flex: 1, textAlign: 'center', minWidth: 0 }}>
            {isMobile
              ? `${weekStart.getDate()} ${MONTHS_TH[weekStart.getMonth()]} – ${addDays(weekStart,6).getDate()} ${MONTHS_TH[addDays(weekStart,6).getMonth()]} ${weekStart.getFullYear()+543}`
              : weekLabel}
          </span>
          <button onClick={nextWeek} style={{ ...btnSecondary, padding: '7px 13px', fontSize: '1rem', lineHeight: 1 }}>›</button>
          <button onClick={toThisWeek} style={{ ...btnSecondary, fontSize: '12px', color: '#f97316', borderColor: '#fed7aa', padding: '7px 12px' }}>สัปดาห์นี้</button>
          {isMobile && (
            <button
              onClick={() => setShowFilters(f => !f)}
              style={{ ...btnSecondary, fontSize: '12px', padding: '7px 12px', borderColor: showFilters ? '#f97316' : '#e5e7eb', color: showFilters ? '#f97316' : '#374151' }}
            >
              🔍 {showFilters ? 'ซ่อน' : 'กรอง'}
            </button>
          )}
        </div>

        {/* Filters — desktop always show, mobile toggle */}
        {(!isMobile || showFilters) && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ/ชื่อเล่น..."
              style={{ ...inputS, gridColumn: isMobile ? 'span 2' : undefined }} />
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={inputS}>
              <option value="">ทุกสาขา</option>
              {[...new Set(weeklyOffBookings.map(w => w.branch_name))].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={inputS}>
              <option value="">ทุกสถานะ</option>
              <option value="PENDING">รอพิจารณา</option>
              <option value="APPROVED">อนุมัติ</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
            </select>
          </div>
        )}

        {pendingCount > 0 && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fcd34d', fontSize: '0.78rem', color: '#92400e' }}>
            ⏳ มี <strong>{pendingCount} รายการ</strong> รอการพิจารณาในสัปดาห์นี้
          </div>
        )}
      </div>

      {/* ── Calendar Grid ────────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f3f4f6' }}>
          {weekCols.map(({ date, dow, dateStr }, idx) => {
            const isToday    = dateStr === fmt(new Date())
            const isSunday   = dow === 0
            const isSaturday = dow === 6
            const isSelected = isMobile && selectedDow === dow
            return (
              <div
                key={idx}
                onClick={() => {
                  if (isMobile) setSelectedDow(p => p === dow ? null : dow)
                  else openAdd(dow)
                }}
                style={{
                  padding: isMobile ? '8px 4px' : '10px 6px', textAlign: 'center',
                  borderRight: idx < 6 ? '1px solid #f3f4f6' : 'none',
                  background: isSelected ? '#fff7ed' : isToday ? '#fff7ed' : isSunday || isSaturday ? '#fafafa' : '#fff',
                  cursor: 'pointer', transition: 'background 0.12s',
                  borderBottom: isSelected ? '2px solid #f97316' : '2px solid transparent',
                }}
              >
                <div style={{ fontSize: isMobile ? '0.65rem' : '0.7rem', color: isSunday ? '#dc2626' : isSaturday ? '#2563eb' : '#9ca3af', fontWeight: 600 }}>
                  {DAYS_TH[dow]}
                </div>
                <div style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: isToday ? '#f97316' : isSunday ? '#dc2626' : '#374151', lineHeight: 1.2, marginTop: 2 }}>
                  {date.getDate()}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{MONTHS_TH[date.getMonth()]}</div>
                )}
                {isToday && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316', margin: '3px auto 0' }} />}
              </div>
            )
          })}
        </div>

        {/* ── Mobile: tap a day → show bookings panel below header ──────────── */}
        {isMobile ? (
          <>
            {/* Count row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: selectedDow !== null ? '1px solid #f3f4f6' : 'none' }}>
              {weekCols.map(({ dow }, idx) => {
                const count      = (byDay[dow] ?? []).length
                const pending    = (byDay[dow] ?? []).filter(w => w.status === 'PENDING').length
                const isSelected = selectedDow === dow
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDow(p => p === dow ? null : dow)}
                    style={{
                      padding: '6px 2px', textAlign: 'center',
                      borderRight: idx < 6 ? '1px solid #f3f4f6' : 'none',
                      background: isSelected ? '#fff7ed' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {count > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151' }}>{count}</div>
                        {pending > 0 && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.6rem', color: '#e5e7eb' }}>—</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Selected day detail panel */}
            {selectedDow !== null && selectedDayCol && (
              <div style={{ padding: '12px 14px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151' }}>
                    วัน{DAYS_FULL[selectedDow]} {selectedDayCol.date.getDate()} {MONTHS_TH[selectedDayCol.date.getMonth()]}
                  </span>
                  <button onClick={() => openAdd(selectedDow)} style={{ ...btnPrimary, padding: '5px 12px', fontSize: '12px' }}>
                    ＋ เพิ่ม
                  </button>
                </div>
                {selectedDayBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', padding: '12px 0' }}>ไม่มีวันหยุดวันนี้</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDayBookings.map(w => {
                      const cfg = STATUS_CFG[w.status]
                      const bc  = branchColor(w.branch_name)
                      return (
                        <div key={w.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${cfg.border}`, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                                {w.nickname.slice(0,2)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{w.nickname}</div>
                                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{w.full_name}</div>
                              </div>
                            </div>
                            <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {w.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(w)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✓ อนุมัติ</button>
                                <button onClick={() => handleReject(w)}  style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✗ ปฏิเสธ</button>
                              </>
                            )}
                            <button onClick={() => openEdit(w)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✎ แก้ไข</button>
                            <button onClick={() => setDeleteTarget(w)}   style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Desktop: booking cells ──────────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 160 }}>
            {weekCols.map(({ dow }, idx) => {
              const dayBookings = byDay[dow] ?? []
              const isSunday   = dow === 0
              const isSaturday = dow === 6
              return (
                <div
                  key={idx}
                  onClick={() => openAdd(dow)}
                  style={{
                    padding: '8px 6px', borderRight: idx < 6 ? '1px solid #f3f4f6' : 'none',
                    background: isSunday || isSaturday ? '#fafafa' : '#fff',
                    minHeight: 120, cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fff7ed' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSunday || isSaturday ? '#fafafa' : '#fff' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayBookings.map(w => {
                      const cfg = STATUS_CFG[w.status]
                      const bc  = branchColor(w.branch_name)
                      return (
                        <div
                          key={w.id}
                          onClick={e => { e.stopPropagation(); openEdit(w) }}
                          style={{ padding: '3px 6px', borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer', transition: 'opacity 0.1s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                          title={`${w.full_name} — ${cfg.label}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: bc, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
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
                      <div style={{ fontSize: '0.65rem', color: '#d1d5db', textAlign: 'center', marginTop: 14 }}>—</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── List: desktop = table, mobile = cards ────────────────────────────── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151' }}>
            รายการสัปดาห์นี้ ({weekBookings.length} รายการ)
          </span>
        </div>

        {weekBookings.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
            ไม่มีรายการวันหยุดในสัปดาห์นี้
          </div>
        ) : isMobile ? (
          /* ── Mobile Cards ─────────────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {weekBookings.map((w, i) => {
              const cfg = STATUS_CFG[w.status]
              const bc  = branchColor(w.branch_name)
              return (
                <div key={w.id} style={{ padding: '12px 14px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  {/* Row 1: avatar + name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                      {w.nickname.slice(0,2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{w.nickname}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.full_name}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                  </div>
                  {/* Row 2: branch + day */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: bc + '18', color: bc, fontWeight: 600 }}>{w.branch_name}</span>
                    <span style={{ fontSize: '0.78rem', color: w.day_of_week === 0 ? '#dc2626' : w.day_of_week === 6 ? '#2563eb' : '#374151', fontWeight: 600 }}>
                      วัน{DAYS_FULL[w.day_of_week]}
                    </span>
                  </div>
                  {/* Row 3: actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {w.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleApprove(w)} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✓ อนุมัติ</button>
                        <button onClick={() => handleReject(w)}  style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✗ ปฏิเสธ</button>
                      </>
                    )}
                    <button onClick={() => openEdit(w)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✎ แก้ไข</button>
                    <button onClick={() => setDeleteTarget(w)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Desktop Table ────────────────────────────────────────────── */
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
                {weekBookings.map(w => {
                  const cfg = STATUS_CFG[w.status]
                  const bc  = branchColor(w.branch_name)
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
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: bc + '18', color: bc, fontWeight: 600 }}>{w.branch_name}</span>
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
                          <button onClick={() => setDeleteTarget(w)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}>
          <div style={{
            background: '#fff',
            borderRadius: isMobile ? '20px 20px 0 0' : 16,
            padding: isMobile ? '20px 18px 28px' : 28,
            width: '100%', maxWidth: isMobile ? '100%' : 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* drag handle (mobile) */}
            {isMobile && <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 16px' }} />}
            <h3 style={{ margin: '0 0 18px', fontSize: isMobile ? '1rem' : '1.05rem', fontWeight: 800, color: '#111827' }}>
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
                    <button key={i} type="button" onClick={() => setForm(f => ({ ...f, day_of_week: i }))}
                      style={{
                        padding: isMobile ? '10px 4px' : '8px 4px', borderRadius: 8, border: '1.5px solid',
                        borderColor: form.day_of_week === i ? '#f97316' : '#e5e7eb',
                        background: form.day_of_week === i ? '#fff7ed' : '#fff',
                        color: form.day_of_week === i ? '#f97316' : i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#374151',
                        fontWeight: form.day_of_week === i ? 700 : 500,
                        fontSize: isMobile ? '0.82rem' : '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                      }}>{d}</button>
                  ))}
                </div>
              </div>
              {/* Week label */}
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f9fafb', fontSize: '0.8rem', color: '#6b7280' }}>
                📅 สัปดาห์: <strong style={{ color: '#374151' }}>{weekLabel}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ ...btnSecondary, flex: isMobile ? 1 : undefined, textAlign: 'center' }}>ยกเลิก</button>
              <button onClick={handleSave} style={{ ...btnPrimary, flex: isMobile ? 1 : undefined, textAlign: 'center' }}>
                {modal === 'add' ? 'เพิ่มวันหยุด' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16, padding: isMobile ? '24px 20px 32px' : 28, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            {isMobile && <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 16px' }} />}
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>ยืนยันการลบ</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
              ลบวันหยุดของ <strong>{deleteTarget.nickname}</strong> วัน{DAYS_FULL[deleteTarget.day_of_week]} ออกจากระบบ?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ ...btnSecondary, flex: isMobile ? 1 : undefined }}>ยกเลิก</button>
              <button onClick={handleDelete} style={{ ...btnPrimary, background: '#dc2626', flex: isMobile ? 1 : undefined }}>ลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
