// employee/src/pages/feedback/index.tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Gift, Building2, BarChart3, Wallet, MessageCircle, Lock, Info, Send, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/axios'

const CATEGORIES = [
  { code: 'WELFARE',    label: 'สวัสดิการ',    Icon: Gift },
  { code: 'WORK_ENV',   label: 'สภาพแวดล้อม', Icon: Building2 },
  { code: 'MANAGEMENT', label: 'การบริหาร',   Icon: BarChart3 },
  { code: 'SALARY',     label: 'เงินเดือน',   Icon: Wallet },
  { code: 'OTHER',      label: 'อื่น ๆ',       Icon: MessageCircle },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState('')
  const [text, setText] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // หมายเหตุ: ไม่ส่ง employee_id หรืออะไรที่ trace กลับไปหาผู้ส่งได้เลย —
  // ตรงกับที่ backend /employee/feedback ไม่รับ/ไม่เก็บ field นี้เช่นกัน
  const submitMutation = useMutation({
    mutationFn: () => api.post('/employee/feedback', { category, content: text }).then(r => r.data),
    onError: () => setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่'),
  })

  const canSubmit = category && text.trim().length >= 10

  function handleSubmit() {
    if (!canSubmit) return
    setErrorMsg(null)
    submitMutation.mutate()
  }

  const submitState = submitMutation.isSuccess ? 'done' : submitMutation.isPending ? 'loading' : 'idle'

  if (submitState === 'done') {
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
        <div style={{
          minHeight: '80dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
        }}>
          <MessageCircle size={70} color="var(--accent-start)" strokeWidth={1.5} className="animate-success-pop" style={{ marginBottom: 20 }} />
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            ขอบคุณสำหรับความคิดเห็น!
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center', lineHeight: 1.7 }}>
            ความคิดเห็นของคุณจะถูกส่งแบบ<br />
            <strong>ไม่ระบุตัวตน</strong> ไปยังผู้บริหาร
          </div>
          <button
            onClick={() => { submitMutation.reset(); setCategory(''); setText('') }}
            style={{
              marginTop: 28, padding: '14px 36px', borderRadius: 16, border: 'none',
              cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(255,107,53,0.3)',
            }}
          >
            ส่งอีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งความคิดเห็น</div>

        {/* Anonymous Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(22,163,74,0.08)', borderRadius: 99, padding: '5px 14px', border: '1px solid rgba(22,163,74,0.15)' }}>
          <Lock size={12} color="#16a34a" />
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>ไม่ระบุตัวตน — ไม่มีใครรู้ว่าเป็นคุณ</span>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Category */}
        <div className="glass-card animate-slide-up" style={{ padding: '18px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>เลือกหัวข้อ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => {
              const isSelected = category === cat.code
              return (
                <button
                  key={cat.code}
                  onClick={() => setCategory(cat.code)}
                  style={{
                    padding: '12px 8px', borderRadius: 14, border: `2px solid ${isSelected ? 'var(--accent-start)' : 'transparent'}`,
                    cursor: 'pointer', background: isSelected ? 'rgba(255,107,53,0.08)' : 'rgba(0,0,0,0.04)',
                    transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <cat.Icon size={22} color={isSelected ? 'var(--accent-start)' : 'var(--text-secondary)'} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isSelected ? 'var(--accent-start)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Text */}
        <div className="glass-card animate-slide-up" style={{ padding: '18px 16px', marginBottom: 14, animationDelay: '60ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>ความคิดเห็น</div>
            <div style={{ fontSize: '0.72rem', color: text.length < 10 ? 'var(--text-muted)' : '#16a34a' }}>
              {text.length} / 500
            </div>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 500))}
            placeholder="แชร์ความคิดเห็น ข้อเสนอแนะ หรือปัญหาที่พบเจอ..."
            rows={6}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: `2px solid ${text.length >= 10 ? 'rgba(22,163,74,0.3)' : 'rgba(255,107,53,0.2)'}`,
              fontSize: '0.9rem', background: 'rgba(255,255,255,0.85)', outline: 'none',
              boxSizing: 'border-box', resize: 'none', lineHeight: 1.6, fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
          />
          {text.length > 0 && text.length < 10 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              กรุณาพิมพ์อย่างน้อย 10 ตัวอักษร
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
          <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            ความคิดเห็นนี้จะถูกส่งไปยังผู้บริหารโดยตรง โดยไม่มีข้อมูลใดที่สามารถระบุตัวตนของผู้ส่งได้
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitState === 'loading'}
          style={{
            width: '100%', padding: '18px', borderRadius: 16, border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit
              ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))'
              : 'rgba(0,0,0,0.08)',
            color: canSubmit ? '#fff' : 'var(--text-muted)',
            fontSize: '1rem', fontWeight: 700,
            boxShadow: canSubmit ? '0 4px 16px rgba(255,107,53,0.3)' : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitState === 'loading' ? 'กำลังส่ง...' : <><Send size={17} /> ส่งความคิดเห็น</>}
        </button>
      </div>
    </div>
  )
}
