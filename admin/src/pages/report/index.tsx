// admin/src/pages/report/index.tsx — Attendance History Report
import { useState, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff, Palmtree, Thermometer, Baby, ClipboardList, X, Check, AlertTriangle, AlertOctagon, Search, Wallet, Download, MapPin } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

interface AttendanceRecord {
  id: string
  date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  is_absent:    boolean
  fine:         string
  carried_fine: string
  note:         string | null
  employee: {
    id: string
    first_name: string
    last_name:  string
    nickname:   string | null
    employee_code: string
    branch: { id: string; name: string }
  }
  shift: { id: string; name: string; start_time: string; end_time: string }
}

interface Branch { id: string; name: string }
interface Employee { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } }

interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  status: string
  reason: string | null
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                   'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

function initials(first: string, last: string) {
  return (first.charAt(0) + last.charAt(0)).toUpperCase()
}

export default function ReportPage() {
  const now = new Date()
  const isMobile = useIsMobile()
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [branch, setBranch] = useState('')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<{ emp: string; date: string; records: AttendanceRecord[] } | null>(null)
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // ── มุมมอง: ปฏิทิน (1 เดือนเต็ม) หรือ ช่วงเวลาที่กำหนดเอง (ข้ามเดือนได้) ──
  const [viewMode, setViewMode] = useState<'month' | 'range'>('month')
  const [rangeStart, setRangeStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10) })
  const [rangeEnd,   setRangeEnd]   = useState(() => new Date().toISOString().slice(0, 10))
  const [expandedRangeEmp, setExpandedRangeEmp] = useState<string | null>(null)

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))
  const daysCount = getDaysInMonth(year, month)
  const days      = Array.from({ length: daysCount }, (_, i) => i + 1)

  // ช่วงเวลาที่ query จริง — ผูกกับเดือนที่เลือก หรือช่วงกำหนดเองแล้วแต่มุมมอง
  const queryStartDate = viewMode === 'range' ? rangeStart : startDate
  const queryEndDate   = viewMode === 'range' ? rangeEnd   : endDate

  // รายการวันที่ (YYYY-MM-DD) ในช่วงกำหนดเอง — ไม่ผูกกับปฏิทินเดือนเดียวเหมือน `days`
  const rangeDateKeys = useMemo(() => {
    if (viewMode !== 'range') return []
    const out: string[] = []
    const cur = new Date(rangeStart + 'T00:00:00')
    const end = new Date(rangeEnd + 'T00:00:00')
    while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
    return out
  }, [viewMode, rangeStart, rangeEnd])

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['admin', 'branches'],
    queryFn:  () => api.get('/api/v1/admin/branches').then((r: any) => r.data.data),
  })

  const { data: records = [], isLoading: loadingRecords, refetch } = useQuery<AttendanceRecord[]>({
    queryKey: ['admin', 'attendance-report', viewMode, year, month, rangeStart, rangeEnd, branch],
    queryFn:  () => api.get('/api/v1/admin/attendance', {
      params: { startDate: queryStartDate, endDate: queryEndDate, ...(branch ? { branchId: branch } : {}) },
    }).then((r: any) => r.data.data),
  })

  const { data: leaveRecords = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['admin', 'leave-report', year, month, branch],
    queryFn:  () => api.get('/api/v1/admin/leave-requests', {
      params: { ...(branch ? { branchId: branch } : {}) },
    }).then((r: any) => r.data.data),
  })

  // วันหยุด (WeeklyOffRequest) + นอกสถานที่ (OffsiteCheckin) จริง — cross-reference
  // เข้า cellInfo() แบบเดียวกับ leaveMap แทนที่จะพึ่ง note-text เดาอย่างเดียว
  const { data: dayoffRecords = [] } = useQuery<any[]>({
    queryKey: ['admin', 'dayoff-report', branch],
    queryFn:  () => api.get('/api/v1/admin/weekly-off', { params: { ...(branch ? { branchId: branch } : {}) } }).then((r: any) => r.data.data),
  })
  const { data: offsiteRecords = [] } = useQuery<any[]>({
    queryKey: ['admin', 'offsite-report', branch],
    queryFn:  () => api.get('/api/v1/admin/offsite-checkins', { params: { ...(branch ? { branchId: branch } : {}) } }).then((r: any) => r.data.data),
  })

  const { data: allEmployees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ['admin', 'employees', branch],
    queryFn:  () => api.get('/api/v1/admin/employees', {
      // includeInactive: รายงานย้อนหลังต้องเห็นพนักงานที่ลาออก/เลิกจ้างไปแล้วด้วย
      // ถ้าเดือนที่ดูมีประวัติเข้างานของเขาอยู่ ไม่งั้นแถวข้อมูลจะหายจากรายงาน
      params: { ...(branch ? { branchId: branch } : {}), includeInactive: true },
    }).then((r: any) => r.data.data),
  })

  const isLoading = loadingRecords || loadingEmployees

  const leaveMap = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const l of leaveRecords) {
      if (l.status !== 'APPROVED') continue
      const start = new Date(l.start_date)
      const end   = new Date(l.end_date)
      const orig  = l.reason?.match(/^\[(.+?)\]/)?.[1] ?? l.leave_type
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // ข้ามเสาร์-อาทิตย์ — countDays() ตอนขอลาไม่นับวันหยุดสุดสัปดาห์เข้าจำนวนวันลา
        // อยู่แล้ว (เช่น ลาศุกร์-จันทร์ = 2 วันลา ไม่ใช่ 4) ไม่ควร label ทับเสาร์/อาทิตย์
        if (d.getDay() === 0 || d.getDay() === 6) continue
        const key = d.toISOString().slice(0, 10)
        if (!m.has(l.employee_id)) m.set(l.employee_id, new Map())
        m.get(l.employee_id)!.set(key, orig)
      }
    }
    return m
  }, [leaveRecords])

  // week_start + day_of_week → วันที่จริง (เหมือน resolveDate ใน employee/leave/index.tsx)
  function resolveWeeklyOffDate(weekStart: string, dayOfWeek: number): string {
    const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
    if (d.getUTCDay() === dayOfWeek) return weekStart.slice(0, 10)
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    d.setUTCDate(d.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const dayoffMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const w of dayoffRecords) {
      if (w.status !== 'APPROVED') continue
      const empId = w.employee?.id ?? w.employee_id
      if (!m.has(empId)) m.set(empId, new Set())
      m.get(empId)!.add(resolveWeeklyOffDate(w.week_start, w.day_of_week))
    }
    return m
  }, [dayoffRecords])
  const offsiteMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const o of offsiteRecords) {
      const empId = o.employee?.id ?? o.employee_id
      const key = (o.check_in_at ?? '').slice(0, 10)
      if (!key) continue
      if (!m.has(empId)) m.set(empId, new Set())
      m.get(empId)!.add(key)
    }
    return m
  }, [offsiteRecords])

  const empMap = useMemo(() => {
    const m = new Map<string, { info: AttendanceRecord['employee']; byDate: Map<string, AttendanceRecord[]> }>()
    for (const r of records) {
      const dateKey = r.date.slice(0, 10)
      if (!m.has(r.employee.id)) m.set(r.employee.id, { info: r.employee, byDate: new Map() })
      const emp = m.get(r.employee.id)!
      if (!emp.byDate.has(dateKey)) emp.byDate.set(dateKey, [])
      emp.byDate.get(dateKey)!.push(r)
    }
    return m
  }, [records])

  const employees = useMemo(() => {
    const list = allEmployees.map(emp => ({
      info: emp,
      byDate: empMap.get(emp.id)?.byDate ?? new Map<string, AttendanceRecord[]>(),
    }))
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(e =>
      e.info.first_name.toLowerCase().includes(q) ||
      e.info.last_name.toLowerCase().includes(q)  ||
      (e.info.nickname ?? '').toLowerCase().includes(q) ||
      e.info.employee_code.toLowerCase().includes(q)
    )
  }, [allEmployees, empMap, search])

  // ── สรุปรายพนักงานสำหรับมุมมอง "ช่วงเวลา" — นับจาก cellInfo() ทีละวันในช่วงที่เลือก ──
  const rangeSummary = useMemo(() => {
    if (viewMode !== 'range') return []
    return employees.map(({ info, byDate }) => {
      let ok = 0, late = 0, absent = 0, leave = 0, fine = 0
      for (const dateKey of rangeDateKeys) {
        const recs = byDate.get(dateKey)
        const { status } = cellInfo(recs, info.employee_code, info.id, dateKey)
        if (status === 'ok') ok++
        else if (status === 'late' || status === 'late2') late++
        else if (status === 'absent') absent++
        else if (status === 'leave' || status === 'sick' || status === 'vacation' || status === 'holiday' || status === 'offsite') leave++
        for (const r of recs ?? []) fine += Number(r.fine) + Number(r.carried_fine)
      }
      return { info, byDate, ok, late, absent, leave, fine }
    })
  }, [viewMode, employees, rangeDateKeys])

  function cellInfo(recs: AttendanceRecord[] | undefined, empCode: string, empId: string, dateKey: string) {
    const dow     = new Date(dateKey + 'T00:00:00').getDay()
    const dept    = empCode.split('-')[1] ?? ''
    const leaveType = leaveMap.get(empId)?.get(dateKey)
    // มีเช็คอินจริงในวันนั้น → ยึดตามการเช็คอินจริงเสมอ กัน case ที่มี
    // record หยุด/ลา ที่จองไว้ล่วงหน้า (จาก schedule เดิม) แต่พนักงานมาทำงานจริง
    const hasRealCheckin = !!recs?.some(r => r.check_in_at)

    if (leaveType && !hasRealCheckin) {
      if (leaveType === 'หยุด' || leaveType === 'หยุดนักขัตฤกษ์' || leaveType === 'COMPENSATE')
        return { bg: '#e0f2fe', label: <CalendarOff size={13} />, color: '#0369a1', tip: leaveType === 'COMPENSATE' ? 'วันหยุดนักขัตฤกษ์' : leaveType, status: 'leave' }
      if (leaveType === 'SICK' || leaveType === 'ลาป่วย')
        return { bg: '#fee2e2', label: <Thermometer size={13} />, color: '#dc2626', tip: 'ลาป่วย', status: 'sick' }
      if (leaveType === 'VACATION' || leaveType === 'พักร้อน' || leaveType === 'ลาพักร้อน')
        return { bg: '#fef9c3', label: <Palmtree size={13} />, color: '#ca8a04', tip: 'พักร้อน', status: 'vacation' }
      if (leaveType === 'PERSONAL' || leaveType === 'ลากิจ')
        return { bg: '#e0f2fe', label: <CalendarOff size={13} />, color: '#0369a1', tip: 'หยุด/ลากิจ', status: 'leave' }
      if (leaveType === 'MATERNITY')
        return { bg: '#fce7f3', label: <Baby size={13} />, color: '#be185d', tip: 'ลาคลอด', status: 'leave' }
      return { bg: '#e0f2fe', label: <ClipboardList size={13} />, color: '#0369a1', tip: leaveType, status: 'leave' }
    }

    if (!hasRealCheckin && dayoffMap.get(empId)?.has(dateKey)) {
      return { bg: '#e0f2fe', label: <CalendarOff size={13} />, color: '#0369a1', tip: 'วันหยุด', status: 'holiday' }
    }
    if (!hasRealCheckin && offsiteMap.get(empId)?.has(dateKey)) {
      return { bg: '#f3e8ff', label: <MapPin size={13} />, color: '#9333ea', tip: 'นอกสถานที่', status: 'offsite' }
    }

    const isWeekendOff = (dow === 0 || dow === 6) && dept === '02'
    if (!recs || recs.length === 0) {
      if (isWeekendOff) return { bg: '#f3f4f6', label: null as ReactNode, color: 'var(--text-muted)', tip: 'วันหยุดสุดสัปดาห์', status: 'weekend' }
      if (dow === 0 || dow === 6) return { bg: '#f3f4f6', label: null as ReactNode, color: 'var(--text-muted)', tip: '', status: 'weekend' }
      return { bg: '#fee2e2', label: <X size={13} />, color: '#ef4444', tip: 'ไม่มีข้อมูล', status: 'absent' }
    }

    // นับขาดจาก field จริง (is_absent) ก่อนเสมอ — มาเช็คอินจริงแต่สายเกินเกณฑ์
    // ไม่ต้องพึ่ง note-text sniffing แบบเดิมอีกต่อไป
    if (recs.some(r => r.is_absent)) return { bg: '#fee2e2', label: <X size={13} />, color: '#ef4444', tip: 'ขาด (สายเกินกำหนด)', status: 'absent' }

    const note = recs.map(r => r.note ?? '').join(' ')
    if (note.includes('วันหยุด')) return { bg: '#e0f2fe', label: <CalendarOff size={13} />, color: '#0369a1', tip: 'วันหยุด', status: 'holiday' }
    if (note.includes('พักร้อน')) return { bg: '#fef9c3', label: <Palmtree size={13} />, color: '#ca8a04', tip: 'พักร้อน', status: 'vacation' }
    if (note.includes('ลากิจ'))   return { bg: '#e0f2fe', label: <CalendarOff size={13} />, color: '#0369a1', tip: 'ลากิจ', status: 'leave' }
    if (note.includes('ขาดงาน')) return { bg: '#fee2e2', label: <X size={13} />, color: '#ef4444', tip: 'ขาดงาน', status: 'absent' }
    if (note.includes('ระดับ 2'))  return { bg: '#fde8d8', label: <AlertOctagon size={13} />, color: '#c2410c', tip: 'มาสาย ระดับ 2', status: 'late2' }
    if (note.includes('ระดับ 1') || recs.some(r => r.is_late)) return { bg: '#fef3c7', label: <AlertTriangle size={13} />, color: '#92400e', tip: 'มาสาย', status: 'late' }
    return { bg: '#dcfce7', label: <Check size={13} />, color: '#15803d', tip: 'มาปกติ', status: 'ok' }
  }

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function buildCsvRows(empList: typeof employees, dateKeys: string[] = days.map(d => toYMD(year, month, d))) {
    const header = ['รหัสพนักงาน','ชื่อ','นามสกุล','ชื่อเล่น','สาขา','วันที่','วัน','กะ','เวลาเข้า','เวลาออก','สถานะ','สาย','ค่าปรับ','หมายเหตุ']
    const rows: string[][] = []
    for (const { info, byDate } of empList) {
      for (const dateKey of dateKeys) {
        const dow     = new Date(dateKey + 'T00:00:00').getDay()
        const recs    = byDate.get(dateKey)
        const leaveType = leaveMap.get(info.id)?.get(dateKey)
        const hasRealCheckin = !!recs?.some(r => r.check_in_at)
        if (leaveType && !hasRealCheckin) {
          rows.push([info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], '', '', '', 'ลา', '', '', leaveType])
          continue
        }
        if (!recs || recs.length === 0) {
          if (dow === 0 || dow === 6) continue
          rows.push([info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], '', '', '', 'ขาด', '', '', ''])
          continue
        }
        for (const r of recs) {
          const { tip } = cellInfo([r], info.employee_code, info.id, dateKey)
          const totalFine = Number(r.fine) + Number(r.carried_fine)
          rows.push([
            info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], r.shift.name,
            fmtTime(r.check_in_at), fmtTime(r.check_out_at),
            tip || (r.is_absent ? 'ขาด' : r.is_late ? 'สาย' : 'ปกติ'),
            r.is_late ? '✓' : '',
            totalFine > 0 ? String(totalFine) : '',
            r.note ?? '',
          ])
        }
      }
    }
    return [header, ...rows]
  }

  function downloadCsv(rows: string[][], filename: string) {
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = filename; a.click()
  }
  function exportAll() {
    if (viewMode === 'range') downloadCsv(buildCsvRows(employees, rangeDateKeys), `รายงาน_${rangeStart}_ถึง_${rangeEnd}.csv`)
    else downloadCsv(buildCsvRows(employees), `รายงาน_${MONTHS_TH[month-1]}_${year+543}.csv`)
  }
  function exportOne(emp: typeof employees[0]) {
    const name = `${emp.info.first_name}_${emp.info.last_name}`
    if (viewMode === 'range') downloadCsv(buildCsvRows([emp], rangeDateKeys), `รายงาน_${name}_${rangeStart}_ถึง_${rangeEnd}.csv`)
    else downloadCsv(buildCsvRows([emp]), `รายงาน_${name}_${MONTHS_TH[month-1]}_${year+543}.csv`)
  }

  const totalPresent = [...empMap.values()].reduce((s, e) => s + e.byDate.size, 0)
  const totalLate    = records.filter(r => r.is_late).length
  const totalAbsent  = records.filter(r => r.is_absent).length
  const totalFine    = records.reduce((s, r) => s + Number(r.fine) + Number(r.carried_fine), 0)

  // ── Status dot color for mobile mini-bar ────────────────────────────────────
  function dotColor(status: string) {
    if (status === 'ok')       return '#22c55e'
    if (status === 'late')     return '#f59e0b'
    if (status === 'late2')    return '#f97316'
    if (status === 'absent')   return '#ef4444'
    if (status === 'weekend')  return '#e5e7eb'
    if (status === 'leave' || status === 'holiday') return '#38bdf8'
    if (status === 'sick')     return '#f87171'
    if (status === 'vacation') return '#fde047'
    return '#e5e7eb'
  }

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 700 }}>รายงานการเข้างาน</h2>
        {!isMobile && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>ประวัติการมาทำงานรายพนักงานแต่ละวัน</p>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {/* View mode toggle */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
          {([['month', 'ปฏิทิน'], ['range', 'ช่วงเวลา']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: viewMode === v ? 700 : 500, background: viewMode === v ? '#fff' : 'transparent', color: viewMode === v ? '#f97316' : 'var(--text-muted)', boxShadow: viewMode === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {viewMode === 'range' ? (
          /* Custom date range */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px' }}>
            <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} max={rangeEnd}
              style={{ border: 'none', fontSize: '0.8rem', fontFamily: 'inherit', color: '#374151', background: 'none' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>–</span>
            <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} min={rangeStart} max={now.toISOString().slice(0, 10)}
              style={{ border: 'none', fontSize: '0.8rem', fontFamily: 'inherit', color: '#374151', background: 'none' }} />
          </div>
        ) : (
        /* Month nav */
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>‹</button>
          <button onClick={() => setShowMonthPicker(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', minWidth: isMobile ? 110 : 140, textAlign: 'center', color: 'inherit', fontFamily: 'inherit', padding: '2px 4px', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {MONTHS_TH[month - 1]} {year + 543}
          </button>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>›</button>

          {showMonthPicker && (
            <>
              <div onClick={() => setShowMonthPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 10, display: 'flex', gap: 6 }}>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                  {MONTHS_TH.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(Number(e.target.value))}
                  style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                  {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y + 543}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        )}

        <select value={branch} onChange={e => setBranch(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', flex: isMobile ? '1 1 120px' : 'none' }}>
          <option value="">ทุกสาขา</option>
          {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div style={{ position: 'relative', flex: '1 1 140px', minWidth: 0 }}>
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', boxSizing: 'border-box' }} />
        </div>

        <button onClick={() => refetch()} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>↻</button>
      </div>

      {/* Stats row */}
      {!isLoading && employees.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}><Check size={12} /> มา {totalPresent} ครั้ง</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef3c7', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}><AlertTriangle size={12} /> สาย {totalLate}</span>
          {totalAbsent > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}><X size={12} /> ขาด {totalAbsent}</span>}
          {totalFine > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fdf2f8', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#be185d', fontWeight: 600 }}><Wallet size={12} /> ค่าปรับรวม {totalFine} ฿</span>}
          <span style={{ background: '#f3f4f6', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{employees.length} คน</span>
          {!isMobile && (
            <button onClick={exportAll} disabled={employees.length === 0}
              style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Export รวม
            </button>
          )}
          {isMobile && (
            <button onClick={exportAll} disabled={employees.length === 0}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={12} /> Export
            </button>
          )}
        </div>
      )}

      {isLoading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>กำลังโหลด...</div>}
      {!isLoading && employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          {search.trim() ? 'ไม่พบพนักงานที่ค้นหา' : 'ไม่พบข้อมูลพนักงาน'}
        </div>
      )}

      {/* ── RANGE VIEW: สรุปรายพนักงานในช่วงเวลาที่กำหนดเอง (ไม่ใช่ grid ปฏิทิน) ── */}
      {!isLoading && viewMode === 'range' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rangeSummary.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              {search.trim() ? 'ไม่พบพนักงานที่ค้นหา' : 'ไม่พบข้อมูลพนักงาน'}
            </div>
          )}
          {rangeSummary.map(({ info, byDate, ok, late, absent, leave, fine }) => {
            const isExpanded = expandedRangeEmp === info.id
            return (
              <div key={info.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div onClick={() => setExpandedRangeEmp(isExpanded ? null : info.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                    {initials(info.first_name, info.last_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {info.first_name} {info.last_name}
                      {info.nickname && <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)' }}>({info.nickname})</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{info.employee_code} · {info.branch.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#15803d', background: '#dcfce7', borderRadius: 6, padding: '2px 7px' }}><Check size={10} /> {ok}</span>
                      {late > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '2px 7px' }}><AlertTriangle size={10} /> {late}</span>}
                      {absent > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '2px 7px' }}><X size={10} /> {absent}</span>}
                      {leave > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', borderRadius: 6, padding: '2px 7px' }}><CalendarOff size={10} /> {leave}</span>}
                      {fine > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', fontWeight: 600, color: '#be185d', background: '#fdf2f8', borderRadius: 6, padding: '2px 7px' }}><Wallet size={10} /> {fine} ฿</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: isExpanded ? '#f97316' : 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</div>
                    <button onClick={e => { e.stopPropagation(); exportOne({ info, byDate }) }}
                      style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Download size={11} />
                    </button>
                  </div>
                </div>

                {/* Expanded: day-by-day breakdown ในช่วงที่เลือก */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {rangeDateKeys.map(dateKey => {
                      const d = new Date(dateKey + 'T00:00:00')
                      const dow = d.getDay()
                      const recs = byDate.get(dateKey)
                      const { bg, label, color, tip, status } = cellInfo(recs, info.employee_code, info.id, dateKey)
                      if (status === 'weekend') return null
                      const firstRec = recs?.[0]
                      return (
                        <div key={dateKey}
                          onClick={() => recs?.length && setDetail({ emp: `${info.first_name} ${info.last_name}`, date: dateKey, records: recs })}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #f9fafb', cursor: recs?.length ? 'pointer' : 'default' }}>
                          <div style={{ width: 34, textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>{d.getDate()}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{DAYS_TH[dow]}</div>
                          </div>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{label}</div>
                          <div style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', color: '#374151' }}>{tip}</div>
                          {firstRec && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmtTime(firstRec.check_in_at)}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MOBILE VIEW: Employee cards ─────────────────────────────────────── */}
      {!isLoading && employees.length > 0 && isMobile && viewMode === 'month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {employees.map(({ info, byDate }) => {
            const presentDays = [...byDate.entries()].filter(([dk]) => {
              const dow = new Date(dk + 'T00:00:00Z').getUTCDay()
              return dow !== 0 && dow !== 6
            }).length
            const lateDays    = [...byDate.values()].flat().filter(r => r.is_late).length
            const workingDays = days.filter(d => {
              const dow = new Date(year, month - 1, d).getDay()
              return dow !== 0 && dow !== 6
            }).length
            const isExpanded = expandedEmp === info.id

            return (
              <div key={info.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {/* Card header */}
                <div
                  onClick={() => setExpandedEmp(isExpanded ? null : info.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#f97316,#ea580c)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                  }}>
                    {initials(info.first_name, info.last_name)}
                  </div>

                  {/* Name + summary */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {info.first_name} {info.last_name}
                      {info.nickname && <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)' }}>({info.nickname})</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{info.employee_code} · {info.branch.name}</div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>มา {presentDays}/{workingDays} วัน</span>
                        {lateDays > 0 && <span style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} /> สาย {lateDays} วัน</span>}
                      </div>
                      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${Math.round((presentDays / Math.max(workingDays, 1)) * 100)}%`,
                          background: lateDays > 0 ? 'linear-gradient(90deg,#22c55e,#f59e0b)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: isExpanded ? '#f97316' : 'var(--text-muted)' }}>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); exportOne({ info, byDate }) }}
                      style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    ><Download size={11} /></button>
                  </div>
                </div>

                {/* Mini dot bar */}
                <div style={{ paddingInline: 16, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {days.map(d => {
                      const dow = new Date(year, month - 1, d).getDay()
                      const dateKey = toYMD(year, month, d)
                      const recs = byDate.get(dateKey)
                      const { status } = cellInfo(recs, info.employee_code, info.id, dateKey)
                      const isToday = dateKey === now.toISOString().slice(0, 10)
                      return (
                        <div
                          key={d}
                          title={`${d} ${DAYS_TH[dow]}`}
                          style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: dotColor(status),
                            border: isToday ? '2px solid #f97316' : 'none',
                            flexShrink: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                  {/* Dot legend inline */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    {[['#22c55e','มา'],['#f59e0b','สาย'],['#ef4444','ขาด'],['#38bdf8','ลา'],['#e5e7eb','หยุด']].map(([c, l]) => (
                      <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />
                        {l}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded: day list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6' }}>
                    {days.map(d => {
                      const dow = new Date(year, month - 1, d).getDay()
                      const dateKey = toYMD(year, month, d)
                      const recs = byDate.get(dateKey)
                      const { bg, label, color, tip, status } = cellInfo(recs, info.employee_code, info.id, dateKey)
                      if (status === 'weekend') return null
                      const firstRec = recs?.[0]
                      return (
                        <div
                          key={d}
                          onClick={() => recs?.length && setDetail({ emp: `${info.first_name} ${info.last_name}`, date: dateKey, records: recs })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 16px', borderBottom: '1px solid #f9fafb',
                            cursor: recs?.length ? 'pointer' : 'default',
                            background: recs?.length ? undefined : '#fafafa',
                          }}
                        >
                          {/* Date */}
                          <div style={{ width: 36, flexShrink: 0, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{d}</div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{DAYS_TH[dow]}</div>
                          </div>

                          {/* Status badge */}
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color, flexShrink: 0 }}>
                            {label}
                          </div>

                          {/* Time info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {firstRec ? (
                              <>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{firstRec.shift.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  เข้า {fmtTime(firstRec.check_in_at)} · ออก {fmtTime(firstRec.check_out_at)}
                                  {recs && recs.length > 1 && <span style={{ color: '#f97316', marginLeft: 4 }}>+{recs.length - 1} กะ</span>}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tip || '—'}</div>
                            )}
                          </div>

                          {firstRec?.is_late && (
                            <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '2px 6px', fontWeight: 700, flexShrink: 0 }}>สาย</span>
                          )}
                          {recs?.length ? <span style={{ color: '#d1d5db', fontSize: '0.7rem' }}>›</span> : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DESKTOP VIEW: Matrix table ──────────────────────────────────────── */}
      {!isLoading && employees.length > 0 && !isMobile && viewMode === 'month' && (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.75rem', color: 'var(--text-muted)', overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
            {[
              { bg: '#dcfce7', sym: <Check size={11} />,         label: 'มาปกติ' },
              { bg: '#fef3c7', sym: <AlertTriangle size={11} />, label: 'มาสาย 1' },
              { bg: '#fde8d8', sym: <AlertOctagon size={11} />,  label: 'มาสาย 2' },
              { bg: '#fee2e2', sym: <X size={11} />,             label: 'ขาด' },
              { bg: '#e0f2fe', sym: <CalendarOff size={11} />,   label: 'หยุด' },
              { bg: '#fef9c3', sym: <Palmtree size={11} />,      label: 'พักร้อน' },
              { bg: '#fee2e2', sym: <Thermometer size={11} />,   label: 'ป่วย' },
              { bg: '#f3f4f6', sym: null,                        label: 'เสาร์/อา' },
            ].map(({ bg, sym, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ background: bg, padding: '1px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center' }}>{sym}</span>
                {label}
              </span>
            ))}
            <span style={{ color: 'var(--text-muted)' }}>กดวันที่มีข้อมูลเพื่อดูเวลา</span>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e5e7eb', position: 'sticky', left: 0, background: '#f9fafb', minWidth: 180, zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                    พนักงาน
                  </th>
                  {days.map(d => {
                    const dow = new Date(year, month - 1, d).getDay()
                    return (
                      <th key={d} style={{ padding: '6px 1px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', minWidth: 30, color: (dow === 0 || dow === 6) ? '#d1d5db' : 'var(--text-dark)', fontWeight: 600 }}>
                        <div style={{ fontSize: '0.72rem' }}>{d}</div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 400, color: 'var(--text-muted)' }}>{DAYS_TH[dow]}</div>
                      </th>
                    )
                  })}
                  <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', minWidth: 56, fontWeight: 700, borderLeft: '1px solid #e5e7eb' }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(({ info, byDate }) => {
                  const presentDays = [...byDate.entries()].filter(([dk]) => {
                    const dow = new Date(dk + 'T00:00:00Z').getUTCDay()
                    return dow !== 0 && dow !== 6
                  }).length
                  const lateDays = [...byDate.values()].flat().filter(r => r.is_late).length

                  return (
                    <tr key={info.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 14px', position: 'sticky', left: 0, background: '#fff', zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                              {info.first_name} {info.last_name}
                              {info.nickname && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>({info.nickname})</span>}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{info.employee_code} · {info.branch.name}</div>
                          </div>
                          <button onClick={() => exportOne({ info, byDate })} title="Export รายคน"
                            style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 5, border: '1px solid #e5e7eb', background: '#f9fafb', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Download size={11} />
                          </button>
                        </div>
                      </td>

                      {days.map(d => {
                        const dateKey = toYMD(year, month, d)
                        const recs = byDate.get(dateKey)
                        const { bg, label, color, tip } = cellInfo(recs, info.employee_code, info.id, dateKey)
                        return (
                          <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                            <div
                              onClick={() => recs?.length && setDetail({ emp: `${info.first_name} ${info.last_name}`, date: dateKey, records: recs })}
                              title={tip}
                              style={{ width: 26, height: 26, borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 700, cursor: recs?.length ? 'pointer' : 'default', color }}
                            >{label}</div>
                          </td>
                        )
                      })}

                      <td style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                        <div style={{ fontWeight: 700, color: '#15803d' }}>{presentDays}</div>
                        {lateDays > 0 && <div style={{ fontSize: '0.62rem', color: '#92400e' }}>สาย {lateDays}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
          onClick={() => setDetail(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: 24, width: isMobile ? '100%' : 'auto', minWidth: isMobile ? 0 : 320, maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            {isMobile && <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 16px' }} />}
            <h3 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 700 }}>{detail.emp}</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {new Date(detail.date + 'T12:00:00Z').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {detail.records.map(r => (
              <div key={r.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>{r.shift.name}</div>
                <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>เข้า: <strong style={{ color: 'var(--text-dark)' }}>{fmtTime(r.check_in_at)}</strong></span>
                  <span>ออก: <strong style={{ color: 'var(--text-dark)' }}>{fmtTime(r.check_out_at)}</strong></span>
                </div>
                {r.is_absent
                  ? <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><X size={12} /> ขาด (สายเกินกำหนด)</div>
                  : r.is_late && <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> มาสาย</div>}
                {(Number(r.fine) + Number(r.carried_fine)) > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#be185d', marginTop: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Wallet size={12} /> ค่าปรับ {Number(r.fine) + Number(r.carried_fine)} ฿
                    {Number(r.carried_fine) > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (รวมยกมา {Number(r.carried_fine)})</span>}
                  </div>
                )}
                {r.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5 }}>{r.note}</div>}
              </div>
            ))}
            <button onClick={() => setDetail(null)}
              style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
