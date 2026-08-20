// admin/src/pages/login/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, Building2, Clock, Users, BarChart3, ShieldCheck, X, Mail } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import axios from 'axios'

// ถ้า VITE_API_URL ว่าง ใช้ '' (relative) → Vite proxy จะ forward ไป Render
const API_URL       = import.meta.env.VITE_API_URL ?? ''
const SUPERADMIN_URL = import.meta.env.VITE_SUPERADMIN_URL ?? 'https://timeline-superadmin.vercel.app'
const REMEMBER_KEY  = 'tl_remember_username'

export default function LoginPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile(900)
  const setAuth  = useAuthStore(s => s.setAuth)
  const [username, setUsername]  = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword]  = useState('')
  const [showPwd, setShowPwd]    = useState(false)
  const [loading, setLoading]    = useState(false)
  const [error, setError]        = useState('')
  const [remember, setRemember]  = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [showForgot, setShowForgot] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return }

    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, { username, password })
      const { accessToken, user } = res.data.data

      // แอปนี้คือพอร์ทัล Admin ปกติเท่านั้น — บัญชี Super Admin ต้องไปเข้าที่แอปแยกต่างหาก
      // แม้รหัสผ่านจะถูกต้องก็ตาม
      if (user.role === 'SUPER_ADMIN') {
        setError(`บัญชี Super Admin ต้องเข้าสู่ระบบผ่านพอร์ทัลแยกต่างหากที่ ${SUPERADMIN_URL}`)
        return
      }

      // store refresh token in localStorage for later use
      if (res.data.data.refreshToken) {
        localStorage.setItem('refresh_token', res.data.data.refreshToken)
      }

      // จดจำรหัสผ่าน (username เท่านั้น — ไม่เก็บรหัสผ่านจริงในเครื่อง)
      if (remember) localStorage.setItem(REMEMBER_KEY, username)
      else localStorage.removeItem(REMEMBER_KEY)

      setAuth(accessToken, user.role as Role, user.tenant_id ?? '', user.full_name ?? user.email, user.enabled_features ?? null)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error?.message
        setError(msg ?? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    } finally {
      setLoading(false)
    }
  }

  // Demo account quick-fill — เฉพาะตอน dev เท่านั้น ห้ามหลุดไป production bundle
  // (เดิมมี username/password จริงโชว์อยู่บนหน้า login สาธารณะ ใครก็เข้าระบบได้โดยไม่ต้องมีบัญชี)
  function fillDemo(demoUsername: string, demoPassword: string) {
    setUsername(demoUsername); setPassword(demoPassword); setError('')
  }

  const FEATURES = [
    { icon: Clock,      text: 'เช็คอิน-เช็คเอาต์ผ่าน Line LIFF แบบเรียลไทม์' },
    { icon: Users,      text: 'จัดการพนักงานและสาขาได้จากที่เดียว' },
    { icon: BarChart3,  text: 'รายงานเข้างาน-วันลา ครบในไม่กี่คลิก' },
    { icon: ShieldCheck, text: 'แยกข้อมูลแต่ละบริษัทอย่างปลอดภัย' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#fff' }}>
      {/* ── Left — Brand panel (ส้ม-ดำ-ขาว) ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        width: isMobile ? '100%' : '46%',
        minHeight: isMobile ? 200 : '100vh',
        background: 'linear-gradient(155deg, #1c1917 0%, #292524 45%, #431407 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: isMobile ? '32px 28px' : '52px 48px',
        boxSizing: 'border-box',
      }}>
        {/* decorative glow */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.35), transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -140, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.2), transparent 70%)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg,#f97316,#ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.05rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px',
            boxShadow: '0 6px 20px rgba(249,115,22,0.45)', flexShrink: 0,
          }}>TL</div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>TimeLine</span>
        </div>

        {!isMobile && (
          <div style={{ position: 'relative' }}>
            <h1 style={{ margin: '0 0 14px', fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)', fontWeight: 800, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              จัดการเวลาทำงานทั้งทีม<br />ในที่เดียว
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 360 }}>
              ระบบ HR สำหรับเช็คชื่อ จัดกะ และวันลา ที่เชื่อมต่อกับ Line โดยตรง
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', flexShrink: 0 }}>
                    <f.icon size={15} />
                  </div>
                  <span style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.85)' }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isMobile && (
          <div style={{ position: 'relative', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
            TimeLine HR System · Powered by WH Group
          </div>
        )}
      </div>

      {/* ── Right — Login form ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>เข้าสู่ระบบ</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              เข้าสู่ระบบเพื่อจัดการพนักงาน
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>ชื่อผู้ใช้</label>
                <input
                  type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  autoComplete="username"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: '0.9rem', border: '1.5px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
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
                    style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, fontSize: '0.9rem', border: '1.5px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    onFocus={e => { e.target.style.borderColor = '#f97316' }}
                    onBlur={e => { e.target.style.borderColor = '#d1d5db' }}
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)} aria-label={showPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor: '#f97316', width: 15, height: 15, cursor: 'pointer' }} />
                  จดจำฉันไว้
                </label>
                <button type="button" onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.82rem', color: '#f97316', fontWeight: 600, cursor: 'pointer' }}>
                  ลืมรหัสผ่าน?
                </button>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#fed7aa' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><Loader2 size={17} className="animate-spin" /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={17} /> เข้าสู่ระบบ</>}
              </button>
            </div>
          </form>

          {/* Demo accounts — เฉพาะตอน dev เท่านั้น (npm run dev) ไม่ต้องขึ้น production build เลย */}
          {import.meta.env.DEV && (
            <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 18 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>บัญชีสำหรับ Demo (DEV only)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" onClick={() => fillDemo('wonghi_admin', 'Password123!')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: '1px solid #f9731625', background: '#fff7ed', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f97316', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Admin</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>wonghi_admin</span>
                </button>
              </div>
            </div>
          )}

          {isMobile && (
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              TimeLine HR System · Powered by WH Group
            </div>
          )}
        </div>
      </div>

      {/* Forgot password — info modal (ยังไม่มีระบบส่งอีเมลจริง) */}
      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={() => setShowForgot(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 380, maxWidth: '100%', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                <Mail size={19} />
              </div>
              <button onClick={() => setShowForgot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="ปิด"><X size={18} /></button>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>ลืมรหัสผ่าน?</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              ตอนนี้ระบบยังไม่รองรับการรีเซ็ตรหัสผ่านด้วยตัวเองผ่านอีเมล
              กรุณาติดต่อ Super Admin หรือทีมผู้ดูแลระบบของบริษัทเพื่อขอตั้งรหัสผ่านใหม่
            </p>
            <button onClick={() => setShowForgot(false)} style={{ marginTop: 18, width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
