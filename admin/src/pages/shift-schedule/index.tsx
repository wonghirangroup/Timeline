// admin/src/pages/shift-schedule/index.tsx
// ตารางกะ — กะประจำ + override เฉพาะวัน (ต่อ API จริงแล้ว — ไม่ใช้ demoStore อีกต่อไป)
import { useState, useRef, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, CalendarDays, Palmtree, Flag, Pencil, Check, CheckCircle2, Star, Search } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useSwipePage } from '../../hooks/useSwipePage'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

// ── API types ────────────────────────────────────────────────────────────────
interface ApiEmployee {
  id: string; employee_code: string; first_name: string; last_name: string
  nickname: string | null; branch_id: string; branch: { id: string; name: string; group_id?: string | null }
  default_shift_id: string | null; department: string | null; position_id?: string | null
}
interface ApiPosition { id: string; department?: { id: string; division?: { group_id?: string | null } | null } | null }
interface ApiBranch { id: string; name: string }
interface ApiShift {
  id: string; branch_id: string; name: string
  start_time: string; end_time: string; shift_type: 'REGULAR' | 'SPECIAL'
}
type ShiftAssignmentTypeValue = 'WORK' | 'DAY_OFF' | 'WEEKLY_OFF' | 'HOLIDAY'
interface ApiShiftAssignment {
  id: string; employee_id: string; date: string; shift_id: string | null
  type: ShiftAssignmentTypeValue; note: string | null
}
interface ApiLeaveRequest {
  id: string; employee_id: string; start_date: string; end_date: string; status: string
}
interface ApiWeeklyOff {
  id: string; employee_id: string; week_start: string; day_of_week: number; status: string
}
interface ApiHoliday {
  id: string; date: string; name: string
  target_branches: string[] | null; target_departments: string[] | null
}

// เช็คว่า holiday นี้ใช้กับพนักงานคนนี้ไหม — mirror ของ holidayAppliesTo() ฝั่ง backend
// (server/src/modules/tenant/holiday.service.ts) department เก็บไม่ตรงกันระหว่าง
// สร้างผ่าน Admin UI ("03 พนักงานขาย") กับ migrate จาก Firebase ("03") — match 2 ตัวแรกเสมอ
function holidayAppliesTo(holiday: ApiHoliday, emp: ApiEmployee): boolean {
  const branches    = holiday.target_branches    ?? []
  const departments = holiday.target_departments ?? []
  const branchOk = branches.length === 0 || branches.includes(emp.branch_id)
  const empDeptCode = emp.department?.slice(0, 2).trim() ?? ''
  const deptOk = departments.length === 0 || departments.some(d => d.slice(0, 2).trim() === empDeptCode)
  return branchOk && deptOk
}

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
// week_start (จันทร์) + day_of_week → วันที่จริง
function resolveWeeklyOffDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  if (d.getUTCDay() === dayOfWeek) return weekStart.slice(0, 10)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

const DAY_SHORT  = ['อา','จ','อ','พ','พฤ','ศ','ส']
const MONTH_FULL = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

type EffectiveType = ShiftAssignmentTypeValue | 'LEAVE'

