// admin/src/pages/login/index.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, Building2, X, Mail } from 'lucide-react'
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

interface LoginAd { id: string; image_url: string; link_url: string | null }

// ── Ad carousel — SuperAdmin จัดการที่ superadmin/pages/login-ads ── แทนที่
// เนื้อหาแนะนำฟีเจอร์เดิมทั้งหมดถ้ามีแบนเนอร์ตั้งไว้ (ไม่มี = โชว์เนื้อหาเดิม
// เป็น fallback กันพาเนลว่างเปล่า)
function AdCarousel({ ads }: { ads: LoginAd[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (ads.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 5000)
    return () => clearInterval(t)
  }, [ads.length])

  const ad = ads[idx]
  if (!ad) return null

  function openAd() {
    if (ad.link_url) window.open(ad.link_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <img
        key={ad.id} src={ad.image_url} alt=""
        onClick={ad.link_url ? openAd : undefined}
        className="animate-fade-in"
        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: ad.link_url ? 'pointer' : 'default' }}
      />
      {ads.length > 1 && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {ads.map((a, i) => (
            <button key={a.id} onClick={() => setIdx(i)} aria-label={`แบนเนอร์ ${i + 1}`}
              style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'width 0.25s, background 0.25s' }} />
          ))}
        </div>
      )}
    </div>
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

  // แบนเนอร์ที่ SuperAdmin ตั้งไว้ (public endpoint, ไม่ต้อง login) — ว่าง =
  // fallback กลับไปโชว์ข้อความแนะนำฟีเจอร์เดิม
  const [ads, setAds] = useState<LoginAd[]>([])
  useEffect(() => {
    axios.get(`${API_URL}/api/v1/login-ads`).then(res => setAds(res.data.data ?? [])).catch(() => {})
  }, [])

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#fff' }}>
      {introPhase !== 'done' && <IntroSplash exiting={introPhase === 'out'} />}

      {/* ── Left — Brand panel — เต็มพาเนลด้วยแบนเนอร์ (login-ads) ถ้ามี ไม่มี
          padding/โลโก้ซ้อนทับ (feedback 2026-09-28 "เอาโลโก้ตรงฟอร์มออก ให้รูป
          เต็มจอ") — ถ้ายังไม่มีแบนเนอร์เลยค่อย fallback เป็นพื้นเข้ม + โลโก้/
          footer แบบเดิม กันพาเนลว่างเปล่าไม่มีอะไรเลย ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        width: isMobile ? '100%' : '46%',
        minHeight: isMobile ? 200 : '100vh',
        background: ads.length > 0 ? '#131C45' : 'linear-gradient(155deg, #1c1917 0%, #292524 45%, #431407 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: (!isMobile && ads.length > 0) ? 0 : (isMobile ? '32px 28px' : '52px 48px'),
        boxSizing: 'border-box',
      }}>
        {!isMobile && ads.length > 0 ? (
          <div style={{ position: 'absolute', inset: 0 }}>
            <AdCarousel ads={ads} />
          </div>
        ) : (
          <>
            {/* decorative glow */}
            <div style={{ position: 'absolute', top: -120, right: -120, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(36,75,131,0.35), transparent 70%)' }} />
            <div style={{ position: 'absolute', bottom: -140, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(36,75,131,0.2), transparent 70%)' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/yoonai-logo.png" alt="YooNai" style={{ height: 64, borderRadius: 12, flexShrink: 0 }} />
            </div>

            {!isMobile && (
              <div style={{ position: 'relative', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                YooNai HR System · Powered by WH Group
              </div>
            )}
          </>
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
                  onFocus={e => { e.target.style.borderColor = '#244B83' }}
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
                    onFocus={e => { e.target.style.borderColor = '#244B83' }}
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
                    style={{ accentColor: '#244B83', width: 15, height: 15, cursor: 'pointer' }} />
                  จดจำฉันไว้
                </label>
                <button type="button" onClick={() => setShowForgot(true)}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.82rem', color: '#244B83', fontWeight: 600, cursor: 'pointer' }}>
                  ลืมรหัสผ่าน?
                </button>
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#dc2626' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#B2C0D4' : 'linear-gradient(135deg,#244B83,#244B83)', color: '#fff', fontWeight: 700, fontSize: '1rem', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(36,75,131,0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><Loader2 size={17} className="animate-spin" /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={17} /> เข้าสู่ระบบ</>}
              </button>
            </div>
          </form>

          {/* Demo accounts — เฉพาะตอน dev เท่านั้น (npm run dev) ไม่ต้องขึ้น production build เลย */}
          {import.meta.env.DEV && (
            <div style={{ marginTop: 24, borderTop: '1px solid #f3f4f6', paddingTop: 18 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>บัญชีสำหรับ Demo (DEV only)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" onClick={() => fillDemo('wonghi_admin', 'Password123!')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: '1px solid #244B8325', background: '#F4F6F9', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#244B83', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Admin</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>wonghi_admin</span>
                </button>
              </div>
            </div>
          )}

          {isMobile && (
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              YooNai HR System · Powered by WH Group
            </div>
          )}
        </div>
      </div>

      {/* Forgot password — info modal (ยังไม่มีระบบส่งอีเมลจริง) */}
      {showForgot && (
        <Modal onClose={() => setShowForgot(false)} width={380}>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F4F6F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#244B83' }}>
                <Mail size={19} />
              </div>
              <button onClick={() => setShowForgot(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="ปิด"><X size={18} /></button>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>ลืมรหัสผ่าน?</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              ตอนนี้ระบบยังไม่รองรับการรีเซ็ตรหัสผ่านด้วยตัวเองผ่านอีเมล
              กรุณาติดต่อ Super Admin หรือทีมผู้ดูแลระบบของบริษัทเพื่อขอตั้งรหัสผ่านใหม่
            </p>
            <button onClick={() => setShowForgot(false)} style={{ marginTop: 18, width: '100%', padding: '10px', borderRadius: 9, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
              เข้าใจแล้ว
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
