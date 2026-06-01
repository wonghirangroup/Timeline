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
  const navigate = useNavigate()
  const [step,      setStep]     = useState<Step>('loading')
  const [profile,   setProfile]  = useState<{ lineUserId: string; displayName: string; pictureUrl?: string } | null>(null)
  const [employees, setEmployees] = useState<EmpItem[]>([])
  const [search,    setSearch]   = useState('')
  const [selected,  setSelected] = useState<EmpItem | null>(null)
  const [code,      setCode]     = useState('')
  const [codeError, setCodeError] = useState('')
  const [saving,    setSaving]   = useState(false)
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

        const res = await axios.get(`${apiUrl}/employee/list`, { params: { line_channel_id: channelId }, headers })
        setEmployees(res.data.data ?? [])
        setStep('select')
      } catch (e: any) {
        setErrMsg(e?.response?.data?.error?.message ?? e?.message ?? 'เกิดข้อผิดพลาด')
        setStep('error')
      }
    })()
  }, [])

  async function handleVerify() {
    if (!selected || !profile) return
    setSaving(true)
    setCodeError('')
    try {
      const idToken = liff.getIDToken() ?? ''
      const res = await axios.post(`${apiUrl}/employee/verify`, {
        liff_token:      idToken,
        line_user_id:    profile.lineUserId,
        line_channel_id: channelId,
        employee_code:   code.trim(),
      }, { headers })

      // ตรวจว่ารหัสตรงกับที่เลือกไหม
      if (res.data.data.employee.employee_code !== selected.employee_code) {
        setCodeError('รหัสไม่ตรงกับชื่อที่เลือก กรุณาตรวจสอบอีกครั้ง')
        setSaving(false)
        return
      }

      setJwt(res.data.data.token)
      setStep('success')
      setTimeout(() => navigate('/checkin'), 2000)
    } catch (e: any) {
      const errCode = e?.response?.data?.error?.code
      if (errCode === 'NOT_FOUND')        setCodeError('ไม่พบรหัสพนักงานนี้')
      else if (errCode === 'ALREADY_LINKED') setCodeError('บัญชีนี้ผูก Line อื่นแล้ว กรุณาติดต่อ HR')
      else setCodeError(e?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setSaving(false) }
  }

  const filtered = employees.filter(e =>
    !search || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.branch.name}`.toLowerCase().includes(search.toLowerCase())
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
      <div style={{ fontWeight: 700, color: 'var(--error)' }}>{errMsg}</div>
    </div>
  )

  // ── Success ──
  if (step === 'success') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '0 24px', textAlign: 'center' }}>
      <div className="animate-success-pop" style={{ fontSize: '5rem' }}>🎉</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>ผูกบัญชีสำเร็จ!</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        ยินดีต้อนรับ คุณ{selected?.first_name} {selected?.last_name}<br />กำลังพาไปหน้าเช็คอิน…
      </div>
    </div>
  )

  // ── Confirm step ──
  if (step === 'confirm' && selected) {
    const idx = employees.findIndex(e => e.id === selected.id)
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', padding: '24px 16px', minHeight: '100dvh', background: 'var(--bg-page)' }}>
        <button onClick={() => { setStep('select'); setCode(''); setCodeError('') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-start)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 24 }}>
          ← ย้อนกลับ
        </button>

        {/* Selected card */}
        <div className="glass-card animate-slide-up" style={{ padding: '24px 20px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: COLORS[idx % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 auto 14px' }}>
            {selected.first_name.charAt(0)}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {selected.first_name} {selected.last_name}
            {selected.nickname && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}> ({selected.nickname})</span>}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {selected.department ?? ''}{selected.department ? ' · ' : ''}{selected.branch.name}
          </div>
        </div>

        {/* Code input */}
        <div className="glass-card animate-slide-up" style={{ padding: '22px 20px' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>ยืนยันตัวตน</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.55 }}>
            กรอกรหัสพนักงานของคุณ เช่น <b>{selected.employee_code.slice(0, 5)}…</b>
          </div>
          <input type="text" value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
            placeholder="รหัสพนักงาน" autoFocus autoCapitalize="characters"
            style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `2px solid ${codeError ? 'var(--error)' : 'rgba(255,107,53,0.25)'}`, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '4px', textAlign: 'center', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box' }}
          />
          {codeError && (
            <div style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: 8, textAlign: 'center' }}>⚠️ {codeError}</div>
          )}
          <button onClick={handleVerify} disabled={!code || saving}
            style={{ width: '100%', marginTop: 18, padding: '16px', borderRadius: 16, border: 'none', cursor: !code || saving ? 'not-allowed' : 'pointer', background: !code || saving ? 'rgba(0,0,0,0.08)' : 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: !code || saving ? 'var(--text-muted)' : '#fff', fontSize: '1rem', fontWeight: 700, boxShadow: code && !saving ? '0 4px 16px rgba(255,107,53,0.3)' : 'none' }}>
            {saving ? '⏳ กำลังยืนยัน…' : '✅ ยืนยันตัวตน'}
          </button>
        </div>
      </div>
    )
  }

  // ── Select step ──
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg-page)' }}>
      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '32px 16px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>ยินดีต้อนรับ 👋</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          กรุณาเลือกชื่อของคุณจากรายการ
        </div>
        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            {profile.pictureUrl && <img src={profile.pictureUrl} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt="" />}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{profile.displayName}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ หรือ สาขา…"
            style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: 14, border: '1.5px solid rgba(255,107,53,0.2)', fontSize: '0.9rem', background: 'rgba(255,255,255,0.88)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Employee list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>ไม่พบชื่อที่ค้นหา</div>
            <div style={{ fontSize: '0.82rem', marginTop: 4 }}>ลองค้นหาด้วยคำอื่น หรือแจ้ง HR ให้เพิ่มชื่อ</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((emp, i) => (
              <button key={emp.id} onClick={() => { setSelected(emp); setStep('confirm') }}
                className="glass-card animate-slide-up"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 20, cursor: 'pointer', textAlign: 'left', width: '100%', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', animationDelay: `${i * 40}ms` }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
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
