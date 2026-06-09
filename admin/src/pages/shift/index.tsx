// admin/src/pages/shift/index.tsx
import { useState } from 'react'
import { Clock, AlignLeft, ClipboardCheck } from 'lucide-react'
import ManageShiftTab from './manage'
import ShiftScheduleTab from '../shift-schedule'
import AttendanceTab from '../attendance'

type ShiftTab = 'manage' | 'schedule' | 'attendance'

const TABS: { id: ShiftTab; label: string; icon: React.ReactNode; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'manage',     label: 'จัดการกะ',     icon: <Clock size={15}/>,          color: '#f97316', activeBg: '#fff7ed', activeBorder: '#f97316' },
  { id: 'schedule',   label: 'ตารางกะ',      icon: <AlignLeft size={15}/>,      color: '#2563eb', activeBg: '#eff6ff', activeBorder: '#3b82f6' },
  { id: 'attendance', label: 'เช็คอินวันนี้', icon: <ClipboardCheck size={15}/>, color: '#16a34a', activeBg: '#f0fdf4', activeBorder: '#22c55e' },
]

export default function ShiftHubPage() {
  const [activeTab, setActiveTab] = useState<ShiftTab>('manage')

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
      {/* Page title removed as per user request to rely on Topbar */}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => renderTab(t))}
      </div>

      {/* Content */}
      <div style={{ display: activeTab === 'manage' ? 'block' : 'none' }}>
        <ManageShiftTab />
      </div>
      <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
        <ShiftScheduleTab />
      </div>
      <div style={{ display: activeTab === 'attendance' ? 'block' : 'none' }}>
        <AttendanceTab />
      </div>
    </div>
  )
}
