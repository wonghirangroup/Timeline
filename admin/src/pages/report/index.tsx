// admin/src/pages/report/index.tsx — Attendance History Report
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

interface AttendanceRecord {
  id: string
  date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
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

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))
  const daysCount = getDaysInMonth(year, month)
  const days      = Array.from({ length: daysCount }, (_, i) => i + 1)

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['admin', 'branches'],
    queryFn:  () => api.get('/api/v1/admin/branches').then((r: any) => r.data.data),
  })

  const { data: records = [], isLoading, refetch } = useQuery<AttendanceRecord[]>({
    queryKey: ['admin', 'attendance-report', year, month, branch],
    queryFn:  () => api.get('/api/v1/admin/attendance', {
      params: { startDate, endDate, ...(branch ? { branchId: branch } : {}) },
    }).then((r: any) => r.data.data),
  })

  const { data: leaveRecords = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['admin', 'leave-report', year, month, branch],
    queryFn:  () => api.get('/api/v1/admin/leave-requests', {
      params: { ...(branch ? { branchId: branch } : {}) },
    }).then((r: any) => r.data.data),
  })

  const leaveMap = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const l of leaveRecords) {
      if (l.status !== 'APPROVED') continue
      const start = new Date(l.start_date)
      const end   = new Date(l.end_date)
      const orig  = l.reason?.match(/^\[(.+?)\]/)?.[1] ?? l.leave_type
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10)
        if (!m.has(l.employee_id)) m.set(l.employee_id, new Map())
        m.get(l.employee_id)!.set(key, orig)
      }
    }
    return m
  }, [leaveRecords])

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
    const list = [...empMap.values()]
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(e =>
      e.info.first_name.toLowerCase().includes(q) ||
      e.info.last_name.toLowerCase().includes(q)  ||
      (e.info.nickname ?? '').toLowerCase().includes(q) ||
      e.info.employee_code.toLowerCase().includes(q)
    )
  }, [empMap, search])

  function cellInfo(recs: AttendanceRecord[] | undefined, empCode: string, empId: string, day: number) {
    const dow     = new Date(year, month - 1, day).getDay()
    const dept    = empCode.split('-')[1] ?? ''
    const dateKey = toYMD(year, month, day)
    const leaveType = leaveMap.get(empId)?.get(dateKey)

    if (leaveType) {
      if (leaveType === 'หยุด' || leaveType === 'หยุดนักขัตฤกษ์')
        return { bg: '#e0f2fe', label: '🏖', color: '#0369a1', tip: leaveType, status: 'leave' }
      if (leaveType === 'SICK' || leaveType === 'ลาป่วย')
        return { bg: '#fee2e2', label: '🤒', color: '#dc2626', tip: 'ลาป่วย', status: 'sick' }
      if (leaveType === 'VACATION' || leaveType === 'พักร้อน' || leaveType === 'ลาพักร้อน')
        return { bg: '#fef9c3', label: '🌴', color: '#ca8a04', tip: 'พักร้อน', status: 'vacation' }
      return { bg: '#e0f2fe', label: '📋', color: '#0369a1', tip: leaveType, status: 'leave' }
    }

    const isWeekendOff = (dow === 0 || dow === 6) && dept === '02'
    if (!recs || recs.length === 0) {
      if (isWeekendOff) return { bg: '#f3f4f6', label: '', color: '#9ca3af', tip: 'วันหยุดสุดสัปดาห์', status: 'weekend' }
      if (dow === 0 || dow === 6) return { bg: '#f3f4f6', label: '', color: '#9ca3af', tip: '', status: 'weekend' }
      return { bg: '#fee2e2', label: '✗', color: '#ef4444', tip: 'ไม่มีข้อมูล', status: 'absent' }
    }

    const note = recs.map(r => r.note ?? '').join(' ')
    if (note.includes('วันหยุด')) return { bg: '#e0f2fe', label: '🏖', color: '#0369a1', tip: 'วันหยุด', status: 'holiday' }
    if (note.includes('ขาดงาน')) return { bg: '#fee2e2', label: '✗', color: '#ef4444', tip: 'ขาดงาน', status: 'absent' }
    if (note.includes('ระดับ 2'))  return { bg: '#fde8d8', label: '!!', color: '#c2410c', tip: 'มาสาย ระดับ 2', status: 'late2' }
    if (note.includes('ระดับ 1') || recs.some(r => r.is_late)) return { bg: '#fef3c7', label: '!', color: '#92400e', tip: 'มาสาย', status: 'late' }
    return { bg: '#dcfce7', label: '✓', color: '#15803d', tip: 'มาปกติ', status: 'ok' }
  }

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function buildCsvRows(empList: typeof employees) {
    const header = ['รหัสพนักงาน','ชื่อ','นามสกุล','ชื่อเล่น','สาขา','วันที่','วัน','กะ','เวลาเข้า','เวลาออก','สถานะ','สาย','หมายเหตุ']
    const rows: string[][] = []
    for (const { info, byDate } of empList) {
      for (const day of days) {
        const dateKey = toYMD(year, month, day)
        const dow     = new Date(year, month - 1, day).getDay()
        const recs    = byDate.get(dateKey)
        const leaveType = leaveMap.get(info.id)?.get(dateKey)
        if (leaveType) {
          rows.push([info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], '', '', '', 'ลา', '', leaveType])
          continue
        }
        if (!recs || recs.length === 0) {
          if (dow === 0 || dow === 6) continue
          rows.push([info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], '', '', '', 'ขาด', '', ''])
          continue
        }
        for (const r of recs) {
          rows.push([
            info.employee_code, info.first_name, info.last_name, info.nickname ?? '', info.branch.name,
            dateKey, DAYS_TH[dow], r.shift.name,
            fmtTime(r.check_in_at), fmtTime(r.check_out_at),
            r.is_late ? 'สาย' : 'ปกติ',
            r.is_late ? '✓' : '',
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
  function exportAll() { downloadCsv(buildCsvRows(employees), `รายงาน_${MONTHS_TH[month-1]}_${year+543}.csv`) }
  function exportOne(emp: typeof employees[0]) {
    const name = `${emp.info.first_name}_${emp.info.last_name}`
    downloadCsv(buildCsvRows([emp]), `รายงาน_${name}_${MONTHS_TH[month-1]}_${year+543}.csv`)
  }

  const totalPresent = [...empMap.values()].reduce((s, e) => s + e.byDate.size, 0)
  const totalLate    = records.filter(r => r.is_late).length

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
        {!isMobile && <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>ประวัติการมาทำงานรายพนักงานแต่ละวัน</p>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280', lineHeight: 1, padding: 0 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: isMobile ? 110 : 140, textAlign: 'center' }}>
            {MONTHS_TH[month - 1]} {year + 543}
          </span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280', lineHeight: 1, padding: 0 }}>›</button>
        </div>

        <select value={branch} onChange={e => setBranch(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', flex: isMobile ? '1 1 120px' : 'none' }}>
          <option value="">ทุกสาขา</option>
          {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา..."
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', flex: '1 1 140px', minWidth: 0 }} />

        <button onClick={() => refetch()} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>↻</button>
      </div>

      {/* Stats row */}
      {!isLoading && records.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: '#dcfce7', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>✓ มา {totalPresent} ครั้ง</span>
          <span style={{ background: '#fef3c7', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>⚠ สาย {totalLate}</span>
          <span style={{ background: '#f3f4f6', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>{employees.length} คน</span>
          {!isMobile && (
            <button onClick={exportAll} disabled={employees.length === 0}
              style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              ⬇️ Export รวม
            </button>
          )}
          {isMobile && (
            <button onClick={exportAll} disabled={employees.length === 0}
              style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              ⬇️ Export
            </button>
          )}
        </div>
      )}

      {isLoading && <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>กำลังโหลด...</div>}
      {!isLoading && employees.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          {records.length === 0 ? 'ไม่พบข้อมูลเดือนนี้' : 'ไม่พบพนักงานที่ค้นหา'}
        </div>
      )}

      {/* ── MOBILE VIEW: Employee cards ─────────────────────────────────────── */}
      {!isLoading && employees.length > 0 && isMobile && (
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
                      {info.nickname && <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#9ca3af' }}>({info.nickname})</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{info.employee_code} · {info.branch.name}</div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>มา {presentDays}/{workingDays} วัน</span>
                        {lateDays > 0 && <span style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 600 }}>⚠ สาย {lateDays} วัน</span>}
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
                    <div style={{ fontSize: '0.7rem', color: isExpanded ? '#f97316' : '#9ca3af' }}>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); exportOne({ info, byDate }) }}
                      style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: '0.65rem', cursor: 'pointer' }}
                    >⬇️</button>
                  </div>
                </div>

                {/* Mini dot bar */}
                <div style={{ paddingInline: 16, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {days.map(d => {
                      const dow = new Date(year, month - 1, d).getDay()
                      const dateKey = toYMD(year, month, d)
                      const recs = byDate.get(dateKey)
                      const { status } = cellInfo(recs, info.employee_code, info.id, d)
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
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: '0.6rem', color: '#9ca3af' }}>
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
                      const { bg, label, color, tip, status } = cellInfo(recs, info.employee_code, info.id, d)
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
                            <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{DAYS_TH[dow]}</div>
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
                                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                  เข้า {fmtTime(firstRec.check_in_at)} · ออก {fmtTime(firstRec.check_out_at)}
                                  {recs && recs.length > 1 && <span style={{ color: '#f97316', marginLeft: 4 }}>+{recs.length - 1} กะ</span>}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{tip || '—'}</div>
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
      {!isLoading && employees.length > 0 && !isMobile && (
        <>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: '0.75rem', color: '#6b7280', overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
            {[['#dcfce7','✓','มาปกติ'],['#fef3c7','!','มาสาย 1'],['#fde8d8','!!','มาสาย 2'],['#fee2e2','✗','ขาด'],['#e0f2fe','🏖','หยุด'],['#fef9c3','🌴','พักร้อน'],['#fee2e2','🤒','ป่วย'],['#f3f4f6','','เสาร์/อา']].map(([bg, sym, label]) => (
              <span key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ background: bg as string, padding: '1px 7px', borderRadius: 4, fontSize: '0.72rem' }}>{sym as string}</span>
                {label as string}
              </span>
            ))}
            <span style={{ color: '#9ca3af' }}>กดวันที่มีข้อมูลเพื่อดูเวลา</span>
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
                        <div style={{ fontSize: '0.62rem', fontWeight: 400, color: '#9ca3af' }}>{DAYS_TH[dow]}</div>
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
                              {info.nickname && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>({info.nickname})</span>}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>{info.employee_code} · {info.branch.name}</div>
                          </div>
                          <button onClick={() => exportOne({ info, byDate })} title="Export รายคน"
                            style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 5, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontSize: '0.68rem', cursor: 'pointer', lineHeight: 1.4 }}>
                            ⬇️
                          </button>
                        </div>
                      </td>

                      {days.map(d => {
                        const dateKey = toYMD(year, month, d)
                        const recs = byDate.get(dateKey)
                        const { bg, label, color, tip } = cellInfo(recs, info.employee_code, info.id, d)
                        return (
                          <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                            <div
                              onClick={() => recs?.length && setDetail({ emp: `${info.first_name} ${info.last_name}`, date: dateKey, records: recs })}
                              title={tip}
                              style={{ width: 26, height: 26, borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: label === '!!' ? '0.6rem' : '0.68rem', fontWeight: 700, cursor: recs?.length ? 'pointer' : 'default', color }}
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
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#6b7280' }}>
              {new Date(detail.date + 'T12:00:00Z').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {detail.records.map(r => (
              <div key={r.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>{r.shift.name}</div>
                <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', color: '#6b7280' }}>
                  <span>เข้า: <strong style={{ color: 'var(--text-dark)' }}>{fmtTime(r.check_in_at)}</strong></span>
                  <span>ออก: <strong style={{ color: 'var(--text-dark)' }}>{fmtTime(r.check_out_at)}</strong></span>
                </div>
                {r.is_late && <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 5, fontWeight: 600 }}>⚠ มาสาย</div>}
                {r.note && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 5 }}>{r.note}</div>}
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
