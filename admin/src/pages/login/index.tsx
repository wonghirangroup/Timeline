// admin/src/pages/login/index.tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, Building2, X, Mail, User, Lock } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import type { Role } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import Modal from '../../components/ui/Modal'
import axios from 'axios'

// ถ้า VITE_API_URL ว่าง ใช้ '' (relative) → Vite proxy จะ forward ไป Render
const API_URL       = import.meta.env.VITE_API_URL ?? ''
const SUPERADMIN_URL = import.meta.env.VITE_SUPERADMIN_URL ?? 'https://timeline-superadmin.vercel.app'
const REMEMBER_KEY  = 'tl_remember_username'

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// ── Intro splash — โลโก้ YooNai ขึ้นก่อนแล้วเลื่อนออก เผยฟอร์ม login ข้างใต้
// (feedback 2026-09-28 "กดฝั่งแอดมินแล้วจะเป็นสไลด์โลโก้ก่อน แล้วสไลด์ออก")
// เล่นครั้งเดียวตอนเข้าเพจ ไม่ persist (เข้าใหม่ทุกครั้งก็เห็นอีก — เป็น brand
// moment ไม่ใช่ onboarding ที่ควรเห็นแค่ครั้งแรก) — ข้ามอัตโนมัติถ้า
// prefers-reduced-motion (CSS ทั่วแอปมี override เร่ง transition ให้ทันทีอยู่
// แล้วที่ index.css แต่ setTimeout ของ JS ไม่รู้เรื่องด้วย เลยต้องเช็คแยก)
function IntroSplash({ exiting }: { exiting: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
      background: '#131C45', // navy ทางการจาก YooNai Owl style guide
      transform: exiting ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.65s cubic-bezier(0.65,0,0.35,1)',
    }}>
      <img
        src="/yoonai-logo.png" alt="YooNai"
        className={exiting ? undefined : 'animate-intro-logo-pop'}
        style={{ height: 240, maxWidth: '70vw', borderRadius: 24, opacity: exiting ? 0 : 1, transition: 'opacity 0.3s' }}
      />
      <p style={{
        margin: 0, opacity: exiting ? 0 : 1, transition: 'opacity 0.3s',
        fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.04em',
        color: 'rgba(255,255,255,0.75)',
      }}>
        YooNai by Smart Jigsaw
      </p>
    </div>
  )
}

