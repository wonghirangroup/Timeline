// admin/src/pages/announcement/index.tsx
import { showResult } from '../../components/ui/ResultDialog'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2 as ReportIcon, Megaphone, Mail, MessageSquare, Gift, Building2, BarChart3, Wallet, PenLine, Clock, Smartphone, Send, AlertTriangle, LayoutTemplate, Search, X, Check, Plus, Trash2, Table2, LayoutGrid, Smile, Users } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'
import SearchSelect from '../../components/shared/SearchSelect'
import InfoTooltip from '../../components/ui/InfoTooltip'
import PageLinks from '../../components/ui/PageLinks'
import TabBar from '../../components/ui/TabBar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

interface ApiAnnouncement { id: string; title: string; content: string; send_line: boolean; created_at: string }
interface ApiBranch { id: string; name: string }
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null; branch_id?: string; line_user_id?: string | null; is_active?: boolean }
interface ApiTemplate { id: string; name: string; title: string; content: string }

// ── แทรกอีโมจิ ─────────────────────────────────────────────────────────────
// ชุดที่คัดมาเฉพาะที่ใช้บ่อยกับประกาศ/ข้อความแจ้งเตือนในงาน HR (ไม่ทำ picker
// เต็มรูปแบบ — เกินความจำเป็นของ use case นี้ feedback 2026-10-01)
const EMOJI_PICK = ['📢','📣','🔔','📌','📅','🕐','✅','❌','⚠️','🚨','🎉','🎊','🎁','🏖️','💼','📝','💡','🙏','🙌','👏','👍','❤️','😊','⭐']

function insertAtCursor(
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  value: string,
  setValue: (v: string) => void,
  emoji: string,
) {
  const el = ref.current
  if (!el) { setValue(value + emoji); return }
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  setValue(value.slice(0, start) + emoji + value.slice(end))
  requestAnimationFrame(() => {
    el.focus()
    const pos = start + emoji.length
    el.setSelectionRange(pos, pos)
  })
}

function EmojiPickerButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} title="แทรกอีโมจิ"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, border: '1px solid #e5e7eb', background: open ? '#F4F6F9' : '#fff', color: open ? '#244B83' : '#9ca3af', cursor: 'pointer', flexShrink: 0 }}>
        <Smile size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 61, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 12px 30px rgba(15,23,42,0.14)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, width: 212 }}>
            {EMOJI_PICK.map(em => (
              <button key={em} type="button" onClick={() => { onPick(em); setOpen(false) }}
                style={{ fontSize: '1.05rem', padding: '5px 0', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6, lineHeight: 1 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F4F6F9' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                {em}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

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
            <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 10px', borderRadius: 99, background: '#DEE4EC', color: '#131C45', fontSize: '0.74rem', fontWeight: 600 }}>
              {empDisplayName(e)}
              <button type="button" onClick={() => onToggle(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#131C45', padding: 2, display: 'flex' }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อพนักงาน..."
          style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #E6ECF4', borderRadius: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>ไม่พบพนักงาน</div>
        ) : filtered.slice(0, 80).map(e => {
          const active = selected.has(e.id)
          return (
            <button key={e.id} type="button" onClick={() => onToggle(e.id)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', border: 'none', borderBottom: '1px solid #f8fafc', background: active ? '#F4F6F9' : '#fff', cursor: 'pointer' }}>
              <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${active ? '#244B83' : '#cbd5e1'}`, background: active ? '#244B83' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <Check size={10} color="#fff" />}
              </div>
              <span style={{ fontSize: '0.8rem', color: active ? '#131C45' : '#374151', fontWeight: active ? 700 : 500 }}>{empDisplayName(e)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ตัวอย่างข้อความใน LINE (เห็นก่อนส่งว่าพนักงานจะเห็นหน้าตาแบบไหน) ──────────
function LinePreview({ title, body }: { title: string; body: string }) {
  const empty = !title.trim() && !body.trim()
  const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #eef1f5', fontSize: '0.8rem', fontWeight: 800, color: '#131C45', display: 'flex', alignItems: 'center', gap: 7 }}>
        <Smartphone size={15} style={{ color: '#16a34a' }}/>ตัวอย่างที่พนักงานจะเห็นใน LINE
      </div>
      <div style={{ background: '#aebfd2', padding: '18px 14px 20px', minHeight: 150 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#244B83', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Megaphone size={16}/></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#2f3e55', marginBottom: 3 }}>YooNai</div>
            <div style={{ background: '#fff', borderRadius: '4px 16px 16px 16px', padding: '10px 14px', maxWidth: 300, boxShadow: '0 1px 2px rgba(0,0,0,0.12)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {empty ? (
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>พิมพ์หัวข้อและเนื้อหา แล้วจะเห็นตัวอย่างตรงนี้</span>
              ) : (<>
                {title.trim() && <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827', marginBottom: body.trim() ? 4 : 0 }}>{title}</div>}
                {body.trim() && <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.55 }}>{body}</div>}
              </>)}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#2f3e55', marginTop: 3 }}>{now}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
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
  const [feedbackView, setFeedbackView] = useState<'card' | 'table'>('table')

  const { data: feedbacks = [] } = useQuery<ApiFeedback[]>({
    queryKey: ['admin', 'feedback'],
    queryFn: () => api.get('/api/v1/admin/feedback').then(r => r.data.data),
    enabled: tab === 'feedback',
  })

  // Broadcast form
  const [bTitle, setBTitle] = useState('')
  const [bBody, setBBody] = useState('')
  const bTitleRef = useRef<HTMLInputElement>(null)
  const bBodyRef = useRef<HTMLTextAreaElement>(null)
  const [bTargetMode, setBTargetMode] = useState<'all' | 'branch' | 'individual'>('all')
  const [bBranch, setBBranch] = useState('')
  const [bEmployeeIds, setBEmployeeIds] = useState<Set<string>>(new Set())
  const [bTemplateId, setBTemplateId] = useState('')
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  // Direct form
  const [dEmployee, setDEmployee] = useState('')
  const [dMsg, setDMsg] = useState('')
  const [dTemplateId, setDTemplateId] = useState('')
  const dMsgRef = useRef<HTMLTextAreaElement>(null)

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

  // จำนวนผู้รับโดยประมาณ — นับเฉพาะพนักงานที่ผูก Line (ส่งผ่าน LINE OA ได้เฉพาะคนที่ผูกแล้ว)
  const linkedAll = employees.filter(e => e.line_user_id && e.is_active !== false)
  const recipientCount =
    bTargetMode === 'all' ? linkedAll.length
    : bTargetMode === 'branch' ? (bBranch ? linkedAll.filter(e => e.branch_id === bBranch).length : 0)
    : linkedAll.filter(e => bEmployeeIds.has(e.id)).length
  const [confirmSend, setConfirmSend] = useState(false)

  const sendMutation = useMutation({
    mutationFn: (data: { title: string; content: string; send_line: boolean; branch_id?: string; employee_ids?: string[] }) =>
      api.post('/api/v1/admin/announcements', data).then(r => r.data),
    onSuccess: (res, data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      setBTitle(''); setBBody(''); setBTargetMode('all'); setBBranch(''); setBEmployeeIds(new Set()); setBTemplateId('')
      const lineResult = res.data?.line_result
      if (lineResult?.error) {
        showToast('warning', `ส่งประกาศแล้ว แต่ Line ไม่สำเร็จ: ${lineResult.error}`)
        showResult({ type: 'error', title: 'บันทึกประกาศแล้ว แต่ส่ง Line ไม่สำเร็จ', subtitle: String(lineResult.error), details: [{ label: 'หัวข้อ', value: data.title }] })
      } else if (lineResult?.sent != null) {
        showToast('success', `ส่งประกาศ "${data.title}" ผ่าน Line ถึง ${lineResult.sent} คน สำเร็จ`)
        showResult({ type: 'success', title: 'ส่งประกาศสำเร็จ',
          details: [{ label: 'หัวข้อ', value: data.title }, { label: 'ช่องทาง', value: 'Line' }, { label: 'ส่งถึง', value: `${lineResult.sent} คน` }] })
      } else {
        showToast('success', `บันทึกประกาศ "${data.title}" แล้ว`)
        showResult({ type: 'success', title: 'บันทึกประกาศแล้ว', details: [{ label: 'หัวข้อ', value: data.title }, { label: 'ช่องทาง', value: 'แสดงในระบบ' }] })
      }
    },
    onError: () => showToast('error', 'ส่งประกาศไม่สำเร็จ'),
  })

  function sendBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) {
      showToast('warning', 'กรุณากรอกหัวข้อและรายละเอียดประกาศ')
      return
    }
    if (bTargetMode === 'branch' && !bBranch) {
      showToast('warning', 'กรุณาเลือกสาขาที่ต้องการส่ง')
      return
    }
    if (bTargetMode === 'individual' && bEmployeeIds.size === 0) {
      showToast('warning', 'กรุณาเลือกพนักงานอย่างน้อย 1 คน')
      return
    }
    setConfirmSend(true)
  }

  function doSendBroadcast() {
    setConfirmSend(false)
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
  const tplContentRef = useRef<HTMLTextAreaElement>(null)

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
      showResult({ type: 'success', title: 'ส่งข้อความสำเร็จ', details: [{ label: 'ถึง', value: res.data?.to ?? 'พนักงาน' }, { label: 'ช่องทาง', value: 'Line' }] })
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


  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={18} style={{ color: '#244B83' }}/>ประกาศ & ข้อความ
          <InfoTooltip size="md" title="ประกาศ & ข้อความ" width={300} content={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li><b>ส่งประกาศ (Broadcast)</b> — ส่งถึงทุกคน/ตามสาขา/เลือกรายคนพร้อมกันทีเดียว</li>
              <li><b>ข้อความส่วนตัว</b> — ส่งถึงพนักงานคนเดียวแบบเจาะจง</li>
              <li><b>Feedback</b> — ดูความคิดเห็นที่พนักงานส่งแบบไม่ระบุชื่อ</li>
              <li>ทั้งประกาศและข้อความส่วนตัวส่งผ่าน <b>LINE OA</b> ไปหาพนักงานที่ผูก LINE กับระบบไว้แล้วเท่านั้น</li>
            </ul>
          } />
        </h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>ส่งประกาศผ่าน Line OA, ข้อความส่วนตัว, และดูฟีดแบ็คพนักงาน</p>
        </div>
        <PageLinks className="no-print" links={[
            { to: '/report/line-messages', label: 'รายงานการส่งข้อความไลน์', icon: <ReportIcon size={14} />, permKey: 'report_line_messages' }
          ]} />
      </div>

      <TabBar
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'broadcast', label: 'ส่งประกาศ (Broadcast)', mobileLabel: 'ประกาศ', icon: <Megaphone size={14}/> },
          { key: 'direct', label: 'ข้อความส่วนตัว', mobileLabel: 'ส่วนตัว', icon: <Mail size={14}/> },
          { key: 'feedback', label: `Feedback (${feedbacks.length})`, icon: <MessageSquare size={14}/> },
        ]}
      />

      {/* ── Broadcast Tab ── แต่งประกาศ (ซ้าย) · ตัวอย่างใน LINE + ประวัติ (ขวา, sticky) ── */}
      {tab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 400px', gap: 20, alignItems: 'start' }}>
          {/* Composer */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 22px', borderBottom: '1px solid #eef1f5', background: '#fafbfc' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#131C45', flex: 1, minWidth: 160 }}>
                <PenLine size={17} style={{ color: '#244B83' }}/>แต่งประกาศใหม่
              </h3>
              {templates.length > 0 && (
                <select value={bTemplateId} onChange={e => { setBTemplateId(e.target.value); if (e.target.value) applyTemplate(e.target.value, 'broadcast') }}
                  style={{ ...inputStyle, width: 'auto', minWidth: 170, padding: '7px 10px', fontSize: '0.8rem' }} aria-label="ใช้เทมเพลต">
                  <option value="">ใช้เทมเพลต…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <button onClick={() => setShowTemplateManager(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 11px', fontSize: '0.78rem', fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
                <LayoutTemplate size={13} /> จัดการ Template
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>หัวข้อ</label>
                  <EmojiPickerButton onPick={em => insertAtCursor(bTitleRef, bTitle, setBTitle, em)} />
                </div>
                <input ref={bTitleRef} value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="เช่น แจ้งหยุดเนื่องในวันสำคัญ" style={{ ...inputStyle, fontSize: '1rem', fontWeight: 700, padding: '12px 14px' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>รายละเอียด</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{bBody.length} ตัวอักษร</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea ref={bBodyRef} value={bBody} onChange={e => setBBody(e.target.value)} rows={8} placeholder="พิมพ์เนื้อหาประกาศที่ต้องการแจ้งพนักงาน…" style={{ ...inputStyle, resize: 'vertical', minHeight: 170, lineHeight: 1.6, padding: '12px 14px', paddingRight: 42 }} />
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <EmojiPickerButton onPick={em => insertAtCursor(bBodyRef, bBody, setBBody, em)} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={13} color="#64748b" />ส่งถึงใคร</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
                  {([['all', 'ทุกคน', `${linkedAll.length} คน`], ['branch', 'ตามสาขา', 'เลือกสาขา'], ['individual', 'เลือกรายคน', bEmployeeIds.size > 0 ? `เลือกแล้ว ${bEmployeeIds.size}` : 'ค้นหาชื่อ']] as const).map(([mode, label, sub]) => {
                    const on = bTargetMode === mode
                    return (
                      <button key={mode} type="button" onClick={() => setBTargetMode(mode)}
                        style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                          border: `1.5px solid ${on ? '#244B83' : '#e5e7eb'}`, background: on ? '#F4F6F9' : '#fff', boxShadow: on ? '0 0 0 3px rgba(36,75,131,0.12)' : 'none' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: on ? '#244B83' : '#374151' }}>{label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
                      </button>
                    )
                  })}
                </div>
                {bTargetMode === 'branch' && (
                  <select value={bBranch} onChange={e => setBBranch(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
                    <option value="">— เลือกสาขา —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                {bTargetMode === 'individual' && (
                  <div style={{ marginTop: 10 }}>
                    <EmployeeSearchMultiSelect employees={employees} selected={bEmployeeIds} onToggle={toggleBEmployee} />
                  </div>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 22px', borderTop: '1px solid #eef1f5', background: '#fafbfc' }}>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: recipientCount === 0 ? '#b45309' : '#475569' }}>
                <Smartphone size={15} style={{ flexShrink: 0, color: recipientCount === 0 ? '#d97706' : '#16a34a' }}/>
                {recipientCount === 0
                  ? (bTargetMode === 'branch' && !bBranch ? 'เลือกสาขาที่ต้องการส่ง' : bTargetMode === 'individual' && bEmployeeIds.size === 0 ? 'เลือกพนักงานอย่างน้อย 1 คน' : 'ไม่มีพนักงานที่ผูก Line ในกลุ่มนี้')
                  : <span>ส่งผ่าน <b>Line OA</b> ถึง <b style={{ color: '#131C45' }}>{recipientCount} คน</b> <span style={{ color: 'var(--text-muted)' }}>(เฉพาะที่ผูก Line)</span></span>}
              </div>
              {(bTitle || bBody) && <Button variant="ghost" size="md" onClick={() => { setBTitle(''); setBBody(''); setBTemplateId('') }}>ล้าง</Button>}
              <Button variant="primary" size="lg" icon={<Send size={15}/>} loading={sendMutation.isPending} onClick={sendBroadcast}>ส่งประกาศ</Button>
            </div>
          </div>

          {/* Right rail: ตัวอย่าง + ประวัติ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: isMobile ? 'static' : 'sticky', top: 12 }}>
            <LinePreview title={bTitle} body={bBody} />

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef1f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, color: '#131C45' }}><Clock size={15} style={{ color: '#64748b' }}/>ประกาศที่ผ่านมา</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 99, padding: '2px 9px' }}>{announcements.length}</span>
              </div>
              <div style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 560px)', minHeight: isMobile ? 0 : 200, overflowY: 'auto' }}>
                {announcements.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีประกาศ</div>
                )}
                {announcements.map(a => (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      <button type="button" title="ใช้ข้อความนี้เป็นต้นแบบ" onClick={() => { setBTitle(a.title); setBBody(a.content); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        style={{ flexShrink: 0, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, color: '#244B83', cursor: 'pointer', fontFamily: 'inherit' }}>ใช้ซ้ำ</button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 7px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.content}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: '0.7rem', background: a.send_line ? '#dcfce7' : '#f3f4f6', color: a.send_line ? '#15803d' : 'var(--text-muted)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>
                        {a.send_line ? 'ส่งผ่าน Line แล้ว' : 'ไม่ได้ส่ง Line'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{thDateTime(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Tab ── ฟอร์ม + ตัวอย่างข้างกัน ── */}
      {tab === 'direct' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 400px', gap: 20, alignItems: 'start' }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '16px 22px', borderBottom: '1px solid #eef1f5', background: '#fafbfc' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#131C45', flex: 1 }}><Mail size={17} style={{ color: '#244B83' }}/>ส่งข้อความส่วนตัว</h3>
              {templates.length > 0 && (
                <select value={dTemplateId} onChange={e => { setDTemplateId(e.target.value); if (e.target.value) applyTemplate(e.target.value, 'direct') }}
                  style={{ ...inputStyle, width: 'auto', minWidth: 170, padding: '7px 10px', fontSize: '0.8rem' }} aria-label="ใช้เทมเพลต">
                  <option value="">ใช้เทมเพลต…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>ถึงพนักงาน</label>
                <SearchSelect
                  value={dEmployee}
                  onChange={setDEmployee}
                  options={employees.map(e => ({ value: e.id, label: empDisplayName(e) }))}
                  placeholder="ค้นหา/เลือกพนักงาน..."
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>ข้อความ</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dMsg.length} ตัวอักษร</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea ref={dMsgRef} value={dMsg} onChange={e => setDMsg(e.target.value)} rows={7} placeholder="พิมพ์ข้อความที่ต้องการส่ง…" style={{ ...inputStyle, resize: 'vertical', minHeight: 150, lineHeight: 1.6, padding: '12px 14px', paddingRight: 42 }} />
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <EmojiPickerButton onPick={em => insertAtCursor(dMsgRef, dMsg, setDMsg, em)} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 22px', borderTop: '1px solid #eef1f5', background: '#fafbfc' }}>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#854d0e' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }}/>พนักงานต้องผูก Line กับระบบก่อน จึงจะรับข้อความได้
              </div>
              <Button variant="primary" size="lg" icon={<Send size={15}/>} loading={directMutation.isPending} onClick={sendDirect}>ส่งข้อความ</Button>
            </div>
          </div>
          <div style={{ position: isMobile ? 'static' : 'sticky', top: 12 }}>
            <LinePreview title="" body={dMsg} />
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

          {/* Feedback list — cards on mobile, การ์ด/ตาราง เลือกเองได้บน desktop */}
          {!isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
                {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
                  <button key={v} onClick={() => setFeedbackView(v)}
                    title={label}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: feedbackView === v ? 700 : 500, background: feedbackView === v ? '#fff' : 'transparent', color: feedbackView === v ? '#244B83' : 'var(--text-muted)', boxShadow: feedbackView === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {(isMobile || feedbackView === 'card') ? (
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
                  <tr style={{ background: '#F4F6F9' }}>
                    {['หมวดหมู่', 'ข้อความ', 'วันที่รับ'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#131C45', whiteSpace: 'nowrap' }}>{h}</th>
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

      {confirmSend && (
        <ConfirmDialog variant="default" title="ยืนยันส่งประกาศ?" confirmLabel="ส่งเลย"
          message={<>ประกาศ “{bTitle}” จะถูกส่งผ่าน Line OA ถึงประมาณ <b>{recipientCount} คน</b> ส่งแล้วเรียกคืนไม่ได้</>}
          onConfirm={doSendBroadcast} onCancel={() => setConfirmSend(false)} />
      )}

      {/* ── Template Manager modal ── */}
      {showTemplateManager && (
        <div onClick={() => { setShowTemplateManager(false); setTplForm({ id: null, name: '', title: '', content: '' }) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 560, maxWidth: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6ECF4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 7 }}><LayoutTemplate size={16} color="#244B83" />จัดการ Template ข้อความ</div>
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
                <div style={{ position: 'relative' }}>
                  <textarea ref={tplContentRef} value={tplForm.content} onChange={e => setTplForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="เนื้อหา (default)" style={{ ...inputStyle, resize: 'vertical', paddingRight: 36 }} />
                  <div style={{ position: 'absolute', top: 6, right: 6 }}>
                    <EmojiPickerButton onPick={em => insertAtCursor(tplContentRef, tplForm.content, v => setTplForm(f => ({ ...f, content: v })), em)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {tplForm.id && (
                    <Button variant="ghost" size="sm" onClick={() => setTplForm({ id: null, name: '', title: '', content: '' })}>ยกเลิกแก้ไข</Button>
                  )}
                  <Button variant="primary" size="sm" block icon={<Plus size={13} />}
                    disabled={!tplForm.name.trim() || !tplForm.title.trim() || !tplForm.content.trim()}
                    loading={saveTemplateMutation.isPending}
                    onClick={() => saveTemplateMutation.mutate()}>
                    {tplForm.id ? 'บันทึกการแก้ไข' : 'สร้างเทมเพลต'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
