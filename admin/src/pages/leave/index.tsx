// admin/src/pages/leave/index.tsx — combined leave hub
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, CalendarOff, BarChart3, LayoutGrid, Palmtree } from 'lucide-react'
import LeaveRequestsTab  from './requests'
import WeeklyOffPage     from '../weekly-off'
import LeaveBalancePage  from '../leave-balance'
import TeamCalendarTab   from './TeamCalendarTab'
import HolidayPage       from '../holiday'
import { useIsMobile } from '../../hooks/useIsMobile'

type LeaveTab = 'requests' | 'time-off' | 'balance' | 'calendar' | 'holiday'

const TABS: { id: LeaveTab; label: string; mobileLabel: string; icon: React.ReactNode; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'requests',  label: 'วันลา',              mobileLabel: 'ลา',    icon: <CalendarDays size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'time-off',  label: 'จองวันหยุดประจำเดือน', mobileLabel: 'หยุด', icon: <CalendarOff  size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'holiday',   label: 'วันหยุดนักขัตฤกษ์', mobileLabel: 'ขัตฤกษ์', icon: <Palmtree  size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'balance',   label: 'โควต้า',             mobileLabel: 'โควต้า', icon: <BarChart3  size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'calendar',  label: 'ปฏิทินรวม',          mobileLabel: 'ปฏิทิน', icon: <LayoutGrid size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
]

const VALID_TABS: LeaveTab[] = ['requests', 'time-off', 'holiday', 'balance', 'calendar']

export default function LeavePage() {
  const [sp] = useSearchParams()
  const [activeTab, setActiveTab] = useState<LeaveTab>(() => {
    const t = sp.get('tab') as LeaveTab | null
    return t && VALID_TABS.includes(t) ? t : 'requests'
  })
  const isMobile = useIsMobile()

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
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => renderTab(t))}
      </div>

      {/* วันลา — preserve state with display:none */}
      <div style={{ display: activeTab === 'requests' ? 'block' : 'none' }}>
        <LeaveRequestsTab />
      </div>

      {/* หยุดประจำสัปดาห์ */}
      <div style={{ display: activeTab === 'time-off' ? 'block' : 'none' }}>
        <WeeklyOffPage />
      </div>

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
