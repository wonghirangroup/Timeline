// admin/src/pages/report/holiday.tsx
// รายงานวันหยุด — วันหยุดบริษัทที่ประกาศ + สรุปการจองวันหยุดประจำเดือน/สัปดาห์
// ต่อสาขา (feedback 2026-09-22 "เอาทุกหมวดก่อนแล้วค่อยทำไลน์อันสุดท้าย")
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff, Palmtree, Users, Clock, Check, Table2, LayoutGrid, BarChart3, Search, User } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import InfoTooltip from '../../components/ui/InfoTooltip'
import ReportBarChart from '../../components/shared/ReportBarChart'
import ReportExportBar from '../../components/shared/ReportExportBar'
import { downloadCsv } from '../../lib/exportCsv'
import MonthNav from '../../components/ui/MonthNav'

interface ApiHoliday { id: string; date: string; name: string; compensate_days: number | null; target_branches: string[] | null }
interface ApiBranch { id: string; name: string }
interface ApiWeeklyOff { id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; employee: { id: string; first_name: string; last_name: string; nickname?: string | null; employee_code: string; branch: { id: string; name: string } } }

const DAY_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const STATUS_CHIP = {
  APPROVED: { label: 'อนุมัติ', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  REJECTED: { label: 'ปฏิเสธ', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
} as const
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

// week_start = Monday, day_of_week = 0 (Sun) – 6 (Sat)
function resolveDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

export default function HolidayReportPage() {
  const isMobile = useIsMobile()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView]   = useState<'card' | 'table' | 'chart'>('table')
  const [groupBy, setGroupBy] = useState<'branch' | 'person'>('branch')
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const ym = `${year}-${String(month).padStart(2, '0')}`

  const { data: holidays = [] } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'holiday-report-holidays', year],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year } }).then(r => r.data.data),
  })
  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: weeklyOff = [], isLoading } = useQuery<ApiWeeklyOff[]>({
    queryKey: ['admin', 'holiday-report-weekly-off'],
    queryFn: () => api.get('/api/v1/admin/weekly-off').then(r => r.data.data),
  })

  const monthHolidays = useMemo(() => holidays.filter(h => h.date.slice(0, 7) === ym), [holidays, ym])

  const branchRows = useMemo(() => {
    return branches.map(b => {
      const reqs = weeklyOff.filter(w => w.employee.branch.id === b.id && resolveDate(w.week_start, w.day_of_week).slice(0, 7) === ym)
      return {
        branch: b,
        total: reqs.length,
        approved: reqs.filter(r => r.status === 'APPROVED').length,
        pending: reqs.filter(r => r.status === 'PENDING').length,
        rejected: reqs.filter(r => r.status === 'REJECTED').length,
      }
    })
  }, [branches, weeklyOff, ym])

  // รายคน: วันหยุดของแต่ละคนในเดือนที่เลือก (เรียงตามวันที่) — ใช้ข้อมูลเดียวกับสรุปรายสาขา
  const personRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const byEmp = new Map<string, { emp: ApiWeeklyOff['employee']; days: { id: string; date: string; status: ApiWeeklyOff['status'] }[] }>()
    for (const w of weeklyOff) {
      const date = resolveDate(w.week_start, w.day_of_week)
      if (date.slice(0, 7) !== ym) continue
      if (branchFilter && w.employee.branch.id !== branchFilter) continue
      const e = w.employee
      if (q && !`${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q)) continue
      const row = byEmp.get(e.id) ?? { emp: e, days: [] }
      row.days.push({ id: w.id, date, status: w.status })
      byEmp.set(e.id, row)
    }
    return [...byEmp.values()].map(r => ({
      ...r,
      days: [...r.days].sort((a, b) => a.date.localeCompare(b.date)),
      approved: r.days.filter(d => d.status === 'APPROVED').length,
      pending: r.days.filter(d => d.status === 'PENDING').length,
      rejected: r.days.filter(d => d.status === 'REJECTED').length,
    })).sort((a, b) => a.emp.first_name.localeCompare(b.emp.first_name, 'th'))
  }, [weeklyOff, ym, search, branchFilter])
  const fmtDay = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${DAY_TH[d.getDay()]} ${d.getDate()}` }

  const totals = useMemo(() => branchRows.reduce((acc, r) => ({
    total: acc.total + r.total, approved: acc.approved + r.approved, pending: acc.pending + r.pending,
  }), { total: 0, approved: 0, pending: 0 }), [branchRows])

  function exportPersonCsv() {
    downloadCsv([
      ['รหัส', 'ชื่อ', 'สาขา', 'จำนวนวัน', 'อนุมัติ', 'รอพิจารณา', 'ปฏิเสธ', 'วันที่หยุด'],
      ...personRows.map(r => [r.emp.employee_code, `${r.emp.first_name} ${r.emp.last_name}`, r.emp.branch.name, String(r.days.length), String(r.approved), String(r.pending), String(r.rejected),
        r.days.map(d => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)} (${STATUS_CHIP[d.status].label})`).join(', ')]),
    ], `วันหยุดรายคน_${MONTHS_TH[month - 1]}_${year + 543}.csv`)
  }

  function exportCsv() {
    if (groupBy === 'person') return exportPersonCsv()
    const holidayHeader = ['วันหยุดบริษัทที่ประกาศ']
    const holidayRows = [['วันที่', 'ชื่อวันหยุด', 'ขอบเขต', 'ชดเชย (วัน)'], ...monthHolidays.map(h => [
      h.date.slice(0, 10), h.name, h.target_branches?.length ? `${h.target_branches.length} สาขา` : 'ทั้งบริษัท', String(h.compensate_days ?? 1),
    ])]
    const branchHeader = ['คำขอวันหยุดประจำเดือน/สัปดาห์ ต่อสาขา']
    const branchRowsOut = [['สาขา', 'คำขอรวม', 'อนุมัติ', 'รอพิจารณา', 'ปฏิเสธ'], ...branchRows.map(r => [
      r.branch.name, String(r.total), String(r.approved), String(r.pending), String(r.rejected),
    ])]
    downloadCsv([holidayHeader, ...holidayRows, [], branchHeader, ...branchRowsOut], `รายงานวันหยุด_${MONTHS_TH[month - 1]}_${year + 543}.csv`)
  }

  const kpis = [
    { label: 'วันหยุดบริษัทเดือนนี้', value: monthHolidays.length, icon: <Palmtree size={15}/>, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    { label: 'คำขอวันหยุดรวม', value: totals.total, icon: <CalendarOff size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'อนุมัติแล้ว', value: totals.approved, icon: <Check size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'รอพิจารณา', value: totals.pending, icon: <Clock size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="print-only" style={{ margin: 0 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 700 }}>รายงานวันหยุด</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>{MONTHS_TH[month - 1]} {year + 543} · พิมพ์เมื่อ {now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <MonthNav label={`${MONTHS_TH[month - 1]} ${year + 543}`} onPrev={prevMonth} onNext={nextMonth} />
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
          {([['branch', 'รายสาขา', Users], ['person', 'รายคน', User]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => { setGroupBy(v); if (v === 'person' && view === 'chart') setView('table') }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: groupBy === v ? 700 : 500, background: groupBy === v ? '#fff' : 'transparent', color: groupBy === v ? '#244B83' : 'var(--text-muted)', boxShadow: groupBy === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        {groupBy === 'person' && (
          <>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส"
                style={{ padding: '7px 10px 7px 29px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', fontFamily: 'inherit', width: 160 }} />
            </div>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', fontFamily: 'inherit' }}>
              <option value="">ทุกสาขา</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </>
        )}
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
            {(groupBy === 'person' ? ([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const) : ([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2], ['chart', 'กราฟ', BarChart3]] as const)).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#244B83' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
        <ReportExportBar onExportCsv={exportCsv} disabled={isLoading} mobile={isMobile} />
        <InfoTooltip title="รายงานวันหยุด" width={300} content={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>ส่วนบนคือวันหยุดบริษัทที่ประกาศไว้ในเดือนนี้ ส่วนล่างคือสรุปคำขอวันหยุดประจำสัปดาห์/เดือนที่พนักงานยื่นมา แยกตามสาขา</li>
            <li>สลับ <b>รายสาขา / รายคน</b> ได้ — รายคนจะแสดงว่าแต่ละคนหยุดวันไหนบ้างในเดือนนี้ (วันหยุดประจำสัปดาห์/เดือนที่ยื่นขอ ไม่รวมการลา)</li>
            <li>สลับมุมมอง <b>การ์ด / ตาราง / กราฟ</b> ได้ (เฉพาะส่วนสรุปคำขอ) — กราฟเทียบจำนวนอนุมัติ/รอพิจารณา/ปฏิเสธ เป็นรายสาขา</li>
          </ul>
        } />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: isMobile ? 8 : 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: k.color, display: 'flex' }}>{k.icon}</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* วันหยุดบริษัท */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E6ECF4', fontWeight: 700, fontSize: '0.85rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
          วันหยุดบริษัทที่ประกาศ
          <InfoTooltip content="“ชดเชย X วัน” คือจำนวนวันหยุดชดเชยที่บริษัทให้พนักงาน กรณีวันหยุดนี้ตรงกับวันที่พนักงานต้องทำงานตามปกติ" />
        </div>
        {monthHolidays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '0.85rem' }}>ไม่มีวันหยุดบริษัทประกาศไว้ในเดือนนี้</div>
        ) : (
          <div>
            {monthHolidays.map((h, idx) => {
              const d = new Date(h.date.slice(0, 10) + 'T00:00:00')
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: idx < monthHolidays.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfeff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 800 }}>
                    {d.getDate()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{h.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.target_branches?.length ? `${h.target_branches.length} สาขา` : 'ทั้งบริษัท'} · ชดเชย {h.compensate_days ?? 1} วัน</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* รายคน */}
      {groupBy === 'person' && (isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : personRows.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.85rem' }}>ไม่มีใครขอวันหยุดในเดือนนี้{search || branchFilter ? ' (ตามตัวกรองที่เลือก)' : ''}</div>
      ) : (isMobile || view === 'card') ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {personRows.map(r => (
            <div key={r.emp.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E6ECF4', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{r.emp.first_name} {r.emp.last_name}{r.emp.nickname ? ` (${r.emp.nickname})` : ''}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 10px' }}>{r.emp.employee_code} · {r.emp.branch.name}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {r.days.map(d => (
                  <span key={d.id} title={STATUS_CHIP[d.status].label} style={{ padding: '3px 9px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, color: STATUS_CHIP[d.status].color, background: STATUS_CHIP[d.status].bg, border: `1px solid ${STATUS_CHIP[d.status].border}` }}>{fmtDay(d.date)}</span>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>รวม {r.days.length} วัน · อนุมัติ {r.approved}{r.pending > 0 ? ` · รอ ${r.pending}` : ''}{r.rejected > 0 ? ` · ปฏิเสธ ${r.rejected}` : ''}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E6ECF4', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>วันหยุดรายคน · {MONTHS_TH[month - 1]} {year + 543} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({personRows.length} คน)</span></div>
          <div className="report-table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['พนักงาน', 'สาขา', 'จำนวนวัน', 'วันที่หยุด'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {personRows.map((r, idx) => (
                  <tr key={r.emp.id} style={{ borderBottom: idx < personRows.length - 1 ? '1px solid #E6ECF4' : 'none' }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{r.emp.first_name} {r.emp.last_name}{r.emp.nickname ? ` (${r.emp.nickname})` : ''}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.emp.employee_code}</div>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b', whiteSpace: 'nowrap' }}>{r.emp.branch.name}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', fontWeight: 700, color: '#374151' }}>{r.days.length}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {r.days.map(d => (
                          <span key={d.id} title={STATUS_CHIP[d.status].label} style={{ padding: '3px 9px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, color: STATUS_CHIP[d.status].color, background: STATUS_CHIP[d.status].bg, border: `1px solid ${STATUS_CHIP[d.status].border}` }}>{fmtDay(d.date)}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 16px', borderTop: '1px solid #E6ECF4', fontSize: '0.72rem', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(Object.keys(STATUS_CHIP) as (keyof typeof STATUS_CHIP)[]).map(k => <span key={k} style={{ color: STATUS_CHIP[k].color, fontWeight: 600 }}>● {STATUS_CHIP[k].label}</span>)}
          </div>
        </div>
      ))}

      {/* สรุปคำขอวันหยุดต่อสาขา */}
      {groupBy === 'person' ? null : isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : (isMobile || view === 'card') ? (
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginBottom: 10 }}>คำขอวันหยุดประจำเดือน/สัปดาห์ ต่อสาขา</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {branchRows.map(r => (
              <div key={r.branch.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E6ECF4', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#111827', fontSize: '0.88rem', marginBottom: 10 }}><Users size={13} color="#94a3b8" />{r.branch.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.78rem' }}>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>รวม</div><div style={{ fontWeight: 700, color: '#374151' }}>{r.total}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>อนุมัติ</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{r.approved}</div></div>
                  <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>รอพิจารณา</div><div style={{ fontWeight: 700, color: r.pending > 0 ? '#d97706' : '#94a3b8' }}>{r.pending}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : view === 'chart' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>คำขอวันหยุดประจำเดือน/สัปดาห์ ต่อสาขา</div>
          <ReportBarChart
            data={branchRows.map(r => ({ name: r.branch.name, approved: r.approved, pending: r.pending, rejected: r.rejected }))}
            xKey="name"
            series={[
              { key: 'approved', label: 'อนุมัติ', color: '#16a34a' },
              { key: 'pending', label: 'รอพิจารณา', color: '#d97706' },
              { key: 'rejected', label: 'ปฏิเสธ', color: '#94a3b8' },
            ]}
          />
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E6ECF4', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>คำขอวันหยุดประจำเดือน/สัปดาห์ ต่อสาขา</div>
          <div className="report-table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['สาขา', 'คำขอรวม', 'อนุมัติ', 'รอพิจารณา', 'ปฏิเสธ'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchRows.map((r, idx) => (
                <tr key={r.branch.id} style={{ borderBottom: idx < branchRows.length - 1 ? '1px solid #E6ECF4' : 'none' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={12} color="#94a3b8" />{r.branch.name}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{r.total}</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{r.approved}</td>
                  <td style={{ padding: '10px 12px', color: r.pending > 0 ? '#d97706' : '#94a3b8', fontWeight: r.pending > 0 ? 700 : 400 }}>{r.pending}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
