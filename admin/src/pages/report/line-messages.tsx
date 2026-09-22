// admin/src/pages/report/line-messages.tsx
// รายงานการส่งข้อความไลน์ — หมวดสุดท้ายของ 7 หมวดรายงาน (feedback 2026-09-22)
// อ่านจาก LineMessageLog ที่เพิ่งเริ่มบันทึกใหม่ (ก่อนหน้านี้ไม่มีการเก็บ log
// การส่งเลยสักครั้ง) — ข้อมูลจะเริ่มมีตั้งแต่วันที่ deploy รอบนี้เป็นต้นไป
// ย้อนหลังก่อนหน้านี้ไม่มีให้ดู
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Check, X, Users, Shield, Table2, LayoutGrid, BarChart3 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import ReportBarChart from '../../components/shared/ReportBarChart'

interface ApiLineLog {
  id: string; category: string; recipient_type: 'EMPLOYEE' | 'ADMIN'
  recipient_label: string; title: string; success: boolean; error_message: string | null
  created_at: string
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const CATEGORY_LABEL: Record<string, string> = {
  pending_leave: 'คำขอลา', pending_ot: 'คำขอ OT', pending_resignation: 'คำขอลาออก',
  pending_weekly_off: 'คำขอวันหยุด', worked_on_own_day_off: 'เช็คอินวันหยุดตัวเอง',
  weekly_off_swap: 'สลับวันหยุด', expiring_document: 'เอกสารใกล้หมดอายุ', probation_due: 'ครบทดลองงาน',
  ANNOUNCEMENT: 'ประกาศ', ISSUE_REPORT: 'แจ้งปัญหาการใช้งาน',
  WEEKLY_OFF_PERIOD_OPENED: 'เปิดจองวันหยุด', EMPLOYEE_NOTICE: 'แจ้งเตือนพนักงาน',
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function toYMD(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function LineMessagesReportPage() {
  const isMobile = useIsMobile()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [view, setView]   = useState<'card' | 'table' | 'chart'>('table')

  function prevMonth() { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const startDate = toYMD(year, month, 1)
  const endDate   = toYMD(year, month, getDaysInMonth(year, month))

  const { data: logs = [], isLoading } = useQuery<ApiLineLog[]>({
    queryKey: ['admin', 'line-message-logs', year, month],
    queryFn: () => api.get('/api/v1/admin/line-message-logs', { params: { startDate, endDate } }).then(r => r.data.data),
  })

  const totals = useMemo(() => ({
    total: logs.length,
    success: logs.filter(l => l.success).length,
    failed: logs.filter(l => !l.success).length,
    toEmployee: logs.filter(l => l.recipient_type === 'EMPLOYEE').length,
    toAdmin: logs.filter(l => l.recipient_type === 'ADMIN').length,
  }), [logs])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of logs) map.set(l.category, (map.get(l.category) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [logs])

  const categoryChartData = useMemo(() => {
    const map = new Map<string, { success: number; failed: number }>()
    for (const l of logs) {
      const cur = map.get(l.category) ?? { success: 0, failed: 0 }
      if (l.success) cur.success++; else cur.failed++
      map.set(l.category, cur)
    }
    return [...map.entries()]
      .map(([cat, v]) => ({ name: CATEGORY_LABEL[cat] ?? cat, ...v }))
      .sort((a, b) => (b.success + b.failed) - (a.success + a.failed))
  }, [logs])

  const kpis = [
    { label: 'ส่งทั้งหมด', value: totals.total, icon: <MessageCircle size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'สำเร็จ', value: totals.success, icon: <Check size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'ล้มเหลว', value: totals.failed, icon: <X size={15}/>, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    { label: 'ถึงพนักงาน / แอดมิน', value: `${totals.toEmployee} / ${totals.toAdmin}`, icon: totals.toEmployee >= totals.toAdmin ? <Users size={15}/> : <Shield size={15}/>, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: isMobile ? 8 : 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: k.color, display: 'flex' }}>{k.icon}</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {byCategory.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {byCategory.map(([cat, count]) => (
            <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#374151', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 99, padding: '4px 11px' }}>
              {CATEGORY_LABEL[cat] ?? cat} <span style={{ fontWeight: 800, color: '#ea580c' }}>{count}</span>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : logs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
          <MessageCircle size={22} style={{ marginBottom: 8 }} /><div>ไม่มีการส่งข้อความไลน์ในเดือนนี้</div>
          <div style={{ fontSize: '11.5px', marginTop: 4 }}>(ระบบเริ่มบันทึกประวัติการส่งตั้งแต่ 22 กันยายน 2569 เป็นต้นไป ย้อนหลังก่อนหน้านี้ไม่มีข้อมูล)</div>
        </div>
      ) : view === 'chart' ? (
        <ReportBarChart
          data={categoryChartData}
          xKey="name"
          series={[
            { key: 'success', label: 'สำเร็จ', color: '#16a34a' },
            { key: 'failed', label: 'ล้มเหลว', color: '#dc2626' },
          ]}
        />
      ) : (isMobile || view === 'card') ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {logs.map(l => (
            <div key={l.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem' }}>{l.title}</div>
                {l.success ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', borderRadius: 99, padding: '2px 8px', flexShrink: 0 }}><Check size={10}/> สำเร็จ</span>
                ) : (
                  <span title={l.error_message ?? ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: 99, padding: '2px 8px', flexShrink: 0, cursor: l.error_message ? 'help' : 'default' }}><X size={10}/> ล้มเหลว</span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                {l.recipient_type === 'EMPLOYEE' ? <Users size={11} color="#94a3b8" /> : <Shield size={11} color="#94a3b8" />}
                {l.recipient_label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{CATEGORY_LABEL[l.category] ?? l.category} · {fmtDateTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['เวลา', 'ประเภท', 'ผู้รับ', 'หัวข้อ', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, idx) => (
                <tr key={l.id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{CATEGORY_LABEL[l.category] ?? l.category}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {l.recipient_type === 'EMPLOYEE' ? <Users size={11} color="#94a3b8" /> : <Shield size={11} color="#94a3b8" />}
                      {l.recipient_label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 600 }}>{l.title}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {l.success ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', borderRadius: 99, padding: '2px 9px' }}><Check size={10}/> สำเร็จ</span>
                    ) : (
                      <span title={l.error_message ?? ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: 99, padding: '2px 9px', cursor: l.error_message ? 'help' : 'default' }}><X size={10}/> ล้มเหลว</span>
                    )}
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
