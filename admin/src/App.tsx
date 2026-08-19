// admin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { useAuthStore } from './stores/authStore'
import Layout               from './components/layout/Layout'
import LoginPage            from './pages/login'
import DashboardPage        from './pages/dashboard'
import EmployeePage         from './pages/employee'
import BranchPage           from './pages/branch'
import LeavePage            from './pages/leave'
import ReportPage           from './pages/report'
import AttendancePage       from './pages/attendance'
import SettingsPage         from './pages/settings'
import OtPage               from './pages/ot'
import OffsitePage          from './pages/offsite'
import ShiftPage            from './pages/shift'
import AnnouncementPage     from './pages/announcement'
import ShiftSchedulePage    from './pages/shift-schedule'
import EmployeeDetailPage   from './pages/employee/detail'
import UiKitPage            from './pages/ui-kit'

function AdminRoutes() {
  const token = useAuthStore(s => s.token)
  const role  = useAuthStore(s => s.role)
  const clear = useAuthStore(s => s.clear)
  if (!token) return <Navigate to="/login" replace />
  // เผื่อพลาด: บัญชี Super Admin ไม่ควรค้างอยู่ในแอปนี้ (ตอนนี้ Super Admin แยกแอปเองแล้ว)
  if (role === 'SUPER_ADMIN') { clear(); return <Navigate to="/login" replace /> }
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/employee"      element={<EmployeePage />} />
        <Route path="/branch"        element={<BranchPage />} />
        <Route path="/shift"         element={<ShiftPage />} />
        <Route path="/shift-schedule" element={<Navigate to="/shift" replace />} />
        <Route path="/attendance"    element={<Navigate to="/shift" replace />} />
        <Route path="/leave"         element={<LeavePage />} />
        <Route path="/holiday"        element={<Navigate to="/leave" replace />} />
        <Route path="/leave-balance"  element={<Navigate to="/leave" replace />} />
        <Route path="/weekly-off"     element={<Navigate to="/leave" replace />} />
        <Route path="/ot"            element={<OtPage />} />
        <Route path="/offsite"       element={<OffsitePage />} />
        <Route path="/report"        element={<ReportPage />} />
        <Route path="/announcement"  element={<AnnouncementPage />} />
        <Route path="/employee/:id"  element={<EmployeeDetailPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="/ui-kit"        element={<UiKitPage />} />
        <Route path="*"              element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*"     element={<AdminRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
