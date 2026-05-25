// employee/src/pages/checkin/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { api } from '../../lib/axios'
import { getLiffProfile, initLiff } from '../../lib/liff'

type Profile = {
  displayName: string
  pictureUrl?: string
  lineUserId: string
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { text: 'สวัสดีตอนเช้า', emoji: '🌅' }
  if (h >= 12 && h < 18) return { text: 'สวัสดีตอนบ่าย', emoji: '☀️' }
  return { text: 'สวัสดีตอนเย็น', emoji: '🌙' }
}

function formatThaiDate(date: Date): string {
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `วัน${days[date.getDay()]}ที่ ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

// ── Sub-components ─────────────────────────────────────────────

function ClockDisplay() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const { text, emoji } = getGreeting()

  return (
    <div
      className="header-strip animate-fade-in"
      style={{ textAlign: 'center', padding: '32px 20px 20px' }}
    >
      {/* orange wave accent bar */}
      <div style={{
        width: 40, height: 4, borderRadius: 99,
        background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))',
        margin: '0 auto 14px',
      }} />

      <div style={{
        fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)',
        letterSpacing: '-0.4px', lineHeight: 1.2,
      }}>
        {text} {emoji}
      </div>

      <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
        {formatThaiDate(now)}
      </div>

      <div style={{
        marginTop: 6,
        fontVariantNumeric: 'tabular-nums',
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '2px',
        background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {formatTime(now)}
      </div>
    </div>
  )
}

function ProfileCard({ profile }: { profile: Profile }) {
  const short = profile.lineUserId.slice(0, 12) + '…'
  return (
    <div className="glass-card animate-slide-up" style={{ margin: '0 16px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {profile.pictureUrl ? (
          <img
            src={profile.pictureUrl}
            alt="avatar"
            style={{
              width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              border: '2px solid rgba(255,107,53,0.25)',
              boxShadow: '0 2px 8px rgba(255,107,53,0.15)',
            }}
          />
        ) : (
          <div style={{
            width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, color: '#fff',
          }}>
            {profile.displayName.charAt(0)}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '0.95rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--text-primary)',
          }}>
            {profile.displayName}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
            LINE ID: {short}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span
            className="animate-dot-blink"
            style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>พร้อม</span>
        </div>
      </div>
    </div>
  )
}

function ProfileCardSkeleton({ errorMsg }: { errorMsg: string | null }) {
  return (
    <div className="glass-card animate-slide-up" style={{ margin: '0 16px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,107,53,0.08)',
          border: '2px solid rgba(255,107,53,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>
          👤
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: errorMsg ? 'var(--error)' : 'var(--text-secondary)' }}>
            {errorMsg ? 'LIFF ไม่พร้อมใช้งาน' : 'กำลังโหลดโปรไฟล์…'}
          </div>
          {errorMsg && (
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 3 }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckInButton({ state, disabled, onClick }: {
  state: ButtonState
  disabled: boolean
  onClick: () => void
}) {
  const getInner = () => {
    if (state === 'loading') return <span className="animate-spin" style={{ fontSize: '2rem', display: 'block' }}>⏳</span>
    if (state === 'success') return <span className="animate-success-pop" style={{ fontSize: '2.4rem', display: 'block' }}>✅</span>
    if (state === 'error')   return <span className="animate-success-pop" style={{ fontSize: '2.4rem', display: 'block' }}>❌</span>
    return <span style={{ fontSize: '2.6rem', display: 'block' }}>⏰</span>
  }

  const getLabel = () => {
    if (state === 'loading') return 'กำลังบันทึก…'
    if (state === 'success') return 'บันทึกแล้ว!'
    if (state === 'error')   return 'ลองอีกครั้ง'
    return 'แตะเพื่อเช็คอิน'
  }

  const isReady = state === 'idle' && !disabled

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0 8px' }}>
      <div style={{ position: 'relative', width: 164, height: 164, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulse rings — orange */}
        {isReady && (
          <>
            <div className="animate-pulse-ring" style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            }} />
            <div className="animate-pulse-ring-2" style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
            }} />
          </>
        )}

        <button
          id="checkin-btn"
          type="button"
          disabled={disabled || state === 'loading'}
          onClick={onClick}
          style={{
            width: 156,
            height: 156,
            borderRadius: '50%',
            border: 'none',
            cursor: disabled || state === 'loading' ? 'not-allowed' : 'pointer',
            background: disabled
              ? 'rgba(0,0,0,0.08)'
              : 'linear-gradient(145deg, var(--accent-start), var(--accent-mid), var(--accent-end))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isReady
              ? '0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)'
              : '0 4px 16px rgba(0,0,0,0.1)',
            transition: 'transform 0.15s ease, box-shadow 0.2s ease',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          onTouchStart={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          {getInner()}
        </button>
      </div>

      <div style={{
        fontSize: '1rem', fontWeight: 700,
        color: disabled ? 'var(--text-muted)' : 'var(--accent-start)',
        letterSpacing: '0.2px',
      }}>
        {getLabel()}
      </div>
    </div>
  )
}

function StatsRow({ checkedInAt }: { checkedInAt: string | null }) {
  const inTime = checkedInAt ? new Date(checkedInAt) : null
  const inLabel = inTime
    ? inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—'

  const stats = [
    { icon: '⏱', label: 'วันนี้ทำงาน', value: '— ชม.' },
    { icon: '🕐', label: 'เช็คอินล่าสุด', value: inLabel },
    { icon: '✅', label: 'สถานะ', value: checkedInAt ? 'ปกติ' : '—' },
  ]

  return (
    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 16px' }}>
      {stats.map(s => (
        <div
          key={s.label}
          className="glass-card animate-slide-up"
          style={{ padding: '14px 10px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '1.35rem', lineHeight: 1 }}>{s.icon}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
            {s.label}
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function FeedbackBanner({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div
      className="animate-slide-down"
      style={{
        margin: '0 16px',
        padding: '14px 16px',
        borderRadius: 16,
        background: type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
        border: `1px solid ${type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: '0.88rem',
        lineHeight: 1.55,
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{type === 'success' ? '✅' : '⚠️'}</span>
      <span style={{ color: type === 'success' ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
        {message}
      </span>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function CheckinPage() {
  const [profile,     setProfile]     = useState<Profile | null>(null)
  const [btnState,    setBtnState]    = useState<ButtonState>('idle')
  const [initError,   setInitError]   = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        await initLiff()
        const p = await getLiffProfile()
        setProfile(p)
      } catch {
        setInitError('LIFF ไม่พร้อม — กรุณาเปิดผ่าน LINE')
      }
    })()
  }, [])

  const handleCheckIn = useCallback(async () => {
    if (!profile || btnState === 'loading') return
    setBtnState('loading')
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const response = await api.post('/employee/attendance/check-in', {
        employeeId: profile.lineUserId,
        branchId: 'branch-dev-1',
        shiftId: null,
      })
      const time = response.data?.data?.check_in_time || new Date().toISOString()
      setCheckedInAt(time)
      setBtnState('success')
      const t = new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
      setSuccessMsg(`เช็คอินเรียบร้อยแล้ว 🎉  เวลา ${t} น.`)
      setTimeout(() => setBtnState('idle'), 4000)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'เกิดข้อผิดพลาดระหว่างเช็คอิน'
      setErrorMsg(msg)
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 3000)
    }
  }, [profile, btnState])

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header Strip — clock & greeting */}
      <ClockDisplay />

      {/* Profile Card */}
      <div style={{ marginBottom: 20, marginTop: 16 }}>
        {profile
          ? <ProfileCard profile={profile} />
          : <ProfileCardSkeleton errorMsg={initError} />
        }
      </div>

      {/* Big Check-in Button */}
      <div style={{ marginBottom: 20 }}>
        <CheckInButton state={btnState} disabled={!profile} onClick={handleCheckIn} />
      </div>

      {/* Stats Row */}
      <div style={{ marginBottom: 16 }}>
        <StatsRow checkedInAt={checkedInAt} />
      </div>

      {/* Feedback Banners */}
      {successMsg && <div style={{ marginBottom: 12 }}><FeedbackBanner type="success" message={successMsg} /></div>}
      {errorMsg   && <div style={{ marginBottom: 12 }}><FeedbackBanner type="error"   message={errorMsg}   /></div>}
    </div>
  )
}
