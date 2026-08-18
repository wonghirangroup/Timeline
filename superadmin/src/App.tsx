// superadmin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { useAuthStore } from './stores/authStore'
import SuperAdminLayout   from './components/layout/SuperAdminLayout'
import LoginPage          from './pages/login'
import SADashboard        from './pages/dashboard'
import SATenantsPage      from './pages/tenants'
import SATenantDetail     from './pages/tenants/detail'
import SAPackagesPage     from './pages/packages'
import SABillingPage      from './pages/billing'
import SAOnboardingPage   from './pages/onboarding'
import SAAnnouncementPage from './pages/announcement'

function SuperAdminRoutes() {
  const token = useAuthStore(s => s.token)
  const role  = useAuthStore(s => s.role)
  const clear = useAuthStore(s => s.clear)
  if (!token) return <Navigate to="/login" replace />
  // เผื่อพลาด: token เก่าของ role อื่น (เช่นค้างจากก่อนแยกแอป) ห้ามเข้าแอปนี้เด็ดขาด
  if (role !== 'SUPER_ADMIN') { clear(); return <Navigate to="/login" replace /> }
  return (
    <SuperAdminLayout>
      <Routes>
        <Route path="dashboard"    element={<SADashboard />} />
        <Route path="tenants"      element={<SATenantsPage />} />
        <Route path="tenants/:id"  element={<SATenantDetail />} />
        <Route path="packages"     element={<SAPackagesPage />} />
        <Route path="billing"      element={<SABillingPage />} />
        <Route path="onboarding"   element={<SAOnboardingPage />} />
        <Route path="announcement" element={<SAAnnouncementPage />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SuperAdminLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*"     element={<SuperAdminRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
