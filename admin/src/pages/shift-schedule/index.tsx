// admin/src/pages/shift-schedule/index.tsx
// ตารางกะพนักงานรายสัปดาห์ — Option B: Individual Day Assignment
import { useState, useRef, useEffect } from 'react'
import { useDemoStore } from '../../stores/demoStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ShiftAssignment, ShiftAssignmentType, Employee, ShiftDef } from '../../types'

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d.getTime() + diff * 86400000)
  return mon.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', ...opts })
}

const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

// ── Assignment type config ────────────────────────────────────────────────────
const TYPE_CFG: Record<ShiftAssignmentType, { label: string; bg: string; color: string; border: string }> = {
  WORK:       { label: 'ทำงาน',            bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  DAY_OFF:    { label: 'หยุด',             bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  WEEKLY_OFF: { label: 'หยุดประจำสัปดาห์', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  HOLIDAY:    { label: 'หยุดนักขัตฤกษ์',  bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShiftSchedulePage() {
  const isMobile = useIsMobile()
  const store = useDemoStore()
  const { employees, branches, shifts, shiftAssignments, upsertShiftAssignment, deleteShiftAssignment } = store

  const TODAY = '2026-05-26'
  const [weekStart, setWeekStart] = useState(() => getMondayOf(TODAY))
  const [filterBranch, setFilterBranch] = useState('ALL')
  const [editCell, setEditCell] = useState<{ empId: string; date: string } | null>(null)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const popupRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // week dates: Mon … Sun
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // filtered employees
  const filteredEmps = filterBranch === 'ALL'
    ? employees.filter(e => e.status === 'ACTIVE')
    : employees.filter(e => e.status === 'ACTIVE' && e.branches.some(b => b === filterBranch))

  // lookup helpers
  function getAssignment(empId: string, date: string): ShiftAssignment | undefined {
    return shiftAssignments.find(a => a.employee_id === empId && a.date === date)
  }

  function getShiftsForEmp(emp: Employee): ShiftDef[] {
    return shifts.filter(s => emp.branches.includes(s.branch_name))
  }

  // week nav
  function prevWeek() { setWeekStart(addDays(weekStart, -7)) }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)) }
  function goToday()  { setWeekStart(getMondayOf(TODAY)) }

  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${formatDate(weekStart, { day: 'numeric', month: 'short' })} – ${formatDate(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' })}`

  // close popup on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setEditCell(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openEdit(e: React.MouseEvent<HTMLButtonElement>, empId: string, date: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const tableRect = tableRef.current?.getBoundingClientRect()
    const scrollTop = tableRef.current?.scrollTop ?? 0
    const scrollLeft = tableRef.current?.scrollLeft ?? 0
    const top = rect.bottom + window.scrollY - (tableRect?.top ?? 0) + scrollTop + 4
    const left = rect.left - (tableRect?.left ?? 0) + scrollLeft
    setPopupPos({ top, left })
    setEditCell({ empId, date })
  }

  function handleSave(empId: string, date: string, type: ShiftAssignmentType, shiftId: string | null) {
    const id = `sa-${empId}-${date}`
    upsertShiftAssignment({ id, employee_id: empId, date, shift_id: shiftId, type })
    setEditCell(null)
  }

  function handleClear(empId: string, date: string) {
    const id = `sa-${empId}-${date}`
    deleteShiftAssignment(id)
    setEditCell(null)
  }

  // ── Popup content ─────────────────────────────────────────────────────────
  function EditPopup({ empId, date }: { empId: string; date: string }) {
    const emp = employees.find(e => e.id === empId)
    const empShifts = emp ? getShiftsForEmp(emp) : []
    const current = getAssignment(empId, date)

    return (
      <div ref={popupRef} style={{
        position: 'absolute', top: popupPos.top, left: popupPos.left,
        zIndex: 999, background: '#fff', border: '1px solid #e5e7eb',
        borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: 220, padding: '10px 0', fontSize: 13,
      }}>
        <div style={{ padding: '4px 14px 8px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
          {emp?.nickname} · {formatDate(date, { day: 'numeric', month: 'short', weekday: 'short' })}
        </div>

        {/* Shifts */}
        {empShifts.length > 0 && (
          <>
            <div style={{ padding: '6px 14px 2px', fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>กะทำงาน</div>
            {empShifts.map(sh => (
              <button key={sh.id} onClick={() => handleSave(empId, date, 'WORK', sh.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 14px', border: 'none',
                  background: current?.shift_id === sh.id ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                <span style={{ color: '#374151' }}>{sh.name}</span>
                <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 'auto' }}>{sh.start_time}–{sh.end_time}</span>
              </button>
            ))}
          </>
        )}

        {/* Day types */}
        <div style={{ padding: '6px 14px 2px', fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ประเภทวัน</div>
        {(['DAY_OFF', 'WEEKLY_OFF', 'HOLIDAY'] as ShiftAssignmentType[]).map(t => {
          const cfg = TYPE_CFG[t]
          return (
            <button key={t} onClick={() => handleSave(empId, date, t, null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 14px', border: 'none',
                background: current?.type === t && current?.shift_id === null ? '#f9fafb' : 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 11, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            </button>
          )
        })}

        {/* Clear */}
        {current && (
          <>
            <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
            <button onClick={() => handleClear(empId, date)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 14px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', fontSize: 13 }}>
              ✕ ล้างการกำหนด
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Cell renderer ─────────────────────────────────────────────────────────
  function Cell({ emp, date }: { emp: Employee; date: string }) {
    const a = getAssignment(emp.id, date)
    const isToday = date === TODAY
    const isEditOpen = editCell?.empId === emp.id && editCell?.date === date

    let content: React.ReactNode
    if (!a) {
      content = <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
    } else if (a.type === 'WORK' && a.shift_id) {
      const sh = shifts.find(s => s.id === a.shift_id)
      content = (
        <span style={{ padding: '2px 6px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>
          {sh?.name ?? 'กะ'}
        </span>
      )
    } else {
      const cfg = TYPE_CFG[a.type]
      content = (
        <span style={{ padding: '2px 5px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
          {a.type === 'DAY_OFF' ? 'หยุด' : a.type === 'WEEKLY_OFF' ? 'OFF' : 'หยุดฯ'}
        </span>
      )
    }

    return (
      <td style={{
        padding: 4, textAlign: 'center', verticalAlign: 'middle',
        background: isToday ? '#fefce8' : isEditOpen ? '#f9fafb' : undefined,
        borderRight: '1px solid #f3f4f6',
        minWidth: isMobile ? 56 : 76,
      }}>
        <button onClick={e => openEdit(e, emp.id, date)} style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          borderRadius: 6, padding: '4px 2px', width: '100%',
          minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {content}
        </button>
      </td>
    )
  }

  // ── Stats bar ──────────────────────────────────────────────────────────────
  const weekAssignments = shiftAssignments.filter(a => weekDates.includes(a.date))
  const workCount = weekAssignments.filter(a => a.type === 'WORK').length
  const offCount  = weekAssignments.filter(a => a.type === 'WEEKLY_OFF' || a.type === 'DAY_OFF').length
  const totalCells = filteredEmps.length * 7

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#111827' }}>
            📅 ตารางกะพนักงาน
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            กำหนดกะทำงาน / วันหยุดรายคนรายวัน
          </p>
        </div>

        {/* Branch filter */}
        <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            <option value="ALL">ทุกสาขา</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={prevWeek} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
          ‹ ก่อนหน้า
        </button>
        <span style={{ fontWeight: 600, color: '#374151', fontSize: 14, minWidth: 180, textAlign: 'center' }}>
          {weekLabel}
        </span>
        <button onClick={nextWeek} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
          ถัดไป ›
        </button>
        <button onClick={goToday} style={{ padding: '6px 12px', border: '1px solid #6366f1', borderRadius: 8, background: '#f5f3ff', cursor: 'pointer', fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
          วันนี้
        </button>

        {/* Stats */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 12 }}>
          <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#15803d', borderRadius: 6, fontWeight: 600 }}>
            ✅ ทำงาน {workCount}
          </span>
          <span style={{ padding: '4px 10px', background: '#fff7ed', color: '#c2410c', borderRadius: 6, fontWeight: 600 }}>
            🏖 หยุด {offCount}
          </span>
          <span style={{ padding: '4px 10px', background: '#f3f4f6', color: '#6b7280', borderRadius: 6, fontWeight: 600 }}>
            ว่าง {totalCells - workCount - offCount}
          </span>
        </div>
      </div>

      {/* Table container */}
      <div ref={tableRef} style={{ overflowX: 'auto', position: 'relative', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {/* Employee col */}
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap', minWidth: 140, position: 'sticky', left: 0, background: '#f9fafb', zIndex: 2 }}>
                พนักงาน
              </th>
              {weekDates.map(date => {
                const dow = new Date(date).getDay()
                const isToday = date === TODAY
                return (
                  <th key={date} style={{
                    padding: '8px 4px', textAlign: 'center', fontSize: 12,
                    color: isToday ? '#6366f1' : dow === 0 ? '#ef4444' : '#6b7280',
                    fontWeight: isToday ? 700 : 600,
                    borderRight: '1px solid #f3f4f6',
                    minWidth: isMobile ? 56 : 76,
                    background: isToday ? '#fefce8' : undefined,
                  }}>
                    <div style={{ fontWeight: 700 }}>{DAY_SHORT[dow]}</div>
                    <div style={{ fontSize: 11, marginTop: 1 }}>
                      {new Date(date).getDate()}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredEmps.map((emp, idx) => (
              <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                {/* Employee name — sticky left */}
                <td style={{ padding: '8px 14px', borderRight: '1px solid #e5e7eb', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fafafa', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                      {emp.nickname.slice(0, 1)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                        {emp.nickname}
                        {emp.employment_type === 'PART_TIME' && (
                          <span style={{ marginLeft: 4, padding: '0 4px', fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700 }}>PT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {emp.branches[0]}
                      </div>
                    </div>
                  </div>
                </td>
                {/* Day cells */}
                {weekDates.map(date => (
                  <Cell key={date} emp={emp} date={date} />
                ))}
              </tr>
            ))}
            {filteredEmps.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  ไม่พบพนักงานในสาขาที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Edit popup */}
        {editCell && <EditPopup empId={editCell.empId} date={editCell.date} />}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>คลิกที่ช่องเพื่อกำหนด:</span>
        {Object.entries(TYPE_CFG).map(([t, cfg]) => (
          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ padding: '2px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 600 }}>
              {cfg.label}
            </span>
          </span>
        ))}
        <span style={{ color: '#9ca3af' }}>—</span>
        <span style={{ color: '#9ca3af', fontSize: 12 }}>ยังไม่ได้กำหนด (คลิกเพื่อเพิ่ม)</span>
        <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 11 }}>PT = พนักงาน Part-Time</span>
      </div>

      {/* Part-time info panel */}
      {filteredEmps.some(e => e.employment_type === 'PART_TIME') && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 6 }}>⏰ พนักงาน Part-Time ในสัปดาห์นี้</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {filteredEmps.filter(e => e.employment_type === 'PART_TIME').map(emp => {
              const worked = weekDates.filter(d => {
                const a = getAssignment(emp.id, d)
                return a?.type === 'WORK'
              }).length
              return (
                <div key={emp.id} style={{ color: '#78350f' }}>
                  <span style={{ fontWeight: 600 }}>{emp.nickname}</span>
                  {' '}· วันทำงาน {worked} วัน
                  {emp.hourly_rate && <span style={{ color: '#92400e' }}> · ฿{emp.hourly_rate}/ชม.</span>}
                  <span style={{ color: '#b45309' }}> (บันทึกชั่วโมงจริงตอนเช็คอิน/เอาต์)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
