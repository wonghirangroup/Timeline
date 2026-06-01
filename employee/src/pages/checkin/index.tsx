// employee/src/pages/checkin/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { api, liffLogin } from '../../lib/axios'
import { initLiff }        from '../../lib/liff'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

interface EmployeeInfo {
  id: string; first_name: string; last_name: string
  employee_code: string; branch: { id: string; name: string }
}
interface ShiftInfo {
  id: string; name: string; start_time: string; end_time: string
  late_threshold_1: string | null; late_threshold_2: string | null
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { text: 'สวัสดีตอนเช้า', emoji: '🌅' }
  if (h >= 12 && h < 18) return { text: 'สวัสดีตอนบ่าย', emoji: '☀️' }
  return { text: 'สวัสดีตอนเย็น', emoji: '🌙' }
}
function formatThaiDate(d: Date): string {
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function ClockDisplay() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const { text, emoji } = getGreeting()
  return (
    <div className="header-strip animate-fade-in" style={{ textAlign: 'center', padding: '32px 20px 20px' }}>
      <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))', margin: '0 auto 14px' }} />
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{text} {emoji}</div>
      <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>{formatThaiDate(now)}</div>
      <div style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {formatTime(now)}
      </div>
    </div>
  )
}

function CheckInButton({ state, disabled, onClick }: { state: ButtonState; disabled: boolean; onClick: () => void }) {
  const getInner = () => {
    if (state === 'loading') return <span className="animate-spin" style={{ fontSize: '2rem', display: 'block' }}>⏳</span>
    if (state === 'success') return <span className="animate-success-pop" style={{ fontSize: '2.4rem', display: 'block' }}>✅</span>
    if (state === 'error')   return <span style={{ fontSize: '2.4rem', display: 'block' }}>❌</span>
    return <span style={{ fontSize: '2.6rem', display: 'block' }}>⏰</span>
  }
  const getLabel = () => ({ loading: 'กำลังบันทึก…', success: 'บันทึกแล้ว!', error: 'ลองอีกครั้ง', idle: 'แตะเพื่อเช็คอิน' }[state])
  const isReady = state === 'idle' && !disabled

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0 8px' }}>
      <div style={{ position: 'relative', width: 164, height: 164, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isReady && (
          <>
            <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
            <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
          </>
        )}
        <button type="button" disabled={disabled || state === 'loading'} onClick={onClick}
          style={{ width: 156, height: 156, borderRadius: '50%', border: 'none', cursor: disabled || state === 'loading' ? 'not-allowed' : 'pointer', background: disabled ? 'rgba(0,0,0,0.08)' : 'linear-gradient(145deg, var(--accent-start), var(--accent-mid), var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isReady ? '0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)' : '0 4px 16px rgba(0,0,0,0.1)', transition: 'transform 0.15s', position: 'relative', zIndex: 1 }}
          onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          onTouchStart={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onTouchEnd={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
          {getInner()}
        </button>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: disabled ? 'var(--text-muted)' : 'var(--accent-start)', letterSpacing: '0.2px' }}>
        {getLabel()}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  const [employee,    setEmployee]    = useState<EmployeeInfo | null>(null)
  const [shifts,      setShifts]      = useState<ShiftInfo[]>([])
  const [selectedShift, setSelected] = useState<ShiftInfo | null>(null)
  const [btnState,    setBtnState]    = useState<ButtonState>('idle')
  const [initError,   setInitError]   = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)
  const [booting,     setBooting]     = useState(true)
  const [lineUid,     setLineUid]     = useState<string | null>(null)
  const [uidCopied,   setUidCopied]   = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        await initLiff()
        const result = await liffLogin()
        if (!result) { setInitError('ไม่สามารถยืนยันตัวตนได้ กรุณาเปิดผ่าน LINE'); setBooting(false); return }

        const meRes = await api.get('/employee/me')
        const { employee: emp, shifts: sh } = meRes.data.data
        setEmployee(emp)
        setShifts(sh)
        if (sh.length === 1) setSelected(sh[0])
      } catch (e: any) {
        const code = e?.response?.data?.error?.code
        if (code === 'EMPLOYEE_NOT_FOUND') {
          // ดึง Line UID มาแสดงให้ admin copy
          try {
            const { lineUserId } = await import('../../lib/liff').then(m => m.getLiffProfile())
            setLineUid(lineUserId)
          } catch {}
          setInitError('NOT_FOUND')
        } else {
          setInitError('LIFF ไม่พร้อม — กรุณาเปิดผ่าน LINE')
        }
      } finally { setBooting(false) }
    })()
  }, [])

  function copyUid() {
    if (!lineUid) return
    navigator.clipboard.writeText(lineUid).then(() => { setUidCopied(true); setTimeout(() => setUidCopied(false), 2000) })
  }

  const handleCheckIn = useCallback(async () => {
    if (!employee || !selectedShift || btnState === 'loading') return
    setBtnState('loading')
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await api.post('/employee/attendance/check-in', {
        employee_id: employee.id,
        shift_id:    selectedShift.id,
      })
      const time = res.data?.data?.check_in_at ?? new Date().toISOString()
      setCheckedInAt(time)
      setBtnState('success')
      const t = new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
      setSuccessMsg(`เช็คอินเรียบร้อย 🎉  เวลา ${t} น.`)
      setTimeout(() => setBtnState('idle'), 4000)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'ALREADY_CHECKED_IN') {
        setErrorMsg('เช็คอินในกะนี้แล้ว')
        setBtnState('success')
      } else {
        setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
        setBtnState('error')
      }
      setTimeout(() => setBtnState('idle'), 3000)
    }
  }, [employee, selectedShift, btnState])

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <ClockDisplay />

      {/* Employee card */}
      <div style={{ margin: '16px 16px 0' }}>
        {employee ? (
          <div className="glass-card animate-slide-up" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {employee.first_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{employee.first_name} {employee.last_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{employee.employee_code} · {employee.branch.name}</div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="animate-dot-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />พร้อม
              </span>
            </div>
          </div>
        ) : initError === 'NOT_FOUND' ? (
          <div className="glass-card" style={{ padding: 18, background: '#fff9f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#c2410c', marginBottom: 8 }}>⚠️ ยังไม่ได้ลงทะเบียน</div>
            <div style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: 14, lineHeight: 1.6 }}>
              กรุณาแจ้ง Line UID ของคุณให้ HR เพื่อผูกบัญชี
            </div>
            {lineUid && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 4 }}>Line UID ของคุณ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ flex: 1, background: '#f3f4f6', padding: '8px 10px', borderRadius: 8, fontSize: '0.78rem', wordBreak: 'break-all', color: '#374151' }}>{lineUid}</code>
                  <button onClick={copyUid} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #fed7aa', background: uidCopied ? '#dcfce7' : '#fff7ed', color: uidCopied ? '#16a34a' : '#ea580c', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    {uidCopied ? '✓ คัดลอก' : 'คัดลอก'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.88rem' }}>⚠️ {initError ?? 'ไม่พบข้อมูลพนักงาน'}</div>
          </div>
        )}
      </div>

      {/* Shift selector — แสดงถ้ามีหลายกะ */}
      {shifts.length > 1 && (
        <div style={{ margin: '12px 16px 0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>เลือกกะ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shifts.map(s => (
              <button key={s.id} onClick={() => setSelected(s)}
                style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${selectedShift?.id === s.id ? 'var(--accent-start)' : 'rgba(0,0,0,0.08)'}`, background: selectedShift?.id === s.id ? 'rgba(255,107,53,0.08)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.start_time} – {s.end_time}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* กะเดียว — แสดง info */}
      {shifts.length === 1 && selectedShift && (
        <div style={{ margin: '12px 16px 0' }}>
          <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedShift.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedShift.start_time} – {selectedShift.end_time}</div>
          </div>
        </div>
      )}

      {/* Check-in button */}
      <div style={{ marginTop: 16, marginBottom: 12 }}>
        <CheckInButton state={btnState} disabled={!employee || !selectedShift} onClick={handleCheckIn} />
      </div>

      {/* Stats */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 16px', marginBottom: 16 }}>
        {[
          { icon: '🕐', label: 'เช็คอินล่าสุด', value: checkedInAt ? new Date(checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—' },
          { icon: '📋', label: 'กะวันนี้', value: selectedShift?.name ?? '—' },
          { icon: '✅', label: 'สถานะ', value: checkedInAt ? 'บันทึกแล้ว' : '—' },
        ].map(s => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.35rem' }}>{s.icon}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {successMsg && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16, background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>✅</span><span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.88rem' }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16, background: 'var(--error-bg)', border: '1px solid var(--error-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>⚠️</span><span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.88rem' }}>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
