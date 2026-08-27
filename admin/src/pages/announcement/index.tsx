// admin/src/pages/announcement/index.tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Mail, MessageSquare, Gift, Building2, BarChart3, Wallet, PenLine, Clock, Smartphone, Send, AlertTriangle, LayoutTemplate, Search, X, Check, Plus, Trash2 } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'

interface ApiAnnouncement { id: string; title: string; content: string; send_line: boolean; created_at: string }
interface ApiBranch { id: string; name: string }
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null }
interface ApiTemplate { id: string; name: string; title: string; content: string }

// ── ค้นหา + เลือกพนักงานหลายคน (ใช้ตอนเลือกส่งรายคนในโหมด broadcast) ───────────
function empDisplayName(e: ApiEmployee) {
  const full = `${e.first_name} ${e.last_name}`.trim()
  return e.nickname ? `${full} (${e.nickname})` : full
}

function EmployeeSearchMultiSelect({ employees, selected, onToggle }: {
  employees: ApiEmployee[]; selected: Set<string>; onToggle: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query.length === 0 ? employees : employees.filter(e => empDisplayName(e).toLowerCase().includes(query))
  const selectedEmps = employees.filter(e => selected.has(e.id))

  return (
    <div>
      {selectedEmps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {selectedEmps.map(e => (
            <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 10px', borderRadius: 99, background: '#ffedd5', color: '#c2410c', fontSize: '0.74rem', fontWeight: 600 }}>
              {empDisplayName(e)}
              <button type="button" onClick={() => onToggle(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c2410c', padding: 2, display: 'flex' }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อพนักงาน..."
          style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ไม่พบพนักงาน</div>
        ) : filtered.slice(0, 80).map(e => {
          const active = selected.has(e.id)
          return (
            <button key={e.id} type="button" onClick={() => onToggle(e.id)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: 'none', borderBottom: '1px solid #f8fafc', background: active ? '#fff7ed' : '#fff', cursor: 'pointer' }}>
              <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${active ? '#ea580c' : '#cbd5e1'}`, background: active ? '#ea580c' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <Check size={10} color="#fff" />}
              </div>
              <span style={{ fontSize: '0.8rem', color: active ? '#c2410c' : '#374151', fontWeight: active ? 700 : 500 }}>{empDisplayName(e)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDateTime(s: string) {
  const d = new Date(new Date(s).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

interface ApiFeedback { id: string; category: string; content: string; created_at: string }

// ต้องตรงกับ FeedbackCategory enum ฝั่ง backend (schema.prisma) เป๊ะ
const FEEDBACK_CATEGORY_CFG: Record<string, { label: string; icon: ReactNode; color: string; bg: string }> = {
  WELFARE:    { label: 'สวัสดิการ',    icon: <Gift size={14}/>,      color: '#d97706', bg: '#fef3c7' },
  WORK_ENV:   { label: 'สภาพแวดล้อม', icon: <Building2 size={14}/>, color: '#2563eb', bg: '#dbeafe' },
  MANAGEMENT: { label: 'การบริหาร',   icon: <BarChart3 size={14}/>, color: '#7c3aed', bg: '#ede9fe' },
  SALARY:     { label: 'เงินเดือน',   icon: <Wallet size={14}/>,    color: '#16a34a', bg: '#dcfce7' },
  OTHER:      { label: 'อื่น ๆ',      icon: <MessageSquare size={14}/>, color: 'var(--text-muted)', bg: '#f3f4f6' },
}

export default function AnnouncementPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'broadcast' | 'direct' | 'feedback'>('broadcast')

  const { data: feedbacks = [] } = useQuery<ApiFeedback[]>({
    queryKey: ['admin', 'feedback'],
    queryFn: () => api.get('/api/v1/admin/feedback').then(r => r.data.data),
    enabled: tab === 'feedback',
  })

  // Broadcast form
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const [bTargetMode, setBTargetMode] = useState<'all' | 'branch' | 'individual'>('all')
  const [bBranch, setBBranch] = useState('')
  const [bEmployeeIds, setBEmployeeIds] = useState<Set<string>>(new Set())
  const [bTemplateId, setBTemplateId] = useState('')
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  // Direct form
  const [dEmployee, setDEmployee] = useState('')
  const [dSearch, setDSearch] = useState('')
  const [dMsg, setDMsg] = useState('')
  const [dTemplateId, setDTemplateId] = useState('')

  const { data: templates = [] } = useQuery<ApiTemplate[]>({
    queryKey: ['admin', 'announcement-templates'],
    queryFn: () => api.get('/api/v1/admin/announcement-templates').then(r => r.data.data),
  })

  function toggleBEmployee(id: string) {
    setBEmployeeIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function applyTemplate(id: string, target: 'broadcast' | 'direct') {
    const t = templates.find(x => x.id === id)
    if (!t) return
    if (target === 'broadcast') { setBTitle(t.title); setBBody(t.content) }
    else setDMsg(t.content)
  }

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
    mutationFn: (data: { title: string; content: string; send_line: boolean; branch_id?: string; employee_ids?: string[] }) =>
      api.post('/api/v1/admin/announcements', data).then(r => r.data),
    onSuccess: (res, data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      setBTitle(''); setBBody(''); setBTargetMode('all'); setBBranch(''); setBEmployeeIds(new Set()); setBTemplateId('')
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
    if (bTargetMode === 'individual' && bEmployeeIds.size === 0) {
      showToast('warning', 'กรุณาเลือกพนักงานอย่างน้อย 1 คน')
      return
    }
    sendMutation.mutate({
      title:     bTitle,
      content:   bBody,
      send_line: true,
      branch_id:    bTargetMode === 'branch' ? bBranch || undefined : undefined,
      employee_ids: bTargetMode === 'individual' ? [...bEmployeeIds] : undefined,
    })
  }

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const [tplForm, setTplForm] = useState<{ id: string | null; name: string; title: string; content: string }>({ id: null, name: '', title: '', content: '' })

  const saveTemplateMutation = useMutation({
    mutationFn: () => tplForm.id
      ? api.patch(`/api/v1/admin/announcement-templates/${tplForm.id}`, { name: tplForm.name, title: tplForm.title, content: tplForm.content })
      : api.post('/api/v1/admin/announcement-templates', { name: tplForm.name, title: tplForm.title, content: tplForm.content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcement-templates'] })
      showToast('success', tplForm.id ? 'แก้ไข Template แล้ว' : 'สร้าง Template แล้ว')
      setTplForm({ id: null, name: '', title: '', content: '' })
    },
    onError: () => showToast('error', 'บันทึก Template ไม่สำเร็จ'),
  })
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/announcement-templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'announcement-templates'] }); showToast('success', 'ลบ Template แล้ว') },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

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
    color: active ? '#fff' : 'var(--text-muted)',
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
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>ส่งประกาศผ่าน Line OA, ข้อความส่วนตัว, และดูฟีดแบ็คพนักงาน</p>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}><PenLine size={16} style={{ color: '#ea580c' }}/>แต่งประกาศใหม่</h3>
              <button onClick={() => setShowTemplateManager(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                <LayoutTemplate size={13} /> จัดการ Template
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {templates.length > 0 && (
                <div>
                  <label style={labelStyle}>ใช้เทมเพลต (ไม่บังคับ)</label>
                  <select value={bTemplateId} onChange={e => { setBTemplateId(e.target.value); if (e.target.value) applyTemplate(e.target.value, 'broadcast') }} style={inputStyle}>
                    <option value="">— เลือกเทมเพลต —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={labelStyle}>หัวข้อประกาศ</label>
                <input value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="ระบุหัวข้อ..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>รายละเอียด</label>
                <textarea value={bBody} onChange={e => setBBody(e.target.value)} rows={5} placeholder="เนื้อหาประกาศ..." style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{bBody.length} ตัวอักษร</div>
              </div>
              <div>
                <label style={labelStyle}>ส่งถึง</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {([['all', 'ทุกคน'], ['branch', 'ตามสาขา'], ['individual', 'เลือกรายคน']] as const).map(([mode, label]) => (
                    <button key={mode} type="button" onClick={() => setBTargetMode(mode)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                        border: `1.5px solid ${bTargetMode === mode ? '#ea580c' : '#e5e7eb'}`, background: bTargetMode === mode ? '#fff7ed' : '#fff', color: bTargetMode === mode ? '#ea580c' : '#64748b' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {bTargetMode === 'branch' && (
                  <select value={bBranch} onChange={e => setBBranch(e.target.value)} style={inputStyle}>
                    <option value="">— เลือกสาขา —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                {bTargetMode === 'individual' && (
                  <EmployeeSearchMultiSelect employees={employees} selected={bEmployeeIds} onToggle={toggleBEmployee} />
                )}
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
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีประกาศ</div>
              )}
              {announcements.map(a => (
                <div key={a.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{a.content}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', background: a.send_line ? '#dcfce7' : '#f3f4f6', color: a.send_line ? '#15803d' : 'var(--text-muted)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                      {a.send_line ? 'ส่งผ่าน Line แล้ว' : 'ไม่ได้ส่ง Line'}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{thDateTime(a.created_at)}</div>
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
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input value={dSearch} onChange={e => setDSearch(e.target.value)} placeholder="ค้นหาชื่อพนักงาน..."
                    style={{ ...inputStyle, padding: '9px 12px 9px 30px' }} />
                </div>
                <select value={dEmployee} onChange={e => setDEmployee(e.target.value)} style={inputStyle} size={dSearch ? 6 : undefined}>
                  <option value="">เลือกพนักงาน...</option>
                  {employees
                    .filter(e => !dSearch.trim() || empDisplayName(e).toLowerCase().includes(dSearch.trim().toLowerCase()))
                    .map(e => (
                      <option key={e.id} value={e.id}>{empDisplayName(e)}</option>
                    ))}
                </select>
              </div>
              {templates.length > 0 && (
                <div>
                  <label style={labelStyle}>ใช้เทมเพลต (ไม่บังคับ)</label>
                  <select value={dTemplateId} onChange={e => { setDTemplateId(e.target.value); if (e.target.value) applyTemplate(e.target.value, 'direct') }} style={inputStyle}>
                    <option value="">— เลือกเทมเพลต —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
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
                  <div style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
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
                  const cfg = FEEDBACK_CATEGORY_CFG[f.category] ?? FEEDBACK_CATEGORY_CFG.OTHER
                  return (
                    <div key={f.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {cfg.icon}{cfg.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{thDateTime(f.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>{f.content}</div>
                    </div>
                  )
                })}
                {feedbacks.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มี Feedback</div>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#fff7ed' }}>
                    {['หมวดหมู่', 'ข้อความ', 'วันที่รับ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f, i) => {
                    const cfg = FEEDBACK_CATEGORY_CFG[f.category] ?? FEEDBACK_CATEGORY_CFG.OTHER
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', color: '#374151', maxWidth: 400, lineHeight: 1.5 }}>{f.content}</td>
                        <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{thDateTime(f.created_at)}</td>
                      </tr>
                    )
                  })}
                  {feedbacks.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มี Feedback</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Template Manager modal ── */}
      {showTemplateManager && (
        <div onClick={() => { setShowTemplateManager(false); setTplForm({ id: null, name: '', title: '', content: '' }) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 560, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 7 }}><LayoutTemplate size={16} color="#ea580c" />จัดการ Template ข้อความ</div>
              <button onClick={() => { setShowTemplateManager(false); setTplForm({ id: null, name: '', title: '', content: '' }) }} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Existing templates */}
              {templates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {templates.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      </div>
                      <button onClick={() => setTplForm({ id: t.id, name: t.name, title: t.title, content: t.content })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 5, display: 'flex' }}><PenLine size={13} /></button>
                      <button onClick={() => deleteTemplateMutation.mutate(t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 5, display: 'flex' }}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Add/edit form */}
              <div style={{ borderTop: templates.length > 0 ? '1px dashed #e5e7eb' : 'none', paddingTop: templates.length > 0 ? 14 : 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>{tplForm.id ? 'แก้ไขเทมเพลต' : '+ เทมเพลตใหม่'}</div>
                <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อเทมเพลต เช่น แจ้งวันหยุดพิเศษ" style={inputStyle} />
                <input value={tplForm.title} onChange={e => setTplForm(f => ({ ...f, title: e.target.value }))} placeholder="หัวข้อประกาศ (default)" style={inputStyle} />
                <textarea value={tplForm.content} onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="เนื้อหา (default)" style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {tplForm.id && (
                    <button onClick={() => setTplForm({ id: null, name: '', title: '', content: '' })} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}>ยกเลิกแก้ไข</button>
                  )}
                  <button onClick={() => saveTemplateMutation.mutate()} disabled={!tplForm.name.trim() || !tplForm.title.trim() || !tplForm.content.trim() || saveTemplateMutation.isPending}
                    style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Plus size={13} /> {tplForm.id ? 'บันทึกการแก้ไข' : 'สร้างเทมเพลต'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
