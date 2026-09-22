// admin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TrendingUp, Users, CalendarOff, CalendarDays, MessageCircle } from 'lucide-react'
import './index.css'
import { useAuthStore } from './stores/authStore'
import Layout               from './components/layout/Layout'
import ComingSoonReport     from './components/shared/ComingSoonReport'
import LoginPage            from './pages/login'
import DashboardPage        from './pages/dashboard'
import EmployeePage         from './pages/employee'
import BranchPage           from './pages/branch'
import LeavePage            from './pages/leave'
import ReportPage           from './pages/report'
import BranchReportPage     from './pages/report/branch'
import AttendancePage       from './pages/attendance'
import SettingsPage         from './pages/settings'
import OtPage               from './pages/ot'
import OffsitePage          from './pages/offsite'
import ShiftPage            from './pages/shift'
import AnnouncementPage     from './pages/announcement'
import ShiftSchedulePage    from './pages/shift-schedule'
import EmployeeDetailPage   from './pages/employee/detail'
import MasterDataPage       from './pages/master-data'
import ResignationsPage     from './pages/resignations'
import DocumentRequestsPage from './pages/document-requests'
import HrDocumentPrintPage  from './pages/hr-documents/print'
import MagicLoginPage       from './pages/magic-login'
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
        <Route path="/org-structure" element={<Navigate to="/employee?tab=org" replace />} />
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
        {/* หมวดรายงานใหม่ (feedback 2026-09-22) — โครง sidebar/route พร้อมก่อน
            เนื้อหาจริงยังไม่มี ทยอยเปลี่ยนเป็นหน้าจริงทีละหมวดทีหลัง */}
        <Route path="/report/executive"     element={<ComingSoonReport title="รายงานผู้บริหาร" icon={<TrendingUp size={24} />} />} />
        <Route path="/report/employee"      element={<ComingSoonReport title="รายงานพนักงาน" icon={<Users size={24} />} />} />
        <Route path="/report/branch"        element={<BranchReportPage />} />
        <Route path="/report/holiday"       element={<ComingSoonReport title="รายงานวันหยุด" icon={<CalendarOff size={24} />} />} />
        <Route path="/report/leave"         element={<ComingSoonReport title="รายงานวันลา" icon={<CalendarDays size={24} />} />} />
        <Route path="/report/line-messages" element={<ComingSoonReport title="รายงานการส่งข้อความไลน์" icon={<MessageCircle size={24} />} />} />
        <Route path="/announcement"  element={<AnnouncementPage />} />
        <Route path="/employee/:id"  element={<EmployeeDetailPage />} />
        <Route path="/master-data"   element={<MasterDataPage />} />
        <Route path="/resignations"  element={<ResignationsPage />} />
        <Route path="/document-requests" element={<DocumentRequestsPage />} />
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
        {/* auto-login ครั้งเดียวจากลิงก์แจ้งเตือนไลน์/ปุ่มสลับจาก LIFF — นอก Layout เหมือน /login */}
        <Route path="/magic-login" element={<MagicLoginPage />} />
        {/* เอกสาร HR ที่พิมพ์/พิมพ์ซ้ำ — จงใจอยู่นอก Layout (ไม่มี Sidebar/Topbar) เพื่อให้
            หน้าพิมพ์สะอาด ไม่มีอะไรติดไปตอนสั่งพิมพ์/บันทึกเป็น PDF */}
        <Route path="/hr-documents/:id/print" element={<HrDocumentPrintPage />} />
        <Route path="/*"     element={<AdminRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
