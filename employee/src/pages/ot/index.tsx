// employee/src/pages/ot/index.tsx
import { useState } from 'react'
import { MOCK_OT_RECORDS } from '../../lib/mock'
import type { OtStatus } from '../../types'

const STATUS_MAP: Record<OtStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

type Tab = 'history' | 'request'
type SubmitState = 'idle' | 'loading' | 'done'

export default function OtPage() {
  const [tab, setTab] = useState<Tab>('history')
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', note: '' })
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const records = [...MOCK_OT_RECORDS].sort((a, b) => b.date.localeCompare(a.date))
  const totalApproved = records.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.hours, 0)
  const totalAmount   = records.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.amount, 0)
  const pending       = records.filter(r => r.status === 'PENDING').length

  function handleSubmit() {
    if (!form.date || !form.startTime || !form.endTime) return
    setSubmitState('loading')
    setTimeout(() => setSubmitState('done'), 1500)
  }

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>ทำงานล่วงเวลา (OT)</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>ประวัติและขอ OT</div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, margin: '0 16px' }}>
        {[
          { label: 'ชม. OT\nอนุมัติแล้ว', value: `${totalApproved}`, unit: 'ชม.', color: '#16a34a' },
          { label: 'ยอดเงิน\nOT', value: `${totalAmount.toLocaleString()}`, unit: '฿', color: 'var(--accent-start)' },
          { label: 'รอพิจารณา', value: `${pending}`, unit: 'รายการ', color: '#d97706' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '14px 10px', textAlign: 'center', animationDelay: `${i * 60}ms` }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 16px 0', background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 4 }}>
        {(['history', 'request'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSubmitState('idle') }}
            style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? 'var(--accent-start)' : 'var(--text-secondary)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'history' ? '📋 ประวัติ' : '✏️ ขอ OT'}
          </button>
        ))}
      </div>

      {/* ── History Tab ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ margin: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {records.map((r, i) => {
            const s = STATUS_MAP[r.status]
            return (
              <div key={r.id} className="glass-card animate-slide-up" style={{ padding: '14px 16px', animationDelay: `${i * 50}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {formatThaiDate(r.date)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.start_time} – {r.end_time} · {r.hours} ชม. · ×{r.multiplier}
                    </div>
                    {r.note && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        "{r.note}"
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: '3px 10px', display: 'block', marginBottom: 6 }}>
                      {s.label}
                    </span>
                    {r.status === 'APPROVED' && (
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-start)' }}>
                        +{r.amount.toLocaleString()} ฿
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {records.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>⌚</div>
              <div style={{ fontWeight: 600 }}>ยังไม่มีประวัติ OT</div>
            </div>
          )}
        </div>
      )}

      {/* ── Request Tab ──────────────────────────────────────────────────────── */}
      {tab === 'request' && (
        <div style={{ margin: '14px 16px 0' }}>
          {submitState === 'done' ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="animate-success-pop" style={{ fontSize: '3.5rem', marginBottom: 14 }}>📨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
                รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง Line
              </div>
              <button
                onClick={() => { setSubmitState('idle'); setForm({ date: '', startTime: '', endTime: '', note: '' }); setTab('history') }}
                style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}
              >
                ดูประวัติ
              </button>
            </div>
          ) : (
            <div className="glass-card animate-slide-up" style={{ padding: '20px 18px' }}>
              {/* Date */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>วันที่ทำ OT</div>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: '100%', padding: '11px 12px', borderRadius: 12, border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Time Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'เวลาเริ่ม', key: 'startTime' as const },
                  { label: 'เวลาสิ้นสุด', key: 'endTime' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                    <input
                      type="time"
                      value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '11px 12px', borderRadius: 12, border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem', background: 'rgba(255,255,255,0.85)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>

              {/* Note */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>หมายเหตุ</div>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="ระบุงานที่ทำ..."
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: '2px solid rgba(255,107,53,0.2)', fontSize: '0.88rem',
                    background: 'rgba(255,255,255,0.85)', outline: 'none',
                    boxSizing: 'border-box', resize: 'none', lineHeight: 1.55, fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.date || !form.startTime || !form.endTime || submitState === 'loading'}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  cursor: (form.date && form.startTime && form.endTime) ? 'pointer' : 'not-allowed',
                  background: (form.date && form.startTime && form.endTime)
                    ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))'
                    : 'rgba(0,0,0,0.08)',
                  color: (form.date && form.startTime && form.endTime) ? '#fff' : 'var(--text-muted)',
                  fontSize: '1rem', fontWeight: 700,
                  boxShadow: (form.date && form.startTime && form.endTime) ? '0 4px 16px rgba(255,107,53,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {submitState === 'loading' ? 'กำลังส่ง...' : '📤 ส่งคำขอ OT'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
