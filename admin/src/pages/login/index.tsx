// admin/src/pages/login/index.tsx
import { showResult } from '../../components/ui/ResultDialog'
import { useEffect, useState } from 'react'
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

interface LoginAd { id: string; media_type?: 'IMAGE' | 'VIDEO'; image_url: string; video_url?: string | null; link_url: string | null }

// ── Ad carousel — SuperAdmin จัดการที่ superadmin/pages/login-ads ── แทนที่
// เนื้อหาแนะนำฟีเจอร์เดิมทั้งหมดถ้ามีแบนเนอร์ตั้งไว้ (ไม่มี = โชว์เนื้อหาเดิม
// เป็น fallback กันพาเนลว่างเปล่า) — รูปหมุนทุก 5 วิ ส่วนวิดีโอ (feedback
// 2026-09-28 "อยากทำเป็นวิดิโอด้วย") ปล่อยเล่นจนจบแล้วค่อยเลื่อนต่อเอง (ไม่งั้น
// วิดีโอ ~15 วิ จะโดนตัดที่ 5 วิเหมือนรูปเสมอ ดูไม่ทันจบ)
function AdCarousel({ ads }: { ads: LoginAd[] }) {
  const [idx, setIdx] = useState(0)
  const ad = ads[idx]

  function next() { setIdx(i => (i + 1) % ads.length) }

  useEffect(() => {
    if (ads.length < 2 || ad?.media_type === 'VIDEO') return // วิดีโอเลื่อนเองผ่าน onEnded
    const t = setTimeout(next, 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ads.length])

  if (!ad) return null

  function openAd() {
    if (ad.link_url) window.open(ad.link_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {ad.media_type === 'VIDEO' && ad.video_url ? (
        <video
          key={ad.id} src={ad.video_url} poster={ad.image_url}
          autoPlay muted playsInline onEnded={ads.length > 1 ? next : undefined} loop={ads.length === 1}
          onClick={ad.link_url ? openAd : undefined}
          className="animate-fade-in"
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: ad.link_url ? 'pointer' : 'default' }}
        />
      ) : (
        <img
          key={ad.id} src={ad.image_url} alt=""
          onClick={ad.link_url ? openAd : undefined}
          className="animate-fade-in"
          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: ad.link_url ? 'pointer' : 'default' }}
        />
      )}
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
      showResult({
        type: 'success', title: 'เข้าสู่ระบบสำเร็จ', subtitle: 'ยินดีต้อนรับกลับ',
        details: [
          { label: 'ผู้ใช้', value: displayName },
          { label: 'สิทธิ์', value: String(user.role) },
          { label: 'เวลา', value: new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) },
        ],
        duration: 2800,
      })
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

  const field: React.CSSProperties = { width: '100%', padding: '14px 16px 14px 48px', borderRadius: 16, fontSize: '1rem', border: '1.5px solid #DCE6F5', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#0B1B4D', outline: 'none', transition: 'border-color .15s, box-shadow .15s', boxShadow: '0 3px 10px rgba(36,75,131,0.06)' }
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#2F86F2'; e.target.style.boxShadow = '0 0 0 4px rgba(47,134,242,0.16)' }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#DCE6F5'; e.target.style.boxShadow = '0 3px 10px rgba(36,75,131,0.06)' }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#EAF4FF url(/login/bg.webp) center / cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px 16px' : '40px 32px', boxSizing: 'border-box' }}>
      {introPhase !== 'done' && <IntroSplash exiting={introPhase === 'out'} />}

      <div style={{ width: '100%', maxWidth: 1060, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 18 : 0 }}>

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
            <img src="/login/logo.webp" alt="YooNai" style={{ height: 46, display: 'block', marginBottom: 26 }} />
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
        {ads.length > 0 ? (
          <div style={{ position: 'relative', zIndex: 1, flex: 1, width: '100%', minWidth: 0, height: isMobile ? 220 : 560, marginLeft: isMobile ? 0 : 28, borderRadius: 38, overflow: 'hidden', boxShadow: '0 24px 60px rgba(36,75,131,0.18)', background: '#131C45' }}>
            <AdCarousel ads={ads} />
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', marginLeft: isMobile ? 0 : -34 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 6 : 10, width: '100%' }}>
              <img src="/login/owl.webp" alt="" aria-hidden="true" draggable={false}
                style={{ width: isMobile ? 130 : 270, height: 'auto', flexShrink: 0, userSelect: 'none', pointerEvents: 'none' }} />
              <div style={{ transform: 'rotate(-6deg)', textAlign: 'left', paddingTop: isMobile ? 0 : 70 }}>
                <div style={{ fontWeight: 800, fontStyle: 'italic', fontSize: isMobile ? '1.15rem' : '1.7rem', lineHeight: 1.25, color: '#0F3CC0' }}>
                  ระบบจัดการพนักงาน<br />ที่เข้าใจธุรกิจของคุณ
                </div>
                <div aria-hidden="true" style={{ marginTop: 8, width: isMobile ? 120 : 190, height: 6, borderRadius: 99, background: 'linear-gradient(90deg, #FF8A00, #FFB020)', transform: 'skewX(-18deg)' }} />
              </div>
            </div>
            <img src="/login/features.webp" alt="ครอบคลุมทุกความต้องการ · ใช้งานได้ทุกที่ทุกอุปกรณ์ · ทีมดูแลพร้อมช่วยเหลือ" draggable={false}
              style={{ width: '100%', maxWidth: isMobile ? 360 : 520, height: 'auto', marginTop: isMobile ? 6 : 30, alignSelf: 'center', userSelect: 'none' }} />
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: '0.72rem', color: '#6B7A99' }}>
        YooNai HR System · Powered by WH Group
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
