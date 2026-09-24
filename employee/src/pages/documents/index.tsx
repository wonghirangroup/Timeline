// employee/src/pages/documents/index.tsx — ขอเอกสาร HR ผ่าน LIFF
// (สลิปเงินเดือน/หนังสือรับรองเงินเดือน/หนังสือรับรองการทำงาน) feedback 2026-09-15
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FileText, Wallet, Award, Briefcase, MoreHorizontal, Send, Paperclip, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

type DocType = 'PAYSLIP' | 'SALARY_CERT' | 'WORK_CERT' | 'OTHER'
interface DocRequest {
  id: string; type: DocType; custom_type: string | null; period: string | null; note: string | null
  status: 'PENDING' | 'COMPLETED' | 'REJECTED'; file_url: string | null; reject_note: string | null
  created_at: string
}

const TYPES: { value: DocType; label: string; icon: React.ReactNode; needsPeriod?: boolean }[] = [
  { value: 'PAYSLIP',     label: 'สลิปเงินเดือน',        icon: <Wallet size={18} />,    needsPeriod: true },
  { value: 'SALARY_CERT', label: 'หนังสือรับรองเงินเดือน', icon: <Award size={18} /> },
  { value: 'WORK_CERT',   label: 'หนังสือรับรองการทำงาน', icon: <Briefcase size={18} /> },
  { value: 'OTHER',       label: 'อื่นๆ',                icon: <MoreHorizontal size={18} /> },
]
const TYPE_LABEL: Record<DocType, string> = { PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', WORK_CERT: 'หนังสือรับรองการทำงาน', OTHER: 'อื่นๆ' }
const STATUS_CFG = {
  PENDING:   { label: 'รอดำเนินการ', color: '#D97706', bg: 'rgba(217,119,6,0.1)', Icon: Clock },
  COMPLETED: { label: 'เสร็จแล้ว',   color: '#16A34A', bg: 'rgba(22,163,74,0.1)', Icon: CheckCircle2 },
  REJECTED:  { label: 'ไม่สำเร็จ',   color: '#DC2626', bg: 'rgba(220,38,38,0.1)', Icon: XCircle },
} as const
const thDate = (s: string) => new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }

export default function DocumentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const employee = useAuthStore(s => s.employee)
  const [type, setType] = useState<DocType>('PAYSLIP')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [customType, setCustomType] = useState('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: requests = [], isLoading } = useQuery<DocRequest[]>({
    queryKey: ['employee', 'document-requests', employee?.id],
    queryFn: () => api.get('/employee/document-requests', { params: { employee_id: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.post('/employee/document-requests', {
      employee_id: employee?.id, type,
      custom_type: type === 'OTHER' ? (customType.trim() || undefined) : undefined,
      period: type === 'PAYSLIP' ? period : undefined,
      note: note.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'document-requests'] })
      setNote(''); setCustomType(''); setShowForm(false)
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error?.message ?? 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่'),
  })

  const canSubmit = type !== 'OTHER' || customType.trim().length > 0

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${COLOR.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLOR.textPrimary, display: 'flex' }}><ChevronLeft size={22} /></button>
        <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: COLOR.textPrimary }}>ขอเอกสาร HR</h1>
      </div>

      <div style={{ padding: '16px 16px 20px' }}>
        {/* ปุ่มเปิดฟอร์ม / ฟอร์มขอเอกสารใหม่ */}
        {!showForm ? (
          <button onClick={() => { setShowForm(true); setErrorMsg(null) }}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1.5px dashed ${COLOR.primary}`, background: '#FEF8F6', color: COLOR.primary, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FileText size={17} /> ขอเอกสารใหม่
          </button>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E6ECF4', borderRadius: 16, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: COLOR.textPrimary, marginBottom: 10 }}>เลือกประเภทเอกสาร</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
              {TYPES.map(t => {
                const isSelected = type === t.value
                return (
                  <button key={t.value} onClick={() => setType(t.value)}
                    style={{ padding: '12px 8px', borderRadius: 12, border: `2px solid ${isSelected ? COLOR.primary : 'transparent'}`, cursor: 'pointer', background: isSelected ? '#FEF8F6' : 'rgba(0,0,0,0.04)', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                    <span style={{ color: isSelected ? COLOR.primary : COLOR.textSecondary }}>{t.icon}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isSelected ? COLOR.primary : COLOR.textSecondary, textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
                  </button>
                )
              })}
            </div>

            {type === 'PAYSLIP' && (
              <>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6, color: COLOR.textPrimary }}>เดือนที่ต้องการ</label>
                <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...inp, marginBottom: 14 }} />
              </>
            )}
            {type === 'OTHER' && (
              <>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6, color: COLOR.textPrimary }}>ระบุเอกสารที่ต้องการ *</label>
                <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="เช่น หนังสือรับรองประกันสังคม" style={{ ...inp, marginBottom: 14 }} />
              </>
            )}

            <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6, color: COLOR.textPrimary }}>หมายเหตุ (ไม่บังคับ)</label>
            <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 300))} rows={3} placeholder="เช่น ใช้ยื่นกู้ธนาคาร ต้องการภายในวันที่..." style={{ ...inp, resize: 'none' }} />

            {errorMsg && <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#DC2626' }}>{errorMsg}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: COLOR.textSecondary, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
              <button onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: canSubmit ? COLOR.primary : 'rgba(0,0,0,0.08)', color: canSubmit ? '#fff' : COLOR.textMuted, fontWeight: 700, fontSize: '0.9rem', cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {submitMutation.isPending ? 'กำลังส่ง...' : <><Send size={15} /> ส่งคำขอ</>}
              </button>
            </div>
          </div>
        )}

        {/* ประวัติคำขอ */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: COLOR.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ประวัติคำขอ</div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: COLOR.textMuted, fontSize: '0.82rem' }}>กำลังโหลด...</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: COLOR.textMuted, fontSize: '0.82rem' }}>ยังไม่เคยขอเอกสาร</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map(r => {
                const s = STATUS_CFG[r.status]
                return (
                  <div key={r.id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1px solid #E6ECF4', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: COLOR.textPrimary }}>
                          {r.type === 'OTHER' ? (r.custom_type || 'อื่นๆ') : TYPE_LABEL[r.type]}{r.period ? ` (${r.period})` : ''}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: COLOR.textMuted, marginTop: 2 }}>ยื่นเมื่อ {thDate(r.created_at)}</div>
                        {r.note && <div style={{ fontSize: '0.75rem', color: COLOR.textSecondary, marginTop: 4 }}>{r.note}</div>}
                        {r.reject_note && <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: 4 }}>เหตุผล: {r.reject_note}</div>}
                        {r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: COLOR.primary, marginTop: 6, fontWeight: 700, textDecoration: 'none' }}>
                            <Paperclip size={12} /> เปิดดูไฟล์
                          </a>
                        )}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: s.color, background: s.bg, padding: '3px 9px', borderRadius: 99, flexShrink: 0 }}>
                        <s.Icon size={11} /> {s.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
