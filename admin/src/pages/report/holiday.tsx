// admin/src/pages/report/holiday.tsx
// รายงานวันหยุด — วันหยุดบริษัทที่ประกาศ + สรุปการจองวันหยุดประจำเดือน/สัปดาห์
// ต่อสาขา (feedback 2026-09-22 "เอาทุกหมวดก่อนแล้วค่อยทำไลน์อันสุดท้าย")
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarOff, Palmtree, Users, Clock, Check } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiHoliday { id: string; date: string; name: string; compensate_days: number | null; target_branches: string[] | null }
interface ApiBranch { id: string; name: string }
interface ApiWeeklyOff { id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED'; employee: { branch: { id: string; name: string } } }

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

  const totals = useMemo(() => branchRows.reduce((acc, r) => ({
    total: acc.total + r.total, approved: acc.approved + r.approved, pending: acc.pending + r.pending,
  }), { total: 0, approved: 0, pending: 0 }), [branchRows])

  const kpis = [
    { label: 'วันหยุดบริษัทเดือนนี้', value: monthHolidays.length, icon: <Palmtree size={15}/>, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    { label: 'คำขอวันหยุดรวม', value: totals.total, icon: <CalendarOff size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'อนุมัติแล้ว', value: totals.approved, icon: <Check size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'รอพิจารณา', value: totals.pending, icon: <Clock size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', width: 'fit-content' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 140, textAlign: 'center' }}>{MONTHS_TH[month - 1]} {year + 543}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>›</button>
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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>วันหยุดบริษัทที่ประกาศ</div>
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

      {/* สรุปคำขอวันหยุดต่อสาขา */}
      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>คำขอวันหยุดประจำเดือน/สัปดาห์ ต่อสาขา</div>
          <div style={{ overflowX: 'auto' }}>
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
                <tr key={r.branch.id} style={{ borderBottom: idx < branchRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
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
