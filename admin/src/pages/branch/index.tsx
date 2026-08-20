import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Building2, QrCode, X, Check, MapPin, Map, ChevronLeft, ChevronRight, CheckCircle2, Users, HelpCircle, Clock, ChevronsRight, Pencil, Trash2, AlarmClock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useSwipePage } from '../../hooks/useSwipePage'
import { api } from '../../lib/axios'
import ManageShiftTab from '../shift/manage'

interface ApiBranch {
  id: string
  name: string
  location: string | null
  lat: string | null
  lng: string | null
  gps_radius: number
  geo_mode: 'WARN' | 'BLOCK'
  is_active: boolean
  created_at: string
  _count: { employees: number; shifts: number }
}

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
  absent_threshold: string | null
  absent_fine: string | null
  shift_type: 'REGULAR' | 'SPECIAL'
  gps_radius: number | null
  is_active: boolean
  branch: { id: string; name: string }
}

interface ApiEmployee {
  id: string
  first_name: string
  last_name: string
  nickname: string | null
  department: string | null
  branch_id: string
  branch: { id: string; name: string }
  default_shift_id: string | null
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
  inactive: { label: 'ปิดใช้งาน',   color: 'var(--text-muted)', bg: '#f3f4f6', dot: '○' },
  upcoming: { label: 'ยังไม่เริ่ม', color: '#d97706', bg: '#fef3c7', dot: '◷' },
  active:   { label: 'กำลังทำงาน',  color: '#16a34a', bg: '#dcfce7', dot: '●' },
  done:     { label: 'เลิกงานแล้ว', color: '#6366f1', bg: '#eef2ff', dot: '✓' },
}

const SHIFT_EMPTY = {
  name: '', start_time: '08:00', end_time: '18:00',
  min_checkout: '17:55', late_threshold_1: '08:05', late_threshold_2: '08:30',
  late_fine_1: '', late_fine_2: '',
  absent_threshold: '', absent_fine: '',
  shift_type: 'REGULAR' as 'REGULAR' | 'SPECIAL',
  gps_radius: '' as string | number,
}

const shiftInputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const shiftLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block',
}

function toMins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function timeDiffLabel(base: string, target: string): string {
  if (!base || !target) return ''
  const d = toMins(target) - toMins(base)
  return d > 0 ? `+${d} นาทีหลังเริ่มงาน` : ''
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}


const QR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23fff"/><rect x="10" y="10" width="50" height="50" rx="4" fill="%23111"/><rect x="18" y="18" width="34" height="34" rx="2" fill="%23fff"/><rect x="24" y="24" width="22" height="22" rx="1" fill="%23111"/><rect x="100" y="10" width="50" height="50" rx="4" fill="%23111"/><rect x="108" y="18" width="34" height="34" rx="2" fill="%23fff"/><rect x="114" y="24" width="22" height="22" rx="1" fill="%23111"/><rect x="10" y="100" width="50" height="50" rx="4" fill="%23111"/><rect x="18" y="108" width="34" height="34" rx="2" fill="%23fff"/><rect x="24" y="114" width="22" height="22" rx="1" fill="%23111"/><rect x="72" y="10" width="8" height="8" fill="%23111"/><rect x="72" y="24" width="8" height="8" fill="%23111"/><rect x="72" y="38" width="8" height="8" fill="%23111"/><rect x="72" y="52" width="8" height="8" fill="%23111"/><rect x="86" y="10" width="8" height="8" fill="%23111"/><rect x="86" y="38" width="8" height="8" fill="%23111"/><rect x="72" y="72" width="8" height="8" fill="%23111"/><rect x="86" y="72" width="8" height="8" fill="%23111"/><rect x="100" y="72" width="8" height="8" fill="%23111"/><rect x="114" y="72" width="8" height="8" fill="%23111"/><rect x="128" y="72" width="8" height="8" fill="%23111"/><rect x="142" y="72" width="8" height="8" fill="%23111"/><rect x="72" y="86" width="8" height="8" fill="%23111"/><rect x="100" y="86" width="8" height="8" fill="%23111"/><rect x="128" y="86" width="8" height="8" fill="%23111"/><rect x="72" y="100" width="8" height="8" fill="%23111"/><rect x="86" y="100" width="8" height="8" fill="%23111"/><rect x="100" y="100" width="8" height="8" fill="%23111"/><rect x="128" y="100" width="8" height="8" fill="%23111"/><rect x="142" y="100" width="8" height="8" fill="%23111"/><rect x="72" y="114" width="8" height="8" fill="%23111"/><rect x="114" y="114" width="8" height="8" fill="%23111"/><rect x="72" y="128" width="8" height="8" fill="%23111"/><rect x="86" y="128" width="8" height="8" fill="%23111"/><rect x="100" y="128" width="8" height="8" fill="%23111"/><rect x="128" y="128" width="8" height="8" fill="%23111"/><rect x="142" y="142" width="8" height="8" fill="%23111"/></svg>`

type ModalMode = 'add' | 'edit' | 'qr' | null

// ── Branch Tour ────────────────────────────────────────────────────────────────
const BRANCH_TOUR_STEPS = [
  { selector: 'branch-kpi',     title: '📊 ภาพรวมสาขา',       body: 'ดูจำนวนสาขาทั้งหมด สาขาที่เปิดใช้งาน และพนักงานรวมทุกสาขา — อัพเดทอัตโนมัติทุกครั้งที่เพิ่มหรือแก้ไขสาขา' },
  { selector: 'branch-add-btn', title: '➕ เพิ่มสาขาใหม่',     body: 'เปิด wizard 3 ขั้นตอน — ตั้งชื่อและที่อยู่ → ปักหมุด GPS (กดดึงตำแหน่ง หรือคลิกบนแมพ) → กำหนดรัศมี Geofencing ที่พนักงานจะเช็คอินได้' },
  { selector: 'branch-card-0',  title: '🏢 การ์ดสาขา',         body: 'แต่ละการ์ดคือ 1 สาขา — แสดงชื่อ จำนวนพนักงานและกะ ที่อยู่ และสถานะเปิด/ปิด' },
  { selector: 'branch-qr-0',    title: '📱 QR Code เช็คอิน',   body: 'พิมพ์ QR แล้วติดไว้ที่สาขา พนักงานสแกนผ่าน LINE เพื่อเช็คอิน — ระบบ detect กะจากเวลาที่สแกนอัตโนมัติ ไม่ต้องเลือกเอง' },
  { selector: 'branch-geo-0',   title: '🌐 GPS & Geofencing',  body: 'รัศมีที่กำหนดคือขอบเขตที่พนักงานต้องอยู่ใน · ⚠️ WARN = เช็คอินได้แต่บันทึกว่า "นอกพื้นที่" · 🚫 BLOCK = เช็คอินไม่ได้ถ้าอยู่นอกพื้นที่' },
]

function BranchTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState(0)
  const [rect, setRect] = React.useState<{ top: number; left: number; bottom: number; right: number; width: number; height: number } | null>(null)
  const PAD = 10

  React.useEffect(() => {
    const el = document.querySelector(`[data-tour="${BRANCH_TOUR_STEPS[step].selector}"]`) as HTMLElement | null
    if (!el) { setRect(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const timer = setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height })
    }, 200)
    return () => clearTimeout(timer)
  }, [step])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (step === BRANCH_TOUR_STEPS.length - 1) { onClose(); return }
        setStep(s => s + 1)
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

  const cur   = BRANCH_TOUR_STEPS[step]
  const total = BRANCH_TOUR_STEPS.length

  return (
    <>
      <style>{`
        @keyframes btGlow{0%,100%{border-color:#f97316;box-shadow:0 0 0 5px rgba(249,115,22,0.18);}50%{border-color:#fbbf24;box-shadow:0 0 0 10px rgba(251,191,36,0.10);}}
        @keyframes btTipIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
      `}</style>

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

      {rect && (
        <div style={{ position:'fixed',pointerEvents:'none',top:rect.top-PAD,left:rect.left-PAD,width:rect.width+PAD*2,height:rect.height+PAD*2,borderRadius:12,border:'3px solid #f97316',zIndex:9001,animation:'btGlow 1.4s ease-in-out infinite' }} />
      )}

      <div key={step} style={{ position:'fixed',top:tipTop,left:tipLeft,width:TW,background:'#fff',borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',zIndex:9002,overflow:'hidden',animation:'btTipIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ background:'linear-gradient(135deg,#f97316,#ea580c)',padding:'14px 16px 12px',position:'relative' }}>
          <div style={{ fontWeight:800,color:'#fff',fontSize:'15px',lineHeight:1.3,paddingRight:44 }}>{cur.title}</div>
          <span style={{ position:'absolute',top:11,right:14,fontSize:'11px',color:'rgba(255,255,255,0.85)',fontWeight:700,background:'rgba(0,0,0,0.18)',borderRadius:99,padding:'2px 8px' }}>{step+1}/{total}</span>
        </div>
        <div style={{ padding:'12px 16px 8px',fontSize:'13px',color:'#374151',lineHeight:1.65 }}>{cur.body}</div>
        <div style={{ padding:'2px 16px 8px',display:'flex',gap:5 }}>
          {BRANCH_TOUR_STEPS.map((_,i) => (
            <button key={i} onClick={()=>setStep(i)} style={{ width:i===step?20:7,height:7,borderRadius:99,border:'none',cursor:'pointer',padding:0,background:i===step?'#f97316':i<step?'#fed7aa':'#e5e7eb',transition:'all 0.25s' }} />
          ))}
        </div>
        <div style={{ padding:'4px 16px 14px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <button onClick={onClose} style={{ padding:'7px 10px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',fontFamily:'inherit' }}>✕ ปิด</button>
          <div style={{ display:'flex',gap:6 }}>
            {step > 0 && (
              <button onClick={()=>setStep(s=>s-1)} style={{ padding:'7px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f9fafb',color:'#374151',fontSize:'12px',cursor:'pointer',fontFamily:'inherit' }}>← ก่อนหน้า</button>
            )}
            {step < total-1 ? (
              <button onClick={()=>setStep(s=>s+1)} style={{ padding:'7px 18px',borderRadius:8,border:'none',background:'#f97316',color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer',fontFamily:'inherit' }}>ถัดไป →</button>
            ) : (
              <button onClick={onClose} style={{ padding:'7px 18px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer',fontFamily:'inherit' }}>✓ เสร็จแล้ว!</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function BranchPage() {
  const [activeTab, setActiveTab] = useState<'branch' | 'shift'>('branch')
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const qc = useQueryClient()
  const swipeHandlers = useSwipePage(
    () => setPage(p => Math.min(totalPages, p + 1)),
    () => setPage(p => Math.max(1, p - 1)),
  )

  const { data: branches = [], isLoading: loading } = useQuery<ApiBranch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: allShifts = [] } = useQuery<ApiShift[]>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/api/v1/admin/shifts').then(r => r.data.data),
  })
  const { data: allEmployees = [] } = useQuery<ApiEmployee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/branches', body).then(r => r.data.data),
    onSuccess: async (branch: any) => {
      for (const s of pendingShifts) {
        await api.post('/api/v1/admin/shifts', { ...s, branch_id: branch.id }).catch(() => {})
      }
      qc.invalidateQueries({ queryKey: ['branches'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
      showToast('success', `เพิ่มสาขา "${form.name}" เรียบร้อยแล้ว${pendingShifts.length > 0 ? ` พร้อม ${pendingShifts.length} กะ` : ''}`)
      setModal(null); setSaving(false); setPendingShifts([])
    },
    onError: () => { showToast('error', 'เพิ่มสาขาไม่สำเร็จ'); setSaving(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/branches/${id}`, body).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); showToast('success', `บันทึกสาขา "${form.name}" เรียบร้อยแล้ว`); setModal(null); setSaving(false) },
    onError: () => { showToast('error', 'บันทึกสาขาไม่สำเร็จ'); setSaving(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); showToast('success', `ลบสาขา "${deleteTarget?.name}" เรียบร้อยแล้ว`); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบสาขาไม่สำเร็จ'),
  })

  const [modal, setModal]         = useState<ModalMode>(null)
  const [detailShift, setDetailShift] = useState<ApiShift | null>(null)
  const [showAddEmpToShift, setShowAddEmpToShift] = useState(false)
  const [shiftEmpSearch, setShiftEmpSearch] = useState('')
  const [selectedAddIds, setSelectedAddIds] = useState<Set<string>>(new Set())
  const [addShiftBranch, setAddShiftBranch] = useState<ApiBranch | null>(null)
  const [shiftForm, setShiftForm] = useState(SHIFT_EMPTY)
  const [shiftSaving, setShiftSaving] = useState(false)

  const createShiftMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/shifts', body).then(r => r.data.data),
    onSuccess: (_, body: any) => {
      qc.invalidateQueries({ queryKey: ['shifts'] })
      qc.invalidateQueries({ queryKey: ['branches'] })
      showToast('success', `เพิ่มกะ "${body.name}" สำเร็จ`)
      setShiftSaving(false)
      setAddShiftBranch(null)
    },
    onError: () => { showToast('error', 'เพิ่มกะไม่สำเร็จ'); setShiftSaving(false) },
  })

  // ตั้ง/ถอด "กะที่สังกัด" ของพนักงาน — informational เท่านั้น ไม่กระทบการเช็คอินจริง
  const assignShiftMutation = useMutation({
    mutationFn: ({ employeeId, shiftId }: { employeeId: string; shiftId: string | null }) =>
      api.patch(`/api/v1/admin/employees/${employeeId}`, { default_shift_id: shiftId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    onError: () => showToast('error', 'อัปเดตพนักงานไม่สำเร็จ'),
  })
  const bulkAssignShiftMutation = useMutation({
    mutationFn: ({ employeeIds, shiftId }: { employeeIds: string[]; shiftId: string }) =>
      Promise.all(employeeIds.map(id => api.patch(`/api/v1/admin/employees/${id}`, { default_shift_id: shiftId }))),
    onSuccess: (_, { employeeIds }) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', `เพิ่ม ${employeeIds.length} คนเข้ากะแล้ว`)
      setSelectedAddIds(new Set())
    },
    onError: () => showToast('error', 'เพิ่มพนักงานไม่สำเร็จ'),
  })

  const [page, setPage]           = useState(1)
  const pageSize                  = 6

  const [qrTarget, setQrTarget]   = useState<ApiBranch | null>(null)
  const [editTarget, setEditTarget] = useState<ApiBranch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiBranch | null>(null)
  const [form, setForm]           = useState({ name: '', location: '', lat: '', lng: '', gps_radius: '200', geo_mode: 'WARN' as 'WARN' | 'BLOCK' })

  const [tourActive, setTourActive] = React.useState(false)
  useEffect(() => { if (tourActive) setPage(1) }, [tourActive])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDetailShift(null); setAddShiftBranch(null); setModal(null); setMapModal(false); setTourActive(false) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const [saving, setSaving]       = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [step, setStep]           = useState(1)
  const [pendingShifts, setPendingShifts] = useState<Array<{ name: string; start_time: string; end_time: string; shift_type: 'REGULAR' | 'SPECIAL' }>>([])
  const [wShift, setWShift]       = useState({ name: '', start_time: '08:00', end_time: '17:00', shift_type: 'REGULAR' as 'REGULAR' | 'SPECIAL' })
  const [showInfo, setShowInfo]   = useState(false)
  const [mapModal, setMapModal]   = useState(false)
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null)

  const mapContainerRef   = useRef<HTMLDivElement>(null)
  const leafletMapRef     = useRef<any>(null)
  const leafletMarkerRef  = useRef<any>(null)
  const leafletLoadedRef  = useRef(false)

  // QR state
  const [qrCopied, setQrCopied] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(branches.length / pageSize)
  const paginated = branches.slice((page - 1) * pageSize, page * pageSize)

  // ── Leaflet Map Picker ─────────────────────────────────────────────────────
  const openMapPicker = useCallback(() => {
    setPickedCoords(
      form.lat && form.lng && !isNaN(parseFloat(form.lat))
        ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
        : null
    )
    setMapModal(true)
  }, [form.lat, form.lng])

  useEffect(() => {
    if (!mapModal) {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        leafletMarkerRef.current = null
      }
      return
    }

    const initLeaflet = () => {
      const L = (window as any).L
      if (!mapContainerRef.current || leafletMapRef.current) return

      const centerLat = form.lat && !isNaN(parseFloat(form.lat)) ? parseFloat(form.lat) : 15.0
      const centerLng = form.lng && !isNaN(parseFloat(form.lng)) ? parseFloat(form.lng) : 102.1

      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map)

      if (form.lat && form.lng && !isNaN(parseFloat(form.lat))) {
        leafletMarkerRef.current = L.marker([centerLat, centerLng]).addTo(map)
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        if (leafletMarkerRef.current) {
          leafletMarkerRef.current.setLatLng([lat, lng])
        } else {
          leafletMarkerRef.current = L.marker([lat, lng]).addTo(map)
        }
        setPickedCoords({ lat, lng })
      })

      leafletMapRef.current = map
    }

    const tid = setTimeout(() => {
      if ((window as any).L) {
        initLeaflet()
      } else if (!leafletLoadedRef.current) {
        leafletLoadedRef.current = true
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = initLeaflet
        document.head.appendChild(script)
      } else {
        // already loading — poll until ready
        const poll = setInterval(() => {
          if ((window as any).L) { clearInterval(poll); initLeaflet() }
        }, 100)
      }
    }, 50)

    return () => clearTimeout(tid)
  }, [mapModal]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPickedCoords = () => {
    if (!pickedCoords) return
    setForm(f => ({ ...f, lat: pickedCoords.lat.toFixed(7), lng: pickedCoords.lng.toFixed(7) }))
    setMapModal(false)
    showToast('success', `ปักหมุดพิกัด ${pickedCoords.lat.toFixed(6)}, ${pickedCoords.lng.toFixed(6)} สำเร็จ`)
  }

  const openAdd = () => {
    setForm({ name: '', location: '', lat: '', lng: '', gps_radius: '200', geo_mode: 'WARN' })
    setEditTarget(null)
    setStep(1)
    setShowInfo(false)
    setPendingShifts([])
    setWShift({ name: '', start_time: '08:00', end_time: '17:00', shift_type: 'REGULAR' })
    setModal('add')
  }

  const openEdit = (b: ApiBranch) => {
    setForm({ name: b.name, location: b.location ?? '', lat: b.lat ?? '', lng: b.lng ?? '', gps_radius: String(b.gps_radius ?? 200), geo_mode: b.geo_mode ?? 'WARN' })
    setEditTarget(b)
    setStep(1)
    setShowInfo(false)
    setModal('edit')
  }

  const openQr = (b: ApiBranch) => {
    setQrTarget(b)
    setModal('qr')
  }

  const qrQ = useQuery({
    queryKey: ['branch-qr', qrTarget?.id],
    queryFn:  () => api.get(`/api/v1/admin/branches/${qrTarget!.id}/qr`)
      .then(r => r.data.data ?? null),
    enabled: modal === 'qr' && !!qrTarget,
    staleTime: Infinity,   // QR ถาวร ไม่ต้อง refetch
  })

  const qrPayload = qrQ.data?.payload
  const qrString  = qrPayload ? JSON.stringify(qrPayload) : ''

  function getQrSvg() { return qrWrapRef.current?.querySelector('svg') ?? null }

  function handleQrDownload() {
    const svg = getQrSvg(); if (!svg || !qrTarget) return
    const size = 400
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `QR_${qrTarget!.name}.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)
  }

  function handleQrPrint() {
    const svg = getQrSvg(); if (!svg || !qrTarget) return
    const b = qrQ.data?.branch
    const win = window.open('', '_blank')!
    win.document.write(`<html><head><title>QR — ${qrTarget.name}</title>
      <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px;background:#fff}
      .title{font-size:22px;font-weight:800;color:#1e293b;margin:0 0 4px}
      .sub{font-size:14px;color:#6b7280;margin:0 0 20px}
      svg{border:2px solid #f3f4f6;border-radius:12px;padding:16px}
      .meta{margin-top:20px;display:flex;gap:24px;font-size:13px;color:#374151}
      .expire{margin-top:12px;font-size:11px;color:#9ca3af;text-align:center}</style>
      </head><body>
      <div class="title">${qrTarget.name}</div>
      <div class="sub">${b?.location ?? ''}</div>
      ${svg.outerHTML}
      <div class="meta">
        <span>📍 รัศมี ${b?.gps_radius ?? qrTarget.gps_radius} เมตร</span>
      </div>
      <div class="expire">QR Code ถาวร · สแกนผ่าน LINE เพื่อเช็คอิน<br/>ระบบตรวจจับกะอัตโนมัติจากเวลาที่สแกน</div>
      </body></html>`)
    win.document.close(); win.print()
  }

  function handleQrCopy() {
    if (!qrString) return
    navigator.clipboard.writeText(qrString)
    setQrCopied(true); setTimeout(() => setQrCopied(false), 2000)
  }

  const getGPS = () => {
    if (!navigator.geolocation) { showToast('error', 'เบราว์เซอร์นี้ไม่รองรับ GPS'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) }))
        setGpsLoading(false)
        showToast('success', 'ดึงตำแหน่งสำเร็จ')
      },
      () => { showToast('error', 'ไม่สามารถดึงตำแหน่งได้ — กรุณาอนุญาต GPS'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      name: form.name,
      location: form.location || undefined,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      gps_radius: parseInt(form.gps_radius) || 200,
      geo_mode: form.geo_mode,
    }
    if (modal === 'add') {
      createMutation.mutate(body)
    } else if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id)
  }

  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox = (w = 480): React.CSSProperties => ({
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : 16,
    width: isMobile ? '100%' : w,
    maxWidth: isMobile ? '100%' : '92vw',
    paddingBottom: isMobile ? 'max(0px, env(safe-area-inset-bottom))' : 0,
    maxHeight: isMobile ? '92vh' : 'min(88vh, 780px)',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 4, overflowX: 'auto' }}>
        {([
          { id: 'branch', label: 'สาขา',      icon: <Building2 size={15}/>, color: '#f97316', activeBg: '#fff7ed', activeBorder: '#f97316' },
          { id: 'shift',  label: 'จัดการกะ',  icon: <Clock size={15}/>,     color: '#6366f1', activeBg: '#eef2ff', activeBorder: '#6366f1' },
        ] as const).map(t => {
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: isActive ? 700 : 600,
              color: isActive ? t.color : 'var(--text-muted)',
              background: isActive ? t.activeBg : 'transparent',
              borderBottom: `3px solid ${isActive ? t.activeBorder : 'transparent'}`,
              borderRadius: '8px 8px 0 0', marginBottom: -4, transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}>
              <span style={{ color: isActive ? t.color : 'var(--text-muted)', display: 'flex' }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* จัดการกะ tab */}
      {activeTab === 'shift' && <ManageShiftTab />}

      {/* สาขา tab */}
      {activeTab === 'branch' && <>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTourActive(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <HelpCircle size={14} /> วิธีใช้
        </button>
        <button data-tour="branch-add-btn" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', whiteSpace: 'nowrap' }}>
          <Plus size={14} />
          เพิ่มสาขา
        </button>
      </div>

      {/* KPI row */}
      <div data-tour="branch-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: isMobile ? 8 : 10 }}>
        {[
          { label: 'ทั้งหมด',     value: branches.length,                               icon: <Building2 size={15}/>,   color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
          { label: 'เปิดใช้งาน', value: branches.filter(b => b.is_active).length,       icon: <CheckCircle2 size={15}/>, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'พนักงานรวม',  value: branches.reduce((s, b) => s + b._count.employees, 0), icon: <Users size={15}/>, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: k.color, display: 'flex' }}>{k.icon}</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>}

      {/* Branch cards */}
      {!loading && (
        <div {...(isMobile ? swipeHandlers : {})} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {branches.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '14px', marginBottom: 12 }}>ยังไม่มีสาขา</p>
              <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ เพิ่มสาขาแรก</button>
            </div>
          )}
          {paginated.map((b, idx) => (
            <div key={b.id} data-tour={idx === 0 ? 'branch-card-0' : undefined} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="#f97316" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '13px' }}>{b.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {b._count.employees} คน · {b._count.shifts} กะ
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: b.is_active ? '#fff7ed' : '#f9fafb', color: b.is_active ? '#c2410c' : 'var(--text-muted)' }}>
                  {b.is_active ? 'เปิด' : 'ปิด'}
                </span>
              </div>

              {b.location && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
                  📍 {b.location}
                </p>
              )}
              {b.lat && b.lng && (
                <p data-tour={idx === 0 ? 'branch-geo-0' : undefined} style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 4px', fontFamily: 'monospace' }}>
                  🌐 {parseFloat(b.lat).toFixed(6)}, {parseFloat(b.lng).toFixed(6)} · {b.gps_radius}m
                </p>
              )}
              {b.lat && b.lng && (
                <p style={{ fontSize: '11px', margin: '0 0 8px' }}>
                  <span style={{ padding: '2px 7px', borderRadius: 99, fontWeight: 600, fontSize: '11px', background: b.geo_mode === 'BLOCK' ? '#fee2e2' : '#fef3c7', color: b.geo_mode === 'BLOCK' ? '#dc2626' : '#d97706' }}>
                    {b.geo_mode === 'BLOCK' ? '🚫 BLOCK' : '⚠️ WARN'}
                  </span>
                </p>
              )}

              {/* Shift chips */}
              {(() => {
                const branchShifts = allShifts.filter(s => s.branch_id === b.id)
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        กะทำงาน ({branchShifts.length})
                      </div>
                      <button
                        onClick={() => { setShiftForm(SHIFT_EMPTY); setAddShiftBranch(b) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, border: '1px dashed #f97316', background: '#fff7ed', color: '#ea580c', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Plus size={10} /> เพิ่มกะ
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {branchShifts.map(s => {
                        const st = getShiftStatus(s)
                        const cfg = STATUS_CFG[st]
                        const assignedCount = allEmployees.filter(e => e.default_shift_id === s.id).length
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setDetailShift(s); setShowAddEmpToShift(false); setShiftEmpSearch(''); setSelectedAddIds(new Set()) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 10px', borderRadius: 8,
                              border: `1px solid ${st === 'active' ? '#86efac' : '#e5e7eb'}`,
                              background: st === 'active' ? '#f0fdf4' : '#f9fafb',
                              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                              color: st === 'active' ? '#15803d' : '#374151',
                            }}
                          >
                            <Clock size={11} color={cfg.color} />
                            {s.name}
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {s.start_time}–{s.end_time}
                            </span>
                            {assignedCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '10px', color: '#6366f1', fontWeight: 700 }}>
                                <Users size={10} /> {assignedCount}
                              </span>
                            )}
                            <ChevronsRight size={11} color="#cbd5e1" />
                          </button>
                        )
                      })}
                      {branchShifts.length === 0 && (
                        <span style={{ fontSize: '12px', color: '#d1d5db', fontStyle: 'italic' }}>ยังไม่มีกะ</span>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 8 }}>
                <button data-tour={idx === 0 ? 'branch-qr-0' : undefined} onClick={() => openQr(b)}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <QrCode size={13} />
                  QR
                </button>
                <button onClick={() => openEdit(b)}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  แก้ไข
                </button>
                <button onClick={() => setDeleteTarget(b)}
                  style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, branches.length)} จาก {branches.length} สาขา
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMobile && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div key={i} onClick={() => setPage(i + 1)} style={{ width: page === i + 1 ? 18 : 7, height: 7, borderRadius: 99, cursor: 'pointer', background: page === i + 1 ? '#f97316' : '#e5e7eb', transition: 'all 0.2s' }} />
                  ))}
                </div>
              )}
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {isMobile && <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>← ปัดซ้ายขวาเพื่อเปลี่ยนหน้า →</span>}
        </div>
      )}

      {/* Add/Edit Modal — Stepper */}
      {(modal === 'add' || modal === 'edit') && (() => {
        const maxStep = modal === 'add' ? 4 : 3
        const STEPS = modal === 'add'
          ? [{ n: 1, label: 'ข้อมูลสาขา' }, { n: 2, label: 'ตำแหน่ง GPS' }, { n: 3, label: 'Geofencing' }, { n: 4, label: 'เพิ่มกะ' }]
          : [{ n: 1, label: 'ข้อมูลสาขา' }, { n: 2, label: 'ตำแหน่ง GPS' }, { n: 3, label: 'Geofencing' }]
        const dot = (n: number): React.CSSProperties => ({
          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, flexShrink: 0,
          background: step > n ? '#f97316' : step === n ? '#f97316' : '#e5e7eb',
          color: step >= n ? '#fff' : 'var(--text-muted)',
          boxShadow: step === n ? '0 0 0 4px rgba(249,115,22,0.15)' : 'none',
          transition: 'all 0.2s',
        })
        const line = (n: number): React.CSSProperties => ({
          flex: 1, height: 2, background: step > n ? '#f97316' : '#e5e7eb', transition: 'background 0.3s',
        })

        return (
          <div style={sheetOverlay} onClick={() => setModal(null)}>
            <div style={{ ...sheetBox(480), width: isMobile ? '100%' : 'clamp(480px, 60vw, 780px)', maxWidth: isMobile ? '100%' : '92vw', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>
                    {modal === 'add' ? 'เพิ่มสาขาใหม่' : `แก้ไข: ${editTarget?.name}`}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    ขั้นตอน {step} จาก {maxStep} — {STEPS[step - 1].label}
                  </p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Step indicator */}
              <div style={{ padding: '16px 28px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {STEPS.map((s, i) => (
                    <React.Fragment key={s.n}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <div style={dot(s.n)}>
                          {step > s.n
                            ? <Check size={14} />
                            : s.n}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: step >= s.n ? '#f97316' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{ ...line(s.n), marginBottom: 18 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step content */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflowY: 'auto' }}>

                {/* ── Step 1: ข้อมูลสาขา ── */}
                {step === 1 && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        ชื่อสาขา <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="เช่น สาขาสำนักงานใหญ่" style={inputStyle} autoFocus />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>ที่อยู่ / สถานที่ตั้ง</label>
                      <textarea value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                  </>
                )}

                {/* ── Step 2: ตำแหน่ง GPS ── */}
                {step === 2 && (
                  <>
                    {/* Info toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: 0 }}>เลือกวิธีกรอกพิกัด GPS</p>
                      <button type="button" onClick={() => setShowInfo(v => !v)}
                        title="ดูวิธีทั้ง 3 แบบ"
                        style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9ca3af', background: showInfo ? '#f3f4f6' : '#fff', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        i
                      </button>
                    </div>

                    {showInfo && (
                      <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '12px', color: '#374151', lineHeight: 1.8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div><span style={{ fontWeight: 700, color: '#4f46e5' }}>📡 วิธีที่ 1</span> — กด "ดึงตำแหน่งปัจจุบัน" แล้วอนุญาต GPS ในเบราว์เซอร์</div>
                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}><span style={{ fontWeight: 700, color: '#059669' }}>🗺️ วิธีที่ 2</span> — กด "ปักหมุดในแมพ" → คลิกตำแหน่งบนแผนที่ → กด "ใช้พิกัดนี้"</div>
                          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}><span style={{ fontWeight: 700, color: '#d97706' }}>✏️ วิธีที่ 3</span> — พิมพ์ lat/lng เอง หรือ paste "13.7563, 100.5018" ในช่อง paste</div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={getGPS} disabled={gpsLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1.5px solid #4f46e5', background: '#ede9fe', color: '#4f46e5', fontSize: '13px', fontWeight: 600, cursor: gpsLoading ? 'not-allowed' : 'pointer', opacity: gpsLoading ? 0.7 : 1 }}>
                        {gpsLoading ? '⏳ กำลังดึง...' : (
                          <>
                            <MapPin size={14} />
                            📡 ดึงตำแหน่งปัจจุบัน
                          </>
                        )}
                      </button>
                      <button type="button" onClick={openMapPicker}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1.5px solid #059669', background: '#ecfdf5', color: '#059669', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        <Map size={14} />
                        🗺️ ปักหมุดในแมพ
                      </button>
                    </div>

                    {/* Lat/Lng inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 5 }}>Latitude (ละติจูด)</label>
                        <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="เช่น 13.7563" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 5 }}>Longitude (ลองจิจูด)</label>
                        <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="เช่น 100.5018" style={inputStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 5 }}>หรือ paste lat, lng พร้อมกัน</label>
                      <input placeholder='เช่น 13.7563, 100.5018' style={{ ...inputStyle, color: 'var(--text-muted)' }}
                        onPaste={e => {
                          const text = e.clipboardData.getData('text')
                          const parts = text.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean)
                          if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                            e.preventDefault()
                            setForm(f => ({ ...f, lat: parts[0], lng: parts[1] }))
                            showToast('success', `วางพิกัด ${parts[0]}, ${parts[1]} สำเร็จ`)
                          }
                        }} />
                    </div>

                    {form.lat && form.lng && (
                      <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Check size={15} />
                        พิกัด {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                        <button type="button" onClick={() => setForm(f => ({ ...f, lat: '', lng: '' }))}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1 }}>×</button>
                      </div>
                    )}

                    {!form.lat && !form.lng && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '8px 0' }}>
                        ไม่บังคับ — ข้ามได้ถ้ายังไม่มีพิกัด
                      </p>
                    )}
                  </>
                )}

                {/* ── Step 4: เพิ่มกะ (add mode only) ── */}
                {step === 4 && (
                  <>
                    <div style={{ padding: '12px 16px', background: '#eef2ff', borderRadius: 10, border: '1px solid #c7d2fe', fontSize: '13px', color: '#3730a3', lineHeight: 1.6 }}>
                      เพิ่มกะทำงานสำหรับสาขา <strong>{form.name}</strong> — สามารถเพิ่มได้หลายกะ หรือข้ามก็ได้
                    </div>

                    {/* form เพิ่มกะ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={shiftLabelStyle}>ชื่อกะ <span style={{ color: '#ef4444' }}>*</span></label>
                        <input value={wShift.name} onChange={e => setWShift(f => ({ ...f, name: e.target.value }))}
                          placeholder="เช่น กะเช้า, กะบ่าย" style={shiftInputStyle} />
                      </div>
                      <div>
                        <label style={shiftLabelStyle}>เวลาเริ่ม</label>
                        <input type="time" value={wShift.start_time} onChange={e => setWShift(f => ({ ...f, start_time: e.target.value }))} style={shiftInputStyle} />
                      </div>
                      <div>
                        <label style={shiftLabelStyle}>เวลาเลิก</label>
                        <input type="time" value={wShift.end_time} onChange={e => setWShift(f => ({ ...f, end_time: e.target.value }))} style={shiftInputStyle} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={shiftLabelStyle}>ประเภทกะ</label>
                        <select value={wShift.shift_type} onChange={e => setWShift(f => ({ ...f, shift_type: e.target.value as 'REGULAR' | 'SPECIAL' }))} style={shiftInputStyle}>
                          <option value="REGULAR">🕐 ปกติ (REGULAR)</option>
                          <option value="SPECIAL">⭐ พิเศษ / Event (SPECIAL)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!wShift.name.trim()) { showToast('error', 'กรุณาระบุชื่อกะ'); return }
                        setPendingShifts(prev => [...prev, { ...wShift }])
                        setWShift({ name: '', start_time: '08:00', end_time: '17:00', shift_type: 'REGULAR' })
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, border: '1.5px dashed #6366f1', background: '#eef2ff', color: '#4338ca', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Plus size={14} /> เพิ่มกะนี้
                    </button>

                    {/* รายการกะที่เพิ่มแล้ว */}
                    {pendingShifts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', margin: 0 }}>กะที่จะสร้าง ({pendingShifts.length})</p>
                        {pendingShifts.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Clock size={13} color="#16a34a" />
                              <span style={{ fontWeight: 600, fontSize: '13px', color: '#15803d' }}>{s.name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.start_time}–{s.end_time}</span>
                              {s.shift_type === 'SPECIAL' && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#d97706', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>SPECIAL</span>}
                            </div>
                            <button onClick={() => setPendingShifts(prev => prev.filter((_, j) => j !== i))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {pendingShifts.length === 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>ยังไม่มีกะ — กดเพิ่มกะด้านบน หรือกด "เพิ่มสาขา" เพื่อข้าม</p>
                    )}
                  </>
                )}

                {/* ── Step 3: Geofencing ── */}
                {step === 3 && (
                  <>
                    <div style={{ padding: '12px 16px', background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa', fontSize: '13px', color: '#92400e', lineHeight: 1.6 }}>
                      <strong>Geofencing</strong> คือการกำหนดขอบเขตพื้นที่ที่พนักงานสามารถเช็คอินได้<br/>
                      ระบบจะตรวจสอบ GPS ของพนักงานเทียบกับพิกัดสาขาที่ตั้งไว้
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>รัศมี (เมตร)</label>
                        <input type="number" min="50" max="5000" value={form.gps_radius}
                          onChange={e => setForm(f => ({ ...f, gps_radius: e.target.value }))} style={inputStyle} />
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0' }}>แนะนำ 100–300 เมตร</p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>โหมดนอกพื้นที่</label>
                        <select value={form.geo_mode} onChange={e => setForm(f => ({ ...f, geo_mode: e.target.value as 'WARN' | 'BLOCK' }))} style={inputStyle}>
                          <option value="WARN">⚠️ แจ้งเตือน (WARN)</option>
                          <option value="BLOCK">🚫 บล็อค (BLOCK)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ padding: '12px 16px', background: form.geo_mode === 'BLOCK' ? '#fef2f2' : '#fefce8', borderRadius: 10, border: `1px solid ${form.geo_mode === 'BLOCK' ? '#fecaca' : '#fde68a'}`, fontSize: '13px', color: form.geo_mode === 'BLOCK' ? '#991b1b' : '#78350f', lineHeight: 1.6 }}>
                      {form.geo_mode === 'BLOCK'
                        ? '🚫 BLOCK: พนักงานจะเช็คอินไม่ได้ถ้าอยู่นอกพื้นที่ — ต้องสแกน QR ที่สาขาเท่านั้น'
                        : '⚠️ WARN: เช็คอินได้แม้อยู่นอกพื้นที่ แต่จะบันทึกว่า "นอกพื้นที่" ไว้ในรายงาน'}
                    </div>

                    {/* Summary */}
                    <div style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '13px' }}>
                      <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>สรุปข้อมูลสาขา</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--text-muted)', minWidth: 80 }}>ชื่อสาขา</span><span style={{ color: '#111827', fontWeight: 600 }}>{form.name || '—'}</span></div>
                        <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--text-muted)', minWidth: 80 }}>ที่อยู่</span><span style={{ color: '#374151' }}>{form.location || '—'}</span></div>
                        <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--text-muted)', minWidth: 80 }}>พิกัด GPS</span><span style={{ color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>{form.lat && form.lng ? `${parseFloat(form.lat).toFixed(6)}, ${parseFloat(form.lng).toFixed(6)}` : 'ไม่ได้ตั้งค่า'}</span></div>
                        <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--text-muted)', minWidth: 80 }}>รัศมี</span><span style={{ color: '#374151' }}>{form.gps_radius} เมตร</span></div>
                        <div style={{ display: 'flex', gap: 8 }}><span style={{ color: 'var(--text-muted)', minWidth: 80 }}>โหมด</span><span style={{ color: form.geo_mode === 'BLOCK' ? '#dc2626' : '#d97706', fontWeight: 600 }}>{form.geo_mode}</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer nav */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button onClick={step === 1 ? () => setModal(null) : () => setStep(s => s - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  {step === 1 ? 'ยกเลิก' : (
                    <><ChevronLeft size={14} /> ก่อนหน้า</>
                  )}
                </button>

                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: maxStep }, (_, i) => i + 1).map(n => (
                    <div key={n} style={{ width: n === step ? 18 : 6, height: 6, borderRadius: 99, background: n === step ? '#f97316' : n < step ? '#fdba74' : '#e5e7eb', transition: 'all 0.25s' }} />
                  ))}
                </div>

                {step < maxStep ? (
                  <button onClick={() => { if (step === 1 && !form.name.trim()) { showToast('error', 'กรุณาระบุชื่อสาขาก่อน'); return }; setStep(s => s + 1) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    ถัดไป <ChevronRight size={14} />
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'กำลังบันทึก...' : (modal === 'add' ? `เพิ่มสาขา${pendingShifts.length > 0 ? ` + ${pendingShifts.length} กะ` : ''}` : 'บันทึก')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Map Picker Modal */}
      {mapModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
          onClick={() => setMapModal(false)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, width: isMobile ? '100%' : 620, maxWidth: '95vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: isMobile ? '90vh' : '80vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '14px', color: '#111827', margin: 0 }}>ปักหมุดตำแหน่งสาขา</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>คลิกบนแผนที่เพื่อเลือกตำแหน่ง</p>
              </div>
              <button onClick={() => setMapModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} style={{ flex: 1, minHeight: isMobile ? 300 : 380 }} />

            {/* Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', background: '#fafafa', flexShrink: 0 }}>
              {pickedCoords ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: '12px', color: '#15803d', fontFamily: 'monospace' }}>
                    ✓ {pickedCoords.lat.toFixed(6)}, {pickedCoords.lng.toFixed(6)}
                  </div>
                  <button onClick={applyPickedCoords}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    ใช้พิกัดนี้
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                  👆 คลิกบนแผนที่เพื่อเลือกตำแหน่ง
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {modal === 'qr' && qrTarget && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={{ ...sheetBox(400), padding: '24px' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '15px', color: '#111827', margin: 0 }}>QR Code เช็คอิน</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>{qrTarget.name}</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Info chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                📍 รัศมี {qrTarget.gps_radius} เมตร
              </span>
              <span style={{ background: '#eff6ff', color: '#2563eb', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                {qrTarget.geo_mode === 'BLOCK' ? '🚫 บล็อกนอกพื้นที่' : '⚠️ แจ้งเตือนนอกพื้นที่'}
              </span>
              <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                🤖 Auto-detect กะจากเวลา
              </span>
            </div>

            {/* QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 14px' }}>
              {qrQ.isLoading ? (
                <div style={{ width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: 14, color: 'var(--text-muted)', fontSize: '13px' }}>
                  ⏳ กำลังสร้าง QR…
                </div>
              ) : qrQ.isError || !qrString ? (
                <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 12, color: '#dc2626', fontSize: '13px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                  ⚠️ โหลด QR ไม่สำเร็จ — กรุณาลองใหม่
                </div>
              ) : (
                <>
                  <div ref={qrWrapRef} style={{ padding: 14, background: '#fff', border: '2px solid #e5e7eb', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
                    <QRCodeSVG value={qrString} size={200} level="H" />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                    QR Code ถาวร — ไม่มีวันหมดอายุ<br/>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>ระบบตรวจจับกะอัตโนมัติจากเวลาที่สแกน</span>
                  </p>
                </>
              )}
            </div>

            {/* DEV copy */}
            {qrString && (
              <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', marginBottom: 5 }}>🛠 DEV — คัดลอก JSON สำหรับทดสอบ</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input readOnly value={qrString} onClick={e => (e.target as HTMLInputElement).select()}
                    style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #fbbf24', fontSize: '0.68rem', fontFamily: 'monospace', background: '#fff', minWidth: 0 }} />
                  <button onClick={handleQrCopy}
                    style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: qrCopied ? '#16a34a' : '#f59e0b', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                    {qrCopied ? '✓' : 'คัดลอก'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleQrDownload} disabled={!qrString}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: qrString ? 'pointer' : 'not-allowed' }}>
                ⬇️ ดาวน์โหลด PNG
              </button>
              <button onClick={handleQrPrint} disabled={!qrString}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: qrString ? '#f97316' : '#d1d5db', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: qrString ? 'pointer' : 'not-allowed' }}>
                🖨️ พิมพ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="ลบสาขา?"
          message={`"${deleteTarget.name}" จะถูกลบออกจากระบบ`}
          confirmLabel="ลบสาขา"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Add Shift Modal */}
      {addShiftBranch && (
        <div style={sheetOverlay} onClick={() => setAddShiftBranch(null)}>
          <div style={{ ...sheetBox(480), width: isMobile ? '100%' : 'clamp(480px, 60vw, 780px)', maxWidth: isMobile ? '100%' : '92vw', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>+ เพิ่มกะใหม่</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={11} /> {addShiftBranch.name}
                </div>
              </div>
              <button onClick={() => setAddShiftBranch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="ปิด"><X size={18}/></button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ชื่อกะ */}
              <div>
                <label style={shiftLabelStyle}>ชื่อกะ *</label>
                <input value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น กะเช้า, กะบ่าย, กะดึก" style={shiftInputStyle} autoFocus />
              </div>

              {/* เวลาเข้า-ออก */}
              <div>
                <label style={{ ...shiftLabelStyle, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>เข้า–ออกงาน</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'เวลาเริ่มงาน', key: 'start_time' as const },
                    { label: 'เวลาเลิกงาน', key: 'end_time' as const },
                    { label: 'เช็คเอาท์ตั้งแต่', key: 'min_checkout' as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={shiftLabelStyle}>{label}</label>
                      <input type="time" value={shiftForm[key] as string}
                        onChange={e => setShiftForm(f => ({ ...f, [key]: e.target.value }))}
                        style={shiftInputStyle} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ประเภทกะ */}
              <div>
                <label style={shiftLabelStyle}>ประเภทกะ</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['REGULAR', 'SPECIAL'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setShiftForm(f => ({ ...f, shift_type: t }))}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${shiftForm.shift_type === t ? '#4f46e5' : '#e5e7eb'}`, background: shiftForm.shift_type === t ? '#ede9fe' : '#fff', color: shiftForm.shift_type === t ? '#4f46e5' : '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      {t === 'REGULAR' ? '⏰ กะทั่วไป' : '⭐ กะพิเศษ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* เกณฑ์การสาย */}
              <div>
                <label style={{ ...shiftLabelStyle, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>เกณฑ์การสาย & ค่าปรับ</label>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#92400e', marginBottom: 10 }}>
                  ⚠️ ระดับ 1/2 = สายปกติ · ⛔ ขาด = สายเกินจนนับเป็นวันขาด (ยังเช็คอินได้ปกติ แต่หักค่าปรับวันถัดไป)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={shiftLabelStyle}>สายระดับ 1</label>
                    <input type="time" value={shiftForm.late_threshold_1}
                      onChange={e => setShiftForm(f => ({ ...f, late_threshold_1: e.target.value }))}
                      style={shiftInputStyle} />
                    {shiftForm.late_threshold_1 && shiftForm.start_time && (
                      <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: 3 }}>
                        {timeDiffLabel(shiftForm.start_time, shiftForm.late_threshold_1)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={shiftLabelStyle}>สายระดับ 2</label>
                    <input type="time" value={shiftForm.late_threshold_2}
                      onChange={e => setShiftForm(f => ({ ...f, late_threshold_2: e.target.value }))}
                      style={shiftInputStyle} />
                    {shiftForm.late_threshold_2 && shiftForm.start_time && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 3 }}>
                        {timeDiffLabel(shiftForm.start_time, shiftForm.late_threshold_2)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={shiftLabelStyle}>ค่าปรับระดับ 1 (บาท)</label>
                    <input type="number" min="0" step="50" value={shiftForm.late_fine_1}
                      onChange={e => setShiftForm(f => ({ ...f, late_fine_1: e.target.value }))}
                      placeholder="เช่น 50" style={shiftInputStyle} />
                  </div>
                  <div>
                    <label style={shiftLabelStyle}>ค่าปรับระดับ 2 (บาท)</label>
                    <input type="number" min="0" step="50" value={shiftForm.late_fine_2}
                      onChange={e => setShiftForm(f => ({ ...f, late_fine_2: e.target.value }))}
                      placeholder="เช่น 200" style={shiftInputStyle} />
                  </div>
                  <div>
                    <label style={shiftLabelStyle}>⛔ ขาด (หลังจากนี้นับขาด)</label>
                    <input type="time" value={shiftForm.absent_threshold}
                      onChange={e => setShiftForm(f => ({ ...f, absent_threshold: e.target.value }))}
                      style={shiftInputStyle} />
                    {shiftForm.absent_threshold && shiftForm.start_time && (
                      <div style={{ fontSize: '0.7rem', color: '#be185d', marginTop: 3 }}>
                        {timeDiffLabel(shiftForm.start_time, shiftForm.absent_threshold)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={shiftLabelStyle}>ค่าปรับขาด — หักวันถัดไป (บาท)</label>
                    <input type="number" min="0" step="50" value={shiftForm.absent_fine}
                      onChange={e => setShiftForm(f => ({ ...f, absent_fine: e.target.value }))}
                      placeholder="เช่น 50" style={shiftInputStyle} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {shiftForm.start_time && (
                <div style={{ background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4338ca', marginBottom: 8 }}>
                    ตัวอย่างกะ "{shiftForm.name || '...'}" · {addShiftBranch.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>เริ่มงาน</span><span style={{ fontWeight: 700, color: '#15803d' }}>{shiftForm.start_time}</span>
                    {shiftForm.late_threshold_1 && <><span style={{ color: 'var(--text-muted)' }}>สายระดับ 1</span><span style={{ fontWeight: 700, color: '#d97706' }}>หลัง {shiftForm.late_threshold_1}{shiftForm.late_fine_1 ? ` (฿${shiftForm.late_fine_1})` : ''}</span></>}
                    {shiftForm.late_threshold_2 && <><span style={{ color: 'var(--text-muted)' }}>สายระดับ 2</span><span style={{ fontWeight: 700, color: '#dc2626' }}>หลัง {shiftForm.late_threshold_2}{shiftForm.late_fine_2 ? ` (฿${shiftForm.late_fine_2})` : ''}</span></>}
                    {shiftForm.absent_threshold && <><span style={{ color: 'var(--text-muted)' }}>⛔ ขาด</span><span style={{ fontWeight: 700, color: '#be185d' }}>หลัง {shiftForm.absent_threshold}{shiftForm.absent_fine ? ` (+฿${shiftForm.absent_fine} วันถัดไป)` : ''}</span></>}
                    {shiftForm.min_checkout && <><span style={{ color: 'var(--text-muted)' }}>เช็คเอาท์ตั้งแต่</span><span style={{ fontWeight: 700, color: '#7c3aed' }}>{shiftForm.min_checkout}</span></>}
                    <span style={{ color: 'var(--text-muted)' }}>เลิกงาน</span><span style={{ fontWeight: 700, color: '#dc2626' }}>{shiftForm.end_time}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setAddShiftBranch(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                ยกเลิก
              </button>
              <button
                disabled={shiftSaving}
                onClick={() => {
                  if (!shiftForm.name.trim()) { showToast('error', 'กรุณากรอกชื่อกะ'); return }
                  setShiftSaving(true)
                  createShiftMutation.mutate({
                    name: shiftForm.name,
                    branch_id: addShiftBranch.id,
                    start_time: shiftForm.start_time,
                    end_time: shiftForm.end_time,
                    min_checkout: shiftForm.min_checkout || undefined,
                    late_threshold_1: shiftForm.late_threshold_1 || undefined,
                    late_threshold_2: shiftForm.late_threshold_2 || undefined,
                    late_fine_1: shiftForm.late_fine_1 !== '' ? Number(shiftForm.late_fine_1) : null,
                    late_fine_2: shiftForm.late_fine_2 !== '' ? Number(shiftForm.late_fine_2) : null,
                    absent_threshold: shiftForm.absent_threshold || undefined,
                    absent_fine: shiftForm.absent_fine !== '' ? Number(shiftForm.absent_fine) : null,
                    shift_type: shiftForm.shift_type,
                    gps_radius: shiftForm.gps_radius !== '' ? Number(shiftForm.gps_radius) : null,
                  })
                }}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: shiftSaving ? 'not-allowed' : 'pointer', opacity: shiftSaving ? 0.7 : 1 }}>
                {shiftSaving ? 'กำลังบันทึก...' : '+ เพิ่มกะ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tourActive && <BranchTour onClose={() => setTourActive(false)} />}

      {/* Shift Detail Drawer */}
      {detailShift && (() => {
        const s        = detailShift
        const st       = getShiftStatus(s)
        const cfg      = STATUS_CFG[st]
        const isSpec   = s.shift_type === 'SPECIAL'
        const branchEmps = allEmployees.filter(e => e.branch_id === s.branch_id)
        const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777']
        const avatarColor = (i: number) => COLORS[i % COLORS.length]
        const headerGrad = isSpec
          ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
          : st === 'active' ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#1e293b,#334155)'

        return (
          <div
            onClick={() => setDetailShift(null)}
            style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:500,display:'flex',alignItems:isMobile?'flex-end':'center',justifyContent:'center',padding:isMobile?0:16 }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background:'#fff',
                borderRadius: isMobile ? '20px 20px 0 0' : 16,
                width:'100%', maxWidth:520,
                maxHeight: isMobile ? '90vh' : '82vh',
                display:'flex',flexDirection:'column',
                boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
                overflow:'hidden',
              }}
            >
              {/* Header */}
              <div style={{ background: headerGrad, padding:'20px 20px 16px', flexShrink:0 }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8 }}>
                  <div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                      {isSpec && <span style={{ background:'rgba(255,255,255,0.2)',color:'#fff',borderRadius:6,padding:'2px 8px',fontSize:'11px',fontWeight:700 }}>⭐ พิเศษ</span>}
                      <span style={{ background:cfg.bg,color:cfg.color,borderRadius:99,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700 }}>
                        {cfg.dot} {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontWeight:800,fontSize:'1.2rem',color:'#fff',lineHeight:1.2 }}>{s.name}</div>
                    <div style={{ fontSize:'0.8rem',color:'rgba(255,255,255,0.75)',marginTop:2 }}>{s.branch.name}</div>
                  </div>
                  <button onClick={() => setDetailShift(null)} aria-label="ปิด"
                    style={{ background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,padding:6,cursor:'pointer',color:'#fff',display:'flex' }}>
                    <X size={18}/>
                  </button>
                </div>

                {/* Time chips */}
                <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:10 }}>
                  <span style={{ background:'rgba(255,255,255,0.15)',color:'#fff',borderRadius:99,padding:'4px 12px',fontSize:'0.75rem',fontWeight:700 }}>
                    🟢 {s.start_time} – {s.end_time} 🔴
                  </span>
                  {s.late_threshold_1 && (
                    <span style={{ background:'rgba(255,255,255,0.15)',color:'#fff',borderRadius:99,padding:'4px 12px',fontSize:'0.75rem',fontWeight:700 }}>
                      ⚠️ สาย {s.late_threshold_1}
                    </span>
                  )}
                  {s.late_threshold_2 && (
                    <span style={{ background:'rgba(255,255,255,0.15)',color:'#fff',borderRadius:99,padding:'4px 12px',fontSize:'0.75rem',fontWeight:700 }}>
                      🚫 สายระดับ 2 {s.late_threshold_2}
                    </span>
                  )}
                  {s.absent_threshold && (
                    <span style={{ background:'rgba(255,255,255,0.15)',color:'#fff',borderRadius:99,padding:'4px 12px',fontSize:'0.75rem',fontWeight:700 }}>
                      ⛔ ขาด {s.absent_threshold}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <div style={{ flex:1,overflowY:'auto',overscrollBehavior:'contain' }}>

                {/* Shift details */}
                <div style={{ padding:'16px 20px',borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12 }}>รายละเอียดกะ</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px 20px' }}>
                    <BranchInfoItem label="🟢 เวลาเริ่มงาน"   value={s.start_time}  color="#15803d" />
                    <BranchInfoItem label="🔴 เวลาเลิกงาน"   value={s.end_time}    color="#dc2626" />
                    {s.min_checkout && <BranchInfoItem label="🔒 เช็คเอาท์ตั้งแต่" value={s.min_checkout} color="#7c3aed" />}
                    {s.gps_radius   && <BranchInfoItem label="📍 รัศมี GPS"         value={`${s.gps_radius} ม.`} color="#0891b2" />}
                    {!isSpec && s.late_threshold_1 && (
                      <BranchInfoItem label={`⚠️ สายระดับ 1${s.late_fine_1 ? ` (฿${s.late_fine_1})` : ''}`} value={s.late_threshold_1} color="#d97706" />
                    )}
                    {!isSpec && s.late_threshold_2 && (
                      <BranchInfoItem label={`🚫 สายระดับ 2${s.late_fine_2 ? ` (฿${s.late_fine_2})` : ''}`} value={s.late_threshold_2} color="#dc2626" />
                    )}
                    {!isSpec && s.absent_threshold && (
                      <BranchInfoItem label={`⛔ ขาด${s.absent_fine ? ` (+฿${s.absent_fine} วันถัดไป)` : ''}`} value={s.absent_threshold} color="#be185d" />
                    )}
                    {!isSpec && !s.late_threshold_1 && !s.late_threshold_2 && (
                      <div style={{ gridColumn:'1/-1',fontSize:'0.8rem',color:'var(--text-muted)' }}>⏱ สายได้ {s.late_threshold} นาที</div>
                    )}
                  </div>
                  {isSpec && (
                    <div style={{ marginTop:10,padding:'8px 12px',background:'#f5f3ff',borderRadius:8,fontSize:'0.78rem',color:'#7c3aed' }}>
                      ⭐ กะพิเศษ — ทับซ้อนกะปกติได้ ไม่นับสาย เหมาะสำหรับ OT หรืองานนอกสถานที่
                    </div>
                  )}
                </div>

                {/* Employee assignment — informational เท่านั้น ไม่กระทบการเช็คอินจริง */}
                {(() => {
                  const inShiftEmps  = branchEmps.filter(e => e.default_shift_id === s.id)
                  const otherEmps    = branchEmps.filter(e => e.default_shift_id !== s.id)
                  const q            = shiftEmpSearch.trim().toLowerCase()
                  const searchedOtherEmps = q
                    ? otherEmps.filter(e => `${e.first_name} ${e.last_name} ${e.nickname ?? ''}`.toLowerCase().includes(q))
                    : otherEmps
                  const shiftNameOf = (shiftId: string | null) => shiftId ? (allShifts.find(sh => sh.id === shiftId)?.name ?? null) : null

                  return (
                    <div style={{ padding:'16px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em' }}>
                          พนักงานในกะนี้ ({inShiftEmps.length} คน)
                        </div>
                        <button onClick={() => { setShowAddEmpToShift(v => !v); setShiftEmpSearch('') }}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:6, border:'1px dashed #f97316', background:'#fff7ed', color:'#ea580c', fontSize:'11px', fontWeight:700, cursor:'pointer' }}>
                          <Plus size={10} /> {showAddEmpToShift ? 'ปิด' : 'เพิ่มพนักงาน'}
                        </button>
                      </div>

                      {inShiftEmps.length === 0 ? (
                        <div style={{ textAlign:'center',padding:'24px 0',color:'var(--text-muted)',fontSize:'0.85rem' }}>ยังไม่มีพนักงานในกะนี้</div>
                      ) : (
                        <div style={{ display:'flex',flexDirection:'column',gap:2, marginBottom: showAddEmpToShift ? 16 : 0 }}>
                          {inShiftEmps.map((e, idx) => (
                            <div key={e.id} style={{
                              display:'flex',alignItems:'center',gap:12,
                              padding:'10px 12px',borderRadius:10,
                              background:'#f9fafb',border:'1px solid #f1f5f9',
                            }}>
                              <div style={{
                                width:36,height:36,borderRadius:'50%',
                                background:avatarColor(idx),color:'#fff',
                                display:'flex',alignItems:'center',justifyContent:'center',
                                fontWeight:800,fontSize:'0.8rem',flexShrink:0,
                              }}>
                                {(e.nickname ?? e.first_name ?? '').slice(0,2)}
                              </div>
                              <div style={{ flex:1,minWidth:0 }}>
                                <div style={{ fontWeight:700,fontSize:'0.875rem',color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                                  {e.nickname || `${e.first_name} ${e.last_name}`}
                                </div>
                                <div style={{ fontSize:'0.7rem',color:'#94a3b8',marginTop:1 }}>
                                  {e.branch.name}{e.department ? ` · ${e.department}` : ''}
                                </div>
                              </div>
                              <button
                                onClick={() => assignShiftMutation.mutate({ employeeId: e.id, shiftId: null })}
                                disabled={assignShiftMutation.isPending}
                                style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #fecaca', background:'#fef2f2', color:'#ef4444', fontSize:'11px', fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                                ย้ายออก
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {showAddEmpToShift && (() => {
                        const allVisibleIds  = searchedOtherEmps.map(e => e.id)
                        const allSelected    = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedAddIds.has(id))
                        function toggleOne(id: string) {
                          setSelectedAddIds(prev => {
                            const next = new Set(prev)
                            next.has(id) ? next.delete(id) : next.add(id)
                            return next
                          })
                        }
                        function toggleAll() {
                          setSelectedAddIds(prev => {
                            if (allSelected) return new Set([...prev].filter(id => !allVisibleIds.includes(id)))
                            return new Set([...prev, ...allVisibleIds])
                          })
                        }
                        return (
                          <div style={{ borderTop:'1px dashed #e5e7eb', paddingTop:12 }}>
                            <input value={shiftEmpSearch} onChange={e => setShiftEmpSearch(e.target.value)}
                              placeholder="ค้นหาชื่อ / ชื่อเล่น..." autoFocus
                              style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'0.8rem', marginBottom:8, boxSizing:'border-box', fontFamily:'inherit' }} />

                            {searchedOtherEmps.length === 0 ? (
                              <div style={{ textAlign:'center',padding:'16px 0',color:'var(--text-muted)',fontSize:'0.8rem' }}>ไม่พบพนักงาน</div>
                            ) : (
                              <>
                                <label style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 4px 8px', fontSize:'0.75rem', color:'var(--text-muted)', cursor:'pointer', userSelect:'none' }}>
                                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width:14, height:14, cursor:'pointer' }} />
                                  เลือกทั้งหมด ({searchedOtherEmps.length})
                                </label>
                                <div style={{ display:'flex',flexDirection:'column',gap:2, maxHeight:220, overflowY:'auto' }}>
                                  {searchedOtherEmps.map((e, idx) => {
                                    const curShiftName = shiftNameOf(e.default_shift_id)
                                    const checked = selectedAddIds.has(e.id)
                                    return (
                                      <div key={e.id} onClick={() => toggleOne(e.id)}
                                        style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background: checked ? '#f0fdf4' : '#fff',border:`1px solid ${checked ? '#86efac' : '#f1f5f9'}`, cursor:'pointer' }}>
                                        <input type="checkbox" checked={checked} onChange={() => toggleOne(e.id)} onClick={ev => ev.stopPropagation()}
                                          style={{ width:15, height:15, cursor:'pointer', flexShrink:0 }} />
                                        <div style={{
                                          width:32,height:32,borderRadius:'50%',
                                          background:avatarColor(idx),color:'#fff',
                                          display:'flex',alignItems:'center',justifyContent:'center',
                                          fontWeight:800,fontSize:'0.75rem',flexShrink:0,
                                        }}>
                                          {(e.nickname ?? e.first_name ?? '').slice(0,2)}
                                        </div>
                                        <div style={{ flex:1,minWidth:0 }}>
                                          <div style={{ fontWeight:700,fontSize:'0.85rem',color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                                            {e.nickname || `${e.first_name} ${e.last_name}`}
                                          </div>
                                          <div style={{ fontSize:'0.7rem',color:'#94a3b8',marginTop:1 }}>
                                            {e.branch.name} · {curShiftName ? `อยู่กะ ${curShiftName}` : 'ยังไม่มีกะ'}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                <button
                                  onClick={() => bulkAssignShiftMutation.mutate({ employeeIds: [...selectedAddIds], shiftId: s.id })}
                                  disabled={selectedAddIds.size === 0 || bulkAssignShiftMutation.isPending}
                                  style={{
                                    width:'100%', marginTop:10, padding:'9px', borderRadius:8, border:'none',
                                    background: selectedAddIds.size === 0 ? '#e5e7eb' : '#16a34a',
                                    color: selectedAddIds.size === 0 ? 'var(--text-muted)' : '#fff',
                                    fontSize:'0.82rem', fontWeight:700,
                                    cursor: selectedAddIds.size === 0 ? 'not-allowed' : 'pointer',
                                  }}>
                                  {bulkAssignShiftMutation.isPending ? 'กำลังเพิ่ม...' : `+ เพิ่มที่เลือก (${selectedAddIds.size})`}
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )
      })()}
    </>}

    </div>
  )
}

function BranchInfoItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize:'0.7rem',color:'#94a3b8',marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:700,color,fontSize:'1.05rem',fontVariantNumeric:'tabular-nums' }}>{value}</div>
    </div>
  )
}
