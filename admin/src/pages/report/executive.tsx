// admin/src/pages/report/executive.tsx
// รายงานผู้บริหาร — สรุปภาพรวมองค์กรรายเดือน + งานค้างที่ต้องดำเนินการตอนนี้
// (feedback 2026-09-22 "เอาทุกหมวดก่อนแล้วค่อยทำไลน์อันสุดท้าย" — หมวดสุดท้าย
// ก่อนไลน์) สังเคราะห์จากหลายโดเมนพร้อมกัน (พนักงาน/เช็คอิน/ลา/อนุมัติค้าง)
// ต่างจากรายงานย่อยอื่นๆ ที่เจาะจงโดเมนเดียว — ไม่มี backend endpoint ใหม่
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, Building2, ClipboardCheck, AlertTriangle, Wallet, CalendarDays, DoorOpen, FileText, FileClock, ChevronRight, LayoutDashboard, Palmtree, MessageCircle } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import InfoTooltip from '../../components/ui/InfoTooltip'
import ReportExportBar from '../../components/shared/ReportExportBar'
import PageLinks from '../../components/ui/PageLinks'
import ReportPieChart from '../../components/shared/ReportPieChart'
import ReportBarChart from '../../components/shared/ReportBarChart'
import ReportLineChart from '../../components/shared/ReportLineChart'
import { downloadCsv } from '../../lib/exportCsv'
import BranchReportPage from './branch'
import EmployeeReportPage from './employee'
import HolidayReportPage from './holiday'
import LeaveReportPage from './leave'
import LineMessagesReportPage from './line-messages'
import CheckinReportPage from './index'
import TabBar from '../../components/ui/TabBar'
import MonthNav from '../../components/ui/MonthNav'

interface ApiEmployee { id: string; branch_id: string }
interface ApiBranch { id: string; name: string }
interface ApiAttendance { id: string; date: string; is_late: boolean; is_absent: boolean; fine: string; carried_fine: string }
interface ApiLeave { id: string; status: string; days: number; start_date: string; end_date: string }
interface ApiPendingRow { id: string; status: string }

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function toYMD(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

// รวมทุกรายงานไว้ในหน้าเดียว — แต่ละแท็บเรียก component หน้ารายงานเดิมตรงๆ
// (เก็บ state/switcher การ์ด-ตาราง-กราฟ ของตัวเองอยู่แล้ว ไม่ต้องแยกเขียนใหม่)
// (feedback 2026-09-23 "จะเอาทุกรายงานมารวมไว้หมดเลย รวมถึง switch")
type TabKey = 'overview' | 'branch' | 'employee' | 'holiday' | 'leave' | 'line' | 'checkin'
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'ภาพรวม',        icon: <LayoutDashboard size={14}/> },
  { key: 'branch',   label: 'สาขา',           icon: <Building2 size={14}/> },
  { key: 'employee', label: 'พนักงาน',        icon: <Users size={14}/> },
  { key: 'checkin',  label: 'เช็คอิน',         icon: <ClipboardCheck size={14}/> },
  { key: 'leave',    label: 'วันลา',          icon: <CalendarDays size={14}/> },
  { key: 'holiday',  label: 'วันหยุด',         icon: <Palmtree size={14}/> },
  { key: 'line',     label: 'ข้อความไลน์',     icon: <MessageCircle size={14}/> },
]

