// employee/src/App.tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import BottomNav    from './components/layout/BottomNav'
import CheckinPage  from './pages/checkin'
import CheckoutPage from './pages/checkout'
import HistoryPage  from './pages/history'
import LeavePage    from './pages/leave'
import OtPage       from './pages/ot'
import FeedbackPage from './pages/feedback'
import ProfilePage  from './pages/profile'
import VerifyPage   from './pages/verify'
import UiKitPage    from './pages/ui-kit'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/checkin"  element={<CheckinPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/history"  element={<HistoryPage />} />
        <Route path="/leave"    element={<LeavePage />} />
        <Route path="/ot"       element={<OtPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/profile"  element={<ProfilePage />} />
        <Route path="/verify"   element={<VerifyPage />} />
        <Route path="/ui-kit"   element={<UiKitPage />} />
        <Route path="*"         element={<CheckinPage />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
