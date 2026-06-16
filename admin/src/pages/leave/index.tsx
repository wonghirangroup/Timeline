// admin/src/pages/leave/index.tsx  [MOCK MODE] — combined leave hub
import { useState } from 'react'
import { CalendarDays, CalendarOff, BarChart3, LayoutGrid } from 'lucide-react'
import LeaveRequestsTab  from './requests'
import WeeklyOffPage     from '../weekly-off'
import LeaveBalancePage  from '../leave-balance'
import TeamCalendarTab   from './TeamCalendarTab'

type LeaveTab = 'requests' | 'time-off' | 'balance' | 'calendar'

const TABS: { id: LeaveTab; label: string; icon: React.ReactNode; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'requests',  label: 'วันลา',      icon: <CalendarDays size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'time-off',  label: 'วันหยุด',    icon: <CalendarOff  size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'balance',   label: 'โควต้า',     icon: <BarChart3    size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'calendar',  label: 'ปฏิทินรวม',  icon: <LayoutGrid   size={15}/>, color: '#ea580c', activeBg: '#fff7ed', activeBorder: '#f97316' },
]

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState<LeaveTab>('requests')

  function renderTab(t: typeof TABS[0]) {
    const isActive = activeTab === t.id
    return (
      <button
        key={t.id}
        onClick={() => setActiveTab(t.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', border: 'none', cursor: 'pointer',
          fontSize: '14px', fontWeight: isActive ? 700 : 600,
          color: isActive ? t.color : 'var(--text-muted)',
          background: isActive ? t.activeBg : 'transparent',
          borderBottom: `3px solid ${isActive ? t.activeBorder : 'transparent'}`,
          borderRadius: '8px 8px 0 0',
          marginBottom: -4,
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-main)' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        <span style={{ color: isActive ? t.color : 'var(--text-muted)', display: 'flex' }}>{t.icon}</span>
        {t.label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Mock banner */}
      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.72rem', color: '#f97316', fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
        🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
      </div>

      {/* Page title removed to use Topbar only */}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => renderTab(t))}
      </div>

      {/* วันลา — preserve state with display:none */}
      <div style={{ display: activeTab === 'requests' ? 'block' : 'none' }}>
        <LeaveRequestsTab />
      </div>

      {/* วันหยุด — calendar with holiday overlay toggle */}
      <div style={{ display: activeTab === 'time-off' ? 'block' : 'none' }}>
        <WeeklyOffPage />
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
