// employee/src/pages/feedback/index.tsx
import { useState } from 'react'

const CATEGORIES = [
  { code: 'WELFARE',    label: 'สวัสดิการ',    icon: '🎁' },
  { code: 'WORK_ENV',   label: 'สภาพแวดล้อม', icon: '🏢' },
  { code: 'MANAGEMENT', label: 'การบริหาร',   icon: '📊' },
  { code: 'SALARY',     label: 'เงินเดือน',   icon: '💰' },
  { code: 'OTHER',      label: 'อื่น ๆ',       icon: '💬' },
]

type SubmitState = 'idle' | 'loading' | 'done'

export default function FeedbackPage() {
  const [category, setCategory] = useState('')
  const [text, setText] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const canSubmit = category && text.trim().length >= 10

  function handleSubmit() {
    if (!canSubmit) return
    setSubmitState('loading')
    setTimeout(() => setSubmitState('done'), 1500)
  }

  if (submitState === 'done') {
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
        <div style={{
          minHeight: '80dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
        }}>
          <div className="animate-success-pop" style={{ fontSize: '5rem', lineHeight: 1, marginBottom: 20 }}>🙏</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            ขอบคุณสำหรับความคิดเห็น!
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center', lineHeight: 1.7 }}>
            ความคิดเห็นของคุณจะถูกส่งแบบ<br />
            <strong>ไม่ระบุตัวตน</strong> ไปยังผู้บริหาร
          </div>
          <button
            onClick={() => { setSubmitState('idle'); setCategory(''); setText('') }}
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
          <span style={{ fontSize: '0.75rem' }}>🔒</span>
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
                  <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
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
        <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            ℹ️ ความคิดเห็นนี้จะถูกส่งไปยังผู้บริหารโดยตรง โดยไม่มีข้อมูลใดที่สามารถระบุตัวตนของผู้ส่งได้
          </div>
        </div>

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
          }}
        >
          {submitState === 'loading' ? 'กำลังส่ง...' : '💬 ส่งความคิดเห็น'}
        </button>
      </div>
    </div>
  )
}
