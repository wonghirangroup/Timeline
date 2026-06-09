// admin/src/components/layout/SuperAdminLayout.tsx
import { type ReactNode, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar  from './SuperAdminTopbar'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
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

  // ปิด drawer เมื่อเปลี่ยนหน้า
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  return (
    <>
      {/* Backdrop */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99, touchAction: 'none' }}
        />
      )}

      <SuperAdminSidebar isMobile={isMobile} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SuperAdminTopbar  isMobile={isMobile} onMenuClick={() => setDrawerOpen(o => !o)} />

      <main style={{
        marginLeft:   isMobile ? 0 : 260,
        marginTop:    isMobile ? 56 : 64,
        padding:      isMobile ? '16px 16px 80px' : '32px',
        minHeight:    '100vh',
        background:   'var(--bg-page)',
        maxWidth:     1400,
        margin:       '0 auto',
        width:        '100%'
      }} className="animate-fade-in-up">
        {children}
      </main>
    </>
  )
}
