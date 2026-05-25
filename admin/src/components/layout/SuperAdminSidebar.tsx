// admin/src/components/layout/SuperAdminSidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const NAV_ITEMS = [
  { path: '/superadmin/dashboard', label: 'ภาพรวมระบบ',     icon: '◎' },
  { path: '/superadmin/tenants',   label: 'จัดการ Tenant',   icon: '🏗' },
  { path: '/superadmin/packages',  label: 'Package & Plan',  icon: '📦' },
  { path: '/superadmin/billing',    label: 'Billing & Payment',   icon: '💳' },
  { path: '/superadmin/onboarding',    label: 'Onboarding Checklist', icon: '📋' },
  { path: '/superadmin/announcement',  label: 'System Announcement',  icon: '📣' },
]

const ACCENT = '#4f46e5'

export default function SuperAdminSidebar() {
  const navigate = useNavigate()
  const clear = useAuthStore(s => s.clear)

  function handleLogout() {
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
      background: '#1e1b4b',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#818cf8,#4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
          }}>SA</div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Super Admin</div>
            <div style={{ fontSize: '0.68rem', color: '#a5b4fc' }}>TimeLine Platform</div>
          </div>
        </div>
      </div>

      {/* Badge */}
      <div style={{ margin: '12px 16px 0', padding: '6px 10px', background: 'rgba(129,140,248,0.15)', borderRadius: 8, border: '1px solid rgba(129,140,248,0.25)' }}>
        <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600 }}>🔐 สิทธิ์เข้าถึงสูงสุด</div>
        <div style={{ fontSize: '0.68rem', color: '#6366f1', marginTop: 1 }}>ทุก Tenant · ทุก Feature</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', paddingLeft: 12, marginBottom: 6 }}>เมนูหลัก</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : '#a5b4fc',
                background: isActive ? ACCENT : 'transparent',
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (el.getAttribute('aria-current') !== 'page') el.style.background = 'rgba(99,102,241,0.2)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (el.getAttribute('aria-current') !== 'page') el.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <div style={{ margin: '20px 12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', paddingLeft: 12, marginBottom: 6 }}>ลิงก์ด่วน</div>

        {/* Switch to Admin view shortcut */}
        <a
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
            fontSize: '0.855rem', color: '#a5b4fc',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>↗</span>
          <span>เข้า Admin ตัวอย่าง</span>
        </a>
      </nav>

      {/* Logout */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none',
            cursor: 'pointer', width: '100%', fontSize: '0.855rem',
            color: '#fca5a5', background: 'transparent', fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>🚪</span>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  )
}
