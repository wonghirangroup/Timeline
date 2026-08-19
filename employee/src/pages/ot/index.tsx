// employee/src/pages/ot/index.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, FileEdit, Send, Clock, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

interface OtRecord {
  id: string; date: string; start_time: string; end_time: string; hours: number
  reason: string | null; status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const STATUS_MAP: Record<OtRecord['status'], { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function formatThaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

// คำนวณชั่วโมงจากช่วงเวลา (ข้ามเที่ยงคืนได้)
function calcHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

type Tab = 'history' | 'request'

export default function OtPage() {
  const employee = useAuthStore(s => s.employee)
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('history')
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', note: '' })
  const [submitDone, setSubmitDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: records = [], isLoading } = useQuery<OtRecord[]>({
    queryKey: ['employee', 'ot-requests', employee?.id],
    queryFn: () =>
      api.get('/employee/ot-requests', { params: { employeeId: employee?.id } })
         .then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const submitMutation = useMutation({
    mutationFn: (payload: object) =>
      api.post('/employee/ot-requests', payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'ot-requests'] })
      setSubmitDone(true)
      setForm({ date: '', startTime: '', endTime: '', note: '' })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    },
  })

  const sorted   = [...records].sort((a, b) => b.date.localeCompare(a.date))
  const hours    = calcHours(form.startTime, form.endTime)
  const canSubmit = !!form.date && !!form.startTime && !!form.endTime && hours > 0
  const totalApprovedHours = sorted.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.hours, 0)
  const pending = sorted.filter(r => r.status === 'PENDING').length

  function handleSubmit() {
    if (!canSubmit || !employee) return
    setErrorMsg(null)
    submitMutation.mutate({
      employee_id: employee.id,
      date: form.date, start_time: form.startTime, end_time: form.endTime,
      hours, reason: form.note,
    })
  }

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>ทำงานล่วงเวลา (OT)</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>ประวัติและขอ OT</div>
      </div>

      {/* Summary Cards — ไม่มี "ยอดเงิน" เพราะ backend ยังไม่มีอัตราค่า OT/ตัวคูณจริง
          (รอ Payroll & Smart Deduction ใน roadmap Phase 3) โชว์แค่ที่มีข้อมูลจริง */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, margin: '0 16px' }}>
        {[
          { label: 'ชม. OT\nอนุมัติแล้ว', value: `${totalApprovedHours}`, color: '#16a34a' },
          { label: 'รอพิจารณา', value: `${pending}`, color: '#d97706' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '14px 10px', textAlign: 'center', animationDelay: `${i * 60}ms` }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'pre-line' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 16px 0', background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 4 }}>
        {([
          { id: 'history' as Tab, label: 'ประวัติ', Icon: ClipboardList },
          { id: 'request' as Tab, label: 'ขอ OT',   Icon: FileEdit },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSubmitDone(false); setErrorMsg(null) }}
            style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? 'var(--accent-start)' : 'var(--text-secondary)',
              boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── History Tab ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div style={{ margin: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>กำลังโหลด…</div>
          )}
          {!isLoading && sorted.map((r, i) => {
            const s = STATUS_MAP[r.status]
            return (
              <div key={r.id} className="glass-card animate-slide-up" style={{ padding: '14px 16px', animationDelay: `${i * 50}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {formatThaiDate(r.date)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.start_time} – {r.end_time} · {r.hours} ชม.
                    </div>
                    {r.reason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        "{r.reason}"
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: '3px 10px', flexShrink: 0 }}>
                    {s.label}
                  </span>
                </div>
              </div>
            )
          })}

          {!isLoading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ marginBottom: 10, opacity: 0.5 }} />
              <div style={{ fontWeight: 600 }}>ยังไม่มีประวัติ OT</div>
            </div>
          )}
        </div>
      )}

      {/* ── Request Tab ──────────────────────────────────────────────────────── */}
      {tab === 'request' && (
        <div style={{ margin: '14px 16px 0' }}>
          {submitDone ? (
            <div className="glass-card animate-slide-up" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Send size={44} color="var(--accent-start)" className="animate-success-pop" style={{ marginBottom: 14 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ส่งคำขอแล้ว!</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
                รอผู้จัดการพิจารณา<br />คุณจะได้รับแจ้งผลทาง LINE
              </div>
              <button
                onClick={() => { setSubmitDone(false); setTab('history') }}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
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
              {hours > 0 && (
                <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,107,53,0.06)', fontSize: '0.82rem', color: 'var(--accent-start)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> รวม {hours} ชั่วโมง
                </div>
              )}

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

              {errorMsg && (
                <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> {errorMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitMutation.isPending}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
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
                {submitMutation.isPending
                  ? 'กำลังส่ง...'
                  : <><Send size={17} /> ส่งคำขอ OT</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
