// admin/src/pages/shift-schedule/index.tsx
// ตารางกะ — Default Shift + Override เฉพาะวัน
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useDemoStore } from '../../stores/demoStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ShiftAssignment, ShiftAssignmentType, Employee, ShiftDef } from '../../types'

// ── Date helpers ───────────────────────────────────────────────────────────────
function getMondayOf(d: string) {
  const dt = new Date(d), dow = dt.getDay()
  dt.setDate(dt.getDate() + (dow === 0 ? -6 : 1 - dow))
  return dt.toISOString().slice(0, 10)
}
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10)
}
function fmt(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', ...opts })
}
function getDaysInMonth(y: number, m: number) {
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) =>
    `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)
}

const DAY_SHORT  = ['อา','จ','อ','พ','พฤ','ศ','ส']
const MONTH_FULL = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const TYPE_CFG: Record<ShiftAssignmentType, { label: string; short: string; bg: string; color: string; border: string }> = {
  WORK:       { label: 'ทำงาน',            short: 'W',   bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  DAY_OFF:    { label: 'หยุดพัก',          short: '–',   bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  WEEKLY_OFF: { label: 'หยุดประจำสัปดาห์', short: 'OFF', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  HOLIDAY:    { label: 'หยุดนักขัตฤกษ์',  short: 'H',   bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
}

// ── Effective assignment (default fallback) ────────────────────────────────────
type EffectiveResult = {
  assignment: Omit<ShiftAssignment, 'id'> & { id: string }
  isDefault: boolean   // true = ใช้กะประจำ (ไม่มี override)
  isOff: boolean       // true = วันหยุด (ตาม default_work_days)
} | null

function getEffective(
  empId: string, date: string,
  shiftAssignments: ShiftAssignment[],
  employees: Employee[],
): EffectiveResult {
  // 1. มี override เฉพาะวันนี้ → ใช้เลย
  const specific = shiftAssignments.find(a => a.employee_id === empId && a.date === date)
  if (specific) return { assignment: specific, isDefault: false, isOff: specific.type !== 'WORK' }

  // 2. ดู default shift ของพนักงาน
  const emp = employees.find(e => e.id === empId)
  if (!emp?.default_shift_id) return null

  const dow      = new Date(date).getDay()
  const workDays = emp.default_work_days ?? [1,2,3,4,5]

  if (!workDays.includes(dow)) {
    // วันนอก work_days → หยุดตามปกติ (default off)
    return {
      assignment: { id: `def-off-${empId}-${date}`, employee_id: empId, date, shift_id: null, type: 'DAY_OFF' },
      isDefault: true, isOff: true,
    }
  }

  // วันทำงาน → กะประจำ
  return {
    assignment: { id: `def-${empId}-${date}`, employee_id: empId, date, shift_id: emp.default_shift_id, type: 'WORK' },
    isDefault: true, isOff: false,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShiftSchedulePage() {
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const { employees, branches, shifts, shiftAssignments, upsertShiftAssignment, deleteShiftAssignment } = useDemoStore()

  const TODAY = '2026-05-27'
  const [viewMode, setViewMode]   = useState<'week'|'month'>('week')
  const [weekStart, setWeekStart] = useState(() => getMondayOf(TODAY))
  const [selMonth, setSelMonth]   = useState(() => { const d = new Date(TODAY); return { y: d.getFullYear(), m: d.getMonth()+1 } })
  const [filterBranch, setFilterBranch] = useState('ALL')
  const [page, setPage]           = useState(1)
  const pageSize                  = 6
  const [editCell, setEditCell]   = useState<{ empId: string; date: string }|null>(null)
  const [popupPos, setPopupPos]   = useState({ top: 0, left: 0 })
  const [highlightEmp, setHighlightEmp] = useState<string|null>(null)
  const popupRef  = useRef<HTMLDivElement>(null)
  const tableRef  = useRef<HTMLDivElement>(null)
  const empRowRef = useRef<HTMLDivElement|null>(null)

  const weekDates  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthDates = getDaysInMonth(selMonth.y, selMonth.m)
  const displayDates = viewMode === 'week' ? weekDates : monthDates

  const filteredEmps = filterBranch === 'ALL'
    ? employees.filter(e => e.status === 'ACTIVE')
    : employees.filter(e => e.status === 'ACTIVE' && e.branches.includes(filterBranch))

  const totalPages = Math.ceil(filteredEmps.length / pageSize)
  const paginatedEmps = filteredEmps.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [filterBranch, viewMode, weekStart, selMonth])

  function getShiftsForEmp(emp: Employee): ShiftDef[] {
    return shifts.filter(s => emp.branches.includes(s.branch_name))
  }

  // nav
  const weekEnd   = addDays(weekStart, 6)
  const weekLabel = `${fmt(weekStart, { day:'numeric', month:'short' })} – ${fmt(weekEnd, { day:'numeric', month:'short', year:'numeric' })}`
  const periodLabel = viewMode === 'week' ? weekLabel : `${MONTH_FULL[selMonth.m]} ${selMonth.y + 543}`

  function prevPeriod() { viewMode==='week' ? setWeekStart(addDays(weekStart,-7)) : setSelMonth(({y,m})=>m===1?{y:y-1,m:12}:{y,m:m-1}) }
  function nextPeriod() { viewMode==='week' ? setWeekStart(addDays(weekStart, 7)) : setSelMonth(({y,m})=>m===12?{y:y+1,m:1}:{y,m:m+1}) }
  function goToday()    { setWeekStart(getMondayOf(TODAY)); const d=new Date(TODAY); setSelMonth({y:d.getFullYear(),m:d.getMonth()+1}) }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (popupRef.current && !popupRef.current.contains(e.target as Node)) setEditCell(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── รับ ?emp= จาก Employee page → highlight + scroll ──────────────────────
  useEffect(() => {
    const empId = searchParams.get('emp')
    if (!empId) return
    setHighlightEmp(empId)
    // ล้าง param ออกจาก URL ไม่ให้ค้าง
    setSearchParams({}, { replace: true })
    // scroll หา row หลังจาก render
    const t = setTimeout(() => {
      empRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    // หยุด highlight หลัง 3 วินาที
    const t2 = setTimeout(() => setHighlightEmp(null), 3500)
    return () => { clearTimeout(t); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openEdit(e: React.MouseEvent<HTMLButtonElement>, empId: string, date: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const t = tableRef.current?.getBoundingClientRect()
    setPopupPos({ top: r.bottom + window.scrollY - (t?.top??0) + (tableRef.current?.scrollTop??0) + 4, left: r.left - (t?.left??0) + (tableRef.current?.scrollLeft??0) })
    setEditCell({ empId, date })
  }

  function handleSave(empId: string, date: string, type: ShiftAssignmentType, shiftId: string|null) {
    // ตรวจว่า override ตรงกับ default หรือเปล่า → ถ้าตรง ไม่ต้องบันทึก (ล้างออก)
    upsertShiftAssignment({ id: `sa-${empId}-${date}`, employee_id: empId, date, shift_id: shiftId, type })
    setEditCell(null)
  }

  // ล้าง override → กลับใช้กะประจำ
  function handleResetToDefault(empId: string, date: string) {
    deleteShiftAssignment(`sa-${empId}-${date}`)
    setEditCell(null)
  }

  // ── Edit Popup ────────────────────────────────────────────────────────────
  function EditPopup({ empId, date }: { empId: string; date: string }) {
    const emp       = employees.find(e => e.id === empId)
    const empShifts = emp ? getShiftsForEmp(emp) : []
    const effective = getEffective(empId, date, shiftAssignments, employees)
    const hasOverride = shiftAssignments.some(a => a.employee_id === empId && a.date === date)
    const defaultShift = emp?.default_shift_id ? shifts.find(s => s.id === emp.default_shift_id) : null

    return (
      <div ref={popupRef} style={{
        position:'absolute', top:popupPos.top, left:popupPos.left, zIndex:999,
        background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
        boxShadow:'0 8px 24px rgba(0,0,0,0.12)', minWidth:240, padding:'10px 0', fontSize:13,
      }}>
        {/* Header */}
        <div style={{ padding:'4px 14px 8px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontWeight:600, color:'#374151' }}>
            {emp?.nickname} · {fmt(date, { day:'numeric', month:'short', weekday:'short' })}
          </div>
          {/* แสดงสถานะปัจจุบัน */}
          {effective?.isDefault && !effective.isOff && (
            <div style={{ fontSize:11, color:'#6366f1', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <span>◌</span>
              <span>กะประจำ: {defaultShift?.name} {defaultShift?.start_time}</span>
            </div>
          )}
          {hasOverride && (
            <div style={{ fontSize:11, color:'#f97316', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <span>✏️</span>
              <span>มีการเปลี่ยนแปลงเฉพาะวันนี้</span>
            </div>
          )}
        </div>

        {/* กะทำงาน */}
        {empShifts.length > 0 && (
          <>
            <div style={{ padding:'6px 14px 2px', fontSize:11, color:'#9ca3af', fontWeight:600 }}>กะทำงาน</div>
            {empShifts.map(sh => {
              const isActive = effective?.assignment.shift_id === sh.id
              const isDefault = isActive && effective?.isDefault
              return (
                <button key={sh.id} onClick={() => handleSave(empId, date, 'WORK', sh.id)} style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'7px 14px', border:'none',
                  background: isActive ? '#f0fdf4' : 'transparent',
                  cursor:'pointer', textAlign:'left',
                }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background: isActive ? '#22c55e' : '#d1d5db', flexShrink:0 }} />
                  <span style={{ color:'#374151', fontWeight: isActive ? 600 : 400 }}>{sh.name}</span>
                  <span style={{ color:'#9ca3af', fontSize:11, marginLeft:'auto' }}>{sh.start_time}–{sh.end_time}</span>
                  {isDefault && <span style={{ fontSize:10, color:'#6366f1', background:'#e0e7ff', borderRadius:4, padding:'0 5px' }}>ประจำ</span>}
                </button>
              )
            })}
          </>
        )}

        {/* ประเภทวัน */}
        <div style={{ padding:'6px 14px 2px', fontSize:11, color:'#9ca3af', fontWeight:600 }}>ตั้งเป็นวันหยุด</div>
        {(['DAY_OFF','WEEKLY_OFF','HOLIDAY'] as ShiftAssignmentType[]).map(t => {
          const cfg = TYPE_CFG[t]
          const isActive = effective?.assignment.type === t && !effective.assignment.shift_id
          return (
            <button key={t} onClick={() => handleSave(empId, date, t, null)} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'6px 14px', border:'none', background: isActive ? '#f9fafb' : 'transparent', cursor:'pointer', textAlign:'left',
            }}>
              <span style={{ padding:'1px 6px', borderRadius:4, fontSize:11, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
              {isActive && <span style={{ fontSize:10, color:'#9ca3af', marginLeft:'auto' }}>✓</span>}
            </button>
          )
        })}

        {/* ↩ กลับกะประจำ (แสดงเฉพาะเมื่อมี override) */}
        {hasOverride && (
          <>
            <div style={{ borderTop:'1px solid #f3f4f6', margin:'4px 0' }} />
            <button onClick={() => handleResetToDefault(empId, date)} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'7px 14px', border:'none', background:'transparent', cursor:'pointer',
              color:'#6366f1', fontSize:13, fontWeight:600,
            }}>
              ↩ กลับกะประจำ
              {defaultShift && <span style={{ fontSize:11, color:'#9ca3af', fontWeight:400, marginLeft:4 }}>({defaultShift.name} {defaultShift.start_time})</span>}
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Week Cell ─────────────────────────────────────────────────────────────
  function WeekCell({ emp, date }: { emp: Employee; date: string }) {
    const eff = getEffective(emp.id, date, shiftAssignments, employees)
    const isToday    = date === TODAY
    const isEditOpen = editCell?.empId === emp.id && editCell?.date === date

    let content: React.ReactNode
    if (!eff) {
      content = <span style={{ color:'#e5e7eb', fontSize:11 }}>—</span>
    } else if (eff.isOff && eff.isDefault) {
      // วันหยุดตาม default (ไม่แสดงอะไร)
      content = <span style={{ color:'#e5e7eb', fontSize:11 }}>—</span>
    } else if (eff.assignment.type === 'WORK' && eff.assignment.shift_id) {
      const sh  = shifts.find(s => s.id === eff.assignment.shift_id)
      const bg  = eff.isDefault ? '#f0fdf4' : '#dcfce7'
      const brd = eff.isDefault ? '1px dashed #86efac' : '1px solid #86efac'
      content = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <span style={{ padding:'2px 6px', borderRadius:5, fontSize:11, fontWeight:600, background:bg, color:'#15803d', border:brd, whiteSpace:'nowrap' }}>
            {sh?.name ?? 'กะ'}
          </span>
          {eff.isDefault
            ? <span style={{ fontSize:9, color:'#a5b4fc' }}>ประจำ</span>
            : <span style={{ fontSize:9, color:'#f97316' }}>✏ เปลี่ยน</span>}
        </div>
      )
    } else {
      const cfg = TYPE_CFG[eff.assignment.type]
      content = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <span style={{ padding:'2px 5px', borderRadius:5, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' }}>
            {eff.assignment.type==='DAY_OFF'?'หยุด':eff.assignment.type==='WEEKLY_OFF'?'OFF':'หยุดฯ'}
          </span>
          {!eff.isDefault && <span style={{ fontSize:9, color:'#f97316' }}>✏ เปลี่ยน</span>}
        </div>
      )
    }

    return (
      <td style={{ padding:4, textAlign:'center', verticalAlign:'middle', background:isToday?'#fefce8':isEditOpen?'#f5f3ff':undefined, borderRight:'1px solid #f3f4f6', minWidth: isMobile ? 60 : 84 }}>
        <button onClick={e => openEdit(e, emp.id, date)} style={{ border:'none', background:'transparent', cursor:'pointer', borderRadius:6, padding:'4px 2px', width:'100%', minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {content}
        </button>
      </td>
    )
  }

  // ── Month Cell (compact) ─────────────────────────────────────────────────
  function MonthCell({ emp, date }: { emp: Employee; date: string }) {
    const eff     = getEffective(emp.id, date, shiftAssignments, employees)
    const hasOver = shiftAssignments.some(a => a.employee_id === emp.id && a.date === date)
    const isToday = date === TODAY
    const dow     = new Date(date).getDay()

    let inner: React.ReactNode
    if (!eff || (eff.isOff && eff.isDefault)) {
      inner = <span style={{ color:'#e5e7eb', fontSize:9 }}>·</span>
    } else if (eff.assignment.type === 'WORK') {
      const sh = shifts.find(s => s.id === eff.assignment.shift_id)
      inner = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background: eff.isDefault ? '#86efac' : '#22c55e', display:'block' }} />
          <span style={{ fontSize:9, color: eff.isDefault ? '#6b7280' : '#15803d', fontWeight: eff.isDefault ? 400 : 700, lineHeight:1 }}>
            {sh?.name?.slice(0,3) ?? 'W'}
          </span>
          {hasOver && <span style={{ fontSize:8, color:'#f97316' }}>✏</span>}
        </div>
      )
    } else {
      const cfg = TYPE_CFG[eff.assignment.type]
      inner = <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{TYPE_CFG[eff.assignment.type].short}</span>
    }

    return (
      <td style={{
        padding:2, textAlign:'center', verticalAlign:'middle', minWidth:40,
        background: isToday ? '#fefce8' : dow===0 ? '#fef9f9' : undefined,
        borderRight:'1px solid #f3f4f6',
        borderLeft: dow===1 ? '2px solid #e5e7eb' : undefined,
      }}>
        <button onClick={e => openEdit(e, emp.id, date)}
          title={`${emp.nickname} · ${fmt(date, { day:'numeric', month:'short', weekday:'short' })}`}
          style={{ border:'none', background:'transparent', cursor:'pointer', borderRadius:4, padding:'3px 1px', width:'100%', minHeight:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {inner}
        </button>
      </td>
    )
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  // นับจาก effective (รวมทั้ง default และ override)
  const workCount = filteredEmps.reduce((sum, emp) =>
    sum + displayDates.filter(d => { const e=getEffective(emp.id,d,shiftAssignments,employees); return e?.assignment.type==='WORK' }).length, 0)
  const offCount  = filteredEmps.reduce((sum, emp) =>
    sum + displayDates.filter(d => { const e=getEffective(emp.id,d,shiftAssignments,employees); return e && e.assignment.type!=='WORK' }).length, 0)
  const overrideCount = shiftAssignments.filter(a => displayDates.includes(a.date) && filteredEmps.some(e=>e.id===a.employee_id)).length

  return (
    <div style={{ maxWidth: viewMode==='month'?1400:1100, margin:'0 auto' }}>

      {/* Header - Title removed */}
      <div style={{ display:'flex', alignItems: isMobile?'flex-start':'center', flexDirection: isMobile?'column':'row', gap:12, marginBottom:16 }}>
        <div style={{ marginLeft: 'auto', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
            {(['week','month'] as const).map(m => (
              <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: viewMode===m?'#f97316':'#fff', color: viewMode===m?'#fff':'#6b7280' }}>
                {m==='week'?'รายสัปดาห์':'รายเดือน'}
              </button>
            ))}
          </div>
          <select value={filterBranch} onChange={e=>setFilterBranch(e.target.value)}
            style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, background:'#fff', cursor:'pointer' }}>
            <option value="ALL">ทุกสาขา</option>
            {branches.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Period nav + Stats */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button onClick={prevPeriod} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14, color:'#374151' }}>‹ ก่อนหน้า</button>
        <span style={{ fontWeight:700, color:'#111827', fontSize:15, minWidth:160, textAlign:'center' }}>{periodLabel}</span>
        <button onClick={nextPeriod} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14, color:'#374151' }}>ถัดไป ›</button>
        <button onClick={goToday} style={{ padding:'6px 12px', border:'1px solid #6366f1', borderRadius:8, background:'#f5f3ff', cursor:'pointer', fontSize:13, color:'#6366f1', fontWeight:600 }}>วันนี้</button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, fontSize:12, flexWrap:'wrap' }}>
          <span style={{ padding:'4px 10px', background:'#dcfce7', color:'#15803d', borderRadius:6, fontWeight:600 }}>✅ ทำงาน {workCount}</span>
          <span style={{ padding:'4px 10px', background:'#fff7ed', color:'#c2410c', borderRadius:6, fontWeight:600 }}>🏖 หยุด {offCount}</span>
          {overrideCount > 0 && <span style={{ padding:'4px 10px', background:'#fff7ed', color:'#ea580c', borderRadius:6, fontWeight:600 }}>✏️ เปลี่ยน {overrideCount}</span>}
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} style={{ overflowX:'auto', position:'relative', borderRadius:12, border:'1px solid #e5e7eb', background:'#fff' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', minWidth: viewMode==='week'?600:900 }}>
          <thead>
            <tr style={{ background:'#f9fafb' }}>
              <th style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:'#6b7280', fontWeight:600, borderRight:'2px solid #e5e7eb', whiteSpace:'nowrap', minWidth:130, position:'sticky', left:0, background:'#f9fafb', zIndex:2 }}>
                พนักงาน ({filteredEmps.length})
              </th>
              {viewMode==='week' ? weekDates.map(date => {
                const dow=new Date(date).getDay(), isToday=date===TODAY
                return <th key={date} style={{ padding:'8px 4px', textAlign:'center', fontSize:12, color: isToday?'#6366f1':dow===0?'#ef4444':'#6b7280', fontWeight: isToday?700:600, borderRight:'1px solid #f3f4f6', minWidth: isMobile?60:84, background: isToday?'#fefce8':undefined }}>
                  <div style={{ fontWeight:700 }}>{DAY_SHORT[dow]}</div>
                  <div style={{ fontSize:11, marginTop:1 }}>{new Date(date).getDate()}</div>
                </th>
              }) : monthDates.map(date => {
                const d=new Date(date), dow=d.getDay(), isToday=date===TODAY
                return <th key={date} style={{ padding:'5px 2px', textAlign:'center', fontSize:11, color: isToday?'#6366f1':dow===0?'#ef4444':dow===6?'#f97316':'#6b7280', fontWeight: isToday?700:500, borderRight:'1px solid #f3f4f6', borderLeft: dow===1?'2px solid #e5e7eb':undefined, minWidth:40, background: isToday?'#fefce8':dow===0?'#fef9f9':undefined }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>{d.getDate()}</div>
                  <div style={{ fontSize:9, marginTop:1 }}>{DAY_SHORT[dow]}</div>
                </th>
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedEmps.map((emp, idx) => {
              const isHighlighted = highlightEmp === emp.id
              return (
              <tr
                key={emp.id}
                ref={isHighlighted ? (el: HTMLTableRowElement | null) => { empRowRef.current = el as unknown as HTMLDivElement } : undefined}
                style={{
                  borderTop:'1px solid #f3f4f6',
                  background: isHighlighted ? '#faf5ff' : (idx%2===0?'#fff':'#fafafa'),
                  outline: isHighlighted ? '2px solid #a78bfa' : 'none',
                  outlineOffset: '-2px',
                  transition: 'background 0.5s, outline 0.5s',
                }}
              >
                <td style={{ padding:'8px 14px', borderRight:'2px solid #e5e7eb', position:'sticky', left:0, background: isHighlighted ? '#faf5ff' : (idx%2===0?'#fff':'#fafafa'), zIndex:1, transition:'background 0.5s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: isHighlighted?'#ede9fe':'#e0e7ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: isHighlighted?'#7c3aed':'#6366f1', flexShrink:0, boxShadow: isHighlighted?'0 0 0 2px #a78bfa':undefined }}>
                      {emp.nickname.slice(0,1)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: isHighlighted?'#6d28d9':'#111827', whiteSpace:'nowrap' }}>
                        {emp.nickname}
                        {isHighlighted && <span style={{ marginLeft:6, fontSize:10, background:'#ede9fe', color:'#7c3aed', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>◀ จากพนักงาน</span>}
                        {emp.pay_type!=='MONTHLY' && <span style={{ marginLeft:4, padding:'0 4px', fontSize:10, background: emp.pay_type==='HOURLY'?'#fef3c7':'#f0fdf4', color: emp.pay_type==='HOURLY'?'#92400e':'#15803d', borderRadius:4, fontWeight:700 }}>{emp.pay_type==='HOURLY'?'ชม.':'วัน'}</span>}
                      </div>
                      {/* แสดงกะประจำ */}
                      {emp.default_shift_id && (() => {
                        const s = shifts.find(sh=>sh.id===emp.default_shift_id)
                        return <div style={{ fontSize:10, color: isHighlighted?'#8b5cf6':'#a5b4fc', whiteSpace:'nowrap' }}>◌ {s?.name} {s?.start_time}</div>
                      })()}
                    </div>
                  </div>
                </td>
                {displayDates.map(date =>
                  viewMode==='week'
                    ? <WeekCell key={date} emp={emp} date={date} />
                    : <MonthCell key={date} emp={emp} date={date} />
                )}
              </tr>
            )})}
            {filteredEmps.length===0 && (
              <tr><td colSpan={displayDates.length+1} style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:14 }}>ไม่พบพนักงาน</td></tr>
            )}
          </tbody>
        </table>
        {editCell && <EditPopup empId={editCell.empId} date={editCell.date} />}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginTop: 12 }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filteredEmps.length)} จาก {filteredEmps.length} พนักงาน
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

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap', fontSize:12, alignItems:'center' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ padding:'2px 7px', borderRadius:5, fontSize:11, background:'#f0fdf4', color:'#15803d', border:'1px dashed #86efac', fontWeight:600 }}>กะเช้า</span>
          <span style={{ color:'#6b7280' }}>= กะประจำ (ไม่ได้ตั้ง)</span>
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ padding:'2px 7px', borderRadius:5, fontSize:11, background:'#dcfce7', color:'#15803d', border:'1px solid #86efac', fontWeight:600 }}>กะเช้า</span>
          <span style={{ color:'#f97316', fontSize:11 }}>✏ เปลี่ยน</span>
          <span style={{ color:'#6b7280' }}>= มี override วันนี้</span>
        </span>
        <span style={{ color:'#9ca3af' }}>· คลิกเพื่อแก้</span>
        <span style={{ color:'#9ca3af' }}>· "↩ กลับกะประจำ" เพื่อยกเลิก override</span>
      </div>
    </div>
  )
}
