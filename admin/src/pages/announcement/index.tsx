// admin/src/pages/announcement/index.tsx
import { useState } from 'react'
import { MOCK_ANNOUNCEMENTS, MOCK_FEEDBACKS, MOCK_BRANCHES, MOCK_EMPLOYEES } from '../../lib/mock'
import type { AnnouncementItem, FeedbackItem } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDateTime(s: string) {
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const FEEDBACK_CATEGORY_CFG: Record<string, { icon: string; color: string; bg: string }> = {
  'สินค้า':     { icon: '📦', color: '#d97706', bg: '#fef3c7' },
  'พนักงาน':   { icon: '👤', color: '#2563eb', bg: '#dbeafe' },
  'บริการ':     { icon: '⭐', color: '#7c3aed', bg: '#ede9fe' },
  'ความสะอาด': { icon: '🧹', color: '#16a34a', bg: '#dcfce7' },
  'อื่นๆ':      { icon: '💬', color: '#6b7280', bg: '#f3f4f6' },
}

export default function AnnouncementPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<'broadcast' | 'direct' | 'feedback'>('broadcast')
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(MOCK_ANNOUNCEMENTS)
  const [feedbacks] = useState<FeedbackItem[]>(MOCK_FEEDBACKS)

  // Broadcast form
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bTarget, setBTarget] = useState('all')

  // Direct form
  const [dEmployee, setDEmployee] = useState('')
  const [dMsg, setDMsg] = useState('')

  function sendBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) {
      showToast('warning', 'กรุณากรอกหัวข้อและรายละเอียดประกาศ')
      return
    }
    const sentCount = bTarget === 'all' ? 27 : MOCK_BRANCHES.find(b => b.name === bTarget)?.employee_count ?? 0
    const item: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: bTitle,
      body: bBody,
      sent_at: new Date().toISOString(),
      target: bTarget,
      sent_count: sentCount,
    }
    setAnnouncements(prev => [item, ...prev])
    setBTitle(''); setBBody(''); setBTarget('all')
    showToast('success', `ส่งประกาศ "${bTitle}" ถึง ${sentCount} คน สำเร็จแล้ว`)
  }

  function sendDirect() {
    if (!dEmployee || !dMsg.trim()) {
      showToast('warning', 'กรุณาเลือกพนักงานและพิมพ์ข้อความ')
      return
    }
    const emp = MOCK_EMPLOYEES.find(e => e.id === dEmployee)
    setDEmployee(''); setDMsg('')
    showToast('success', `ส่งข้อความถึง ${emp?.nickname ?? 'พนักงาน'} สำเร็จแล้ว`)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? '8px 14px' : '8px 20px',
    borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: isMobile ? '0.8rem' : '0.875rem',
    fontWeight: active ? 700 : 400,
    background: active ? '#f97316' : '#f3f4f6',
    color: active ? '#fff' : '#6b7280',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>📢 ประกาศ & ข้อความ</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>ส่งประกาศผ่าน Line OA, ข้อความส่วนตัว, และดูฟีดแบ็คพนักงาน</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button style={tabStyle(tab === 'broadcast')} onClick={() => setTab('broadcast')}>📢 {isMobile ? 'ประกาศ' : 'ส่งประกาศ (Broadcast)'}</button>
        <button style={tabStyle(tab === 'direct')} onClick={() => setTab('direct')}>✉️ {isMobile ? 'ส่วนตัว' : 'ข้อความส่วนตัว'}</button>
        <button style={tabStyle(tab === 'feedback')} onClick={() => setTab('feedback')}>💬 Feedback ({feedbacks.length})</button>
      </div>

      {/* ── Broadcast Tab ── */}
      {tab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700 }}>📝 แต่งประกาศใหม่</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>หัวข้อประกาศ</label>
                <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="ระบุหัวข้อ..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>รายละเอียด</label>
                <textarea value={bBody} onChange={e => setBBody(e.target.value)} rows={5} placeholder="เนื้อหาประกาศ..." style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>{bBody.length} ตัวอักษร</div>
              </div>
              <div>
                <label style={labelStyle}>ส่งถึง</label>
                <select value={bTarget} onChange={e => setBTarget(e.target.value)} style={inputStyle}>
                  <option value="all">ทุกคน (27 คน)</option>
                  {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name} ({b.employee_count} คน)</option>)}
                </select>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#1e40af' }}>
                📱 ประกาศจะถูกส่งผ่าน <strong>Line OA</strong> ไปยังพนักงานที่เลือก
              </div>
              <button
                onClick={sendBroadcast}
                style={{ padding: '11px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}
              >
                📤 ส่งประกาศ
              </button>
            </div>
          </div>

          {/* History */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700 }}>🕑 ประกาศที่ผ่านมา</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.map(a => (
                <div key={a.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>{a.body}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        {a.target === 'all' ? 'ทุกคน' : a.target}
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        ส่งแล้ว {a.sent_count} คน
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{thDateTime(a.sent_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Tab ── */}
      {tab === 'direct' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700 }}>✉️ ส่งข้อความส่วนตัว</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>พนักงานที่ต้องการส่งถึง</label>
                <select value={dEmployee} onChange={e => setDEmployee(e.target.value)} style={inputStyle}>
                  <option value="">เลือกพนักงาน...</option>
                  {MOCK_EMPLOYEES.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.nickname}) — {e.branches[0]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>ข้อความ</label>
                <textarea value={dMsg} onChange={e => setDMsg(e.target.value)} rows={5} placeholder="พิมพ์ข้อความ..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ background: '#fefce8', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#854d0e' }}>
                ⚠️ พนักงานต้องผูก Line account กับระบบก่อน จึงจะรับข้อความได้
              </div>
              <button
                onClick={sendDirect}
                style={{ padding: '11px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}
              >
                📨 ส่งข้อความ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Tab ── */}
      {tab === 'feedback' && (
        <div>
          {/* Category summary cards — 3-col on mobile, 5-col on desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(5,1fr)', gap: isMobile ? 8 : 10, marginBottom: 20 }}>
            {Object.entries(FEEDBACK_CATEGORY_CFG).map(([cat, cfg]) => {
              const count = feedbacks.filter(f => f.category === cat).length
              return (
                <div key={cat} style={{ background: cfg.bg, borderRadius: 10, padding: isMobile ? '10px 8px' : '14px', textAlign: 'center', border: `1px solid ${cfg.color}20` }}>
                  <div style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', marginBottom: 2 }}>{cfg.icon}</div>
                  <div style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', fontWeight: 700, color: cfg.color }}>{cat}</div>
                  <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 700, color: '#111827', marginTop: 2 }}>{count}</div>
                </div>
              )
            })}
          </div>

          {/* Feedback list — cards on mobile, table on desktop */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {isMobile ? (
              <div>
                {feedbacks.map((f, i) => {
                  const cfg = FEEDBACK_CATEGORY_CFG[f.category] ?? FEEDBACK_CATEGORY_CFG['อื่นๆ']
                  return (
                    <div key={f.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {cfg.icon} {f.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{thDateTime(f.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5, marginBottom: 4 }}>{f.message}</div>
                      {f.branch_hint && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.branch_hint}</div>
                      )}
                    </div>
                  )
                })}
                {feedbacks.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ยังไม่มี Feedback</div>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#dbeafe' }}>
                    {['หมวดหมู่', 'ข้อความ', 'สาขา (ประมาณ)', 'วันที่รับ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f, i) => {
                    const cfg = FEEDBACK_CATEGORY_CFG[f.category] ?? FEEDBACK_CATEGORY_CFG['อื่นๆ']
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {cfg.icon} {f.category}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#374151', maxWidth: 400, lineHeight: 1.5 }}>{f.message}</td>
                        <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{f.branch_hint ?? '—'}</td>
                        <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{thDateTime(f.created_at)}</td>
                      </tr>
                    )
                  })}
                  {feedbacks.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ยังไม่มี Feedback</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
