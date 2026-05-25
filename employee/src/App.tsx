// employee/src/App.tsx
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import CheckinPage  from './pages/checkin'
import CheckoutPage from './pages/checkout'
import HistoryPage  from './pages/history'
import LeavePage    from './pages/leave'
import OtPage       from './pages/ot'
import FeedbackPage from './pages/feedback'
import ProfilePage  from './pages/profile'
import VerifyPage   from './pages/verify'

const navItems = [
  { path: '/checkin',  label: 'เช็คอิน',   icon: '⏰' },
  { path: '/checkout', label: 'เช็คเอาท์', icon: '🚪' },
  { path: '/history',  label: 'ประวัติ',   icon: '📋' },
  { path: '/leave',    label: 'วันลา',     icon: '📝' },
  { path: '/profile',  label: 'โปรไฟล์',  icon: '👤' },
]

// Pages that should NOT show the bottom nav
const NO_NAV_PATHS = ['/verify', '/ot', '/feedback']

function BottomNav() {
  const location = useLocation()
  if (NO_NAV_PATHS.includes(location.pathname)) return null

  return (
    <nav className="bottom-nav" role="navigation" aria-label="bottom navigation">
      {navItems.map(item => {
        const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/checkin')
        return (
          <NavLink
            key={item.path}
            to={item.path}
            id={`nav-${item.path.slice(1)}`}
            className={`nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-label">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/checkin"  element={<CheckinPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/history"  element={<HistoryPage />} />
        <Route path="/leave"    element={<LeavePage />} />
        <Route path="/ot"       element={<OtPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/profile"  element={<ProfilePage />} />
        <Route path="/verify"   element={<VerifyPage />} />
        <Route path="*"         element={<CheckinPage />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
