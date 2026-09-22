// admin/src/pages/report/leave.tsx
// รายงานวันลา — สรุปตามประเภทการลา + รายการคำขอลาของเดือนที่เลือก
// (feedback 2026-09-22 "เอาทุกหมวดก่อนแล้วค่อยทำไลน์อันสุดท้าย")
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Thermometer, ClipboardList, Sun, Heart, RefreshCw, CalendarDays, Check, Clock } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiLeave {
  id: string; leave_type: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'
  start_date: string; end_date: string; days: number
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; branch: { name: string } }
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const LEAVE_TYPE_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  SICK:       { label: 'ลาป่วย',  icon: <Thermometer size={15}/>,   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  PERSONAL:   { label: 'ลากิจ',   icon: <ClipboardList size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  VACATION:   { label: 'พักร้อน', icon: <Sun size={15}/>,           color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  MATERNITY:  { label: 'ลาคลอด',  icon: <Heart size={15}/>,         color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  COMPENSATE: { label: 'ชดเชย',   icon: <RefreshCw size={15}/>,     color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  OTHER:      { label: 'อื่นๆ',   icon: <CalendarDays size={15}/>,  color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
}
const STATUS_TH: Record<string, string> = { PENDING: 'รอพิจารณา', APPROVED: 'อนุมัติ', REJECTED: 'ปฏิเสธ' }

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function toYMD(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

export default function LeaveReportPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))

  const { data: leaves = [], isLoading } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'leave-report-leaves'],
    queryFn: () => api.get('/api/v1/admin/leave-requests').then(r => r.data.data),
  })

  const monthLeaves = useMemo(() =>
    leaves.filter(l => l.start_date.slice(0, 10) <= endDate && l.end_date.slice(0, 10) >= startDate)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [leaves, startDate, endDate])

  const byType = useMemo(() => {
    return Object.keys(LEAVE_TYPE_CFG).map(type => {
      const rows = monthLeaves.filter(l => l.leave_type === type)
      const approved = rows.filter(r => r.status === 'APPROVED')
      return { type, cfg: LEAVE_TYPE_CFG[type], count: rows.length, days: approved.reduce((s, r) => s + r.days, 0) }
    }).filter(t => t.count > 0)
  }, [monthLeaves])

  const totals = useMemo(() => ({
    total: monthLeaves.length,
    approved: monthLeaves.filter(l => l.status === 'APPROVED').length,
    pending: monthLeaves.filter(l => l.status === 'PENDING').length,
    days: monthLeaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0),
  }), [monthLeaves])

  const kpis = [
    { label: 'คำขอลารวม', value: totals.total, icon: <CalendarDays size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'อนุมัติแล้ว', value: totals.approved, icon: <Check size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'รอพิจารณา', value: totals.pending, icon: <Clock size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'วันลารวม (อนุมัติ)', value: totals.days, icon: <ClipboardList size={15}/>, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
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

      {/* สรุปตามประเภท */}
      {byType.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : Math.min(byType.length, 6)}, minmax(0,1fr))`, gap: isMobile ? 8 : 10 }}>
          {byType.map(t => (
            <div key={t.type} style={{ background: t.cfg.bg, border: `1.5px solid ${t.cfg.border}`, borderRadius: 12, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.cfg.color, fontWeight: 700, fontSize: '0.8rem' }}>{t.cfg.icon}{t.cfg.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t.cfg.color, marginTop: 4 }}>{t.days} <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>วัน</span></div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t.count} คำขอ</div>
            </div>
          ))}
        </div>
      )}

      {/* รายการ */}
      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : monthLeaves.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>ไม่มีคำขอลาในเดือนนี้</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['พนักงาน', 'สาขา', 'ประเภท', 'วันที่', 'จำนวนวัน', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthLeaves.map((l, idx) => {
                const cfg = LEAVE_TYPE_CFG[l.leave_type] ?? LEAVE_TYPE_CFG.OTHER
                const statusColor = l.status === 'APPROVED' ? '#16a34a' : l.status === 'PENDING' ? '#d97706' : '#94a3b8'
                const statusBg    = l.status === 'APPROVED' ? '#f0fdf4' : l.status === 'PENDING' ? '#fffbeb' : '#f9fafb'
                return (
                  <tr key={l.id} style={{ borderBottom: idx < monthLeaves.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => navigate(`/employee/${l.employee.id}`)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ fontWeight: 700, color: '#ea580c', textDecoration: 'underline', textUnderlineOffset: 2 }}>{l.employee.first_name} {l.employee.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{l.employee.nickname}</div>
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{l.employee.branch.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '2px 9px' }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>
                      {l.start_date.slice(0, 10) === l.end_date.slice(0, 10) ? l.start_date.slice(0, 10) : `${l.start_date.slice(0, 10)} – ${l.end_date.slice(0, 10)}`}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{l.days}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor, background: statusBg, borderRadius: 99, padding: '2px 9px' }}>{STATUS_TH[l.status]}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
