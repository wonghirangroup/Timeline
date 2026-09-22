// admin/src/pages/report/employee.tsx
// รายงานพนักงาน — สรุปรายเดือนต่อพนักงาน: เช็คอิน, สาย, ขาด, ค่าปรับ, ลา
// (feedback 2026-09-22 "เอาทุกหมวดก่อนแล้วค่อยทำไลน์อันสุดท้าย" — หมวดที่ 2)
// ประกอบข้อมูลฝั่ง client จาก endpoint ทั่วไปที่มีอยู่แล้ว เหมือน branch.tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, Search, ClipboardCheck, AlertTriangle, Wallet, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } }
interface ApiAttendance { id: string; is_late: boolean; is_absent: boolean; fine: string; carried_fine: string; employee: { id: string } }
interface ApiLeave { id: string; status: string; days: number; start_date: string; end_date: string; employee: { id: string } }

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function toYMD(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

export default function EmployeeReportPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'card' | 'table'>('table')

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))

  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: records = [], isLoading } = useQuery<ApiAttendance[]>({
    queryKey: ['admin', 'employee-report-attendance', year, month],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { startDate, endDate } }).then(r => r.data.data),
  })
  const { data: leaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'employee-report-leaves'],
    queryFn: () => api.get('/api/v1/admin/leave-requests').then(r => r.data.data),
  })

  const q = search.trim().toLowerCase()
  const filteredEmployees = q
    ? employees.filter(e => `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q))
    : employees

  const rows = useMemo(() => {
    return filteredEmployees.map(e => {
      const empRecords = records.filter(r => r.employee.id === e.id)
      const lateCount   = empRecords.filter(r => r.is_late).length
      const absentCount = empRecords.filter(r => r.is_absent).length
      const totalFine   = empRecords.reduce((s, r) => s + Number(r.fine) + Number(r.carried_fine), 0)
      const empLeaves = leaves.filter(l =>
        l.employee.id === e.id && l.status === 'APPROVED' && l.start_date.slice(0, 10) <= endDate && l.end_date.slice(0, 10) >= startDate)
      const leaveDays = empLeaves.reduce((s, l) => s + l.days, 0)
      return { employee: e, checkinCount: empRecords.length, lateCount, absentCount, totalFine, leaveDays }
    })
  }, [filteredEmployees, records, leaves, startDate, endDate])

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    checkinCount: acc.checkinCount + r.checkinCount,
    lateCount: acc.lateCount + r.lateCount,
    totalFine: acc.totalFine + r.totalFine,
  }), { checkinCount: 0, lateCount: 0, totalFine: 0 }), [rows])

  const kpis = [
    { label: 'พนักงานรวม', value: rows.length, icon: <Users size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'เช็คอินรวม (วัน)', value: totals.checkinCount, icon: <ClipboardCheck size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'มาสายรวม', value: totals.lateCount, icon: <AlertTriangle size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'ค่าปรับรวม (฿)', value: totals.totalFine.toLocaleString(), icon: <Wallet size={15}/>, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', width: 'fit-content' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 140, textAlign: 'center' }}>{MONTHS_TH[month - 1]} {year + 543}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>›</button>
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส"
            style={{ width: '100%', padding: '7px 12px 7px 30px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2, marginLeft: 'auto' }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#ea580c' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
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

      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>ไม่พบพนักงาน</div>
      ) : (isMobile || view === 'card') ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {rows.map(r => (
            <div key={r.employee.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
              <button onClick={() => navigate(`/employee/${r.employee.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'block', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#ea580c', textDecoration: 'underline', textUnderlineOffset: 2, fontSize: '0.9rem' }}>{r.employee.first_name} {r.employee.last_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.employee.nickname} · {r.employee.employee_code} · {r.employee.branch.name}</div>
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.78rem' }}>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>เช็คอิน</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{r.checkinCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>มาสาย</div><div style={{ fontWeight: 700, color: r.lateCount > 0 ? '#d97706' : '#94a3b8' }}>{r.lateCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ขาด</div><div style={{ fontWeight: 700, color: r.absentCount > 0 ? '#dc2626' : '#94a3b8' }}>{r.absentCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ค่าปรับ (฿)</div><div style={{ fontWeight: 700, color: r.totalFine > 0 ? '#dc2626' : '#94a3b8' }}>{r.totalFine.toLocaleString()}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ลา (วัน)</div><div style={{ fontWeight: 700, color: r.leaveDays > 0 ? '#374151' : '#94a3b8' }}>{r.leaveDays}</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['พนักงาน', 'สาขา', 'เช็คอิน', 'มาสาย', 'ขาด', 'ค่าปรับ (฿)', 'ลา (วัน)'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.employee.id} style={{ borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => navigate(`/employee/${r.employee.id}`)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <div style={{ fontWeight: 700, color: '#ea580c', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.employee.first_name} {r.employee.last_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.employee.nickname} · {r.employee.employee_code}</div>
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{r.employee.branch.name}</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{r.checkinCount}</td>
                  <td style={{ padding: '10px 12px', color: r.lateCount > 0 ? '#d97706' : '#94a3b8' }}>{r.lateCount}</td>
                  <td style={{ padding: '10px 12px', color: r.absentCount > 0 ? '#dc2626' : '#94a3b8' }}>{r.absentCount}</td>
                  <td style={{ padding: '10px 12px', color: r.totalFine > 0 ? '#dc2626' : '#94a3b8', fontWeight: r.totalFine > 0 ? 700 : 400 }}>{r.totalFine.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: r.leaveDays > 0 ? '#374151' : '#94a3b8' }}>{r.leaveDays}</td>
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
