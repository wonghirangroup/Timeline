import { type ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useLocation } from 'react-router-dom'

const SIDEBAR_W   = 260
const SIDEBAR_COL = 64

export default function Layout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1' } catch { return false }
  })
  const location = useLocation()

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setDrawerOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  const sidebarW = isMobile ? 0 : (collapsed ? SIDEBAR_COL : SIDEBAR_W)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 99, touchAction: 'none' }}
        />
      )}

      <Sidebar isMobile={isMobile} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: sidebarW, transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <Topbar isMobile={isMobile} sidebarW={sidebarW} onMenuClick={() => setDrawerOpen(o => !o)} />

        <main style={{
          flex: 1,
          padding: isMobile ? '16px' : '24px 32px',
          marginTop: isMobile ? 56 : 64,
          maxWidth: 1400,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }} className="animate-fade-in-up">
          {children}
        </main>
      </div>

    </div>
  )
}
