// employee/src/pages/resign/index.tsx — ยื่นลาออกผ่าน LIFF
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, DoorOpen, CheckCircle2, Clock } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

const thDate = (s: string) => new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }

export default function ResignPage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)
  const [existing, setExisting] = useState<any | null | undefined>(undefined)
  const [lastDay, setLastDay] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!employee) return
    api.get('/api/v1/employee/resignation', { params: { employee_id: employee.id } })
      .then(r => setExisting(r.data.data)).catch(() => setExisting(null))
  }, [employee])

  async function submit() {
    if (!employee || !lastDay) return
    setBusy(true); setErr('')
    try {
      await api.post('/api/v1/employee/resignation', { employee_id: employee.id, last_working_date: lastDay, reason: reason || null })
      const r = await api.get('/api/v1/employee/resignation', { params: { employee_id: employee.id } })
      setExisting(r.data.data)
    } catch (e: any) {
      setErr(e?.response?.data?.error?.message ?? 'ยื่นไม่สำเร็จ')
    } finally { setBusy(false) }
  }

  if (!employee || existing === undefined) return <PageLoader title="กำลังโหลด…" />

  const pending = existing && existing.status === 'PENDING'
  const decided = existing && existing.status !== 'PENDING'

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${COLOR.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textPrimary, display: 'flex' }}><ChevronLeft size={22} /></button>
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLOR.textPrimary }}>ยื่นลาออก</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {pending && (
          <div style={{ background: '#fff', border: '1px solid #fcd34d', borderRadius: 14, padding: 18, textAlign: 'center' }}>
            <Clock size={36} color="#d97706" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: COLOR.textPrimary }}>ยื่นคำขอแล้ว — รอผู้ดูแลอนุมัติ</div>
            <div style={{ fontSize: '0.82rem', color: COLOR.textMuted, marginTop: 6 }}>วันทำงานสุดท้ายที่ขอไว้: {thDate(existing.last_working_date)}</div>
          </div>
        )}
        {decided && (
          <div style={{ background: '#fff', border: `1px solid ${existing.status === 'APPROVED' ? '#86efac' : '#fca5a5'}`, borderRadius: 14, padding: 18, textAlign: 'center' }}>
            <CheckCircle2 size={36} color={existing.status === 'APPROVED' ? '#16a34a' : '#dc2626'} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: COLOR.textPrimary }}>
              {existing.status === 'APPROVED' ? 'อนุมัติการลาออกแล้ว' : 'คำขอถูกปฏิเสธ'}
            </div>
            <div style={{ fontSize: '0.82rem', color: COLOR.textMuted, marginTop: 6 }}>วันทำงานสุดท้าย: {thDate(existing.last_working_date)}</div>
            {existing.reject_note && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 8 }}>{existing.reject_note}</div>}
          </div>
        )}

        {!pending && !decided && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}><DoorOpen size={20} /></div>
              <div style={{ fontSize: '0.82rem', color: COLOR.textSecondary, lineHeight: 1.5 }}>ยื่นคำขอลาออก — ผู้ดูแลจะตรวจสอบและติดต่อกลับ</div>
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6, color: COLOR.textPrimary }}>วันทำงานสุดท้าย *</label>
            <input type="date" value={lastDay} min={new Date().toISOString().slice(0, 10)} onChange={e => setLastDay(e.target.value)} style={{ ...inp, marginBottom: 14 }} />
            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6, color: COLOR.textPrimary }}>เหตุผล (ไม่บังคับ)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} style={{ ...inp, resize: 'none' }} />
            {err && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 10 }}>{err}</div>}
            <button onClick={submit} disabled={!lastDay || busy}
              style={{ marginTop: 18, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: !lastDay ? '#fca5a5' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: !lastDay ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'กำลังยื่น…' : 'ยื่นคำขอลาออก'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
