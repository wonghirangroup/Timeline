// employee/src/pages/verify/index.tsx
// พนักงานยืนยันตัวตนครั้งแรก — กรอกรหัสพนักงาน → ระบบผูก Line UID อัตโนมัติ
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import liff from '@line/liff'
import { initLiff, getLiffProfile } from '../../lib/liff'
import { setJwt } from '../../lib/axios'

type Step = 'loading' | 'input' | 'success' | 'error'

export default function VerifyPage() {
  const navigate = useNavigate()
  const [step,       setStep]      = useState<Step>('loading')
  const [profile,    setProfile]   = useState<{ lineUserId: string; displayName: string; pictureUrl?: string } | null>(null)
  const [code,       setCode]      = useState('')
  const [codeError,  setCodeError] = useState('')
  const [saving,     setSaving]    = useState(false)
  const [errMsg,     setErrMsg]    = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        await initLiff()
        const p = await getLiffProfile()
        setProfile({ lineUserId: p.lineUserId, displayName: p.displayName, pictureUrl: p.pictureUrl })
        setStep('input')
      } catch {
        setErrMsg('LIFF ไม่พร้อม — กรุณาเปิดผ่าน LINE')
        setStep('error')
      }
    })()
  }, [])

  async function handleVerify() {
    if (!profile || !code.trim()) return
    setSaving(true)
    setCodeError('')
    try {
      const idToken     = liff.getIDToken() ?? ''
      const channelId   = import.meta.env.VITE_LINE_CHANNEL_ID as string
      const apiUrl      = import.meta.env.VITE_API_URL as string

      const res = await axios.post(`${apiUrl}/employee/verify`, {
        liff_token:      idToken,
        line_user_id:    profile.lineUserId,
        line_channel_id: channelId,
        employee_code:   code.trim(),
      })

      const { token } = res.data.data
      setJwt(token)
      setStep('success')
      setTimeout(() => navigate('/checkin'), 2000)
    } catch (e: any) {
      const errCode = e?.response?.data?.error?.code
      if (errCode === 'NOT_FOUND')       setCodeError('ไม่พบรหัสพนักงานนี้ กรุณาตรวจสอบอีกครั้ง')
      else if (errCode === 'ALREADY_LINKED') setCodeError('รหัสนี้ถูกผูกกับ Line อื่นแล้ว กรุณาติดต่อ HR')
      else if (errCode === 'INVALID_TOKEN')  setCodeError('LIFF token หมดอายุ กรุณาเปิดใหม่อีกครั้ง')
      else setCodeError(e?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally { setSaving(false) }
  }

  // Loading
  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div className="animate-spin" style={{ fontSize: '2.5rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด LIFF…</div>
      </div>
    )
  }

  // Error
  if (step === 'error') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <div style={{ fontWeight: 700, color: 'var(--error)' }}>{errMsg}</div>
      </div>
    )
  }

  // Success
  if (step === 'success') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '0 24px', textAlign: 'center' }}>
        <div className="animate-success-pop" style={{ fontSize: '5rem' }}>🎉</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>ยืนยันตัวตนสำเร็จ!</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>กำลังพาไปหน้าเช็คอิน…</div>
      </div>
    )
  }

  // Input step
  return (
    <div style={{ maxWidth: 430, margin: '0 auto', padding: '0 16px', minHeight: '100dvh', background: 'var(--bg-page)' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '40px 0 28px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>ยินดีต้อนรับ 👋</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
          กรอกรหัสพนักงานของคุณเพื่อเริ่มใช้งาน
        </div>
      </div>

      {/* Profile card */}
      {profile && (
        <div className="glass-card animate-slide-up" style={{ padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          {profile.pictureUrl
            ? <img src={profile.pictureUrl} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="avatar" />
            : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.3rem', flexShrink: 0 }}>{profile.displayName.charAt(0)}</div>
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{profile.displayName}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>บัญชี LINE ของคุณ</div>
          </div>
        </div>
      )}

      {/* Code input */}
      <div className="glass-card animate-slide-up" style={{ padding: '22px 20px' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>รหัสพนักงาน</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.55 }}>
          ใส่รหัสพนักงานที่ HR แจ้งให้คุณไว้ เช่น <b>68-02-001</b>
        </div>

        <input type="text" value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
          onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
          placeholder="รหัสพนักงาน"
          autoFocus autoCapitalize="characters"
          style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `2px solid ${codeError ? 'var(--error)' : 'rgba(255,107,53,0.25)'}`, fontSize: '1.2rem', fontWeight: 700, letterSpacing: '4px', textAlign: 'center', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
        />

        {codeError && (
          <div className="animate-slide-down" style={{ color: 'var(--error)', fontSize: '0.82rem', marginTop: 8, textAlign: 'center' }}>⚠️ {codeError}</div>
        )}

        <button onClick={handleVerify} disabled={!code || saving}
          style={{ width: '100%', marginTop: 18, padding: '16px', borderRadius: 16, border: 'none', cursor: !code || saving ? 'not-allowed' : 'pointer', background: !code || saving ? 'rgba(0,0,0,0.08)' : 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: !code || saving ? 'var(--text-muted)' : '#fff', fontSize: '1rem', fontWeight: 700, boxShadow: code && !saving ? '0 4px 16px rgba(255,107,53,0.3)' : 'none', transition: 'all 0.2s' }}>
          {saving ? '⏳ กำลังยืนยัน…' : '✅ ยืนยันตัวตน'}
        </button>
      </div>

    </div>
  )
}
