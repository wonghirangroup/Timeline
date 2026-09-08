// employee/src/pages/notices/index.tsx — หนังสือเตือนจาก HR (ดู + กดรับทราบ)
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

const CAT_LABEL: Record<string, string> = { LATE: 'มาสาย', ABSENCE: 'ขาดงาน', MISCONDUCT: 'ประพฤติผิด', PERFORMANCE: 'ผลงาน', SAFETY: 'ความปลอดภัย', OTHER: 'อื่นๆ' }
const LEVEL_LABEL: Record<number, string> = { 1: 'เตือนด้วยวาจา', 2: 'เตือนเป็นลายลักษณ์อักษร', 3: 'เตือนครั้งสุดท้าย' }
const thDate = (s: string) => new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

export default function NoticesPage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    if (!employee) return
    api.get('/api/v1/employee/disciplinary', { params: { employee_id: employee.id } })
      .then(r => setRows(r.data.data)).catch(() => setRows([]))
  }
  useEffect(load, [employee])

  async function ack(id: string) {
    if (!employee) return
    setBusy(id)
    try {
      await api.post(`/api/v1/employee/disciplinary/${id}/acknowledge`, { employee_id: employee.id })
      load()
    } finally { setBusy(null) }
  }

  if (!employee || rows === null) return <PageLoader title="กำลังโหลด…" />

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${COLOR.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textPrimary, display: 'flex' }}><ChevronLeft size={22} /></button>
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLOR.textPrimary }}>หนังสือเตือน</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: COLOR.textMuted }}>
            <CheckCircle2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>ไม่มีหนังสือเตือน</div>
          </div>
        ) : rows.map(r => (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.acknowledged_at ? '#e5e7eb' : '#fca5a5'}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: r.level >= 3 ? '#fee2e2' : r.level === 2 ? '#fef3c7' : '#f1f5f9', color: r.level >= 3 ? '#dc2626' : r.level === 2 ? '#d97706' : '#64748b', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.level}</span>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: COLOR.textPrimary }}>{CAT_LABEL[r.category] ?? r.category}</span>
              <span style={{ fontSize: '0.72rem', color: COLOR.textMuted }}>· {LEVEL_LABEL[r.level]}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.55 }}>{r.detail}</div>
            <div style={{ fontSize: '0.72rem', color: COLOR.textMuted, marginTop: 8 }}>เหตุเกิดวันที่ {thDate(r.incident_date)}</div>
            {r.acknowledged_at ? (
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={14} /> รับทราบแล้วเมื่อ {thDate(r.acknowledged_at)}
              </div>
            ) : (
              <button onClick={() => ack(r.id)} disabled={busy === r.id}
                style={{ marginTop: 12, width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: COLOR.primary, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {busy === r.id ? 'กำลังบันทึก…' : 'รับทราบหนังสือเตือนนี้'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
