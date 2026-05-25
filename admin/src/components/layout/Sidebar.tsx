import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { usePlanConfigStore } from '../../stores/planConfigStore'
import { MOCK_TENANTS } from '../../lib/mock'
import type { PlanFeatures } from '../../types'

// feature key ที่ต้องการเพื่อแสดงเมนูนั้น (undefined = แสดงเสมอ)
const NAV_ITEMS: { path: string; label: string; icon: JSX.Element; feature?: keyof PlanFeatures }[] = [
  {
    path: '/dashboard', label: 'ภาพรวมระบบ',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  },
  {
    path: '/employee', label: 'จัดการพนักงาน',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    path: '/branch', label: 'จัดการสาขา',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    path: '/shift', label: 'จัดการกะ',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    path: '/holiday', label: 'วันหยุดประจำปี',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l2 2 4-4" /></svg>,
  },
  {
    path: '/attendance', label: 'เช็คอินพนักงาน',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    path: '/leave', label: 'วันลา & ปฏิทิน',
    feature: 'leave_management',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    path: '/weekly-off', label: 'วันหยุดสัปดาห์',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01" /></svg>,
  },
  {
    path: '/leave-balance', label: 'โควต้าวันลา',
    feature: 'leave_balance',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    path: '/ot', label: 'จัดการ OT',
    feature: 'ot_management',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12h2" /></svg>,
  },
  {
    path: '/report', label: 'สรุปผลรายงาน',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    path: '/announcement', label: 'ประกาศ & ข้อความ',
    feature: 'announcement',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
  },
]

const BOTTOM_ITEMS: { path: string; label: string; icon: JSX.Element; feature?: keyof PlanFeatures }[] = [
  {
    path: '/settings', label: 'การตั้งค่า',
    icon: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
]


interface SidebarProps {
  isMobile: boolean
  drawerOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isMobile, drawerOpen, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const clear = useAuthStore(s => s.clear)
  const name = useAuthStore(s => s.name)

  function handleLogout() {
    clear()
    navigate('/login', { replace: true })
  }

  const initials = name ? name.slice(0, 2) : 'WH'

  // ── Desktop Sidebar ──────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
        background: '#fff', borderRight: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: '1px 0 12px rgba(0,0,0,0.04)',
      }}>
        <SidebarContent
          name={name}
          initials={initials}
          onLogout={handleLogout}
          onNavClick={() => {}}
        />
      </aside>
    )
  }

  // ── Mobile Drawer ────────────────────────────────────────────────────────────
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
      background: '#fff', borderRight: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
      transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Drawer close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: '#f1f5f9', border: 'none', borderRadius: '50%',
          width: 28, height: 28, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#6b7280', zIndex: 1,
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <SidebarContent
        name={name}
        initials={initials}
        onLogout={handleLogout}
        onNavClick={onClose}
      />

      {/* Mobile Bottom Nav (fixed) — rendered outside drawer, in the DOM below */}
    </aside>
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function _unused() {
    return (
      <MobileBottomNav currentPath={location.pathname} />
    )
  }
}

// ── Shared sidebar body ───────────────────────────────────────────────────────
function SidebarContent({ name, initials, onLogout, onNavClick }: {
  name: string | null
  initials: string
  onLogout: () => void
  onNavClick: () => void
}) {
  const tenantId  = useAuthStore(s => s.tenantId)
  const getFeatures = usePlanConfigStore(s => s.getFeatures)

  const tenant   = MOCK_TENANTS.find(t => t.id === tenantId)
  const features = tenant ? getFeatures(tenant.plan) : null

  // กรองเมนูตาม feature ของ plan — ถ้าไม่มี tenant ให้แสดงทุกเมนู
  const visibleNav = NAV_ITEMS.filter(item =>
    !item.feature || !features || features[item.feature]
  )

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px',
            boxShadow: '0 3px 10px rgba(249,115,22,0.3)',
          }}>TL</div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>TimeLine HR</p>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '1px 0 0' }}>วงษ์หิรัญ กรุ๊ป</p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px 8px', margin: 0 }}>เมนูหลัก</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {visibleNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                fontSize: '12.5px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f97316' : '#4b5563',
                background: isActive ? '#fff7ed' : 'transparent',
                transition: 'all 0.12s',
              })}
            >
              {item.icon}
              <span style={{ lineHeight: 1.3 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div style={{ height: '1px', background: '#f1f5f9', margin: '12px 0 10px' }} />
        <p style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px 8px', margin: 0 }}>ระบบ</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {BOTTOM_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                fontSize: '12.5px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#f97316' : '#4b5563',
                background: isActive ? '#fff7ed' : 'transparent',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User + Logout */}
      <div style={{ borderTop: '1px solid #f1f5f9' }}>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || 'Admin'}</p>
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '1px 0 0' }}>Administrator</p>
          </div>
        </div>
        <div style={{ padding: '0 8px 10px' }}>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, border: 'none',
              cursor: 'pointer', width: '100%', fontSize: '12.5px',
              color: '#ef4444', background: 'transparent', fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  )
}

// ── Mobile Bottom Navigation Bar ─────────────────────────────────────────────
export function MobileBottomNav({ currentPath }: { currentPath: string }) {
  const tenantId  = useAuthStore(s => s.tenantId)
  const getFeatures = usePlanConfigStore(s => s.getFeatures)
  const tenant   = MOCK_TENANTS.find(t => t.id === tenantId)
  const features = tenant ? getFeatures(tenant.plan) : null

  // Mobile nav: dashboard, attendance, leave, report, settings — กรองตาม feature
  const MOBILE_CANDIDATES = [
    NAV_ITEMS[0],    // ภาพรวม
    NAV_ITEMS[4],    // เช็คอิน
    NAV_ITEMS[5],    // วันลา
    NAV_ITEMS[7],    // รายงาน
    BOTTOM_ITEMS[0], // ตั้งค่า
  ]
  const mobileNav = MOBILE_CANDIDATES.filter(item =>
    !item.feature || !features || features[item.feature]
  )

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 60,
      background: '#fff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      zIndex: 97,
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
    }}>
      {mobileNav.map(item => {
        const isActive = currentPath === item.path
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? '#f97316' : '#9ca3af',
              fontSize: '9.5px',
              fontWeight: isActive ? 700 : 400,
              paddingBottom: 2,
            }}
          >
            <span style={{ color: isActive ? '#f97316' : '#9ca3af' }}>{item.icon}</span>
            <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
