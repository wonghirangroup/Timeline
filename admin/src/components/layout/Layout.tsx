import { type ReactNode, useState, useEffect } from 'react'
import Sidebar, { MobileBottomNav } from './Sidebar'
import Topbar from './Topbar'
import { useLocation } from 'react-router-dom'


export default function Layout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  // ปิด drawer อัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      {/* Drawer backdrop */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 99, touchAction: 'none', transition: 'opacity 0.2s' }}
        />
      )}

      <Sidebar isMobile={isMobile} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: isMobile ? 0 : 260, transition: 'margin 0.2s' }}>
        <Topbar isMobile={isMobile} onMenuClick={() => setDrawerOpen(o => !o)} />

        <main style={{
          flex: 1,
          padding: isMobile ? '16px 16px 80px' : '24px 32px',
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

      {isMobile && <MobileBottomNav currentPath={location.pathname} />}
    </div>
  )
}