// ── ลืมรหัสผ่าน: 3 ขั้น — กรอกอีเมล → กรอก OTP + รหัสใหม่ → สำเร็จ (ส่ง OTP ทางอีเมลผ่าน Resend ฝั่ง server) ──
function ForgotPasswordModal({ initialEmail, onClose, onDone }: { initialEmail: string; onClose: () => void; onDone: (email: string) => void }) {
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email')
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendOtp() {
    if (!email.trim()) { setErr('กรุณากรอกชื่อผู้ใช้หรืออีเมลกู้รหัสผ่าน'); return }
    setBusy(true); setErr('')
    try {
      await axios.post(`${API_URL}/api/v1/auth/forgot-password`, { username: email.trim() })
      setStep('otp'); setCooldown(60)
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'ส่งรหัสไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally { setBusy(false) }
  }

  async function submitReset() {
    if (!/^[0-9]{6}$/.test(otp)) { setErr('กรอกรหัส OTP 6 หลักจากอีเมล'); return }
    if (pw.length < 8) { setErr('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร'); return }
    if (pw !== pw2) { setErr('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return }
    setBusy(true); setErr('')
    try {
      await axios.post(`${API_URL}/api/v1/auth/reset-password`, { username: email.trim(), otp, new_password: pw })
      setStep('done')
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'ตั้งรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally { setBusy(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #DCE6F5', fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
  const primary: React.CSSProperties = { marginTop: 16, width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: busy ? '#B2C0D4' : 'linear-gradient(180deg, #1F5BD0, #0F2F8F)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }

  return (
    <Modal onClose={onClose} width={400}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8' }}><Mail size={20} /></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="ปิด"><X size={18} /></button>
        </div>

        {step === 'email' && (<>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#0B1B4D' }}>ลืมรหัสผ่าน?</h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6 }}>กรอก <b>ชื่อผู้ใช้</b> หรือ <b>อีเมลกู้รหัสผ่าน</b> ของคุณ เราจะส่งรหัส OTP 6 หลักไปที่อีเมลที่ผูกไว้กับบัญชี (ใช้ได้ 10 นาที)</p>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="ชื่อผู้ใช้ หรืออีเมลกู้รหัสผ่าน" autoComplete="username" autoFocus style={inp}
            onKeyDown={e => { if (e.key === 'Enter') sendOtp() }} />
          {err && <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#b91c1c' }}>{err}</div>}
          <button onClick={sendOtp} disabled={busy} style={primary}>{busy ? 'กำลังส่ง...' : 'ส่งรหัส OTP'}</button>
        </>)}

        {step === 'otp' && (<>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#0B1B4D' }}>ตั้งรหัสผ่านใหม่</h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6 }}>
            ถ้า <b>{email}</b> ตรงกับบัญชีที่ตั้งอีเมลกู้รหัสผ่านไว้ เราส่งรหัส OTP ไปที่อีเมลนั้นแล้ว (เช็คในกล่องสแปมด้วย) — ถ้าไม่ได้รับ ให้ติดต่อผู้ดูแลระบบเพื่อตั้งอีเมลกู้รหัสผ่านให้บัญชีของคุณ
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="รหัส OTP 6 หลัก" autoFocus
              style={{ ...inp, letterSpacing: '0.4em', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem' }} />
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" autoComplete="new-password" style={inp} />
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="ยืนยันรหัสผ่านใหม่" autoComplete="new-password" style={inp}
              onKeyDown={e => { if (e.key === 'Enter') submitReset() }} />
          </div>
          {err && <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#b91c1c' }}>{err}</div>}
          <button onClick={submitReset} disabled={busy} style={primary}>{busy ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}</button>
          <button onClick={sendOtp} disabled={busy || cooldown > 0}
            style={{ marginTop: 10, width: '100%', background: 'none', border: 'none', color: cooldown > 0 ? '#94A3B8' : '#1D6FE0', fontWeight: 700, fontSize: '0.85rem', cursor: cooldown > 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {cooldown > 0 ? `ขอรหัสใหม่ได้ใน ${cooldown} วินาที` : 'ไม่ได้รับรหัส? ขอรหัสใหม่'}
          </button>
        </>)}

        {step === 'done' && (<>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>ตั้งรหัสผ่านใหม่สำเร็จ</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6 }}>เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
          <button onClick={() => onDone(email.trim())} style={primary}>กลับไปเข้าสู่ระบบ</button>
        </>)}
      </div>
    </Modal>
  )
}

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

  // Intro splash — เล่นทุกครั้งที่เข้าหน้านี้ (ดู comment ที่ IntroSplash ด้านบน)
  const [introPhase, setIntroPhase] = useState<'in' | 'out' | 'done'>(() => (prefersReducedMotion() ? 'done' : 'in'))
  useEffect(() => {
    if (introPhase === 'done') return
    const t1 = setTimeout(() => setIntroPhase('out'), 900)
    const t2 = setTimeout(() => setIntroPhase('done'), 1550)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [introPhase])

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

      // เดิมอ่าน user.full_name ซึ่ง backend ไม่เคยส่งฟิลด์นี้มา (มีแต่
      // first_name/last_name แยก) เลยเด้งเป็น user.email เสมอ — ประกอบชื่อเองแทน
      const displayName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
      setAuth(accessToken, user.role as Role, user.tenant_id ?? '', displayName, user.enabled_features ?? null)
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

  // ย่อทั้งหน้าให้พอดีจอ (ไม่ต้องเลื่อน) — วัดความสูง/กว้างจริงของเนื้อหา แล้วย่อด้วย scale เมื่อจอเตี้ย/แคบกว่า
  const fitRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  useLayoutEffect(() => {
    function measure() {
      const el = fitRef.current
      if (!el) return
      const prev = el.style.transform
      el.style.transform = 'none'
      const h = el.offsetHeight, w = el.offsetWidth
      el.style.transform = prev
      const k = Math.min(1, (window.innerHeight - 48) / h, (window.innerWidth - 16) / w)
      setFit(Number.isFinite(k) && k > 0.3 ? k : 1)
    }
    measure()
    window.addEventListener('resize', measure)
    const t = setTimeout(measure, 700)  // หลังรูปโหลด/intro จบ ขนาดอาจเปลี่ยน
    return () => { window.removeEventListener('resize', measure); clearTimeout(t) }
  }, [isMobile])

  const field: React.CSSProperties = { width: '100%', padding: '14px 16px 14px 48px', borderRadius: 16, fontSize: '1rem', border: '1.5px solid #DCE6F5', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#0B1B4D', outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxShadow: '0 3px 10px rgba(36,75,131,0.06)' }
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2F86F2'; e.target.style.boxShadow = '0 0 0 4px rgba(47,134,242,0.16)' }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#DCE6F5'; e.target.style.boxShadow = '0 3px 10px rgba(36,75,131,0.06)' }

  return (
    <div style={{ height: '100dvh', width: '100%', position: 'relative', overflow: 'hidden', background: '#EAF4FF url(/login/bg.webp) center / cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px 8px' : '24px 16px', boxSizing: 'border-box' }}>
      {introPhase !== 'done' && <IntroSplash exiting={introPhase === 'out'} />}

      <div ref={fitRef} style={{ width: '100%', maxWidth: 1060, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 12 : 0, transform: `scale(${fit})`, transformOrigin: 'center center', flexShrink: 0 }}>

        {/* ── การ์ดฟอร์ม (ซ้าย) ── */}
        <div style={{
          position: 'relative', zIndex: 2, width: '100%', maxWidth: 470, flexShrink: 0, boxSizing: 'border-box', overflow: 'hidden',
          background: '#fff', borderRadius: 38, padding: isMobile ? '28px 22px' : '40px 40px 36px',
          boxShadow: '0 24px 60px rgba(36,75,131,0.18), 0 0 0 1px rgba(36,75,131,0.05)',
          opacity: introPhase === 'in' ? 0 : 1,
          transform: introPhase === 'in' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s',
        }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: -90, top: -70, width: 240, height: 150, borderRadius: '50%', background: 'rgba(205,226,252,0.45)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', left: -60, bottom: -110, width: 280, height: 220, borderRadius: '50%', background: 'rgba(205,226,252,0.55)' }} />

          <div style={{ position: 'relative' }}>
            <img src="/login/logo.webp" alt="YooNai" style={{ height: 84, width: 84, display: "block", marginBottom: 18, borderRadius: 18 }} />
            <h2 style={{ margin: '0 0 6px', fontSize: '2rem', fontWeight: 800, color: '#0B1B4D', letterSpacing: '-0.01em' }}>เข้าสู่ระบบ</h2>
            <p style={{ margin: '0 0 26px', fontSize: '1rem', color: '#6B7A99' }}>เข้าสู่ระบบเพื่อจัดการระบบพนักงาน</p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1B4D', marginBottom: 8, display: 'block' }}>ชื่อผู้ใช้</label>
                  <div style={{ position: 'relative' }}>
                    <User size={20} color="#7A88A6" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="username"
                      style={field} onFocus={focusOn} onBlur={focusOff} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0B1B4D', marginBottom: 8, display: 'block' }}>รหัสผ่าน</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={20} color="#7A88A6" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                      style={{ ...field, paddingRight: 50 }} onFocus={focusOn} onBlur={focusOff} />
                    <button type="button" onClick={() => setShowPwd(p => !p)} aria-label={showPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7A88A6', display: 'flex', padding: 4 }}>
                      {showPwd ? <EyeOff size={21} /> : <Eye size={21} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', color: '#33415C', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#1D4ED8', width: 20, height: 20, cursor: 'pointer', borderRadius: 6 }} />
                    จดจำฉันไว้
                  </label>
                  <button type="button" onClick={() => setShowForgot(true)}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.95rem', color: '#1D6FE0', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '11px 14px', fontSize: '0.88rem', color: '#b91c1c' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  marginTop: 4, padding: '17px', borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? '#B2C0D4' : 'linear-gradient(180deg, #1F5BD0 0%, #0F2F8F 100%)',
                  color: '#fff', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'inherit',
                  boxShadow: loading ? 'none' : '0 12px 26px -8px rgba(15,47,143,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                  transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                >
                  {loading ? <><Loader2 size={20} className="animate-spin" /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={20} /> เข้าสู่ระบบ</>}
                </button>
              </div>
            </form>

            {/* Demo accounts — เฉพาะตอน dev เท่านั้น (npm run dev) ไม่ต้องขึ้น production build เลย */}
            {import.meta.env.DEV && (
              <div style={{ marginTop: 22, borderTop: '1px solid #EEF2F9', paddingTop: 16 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>บัญชีสำหรับ Demo (DEV only)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" onClick={() => fillDemo('wonghi_admin', 'Password123!')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, border: '1px solid #E3ECF8', background: '#F7FAFF', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#244B83', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Admin</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>wonghi_admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ด้านขวา: นกฮูกชะโงก + สโลแกน + จุดเด่น (หรือแบนเนอร์จาก Super Admin ถ้ามี) ── */}
          <div style={{ position: 'relative', zIndex: 3, flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', marginLeft: isMobile ? 0 : -21, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 6 : 10, width: '100%' }}>
              <img src="/login/owl.webp" alt="" aria-hidden="true" draggable={false}
                style={{ width: isMobile ? 120 : 270, height: 'auto', flexShrink: 0, userSelect: 'none', pointerEvents: 'none' }} />
              <img src="/login/slogan.webp" alt="ระบบจัดการพนักงาน ที่เข้าใจธุรกิจของคุณ" draggable={false}
                style={{ width: isMobile ? 190 : 330, height: 'auto', flexShrink: 1, minWidth: 0, marginTop: isMobile ? 0 : 60, userSelect: 'none' }} />
            </div>
            <img src="/login/features.webp" alt="ครอบคลุมทุกความต้องการ · ใช้งานได้ทุกที่ทุกอุปกรณ์ · ทีมดูแลพร้อมช่วยเหลือ" draggable={false}
              style={{ width: '100%', maxWidth: isMobile ? 360 : 520, height: 'auto', marginTop: isMobile ? 6 : 30, alignSelf: 'center', userSelect: 'none' }} />
          </div>
      </div>

      <div style={{ display: isMobile ? 'none' : 'block', position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: '0.72rem', color: '#6B7A99' }}>
        YooNai HR System · Powered by WH Group
      </div>

      {showForgot && <ForgotPasswordModal initialEmail={username} onClose={() => setShowForgot(false)} onDone={email => { setUsername(email); setPassword(''); setShowForgot(false) }} />}
    </div>
  )
}
