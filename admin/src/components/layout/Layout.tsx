import { type ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

// ── Sync enabled_features แบบเกือบ real-time ────────────────────────────────
// ปกติ enabledFeatures มาจาก login ครั้งเดียว — ถ้า Super Admin ปิดฟีเจอร์ระหว่าง
// ที่ Admin ล็อกอินค้างอยู่ backend บล็อกจริงทันทีอยู่แล้ว (requireFeature) แต่เมนู
// ฝั่งนี้ (Sidebar) จะไม่อัปเดตจนกว่าจะ login ใหม่ — เลย poll /auth/me เบาๆ
// ทุก 30 วิ + ตอนกลับมาโฟกัสแท็บ ให้เมนูตามทันโดยไม่ต้อง logout/login
function useSyncEnabledFeatures() {
  const token = useAuthStore(s => s.token)
  const setEnabledFeatures = useAuthStore(s => s.setEnabledFeatures)

  const { data } = useQuery({
    queryKey: ['auth', 'me', 'enabled-features'],
    queryFn: () => api.get('/api/v1/auth/me').then((r: any) => r.data.data),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  useEffect(() => {
    if (data) setEnabledFeatures(data.enabled_features ?? null)
  }, [data, setEnabledFeatures])
}

const SIDEBAR_W   = 260
const SIDEBAR_COL = 64

export default function Layout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === '1' } catch { return false }
  })
  const location = useLocation()

  useSyncEnabledFeatures()

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, marginLeft: sidebarW, transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <Topbar isMobile={isMobile} sidebarW={sidebarW} onMenuClick={() => setDrawerOpen(o => !o)} />

        <main style={{
          flex: 1,
          minHeight: 0,
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
