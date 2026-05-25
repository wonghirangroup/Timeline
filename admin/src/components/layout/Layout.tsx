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
    <>
      {/* Drawer backdrop */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, touchAction: 'none' }}
        />
      )}

      <Sidebar isMobile={isMobile} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Topbar isMobile={isMobile} onMenuClick={() => setDrawerOpen(o => !o)} />

      <main style={{
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 52,
        paddingBottom: isMobile ? 72 : 0,
        minHeight: `calc(100vh - ${isMobile ? 56 : 52}px)`,
        background: '#f8fafc',
        padding: isMobile ? '16px 14px 72px' : '20px 24px',
      }}>
        {children}
      </main>

      {isMobile && <MobileBottomNav currentPath={location.pathname} />}
    </>
  )
}
