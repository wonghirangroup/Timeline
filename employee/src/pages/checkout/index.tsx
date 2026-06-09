// employee/src/pages/checkout/index.tsx  [MOCK MODE]
import { useState, useCallback } from 'react'

interface EmployeeInfo {
  id: string; first_name: string; last_name: string
  employee_code: string; branch: { id: string; name: string }
}
interface TodayRecord {
  id: string
  check_in_at:  string | null
  check_out_at: string | null
  shift: { id: string; name: string; start_time: string; end_time: string; min_checkout: string | null }
}

const MOCK_EMPLOYEE: EmployeeInfo = {
  id: 'emp-001', first_name: 'สมชาย', last_name: 'ใจดี',
  employee_code: 'EMP001', branch: { id: 'b-001', name: 'สาขาสุขุมวิท' },
}
const MOCK_RECORDS_INIT: TodayRecord[] = [
  {
    id: 'att-001',
    check_in_at:  new Date(new Date().setHours(8, 5, 0, 0)).toISOString(),
    check_out_at: null,
    shift: { id: 'sh-001', name: 'กะเช้า', start_time: '08:00', end_time: '17:00', min_checkout: '12:00' },
  },
]

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtDuration(checkIn: string, checkOut: string) {
  const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000)
  return `${Math.floor(diff / 60)} ชม. ${diff % 60} นาที`
}

export default function CheckoutPage() {
  const [records,    setRecords]    = useState<TodayRecord[]>(MOCK_RECORDS_INIT)
  const [loading,    setLoading]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [doneResult, setDoneResult] = useState<{ record: TodayRecord; workMinutes: number } | null>(null)
  const employee = MOCK_EMPLOYEE

  const unchecked  = records.filter(r => r.check_in_at && !r.check_out_at)
  const alreadyAll = records.length > 0 && unchecked.length === 0

  const handleCheckout = useCallback(async () => {
    const target = unchecked[unchecked.length - 1]
    if (!target) return

    const now  = new Date()
    const minCO = target.shift.min_checkout
    if (minCO) {
      const [hh, mm] = minCO.split(':').map(Number)
      const earliest = new Date(); earliest.setHours(hh, mm, 0, 0)
      if (now < earliest) {
        setErrorMsg(`ยังเช็คเอาต์ไม่ได้ — รอถึง ${minCO} น.`)
        return
      }
    }

    setLoading(true)
    setErrorMsg(null)
    await new Promise(r => setTimeout(r, 700))

    const checkOutAt = now.toISOString()
    const workMinutes = Math.round((now.getTime() - new Date(target.check_in_at!).getTime()) / 60000)
    const updated: TodayRecord = { ...target, check_out_at: checkOutAt }
    setRecords(prev => prev.map(r => r.id === target.id ? updated : r))
    setDoneResult({ record: updated, workMinutes })
    setLoading(false)
  }, [unchecked])

  // ── เช็คเอาต์สำเร็จ ─────────────────────────────────────────────────────────
  if (doneResult) {
    const r = doneResult.record
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
        <div className="header-strip animate-fade-in" style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 20px' }} />
          <div className="animate-success-pop" style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาต์สำเร็จ!</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>บันทึกเวลาเรียบร้อยแล้ว</div>
        </div>

        <div style={{ margin: '0 16px 8px', padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center' }}>
          🧪 MOCK MODE
        </div>

        <div className="glass-card animate-slide-up" style={{ margin: '8px 16px 0', padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>เช็คอิน</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1 }}>{fmtTime(r.check_in_at)}</div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)', opacity: 0.4 }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>เช็คเอาต์</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', letterSpacing: 1 }}>{fmtTime(r.check_out_at)}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ระยะเวลาทำงาน </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-start)' }}>
              {Math.floor(doneResult.workMinutes / 60)} ชม. {doneResult.workMinutes % 60} นาที
            </span>
          </div>
        </div>

        <div className="glass-card animate-slide-up" style={{ margin: '12px 16px 0', padding: '14px 18px', animationDelay: '60ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {employee.first_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{employee.first_name} {employee.last_name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{r.shift.name} · {employee.branch.name}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── เช็คเอาต์แล้วทั้งหมด ────────────────────────────────────────────────────
  if (alreadyAll) {
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
        <div className="header-strip animate-fade-in" style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 20px' }} />
          <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 16 }}>🏁</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาต์แล้ววันนี้</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>คุณได้เช็คเอาต์ทุกกะแล้ว</div>
        </div>
        <div style={{ margin: '0 16px 8px', padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center' }}>
          🧪 MOCK MODE
        </div>
        <div className="glass-card animate-slide-up" style={{ margin: '8px 16px 0', padding: '24px 20px' }}>
          {records.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.shift.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)}</div>
              </div>
              {r.check_in_at && r.check_out_at && (
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-start)', fontWeight: 600 }}>
                  {fmtDuration(r.check_in_at, r.check_out_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── หน้าหลัก ─────────────────────────────────────────────────────────────────
  const canCheckout = unchecked.length > 0
  const nextRecord  = unchecked[unchecked.length - 1]

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '32px 20px 24px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาต์</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>บันทึกเวลาเลิกงาน</div>
      </div>

      <div style={{ margin: '0 16px 12px', padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center' }}>
        🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
      </div>

      <div className="glass-card animate-slide-up" style={{ margin: '4px 16px 0', padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {employee.first_name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{employee.first_name} {employee.last_name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{employee.employee_code} · {employee.branch.name}</div>
          </div>
        </div>

        {nextRecord && (
          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>เช็คอินวันนี้ — {nextRecord.shift.name}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 1 }}>{fmtTime(nextRecord.check_in_at)}</div>
            {nextRecord.shift.min_checkout && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>เช็คเอาต์ได้ตั้งแต่ {nextRecord.shift.min_checkout} น.</div>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div style={{ margin: '12px 16px 0', padding: '12px 14px', borderRadius: 12, background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{ margin: '24px 16px 0', textAlign: 'center' }}>
        <button onClick={handleCheckout} disabled={!canCheckout || loading}
          style={{ width: '100%', padding: '20px', borderRadius: 20, border: 'none', cursor: canCheckout && !loading ? 'pointer' : 'not-allowed', background: canCheckout && !loading ? 'linear-gradient(135deg, #475569, #1e293b)' : 'rgba(0,0,0,0.08)', color: canCheckout && !loading ? '#fff' : 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 700, boxShadow: canCheckout ? '0 4px 20px rgba(30,41,59,0.3)' : 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {loading ? <>⏳ กำลังบันทึก...</> : <>🚪 เช็คเอาต์ตอนนี้</>}
        </button>
      </div>
    </div>
  )
}
