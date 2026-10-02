// admin/src/pages/shift/index.tsx
import { useState } from 'react'
import { AlignLeft, ClipboardCheck } from 'lucide-react'
import ShiftScheduleTab from '../shift-schedule'
import AttendanceTab from '../attendance'
import TabBar from '../../components/ui/TabBar'

type ShiftTab = 'schedule' | 'attendance'

const TABS: { id: ShiftTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'attendance', label: 'เช็คอินวันนี้', icon: <ClipboardCheck size={15}/>, color: '#16a34a' },
  { id: 'schedule',   label: 'ตารางกะ',      icon: <AlignLeft size={15}/>,      color: '#2563eb' },
]

export default function ShiftHubPage() {
  const [activeTab, setActiveTab] = useState<ShiftTab>('attendance')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Page title removed as per user request to rely on Topbar */}

      {/* Tab bar */}
      <TabBar value={activeTab} onChange={setActiveTab} tabs={TABS.map(t => ({ key: t.id, label: t.label, icon: t.icon, color: t.color }))} style={{ marginBottom: 24 }} />

      {/* Content */}
      <div style={{ display: activeTab === 'attendance' ? 'block' : 'none' }}>
        <AttendanceTab />
      </div>
      <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
        <ShiftScheduleTab />
      </div>
    </div>
  )
}
