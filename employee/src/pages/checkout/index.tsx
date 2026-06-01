// employee/src/pages/checkout/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, liffLogin } from '../../lib/axios'
import { initLiff } from '../../lib/liff'

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
  const navigate = useNavigate()
  const [employee,   setEmployee]   = useState<EmployeeInfo | null>(null)
  const [records,    setRecords]    = useState<TodayRecord[]>([])
  const [booting,    setBooting]    = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [initError,  setInitError]  = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [doneResult, setDoneResult] = useState<{ record: TodayRecord; workMinutes: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      try { await initLiff() } catch (e: any) { setInitError(`LIFF init ล้มเหลว: ${e?.message}`); setBooting(false); return }
      try { await liffLogin() } catch (e: any) {
        const code = e?.response?.data?.error?.code ?? e?.message
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(e?.response?.data?.error?.message ?? e?.message)
        setBooting(false); return
      }
      try {
        const meRes = await api.get('/employee/me')
        const emp = meRes.data.data.employee
        setEmployee(emp)
        const todayRes = await api.get('/employee/attendance/today', { params: { employeeId: emp.id } })
        setRecords(todayRes.data.data ?? [])
      } catch (e: any) {
        if (e?.response?.data?.error?.code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(e?.response?.data?.error?.message ?? e?.message)
      } finally { setBooting(false) }
    })()
  }, [])

  const unchecked = records.filter(r => r.check_in_at && !r.check_out_at)
  const alreadyAll = records.length > 0 && unchecked.length === 0

  const handleCheckout = useCallback(async () => {
    if (!employee) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await api.post('/employee/attendance/check-out-auto', { employee_id: employee.id })
      const { record, workMinutes } = res.data.data
      setDoneResult({ record, workMinutes })
      const todayRes = await api.get('/employee/attendance/today', { params: { employeeId: employee.id } })
      setRecords(todayRes.data.data ?? [])
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      const msg  = err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด'
      if (code === 'TOO_EARLY') setErrorMsg(msg)
      else if (code === 'NOT_CHECKED_IN') setErrorMsg('ยังไม่ได้เช็คอินวันนี้')
      else setErrorMsg(msg)
    } finally { setLoading(false) }
  }, [employee])

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  // ── เช็คเอาต์สำเร็จ ────────────────────────────────────────────────────────
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

        <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '24px 20px' }}>
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

        {employee && (
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
        )}
      </div>
    )
  }

  // ── เช็คเอาต์แล้วทั้งหมดแล้ว ──────────────────────────────────────────────
  if (alreadyAll) {
    const last = records[records.length - 1]
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
        <div className="header-strip animate-fade-in" style={{ padding: '40px 20px 32px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 20px' }} />
          <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 16 }}>🏁</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาต์แล้ววันนี้</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>คุณได้เช็คเอาต์ทุกกะแล้ว</div>
        </div>
        <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '24px 20px' }}>
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

  // ── หน้าหลัก ──────────────────────────────────────────────────────────────
  const canCheckout = unchecked.length > 0
  const nextRecord  = unchecked[unchecked.length - 1]

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '32px 20px 24px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>เช็คเอาต์</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>บันทึกเวลาเลิกงาน</div>
      </div>

      {initError && (
        <div style={{ margin: '0 16px 12px', padding: '14px', borderRadius: 12, background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '0.85rem' }}>⚠️ {initError}</div>
      )}

      {employee && (
        <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '20px 18px' }}>
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

          {!canCheckout && records.length === 0 && (
            <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>ยังไม่มีบันทึกเช็คอินวันนี้</div>
          )}
        </div>
      )}

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
