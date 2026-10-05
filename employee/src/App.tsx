// employee/src/App.tsx
import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './index.css'
import BottomNav    from './components/layout/BottomNav'
import { PageLoader } from './components/ui'
import { useAuthStore, getLastKnownEmployeeName } from './stores/authStore'
import { devLogin, liffLogin, reportIssue, sendBootDiag } from './lib/axios'
import { initLiff, getLiffProfile, getChannelId, forceRelogin, hardResetLiff, probeConnectivity, tagStage, getFetchFailures } from './lib/liff'

const CheckinPage  = lazy(() => import('./pages/checkin'))
const CheckoutPage = lazy(() => import('./pages/checkout'))
const HistoryPage  = lazy(() => import('./pages/history'))
const LeavePage    = lazy(() => import('./pages/leave'))
const OtPage       = lazy(() => import('./pages/ot'))
const FeedbackPage = lazy(() => import('./pages/feedback'))
const ProfilePage  = lazy(() => import('./pages/profile'))
const NoticesPage  = lazy(() => import('./pages/notices'))
const ResignPage   = lazy(() => import('./pages/resign'))
const DocumentsPage = lazy(() => import('./pages/documents'))
const VerifyPage   = lazy(() => import('./pages/verify'))
const UiKitPage    = lazy(() => import('./pages/ui-kit'))

// ─── Auth states ─────────────────────────────────────────────────────────────
type BootState = 'loading' | 'dev-pick' | 'authed' | 'need-verify' | 'error'

const DEV_EMP_KEY = 'dev_employee_id'


