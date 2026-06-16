import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Building2, Clock, AlignLeft,
  ClipboardCheck, CalendarDays, FileClock, BarChart2,
  Megaphone, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { usePlanConfigStore } from '../../stores/planConfigStore'
import { MOCK_TENANTS } from '../../lib/mock'
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
      { path: '/employee', label: 'พนักงาน', icon: <Users     size={16}/> },
      { path: '/branch',   label: 'สาขา',    icon: <Building2 size={16}/> },
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
    ],
  },
  {
    label: 'รายงาน & อื่นๆ',
    items: [
      { path: '/ot',           label: 'OT',      feature: 'ot_management', icon: <FileClock size={16}/> },
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
  const name     = useAuthStore(s => s.name)

  function handleLogout() { clear(); navigate('/login', { replace: true }) }
  const initials = name ? name.slice(0, 2) : 'HR'

  const body = (
    <SidebarContent
      name={name}
      initials={initials}
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

// ── Sidebar body ──────────────────────────────────────────────────────────────
function SidebarContent({ name, initials, onLogout, onNavClick, collapsed, onToggleCollapse }: {
  name: string | null; initials: string; onLogout: () => void; onNavClick: () => void
  collapsed: boolean; onToggleCollapse?: () => void
}) {
  const location    = useLocation()
  const tenantId    = useAuthStore(s => s.tenantId)
  const getFeatures = usePlanConfigStore(s => s.getFeatures)
  const tenant      = MOCK_TENANTS.find(t => t.id === tenantId)
  const features    = tenant ? getFeatures(tenant.plan) : null

  function visible(feature?: keyof PlanFeatures) {
    return !feature || !features || features[feature]
  }

  const todayStr = (() => {
    const d = new Date()
    const DAYS   = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']
    const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  })()

  // ── helper: icon-centered nav link ───────────────────────────────────────
  function NavItem({ item }: { item: { path: string; label: string; icon: JSX.Element; badge?: number } }) {
    const isActive = location.pathname === item.path
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
          color: isActive ? '#fb923c' : 'rgba(248,250,252,0.55)',
          background: isActive ? 'rgba(249,115,22,0.15)' : 'transparent',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f8fafc'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,250,252,0.55)'; } }}
      >
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#f97316' : 'inherit' }}>
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
      <div style={{ padding: collapsed ? '20px 0' : '20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
            TL
          </div>
          {!collapsed && (
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>TimeLine HR</p>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', margin: '4px 0 0', fontWeight: 500, whiteSpace: 'nowrap' }}>{todayStr}</p>
            </div>
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
          return (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.label && !collapsed && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 10px 6px', whiteSpace: 'nowrap' }}>
                  {section.label}
                </div>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visItems.map(item => <NavItem key={item.path} item={item} />)}
              </div>
              {!collapsed && si < NAV_SECTIONS.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 10px 4px' }} />
              )}
            </div>
          )
        })}

        {/* Settings */}
        <div style={{ marginTop: 8, paddingTop: collapsed ? 0 : 8 }}>
          <NavItem item={{ path: '/settings', label: 'การตั้งค่า', icon: <Settings size={16}/> }} />
        </div>
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 8px' : '16px 12px', flexShrink: 0 }}>
        {collapsed ? (
          /* Collapsed: avatar only, click to logout */
          <button
            onClick={onLogout}
            title="ออกจากระบบ"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
              {initials}
            </div>
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Admin'}</p>
                <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.45)', margin: '2px 0 0', fontWeight: 500 }}>HR Administrator</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', width: '100%', fontSize: '14px', color: '#f87171', background: 'transparent', fontWeight: 600, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={16} />
              ออกจากระบบ
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Mobile Bottom Nav ─────────────────────────────────────────────────────────
export function MobileBottomNav({ currentPath }: { currentPath: string }) {
  const MOBILE_ITEMS = [
    { path: '/dashboard',  label: 'หน้าหลัก', icon: <LayoutGrid    size={20}/> },
    { path: '/shift',      label: 'กะ & เวลา', icon: <Clock         size={20}/> },
    { path: '/leave',      label: 'การลา',     icon: <CalendarDays  size={20}/> },
    { path: '/report',     label: 'รายงาน',    icon: <BarChart2     size={20}/> },
    { path: '/settings',   label: 'ตั้งค่า',   icon: <Settings      size={20}/> },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16,
      background: 'var(--glass-bg)',
      borderRadius: 24,
      boxShadow: 'var(--shadow-lg)',
      border: `1px solid var(--glass-border)`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px',
      zIndex: 97,
    }}>
      {MOBILE_ITEMS.map(item => {
        const isActive = currentPath === item.path
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              textDecoration: 'none', padding: '6px 0',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: '10px', fontWeight: isActive ? 700 : 500,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' : 'transparent',
              color: isActive ? '#fff' : 'inherit',
              boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
              marginBottom: 2,
              transition: 'all 0.2s',
              transform: isActive ? 'scale(1)' : 'scale(0.95)'
            }}>
              {item.icon}
            </div>
            <span style={{ lineHeight: 1, textAlign: 'center', opacity: isActive ? 1 : 0.8 }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
