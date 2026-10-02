// admin/src/pages/leave/index.tsx — combined leave hub
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, CalendarOff, BarChart3, LayoutGrid, Palmtree, Sparkles } from 'lucide-react'
import LeaveRequestsTab  from './requests'
import WeeklyOffPage     from '../weekly-off'
import LeaveBalancePage  from '../leave-balance'
import TeamCalendarTab   from './TeamCalendarTab'
import HolidayPage       from '../holiday'
import VacationPolicyTab from './VacationPolicyTab'
import { useIsMobile } from '../../hooks/useIsMobile'
import InfoTooltip from '../../components/ui/InfoTooltip'
import { useNotifications } from '../../hooks/useNotifications'

type LeaveTab = 'requests' | 'time-off' | 'vacation-policy' | 'holiday' | 'balance' | 'calendar'

// นโยบายพักร้อนตามอายุงาน (feedback 2026-09-15) เดิมกระจายอยู่ 3 แท็บ (ตั้งสูตรที่ตำแหน่ง,
// เลือกชดเชย/พักร้อนที่วันหยุด, ปุ่มรัน+รายงานที่โควต้า) — user บอกว่างง เลยรวมมาเป็นแท็บ
// เดียวที่นี่ (VacationPolicyTab) เป็นจุดเริ่มต้น ส่วนการแก้ไขเต็มรูปแบบยังอยู่ที่เดิม
const TABS: { id: LeaveTab; label: string; mobileLabel: string; icon: React.ReactNode; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'requests',  label: 'วันลา',              mobileLabel: 'ลา',    icon: <CalendarDays size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
  { id: 'time-off',  label: 'จองวันหยุดประจำเดือน', mobileLabel: 'หยุด', icon: <CalendarOff  size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
  { id: 'vacation-policy', label: 'นโยบายพักร้อน', mobileLabel: 'พักร้อน', icon: <Sparkles size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
  { id: 'holiday',   label: 'วันหยุดนักขัตฤกษ์', mobileLabel: 'ขัตฤกษ์', icon: <Palmtree  size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
  { id: 'balance',   label: 'โควต้า',             mobileLabel: 'โควต้า', icon: <BarChart3  size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
  { id: 'calendar',  label: 'ปฏิทินรวม',          mobileLabel: 'ปฏิทิน', icon: <LayoutGrid size={15}/>, color: '#244B83', activeBg: '#F4F6F9', activeBorder: '#244B83' },
]

const VALID_TABS: LeaveTab[] = ['requests', 'time-off', 'vacation-policy', 'holiday', 'balance', 'calendar']

export default function LeavePage() {
  const [sp] = useSearchParams()
  const [activeTab, setActiveTab] = useState<LeaveTab>(() => {
    const t = sp.get('tab') as LeaveTab | null
    return t && VALID_TABS.includes(t) ? t : 'requests'
  })
  const isMobile = useIsMobile()
  // เลขบนแท็บ = งานรออนุมัติทุกเดือนรวมกัน (ชุดเดียวกับเลขบนเมนู sidebar / กระดิ่ง)
  const mc = useNotifications().data?.menu_counts
  const TAB_BADGE: Partial<Record<LeaveTab, number>> = { requests: mc?.leave_requests, 'time-off': mc?.time_off }

  // กระดิ่งแจ้งเตือนส่ง ?tab=&focus= มา — สลับแท็บตาม URL (child tab อ่าน ?focus/?worked เอง)
  useEffect(() => {
    const t = sp.get('tab') as LeaveTab | null
    if (t && VALID_TABS.includes(t)) setActiveTab(t)
  }, [sp])

  function renderTab(t: typeof TABS[0]) {
    const isActive = activeTab === t.id
    return (
      <button
        key={t.id}
        onClick={() => setActiveTab(t.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8,
          padding: isMobile ? '8px 12px' : '10px 20px', border: 'none', cursor: 'pointer',
          fontSize: isMobile ? '12px' : '14px', fontWeight: isActive ? 700 : 600,
          color: isActive ? t.color : 'var(--text-muted)',
          background: isActive ? t.activeBg : 'transparent',
          borderBottom: `3px solid ${isActive ? t.activeBorder : 'transparent'}`,
          borderRadius: '8px 8px 0 0',
          marginBottom: -4,
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-main)' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        <span style={{ color: isActive ? t.color : 'var(--text-muted)', display: 'flex' }}>{t.icon}</span>
        {isMobile ? t.mobileLabel : t.label}
        {!!TAB_BADGE[t.id] && (
          <span title="รอดำเนินการ/อนุมัติ" style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#fee2e2', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{(TAB_BADGE[t.id] as number) > 99 ? '99+' : TAB_BADGE[t.id]}</span>
        )}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => renderTab(t))}
        <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: 4 }}>
          <InfoTooltip title="จัดการวันลา & วันหยุด" width={300} content={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><b>วันลา</b> — อนุมัติ/ปฏิเสธคำขอลาป่วย ลากิจ พักร้อน ฯลฯ ของพนักงาน</li>
              <li><b>จองวันหยุดประจำเดือน</b> — วันหยุดที่พนักงานเลือกจองเอง เปิด/ปิดสิทธิ์ได้ต่อสาขา</li>
              <li><b>นโยบายพักร้อน / วันหยุดนักขัตฤกษ์ / โควต้า</b> — ตั้งสูตรพักร้อนตามอายุงาน วันหยุดบริษัท และดูยอดคงเหลือ</li>
              <li><b>ปฏิทินรวม</b> — ดูวันลา+วันหยุดของทั้งทีมพร้อมกันในปฏิทินเดียว</li>
            </ul>
          } />
        </span>
      </div>

      {/* วันลา — preserve state with display:none */}
      <div style={{ display: activeTab === 'requests' ? 'block' : 'none' }}>
        <LeaveRequestsTab />
      </div>

      {/* หยุดประจำสัปดาห์ */}
      <div style={{ display: activeTab === 'time-off' ? 'block' : 'none' }}>
        <WeeklyOffPage />
      </div>

      {/* นโยบายพักร้อน — รวมทุกอย่างเกี่ยวกับพักร้อนตามอายุงาน */}
      {activeTab === 'vacation-policy' && <VacationPolicyTab />}

      {/* วันหยุดนักขัตฤกษ์ */}
      <div style={{ display: activeTab === 'holiday' ? 'block' : 'none' }}>
        <HolidayPage />
      </div>

      {/* โควต้า */}
      <div style={{ display: activeTab === 'balance' ? 'block' : 'none' }}>
        <LeaveBalancePage />
      </div>

      {/* ปฏิทินรวม */}
      <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}>
        <TeamCalendarTab />
      </div>
    </div>
  )
}
