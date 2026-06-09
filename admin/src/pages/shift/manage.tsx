// admin/src/pages/shift/index.tsx  [MOCK MODE]
import { useState, useMemo, useEffect } from 'react'
import { Pencil, Trash2, X, Users, UserPlus, Search, UserMinus, ChevronLeft, ChevronRight } from 'lucide-react'
import { MOCK_EMPLOYEES } from '../../lib/mock'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiBranch { id: string; name: string }

interface ApiShift {
  id: string
  branch_id: string
  name: string
  start_time: string
  end_time: string
  min_checkout: string | null
  late_threshold: number
  late_threshold_1: string | null
  late_threshold_2: string | null
  late_fine_1: string | null
  late_fine_2: string | null
  shift_type: 'REGULAR' | 'SPECIAL'
  is_active: boolean
  branch: { id: string; name: string }
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
let _shSeq = 100
function genShId() { return `sh-mock-${_shSeq++}` }

const MOCK_BRANCHES_SH: ApiBranch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ' },
  { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' },
  { id: 'br-03', name: 'ฟุคุโระ ตลาดย่าโม' },
  { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' },
  { id: 'br-06', name: 'ฟุคุโระ เทิดไท' },
]
const MOCK_SHIFTS_API: ApiShift[] = [
  { id: 'sh-01', branch_id: 'br-01', name: 'กะเช้า',       start_time: '08:00', end_time: '17:00', min_checkout: '16:55', late_threshold: 5,  late_threshold_1: '08:05', late_threshold_2: '08:20', late_fine_1: '20',  late_fine_2: '50',  shift_type: 'REGULAR', is_active: true, branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'sh-02', branch_id: 'br-01', name: 'กะบ่าย',       start_time: '13:00', end_time: '22:00', min_checkout: '21:55', late_threshold: 5,  late_threshold_1: '13:05', late_threshold_2: '13:20', late_fine_1: '20',  late_fine_2: '50',  shift_type: 'REGULAR', is_active: true, branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'sh-03', branch_id: 'br-02', name: 'กะเช้า',       start_time: '09:00', end_time: '18:00', min_checkout: '17:55', late_threshold: 5,  late_threshold_1: '09:05', late_threshold_2: '09:30', late_fine_1: '20',  late_fine_2: '50',  shift_type: 'REGULAR', is_active: true, branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
  { id: 'sh-04', branch_id: 'br-03', name: 'กะเช้า',       start_time: '09:00', end_time: '18:00', min_checkout: '17:55', late_threshold: 5,  late_threshold_1: '09:05', late_threshold_2: '09:30', late_fine_1: '20',  late_fine_2: '50',  shift_type: 'REGULAR', is_active: true, branch: { id: 'br-03', name: 'ฟุคุโระ ตลาดย่าโม' } },
  { id: 'sh-05', branch_id: 'br-04', name: 'กะกลางคืน',   start_time: '17:00', end_time: '02:00', min_checkout: '01:55', late_threshold: 5,  late_threshold_1: '17:05', late_threshold_2: '17:30', late_fine_1: '20',  late_fine_2: '100', shift_type: 'REGULAR', is_active: true, branch: { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' } },
  { id: 'sh-06', branch_id: 'br-06', name: 'กะเช้า',       start_time: '09:00', end_time: '18:00', min_checkout: '17:55', late_threshold: 5,  late_threshold_1: '09:05', late_threshold_2: '09:30', late_fine_1: '20',  late_fine_2: '50',  shift_type: 'REGULAR', is_active: true, branch: { id: 'br-06', name: 'ฟุคุโระ เทิดไท' } },
]

const EMPTY_FORM = {
  branch_id: '',
  name: '',
  start_time: '08:00',
  end_time: '18:00',
  min_checkout: '17:55',
  late_threshold_1: '08:05',
  late_threshold_2: '08:30',
  late_fine_1: '',
  late_fine_2: '',
  shift_type: 'REGULAR' as 'REGULAR' | 'SPECIAL',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block',
}
const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 8, marginTop: 4,
}

function TimeInput({ label, value, onChange, sublabel }: { label: string; value: string; onChange: (v: string) => void; sublabel?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {sublabel && <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 4 }}>{sublabel}</div>}
      <input type="time" value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

type ShiftStatus = 'inactive' | 'upcoming' | 'active' | 'done'

function getShiftStatus(s: ApiShift): ShiftStatus {
  if (!s.is_active) return 'inactive'
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  const start = sh * 60 + sm
  const end   = eh * 60 + em
  if (cur < start) return 'upcoming'
  if (cur <= end)  return 'active'
  return 'done'
}

const STATUS_CFG: Record<ShiftStatus, { label: string; color: string; bg: string; dot: string }> = {
  inactive: { label: 'ปิดใช้งาน',     color: '#9ca3af', bg: '#f3f4f6', dot: '○' },
  upcoming: { label: 'ยังไม่เริ่ม',   color: '#d97706', bg: '#fef3c7', dot: '◷' },
  active:   { label: 'กำลังทำงาน',    color: '#16a34a', bg: '#dcfce7', dot: '●' },
  done:     { label: 'เลิกงานแล้ว',   color: '#6366f1', bg: '#eef2ff', dot: '✓' },
}

export default function ShiftPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const [shifts, setShifts]     = useState<ApiShift[]>(MOCK_SHIFTS_API)
  const [branches, setBranches] = useState<ApiBranch[]>(MOCK_BRANCHES_SH)
  const [loading, setLoading]   = useState(false)
  const [branchFilter, setBranchFilter] = useState('')
  
  const [page, setPage]         = useState(1)
  const pageSize                = 6

  const [modal, setModal]       = useState<{ mode: 'add' | 'edit'; data: ApiShift | null } | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiShift | null>(null)
  const [empViewShift, setEmpViewShift] = useState<ApiShift | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const [addEmpTab, setAddEmpTab] = useState<'in' | 'add'>('in')

  // mutable emp→shift mapping (starts from mock default_shift_id)
  const [empShiftAssign, setEmpShiftAssign] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {}
    MOCK_EMPLOYEES.forEach(e => { m[e.id] = e.default_shift_id ?? null })
    return m
  })

  function loadAll() {
    setBranches(MOCK_BRANCHES_SH)
    setShifts(MOCK_SHIFTS_API)
  }

  const filtered = shifts.filter(s => !branchFilter || s.branch_id === branchFilter)
  
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [branchFilter])