// พนักงานที่เข้าแอปไม่ได้เลย (เช่น "Failed to Fetch" วนลูป) เดิมไม่มีทางแจ้งอะไร
// ได้นอกจากทักไปหาแอดมินตรงๆ เอง — เพิ่มปุ่ม "แจ้งปัญหานี้ให้แอดมิน" ยิงตรงไป
// /employee/report-issue (ไม่ต้อง login เลย ระบุ tenant จาก line_channel_id ที่
// อ่านได้ฝั่ง client ล้วนๆ ไม่ต้องเรียก API ก่อน) feedback 2026-09-14: มี 2 คนเจอ
// ปัญหานี้แล้วไม่มีทางแจ้ง
function ErrorScreen({ message, detail, onRetry, reportCtx }: {
  message: string; detail: string; onRetry: () => void
  reportCtx: { lineUserId?: string; displayName?: string }
}) {
  const [reportState, setReportState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [extra, setExtra] = useState('')

  async function handleReport() {
    setReportState('sending')
    try {
      // ล้มเหลวตั้งแต่ก่อน LIFF profile จะโหลดเสร็จ (เช่น initLiff() เองก็ fetch
      // ไม่ได้) จะไม่มี lineUserId/displayName จาก LINE ให้แนบเลย — ใช้ชื่อคนล่าสุด
      // ที่เคยล็อกอินสำเร็จบนเครื่องนี้แทน (เดา ไม่ใช่ตัวตนที่ยืนยันแล้ว จึงระบุกำกับ
      // ให้ชัดในข้อความ กันแอดมินเข้าใจผิดว่าเป็นข้อมูลจริง 100%)
      const fallbackName = !reportCtx.displayName ? getLastKnownEmployeeName() : null
      // ตรวจการเชื่อมต่อจริงตอนกดแจ้ง (server เรา / LINE API / CDN ของ LIFF) แนบไปด้วย —
      // แอดมินเห็นทันทีว่าพังฝั่งไหน ไม่ต้องเดาจาก "Failed to fetch" อย่างเดียวอีก
      const probe = await probeConnectivity(import.meta.env.VITE_API_URL as string).catch(() => 'probe-error')
      const lineVer = navigator.userAgent.match(/Line\/([\d.]+)/)?.[1] ?? '-'
      const android = navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+/)?.[0] ?? navigator.platform
      const diag = `${detail} | online=${navigator.onLine} | ${android} LINE ${lineVer} | ${probe} | failed-fetch: ${getFetchFailures()}`.slice(0, 495)
      await reportIssue({
        line_channel_id: getChannelId(),
        line_user_id:    reportCtx.lineUserId,
        display_name:    reportCtx.displayName ?? (fallbackName ? `${fallbackName} (เดาจากครั้งล่าสุด ไม่ยืนยัน)` : undefined),
        message:         extra.trim() || 'พนักงานกดปุ่ม "แจ้งปัญหา" จากหน้า error (ไม่ได้พิมพ์รายละเอียดเพิ่ม)',
        context:         diag,
      })
      setReportState('sent')
    } catch {
      setReportState('failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: '24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <div style={{ fontWeight: 700, color: '#dc2626', lineHeight: 1.5 }}>{message}</div>
      {detail.startsWith('liff') && (
        <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, maxWidth: 320 }}>
          ถ้ากด "ลองใหม่" แล้วยังไม่หาย: ปิดแอป LINE ให้สนิท (ปัดทิ้งจากหน้าแอปที่เปิดล่าสุด) แล้วเปิดใหม่
        </div>
      )}
      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{detail}</div>
      <button onClick={onRetry} style={{
        padding: '12px 28px', borderRadius: 14, border: 'none',
        background: '#244B83', color: '#fff',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem',
      }}>ลองใหม่</button>

      {reportState === 'sent' ? (
        <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#16A34A', fontWeight: 700 }}>
          ✓ แจ้งแอดมินแล้ว ทีมงานจะรีบดำเนินการ
        </div>
      ) : (
        <div style={{ marginTop: 6, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={extra}
            onChange={e => setExtra(e.target.value.slice(0, 300))}
            placeholder={
              reportCtx.displayName || getLastKnownEmployeeName()
                ? 'อธิบายเพิ่มเติมได้ (ไม่บังคับ) เช่น ทำอะไรอยู่ตอนเจอปัญหา'
                : 'ช่วยพิมพ์ชื่อตัวเองด้วย (ระบบดึงชื่ออัตโนมัติไม่ได้) เช่น ปิ๋ว แผนกขาย'
            }
            rows={2}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E7EB',
              fontSize: '0.82rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
            }}
          />
          <button onClick={handleReport} disabled={reportState === 'sending'} style={{
            padding: '11px 20px', borderRadius: 14, border: '1.5px solid #244B83',
            background: '#fff', color: '#244B83',
            fontWeight: 700, cursor: reportState === 'sending' ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem',
          }}>
            {reportState === 'sending' ? 'กำลังส่ง...' : 'แจ้งปัญหานี้ให้แอดมิน'}
          </button>
          {reportState === 'failed' && (
            <div style={{ fontSize: '0.78rem', color: '#dc2626' }}>ส่งไม่สำเร็จ ลองใหม่อีกครั้ง</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dev Employee Picker ──────────────────────────────────────────────────────
interface DevEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  employee_code: string; branch: { id: string; name: string }
  weekly_off_mode?: 'WEEKLY' | 'MONTHLY_BATCH'
  employee_status_type?: { id: string; name: string; monthly_off_quota: number } | null
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
        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4 }}>เฉพาะการทดสอบ — ไม่แสดงใน production</div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 ค้นหาชื่อ, รหัส, สาขา…"
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #B2C0D4', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: 14, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#6B7280', fontSize: '0.85rem' }}>กำลังโหลดรายชื่อพนักงาน…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280' }}>ไม่พบพนักงาน</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(e => (
            <button key={e.id} onClick={() => onPick(e)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px',
              borderRadius: 14, border: '1.5px solid #B2C0D4', background: '#fff', cursor: 'pointer',
              textAlign: 'left', width: '100%', fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: '#244B83',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700, color: '#fff',
              }}>
                {e.first_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a2b3c' }}>
                  {e.first_name} {e.last_name}
                  {e.nickname && <span style={{ fontWeight: 400, color: '#6B7280', fontSize: '0.8rem' }}> ({e.nickname})</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                  {e.employee_code} · {e.branch.name}
                </div>
              </div>
              <span style={{ color: '#244B83', fontSize: '1.2rem' }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// เครือข่ายตอนเปิดแอป (LIFF init / LINE login / เรียก backend ครั้งแรก) มีโอกาส
// สะดุดชั่วคราวได้ (สัญญาณอ่อน ๆ, สลับ WiFi↔มือถือ, แอป LINE เพิ่งตื่นจาก background)
// — ก่อนหน้านี้ error พวกนี้ (ไม่มี err.response เลย เช่น "Failed to fetch") จะโชว์
// หน้า error ทันทีให้ผู้ใช้กด "ลองใหม่" เอง หรือต้องปิด-เปิดแอปใหม่ทั้งแอป — ลองซ้ำ
// อัตโนมัติแบบมี backoff สั้นๆ ก่อน ถ้ายังไม่ได้จริงๆ ค่อยโชว์หน้า error ให้กดเอง
// (feedback 2026-09-15: "บางคนชอบขึ้น Failed To Fetch มันไม่ควรขึ้น... ทำให้ปัญหานี้
// หายไปถาวรได้ไหม" — แก้ไม่ได้ที่ต้นตอเครือข่ายจริงๆ (ควบคุมไม่ได้) แต่ทำให้ผู้ใช้ไม่ต้อง
// รู้ตัวว่ามันสะดุดได้ในเคสส่วนใหญ่)
const AUTO_RETRY_DELAYS = [1500, 3000, 6000] // ms — ยิ่งลองซ้ำยิ่งเว้นนานขึ้น

// error จาก fetch/axios ที่ "เน็ตหลุดจริงๆ" ไม่มี HTTP response กลับมาเลย (ต่างจาก
// error ที่ backend ตอบมาแล้วแต่เป็น 4xx/5xx ซึ่งลองซ้ำไปก็ไม่ช่วย เช่น token ผิด)
function isNetworkGlitch(err: any): boolean {
  if (err?.response) return false // มี HTTP response แปลว่าเน็ตถึง server จริง ไม่ใช่ปัญหาเครือข่าย
  const msg = String(err?.message ?? '').toLowerCase()
  return err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED'
    || msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { setAuth, isAuthenticated } = useAuthStore()
  const [bootState, setBootState] = useState<BootState>('loading')
  const [devToken,  setDevToken]  = useState('')
  const [errMsg,    setErrMsg]    = useState('')
  const [errDetail, setErrDetail] = useState('')
  const [retrying,  setRetrying]  = useState<number | null>(null) // ครั้งที่กำลังลองซ้ำอัตโนมัติ (1-based) — null = ไม่ได้ลองซ้ำอยู่
  // เก็บไว้ให้ ErrorScreen ใช้แนบไปกับ "แจ้งปัญหาให้แอดมิน" — ดึงจาก LIFF SDK ได้
  // (ไม่ต้องเรียก API เรา) แม้ boot ล้มเหลวตอนเรียก backend ก็ตาม
  const [reportCtx, setReportCtx] = useState<{ lineUserId?: string; displayName?: string }>({})

  async function boot(attempt = 0) {
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
            setAuth({ id: e.id, first_name: e.first_name, last_name: e.last_name, employee_code: e.employee_code, branch: e.branch, weekly_off_mode: e.weekly_off_mode, employee_status_type: e.employee_status_type }, token)
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
      const { lineUserId, displayName, idToken } = await getLiffProfile()
      const channelId = getChannelId()
      setReportCtx({ lineUserId, displayName })

      try {
        const { token, employee } = await tagStage('backend', liffLogin({
          liff_token:      idToken,
          line_user_id:    lineUserId,
          line_channel_id: channelId,
        }))
        setAuth(employee, token)
        setRetrying(null)
        try { sessionStorage.removeItem('tl_boot_reloads') } catch { /* ignore */ }
        setBootState('authed')
      } catch (err: any) {
        const code = err?.response?.data?.error?.code
        if (code === 'EMPLOYEE_NOT_FOUND') {
          // ยังไม่ได้ผูก LINE → ไปหน้า verify
          setRetrying(null)
          setBootState('need-verify')
        } else if (code === 'INVALID_TOKEN') {
          // ID token ที่ liff SDK แคชไว้หมดอายุ (isLoggedIn() ยัง true อยู่ แต่ token ใช้ไม่ได้แล้ว) —
          // บังคับ logout+login ใหม่เพื่อเอา token สดจริง ไม่งั้นกด "ลองใหม่" จะวนเจอ error เดิมไม่รู้จบ
          await forceRelogin().catch(() => hardResetLiff())
        } else {
          throw err
        }
      }
    } catch (err: any) {
      const liffStage = String(err?.stage ?? '').startsWith('liff')
      // ขั้น liff พังทั้งที่เครือข่ายปกติ (ตรวจแล้ว ours/line-api/liff-cdn = 200 ตอนกดแจ้งปัญหา) = สถานะของ LIFF SDK ใน WebView นี้ค้าง ไม่ใช่เน็ตหลุด —
      // เรียก liff.init() ซ้ำใน context เดิมจึงพังซ้ำเหมือนเดิม (ตรงกับอาการที่ต้องปิดแอป LINE สนิทถึงจะหาย) ให้โหลดหน้าใหม่ทั้งหน้าแทน
      // ได้ SDK instance สดเหมือนเปิดแอปใหม่ — จำกัด 2 ครั้งต่อ session กันวนไม่จบ ครบแล้วค่อยไปขั้นล้าง session / หน้า error
      if (liffStage && isNetworkGlitch(err) && !import.meta.env.DEV) {
        let n = 0
        try { n = Number(sessionStorage.getItem('tl_boot_reloads') ?? 0); if (n < 2) sessionStorage.setItem('tl_boot_reloads', String(n + 1)) } catch { n = 2 }
        if (n < 2) {
          setRetrying(n + 1)
          setTimeout(() => window.location.reload(), 900)
          return
        }
      }
      if (isNetworkGlitch(err) && !liffStage && attempt < AUTO_RETRY_DELAYS.length) {
        setRetrying(attempt + 1)
        setTimeout(() => boot(attempt + 1), AUTO_RETRY_DELAYS[attempt])
        return // ยังอยู่หน้า loading เดิม ไม่โชว์ error ให้ผู้ใช้เห็นเลยถ้าลองซ้ำแล้วผ่าน
      }
      // ลองซ้ำปกติครบแล้วยังไม่ผ่าน (มักเกิดในขั้น initLiff()/getLiffProfile() เอง
      // ก่อนถึง backend เราด้วยซ้ำ — ไม่มี err.response เลยถูกนับเป็น network glitch)
      // ยืนยันแล้ว 2026-09-30 ว่าสาเหตุจริงบางเคสคือ session ของ LIFF SDK ที่ค้าง
      // อยู่ในแอป LINE เอง (ไม่ใช่เน็ตหลุดจริง) — ผู้ใช้บังคับปิดแอป LINE สนิทแล้ว
      // เปิดใหม่ถึงจะหาย เท่ากับ logout+login LIFF ใหม่ทั้งหมด — ลอง forceRelogin()
      // อัตโนมัติให้ก่อนสักครั้งเดียว (กัน loop ด้วย sessionStorage flag) แทนที่จะ
      // โชว์หน้า error ให้ผู้ใช้ต้องไปทำเองด้วยมือ
      // แก้ 2026-10-02: เดิมเรียก forceRelogin() ซึ่งพึ่ง liff.login() — ใช้ไม่ได้ตอน
      // liff.init() เป็นตัวที่พังเอง (โยน error ซ้ำ ระบบกู้คืนเลยไม่เคยทำงานจริง) เปลี่ยนเป็น
      // hardResetLiff() ที่ล้าง session ของ LIFF เองแล้วเปิดใหม่ผ่าน liff.line.me — flag เก็บใน
      // localStorage พร้อมเวลา (ไม่ใช่ sessionStorage) เพราะการเปิดใหม่อาจได้ WebView ใหม่ที่
      // sessionStorage ว่าง ทำให้รีเซ็ตวนไม่รู้จบได้ — รีเซ็ตได้ครั้งเดียวต่อ 5 นาที
      if (isNetworkGlitch(err) && !import.meta.env.DEV && String(err?.stage ?? '').startsWith('liff')) {
        const FLAG = 'tl_liff_reset_at'
        const last = Number(localStorage.getItem(FLAG) ?? 0)
        if (Date.now() - last > 5 * 60_000) {
          localStorage.setItem(FLAG, String(Date.now()))
          await hardResetLiff()
          return
        }
      }
      setRetrying(null)
      const raw = err?.response?.data?.error?.message ?? err?.message ?? 'เกิดข้อผิดพลาด'
      const stage = err?.stage ?? 'unknown'
      setErrDetail(`${stage}: ${raw}`)
      // ส่ง diagnostic ไปเก็บที่เซิร์ฟเวอร์เองเลย ไม่ต้องรอให้พนักงานกดแจ้งปัญหา — จะได้เห็นทุกเคส (รวมคนที่ไม่ได้กดแจ้ง)
      sendBootDiag({
        line_channel_id: getChannelId(), stage, detail: String(raw).slice(0, 300),
        context: `LINE ${navigator.userAgent.match(/Line\/([\d.]+)/)?.[1] ?? '-'} | ${navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+/)?.[0] ?? '-'} | online=${navigator.onLine} | failed-fetch: ${getFetchFailures()}`.slice(0, 790),
      })
      setErrMsg(stage.startsWith('liff') && isNetworkGlitch(err)
        ? 'เชื่อมต่อกับ LINE ไม่สำเร็จ'
        : raw)
      setBootState('error')
    }
  }

  useEffect(() => {
    if (!isAuthenticated) boot()
    else setBootState('authed')
  }, [])

  function handleDevPick(emp: DevEmployee) {
    localStorage.setItem(DEV_EMP_KEY, emp.id)
    setAuth({ id: emp.id, first_name: emp.first_name, last_name: emp.last_name, employee_code: emp.employee_code, branch: emp.branch, weekly_off_mode: emp.weekly_off_mode, employee_status_type: emp.employee_status_type }, devToken)
    setBootState('authed')
  }

  if (bootState === 'loading')  return <PageLoader title="กำลังเข้าสู่ระบบ…" sub={retrying ? `สัญญาณไม่นิ่ง กำลังลองใหม่ (${retrying}/${AUTO_RETRY_DELAYS.length})` : 'YooNai by Smartjigsaw'} />
  if (bootState === 'error')    return <ErrorScreen message={errMsg} detail={errDetail} onRetry={() => (errDetail.startsWith('liff') ? window.location.reload() : boot())} reportCtx={reportCtx} />
  if (bootState === 'dev-pick') return <DevPicker onPick={handleDevPick} />

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {bootState === 'need-verify' ? (
            // ยังไม่ผูก LINE → บังคับไป verify
            <>
              {/* ผูกบัญชีเสร็จแล้ว — เรียก boot() ใหม่ทั้งชุด (ไม่ใช่แค่ setBootState('authed'))
                  เพราะต้องได้ profile พนักงานที่ enrich ครบ (branch/quota/feature flags ฯลฯ)
                  ผ่าน liffLogin() เหมือนโฟลว์ปกติ — เดิม setBootState ตรงๆ ทำให้ authStore.employee
                  ยังเป็น null อยู่ หน้าแรก (/checkin) เลยค้างที่ PageLoader ตลอดไป ต้องปิดเปิด LIFF
                  ใหม่ถึงจะเข้าได้ (feedback 2026-09-22) */}
              <Route path="/verify" element={<VerifyPage onLinked={() => boot()} />} />
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
              <Route path="/notices"  element={<NoticesPage />} />
              <Route path="/resign"   element={<ResignPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/profile"  element={<ProfilePage />} />
              <Route path="/ui-kit"   element={<UiKitPage />} />
              <Route path="*"         element={<Navigate to="/checkin" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
      {bootState === 'authed' && <BottomNav />}
    </BrowserRouter>
  )
}