const TYPE_CFG: Record<EffectiveType, { label: string; short: string; bg: string; color: string; border: string }> = {
  WORK:       { label: 'ทำงาน',            short: 'W',   bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  DAY_OFF:    { label: 'หยุดพัก',          short: '–',   bg: '#f3f4f6', color: 'var(--text-muted)', border: '#d1d5db' },
  WEEKLY_OFF: { label: 'หยุดประจำสัปดาห์', short: 'OFF', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  HOLIDAY:    { label: 'หยุดนักขัตฤกษ์',  short: 'H',   bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
  LEAVE:      { label: 'ลา',               short: 'L',   bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
}

// ── Effective assignment ────────────────────────────────────────────────────────
// ลำดับความสำคัญ: 1) manual override (ShiftAssignment) 2) วันลาที่อนุมัติแล้ว
// 3) วันหยุดประจำสัปดาห์/เดือนที่อนุมัติแล้ว 4) วันหยุดนักขัตฤกษ์ 5) กะประจำของพนักงาน
// — ไม่ใช้ default_work_days แบบ mock เดิม (จ-ศ ตายตัว) เพราะธุรกิจนี้เป็นกะหมุนเวียน
// รายสาขา ไม่ใช่ office 5 วัน/สัปดาห์ — "หยุด" ที่แท้จริงมาจาก WeeklyOffRequest/LeaveRequest
type EffectiveResult = { type: EffectiveType; shift_id: string | null; isDefault: boolean } | null

function getEffective(
  empId: string, date: string,
  overrides: ApiShiftAssignment[], employees: ApiEmployee[],
  leaves: ApiLeaveRequest[], weeklyOffs: ApiWeeklyOff[], holidays: ApiHoliday[],
): EffectiveResult {
  const override = overrides.find(a => a.employee_id === empId && a.date.slice(0, 10) === date)
  if (override) return { type: override.type, shift_id: override.shift_id, isDefault: false }

  const onLeave = leaves.some(l =>
    l.employee_id === empId && l.status === 'APPROVED' &&
    l.start_date.slice(0, 10) <= date && l.end_date.slice(0, 10) >= date)
  if (onLeave) return { type: 'LEAVE', shift_id: null, isDefault: true }

  const onWeeklyOff = weeklyOffs.some(w =>
    w.employee_id === empId && w.status === 'APPROVED' && resolveWeeklyOffDate(w.week_start, w.day_of_week) === date)
  if (onWeeklyOff) return { type: 'WEEKLY_OFF', shift_id: null, isDefault: true }

  const emp = employees.find(e => e.id === empId)

  const onHoliday = emp && holidays.some(h => h.date.slice(0, 10) === date && holidayAppliesTo(h, emp))
  if (onHoliday) return { type: 'HOLIDAY', shift_id: null, isDefault: true }

  if (emp?.default_shift_id) return { type: 'WORK', shift_id: emp.default_shift_id, isDefault: true }

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShiftSchedulePage() {
  const isMobile = useIsMobile()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const swipeHandlers = useSwipePage(
    () => setPage(p => Math.min(totalPages, p + 1)),
    () => setPage(p => Math.max(1, p - 1)),
  )

  const TODAY = new Date().toISOString().slice(0, 10)
  const [viewMode, setViewMode]   = useState<'week'|'month'>('week')
  const [weekStart, setWeekStart] = useState(() => getMondayOf(TODAY))
  const [selMonth, setSelMonth]   = useState(() => { const d = new Date(TODAY); return { y: d.getFullYear(), m: d.getMonth()+1 } })
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [search, setSearch]       = useState('')
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
  // เดือนที่ต้องดึง override/weekly-off มา — ครอบคลุมทั้งเดือนของ weekStart กับวันสุดท้ายที่แสดง
  // (สัปดาห์ท้ายเดือนอาจคาบเกี่ยวเดือนถัดไป — เป็น edge case เล็กน้อยที่ยอมรับได้)
  const queryMonth  = displayDates[0].slice(0, 7)
  const queryMonth2 = displayDates[displayDates.length - 1].slice(0, 7)
  const queryYear   = Number(displayDates[0].slice(0, 4))
  const queryYear2  = Number(displayDates[displayDates.length - 1].slice(0, 4))

  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: shifts = [] } = useQuery<ApiShift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const { data: overridesA = [] } = useQuery<ApiShiftAssignment[]>({
    queryKey: ['admin', 'shift-assignments', queryMonth],
    queryFn: () => api.get('/api/v1/admin/shift-assignments', { params: { month: queryMonth } }).then(r => r.data.data),
  })
  const { data: overridesB = [] } = useQuery<ApiShiftAssignment[]>({
    queryKey: ['admin', 'shift-assignments', queryMonth2],
    queryFn: () => api.get('/api/v1/admin/shift-assignments', { params: { month: queryMonth2 } }).then(r => r.data.data),
    enabled: queryMonth2 !== queryMonth,
  })
  const overrides = queryMonth2 !== queryMonth ? [...overridesA, ...overridesB] : overridesA
  const { data: leaves = [] } = useQuery<ApiLeaveRequest[]>({
    queryKey: ['admin', 'leave-requests', 'APPROVED'],
    queryFn: () => api.get('/api/v1/admin/leave-requests', { params: { status: 'APPROVED' } }).then(r => r.data.data),
  })
  const { data: weeklyOffsA = [] } = useQuery<ApiWeeklyOff[]>({
    queryKey: ['admin', 'weekly-off', queryMonth],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month: queryMonth } }).then(r => r.data.data),
  })
  const { data: weeklyOffsB = [] } = useQuery<ApiWeeklyOff[]>({
    queryKey: ['admin', 'weekly-off', queryMonth2],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month: queryMonth2 } }).then(r => r.data.data),
    enabled: queryMonth2 !== queryMonth,
  })
  const weeklyOffs = queryMonth2 !== queryMonth ? [...weeklyOffsA, ...weeklyOffsB] : weeklyOffsA
  const { data: holidaysA = [] } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'holidays', queryYear],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year: queryYear } }).then(r => r.data.data),
  })
  const { data: holidaysB = [] } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'holidays', queryYear2],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year: queryYear2 } }).then(r => r.data.data),
    enabled: queryYear2 !== queryYear,
  })
  const holidays = queryYear2 !== queryYear ? [...holidaysA, ...holidaysB] : holidaysA

  const saveMutation = useMutation({
    mutationFn: (body: { employee_id: string; date: string; shift_id: string | null; type: ShiftAssignmentTypeValue }) =>
      api.put('/api/v1/admin/shift-assignments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] })
      setEditCell(null)
    },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const resetMutation = useMutation({
    mutationFn: ({ employeeId, date }: { employeeId: string; date: string }) =>
      api.delete(`/api/v1/admin/shift-assignments/${employeeId}/${date}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] })
      setEditCell(null)
    },
    onError: () => showToast('error', 'ยกเลิก override ไม่สำเร็จ'),
  })

  const employeeOrgMap = useMemo(() => buildEmployeeOrgMap(employees, positions), [employees, positions])

  const filteredEmps = employees
    .filter(e => matchesOrgFilter(employeeOrgMap[e.id], orgFilter))
    .filter(e => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q)
    })

  const totalPages = Math.ceil(filteredEmps.length / pageSize)
  const paginatedEmps = filteredEmps.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [orgFilter, search, viewMode, weekStart, selMonth])

  function getShiftsForEmp(emp: ApiEmployee): ApiShift[] {
    return shifts.filter(s => s.branch_id === emp.branch_id)
  }
  function eff(empId: string, date: string) {
    return getEffective(empId, date, overrides, employees, leaves, weeklyOffs, holidays)
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

  // popup ใช้ portal + position:fixed (viewport coords ตรงๆ) แทน absolute ใน
  // ตารางที่ scroll ได้ — กันไม่ให้ popup โดน overflow ของตารางบัง/ตัด ต้อง
  // เลื่อนตารางถึงจะเห็น (z-index สูงกว่าตารางเสมอเพราะอยู่คนละ stacking context)
  const POPUP_W = 260
  function openEdit(e: React.MouseEvent<HTMLButtonElement>, empId: string, date: string) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const left = Math.min(r.left, window.innerWidth - POPUP_W - 12)
    const top  = r.bottom + 4
    setPopupPos({ top, left: Math.max(12, left) })
    setEditCell({ empId, date })
  }

  function handleSave(empId: string, date: string, type: ShiftAssignmentTypeValue, shiftId: string|null) {
    saveMutation.mutate({ employee_id: empId, date, shift_id: shiftId, type })
  }

  // ล้าง override → กลับใช้กะประจำ (คำนวณจาก default/leave/weekly-off/holiday จริง)
  function handleResetToDefault(empId: string, date: string) {
    resetMutation.mutate({ employeeId: empId, date })
  }

  // ── Edit Popup ────────────────────────────────────────────────────────────
  function EditPopup({ empId, date }: { empId: string; date: string }) {
    const emp       = employees.find(e => e.id === empId)
    const empShifts = emp ? getShiftsForEmp(emp) : []
    const effective = eff(empId, date)
    const hasOverride = overrides.some(a => a.employee_id === empId && a.date.slice(0, 10) === date)
    const defaultShift = emp?.default_shift_id ? shifts.find(s => s.id === emp.default_shift_id) : null

    return createPortal((
      <div ref={popupRef} style={{
        position:'fixed', top:popupPos.top, left:popupPos.left, zIndex:1000,
        background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
        boxShadow:'0 8px 24px rgba(0,0,0,0.16)', width:POPUP_W, maxHeight:'80vh', overflowY:'auto', padding:'10px 0', fontSize:13,
      }}>
        {/* Header */}
        <div style={{ padding:'4px 14px 8px', borderBottom:'1px solid #f3f4f6' }}>
          <div style={{ fontWeight:600, color:'#374151' }}>
            {emp?.nickname || emp?.first_name} · {fmt(date, { day:'numeric', month:'short', weekday:'short' })}
          </div>
          {/* แสดงสถานะปัจจุบัน */}
          {effective?.type === 'WORK' && effective.isDefault && (
            <div style={{ fontSize:11, color:'#6366f1', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <span>◌</span>
              <span>กะประจำ: {defaultShift?.name} {defaultShift?.start_time}</span>
            </div>
          )}
          {effective?.type === 'LEAVE' && (
            <div style={{ fontSize:11, color:'#1d4ed8', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <CalendarDays size={11} /><span>กำลังลา (จากระบบวันลา — อนุมัติแล้ว)</span>
            </div>
          )}
          {effective?.type === 'WEEKLY_OFF' && effective.isDefault && (
            <div style={{ fontSize:11, color:'#c2410c', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <Palmtree size={11} /><span>หยุดประจำ (จากระบบจองวันหยุด — อนุมัติแล้ว)</span>
            </div>
          )}
          {effective?.type === 'HOLIDAY' && effective.isDefault && (
            <div style={{ fontSize:11, color:'#b91c1c', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <Flag size={11} /><span>วันหยุดนักขัตฤกษ์</span>
            </div>
          )}
          {hasOverride && (
            <div style={{ fontSize:11, color:'#f97316', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
              <Pencil size={11} />
              <span>มีการเปลี่ยนแปลงเฉพาะวันนี้</span>
            </div>
          )}
        </div>

        {/* กะทำงาน */}
        {empShifts.length > 0 && (
          <>
            <div style={{ padding:'6px 14px 2px', fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>กะทำงาน</div>
            {empShifts.map(sh => {
              const isActive = effective?.shift_id === sh.id
              const isDefault = isActive && effective?.isDefault
              return (
                <button key={sh.id} onClick={() => handleSave(empId, date, 'WORK', sh.id)} disabled={saveMutation.isPending} style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'7px 14px', border:'none',
                  background: isActive ? (sh.shift_type === 'SPECIAL' ? '#f5f3ff' : '#f0fdf4') : 'transparent',
                  cursor:'pointer', textAlign:'left',
                }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background: isActive ? (sh.shift_type === 'SPECIAL' ? '#7c3aed' : '#22c55e') : '#d1d5db', flexShrink:0 }} />
                  <span style={{ color:'#374151', fontWeight: isActive ? 600 : 400 }}>
                    {sh.shift_type === 'SPECIAL' && <Star size={10} fill="#7c3aed" stroke="none" style={{ marginRight:3, verticalAlign:'-1px' }} />}
                    {sh.name}
                  </span>
                  <span style={{ color:'var(--text-muted)', fontSize:11, marginLeft:'auto' }}>{sh.start_time}–{sh.end_time}</span>
                  {isDefault && <span style={{ fontSize:10, color:'#6366f1', background:'#e0e7ff', borderRadius:4, padding:'0 5px' }}>ประจำ</span>}
                  {sh.shift_type === 'SPECIAL' && <span style={{ fontSize:10, color:'#7c3aed', background:'#ede9fe', borderRadius:4, padding:'0 5px' }}>พิเศษ</span>}
                </button>
              )
            })}
          </>
        )}

        {/* ประเภทวัน (manual override เท่านั้น — วันลา/หยุดจริงมาจากระบบลา/จองวันหยุดโดยอัตโนมัติอยู่แล้ว) */}
        <div style={{ padding:'6px 14px 2px', fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>ตั้งเป็นวันหยุด (แก้เฉพาะวันนี้)</div>
        {(['DAY_OFF','WEEKLY_OFF','HOLIDAY'] as ShiftAssignmentTypeValue[]).map(t => {
          const cfg = TYPE_CFG[t]
          const isActive = effective?.type === t && !effective.shift_id
          return (
            <button key={t} onClick={() => handleSave(empId, date, t, null)} disabled={saveMutation.isPending} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'6px 14px', border:'none', background: isActive ? '#f9fafb' : 'transparent', cursor:'pointer', textAlign:'left',
            }}>
              <span style={{ padding:'1px 6px', borderRadius:4, fontSize:11, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.label}</span>
              {isActive && <Check size={11} color="var(--text-muted)" style={{ marginLeft:'auto' }} />}
            </button>
          )
        })}

        {/* ↩ กลับกะประจำ (แสดงเฉพาะเมื่อมี override) */}
        {hasOverride && (
          <>
            <div style={{ borderTop:'1px solid #f3f4f6', margin:'4px 0' }} />
            <button onClick={() => handleResetToDefault(empId, date)} disabled={resetMutation.isPending} style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'7px 14px', border:'none', background:'transparent', cursor:'pointer',
              color:'#6366f1', fontSize:13, fontWeight:600,
            }}>
              ↩ กลับค่าอัตโนมัติ
              {defaultShift && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400, marginLeft:4 }}>({defaultShift.name} {defaultShift.start_time})</span>}
            </button>
          </>
        )}
      </div>
    ), document.body)
  }

  // ── Week Cell ─────────────────────────────────────────────────────────────
  function WeekCell({ emp, date }: { emp: ApiEmployee; date: string }) {
    const e = eff(emp.id, date)
    const isToday    = date === TODAY
    const isEditOpen = editCell?.empId === emp.id && editCell?.date === date

    let content: React.ReactNode
    if (!e) {
      content = <span style={{ color:'#e5e7eb', fontSize:11 }}>—</span>
    } else if (e.type === 'WORK' && e.shift_id) {
      const sh         = shifts.find(s => s.id === e.shift_id)
      const isSpecial  = sh?.shift_type === 'SPECIAL'
      const bg  = isSpecial ? (e.isDefault ? '#f5f3ff' : '#ede9fe') : e.isDefault ? '#f0fdf4' : '#dcfce7'
      const brd = isSpecial ? (e.isDefault ? '1px dashed #c4b5fd' : '1px solid #c4b5fd') : e.isDefault ? '1px dashed #86efac' : '1px solid #86efac'
      const clr = isSpecial ? '#7c3aed' : '#15803d'
      content = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 6px', borderRadius:5, fontSize:11, fontWeight:600, background:bg, color:clr, border:brd, whiteSpace:'nowrap' }}>
            {isSpecial && <Star size={10} fill={clr} stroke="none" />}{sh?.name ?? 'กะ'}
          </span>
          {e.isDefault
            ? <span style={{ fontSize:9, color: isSpecial ? '#a78bfa' : '#a5b4fc' }}>ประจำ</span>
            : <span style={{ fontSize:9, color:'#f97316', display:'inline-flex', alignItems:'center', gap:2 }}><Pencil size={9} /> เปลี่ยน</span>}
        </div>
      )
    } else {
      const cfg = TYPE_CFG[e.type]
      content = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
          <span style={{ padding:'2px 5px', borderRadius:5, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' }}>
            {cfg.label}
          </span>
          {!e.isDefault && <span style={{ fontSize:9, color:'#f97316', display:'inline-flex', alignItems:'center', gap:2 }}><Pencil size={9} /> เปลี่ยน</span>}
        </div>
      )
    }

    return (
      <td style={{ padding:4, textAlign:'center', verticalAlign:'middle', background:isToday?'#fefce8':isEditOpen?'#f5f3ff':undefined, borderRight:'1px solid #f3f4f6', minWidth: isMobile ? 60 : 84 }}>
        <button onClick={ev => openEdit(ev, emp.id, date)} style={{ border:'none', background:'transparent', cursor:'pointer', borderRadius:6, padding:'4px 2px', width:'100%', minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {content}
        </button>
      </td>
    )
  }

  // ── Month Cell (compact) ─────────────────────────────────────────────────
  function MonthCell({ emp, date }: { emp: ApiEmployee; date: string }) {
    const e       = eff(emp.id, date)
    const hasOver = overrides.some(a => a.employee_id === emp.id && a.date.slice(0, 10) === date)
    const isToday = date === TODAY
    const dow     = new Date(date).getDay()

    let inner: React.ReactNode
    if (!e) {
      inner = <span style={{ color:'#e5e7eb', fontSize:9 }}>·</span>
    } else if (e.type === 'WORK') {
      const sh        = shifts.find(s => s.id === e.shift_id)
      const isSpecial = sh?.shift_type === 'SPECIAL'
      inner = (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background: isSpecial ? (e.isDefault ? '#c4b5fd' : '#7c3aed') : e.isDefault ? '#86efac' : '#22c55e', display:'block' }} />
          <span style={{ fontSize:9, color: isSpecial ? '#7c3aed' : e.isDefault ? 'var(--text-muted)' : '#15803d', fontWeight: e.isDefault ? 400 : 700, lineHeight:1, display: 'inline-flex', alignItems: 'center' }}>
            {isSpecial ? <Star size={9} fill="#7c3aed" stroke="none" /> : (sh?.name?.slice(0,3) ?? 'W')}
          </span>
          {hasOver && <Pencil size={8} color="#f97316" />}
        </div>
      )
    } else {
      const cfg = TYPE_CFG[e.type]
      inner = <span style={{ fontSize:10, fontWeight:700, color:cfg.color }}>{cfg.short}</span>
    }

    return (
      <td style={{
        padding:2, textAlign:'center', verticalAlign:'middle', minWidth:40,
        background: isToday ? '#fefce8' : dow===0 ? '#fef9f9' : undefined,
        borderRight:'1px solid #f3f4f6',
        borderLeft: dow===1 ? '2px solid #e5e7eb' : undefined,
      }}>
        <button onClick={ev => openEdit(ev, emp.id, date)}
          title={`${emp.nickname || emp.first_name} · ${fmt(date, { day:'numeric', month:'short', weekday:'short' })}`}
          style={{ border:'none', background:'transparent', cursor:'pointer', borderRadius:4, padding:'3px 1px', width:'100%', minHeight:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {inner}
        </button>
      </td>
    )
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  // นับจาก effective (รวมทั้งค่า default/leave/weekly-off/holiday และ override)
  const workCount = filteredEmps.reduce((sum, emp) =>
    sum + displayDates.filter(d => eff(emp.id, d)?.type === 'WORK').length, 0)
  const offCount  = filteredEmps.reduce((sum, emp) =>
    sum + displayDates.filter(d => { const e = eff(emp.id, d); return e && e.type !== 'WORK' }).length, 0)
  const overrideCount = overrides.filter(a => displayDates.includes(a.date.slice(0, 10)) && filteredEmps.some(e=>e.id===a.employee_id)).length

  return (
    <div style={{ maxWidth: viewMode==='month'?1400:1100, margin:'0 auto' }}>

      {/* Header - Title removed */}
      <div style={{ display:'flex', alignItems: isMobile?'flex-start':'center', flexDirection: isMobile?'column':'row', gap:12, marginBottom:16 }}>
        <div style={{ position:'relative', width: isMobile ? '100%' : 220 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาพนักงาน..."
            style={{ width:'100%', padding:'7px 10px 7px 32px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        <div style={{ marginLeft: isMobile ? 0 : 'auto', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
            {(['week','month'] as const).map(m => (
              <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: viewMode===m?'#f97316':'#fff', color: viewMode===m?'#fff':'var(--text-muted)' }}>
                {m==='week'?'รายสัปดาห์':'รายเดือน'}
              </button>
            ))}
          </div>
          <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
        </div>
      </div>

      {/* Period nav + Stats */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <button onClick={prevPeriod} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14, color:'#374151' }}>‹ ก่อนหน้า</button>
        <span style={{ fontWeight:700, color:'#111827', fontSize:15, minWidth:160, textAlign:'center' }}>{periodLabel}</span>
        <button onClick={nextPeriod} style={{ padding:'6px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:14, color:'#374151' }}>ถัดไป ›</button>
        <button onClick={goToday} style={{ padding:'6px 12px', border:'1px solid #6366f1', borderRadius:8, background:'#f5f3ff', cursor:'pointer', fontSize:13, color:'#6366f1', fontWeight:600 }}>วันนี้</button>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, fontSize:12, flexWrap:'wrap' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', background:'#dcfce7', color:'#15803d', borderRadius:6, fontWeight:600 }}><CheckCircle2 size={12} /> ทำงาน {workCount}</span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', background:'#fff7ed', color:'#c2410c', borderRadius:6, fontWeight:600 }}><Palmtree size={12} /> หยุด {offCount}</span>
          {overrideCount > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', background:'#fff7ed', color:'#ea580c', borderRadius:6, fontWeight:600 }}><Pencil size={12} /> เปลี่ยน {overrideCount}</span>}
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} {...(isMobile ? swipeHandlers : {})} style={{ overflowX:'auto', position:'relative', borderRadius:12, border:'1px solid #e5e7eb', background:'#fff' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', minWidth: viewMode==='week'?600:900 }}>
          <thead>
            <tr style={{ background:'#f9fafb' }}>
              <th style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:'var(--text-muted)', fontWeight:600, borderRight:'2px solid #e5e7eb', whiteSpace:'nowrap', minWidth:130, position:'sticky', left:0, background:'#f9fafb', zIndex:2 }}>
                พนักงาน ({filteredEmps.length})
              </th>
              {viewMode==='week' ? weekDates.map(date => {
                const dow=new Date(date).getDay(), isToday=date===TODAY
                return <th key={date} style={{ padding:'8px 4px', textAlign:'center', fontSize:12, color: isToday?'#6366f1':dow===0?'#ef4444':'var(--text-muted)', fontWeight: isToday?700:600, borderRight:'1px solid #f3f4f6', minWidth: isMobile?60:84, background: isToday?'#fefce8':undefined }}>
                  <div style={{ fontWeight:700 }}>{DAY_SHORT[dow]}</div>
                  <div style={{ fontSize:11, marginTop:1 }}>{new Date(date).getDate()}</div>
                </th>
              }) : monthDates.map(date => {
                const d=new Date(date), dow=d.getDay(), isToday=date===TODAY
                return <th key={date} style={{ padding:'5px 2px', textAlign:'center', fontSize:11, color: isToday?'#6366f1':dow===0?'#ef4444':dow===6?'#f97316':'var(--text-muted)', fontWeight: isToday?700:500, borderRight:'1px solid #f3f4f6', borderLeft: dow===1?'2px solid #e5e7eb':undefined, minWidth:40, background: isToday?'#fefce8':dow===0?'#fef9f9':undefined }}>
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
                      {(emp.nickname || emp.first_name || '').slice(0,1)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: isHighlighted?'#6d28d9':'#111827', whiteSpace:'nowrap' }}>
                        {emp.nickname || emp.first_name}
                        {isHighlighted && <span style={{ marginLeft:6, fontSize:10, background:'#ede9fe', color:'#7c3aed', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>◀ จากพนักงาน</span>}
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
              <tr><td colSpan={displayDates.length+1} style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>ไม่พบพนักงาน</td></tr>
            )}
          </tbody>
        </table>
        {editCell && <EditPopup empId={editCell.empId} date={editCell.date} />}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filteredEmps.length)} จาก {filteredEmps.length} พนักงาน
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMobile && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div key={i} onClick={() => setPage(i + 1)} style={{ width: page === i + 1 ? 18 : 7, height: 7, borderRadius: 99, cursor: 'pointer', background: page === i + 1 ? '#f97316' : '#e5e7eb', transition: 'all 0.2s' }} />
                  ))}
                </div>
              )}
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {isMobile && <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>← ปัดซ้ายขวาเพื่อเปลี่ยนหน้า →</span>}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:14 }}>
        {viewMode === 'month' && (
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, alignItems:'center', padding:'10px 14px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:10 }}>
            <span style={{ fontWeight:700, color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>ตัวย่อในตาราง</span>
            {(Object.keys(TYPE_CFG) as EffectiveType[]).map(k => {
              const cfg = TYPE_CFG[k]
              return (
                <span key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:22, padding:'2px 5px', borderRadius:5, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>{cfg.short}</span>
                  <span style={{ color:'var(--text-muted)' }}>{cfg.label}</span>
                </span>
              )
            })}
          </div>
        )}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ padding:'2px 7px', borderRadius:5, fontSize:11, background:'#f0fdf4', color:'#15803d', border:'1px dashed #86efac', fontWeight:600 }}>กะเช้า</span>
            <span style={{ color:'var(--text-muted)' }}>= อัตโนมัติ (กะประจำ/วันลา/วันหยุด — ไม่ได้ตั้งเอง)</span>
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ padding:'2px 7px', borderRadius:5, fontSize:11, background:'#dcfce7', color:'#15803d', border:'1px solid #86efac', fontWeight:600 }}>กะเช้า</span>
            <span style={{ color:'#f97316', fontSize:11, display:'inline-flex', alignItems:'center', gap:2 }}><Pencil size={10} /> เปลี่ยน</span>
            <span style={{ color:'var(--text-muted)' }}>= มี override วันนี้</span>
          </span>
          <span style={{ color:'var(--text-muted)' }}>· คลิกเพื่อแก้</span>
          <span style={{ color:'var(--text-muted)' }}>· "↩ กลับค่าอัตโนมัติ" เพื่อยกเลิก override</span>
        </div>
      </div>
    </div>
  )
}
