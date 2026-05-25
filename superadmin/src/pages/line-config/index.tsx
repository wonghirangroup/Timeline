import { useState } from 'react'

interface TenantOpt {
  id: string
  abbr: string
  name: string
  plan: string
  configured: boolean
  channelId?: string
  liffId?: string
  webhook?: string
}

const tenants: TenantOpt[] = [
  { id: 't1', abbr: 'ดท', name: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', plan: 'Enterprise', configured: true, channelId: '2001234567', liffId: '2001234567-AbCdEfGh', webhook: 'https://api.timeline.co/api/v1/line/webhook/t1' },
  { id: 't2', abbr: 'ทบ', name: 'บริษัท ไทยเบเวอเรจ จำกัด', plan: 'Pro', configured: true, channelId: '2007654321', liffId: '2007654321-XyZwVuTs', webhook: 'https://api.timeline.co/api/v1/line/webhook/t2' },
  { id: 't3', abbr: 'มด', name: 'บริษัท มีดี โลจิสติกส์ จำกัด', plan: 'Pro', configured: true, channelId: '2009876543', liffId: '2009876543-MnOpQrSt', webhook: 'https://api.timeline.co/api/v1/line/webhook/t3' },
  { id: 't4', abbr: 'สจ', name: 'ห้างหุ้นส่วน สมใจ จำกัด', plan: 'Starter', configured: false },
  { id: 't5', abbr: 'ฟม', name: 'บริษัท เฟรชมาร์ท จำกัด', plan: 'Starter', configured: false },
  { id: 't7', abbr: 'ซก', name: 'บริษัท ซันไรส์ กรุ๊ป จำกัด', plan: 'Pro', configured: false },
]

const planStyle: Record<string, { bg: string; color: string }> = {
  Starter: { bg: '#f1f5f9', color: '#475569' },
  Pro: { bg: '#dbeafe', color: '#1d4ed8' },
  Enterprise: { bg: '#ede9fe', color: '#6d28d9' },
}

type TestState = 'idle' | 'loading' | 'success' | 'error'

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  border: '1px solid rgba(15,23,42,0.06)',
  overflow: 'hidden',
}

