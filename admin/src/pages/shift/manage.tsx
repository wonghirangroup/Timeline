// admin/src/pages/shift/index.tsx  [MOCK MODE]
import { useState, useMemo, useEffect } from 'react'
import { Pencil, Trash2, X, Users, UserPlus, Search, UserMinus, ChevronLeft, ChevronRight, Clock, CheckCircle2, Building2, HelpCircle } from 'lucide-react'
import { useDemoStore } from '../../stores/demoStore'
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeDiff(base: string, target: string, mode: 'after' | 'before'): string {
  if (!base || !target) return ''
  const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  const d = mode === 'after' ? toMin(target) - toMin(base) : toMin(base) - toMin(target)
  if (d <= 0) return ''
  return mode === 'after' ? `+${d} นาที หลังเวลาเริ่มงาน` : `${d} นาที ก่อนเวลาเลิก`
}

// ── Tour ──────────────────────────────────────────────────────────────────────
interface ShiftTourStep { selector: string; title: string; body: string }

const SHIFT_TOUR_STEPS: ShiftTourStep[] = [
  { selector: 'shift-kpi',           title: '📊 ภาพรวมกะทำงาน',       body: 'ดูจำนวนกะทั้งหมด กะที่กำลังเปิดอยู่ตอนนี้ และจำนวนสาขาในระบบ — อัพเดทอัตโนมัติทุกครั้งที่เพิ่มหรือแก้ไขกะ' },
  { selector: 'shift-add-btn',       title: '➕ สร้างกะใหม่',          body: 'กดเพื่อเปิด form เพิ่มกะ — ตั้งชื่อ เวลาเข้า-ออก เช็คเอาท์ขั้นต่ำ เกณฑ์การสาย และค่าปรับ ระบบจะ preview ให้เห็นก่อนบันทึก' },
  { selector: 'shift-branch-filter', title: '🏢 กรองตามสาขา',          body: 'กดชื่อสาขาเพื่อดูเฉพาะกะของสาขานั้น · กด "ทุกสาขา" เพื่อดูทั้งหมด' },
  { selector: 'shift-card-0',        title: '📋 การ์ดกะ',              body: 'แต่ละการ์ดคือ 1 กะ — แสดงชื่อกะ สถานะปัจจุบัน เวลาเข้า-ออก เกณฑ์การสาย และจำนวนพนักงานที่อยู่ในกะนั้น' },
  { selector: 'shift-threshold-0',   title: '⚠️ เกณฑ์การสาย',          body: '🟢 เวลาเริ่มงาน · ⚠️ สายระดับ 1 = เวลาที่นับว่าสาย (หักเงิน) · 🚫 สายระดับ 2 / ขาด = ปิดรับเช็คอิน หลังจากนี้ถือว่าขาดงาน' },
  { selector: 'shift-actions-0',     title: '👥 จัดการพนักงานและกะ',   body: '"พนักงาน" = ดู/เพิ่ม/ถอดพนักงานออกจากกะ · "แก้ไข" = แก้ไขเวลาและเกณฑ์ · 🗑 = ลบกะออกจากระบบ' },
  { selector: 'shift-pagination',    title: '📄 เลื่อนดูกะอื่น',       body: 'ถ้ามีกะมากกว่าที่แสดง กดลูกศรหรือ dot เพื่อเลื่อนหน้า · บนมือถือปัดซ้าย-ขวาได้เลย' },
]

function ShiftTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; bottom: number; right: number; width: number; height: number } | null>(null)
  const PAD = 10

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${SHIFT_TOUR_STEPS[step].selector}"]`) as HTMLElement | null
    if (!el) { setRect(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const timer = setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height })
    }, 200)
    return () => clearTimeout(timer)
  }, [step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        setStep(s => s < SHIFT_TOUR_STEPS.length - 1 ? s + 1 : s)
        if (step === SHIFT_TOUR_STEPS.length - 1) onClose()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setStep(s => Math.max(0, s - 1))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, onClose])

  const TW = 304
  let tipTop = 80, tipLeft = 16
  if (rect) {
    const wh = window.innerHeight
    const belowOk = rect.bottom + PAD + 12 + 210 < wh
    tipTop  = belowOk ? rect.bottom + PAD + 12 : Math.max(70, rect.top - 210 - PAD)
    tipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - TW - 16))
  }

  const cur = SHIFT_TOUR_STEPS[step]
  const total = SHIFT_TOUR_STEPS.length

  return (
    <>
      <style>{`
        @keyframes stGlow{0%,100%{border-color:#f97316;box-shadow:0 0 0 5px rgba(249,115,22,0.18);}50%{border-color:#fbbf24;box-shadow:0 0 0 10px rgba(251,191,36,0.10);}}
        @keyframes stTipIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* 4-quadrant dim overlay */}
      {rect ? (
        <>
          <div onClick={onClose} style={{ position:'fixed',top:0,left:0,right:0,height:Math.max(0,rect.top-PAD),background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.bottom+PAD,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.top-PAD,left:0,width:Math.max(0,rect.left-PAD),height:rect.height+PAD*2,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.top-PAD,left:rect.right+PAD,right:0,height:rect.height+PAD*2,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
        </>
      ) : (
        <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
      )}

      {/* Animated spotlight ring — position:fixed so renders above all stacking contexts */}
      {rect && (
        <div style={{
          position:'fixed', pointerEvents:'none',
          top:rect.top-PAD, left:rect.left-PAD,
          width:rect.width+PAD*2, height:rect.height+PAD*2,
          borderRadius:12, border:'3px solid #f97316',
          zIndex:9001,
          animation:'stGlow 1.4s ease-in-out infinite',
        }} />
      )}

      {/* Tooltip card */}
      <div key={step} style={{
        position:'fixed', top:tipTop, left:tipLeft,
        width:TW, background:'#fff', borderRadius:16,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)',
        zIndex:9002, overflow:'hidden',
        animation:'stTipIn 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', padding:'14px 16px 12px', position:'relative' }}>
          <div style={{ fontWeight:800, color:'#fff', fontSize:'15px', lineHeight:1.3, paddingRight:44 }}>{cur.title}</div>
          <span style={{ position:'absolute', top:11, right:14, fontSize:'11px', color:'rgba(255,255,255,0.85)', fontWeight:700, background:'rgba(0,0,0,0.18)', borderRadius:99, padding:'2px 8px' }}>
            {step+1}/{total}
          </span>
        </div>
        <div style={{ padding:'12px 16px 8px', fontSize:'13px', color:'#374151', lineHeight:1.65 }}>{cur.body}</div>
        <div style={{ padding:'2px 16px 8px', display:'flex', gap:5 }}>
          {SHIFT_TOUR_STEPS.map((_,i) => (
            <button key={i} onClick={()=>setStep(i)} style={{
              width:i===step?20:7, height:7, borderRadius:99, border:'none', cursor:'pointer', padding:0,
              background:i===step?'#f97316':i<step?'#fed7aa':'#e5e7eb', transition:'all 0.25s',
            }}/>
          ))}
        </div>
        <div style={{ padding:'4px 16px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={onClose} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', color:'#9ca3af', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>✕ ปิด</button>
          <div style={{ display:'flex', gap:6 }}>
            {step > 0 && (
              <button onClick={()=>setStep(s=>s-1)} style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'#f9fafb', color:'#374151', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>← ก่อนหน้า</button>
            )}
            {step < total-1 ? (
              <button onClick={()=>setStep(s=>s+1)} style={{ padding:'7px 18px', borderRadius:8, border:'none', background:'#f97316', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>ถัดไป →</button>
            ) : (
              <button onClick={onClose} style={{ padding:'7px 18px', borderRadius:8, border:'none', background:'#16a34a', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>✓ เสร็จแล้ว!</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShiftPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const { employees: storeEmployees, addShift: storeAddShift, updateShift: storeUpdateShift, deleteShift: storeDeleteShift, updateEmployee: storeUpdateEmployee } = useDemoStore()

  const [shifts, setShifts]     = useState<ApiShift[]>(MOCK_SHIFTS_API)
  const [branches, setBranches] = useState<ApiBranch[]>(MOCK_BRANCHES_SH)
  const [loading, setLoading]   = useState(false)
  const [branchFilter, setBranchFilter] = useState('')
  
  const [page, setPage]         = useState(1)
  const pageSize                = isMobile ? 3 : 6
  const [swipeStart, setSwipeStart] = useState<number | null>(null)

  const [modal, setModal]       = useState<{ mode: 'add' | 'edit'; data: ApiShift | null } | null>(null)
  const [tourActive, setTourActive] = useState(false)

  useEffect(() => { if (tourActive) { setPage(1); setBranchFilter('') } }, [tourActive])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setModal(null); setEmpViewShift(null); setEmpSearch(''); setRemoveConfirm(null); setTourActive(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiShift | null>(null)
  const [empViewShift, setEmpViewShift] = useState<ApiShift | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const [addEmpTab, setAddEmpTab] = useState<'in' | 'add'>('in')
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)

  // mutable emp→shift mapping — init จาก demoStore employees เพื่อ sync กับ shift-schedule
  const [empShiftAssign, setEmpShiftAssign] = useState<Record<string, string | null>>(() => {
    const m: Record<string, string | null> = {}
    storeEmployees.forEach(e => { m[e.id] = e.default_shift_id ?? null })
    return m
  })

  const filtered = shifts.filter(s => !branchFilter || s.branch_id === branchFilter)
  
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [branchFilter])
  useEffect(() => { setPage(1) }, [pageSize])

  const shiftEmpMap = useMemo(() => {
    const map: Record<string, typeof storeEmployees> = {}
    storeEmployees.forEach(e => {
      const sid = empShiftAssign[e.id]
      if (!sid) return
      if (!map[sid]) map[sid] = []
      map[sid].push(e)
    })
    return map
  }, [empShiftAssign, storeEmployees])

  function assignEmp(empId: string, shiftId: string) {
    setEmpShiftAssign(prev => ({ ...prev, [empId]: shiftId }))
    storeUpdateEmployee(empId, { default_shift_id: shiftId })
    showToast('success', 'เพิ่มพนักงานเข้ากะแล้ว')
  }

  function removeEmp(empId: string, empName: string) {
    setEmpShiftAssign(prev => ({ ...prev, [empId]: null }))
    storeUpdateEmployee(empId, { default_shift_id: undefined })
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
      const newId = genShId()
      const newShift: ApiShift = {
        id: newId, branch_id: form.branch_id,
        name: form.name, start_time: form.start_time, end_time: form.end_time,
        min_checkout: form.min_checkout || null,
        late_threshold: 5,
        late_threshold_1: form.late_threshold_1 || null, late_threshold_2: form.late_threshold_2 || null,
        late_fine_1: form.late_fine_1 || null, late_fine_2: form.late_fine_2 || null,
        shift_type: form.shift_type, is_active: true, branch: br,
      }
      setShifts(prev => [...prev, newShift])
      storeAddShift({ id: newId, name: form.name, branch_name: br.name, start_time: form.start_time, end_time: form.end_time, late_threshold_1: form.late_threshold_1 || '', late_threshold_2: form.late_threshold_2 || '', employee_count: 0, shift_type: form.shift_type })
      showToast('success', `เพิ่มกะ "${form.name}" สำเร็จ`)
    } else if (modal?.data) {
      setShifts(prev => prev.map(s => s.id === modal.data!.id
        ? { ...s, name: form.name, start_time: form.start_time, end_time: form.end_time,
            min_checkout: form.min_checkout || null, late_threshold_1: form.late_threshold_1 || null,
            late_threshold_2: form.late_threshold_2 || null, late_fine_1: form.late_fine_1 || null,
            late_fine_2: form.late_fine_2 || null, shift_type: form.shift_type }
        : s))
      storeUpdateShift(modal.data.id, { name: form.name, start_time: form.start_time, end_time: form.end_time, late_threshold_1: form.late_threshold_1 || '', late_threshold_2: form.late_threshold_2 || '', shift_type: form.shift_type })
      showToast('success', `บันทึกกะ "${form.name}" เรียบร้อย`)
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await new Promise(r => setTimeout(r, 400))
    setShifts(prev => prev.filter(s => s.id !== deleteTarget.id))
    storeDeleteShift(deleteTarget.id)
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
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Mock banner */}
      <div style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '0.72rem', color: '#f97316', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
        🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
      </div>

      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => setTourActive(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <HelpCircle size={14} /> วิธีใช้
        </button>
        <button data-tour="shift-add-btn" onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', whiteSpace: 'nowrap' }}>
          + เพิ่มกะ
        </button>
      </div>

      {/* KPI row */}
      <div data-tour="shift-kpi" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'กะทั้งหมด',   value: shifts.length,                           icon: <Clock size={15}/>,        color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
          { label: 'กะที่เปิดงาน', value: shifts.filter(s => getShiftStatus(s) === 'active').length, icon: <CheckCircle2 size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'จำนวนสาขา',  value: branches.length,                          icon: <Building2 size={15}/>,    color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: k.color, display: 'flex' }}>{k.icon}</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      {branches.length > 1 && (
        <div data-tour="shift-branch-filter" style={{ flexShrink: 0, marginBottom: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>กรองตามสาขา</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ id: '', name: 'ทุกสาขา' }, ...branches].map(b => (
              <button
                key={b.id}
                onClick={() => setBranchFilter(b.id)}
                style={{
                  padding: '4px 14px', borderRadius: 99, border: 'none',
                  fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  background: branchFilter === b.id ? '#f97316' : '#f1f5f9',
                  color: branchFilter === b.id ? '#fff' : '#64748b',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cards + Pagination — fills remaining height, internal scroll only */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Scrollable cards area */}
      <div
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: 4 }}
        onTouchStart={e => setSwipeStart(e.touches[0].clientX)}
        onTouchEnd={e => {
          if (swipeStart === null) return
          const diff = swipeStart - e.changedTouches[0].clientX
          if (diff > 50)  setPage(p => Math.min(totalPages, p + 1))
          if (diff < -50) setPage(p => Math.max(1, p - 1))
          setSwipeStart(null)
        }}
      >
        {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, alignItems: 'stretch' }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ marginBottom: 12 }}>{shifts.length === 0 ? 'ยังไม่มีกะ' : 'ไม่พบกะในสาขาที่เลือก'}</p>
              {shifts.length === 0 && <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ เพิ่มกะแรก</button>}
            </div>
          )}
          {paginated.map((s, idx) => {
            const st         = getShiftStatus(s)
            const cfg        = STATUS_CFG[st]
            const empCnt     = (shiftEmpMap[s.id] ?? []).length
            const isSpecial  = s.shift_type === 'SPECIAL'
            const cardBorder = isSpecial ? '#c4b5fd' : st === 'active' ? '#86efac' : '#f1f5f9'
            const cardShadow = isSpecial ? '0 2px 12px rgba(124,58,237,0.1)' : st === 'active' ? '0 2px 12px rgba(22,163,74,0.1)' : '0 2px 12px rgba(0,0,0,0.04)'
            const headerBg   = isSpecial ? '#f5f3ff' : st === 'active' ? '#f0fdf4' : st === 'upcoming' ? '#fffbeb' : '#f9fafb'
            return (
            <div key={s.id} data-tour={idx === 0 ? 'shift-card-0' : undefined} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${cardBorder}`, overflow: 'hidden', boxShadow: cardShadow, display: 'flex', flexDirection: 'column' }}>

              {/* Card header */}
              <div style={{ background: headerBg, padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSpecial && <span style={{ fontSize: '11px', background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '2px 7px', fontWeight: 700, lineHeight: 1.4 }}>⭐ พิเศษ</span>}
                    {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 1 }}>{s.branch.name}</div>
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{cfg.dot}</span>{cfg.label}
                </span>
              </div>

              {/* Time grid — flex:1 ทำให้ card สูงเท่ากัน */}
              <div data-tour={idx === 0 ? 'shift-threshold-0' : undefined} style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem', flex: 1 }}>
                <TimeRow icon="🟢" label="เวลาเริ่มงาน" value={s.start_time} color="#15803d" />
                <TimeRow icon="🔴" label="เวลาเลิกงาน" value={s.end_time} color="#dc2626" />
                {s.min_checkout && <TimeRow icon="🔒" label="เช็คเอาท์ได้ตั้งแต่" value={s.min_checkout} color="#7c3aed" />}
                {!isSpecial && s.late_threshold_1 && <TimeRow icon="⚠️" label="สายระดับ 1" value={s.late_threshold_1} color="#d97706" />}
                {!isSpecial && s.late_threshold_2 && <TimeRow icon="🚫" label="ปิดรับเช็คอิน" value={s.late_threshold_2} color="#dc2626" />}
                {!isSpecial && !s.late_threshold_1 && !s.late_threshold_2 && (
                  <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#9ca3af' }}>⏱ สายได้ {s.late_threshold} นาที</div>
                )}
                {isSpecial && (
                  <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', borderRadius: 6, padding: '5px 8px', marginTop: 2 }}>
                    ⭐ ทับซ้อนกะปกติได้ · ไม่นับสาย · เหมาะสำหรับ OT หรืองานนอกสถานที่
                  </div>
                )}
              </div>

              {/* Actions — อยู่ล่างสุดเสมอ */}
              <div data-tour={idx === 0 ? 'shift-actions-0' : undefined} style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
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
      </div>{/* end scrollable cards */}

      {/* Pagination — always pinned at bottom */}
      {!loading && (
        <div data-tour="shift-pagination" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginTop: 10 }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {filtered.length === 0
              ? 'ไม่มีกะ'
              : `หน้า ${page}/${totalPages} · ${filtered.length} กะ`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '5px 10px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            ><ChevronLeft size={15}/></button>
            {/* Page dots */}
            <div style={{ display: 'flex', gap: 5 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{ width: page === i + 1 ? 20 : 8, height: 8, borderRadius: 99, border: 'none', padding: 0, cursor: 'pointer', background: page === i + 1 ? '#f97316' : '#e5e7eb', transition: 'all 0.2s' }}
                />
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '5px 10px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
            ><ChevronRight size={15}/></button>
          </div>
        </div>
      )}

      </div>{/* end cards + pagination wrapper */}

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
                  <TimeInput label="เช็คเอาท์ได้ตั้งแต่" value={form.min_checkout} onChange={v => setForm(f => ({ ...f, min_checkout: v }))}
                    sublabel={timeDiff(form.end_time, form.min_checkout, 'before') || 'กำหนดเวลาเร็วสุดที่เช็คเอาท์ได้'} />
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
                  <TimeInput label="สายระดับ 1" value={form.late_threshold_1}
                    onChange={v => setForm(f => ({ ...f, late_threshold_1: v }))}
                    sublabel={timeDiff(form.start_time, form.late_threshold_1, 'after') || 'เช่น 08:05'} />
                  <TimeInput label="ปิดรับเช็คอิน" value={form.late_threshold_2}
                    onChange={v => setForm(f => ({ ...f, late_threshold_2: v }))}
                    sublabel={timeDiff(form.start_time, form.late_threshold_2, 'after') || 'เช่น 08:30'} />
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
                    {form.late_threshold_2 && <><span style={{ color: '#6b7280' }}>ปิดรับเช็คอิน</span><span style={{ fontWeight: 700, color: '#dc2626' }}>หลัง {form.late_threshold_2}</span></>}
                    {form.min_checkout && <><span style={{ color: '#6b7280' }}>เช็คเอาท์ได้ตั้งแต่</span><span style={{ fontWeight: 700, color: '#7c3aed' }}>{form.min_checkout}</span></>}
                    <span style={{ color: '#6b7280' }}>เลิกงาน</span><span style={{ fontWeight: 700, color: '#dc2626' }}>{form.end_time}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : modal.mode === 'add' ? '+ เพิ่มกะ' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (() => {
        const empCount = (shiftEmpMap[deleteTarget.id] ?? []).length
        return (
          <ConfirmDialog
            title="ลบกะ?"
            message={empCount > 0
              ? `"${deleteTarget.name}" (${deleteTarget.branch.name}) มีพนักงาน ${empCount} คนอยู่ในกะนี้ — ถ้าลบ พนักงานเหล่านี้จะไม่มีกะประจำ`
              : `"${deleteTarget.name}" (${deleteTarget.branch.name}) จะถูกลบออกจากระบบ`
            }
            confirmLabel="ลบกะ"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )
      })()}

      {/* Employee Manage Modal */}
      {empViewShift && (() => {
        const inShift  = shiftEmpMap[empViewShift.id] ?? []
        const inShiftIds = new Set(inShift.map(e => e.id))
        const q = empSearch.trim().toLowerCase()
        const notInShift = storeEmployees.filter(e =>
          !inShiftIds.has(e.id) &&
          e.branches.includes(empViewShift.branch.name) &&
          (!q || e.full_name.toLowerCase().includes(q) || e.nickname.toLowerCase().includes(q) || e.code.includes(q))
        )
        const inShiftFiltered = inShift.filter(e =>
          !q || e.full_name.toLowerCase().includes(q) || e.nickname.toLowerCase().includes(q) || e.code.includes(q)
        )
        const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777']
        const avatarColor = (idx: number) => COLORS[idx % COLORS.length]
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
            onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in'); setRemoveConfirm(null) }}
          >
            <div
              style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16, width: '100%', maxWidth: 520, maxHeight: isMobile ? '88vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{empViewShift.name} — {empViewShift.branch.name}</div>
                  <button onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in'); setRemoveConfirm(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18}/></button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {empViewShift.start_time} – {empViewShift.end_time} · {inShift.length} คน
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                {([
                  ['in',  <><Users size={13}/> ในกะนี้ ({inShift.length})</>],
                  ['add', <><UserPlus size={13}/> เพิ่มพนักงาน {storeEmployees.filter(e => !inShiftIds.has(e.id) && e.branches.includes(empViewShift.branch.name)).length > 0 && <span style={{ background: '#f1f5f9', borderRadius: 99, padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700, color: '#6b7280' }}>{storeEmployees.filter(e => !inShiftIds.has(e.id) && e.branches.includes(empViewShift.branch.name)).length}</span>}</>],
                ] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => { setAddEmpTab(tab as 'in'|'add'); setEmpSearch(''); setRemoveConfirm(null) }}
                    style={{ flex: 1, padding: '10px', fontSize: '0.8rem', fontWeight: addEmpTab === tab ? 700 : 400, border: 'none', background: 'none', cursor: 'pointer', borderBottom: `2px solid ${addEmpTab === tab ? '#f97316' : 'transparent'}`, color: addEmpTab === tab ? '#f97316' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
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
              <div style={{ overflowY: 'auto', flex: 1, overscrollBehavior: 'contain', position: 'relative' }}>
                {addEmpTab === 'in' ? (
                  inShiftFiltered.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                      {inShift.length === 0 ? 'ยังไม่มีพนักงานในกะนี้' : 'ไม่พบพนักงานที่ค้นหา'}
                    </div>
                  ) : inShiftFiltered.map((e, idx) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(idx), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                        {e.nickname.slice(0, 2)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>{e.nickname} · {e.department}</div>
                      </div>
                      {removeConfirm === e.id ? (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => { removeEmp(e.id, e.nickname); setRemoveConfirm(null) }}
                            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                          >ยืนยัน</button>
                          <button
                            onClick={() => setRemoveConfirm(null)}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                          >ยกเลิก</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRemoveConfirm(e.id)}
                          title="ย้ายออกจากกะ"
                          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}
                        >
                          <UserMinus size={12}/> ย้ายออก
                        </button>
                      )}
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
                            {curShift && empViewShift.shift_type === 'SPECIAL' && <span style={{ color: '#7c3aed' }}> · กะประจำ: {curShift.name}</span>}
                            {curShift && empViewShift.shift_type !== 'SPECIAL' && <span style={{ color: '#d97706' }}> · กำลังอยู่ใน {curShift.name}</span>}
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
                <button onClick={() => { setEmpViewShift(null); setEmpSearch(''); setAddEmpTab('in'); setRemoveConfirm(null) }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Guided tour */}
      {tourActive && <ShiftTour onClose={() => setTourActive(false)} />}
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