  const shiftEmpMap = useMemo(() => {
    const map: Record<string, typeof MOCK_EMPLOYEES> = {}
    MOCK_EMPLOYEES.forEach(e => {
      const sid = empShiftAssign[e.id]
      if (!sid) return
      if (!map[sid]) map[sid] = []
      map[sid].push(e)
    })
    return map
  }, [empShiftAssign])

  function assignEmp(empId: string, shiftId: string) {
    setEmpShiftAssign(prev => ({ ...prev, [empId]: shiftId }))
    showToast('success', 'เพิ่มพนักงานเข้ากะแล้ว')
  }

  function removeEmp(empId: string, empName: string) {
    setEmpShiftAssign(prev => ({ ...prev, [empId]: null }))
    showToast('success', `ย้าย ${empName} ออกจากกะแล้ว`)
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, branch_id: branches[0]?.id ?? '' })
    setModal({ mode: 'add', data: null })
  }

  function openEdit(s: ApiShift) {
    setForm({
      branch_id:        s.branch_id,
      name:             s.name,
      start_time:       s.start_time,
      end_time:         s.end_time,
      min_checkout:     s.min_checkout ?? '',
      late_threshold_1: s.late_threshold_1 ?? '',
      late_threshold_2: s.late_threshold_2 ?? '',
      late_fine_1:      s.late_fine_1 ?? '',
      late_fine_2:      s.late_fine_2 ?? '',
      shift_type:       s.shift_type ?? 'REGULAR',
    })
    setModal({ mode: 'edit', data: s })
  }

  async function handleSave() {
    if (!form.name.trim() || !form.branch_id || !form.start_time || !form.end_time) {
      showToast('error', 'กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const br = branches.find(b => b.id === form.branch_id) ?? { id: form.branch_id, name: form.branch_id }
    if (modal?.mode === 'add') {
      const newShift: ApiShift = {
        id: genShId(), branch_id: form.branch_id,
        name: form.name, start_time: form.start_time, end_time: form.end_time,
        min_checkout: form.min_checkout || null,
        late_threshold: 5,
        late_threshold_1: form.late_threshold_1 || null, late_threshold_2: form.late_threshold_2 || null,
        late_fine_1: form.late_fine_1 || null, late_fine_2: form.late_fine_2 || null,
        shift_type: form.shift_type, is_active: true, branch: br,
      }
      setShifts(prev => [...prev, newShift])
      showToast('success', `เพิ่มกะ "${form.name}" สำเร็จ`)
    } else if (modal?.data) {
      setShifts(prev => prev.map(s => s.id === modal.data!.id
        ? { ...s, name: form.name, start_time: form.start_time, end_time: form.end_time,
            min_checkout: form.min_checkout || null, late_threshold_1: form.late_threshold_1 || null,
            late_threshold_2: form.late_threshold_2 || null, late_fine_1: form.late_fine_1 || null,
            late_fine_2: form.late_fine_2 || null, shift_type: form.shift_type }
        : s))
      showToast('success', `บันทึกกะ "${form.name}" เรียบร้อย`)
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await new Promise(r => setTimeout(r, 400))
    setShifts(prev => prev.filter(s => s.id !== deleteTarget.id))
    showToast('success', `ลบกะ "${deleteTarget.name}" เรียบร้อย`)
    setDeleteTarget(null)
  }

  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox: React.CSSProperties = {
    background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16,
    width: isMobile ? '100%' : 520, maxWidth: '92vw',
    maxHeight: isMobile ? '92vh' : '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  }

  return (
    <div>
      {/* Mock banner */}
      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.72rem', color: '#f97316', fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
        🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
      </div>

      {/* Header - Title removed */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', whiteSpace: 'nowrap' }}>
          + เพิ่มกะ
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'กะทั้งหมด',   value: shifts.length,                           emoji: '⏰', color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
          { label: 'กะที่เปิดงาน', value: shifts.filter(s => getShiftStatus(s) === 'active').length, emoji: '🟢', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'จำนวนสาขา',  value: branches.length,                          emoji: '🏢', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>{k.emoji}</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      {branches.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>กรองตามสาขา</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select 
              value={branchFilter} 
              onChange={e => setBranchFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', borderRadius: 10, border: '1px solid #e5e7eb', outline: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <option value="">ทุกสาขา</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

      {/* Shift cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, alignItems: 'stretch' }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ marginBottom: 12 }}>{shifts.length === 0 ? 'ยังไม่มีกะ' : 'ไม่พบกะในสาขาที่เลือก'}</p>
              {shifts.length === 0 && <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ เพิ่มกะแรก</button>}
            </div>
          )}
          {paginated.map(s => {
            const st     = getShiftStatus(s)
            const cfg    = STATUS_CFG[st]
            const empCnt = (shiftEmpMap[s.id] ?? []).length
            return (
            <div key={s.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${st === 'active' ? '#86efac' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: st === 'active' ? '0 2px 12px rgba(22,163,74,0.1)' : '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>

              {/* Card header */}
              <div style={{ background: st === 'active' ? '#f0fdf4' : st === 'upcoming' ? '#fffbeb' : '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 1 }}>{s.branch.name}</div>
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{cfg.dot}</span>{cfg.label}
                </span>
              </div>

              {/* Time grid — flex:1 ทำให้ card สูงเท่ากัน */}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem', flex: 1 }}>
                <TimeRow icon="🟢" label="เวลาเริ่มงาน" value={s.start_time} color="#15803d" />
                <TimeRow icon="🔴" label="เวลาเลิกงาน" value={s.end_time} color="#dc2626" />
                {s.min_checkout && <TimeRow icon="🔒" label="เช็คเอาท์ขั้นต่ำ" value={s.min_checkout} color="#7c3aed" />}
                {s.late_threshold_1 && <TimeRow icon="⚠️" label="สายระดับ 1" value={s.late_threshold_1} color="#d97706" />}
                {s.late_threshold_2 && <TimeRow icon="🚫" label="สายระดับ 2 / ขาด" value={s.late_threshold_2} color="#dc2626" />}
                {!s.late_threshold_1 && !s.late_threshold_2 && (
                  <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#9ca3af' }}>⏱ สายได้ {s.late_threshold} นาที</div>
                )}
              </div>

              {/* Actions — อยู่ล่างสุดเสมอ */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setEmpViewShift(s)}
                  style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                >
                  <Users size={13}/> พนักงาน{empCnt > 0 ? ` (${empCnt})` : ''}
                </button>
                <button onClick={() => openEdit(s)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Pencil size={13}/> แก้ไข</button>
                <button onClick={() => setDeleteTarget(s)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}><Trash2 size={13}/></button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginTop: 14 }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filtered.length)} จาก {filtered.length} กะ
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#9ca3af' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#9ca3af' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>
                {modal.mode === 'add' ? '+ เพิ่มกะใหม่' : `แก้ไขกะ: ${modal.data?.name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18}/></button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* สาขา */}
              {modal.mode === 'add' && (
                <div>
                  <label style={labelStyle}>สาขา *</label>
                  <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} style={inputStyle}>
                    <option value="">— เลือกสาขา —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              {/* ชื่อกะ */}
              <div>
                <label style={labelStyle}>ชื่อกะ *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น กะเช้า, กะบ่าย, กะดึก" style={inputStyle} />
              </div>

              {/* เวลาเข้า-ออก */}
              <div>
                <p style={sectionLabel}>เข้า–ออกงาน</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <TimeInput label="เวลาเริ่มงาน" value={form.start_time} onChange={v => setForm(f => ({ ...f, start_time: v }))} />
                  <TimeInput label="เวลาเลิกงาน" value={form.end_time} onChange={v => setForm(f => ({ ...f, end_time: v }))} />
                  <TimeInput label="เช็คเอาท์ขั้นต่ำ" value={form.min_checkout} onChange={v => setForm(f => ({ ...f, min_checkout: v }))}
                    sublabel="เช็คเอาท์ได้ตั้งแต่" />
                </div>
              </div>

              {/* ประเภทกะ */}
              <div>
                <label style={labelStyle}>ประเภทกะ</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['REGULAR', 'SPECIAL'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, shift_type: t }))}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: `2px solid ${form.shift_type === t ? '#4f46e5' : '#e5e7eb'}`, background: form.shift_type === t ? '#ede9fe' : '#fff', color: form.shift_type === t ? '#4f46e5' : '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      {t === 'REGULAR' ? '⏰ กะทั่วไป' : '⭐ กะพิเศษ'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6 }}>
                  {form.shift_type === 'REGULAR' ? 'Auto-detect จากเวลาสแกน — ไม่ทับซ้อนกับกะอื่น' : 'เงื่อนไขพิเศษ เช่น OT หรืองานนอกสถานที่'}
                </div>
              </div>

              {/* เกณฑ์การสาย */}
              <div>
                <p style={sectionLabel}>เกณฑ์การสาย & ค่าปรับ</p>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: '0.78rem', color: '#92400e', marginBottom: 10 }}>
                  ⚠️ ระดับ 1 = สาย · ระดับ 2 = <strong>เวลาปิดรับเช็คอิน</strong> (หลังจากนี้ถือว่าขาด)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TimeInput label="สายระดับ 1 (หลังจาก)" value={form.late_threshold_1}
                    onChange={v => setForm(f => ({ ...f, late_threshold_1: v }))} sublabel="เช่น 08:05" />
                  <TimeInput label="ปิดรับเช็คอิน / ขาด" value={form.late_threshold_2}
                    onChange={v => setForm(f => ({ ...f, late_threshold_2: v }))} sublabel="เช่น 08:30" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={labelStyle}>ค่าปรับสายระดับ 1 (บาท)</label>
                    <input type="number" min="0" step="50" value={form.late_fine_1}
                      onChange={e => setForm(f => ({ ...f, late_fine_1: e.target.value }))}
                      placeholder="เช่น 50" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>ค่าปรับสายระดับ 2 (บาท)</label>
                    <input type="number" min="0" step="50" value={form.late_fine_2}
                      onChange={e => setForm(f => ({ ...f, late_fine_2: e.target.value }))}
                      placeholder="เช่น 200" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {form.start_time && (
                <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>ตัวอย่างกะ "{form.name || '...'}"</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0', fontSize: '0.8rem' }}>
                    <span style={{ color: '#6b7280' }}>เริ่มงาน</span><span style={{ fontWeight: 700, color: '#15803d' }}>{form.start_time}</span>
                    {form.late_threshold_1 && <><span style={{ color: '#6b7280' }}>สายระดับ 1</span><span style={{ fontWeight: 700, color: '#d97706' }}>หลัง {form.late_threshold_1}</span></>}
                    {form.late_threshold_2 && <><span style={{ color: '#6b7280' }}>สายระดับ 2 / ขาด</span><span style={{ fontWeight: 700, color: '#dc2626' }}>หลัง {form.late_threshold_2}</span></>}
                    {form.min_checkout && <><span style={{ color: '#6b7280' }}>เช็คเอาท์ได้ตั้งแต่</span><span style={{ fontWeight: 700, color: '#7c3aed' }}>{form.min_checkout}</span></>}
                    <span style={{ color: '#6b7280' }}>เลิกงาน</span><span style={{ fontWeight: 700, color: '#dc2626' }}>{form.end_time}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : modal.mode === 'add' ? '+ เพิ่มกะ' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบกะ?"
          message={`"${deleteTarget.name}" (${deleteTarget.branch.name}) จะถูกลบออกจากระบบ`}
          confirmLabel="ลบกะ"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Employee Manage Modal */}
      {empViewShift && (() => {
        const inShift  = shiftEmpMap[empViewShift.id] ?? []
        const inShiftIds = new Set(inShift.map(e => e.id))
        const q = empSearch.trim().toLowerCase()
        const notInShift = MOCK_EMPLOYEES.filter(e =>
          !inShiftIds.has(e.id) &&
          (!q || e.full_name.toLowerCase().includes(q) || e.nickname.toLowerCase().includes(q) || e.code.includes(q))
        )
        const inShiftFiltered = inShift.filter(e =>
          !q || e.full_name.toLowerCase().includes(q) || e.nickname.toLowerCase().includes(q) || e.code.includes(q)
        )
        const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777']
        const avatarColor = (idx: number) => COLORS[idx % COLORS.length]
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
            onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in') }}
          >
            <div
              style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16, width: '100%', maxWidth: 460, maxHeight: isMobile ? '88vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{empViewShift.name} — {empViewShift.branch.name}</div>
                  <button onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18}/></button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {empViewShift.start_time} – {empViewShift.end_time} · {inShift.length} คน
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                {([['in', <><Users size={13}/> ในกะนี้ ({inShift.length})</>], ['add', <><UserPlus size={13}/> เพิ่มพนักงาน</>]] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => { setAddEmpTab(tab as 'in'|'add'); setEmpSearch('') }}
                    style={{ flex: 1, padding: '10px', fontSize: '0.8rem', fontWeight: addEmpTab === tab ? 700 : 400, border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${addEmpTab === tab ? '#4f46e5' : 'transparent'}`, color: addEmpTab === tab ? '#4f46e5' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', flexShrink: 0, position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                  value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ / ชื่อเล่น / รหัส..."
                  style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.8rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {addEmpTab === 'in' ? (
                  inShiftFiltered.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                      {inShift.length === 0 ? 'ยังไม่มีพนักงานในกะนี้' : 'ไม่พบพนักงานที่ค้นหา'}
                    </div>
                  ) : inShiftFiltered.map((e, idx) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(idx), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                        {e.nickname.slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>{e.nickname} · {e.department}</div>
                      </div>
                      <button
                        onClick={() => removeEmp(e.id, e.nickname)}
                        title="ย้ายออกจากกะ"
                        style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}
                      >
                        <UserMinus size={12}/> ย้ายออก
                      </button>
                    </div>
                  ))
                ) : (
                  notInShift.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                      {q ? 'ไม่พบพนักงานที่ค้นหา' : 'พนักงานทุกคนอยู่ในกะนี้แล้ว'}
                    </div>
                  ) : notInShift.map((e, idx) => {
                    const curShift = empShiftAssign[e.id] ? shifts.find(s => s.id === empShiftAssign[e.id]) : null
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(idx), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                          {e.nickname.slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.full_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>
                            {e.nickname} · {e.department}
                            {curShift && <span style={{ color: '#d97706' }}> · กำลังอยู่ใน {curShift.name}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => assignEmp(e.id, empViewShift.id)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}
                        >
                          <UserPlus size={12}/> เพิ่ม
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0, background: '#fafafa', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in') }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function TimeRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{icon} {label}</span>
      <span style={{ fontWeight: 700, color, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
