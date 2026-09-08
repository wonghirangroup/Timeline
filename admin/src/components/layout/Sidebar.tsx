import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Building2, Clock, AlignLeft,
  ClipboardCheck, CalendarDays, FileClock, BarChart2,
  Megaphone, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal, MapPin, Table2, DoorOpen,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import type { PlanFeatures } from '../../types'

// re-export สำหรับหน้าอื่น
export { Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal }

interface NavItem {
  path: string
  label: string
  icon: JSX.Element
  feature?: keyof PlanFeatures
  badge?: number
}

interface NavSection {
  label?: string
  items: NavItem[]
}

// ── Flat nav — ไม่มี dropdown ทั้งหมด ──────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { path: '/dashboard', label: 'ภาพรวม', icon: <LayoutGrid size={16}/> },
    ],
  },
  {
    label: 'บุคลากร',
    items: [
      { path: '/employee',     label: 'พนักงาน',      icon: <Users     size={16}/> },
      { path: '/branch',       label: 'สาขา',         icon: <Building2 size={16}/> },
      { path: '/master-data',  label: 'Master Data',  icon: <Table2    size={16}/> },
    ],
  },
  {
    label: 'กะ & เวลา',
    items: [
      { path: '/shift', label: 'กะ & เวลา', icon: <Clock size={16}/> },
    ],
  },
  {
    label: 'การลา',
    items: [
      { path: '/leave', label: 'การลา & วันหยุด', feature: 'leave_management', icon: <CalendarDays size={16}/> },
      { path: '/resignations', label: 'คำขอลาออก', feature: 'resignation', icon: <DoorOpen size={16}/> },
    ],
  },
  {
    label: 'รายงาน & อื่นๆ',
    items: [
      { path: '/ot',           label: 'OT',      feature: 'ot_management', icon: <FileClock size={16}/> },
      { path: '/offsite',      label: 'เช็คอินนอกสถานที่', feature: 'gps_checkin', icon: <MapPin size={16}/> },
      { path: '/report',       label: 'รายงาน',                             icon: <BarChart2 size={16}/> },
      { path: '/announcement', label: 'ประกาศ',  feature: 'announcement',  icon: <Megaphone size={16}/> },
    ],
  },
]

interface SidebarProps {
  isMobile: boolean
  drawerOpen: boolean
  onClose: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ isMobile, drawerOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const clear    = useAuthStore(s => s.clear)

  function handleLogout() { clear(); navigate('/login', { replace: true }) }

  const body = (
    <SidebarContent
      onLogout={handleLogout}
      onNavClick={isMobile ? onClose : () => {}}
      collapsed={!isMobile && collapsed}
      onToggleCollapse={!isMobile ? onToggleCollapse : undefined}
    />
  )

  if (!isMobile) {
    return (
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: collapsed ? 64 : 260,
        background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        {body}
      </aside>
    )
  }

  return (
    <>
      {drawerOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
      )}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 280,
        background: 'var(--bg-sidebar)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: drawerOpen ? '4px 0 24px rgba(0,0,0,0.2)' : 'none',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,250,252,0.7)', zIndex: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <X size={16} />
        </button>
        {body}
      </aside>
    </>
  )
}

// ── สีประจำหมวด (เฉดสว่างสำหรับ sidebar พื้นเข้ม) ──────────────────────────────
// เรียงตาม NAV_SECTIONS: [ภาพรวม, บุคลากร, กะ&เวลา, การลา, รายงาน&อื่นๆ]
interface SecAccent { text: string; bg: string }
const SECTION_ACCENT: SecAccent[] = [
  { text: '#FB923C', bg: 'rgba(249,115,22,0.16)' },  // ภาพรวม — ส้ม (brand)
  { text: '#2DD4BF', bg: 'rgba(45,212,191,0.15)' },  // บุคลากร — teal
  { text: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },  // กะ & เวลา — blue
  { text: '#A78BFA', bg: 'rgba(167,139,250,0.15)' }, // การลา — violet
  { text: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },  // รายงาน & อื่นๆ — amber
]
const SETTINGS_ACCENT: SecAccent = { text: '#94A3B8', bg: 'rgba(148,163,184,0.16)' } // slate

