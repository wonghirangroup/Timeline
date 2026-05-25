// admin/src/pages/login/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../stores/authStore'

// Mock credentials — in production these come from the server JWT
const MOCK_USERS: Record<string, { password: string; role: Role; name: string; tenantId: string }> = {
  'super@timeline.app':     { password: 'super1234',  role: 'SUPER_ADMIN', name: 'Admin ส่วนกลาง',      tenantId: 'platform' },
  'admin@wonghiran.com':    { password: 'admin1234',  role: 'ADMIN',       name: 'จิรพงศ์ ศรีอำไพ',     tenantId: 'tn-01' },
  'manager@wonghiran.com':  { password: 'mgr1234',    role: 'MANAGER',     name: 'สมหญิง รักงาน',       tenantId: 'tn-01' },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('กรุณากรอกอีเมลและรหัสผ่าน'); return }

    const user = MOCK_USERS[email.toLowerCase().trim()]
    if (!user || user.password !== password) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setAuth('mock-token-' + Date.now(), user.role, user.tenantId, user.name)
      if (user.role === 'SUPER_ADMIN') navigate('/superadmin/dashboard', { replace: true })
      else navigate('/dashboard', { replace: true })
    }, 700)
  }

  function fillDemo(email: string, password: string) {
    setEmail(email); setPassword(password); setError('')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fc 0%, #ede9fe 40%, #fef3c7 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg,#f97316,#ea580c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px',
                boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
              }}>TL</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>TimeLine</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>HR Management Platform</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>เข้าสู่ระบบเพื่อจัดการพนักงาน</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>อีเมล</label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: '0.9rem', border: '1.5px solid #d1d5db', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onFocus={e => { e.target.style.borderColor = '#f97316' }}
                  onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>รหัสผ่าน</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, fontSize: '0.9rem', border: '1.5px solid #d1d5db', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    onFocus={e => { e.target.style.borderColor = '#f97316' }}
                    onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af' }}>{showPwd ? '🙈' : '👁'}</button>
                </div>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626' }}>⚠ {error}</div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#fed7aa' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.4)', transition: 'all 0.2s' }}>
                {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🔐 เข้าสู่ระบบ'}
              </button>
            </div>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 18 }}>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>บัญชีสำหรับ Demo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: '🔐 Super Admin',  email: 'super@timeline.app',    pw: 'super1234',  color: '#4f46e5', bg: '#ede9fe' },
                { label: '⚙ Admin',         email: 'admin@wonghiran.com',   pw: 'admin1234',  color: '#f97316', bg: '#fff7ed' },
                { label: '👁 Manager',       email: 'manager@wonghiran.com', pw: 'mgr1234',    color: '#16a34a', bg: '#f0fdf4' },
              ].map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email, d.pw)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: `1px solid ${d.color}25`, background: d.bg, cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: d.color }}>{d.label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.72rem', color: '#9ca3af' }}>
          TimeLine HR System · Powered by WH Group
        </div>
      </div>
    </div>
  )
}
