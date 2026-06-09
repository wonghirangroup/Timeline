// employee/src/components/layout/BottomNav.tsx — Premium Floating Bottom Navigation
import { NavLink, useLocation } from 'react-router-dom'
import { QrCode, BarChart2, ArrowLeftRight, Layers, User } from 'lucide-react'
import { COLOR, SHADOW } from '../ui/tokens'

interface NavItem {
  path: string
  label: string
  Icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { path: '/checkin',  label: 'เช็คอิน',  Icon: QrCode },
  { path: '/history',  label: 'ประวัติ',  Icon: BarChart2 },
  { path: '/checkout', label: 'เช็คเอาท์', Icon: ArrowLeftRight },
  { path: '/leave',    label: 'วันลา',    Icon: Layers },
  { path: '/profile',  label: 'โปรไฟล์', Icon: User },
]

const NO_NAV = ['/verify', '/ot', '/feedback']

export default function BottomNav() {
  const { pathname } = useLocation()
  if (NO_NAV.includes(pathname)) return null

  return (
    <nav style={{
      position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16,
      background: COLOR.navBg,
      borderRadius: 24,
      boxShadow: SHADOW.nav,
      border: `1px solid ${COLOR.navBorder}`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px',
      zIndex: 50,
    }}>
      {NAV_ITEMS.map(({ path, label, Icon }) => {
        const active = pathname === path || (pathname === '/' && path === '/checkin')
        return (
          <NavLink
            key={path}
            to={path}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', 
              textDecoration: 'none', gap: 4, padding: '6px 0',
              borderRadius: 16,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {active ? (
              /* Active: Icon wrapped in primary gradient */
              <div className="animate-fade-in" style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: SHADOW.btn,
                marginBottom: 2,
              }}>
                <Icon size={20} strokeWidth={2.5} color="#ffffff" />
              </div>
            ) : (
              /* Inactive: outline icon */
              <div style={{
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 2,
                transition: 'transform 0.2s',
              }}>
                <Icon size={22} strokeWidth={1.8} color={COLOR.textMuted} />
              </div>
            )}
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 700 : 500,
              color: active ? COLOR.primary : COLOR.textMuted,
              letterSpacing: active ? '0.2px' : 0,
              transition: 'all 0.2s'
            }}>
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
