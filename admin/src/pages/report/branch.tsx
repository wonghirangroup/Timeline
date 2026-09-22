// admin/src/pages/report/branch.tsx
// รายงานสาขา — สรุปรายเดือนต่อสาขา: พนักงาน, เช็คอิน, สาย/ขาด, ค่าปรับ, การลา
// (feedback 2026-09-22 "จัดกลุ่มรายงานใหม่แยก 7 หมวด" — หมวดแรกที่เลือกทำจาก
// 6 หมวดที่ยังไม่มีหน้า) ประกอบข้อมูลฝั่ง client จาก endpoint ทั่วไปที่มีอยู่
// แล้ว (attendance/leave-requests/employees/branches) แบบเดียวกับ
// report/index.tsx เดิม — ไม่ต้องเพิ่ม backend endpoint ใหม่
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, ClipboardCheck, AlertTriangle, Wallet, Table2, LayoutGrid, BarChart3 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import ReportBarChart from '../../components/shared/ReportBarChart'

interface ApiBranch { id: string; name: string }
interface ApiEmployee { id: string; branch_id: string }
interface ApiAttendance {
  id: string; is_late: boolean; is_absent: boolean
  fine: string; carried_fine: string
  employee: { branch: { id: string } }
}
interface ApiLeave {
  id: string; status: string; start_date: string; end_date: string
  employee: { branch: { id: string } }
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function toYMD(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

export default function BranchReportPage() {
  const isMobile = useIsMobile()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView]   = useState<'card' | 'table' | 'chart'>('table')

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: records = [], isLoading } = useQuery<ApiAttendance[]>({
    queryKey: ['admin', 'branch-report-attendance', year, month],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { startDate, endDate } }).then(r => r.data.data),
  })
  const { data: leaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'branch-report-leaves'],
    queryFn: () => api.get('/api/v1/admin/leave-requests').then(r => r.data.data),
  })

  const rows = useMemo(() => {
    return branches.map(b => {
      const empCount = employees.filter(e => e.branch_id === b.id).length
      const branchRecords = records.filter(r => r.employee.branch.id === b.id)
      const lateCount   = branchRecords.filter(r => r.is_late).length
      const absentCount = branchRecords.filter(r => r.is_absent).length
      const totalFine   = branchRecords.reduce((s, r) => s + Number(r.fine) + Number(r.carried_fine), 0)
      const branchLeaves = leaves.filter(l =>
        l.employee.branch.id === b.id && l.start_date.slice(0, 10) <= endDate && l.end_date.slice(0, 10) >= startDate)
      const approvedLeaves = branchLeaves.filter(l => l.status === 'APPROVED').length
      const pendingLeaves  = branchLeaves.filter(l => l.status === 'PENDING').length
      return {
        branch: b, empCount, checkinCount: branchRecords.length,
        lateCount, absentCount, totalFine, approvedLeaves, pendingLeaves,
      }
    })
  }, [branches, employees, records, leaves, startDate, endDate])

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    empCount: acc.empCount + r.empCount,
    checkinCount: acc.checkinCount + r.checkinCount,
    lateCount: acc.lateCount + r.lateCount,
    absentCount: acc.absentCount + r.absentCount,
    totalFine: acc.totalFine + r.totalFine,
    approvedLeaves: acc.approvedLeaves + r.approvedLeaves,
    pendingLeaves: acc.pendingLeaves + r.pendingLeaves,
  }), { empCount: 0, checkinCount: 0, lateCount: 0, absentCount: 0, totalFine: 0, approvedLeaves: 0, pendingLeaves: 0 }), [rows])

  const kpis = [
    { label: 'พนักงานรวม', value: totals.empCount, icon: <Users size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'เช็คอินรวม (วัน)', value: totals.checkinCount, icon: <ClipboardCheck size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'มาสายรวม', value: totals.lateCount, icon: <AlertTriangle size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'ค่าปรับรวม (฿)', value: totals.totalFine.toLocaleString(), icon: <Wallet size={15}/>, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', width: 'fit-content' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 140, textAlign: 'center' }}>{MONTHS_TH[month - 1]} {year + 543}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>›</button>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2], ['chart', 'กราฟ', BarChart3]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#ea580c' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI row */}
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

      {/* Table / Cards */}
      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : rows.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
          <Building2 size={22} style={{ marginBottom: 8 }} /><div>ยังไม่มีสาขา</div>
        </div>
      ) : (isMobile || view === 'card') ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {rows.map(r => (
            <div key={r.branch.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #FB923C, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={15} color="#fff" />
                </div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{r.branch.name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.78rem' }}>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>พนักงาน</div><div style={{ fontWeight: 700, color: '#374151' }}>{r.empCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>เช็คอิน</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{r.checkinCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>มาสาย</div><div style={{ fontWeight: 700, color: r.lateCount > 0 ? '#d97706' : '#94a3b8' }}>{r.lateCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ขาด</div><div style={{ fontWeight: 700, color: r.absentCount > 0 ? '#dc2626' : '#94a3b8' }}>{r.absentCount}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ค่าปรับ (฿)</div><div style={{ fontWeight: 700, color: r.totalFine > 0 ? '#dc2626' : '#94a3b8' }}>{r.totalFine.toLocaleString()}</div></div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ลา (อนุมัติ/รอ)</div><div><span style={{ fontWeight: 700, color: '#16a34a' }}>{r.approvedLeaves}</span>{' / '}<span style={{ fontWeight: 700, color: r.pendingLeaves > 0 ? '#d97706' : '#94a3b8' }}>{r.pendingLeaves}</span></div></div>
              </div>
            </div>
          ))}
        </div>
      ) : view === 'chart' ? (
        <ReportBarChart
          data={rows.map(r => ({ name: r.branch.name, checkin: r.checkinCount, late: r.lateCount, absent: r.absentCount }))}
          xKey="name"
          series={[
            { key: 'checkin', label: 'เช็คอิน', color: '#16a34a' },
            { key: 'late', label: 'มาสาย', color: '#d97706' },
            { key: 'absent', label: 'ขาด', color: '#dc2626' },
          ]}
        />
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['สาขา', 'พนักงาน', 'เช็คอิน', 'มาสาย', 'ขาด', 'ค่าปรับ (฿)', 'ลา (อนุมัติ/รอ)'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.branch.id} style={{ borderBottom: idx < rows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #FB923C, #EA580C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={13} color="#fff" />
                      </div>
                      {r.branch.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{r.empCount}</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{r.checkinCount}</td>
                  <td style={{ padding: '10px 12px', color: r.lateCount > 0 ? '#d97706' : '#94a3b8' }}>{r.lateCount}</td>
                  <td style={{ padding: '10px 12px', color: r.absentCount > 0 ? '#dc2626' : '#94a3b8' }}>{r.absentCount}</td>
                  <td style={{ padding: '10px 12px', color: r.totalFine > 0 ? '#dc2626' : '#94a3b8', fontWeight: r.totalFine > 0 ? 700 : 400 }}>{r.totalFine.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{r.approvedLeaves}</span>
                    {' / '}
                    <span style={{ color: r.pendingLeaves > 0 ? '#d97706' : '#94a3b8', fontWeight: r.pendingLeaves > 0 ? 700 : 400 }}>{r.pendingLeaves}</span>
                  </td>
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
