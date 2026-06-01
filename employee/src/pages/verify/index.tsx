// employee/src/pages/verify/index.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import liff from '@line/liff'
import { initLiff, getLiffProfile } from '../../lib/liff'
import { setJwt } from '../../lib/axios'

interface EmpItem {
  id: string; first_name: string; last_name: string
  nickname: string | null; department: string | null
  employee_code: string; branch: { id: string; name: string }
}

type Step = 'loading' | 'select' | 'confirm' | 'success' | 'error'

const COLORS = [
  'linear-gradient(135deg,#ff6b35,#ffab40)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#8b5cf6,#a78bfa)',
  'linear-gradient(135deg,#16a34a,#4ade80)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#db2777,#f472b6)',
]

export default function VerifyPage() {
  const navigate  = useNavigate()
  const [step,      setStep]     = useState<Step>('loading')
  const [profile,   setProfile]  = useState<{ lineUserId: string; displayName: string; pictureUrl?: string } | null>(null)
  const [employees, setEmployees] = useState<EmpItem[]>([])
  const [search,    setSearch]   = useState('')
  const [selected,  setSelected] = useState<EmpItem | null>(null)
  const [linking,   setLinking]  = useState(false)
  const [errMsg,    setErrMsg]   = useState('')

  const apiUrl    = import.meta.env.VITE_API_URL as string
  const channelId = import.meta.env.VITE_LINE_CHANNEL_ID as string
  const headers   = { 'ngrok-skip-browser-warning': 'true' }

  useEffect(() => {
    ;(async () => {
      try {
        await initLiff()
        const p = await getLiffProfile()
        setProfile({ lineUserId: p.lineUserId, displayName: p.displayName, pictureUrl: p.pictureUrl })

        const res = await axios.get(`${apiUrl}/employee/list`, {
          params: { line_channel_id: channelId }, headers,
        })
        setEmployees(res.data.data ?? [])
        setStep('select')
      } catch (e: any) {
        setErrMsg(e?.response?.data?.error?.message ?? e?.message ?? 'เกิดข้อผิดพลาด')
        setStep('error')
      }
    })()
  }, [])

  async function handleLink() {
    if (!selected || !profile) return
    setLinking(true)
    try {
      const idToken = liff.getIDToken() ?? ''
      const res = await axios.post(`${apiUrl}/employee/link`, {
        liff_token:      idToken,
        line_user_id:    profile.lineUserId,
        line_channel_id: channelId,
        employee_id:     selected.id,
      }, { headers })

      setJwt(res.data.data.token)
      setStep('success')
      setTimeout(() => navigate('/checkin'), 2000)
    } catch (e: any) {
      const code = e?.response?.data?.error?.code
      if (code === 'ALREADY_LINKED') setErrMsg('พนักงานนี้ผูก Line อื่นไปแล้ว กรุณาติดต่อ HR')
      else setErrMsg(e?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
      setStep('error')
    } finally { setLinking(false) }
  }

  const filtered = employees.filter(e =>
    !search || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.branch.name} ${e.department ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  // ── Loading ──
  if (step === 'loading') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div className="animate-spin" style={{ fontSize: '2.5rem' }}>⏳</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
    </div>
  )

  // ── Error ──
  if (step === 'error') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <div style={{ fontWeight: 700, color: 'var(--error)', marginBottom: 16 }}>{errMsg}</div>
      <button onClick={() => { setErrMsg(''); setStep('select') }}
        style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
        ลองใหม่
      </button>
    </div>
  )

  // ── Success ──
  if (step === 'success') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '0 24px', textAlign: 'center' }}>
      <div className="animate-success-pop" style={{ fontSize: '5rem' }}>🎉</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>ผูกบัญชีสำเร็จ!</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        ยินดีต้อนรับ คุณ{selected?.first_name} {selected?.last_name}<br />
        กำลังพาไปหน้าเช็คอิน…
      </div>
    </div>
  )

  // ── Confirm ──
  if (step === 'confirm' && selected) {
    const idx = employees.findIndex(e => e.id === selected.id)
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '24px 16px', minHeight: '100dvh', background: 'var(--bg-page)' }}>
        <button onClick={() => setStep('select')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-start)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 28 }}>
          ← เลือกใหม่
        </button>

        <div className="glass-card animate-slide-up" style={{ padding: '28px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: COLORS[idx % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', fontWeight: 700, color: '#fff', margin: '0 auto 16px' }}>
            {selected.first_name.charAt(0)}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {selected.first_name} {selected.last_name}
            {selected.nickname && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}> ({selected.nickname})</span>}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {selected.department ?? ''}{selected.department ? ' · ' : ''}{selected.branch.name}
          </div>
        </div>

        {/* Profile ที่จะผูก */}
        {profile && (
          <div className="glass-card animate-slide-up" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            {profile.pictureUrl
              ? <img src={profile.pictureUrl} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
              : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>{profile.displayName.charAt(0)}</div>
            }
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>จะผูกกับบัญชี LINE</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{profile.displayName}</div>
            </div>
          </div>
        )}

        <button onClick={handleLink} disabled={linking}
          style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', cursor: linking ? 'not-allowed' : 'pointer', background: linking ? 'rgba(0,0,0,0.08)' : 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: linking ? 'var(--text-muted)' : '#fff', fontSize: '1.05rem', fontWeight: 700, boxShadow: linking ? 'none' : '0 4px 16px rgba(255,107,53,0.3)' }}>
          {linking ? '⏳ กำลังผูกบัญชี…' : '✅ ใช่ นี่คือฉัน — ผูกบัญชี'}
        </button>
      </div>
    )
  }

  // ── Select ──
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg-page)' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '32px 16px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>ยินดีต้อนรับ 👋</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          เลือกชื่อของคุณจากรายการด้านล่าง
        </div>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 10 }}>
            {profile.pictureUrl && <img src={profile.pictureUrl} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{profile.displayName}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, ชื่อเล่น, สาขา…"
            style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: 14, border: '1.5px solid rgba(255,107,53,0.2)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.88)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>ไม่พบชื่อที่ค้นหา</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>ลองค้นหาด้วยคำอื่น หรือแจ้ง HR ให้เพิ่มชื่อ</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((emp, i) => (
              <button key={emp.id}
                onClick={() => { setSelected(emp); setStep('confirm') }}
                className="glass-card animate-slide-up"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 20, cursor: 'pointer', textAlign: 'left', width: '100%', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', animationDelay: `${i * 40}ms` }}
                onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, background: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                  {emp.first_name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {emp.first_name} {emp.last_name}
                    {emp.nickname && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 400 }}> ({emp.nickname})</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {emp.department ?? ''}{emp.department ? ' · ' : ''}{emp.branch.name}
                  </div>
                </div>
                <span style={{ color: 'var(--accent-start)', fontSize: '1.3rem', opacity: 0.7, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