export default function ExecutiveReportPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [tab, setTab]     = useState<TabKey>('overview')

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
    queryKey: ['admin', 'exec-report-attendance', year, month],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { startDate, endDate } }).then(r => r.data.data),
  })
  const { data: leaves = [] } = useQuery<ApiLeave[]>({
    queryKey: ['admin', 'exec-report-leaves'],
    queryFn: () => api.get('/api/v1/admin/leave-requests').then(r => r.data.data),
  })
  const { data: pendingOt = [] } = useQuery<ApiPendingRow[]>({
    queryKey: ['admin', 'exec-report-ot'],
    queryFn: () => api.get('/api/v1/admin/ot-requests').then(r => r.data.data),
  })
  const { data: pendingResign = [] } = useQuery<ApiPendingRow[]>({
    queryKey: ['admin', 'exec-report-resign'],
    queryFn: () => api.get('/api/v1/admin/resignations').then(r => r.data.data),
  })
  const { data: pendingDocs = [] } = useQuery<ApiPendingRow[]>({
    queryKey: ['admin', 'exec-report-docs'],
    queryFn: () => api.get('/api/v1/admin/document-requests').then(r => r.data.data),
  })

  const monthLeaves = useMemo(() =>
    leaves.filter(l => l.start_date.slice(0, 10) <= endDate && l.end_date.slice(0, 10) >= startDate),
    [leaves, startDate, endDate])

  const totals = useMemo(() => ({
    employees: employees.length,
    branches: branches.length,
    checkins: records.length,
    late: records.filter(r => r.is_late).length,
    absent: records.filter(r => r.is_absent).length,
    fine: records.reduce((s, r) => s + Number(r.fine) + Number(r.carried_fine), 0),
    leaveApproved: monthLeaves.filter(l => l.status === 'APPROVED').length,
    leavePending: monthLeaves.filter(l => l.status === 'PENDING').length,
    leaveDays: monthLeaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0),
  }), [employees, branches, records, monthLeaves])

  const pendingApprovals = [
    { label: 'คำขอลา รอพิจารณา', count: leaves.filter(l => l.status === 'PENDING').length, icon: <CalendarDays size={15}/>, color: '#244B83', path: '/leave' },
    { label: 'คำขอ OT รอพิจารณา', count: pendingOt.filter(r => r.status === 'PENDING').length, icon: <FileClock size={15}/>, color: '#7c3aed', path: '/ot' },
    { label: 'คำขอลาออก รอพิจารณา', count: pendingResign.filter(r => r.status === 'PENDING').length, icon: <DoorOpen size={15}/>, color: '#dc2626', path: '/resignations' },
    { label: 'ขอเอกสาร HR รอดำเนินการ', count: pendingDocs.filter(r => r.status === 'PENDING').length, icon: <FileText size={15}/>, color: '#0891b2', path: '/document-requests' },
  ]
  const totalPending = pendingApprovals.reduce((s, p) => s + p.count, 0)

  // ── ข้อมูลกราฟสรุป (feedback 2026-10-01 "อยากให้มีกราฟรวมแต่ละราย เช่น pie
  // แท่ง โดนัท แนวโน้ม อื่นๆ") — สังเคราะห์จากข้อมูลที่โหลดมาแล้วของแท็บภาพรวม
  // ไม่ยิง query เพิ่ม ──
  // โดนัท: สัดส่วนสถานะเช็คอินเดือนนี้ (ปกติ/สาย/ขาด)
  const attendancePie = useMemo(() => {
    const onTime = Math.max(0, totals.checkins - totals.late - totals.absent)
    return [
      { key: 'ok',     label: 'มาปกติ', value: onTime,       color: '#16a34a' },
      { key: 'late',   label: 'สาย',    value: totals.late,   color: '#d97706' },
      { key: 'absent', label: 'ขาด',    value: totals.absent, color: '#dc2626' },
    ].filter(d => d.value > 0)
  }, [totals])

  // แท่ง: งานค้างที่ต้องอนุมัติ แยกตามประเภท
  const pendingBarData = useMemo(() =>
    pendingApprovals.map(p => ({ name: p.label.replace(' รอพิจารณา', '').replace(' รอดำเนินการ', ''), count: p.count })),
    [pendingApprovals])

  // แนวโน้ม: เช็คอิน/สาย/ขาด รายวันตลอดเดือนที่เลือก
  const dailyTrend = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dateKey = toYMD(year, month, i + 1)
      const dayRecords = records.filter(r => r.date.slice(0, 10) === dateKey)
      return {
        day: String(i + 1),
        เช็คอิน: dayRecords.length,
        สาย: dayRecords.filter(r => r.is_late).length,
        ขาด: dayRecords.filter(r => r.is_absent).length,
      }
    })
  }, [records, year, month])

  function exportCsv() {
    const header = ['เดือน', 'พนักงานทั้งหมด', 'สาขาทั้งหมด', 'เช็คอินรวม (วัน)', 'มาสายรวม', 'ขาดรวม', 'ค่าปรับรวม (บาท)', 'วันลาอนุมัติ (วัน)', 'วันลารออนุมัติ']
    const row = [
      `${MONTHS_TH[month - 1]} ${year + 543}`, String(totals.employees), String(totals.branches), String(totals.checkins),
      String(totals.late), String(totals.absent), String(totals.fine), String(totals.leaveDays), String(totals.leavePending),
    ]
    downloadCsv([header, row], `รายงานภาพรวมผู้บริหาร_${MONTHS_TH[month - 1]}_${year + 543}.csv`)
  }

  const kpis = [
    { label: 'พนักงานทั้งหมด', value: totals.employees, icon: <Users size={15}/>, color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
    { label: 'สาขาทั้งหมด', value: totals.branches, icon: <Building2 size={15}/>, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    { label: 'เช็คอินรวม (วัน)', value: totals.checkins, icon: <ClipboardCheck size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { label: 'มาสายรวม', value: totals.late, icon: <AlertTriangle size={15}/>, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'ค่าปรับรวม (฿)', value: totals.fine.toLocaleString(), icon: <Wallet size={15}/>, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    { label: 'วันลารวม (อนุมัติ)', value: totals.leaveDays, icon: <CalendarDays size={15}/>, color: '#244B83', bg: '#F4F6F9', border: '#B2C0D4' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* แท็บรวมทุกรายงาน — ภาพรวม (สังเคราะห์ข้ามโดเมน) + อีก 6 หมวดที่เหลือ
          แต่ละหมวดเรียก component หน้ารายงานเดิมตรงๆ (การ์ด/ตาราง/กราฟ + เดือน
          ของตัวเอง อยู่ในนั้นแล้ว ไม่ต้องแยกเขียนใหม่) */}
      <PageLinks className="no-print" links={[
          { to: '/resignations', label: 'คำขอลาออก', icon: <DoorOpen size={14} />, permKey: 'resignation', feature: 'resignation' },
          { to: '/ot', label: 'OT', icon: <FileClock size={14} />, permKey: 'ot', feature: 'ot_management' }
        ]} />
      <TabBar className="no-print" tabs={TABS} value={tab} onChange={setTab} style={{ marginBottom: 0 }} />

      {tab === 'overview' && (
        <>
          <div className="print-only" style={{ margin: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontSize: '1.2rem', fontWeight: 700 }}>รายงานภาพรวมผู้บริหาร</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>{MONTHS_TH[month - 1]} {year + 543} · พิมพ์เมื่อ {now.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <MonthNav className="no-print" label={`${MONTHS_TH[month - 1]} ${year + 543}`} onPrev={prevMonth} onNext={nextMonth} />
            <ReportExportBar onExportCsv={exportCsv} disabled={isLoading} mobile={isMobile} />
          </div>

          {/* งานค้างที่ต้องดำเนินการตอนนี้ — ไม่ผูกกับเดือนที่เลือก (สถานะปัจจุบัน) */}
          {totalPending > 0 && (
            <div style={{ background: '#F4F6F9', border: '1.5px solid #B2C0D4', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#131C45', marginBottom: 10 }}>งานค้างที่ต้องดำเนินการตอนนี้ ({totalPending})</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 8 }}>
                {pendingApprovals.filter(p => p.count > 0).map(p => (
                  <button key={p.label} onClick={() => navigate(p.path)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #B2C0D4', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <span style={{ color: p.color, display: 'flex' }}>{p.icon}</span>
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{p.label}</span>
                    <span style={{ fontWeight: 800, color: p.color, fontSize: '0.95rem' }}>{p.count}</span>
                    <ChevronRight size={14} color="#cbd5e1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KPI ภาพรวมเดือนนี้ */}
          {isLoading ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>กำลังโหลด...</div>
          ) : (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                สรุปภาพรวมเดือนนี้
                <InfoTooltip title="ภาพรวมผู้บริหาร" width={320} content={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>การ์ดตัวเลขและกราฟด้านล่างสรุปข้อมูลทั้งองค์กรของเดือนที่เลือก (เปลี่ยนเดือนได้ที่ลูกศร ‹ › ด้านบน)</li>
                    <li><b>โดนัทสัดส่วนเช็คอิน</b> — มาปกติ / สาย / ขาด ของเดือนนี้</li>
                    <li><b>แท่งงานค้าง</b> — จำนวนคำขอที่รออนุมัติ แยกตามประเภท เป็นยอดคงเหลือ ณ ตอนนี้ ไม่ผูกกับเดือนที่เลือก</li>
                    <li><b>เส้นแนวโน้ม</b> — จำนวนเช็คอิน/สาย/ขาด รายวันตลอดเดือนที่เลือก</li>
                  </ul>
                } />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: isMobile ? 8 : 10 }}>
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

              {/* กราฟสรุป — โดนัทสัดส่วนเช็คอิน + แท่งงานค้าง + แนวโน้มรายวัน
                  (feedback 2026-10-01 "อยากให้มีกราฟรวมแต่ละราย เช่น pie แท่ง
                  โดนัท แนวโน้ม อื่นๆ") */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>สัดส่วนสถานะเช็คอินเดือนนี้</div>
                  <ReportPieChart data={attendancePie} height={240} emptyLabel="ยังไม่มีข้อมูลเช็คอินเดือนนี้" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>งานค้างแยกตามประเภท</div>
                  <ReportBarChart data={pendingBarData} xKey="name" height={240} emptyLabel="ไม่มีงานค้าง"
                    series={[{ key: 'count', label: 'รายการ', color: '#244B83' }]} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>แนวโน้มเช็คอินรายวัน — {MONTHS_TH[month - 1]} {year + 543}</div>
                <ReportLineChart data={dailyTrend} xKey="day" height={260}
                  series={[
                    { key: 'เช็คอิน', label: 'เช็คอิน', color: '#244B83' },
                    { key: 'สาย',    label: 'สาย',    color: '#d97706' },
                    { key: 'ขาด',    label: 'ขาด',    color: '#dc2626' },
                  ]} />
              </div>
            </>
          )}
        </>
      )}

      {tab === 'branch'   && <BranchReportPage />}
      {tab === 'employee' && <EmployeeReportPage />}
      {tab === 'checkin'  && <CheckinReportPage />}
      {tab === 'leave'    && <LeaveReportPage />}
      {tab === 'holiday'  && <HolidayReportPage />}
      {tab === 'line'     && <LineMessagesReportPage />}
    </div>
  )
}
