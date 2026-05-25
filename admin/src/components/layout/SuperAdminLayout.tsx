// admin/src/components/layout/SuperAdminLayout.tsx
import type { ReactNode } from 'react'
import SuperAdminSidebar from './SuperAdminSidebar'
import SuperAdminTopbar  from './SuperAdminTopbar'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SuperAdminSidebar />
      <SuperAdminTopbar />
      <main style={{
        marginLeft: 220, marginTop: 56,
        padding: '28px 28px',
        minHeight: 'calc(100vh - 56px)',
        background: '#f8f9fc',
      }}>
        {children}
      </main>
    </>
  )
}
