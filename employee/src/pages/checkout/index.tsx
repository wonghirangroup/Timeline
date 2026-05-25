// employee/src/pages/checkout/index.tsx
import { useState } from 'react'
import { MOCK_EMPLOYEE, MOCK_ATTENDANCE } from '../../lib/mock'

const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const todayRecord = MOCK_ATTENDANCE.find(r => r.date === todayStr) ?? MOCK_ATTENDANCE[MOCK_ATTENDANCE.length - 1]

function formatTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type State = 'idle' | 'loading' | 'done' | 'already'

export default function CheckoutPage() {
  const emp = MOCK_EMPLOYEE
  const [state, setState] = useState<State>(todayRecord?.check_out_time ? 'already' : 'idle')
  const [checkoutTime, setCheckoutTime] = useState<string | null>(todayRecord?.check_out_time ?? null)

  function handleCheckout() {
    setState('loading')
    setTimeout(() => {
      const now = new Date().toISOString()
      setCheckoutTime(now)
      setState('done')
    }, 1400)
  }

  // ── Success / Already ───────────────────────────────────────────────────────
  if (state === 'done' || state === 'already') {
    const isJustDone = state === 'done'
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
        <div className="header-strip animate-fade-in" style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 20px' }} />

          <div className="animate-success-pop" style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 16 }}>
            {isJustDone ? '✅' : '🏁'}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isJustDone ? 'เช็คเอาท์สำเร็จ!' : 'เช็คเอาท์แล้ววันนี้'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
            {isJustDone ? 'บันทึกเวลาเรียบร้อยแล้ว' : 'คุณได้เช็คเอาท์ไปแล้วสำหรับวันนี้'}
          </div>
        </div>

        {/* Time Card */}
        <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>เช็คอิน</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1 }}>
                {formatTime(todayRecord?.check_in_time ?? null)}
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)', opacity: 0.4 }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>เช็คเอาท์</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', letterSpacing: 1 }}>
                {formatTime(checkoutTime)}
              </div>
            </div>
          </div>

          {/* Duration */}
          {todayRecord?.check_in_time && checkoutTime && (() => {
            const inMs  = new Date(todayRecord.check_in_time!).getTime()
            const outMs = new Date(checkoutTime).getTime()
            const diffMin = Math.round((outMs - inMs) / 60000)
            const h = Math.floor(diffMin / 60)
            const m = diffMin % 60
            return (
              <div style={{ textAlign: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ระยะเวลาทำงาน </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-start)' }}>{h} ชม. {m} นาที</span>
              </div>
            )
          })()}
        </div>

        {/* Employee Info */}
        <div className="glass-card animate-slide-up" style={{ margin: '12px 16px 0', padding: '14px 18px', animationDelay: '60ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {emp.full_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{emp.full_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {emp.shift.name} · {emp.branch_name}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Idle / Loading ──────────────────────────────────────────────────────────
  const isLoading = state === 'loading'
  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '32px 20px 24px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาท์</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>บันทึกเวลาเลิกงานของคุณ</div>
      </div>

      {/* Employee Card */}
      <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {emp.full_name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{emp.full_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {emp.position} · {emp.branch_name}
            </div>
          </div>
        </div>

        {/* Today check-in */}
        <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>เช็คอินวันนี้</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1 }}>
            {formatTime(todayRecord?.check_in_time ?? null)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {emp.shift.name}  {emp.shift.start_time}–{emp.shift.end_time} น.
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <div style={{ margin: '24px 16px 0', textAlign: 'center' }}>
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          style={{
            width: '100%', padding: '20px',
            borderRadius: 20, border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            background: isLoading
              ? 'rgba(0,0,0,0.08)'
              : 'linear-gradient(135deg, #475569, #1e293b)',
            color: isLoading ? 'var(--text-muted)' : '#fff',
            fontSize: '1.1rem', fontWeight: 700,
            boxShadow: isLoading ? 'none' : '0 4px 20px rgba(30,41,59,0.3)',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {isLoading ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1.2rem' }}>⟳</span>
              กำลังบันทึก...
            </>
          ) : (
            <>🚪 เช็คเอาท์ตอนนี้</>
          )}
        </button>

        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          เวลาปัจจุบัน {pad(today.getHours())}:{pad(today.getMinutes())} น.
        </div>
      </div>
    </div>
  )
}