const ROLE_CHIP: Partial<Record<string, { label: string; bg: string; color: string }>> = {
  EXECUTIVE: { label: 'ผู้บริหาร · อ่านอย่างเดียว', bg: '#f1f5f9', color: '#475569' },
  DEPT_HEAD: { label: 'หัวหน้าแผนก · เห็นเฉพาะแผนกที่ดูแล', bg: '#eef2ff', color: '#4338ca' },
}

function SidebarContent({ onLogout, onNavClick, collapsed, onToggleCollapse }: {
  onLogout: () => void; onNavClick: () => void
  collapsed: boolean; onToggleCollapse?: () => void
}) {
  const location        = useLocation()
  const enabledFeatures = useAuthStore(s => s.enabledFeatures)
  const role            = useAuthStore(s => s.role)
  const roleChip        = role ? ROLE_CHIP[role] : undefined

  // ปิดจริงที่ backend ด้วย (requireFeature middleware) — ตรงนี้แค่ซ่อนเมนูให้ตรงกับสิทธิ์
  // ไม่มี key ใน enabledFeatures เลย (tenant ไม่เคยถูกตั้งค่า) = เปิดใช้งานทุกฟีเจอร์ (ค่า default)
  function visible(feature?: keyof PlanFeatures) {
    return !feature || !enabledFeatures || enabledFeatures[feature] !== false
  }

  // ── helper: icon-centered nav link ───────────────────────────────────────
  function NavItem({ item, accent }: { item: { path: string; label: string; icon: JSX.Element; badge?: number }; accent: SecAccent }) {
    // highlight ค้างไว้ถ้ายังอยู่ในหน้าลูกของเมนูนี้ เช่น /employee/:id ก็ยัง highlight "พนักงาน"
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    return (
      <NavLink
        to={item.path}
        onClick={onNavClick}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '10px 0' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none', fontSize: '14px',
          fontWeight: isActive ? 700 : 500,
          color: isActive ? accent.text : 'rgba(248,250,252,0.55)',
          background: isActive ? accent.bg : 'transparent',
          boxShadow: isActive ? `inset 3px 0 0 ${accent.text}` : 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f8fafc'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,250,252,0.55)'; } }}
      >
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? accent.text : 'inherit' }}>
          {item.icon}
        </div>
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span style={{ background: 'var(--error)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: collapsed ? 10 : 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
            TL
          </div>
          {!collapsed && (
            <p style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>TimeLine HR</p>
          )}
        </div>

        {/* Collapse toggle button — desktop only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'ขยาย sidebar' : 'ย่อ sidebar'}
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,250,252,0.55)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; e.currentTarget.style.color = '#f8fafc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(248,250,252,0.55)' }}
          >
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '16px 12px', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map((section, si) => {
          const visItems = section.items.filter(it => visible(it.feature))
          if (visItems.length === 0) return null
          const accent = SECTION_ACCENT[si] ?? SECTION_ACCENT[0]
          return (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.label && !collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '11px', fontWeight: 700, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 10px 6px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent.text, flexShrink: 0 }} />
                  {section.label}
                </div>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visItems.map(item => <NavItem key={item.path} item={item} accent={accent} />)}
              </div>
              {!collapsed && si < NAV_SECTIONS.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 10px 4px' }} />
              )}
            </div>
          )
        })}

        {/* Settings */}
        <div style={{ marginTop: 8, paddingTop: collapsed ? 0 : 8 }}>
          <NavItem item={{ path: '/settings', label: 'การตั้งค่า', icon: <Settings size={16}/> }} accent={SETTINGS_ACCENT} />
        </div>
      </nav>

      {/* Footer — role chip + logout (user profile อยู่ Topbar) */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 8px' : '12px' }}>
        {roleChip && !collapsed && (
          <div style={{ margin: '0 2px 8px', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', fontSize: '11px', fontWeight: 600, color: 'rgba(248,250,252,0.7)', lineHeight: 1.4 }}>
            {roleChip.label}
          </div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'ออกจากระบบ' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '10px 12px',
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', width: '100%',
            fontSize: '14px', color: '#f87171', background: 'transparent', fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          {!collapsed && 'ออกจากระบบ'}
        </button>
      </div>
    </div>
  )
}
