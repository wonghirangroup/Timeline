// employee/src/App.tsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
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
import { useAuthStore } from './stores/authStore'
import { devLogin, liffLogin } from './lib/axios'
import { initLiff, getLiffProfile, getChannelId } from './lib/liff'

// ─── Auth states ─────────────────────────────────────────────────────────────
type BootState = 'loading' | 'dev-pick' | 'authed' | 'need-verify' | 'error'

const DEV_EMP_KEY = 'dev_employee_id'

// ─── Splash / Loading screen ─────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'linear-gradient(160deg, #fff7f3 0%, #fff 60%)',
    }}>
      <div style={{ fontSize: '3rem', animation: 'spin 1.2s linear infinite' }}>⏳</div>
      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#374151' }}>กำลังเข้าสู่ระบบ…</div>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>TimeLine HR</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <div style={{ fontWeight: 700, color: '#dc2626', lineHeight: 1.5 }}>{message}</div>
      <button onClick={onRetry} style={{
        padding: '12px 28px', borderRadius: 14, border: 'none',
        background: 'linear-gradient(135deg,#fb923c,#ea580c)', color: '#fff',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
      }}>ลองใหม่</button>
    </div>
  )
}

// ─── Dev Employee Picker ──────────────────────────────────────────────────────
interface DevEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  employee_code: string; branch: { id: string; name: string }
}

function DevPicker({ onPick }: { onPick: (emp: DevEmployee) => void }) {
  const [employees, setEmployees] = useState<DevEmployee[]>([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const apiUrl = import.meta.env.VITE_API_URL as string

  useEffect(() => {
    import('axios').then(({ default: axios }) =>
      axios.post(`${apiUrl}/auth/login`,
        { username: import.meta.env.VITE_DEV_EMAIL ?? 'wonghi_admin', password: import.meta.env.VITE_DEV_PASSWORD ?? 'Password123!' },
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      ).then(r => {
        const token = r.data.data.accessToken
        return axios.get(`${apiUrl}/admin/employees`, {
          headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        })
      }).then(r => {
        setEmployees(r.data.data ?? [])
        setLoading(false)
      }).catch(() => setLoading(false))
    )
  }, [])

  const filtered = employees.filter(e =>
    !search || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code} ${e.branch.name}`
      .toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '24px 16px', minHeight: '100dvh', background: '#fff7f3' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-block', background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700, marginBottom: 12 }}>🛠 DEV MODE</div>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1a2b3c' }}>เลือกพนักงาน</div>
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 4 }}>เฉพาะการทดสอบ — ไม่แสดงใน production</div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 ค้นหาชื่อ, รหัส, สาขา…"
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #fed7aa', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>ไม่พบพนักงาน</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(e => (
            <button key={e.id} onClick={() => onPick(e)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
              borderRadius: 14, border: '1.5px solid #fed7aa', background: '#fff', cursor: 'pointer',
              textAlign: 'left', width: '100%', fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#fb923c,#ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700, color: '#fff',
              }}>
                {e.first_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a2b3c' }}>
                  {e.first_name} {e.last_name}
                  {e.nickname && <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.8rem' }}> ({e.nickname})</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                  {e.employee_code} · {e.branch.name}
                </div>
              </div>
              <span style={{ color: '#f97316', fontSize: '1.2rem' }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { setAuth, isAuthenticated } = useAuthStore()
  const [bootState, setBootState] = useState<BootState>('loading')
  const [devToken,  setDevToken]  = useState('')
  const [errMsg,    setErrMsg]    = useState('')

  async function boot() {
    setBootState('loading')
    try {
      if (import.meta.env.DEV) {
        // DEV: login as admin to get token, then pick employee
        const { token } = await devLogin()
        setDevToken(token)
        // ถ้าเคยเลือกไว้แล้ว restore จาก localStorage
        const savedId = localStorage.getItem(DEV_EMP_KEY)
        if (savedId) {
          // ดึงข้อมูลจาก API
          const { default: axios } = await import('axios')
          const apiUrl = import.meta.env.VITE_API_URL as string
          try {
            const r = await axios.get(`${apiUrl}/admin/employees/${savedId}`, {
              headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
            })
            const e = r.data.data
            setAuth({ id: e.id, first_name: e.first_name, last_name: e.last_name, employee_code: e.employee_code, branch: e.branch }, token)
            setBootState('authed')
            return
          } catch {
            localStorage.removeItem(DEV_EMP_KEY)
          }
        }
        setBootState('dev-pick')
        return
      }

      // PROD: LIFF flow
      await initLiff()
      const { lineUserId, idToken } = await getLiffProfile()
      const channelId = getChannelId()

      try {
        const { token, employee } = await liffLogin({
          liff_token:      idToken,
          line_user_id:    lineUserId,
          line_channel_id: channelId,
        })
        setAuth(employee, token)
        setBootState('authed')
      } catch (err: any) {
        const code = err?.response?.data?.error?.code
        if (code === 'EMPLOYEE_NOT_FOUND') {
          // ยังไม่ได้ผูก LINE → ไปหน้า verify
          setBootState('need-verify')
        } else {
          throw err
        }
      }
    } catch (err: any) {
      setErrMsg(err?.response?.data?.error?.message ?? err?.message ?? 'เกิดข้อผิดพลาด')
      setBootState('error')
    }
  }

  useEffect(() => {
    if (!isAuthenticated) boot()
    else setBootState('authed')
  }, [])

  function handleDevPick(emp: DevEmployee) {
    localStorage.setItem(DEV_EMP_KEY, emp.id)
    setAuth({ id: emp.id, first_name: emp.first_name, last_name: emp.last_name, employee_code: emp.employee_code, branch: emp.branch }, devToken)
    setBootState('authed')
  }

  if (bootState === 'loading')  return <SplashScreen />
  if (bootState === 'error')    return <ErrorScreen message={errMsg} onRetry={boot} />
  if (bootState === 'dev-pick') return <DevPicker onPick={handleDevPick} />

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {bootState === 'need-verify' ? (
          // ยังไม่ผูก LINE → บังคับไป verify
          <>
            <Route path="/verify" element={<VerifyPage onLinked={() => setBootState('authed')} />} />
            <Route path="*" element={<Navigate to="/verify" replace />} />
          </>
        ) : (
          // ผูกแล้ว → เข้าแอปปกติ
          <>
            <Route path="/checkin"  element={<CheckinPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/history"  element={<HistoryPage />} />
            <Route path="/leave"    element={<LeavePage />} />
            <Route path="/ot"       element={<OtPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/profile"  element={<ProfilePage />} />
            <Route path="/ui-kit"   element={<UiKitPage />} />
            <Route path="*"         element={<Navigate to="/checkin" replace />} />
          </>
        )}
      </Routes>
      {bootState === 'authed' && <BottomNav />}
    </BrowserRouter>
  )
}
