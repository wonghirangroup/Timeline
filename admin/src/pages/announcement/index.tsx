// admin/src/pages/announcement/index.tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Mail, MessageSquare, Package, User, Star, Sparkles, PenLine, Clock, Smartphone, Send, AlertTriangle } from 'lucide-react'
import { MOCK_FEEDBACKS } from '../../lib/mock'
import type { FeedbackItem } from '../../types'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'

interface ApiAnnouncement { id: string; title: string; content: string; send_line: boolean; created_at: string }
interface ApiBranch { id: string; name: string }
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string }

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDateTime(s: string) {
  const d = new Date(new Date(s).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const FEEDBACK_CATEGORY_CFG: Record<string, { icon: ReactNode; color: string; bg: string }> = {
  'สินค้า':     { icon: <Package size={14}/>,     color: '#d97706', bg: '#fef3c7' },
  'พนักงาน':   { icon: <User size={14}/>,          color: '#2563eb', bg: '#dbeafe' },
  'บริการ':     { icon: <Star size={14}/>,          color: '#7c3aed', bg: '#ede9fe' },
  'ความสะอาด': { icon: <Sparkles size={14}/>,      color: '#16a34a', bg: '#dcfce7' },
  'อื่นๆ':      { icon: <MessageSquare size={14}/>, color: '#6b7280', bg: '#f3f4f6' },
}

export default function AnnouncementPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'broadcast' | 'direct' | 'feedback'>('broadcast')
  const [feedbacks] = useState<FeedbackItem[]>(MOCK_FEEDBACKS)

  // Broadcast form
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bTarget, setBTarget] = useState('all')

  // Direct form
  const [dEmployee, setDEmployee] = useState('')
  const [dMsg, setDMsg] = useState('')

  const { data: announcements = [] } = useQuery<ApiAnnouncement[]>({
    queryKey: ['admin', 'announcements'],
    queryFn: () => api.get('/api/v1/admin/announcements').then(r => r.data.data),
  })

  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const { data: employees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })

  const sendMutation = useMutation({
    mutationFn: (data: { title: string; content: string; send_line: boolean; branch_id?: string }) =>
      api.post('/api/v1/admin/announcements', data).then(r => r.data),
    onSuccess: (res, data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      setBTitle(''); setBBody(''); setBTarget('all')
      const lineResult = res.data?.line_result
      if (lineResult?.error) {
        showToast('warning', `ส่งประกาศแล้ว แต่ Line ไม่สำเร็จ: ${lineResult.error}`)
      } else if (lineResult?.sent != null) {
        showToast('success', `ส่งประกาศ "${data.title}" ผ่าน Line ถึง ${lineResult.sent} คน สำเร็จ`)
      } else {
        showToast('success', `บันทึกประกาศ "${data.title}" แล้ว`)
      }
    },
    onError: () => showToast('error', 'ส่งประกาศไม่สำเร็จ'),
  })

  function sendBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) {
      showToast('warning', 'กรุณากรอกหัวข้อและรายละเอียดประกาศ')
      return
    }
    sendMutation.mutate({
      title:     bTitle,
      content:   bBody,
      send_line: true,
      branch_id: bTarget !== 'all' ? bTarget : undefined,
    })
  }

  const directMutation = useMutation({
    mutationFn: (data: { employee_id: string; message: string }) =>
      api.post('/api/v1/admin/announcements/direct', data).then(r => r.data),
    onSuccess: (res) => {
      setDEmployee(''); setDMsg('')
      showToast('success', `ส่งข้อความถึง ${res.data?.to ?? 'พนักงาน'} สำเร็จแล้ว`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'ส่งข้อความไม่สำเร็จ'
      showToast('error', msg)
    },
  })

  function sendDirect() {
    if (!dEmployee || !dMsg.trim()) {
      showToast('warning', 'กรุณาเลือกพนักงานและพิมพ์ข้อความ')
      return
    }
    directMutation.mutate({ employee_id: dEmployee, message: dMsg })
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
        <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={18} style={{ color: '#ea580c' }}/>ประกาศ & ข้อความ</h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>ส่งประกาศผ่าน Line OA, ข้อความส่วนตัว, และดูฟีดแบ็คพนักงาน</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button style={{ ...tabStyle(tab === 'broadcast'), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setTab('broadcast')}><Megaphone size={14}/>{isMobile ? 'ประกาศ' : 'ส่งประกาศ (Broadcast)'}</button>
        <button style={{ ...tabStyle(tab === 'direct'), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setTab('direct')}><Mail size={14}/>{isMobile ? 'ส่วนตัว' : 'ข้อความส่วนตัว'}</button>
        <button style={{ ...tabStyle(tab === 'feedback'), display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setTab('feedback')}><MessageSquare size={14}/>Feedback ({feedbacks.length})</button>
      </div>

      {/* ── Broadcast Tab ── */}
      {tab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Form */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><PenLine size={16} style={{ color: '#ea580c' }}/>แต่งประกาศใหม่</h3>
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
                  <option value="all">ทุกคน</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#1e40af', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Smartphone size={14} style={{ marginTop: 1, flexShrink: 0 }}/>ประกาศจะถูกส่งผ่าน <strong>Line OA</strong> ไปยังพนักงานที่เลือก
              </div>
              <button
                onClick={sendBroadcast}
                style={{ padding: '11px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Send size={15}/>ส่งประกาศ
              </button>
            </div>
          </div>

          {/* History */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><Clock size={15} style={{ color: '#64748b' }}/>ประกาศที่ผ่านมา</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: '0.82rem' }}>ยังไม่มีประกาศ</div>
              )}
              {announcements.map(a => (
                <div key={a.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>{a.content}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', background: a.send_line ? '#dcfce7' : '#f3f4f6', color: a.send_line ? '#15803d' : '#6b7280', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                      {a.send_line ? 'ส่งผ่าน Line แล้ว' : 'ไม่ได้ส่ง Line'}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{thDateTime(a.created_at)}</div>
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
            <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><Mail size={16} style={{ color: '#ea580c' }}/>ส่งข้อความส่วนตัว</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>พนักงานที่ต้องการส่งถึง</label>
                <select value={dEmployee} onChange={e => setDEmployee(e.target.value)} style={inputStyle}>
                  <option value="">เลือกพนักงาน...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.nickname})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>ข้อความ</label>
                <textarea value={dMsg} onChange={e => setDMsg(e.target.value)} rows={5} placeholder="พิมพ์ข้อความ..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ background: '#fefce8', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#854d0e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }}/>พนักงานต้องผูก Line account กับระบบก่อน จึงจะรับข้อความได้
              </div>
              <button
                onClick={sendDirect}
                disabled={directMutation.isPending}
                style={{ padding: '11px 24px', borderRadius: 8, border: 'none', cursor: directMutation.isPending ? 'not-allowed' : 'pointer', background: directMutation.isPending ? '#fdba74' : '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Send size={15}/>{directMutation.isPending ? 'กำลังส่ง...' : 'ส่งข้อความ'}
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
                  <div style={{ marginBottom: 6, color: cfg.color, display: 'flex', justifyContent: 'center' }}>{cfg.icon}</div>
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
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {cfg.icon}{f.category}
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
                  <tr style={{ background: '#fff7ed' }}>
                    {['หมวดหมู่', 'ข้อความ', 'สาขา (ประมาณ)', 'วันที่รับ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f, i) => {
                    const cfg = FEEDBACK_CATEGORY_CFG[f.category] ?? FEEDBACK_CATEGORY_CFG['อื่นๆ']
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {cfg.icon}{f.category}
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