export default function LineConfigPage() {
  const [selected, setSelected] = useState<TenantOpt | null>(null)
  const [form, setForm] = useState({ channelId: '', channelSecret: '', liffId: '' })
  const [showSecret, setShowSecret] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')
  const [copied, setCopied] = useState(false)

  const pick = (t: TenantOpt) => {
    setSelected(t)
    setSaved(false)
    setTestState('idle')
    setForm({ channelId: t.channelId ?? '', channelSecret: '', liffId: t.liffId ?? '' })
  }

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  const handleTest = () => {
    setTestState('loading')
    setTimeout(() => setTestState('success'), 1500)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const unconfigured = tenants.filter(t => !t.configured)
  const configured = tenants.filter(t => t.configured)

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Line Config</h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>ตั้งค่า Line Official Account สำหรับแต่ละ tenant</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px', alignItems: 'start' }}>

        {/* ── Left: tenant list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {unconfigured.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #fef3c7', background: '#fffbeb' }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#f59e0b', flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', margin: 0 }}>ยังไม่ได้ตั้งค่า ({unconfigured.length})</p>
              </div>
              {unconfigured.map((t) => (
                <TenantRow key={t.id} t={t} selected={selected} onPick={pick} />
              ))}
            </div>
          )}

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #d1fae5', background: '#ecfdf5' }}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#10b981', flexShrink: 0 }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#065f46', margin: 0 }}>ตั้งค่าแล้ว ({configured.length})</p>
            </div>
            {configured.map((t) => (
              <TenantRow key={t.id} t={t} selected={selected} onPick={pick} />
            ))}
          </div>
        </div>

        {/* ── Right: config panel ── */}
        <div>
          {!selected ? (
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <svg width="24" height="24" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p style={{ fontWeight: 600, color: '#475569', margin: 0, fontSize: '14px' }}>เลือก Tenant</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>คลิกที่ tenant ทางซ้ายเพื่อตั้งค่า Line OA</p>
              </div>
            </div>
          ) : (
            <div style={card}>
              {/* Panel header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '12px',
                      background: planStyle[selected.plan]?.bg,
                      color: planStyle[selected.plan]?.color,
                    }}>
                      {selected.abbr}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', margin: 0 }}>{selected.name}</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>แผน {selected.plan}</p>
                    </div>
                  </div>
                  {selected.configured && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                      borderRadius: '99px', background: '#d1fae5', color: '#065f46',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      ตั้งค่าแล้ว
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Webhook (read-only) */}
                {selected.configured && selected.webhook && (
                  <div style={{ borderRadius: '10px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', margin: '0 0 6px', letterSpacing: '0.06em' }}>WEBHOOK URL</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ flex: 1, fontSize: '11px', color: '#475569', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selected.webhook}
                      </code>
                      <button
                        onClick={() => handleCopy(selected.webhook!)}
                        style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '8px',
                          border: 'none', cursor: 'pointer',
                          background: copied ? '#d1fae5' : '#e0e7ff',
                          color: copied ? '#065f46' : '#4338ca',
                        }}
                      >
                        {copied ? (
                          <>
                            <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <FormField label="Line Channel ID" hint="Basic Settings → Channel ID">
                  <input
                    type="text"
                    value={form.channelId}
                    onChange={e => setForm({ ...form, channelId: e.target.value })}
                    placeholder="เช่น 2001234567"
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '13px',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
                    }}
                  />
                </FormField>

                <FormField label="Line Channel Secret" hint="จัดเก็บ encrypted — ไม่สามารถดูค่าเดิมได้">
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={form.channelSecret}
                      onChange={e => setForm({ ...form, channelSecret: e.target.value })}
                      placeholder={selected.configured ? '••••••••••••••••••••••••' : 'วาง Channel Secret ที่นี่'}
                      style={{
                        width: '100%', padding: '8px 36px 8px 12px', fontSize: '13px',
                        borderRadius: '8px', border: '1px solid #e2e8f0',
                        outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        color: '#94a3b8', display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showSecret ? (
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </FormField>

                <FormField label="LIFF ID" hint="Line Developers → LIFF tab">
                  <input
                    type="text"
                    value={form.liffId}
                    onChange={e => setForm({ ...form, liffId: e.target.value })}
                    placeholder="เช่น 2001234567-AbCdEfGh"
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: '13px',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
                    }}
                  />
                </FormField>

                {/* Feedback banners */}
                {testState === 'success' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', background: '#d1fae5', color: '#065f46' }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    เชื่อมต่อ Line API สำเร็จ — Channel ID ถูกต้อง
                  </div>
                )}
                {testState === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    เชื่อมต่อไม่สำเร็จ — ตรวจสอบ Channel ID และ Secret
                  </div>
                )}
                {saved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', background: '#e0e7ff', color: '#3730a3' }}>
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    บันทึกการตั้งค่าเรียบร้อยแล้ว
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: '14px 20px 18px', borderTop: '1px solid #f8fafc', display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleTest}
                  disabled={testState === 'loading' || !form.channelId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', fontSize: '13px', fontWeight: 500,
                    borderRadius: '8px', border: '1px solid #e2e8f0',
                    background: 'white', color: '#475569', cursor: 'pointer',
                    opacity: (testState === 'loading' || !form.channelId) ? 0.5 : 1,
                  }}
                >
                  {testState === 'loading' ? (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังทดสอบ...
                    </>
                  ) : 'ทดสอบการเชื่อมต่อ'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.channelId || !form.liffId}
                  style={{
                    flex: 1, padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                    borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    color: 'white',
                    opacity: (!form.channelId || !form.liffId) ? 0.5 : 1,
                  }}
                >
                  บันทึกการตั้งค่า
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function TenantRow({ t, selected, onPick }: {
  t: TenantOpt
  selected: TenantOpt | null
  onPick: (t: TenantOpt) => void
}) {
  const isSelected = selected?.id === t.id
  const pl = planStyle[t.plan] ?? planStyle['Starter']
  return (
    <button
      onClick={() => onPick(t)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
        borderTop: '1px solid #f8fafc', border: 'none',
        borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: '#f8fafc',
        background: isSelected ? '#f5f3ff' : 'transparent',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700,
        background: pl.bg, color: pl.color,
      }}>
        {t.abbr}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#334155', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.plan}</p>
      </div>
      {isSelected && (
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#6366f1', flexShrink: 0 }}>
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}
