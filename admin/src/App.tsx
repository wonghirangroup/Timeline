// admin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { useAuthStore } from './stores/authStore'
import Layout               from './components/layout/Layout'
import SuperAdminLayout     from './components/layout/SuperAdminLayout'
import LoginPage            from './pages/login'
import DashboardPage        from './pages/dashboard'
import EmployeePage         from './pages/employee'
import BranchPage           from './pages/branch'
import LeavePage            from './pages/leave'
import ReportPage           from './pages/report'
import AttendancePage       from './pages/attendance'
import SettingsPage         from './pages/settings'
import OtPage               from './pages/ot'
import ShiftPage            from './pages/shift'
import AnnouncementPage     from './pages/announcement'
import HolidayPage          from './pages/holiday'
import LeaveBalancePage      from './pages/leave-balance'
import EmployeeDetailPage   from './pages/employee/detail'
import SADashboard          from './pages/superadmin/dashboard'
import SATenantsPage        from './pages/superadmin/tenants'
import SATenantDetail       from './pages/superadmin/tenants/detail'
import SAPackagesPage       from './pages/superadmin/packages'
import SABillingPage        from './pages/superadmin/billing'
import SAOnboardingPage     from './pages/superadmin/onboarding'
import SAAnnouncementPage   from './pages/superadmin/announcement'

function AdminRoutes() {
  const token = useAuthStore(s => s.token)
  const role  = useAuthStore(s => s.role)
  if (!token) return <Navigate to="/login" replace />
  if (role === 'SUPER_ADMIN') return <Navigate to="/superadmin/dashboard" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/employee"      element={<EmployeePage />} />
        <Route path="/branch"        element={<BranchPage />} />
        <Route path="/shift"         element={<ShiftPage />} />
        <Route path="/attendance"    element={<AttendancePage />} />
        <Route path="/leave"         element={<LeavePage />} />
        <Route path="/ot"            element={<OtPage />} />
        <Route path="/report"        element={<ReportPage />} />
        <Route path="/announcement"  element={<AnnouncementPage />} />
        <Route path="/holiday"        element={<HolidayPage />} />
        <Route path="/leave-balance"  element={<LeaveBalancePage />} />
        <Route path="/employee/:id"  element={<EmployeeDetailPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="*"              element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function SuperAdminRoutes() {
  const token = useAuthStore(s => s.token)
  const role  = useAuthStore(s => s.role)
  if (!token) return <Navigate to="/login" replace />
  if (role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />
  return (
    <SuperAdminLayout>
      <Routes>
        <Route path="dashboard"       element={<SADashboard />} />
        <Route path="tenants"         element={<SATenantsPage />} />
        <Route path="tenants/:id"     element={<SATenantDetail />} />
        <Route path="packages"        element={<SAPackagesPage />} />
        <Route path="billing"         element={<SABillingPage />} />
        <Route path="onboarding"      element={<SAOnboardingPage />} />
        <Route path="announcement"    element={<SAAnnouncementPage />} />
        <Route path="*"               element={<Navigate to="/superadmin/dashboard" replace />} />
      </Routes>
    </SuperAdminLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/superadmin/*"   element={<SuperAdminRoutes />} />
        <Route path="/*"              element={<AdminRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
