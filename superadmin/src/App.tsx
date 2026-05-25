import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import DashboardPage from './pages/dashboard'
import TenantsPage from './pages/tenants'
import LineConfigPage from './pages/line-config'
import UsersPage from './pages/users'
import BillingPage from './pages/billing'
import PlansPage from './pages/plans'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="line-config" element={<LineConfigPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="plans" element={<PlansPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
