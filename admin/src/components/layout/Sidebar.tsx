import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Building2, Clock, AlignLeft,
  ClipboardCheck, CalendarDays, FileClock, BarChart2,
  Megaphone, Settings, LogOut, X,
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
}

export default function Sidebar({ isMobile, drawerOpen, onClose }: SidebarProps) {
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
    />
  )

  if (!isMobile) {
    return (
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
        background: 'var(--bg-card)', borderRight: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: 'var(--shadow-md)',
      }}>
        {body}
      </aside>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 99, backdropFilter: 'blur(2px)', transition: 'opacity 0.2s' }}
        />
      )}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 280,
        background: 'var(--bg-card)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: drawerOpen ? 'var(--shadow-float)' : 'none',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-page)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', zIndex: 1, transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-page)'}
        >
          <X size={16} />
        </button>
        {body}
      </aside>
    </>
  )
}

// ── Sidebar body ──────────────────────────────────────────────────────────────
function SidebarContent({ name, initials, onLogout, onNavClick }: {
  name: string | null; initials: string; onLogout: () => void; onNavClick: () => void
}) {
  const location   = useLocation()
  const tenantId   = useAuthStore(s => s.tenantId)
  const getFeatures = usePlanConfigStore(s => s.getFeatures)
  const tenant     = MOCK_TENANTS.find(t => t.id === tenantId)
  const features   = tenant ? getFeatures(tenant.plan) : null

  function visible(feature?: keyof PlanFeatures) {
    return !feature || !features || features[feature]
  }

  // Today's date header
  const todayStr = (() => {
    const d = new Date()
    const DAYS = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']
    const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
            boxShadow: 'var(--shadow-accent)',
          }}>TL</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>TimeLine HR</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500 }}>{todayStr}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>

        {NAV_SECTIONS.map((section, si) => {
          const visItems = section.items.filter(it => visible(it.feature))
          if (visItems.length === 0) return null

          return (
            <div key={si} style={{ marginBottom: 8 }}>

              {/* Section label */}
              {section.label && (
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  padding: '12px 10px 6px',
                }}>
                  {section.label}
                </div>
              )}

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visItems.map(item => {
                  const isActive = location.pathname === item.path
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onNavClick}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        textDecoration: 'none', fontSize: '14px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)',
                        background: isActive ? 'var(--accent-light)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 28, height: 28, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isActive ? 'var(--accent-primary)' : 'inherit',
                        transition: 'all 0.15s',
                      }}>
                        {item.icon}
                      </div>

                      {/* Label */}
                      <span style={{ flex: 1 }}>{item.label}</span>

                      {/* Badge */}
                      {item.badge != null && item.badge > 0 && (
                        <span style={{
                          background: 'var(--error)', color: '#fff', fontSize: '11px',
                          fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          flexShrink: 0, boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>

              {/* Divider after each section */}
              {si < NAV_SECTIONS.length - 1 && (
                <div style={{ height: 1, background: 'rgba(0,0,0,0.04)', margin: '12px 10px 4px' }} />
              )}
            </div>
          )
        })}

        {/* Settings */}
        <div style={{ marginTop: 8, paddingTop: 8 }}>
          {(() => {
            const isActive = location.pathname === '/settings'
            return (
              <NavLink
                to="/settings"
                onClick={onNavClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  textDecoration: 'none', fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent-hover)' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                <div style={{
                  width: 28, height: 28, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? 'var(--accent-primary)' : 'inherit',
                }}>
                  <Settings size={18} />
                </div>
                <span>การตั้งค่า</span>
              </NavLink>
            )
          })()}
        </div>
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', padding: '16px 12px', flexShrink: 0 }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', marginBottom: 8, border: '1px solid rgba(0,0,0,0.02)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Admin'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: 500 }}>HR Administrator</p>
          </div>
        </div>
        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', width: '100%',
            fontSize: '14px', color: 'var(--error)', background: 'transparent',
            fontWeight: 600, transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
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
