import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, Users, Search, Check, User, Upload, Plus, Clock, Building2, ChevronLeft, ChevronRight, CheckCircle2, Smartphone, Phone, MapPin, Network } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useSwipePage } from '../../hooks/useSwipePage'
import { useActiveOffsite } from '../../hooks/useActiveOffsite'
import { useIsReadOnly } from '../../stores/authStore'
import { api } from '../../lib/axios'
import { deptName } from '../../lib/format'
import OrgStructurePage from '../org-structure'

interface ApiBranch {
  id: string
  name: string
}

type EmployeeStatusValue = 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'

interface ApiEmployee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  nickname: string | null
  department: string | null
  phone: string | null
  hired_at: string | null
  line_user_id: string | null
  is_active: boolean
  status: EmployeeStatusValue
  status_reason: string | null
  created_at: string
  branch_id: string
  branch: { id: string; name: string }
  weekly_off_mode: 'WEEKLY' | 'MONTHLY_BATCH'
  position_id: string | null
  position?: { id: string; name: string } | null
  employee_status_type_id: string | null
  employee_status_type?: { id: string; name: string; monthly_off_quota: number } | null
}

// ตำแหน่งผูก parent ชัดเจนเสมอ: Position → Department (แผนก) → Division (ฝ่าย)
interface ApiPosition {
  id: string
  name: string
  department?: { id: string; name: string; division?: { id: string; name: string } | null } | null
}
interface ApiStatusType { id: string; name: string; monthly_off_quota: number }

interface StatusLogEntry {
  id: string
  from_status: EmployeeStatusValue | null
  to_status: EmployeeStatusValue
  reason: string
  changed_by: string | null
  created_at: string
}

const STATUS_CFG: Record<EmployeeStatusValue, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:     { label: 'ใช้งาน',     color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
  INACTIVE:   { label: 'ไม่ใช้งาน',  color: 'var(--text-muted)', bg: '#f3f4f6', border: '#e5e7eb' },
  RESIGNED:   { label: 'ลาออก',     color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  TERMINATED: { label: 'เลิกจ้าง',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const WEEKLY_OFF_MODE_LABEL: Record<'WEEKLY' | 'MONTHLY_BATCH', string> = {
  WEEKLY:        'รายสัปดาห์ (จองทีละสัปดาห์)',
  MONTHLY_BATCH: 'รายเดือน (ต้องจองครบทุกสัปดาห์)',
}


const DEPARTMENTS = [
  '01 ผู้บริหาร',
  '02 Office',
  '03 พนักงานขาย',
  '04 พนักงานขนส่ง',
]

const EMPTY_FORM = {
  branch_id: '', full_name: '', nickname: '', department: '',
  phone: '', hired_at: '', weekly_off_mode: 'WEEKLY' as 'WEEKLY' | 'MONTHLY_BATCH',
  position_id: '', employee_status_type_id: '',
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '14px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
  background: '#fff',
}
const disabledInput: React.CSSProperties = {
  ...input, background: '#f9fafb', color: 'var(--text-muted)',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6,
}
const required: React.CSSProperties = { color: '#ef4444', marginLeft: 2 }

export default function EmployeePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const isReadOnly = useIsReadOnly()
  const navigate = useNavigate()
  // เปิดตรงไปแท็บ "ผังองค์กร" ได้ผ่าน ?tab=org (ใช้กับ redirect จาก /org-structure เดิม)
  const [activeTab, setActiveTab] = useState<'employee' | 'org'>(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return t === 'org' ? 'org' : 'employee'
  })
  const swipeHandlers = useSwipePage(
    () => setPage(p => Math.min(totalPages, p + 1)),
    () => setPage(p => Math.max(1, p - 1)),
  )
  const qc = useQueryClient()

  const { data: employees = [], isLoading: loading } = useQuery<ApiEmployee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/api/v1/admin/employees', { params: { includeInactive: true } }).then(r => r.data.data),
  })
  const { data: branches = [] } = useQuery<ApiBranch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const { data: statusTypes = [] } = useQuery<ApiStatusType[]>({
    queryKey: ['employee-status-types'],
    queryFn: () => api.get('/api/v1/admin/employee-status-types').then(r => r.data.data),
  })
  // resolve ชื่อฝ่าย/แผนกของตำแหน่ง — ตอนนี้ parent ชัดเจนเสมอ ไม่ต้องไล่หลายทางแบบเดิม
  const positionDivisionName = (p: ApiPosition): string | null => p.department?.division?.name ?? null
  const positionDeptName     = (p: ApiPosition): string | null => p.department?.name ?? null
  const positionLabel = (p: ApiPosition) => {
    const parts = [positionDivisionName(p), positionDeptName(p), p.name].filter(Boolean)
    return parts.join(' ▸ ')
  }
  // แปลงค่า department string เดิม ("01 ผู้บริหาร") เป็นชื่อล้วน แล้วหา entry ของ DEPARTMENTS
  // ที่ชื่อตรงกับฝ่าย (Division) ที่ตำแหน่งนี้ผูกอยู่ — ใช้ auto-fill ช่อง "แผนก" เดิมตอนเลือกตำแหน่งก่อน
  const matchLegacyDept = (name: string | null): string | undefined => name ? DEPARTMENTS.find(d => deptName(d) === name) : undefined
  // กรองตำแหน่งตามแผนก(legacy string)ที่เลือกไว้ เทียบกับชื่อฝ่าย (Division) ของตำแหน่ง —
  // ตำแหน่งที่ยังไม่ผูกฝ่ายเลย โชว์ไว้เสมอ กันไม่ให้ผู้ใช้เลือกไม่ได้เพราะยังไม่ได้จัดเข้าฝ่าย
  const filterPositionsByDept = (list: ApiPosition[], legacyDept: string) => {
    if (!legacyDept) return list
    const target = deptName(legacyDept)
    return list.filter(p => { const pd = positionDivisionName(p); return !pd || pd === target })
  }
  const { activeOffsiteByEmployee } = useActiveOffsite()

  const [search, setSearch]           = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [lineFilter, setLineFilter]   = useState<'' | 'linked' | 'unlinked'>('')
  const [statusFilter, setStatusFilter] = useState<'' | EmployeeStatusValue>('')

  const [page, setPage]               = useState(1)
  const pageSize                      = isMobile ? 5 : 10
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const [modal, setModal]             = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget]   = useState<ApiEmployee | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployee | null>(null)

  // ── Add stepper state ────────────────────────────────────────────────────────
  const [addStep, setAddStep] = useState(1)
  const [addErrors, setAddErrors] = useState<{ first_name?: string; last_name?: string; nickname?: string; department?: string }>({})
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [addForm, setAddForm] = useState({
    prefix: '', first_name: '', last_name: '', nickname: '',
    id_card: '', birthdate: '', blood_type: '', email: '', phone: '', phone_alt: '',
    emergency_contacts: [] as { name: string; relation: string; phone: string }[],
    addr_id: { house: '', road: '', soi: '', moo: '', sub: '', district: '', province: '', zip: '' },
    addr_cur_same: false,
    addr_cur: { house: '', road: '', soi: '', moo: '', sub: '', district: '', province: '', zip: '' },
    educations: [] as { level: string; institution: string; field: string; year: string }[],
    skills: [] as { name: string; level: string }[],
    emp_type: 'ประจำ', status: 'ทำงาน', hired_at: new Date().toISOString().slice(0, 10),
    salary: '', department: '', account_status: 'ปกติ', notes: '',
    branch_accesses: [] as { branch_id: string; branch_name: string }[],
    position_id: '', employee_status_type_id: '',
  })
  const af = addForm
  const setAf = (patch: Partial<typeof addForm>) => setAddForm(f => ({ ...f, ...patch }))

  const filtered = useMemo(() => employees.filter(e => {
    if (branchFilter && e.branch_id !== branchFilter) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (lineFilter === 'linked'   && !e.line_user_id) return false
    if (lineFilter === 'unlinked' &&  e.line_user_id) return false
    if (search) {
      const hay = `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code} ${e.phone ?? ''} ${e.department ?? ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  }), [employees, branchFilter, statusFilter, lineFilter, search])

  // Reset page when filters change
  React.useEffect(() => { setPage(1) }, [branchFilter, statusFilter, lineFilter, search])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page])

  function openAdd() {
    setAddStep(1)
    setAddForm({
      prefix: '', first_name: '', last_name: '', nickname: '',
      id_card: '', birthdate: '', blood_type: '', email: '', phone: '', phone_alt: '',
      emergency_contacts: [],
      addr_id: { house: '', road: '', soi: '', moo: '', sub: '', district: '', province: '', zip: '' },
      addr_cur_same: false,
      addr_cur: { house: '', road: '', soi: '', moo: '', sub: '', district: '', province: '', zip: '' },
      educations: [], skills: [],
      emp_type: 'ประจำ', status: 'ทำงาน', hired_at: new Date().toISOString().slice(0, 10),
      salary: '', department: '', account_status: 'ปกติ', notes: '',
      branch_accesses: [],
      position_id: '', employee_status_type_id: '',
    })
    setEditTarget(null)
    setAddErrors({})
    setShowOptionalFields(false)
    setModal('add')
  }

  function openEdit(e: ApiEmployee) {
    const full_name = `${e.first_name} ${e.last_name}`.trim()
    setForm({
      branch_id: e.branch_id,
      full_name,
      nickname: e.nickname ?? '',
      department: e.department ?? '',
      phone: e.phone ?? '',
      hired_at: e.hired_at ? e.hired_at.slice(0, 10) : '',
      weekly_off_mode: e.weekly_off_mode ?? 'WEEKLY',
      position_id: e.position_id ?? '',
      employee_status_type_id: e.employee_status_type_id ?? '',
    })
    setEditTarget(e)
    setModal('edit')
  }

  function parseName(full: string): { first_name: string; last_name: string } {
    const parts = full.trim().split(/\s+/)
    return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') }
  }

  const addMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/employees', body).then(r => r.data.data),
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', `เพิ่ม "${vars.first_name} ${vars.last_name}" สำเร็จ — ส่งลิงก์ยืนยัน Line ให้พนักงานด้วย`)
      setSaving(false); setModal(null)
    },
    onError: () => { showToast('error', 'เพิ่มพนักงานไม่สำเร็จ'); setSaving(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/employees/${id}`, body).then(r => r.data.data),
    onSuccess: (_, { body }: any) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', `บันทึกข้อมูลเรียบร้อย`)
      setSaving(false); setModal(null)
    },
    onError: () => { showToast('error', 'บันทึกไม่สำเร็จ'); setSaving(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', `ลบพนักงาน "${deleteTarget?.first_name} ${deleteTarget?.last_name}" เรียบร้อย`)
      setDeleteTarget(null)
    },
    onError: () => showToast('error', 'ลบพนักงานไม่สำเร็จ'),
  })
  const [statusModalTarget, setStatusModalTarget] = useState<ApiEmployee | null>(null)

  async function handleAddSave() {
    setSaving(true)
    const branchId = af.branch_accesses[0]?.branch_id ?? branches[0]?.id ?? ''
    const body = {
      branch_id: branchId,
      first_name: af.first_name || 'พนักงาน',
      last_name: af.last_name || 'ใหม่',
      nickname: af.nickname || undefined,
      department: af.department || undefined,
      phone: af.phone || undefined,
      hired_at: af.hired_at || undefined,
      position_id: af.position_id || undefined,
      employee_status_type_id: af.employee_status_type_id || undefined,
    }
    addMutation.mutate(body)
  }

  async function handleSave() {
    if (!form.branch_id || !form.full_name.trim()) {
      showToast('error', 'กรุณากรอกชื่อ-สกุล และเลือกสาขา')
      return
    }
    const { first_name, last_name } = parseName(form.full_name)
    setSaving(true)
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: {
        branch_id: form.branch_id, first_name, last_name,
        nickname: form.nickname || undefined,
        department: form.department || undefined,
        phone: form.phone || undefined,
        hired_at: form.hired_at || undefined,
        weekly_off_mode: form.weekly_off_mode,
        position_id: form.position_id || null,
        employee_status_type_id: form.employee_status_type_id || null,
      }})
    }
  }


  // ESC to close modal
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id)
  }

  const filterInput: React.CSSProperties = {
    ...input, padding: '8px 12px', fontSize: '13px',
  }
  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox: React.CSSProperties = {
    background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16,
    width: isMobile ? '100%' : 720, maxWidth: '96vw',
    maxHeight: isMobile ? '92vh' : 'min(88vh, 780px)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  }

  const tabBar = (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 20, overflowX: 'auto' }}>
      {([
        { id: 'employee', label: 'พนักงาน',   icon: <Users size={15}/>,   color: '#f97316', activeBg: '#fff7ed' },
        { id: 'org',       label: 'ผังองค์กร', icon: <Network size={15}/>, color: '#f97316', activeBg: '#fff7ed' },
      ] as const).map(t => {
        const isActive = activeTab === t.id
        return (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: isActive ? 700 : 600,
            color: isActive ? t.color : 'var(--text-muted)',
            background: isActive ? t.activeBg : 'transparent',
            borderBottom: `3px solid ${isActive ? t.color : 'transparent'}`,
            borderRadius: '8px 8px 0 0', marginBottom: -4, transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}>
            <span style={{ color: isActive ? t.color : 'var(--text-muted)', display: 'flex' }}>{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )

  // แท็บผังองค์กร — คนละหน้าจอเลย ไม่ต้องยุ่งกับ tree ของแท็บพนักงานด้านล่าง
  if (activeTab === 'org') {
    return (
      <div>
        {tabBar}
        <OrgStructurePage />
      </div>
    )
  }

  return (
    <div>
      {tabBar}
      {/* Header - Title removed */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        {!isReadOnly && (
          <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', whiteSpace: 'nowrap' }}>
            + เพิ่มพนักงาน
          </button>
        )}
      </div>

      {/* KPI mini row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 20 }}>
        {[
          { label: 'ทั้งหมด',    value: employees.length,                                icon: <Users size={15}/>,        color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe' },
          { label: 'ใช้งาน',     value: employees.filter(e => e.is_active).length,       icon: <CheckCircle2 size={15}/>, color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0' },
          { label: 'ผูก Line แล้ว', value: employees.filter(e => e.line_user_id).length, icon: <Smartphone size={15}/>,   color: '#0891b2', bg: '#ecfeff',  border: '#a5f3fc' },
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

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Branch filter — desktop only (mobile uses filter sheet) */}
        {!isMobile && (
          <div>
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              <option value="">ทุกสาขา</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        {/* Search row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / ชื่อเล่น / รหัส..."
              style={{ ...filterInput, width: '100%', paddingLeft: 32, borderRadius: 10 }} />
          </div>

          {/* Desktop inline filters */}
          {!isMobile && (<>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              style={{ ...filterInput, width: 'auto', borderRadius: 10, cursor: 'pointer' }}>
              <option value="">ทุกสถานะ</option>
              {Object.entries(STATUS_CFG).map(([v, cfg]) => <option key={v} value={v}>{cfg.label}</option>)}
            </select>
            <select value={lineFilter} onChange={e => setLineFilter(e.target.value as any)}
              style={{ ...filterInput, width: 'auto', borderRadius: 10, cursor: 'pointer' }}>
              <option value="">Line ทั้งหมด</option>
              <option value="linked">✓ ผูกแล้ว</option>
              <option value="unlinked">ยังไม่ผูก</option>
            </select>
          </>)}

          {/* Mobile filter button */}
          {isMobile && (() => {
            const activeCount = [branchFilter, statusFilter, lineFilter].filter(Boolean).length
            return (
              <button onClick={() => setFilterSheetOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${activeCount > 0 ? '#f97316' : '#e5e7eb'}`, background: activeCount > 0 ? '#fff7ed' : '#fff', color: activeCount > 0 ? '#f97316' : '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                กรอง
                {activeCount > 0 && (
                  <span style={{ background: '#f97316', color: '#fff', borderRadius: 99, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{activeCount}</span>
                )}
              </button>
            )
          })()}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {isMobile && filterSheetOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setFilterSheetOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 20px 32px', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e5e7eb', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>กรองพนักงาน</p>
              {[branchFilter, statusFilter, lineFilter].some(Boolean) && (
                <button onClick={() => { setBranchFilter(''); setStatusFilter(''); setLineFilter('') }}
                  style={{ fontSize: '12px', color: '#f97316', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  ล้างทั้งหมด
                </button>
              )}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>สาขา</p>
            <div style={{ marginBottom: 16 }}>
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', color: '#374151', boxSizing: 'border-box' }}>
                <option value="">ทุกสาขา</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>สถานะ</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[['', 'ทั้งหมด'], ...Object.entries(STATUS_CFG).map(([v, cfg]) => [v, cfg.label])].map(([v, lb]) => (
                <button key={v} onClick={() => setStatusFilter(v as any)}
                  style={{ padding: '6px 16px', borderRadius: 99, border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: statusFilter === v ? '#f97316' : '#f1f5f9', color: statusFilter === v ? '#fff' : '#64748b' }}>
                  {lb}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['', 'ทั้งหมด', false], ['linked', 'ผูกแล้ว', true], ['unlinked', 'ยังไม่ผูก', false]].map(([v, lb, icon]) => (
                <button key={v as string} onClick={() => setLineFilter(v as any)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 16px', borderRadius: 99, border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: lineFilter === v ? '#f97316' : '#f1f5f9', color: lineFilter === v ? '#fff' : '#64748b' }}>
                  {icon && <CheckCircle2 size={13} />} {lb}
                </button>
              ))}
            </div>

            <button onClick={() => setFilterSheetOpen(false)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              ดูผลลัพธ์ ({filtered.length} คน)
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

      {/* Desktop table */}
      {!loading && !isMobile && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#fff7ed' }}>
                {['รหัส', 'ชื่อ-นามสกุล', 'แผนก', 'สาขา', 'เบอร์โทร', 'Line', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {employees.length === 0 ? 'ยังไม่มีพนักงาน กรุณาเพิ่มพนักงานแรก' : 'ไม่พบพนักงานที่ตรงกับเงื่อนไข'}
                </td></tr>
              )}
              {paginated.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.15s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = '#fff7ed')}
                onMouseLeave={ev => (ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}>
                  <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.employee_code}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => navigate(`/employee/${e.id}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#ea580c', fontSize: '0.875rem', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      {e.first_name} {e.last_name}
                    </button>
                    {e.nickname && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 5 }}>({e.nickname})</span>}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{deptName(e.department)}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.branch.name}</td>
                  <td style={{ padding: '11px 14px', color: '#374151', fontSize: '0.82rem' }}>{e.phone ?? '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {e.line_user_id
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#16a34a', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}><CheckCircle2 size={11} /> ผูกแล้ว</span>
                      : <span style={{ background: '#f3f4f6', color: 'var(--text-muted)', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem' }}>— ยังไม่ผูก</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => setStatusModalTarget(e)}
                        title="คลิกเพื่อเปลี่ยนสถานะ"
                        style={{ background: STATUS_CFG[e.status].bg, color: STATUS_CFG[e.status].color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${STATUS_CFG[e.status].border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ● {STATUS_CFG[e.status].label}
                      </button>
                      {activeOffsiteByEmployee.has(e.id) && (
                        <span title={activeOffsiteByEmployee.get(e.id)!.check_in_address ?? undefined}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <MapPin size={10} /> นอกสถานที่
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {!isReadOnly && <>
                      <button onClick={() => openEdit(e)} aria-label={`แก้ไข ${e.first_name} ${e.last_name}`} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#374151' }}><Pencil size={13}/></button>
                      <button onClick={() => setDeleteTarget(e)} aria-label={`ลบ ${e.first_name} ${e.last_name}`} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#dc2626' }}><Trash2 size={13}/></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                แสดง {(page - 1) * pageSize + 1} ถึง {Math.min(page * pageSize, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="หน้าก่อนหน้า" 
                  disabled={page === 1}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="หน้าถัดไป" 
                  disabled={page === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? 'var(--text-muted)' : '#374151', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile cards */}
      {!loading && isMobile && (
        <div {...swipeHandlers} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>ไม่พบพนักงาน</p>
          )}
          {paginated.map(e => (
            <div key={e.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <button onClick={() => navigate(`/employee/${e.id}`)} style={{ fontWeight: 700, color: '#ea580c', fontSize: '14px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 2, fontFamily: 'inherit' }}>
                    {e.first_name} {e.last_name}
                    {e.nickname && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>({e.nickname})</span>}
                  </button>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{e.employee_code} · {e.branch.name}{e.department ? ` · ${deptName(e.department)}` : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setStatusModalTarget(e)}
                      style={{ background: STATUS_CFG[e.status].bg, color: STATUS_CFG[e.status].color, borderRadius: 99, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, border: `1px solid ${STATUS_CFG[e.status].border}`, cursor: 'pointer' }}>
                      ● {STATUS_CFG[e.status].label}
                    </button>
                    {e.line_user_id
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dcfce7', color: '#16a34a', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Line <CheckCircle2 size={11} /></span>
                      : <span style={{ background: '#f3f4f6', color: 'var(--text-muted)', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem' }}>ยังไม่ผูก</span>}
                  </div>
                  {activeOffsiteByEmployee.has(e.id) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 600 }}>
                      <MapPin size={10} /> นอกสถานที่
                    </span>
                  )}
                </div>
              </div>
              {e.phone && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11}/>{e.phone}</p>}
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(e)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Pencil size={13}/> แก้ไข</button>
                  <button onClick={() => setDeleteTarget(e)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>ลบ</button>
                </div>
              )}
            </div>
          ))}
          
          {/* Mobile Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="หน้าก่อนหน้า"
                  disabled={page === 1}
                  style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? 'var(--text-muted)' : '#374151', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div key={i} onClick={() => setPage(i + 1)} style={{ width: page === i + 1 ? 20 : 8, height: 8, borderRadius: 99, cursor: 'pointer', background: page === i + 1 ? '#f97316' : '#e5e7eb', transition: 'all 0.2s' }} />
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="หน้าถัดไป"
                  disabled={page === totalPages}
                  style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? 'var(--text-muted)' : '#374151', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>← ปัดซ้ายขวาเพื่อเปลี่ยนหน้า →</span>
            </div>
          )}
        </div>
      )}

      {/* ── Add Modal — 5-step stepper ── */}
      {modal === 'add' && (() => {
        const STEPS = [
          { n: 1, label: 'ข้อมูลส่วนตัว' },
          { n: 2, label: 'ที่อยู่' },
          { n: 3, label: 'การศึกษา & ทักษะ' },
          { n: 4, label: 'การจ้างงาน' },
          { n: 5, label: 'สิทธิ์การใช้งาน' },
        ]
        const inp: React.CSSProperties = { ...input, padding: '9px 12px', fontSize: '13px' }
        const lbl: React.CSSProperties = { ...label, fontSize: '12px', marginBottom: 4 }
        const sec: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: 10 }
        const addAddr = (which: 'addr_id' | 'addr_cur') => (k: string, v: string) =>
          setAddForm(f => ({ ...f, [which]: { ...(f[which] as Record<string,string>), [k]: v } }))

        return (
          <div style={sheetOverlay} onClick={() => setModal(null)}>
            <div style={{ ...sheetBox, width: isMobile ? '100%' : 'clamp(480px, 58vw, 720px)', maxWidth: '96vw', maxHeight: isMobile ? '92vh' : 'min(88vh, 780px)' }} onClick={ev => ev.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: '0 0 2px' }}>เพิ่มพนักงานใหม่</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>กรอกข้อมูลพนักงานให้ครบถ้วน</p>
                </div>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: -2 }} aria-label="ปิด"><X size={18}/></button>
              </div>

              {/* Step indicator */}
              <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
                {isMobile ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {STEPS.map(s => (
                      <div key={s.n} style={{ flex: 1, height: 6, borderRadius: 99, background: addStep > s.n ? '#16a34a' : addStep === s.n ? '#f97316' : '#e5e7eb', transition: 'background 0.25s' }} />
                    ))}
                  </div>
                ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {STEPS.map((s, i) => (
                    <React.Fragment key={s.n}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, background: addStep > s.n ? '#16a34a' : addStep === s.n ? '#f97316' : '#e5e7eb', color: addStep >= s.n ? '#fff' : 'var(--text-muted)', boxShadow: addStep === s.n ? '0 0 0 3px rgba(249,115,22,0.18)' : 'none', transition: 'all 0.2s' }}>
                          {addStep > s.n ? <Check size={13} strokeWidth={3}/> : s.n}
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: addStep > s.n ? '#16a34a' : addStep === s.n ? '#f97316' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: addStep > s.n ? '#16a34a' : '#e5e7eb', marginBottom: 16, transition: 'background 0.3s' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                )}
              </div>

              {/* Step content */}
              <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Step 1 — ข้อมูลส่วนตัว */}
                {addStep === 1 && (<>
                  {/* รหัสพนักงาน */}
                  <div>
                    <label style={lbl}>รหัสพนักงาน</label>
                    <input value="EMP001" readOnly style={{ ...inp, background: '#f9fafb', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                  </div>

                  {/* คำนำหน้า + ชื่อ* + นามสกุล* */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '130px 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>คำนำหน้า</label>
                      <select value={af.prefix} onChange={e => setAf({ prefix: e.target.value })} style={inp}>
                        <option value="">เลือกคำนำหน้า</option>
                        <option>นาย</option><option>นาง</option><option>นางสาว</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>ชื่อ <span style={required}>*</span></label>
                      <input autoFocus value={af.first_name} onChange={e => { setAf({ first_name: e.target.value }); if (e.target.value.trim()) setAddErrors(er => ({ ...er, first_name: undefined })) }} placeholder="ชื่อจริง" style={{ ...inp, ...(addErrors.first_name ? { border: '1.5px solid #ef4444', background: '#fff5f5' } : {}) }} />
                      {addErrors.first_name && <p style={{ fontSize: '11px', color: '#ef4444', margin: '3px 0 0' }}>{addErrors.first_name}</p>}
                    </div>
                    <div>
                      <label style={lbl}>นามสกุล <span style={required}>*</span></label>
                      <input value={af.last_name} onChange={e => { setAf({ last_name: e.target.value }); if (e.target.value.trim()) setAddErrors(er => ({ ...er, last_name: undefined })) }} placeholder="นามสกุล" style={{ ...inp, ...(addErrors.last_name ? { border: '1.5px solid #ef4444', background: '#fff5f5' } : {}) }} />
                      {addErrors.last_name && <p style={{ fontSize: '11px', color: '#ef4444', margin: '3px 0 0' }}>{addErrors.last_name}</p>}
                    </div>
                  </div>

                  {/* ชื่อเล่น */}
                  <div>
                    <label style={lbl}>ชื่อเล่น <span style={required}>*</span></label>
                    <input value={af.nickname} onChange={e => { setAf({ nickname: e.target.value }); if (e.target.value.trim()) setAddErrors(er => ({ ...er, nickname: undefined })) }} placeholder="เช่น บาส, ฟ้า" style={{ ...inp, ...(addErrors.nickname ? { border: '1.5px solid #ef4444', background: '#fff5f5' } : {}) }} />
                    {addErrors.nickname && <p style={{ fontSize: '11px', color: '#ef4444', margin: '3px 0 0' }}>{addErrors.nickname}</p>}
                  </div>

                  {/* อีเมล + เบอร์ */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>อีเมล</label>
                      <input type="email" value={af.email} onChange={e => setAf({ email: e.target.value })} placeholder="example@email.com" style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>เบอร์โทรศัพท์</label>
                      <input value={af.phone} onChange={e => setAf({ phone: e.target.value })} placeholder="08XXXXXXXX" style={inp} inputMode="tel" />
                    </div>
                  </div>

                  {/* Optional fields toggle */}
                  <button type="button" onClick={() => setShowOptionalFields(v => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                    {showOptionalFields ? '▲ ซ่อนข้อมูลเพิ่มเติม' : '▼ ข้อมูลเพิ่มเติม (เลขบัตร, วันเกิด, ผู้ติดต่อฉุกเฉิน)'}
                  </button>

                  {showOptionalFields && (<>
                    {/* เลขบัตร + เลข SSN */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={lbl}>เลขบัตรประชาชน</label>
                        <input value={af.id_card} onChange={e => setAf({ id_card: e.target.value })} placeholder="X-XXXX-XXXXX-XX-X" style={inp} maxLength={17} />
                      </div>
                      <div>
                        <label style={lbl}>เลขประกันสังคม</label>
                        <input value={''} readOnly placeholder="X-XXXX-XXXXX-XX-X" style={{ ...inp, color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    {/* วันเกิด + หมู่เลือด */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={lbl}>วันเกิด</label>
                        <input type="date" value={af.birthdate} onChange={e => setAf({ birthdate: e.target.value })} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>หมู่เลือด</label>
                        <select value={af.blood_type} onChange={e => setAf({ blood_type: e.target.value })} style={inp}>
                          <option value="">เลือกหมู่เลือด</option>
                          {['A','B','AB','O'].map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>เบอร์ติดต่อสำรอง</label>
                      <input value={af.phone_alt} onChange={e => setAf({ phone_alt: e.target.value })} placeholder="08XXXXXXXX" style={inp} inputMode="tel" />
                    </div>

                    {/* ผู้ติดต่อฉุกเฉิน */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={sec}>ผู้ติดต่อฉุกเฉิน</p>
                        <button type="button" onClick={() => setAf({ emergency_contacts: [...af.emergency_contacts, { name: '', relation: '', phone: '' }] })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                          <Plus size={12} strokeWidth={2.5}/>
                          เพิ่มผู้ติดต่อฉุกเฉิน
                        </button>
                      </div>
                      {af.emergency_contacts.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>ยังไม่มีผู้ติดต่อฉุกเฉิน</p>
                      ) : (
                        af.emergency_contacts.map((ec, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 100px 1fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                            <div><label style={lbl}>ชื่อ</label><input value={ec.name} onChange={e => { const c = [...af.emergency_contacts]; c[i].name = e.target.value; setAf({ emergency_contacts: c }) }} style={inp} /></div>
                            <div><label style={lbl}>ความสัมพันธ์</label><input value={ec.relation} onChange={e => { const c = [...af.emergency_contacts]; c[i].relation = e.target.value; setAf({ emergency_contacts: c }) }} style={inp} /></div>
                            <div><label style={lbl}>เบอร์โทร</label><input value={ec.phone} onChange={e => { const c = [...af.emergency_contacts]; c[i].phone = e.target.value; setAf({ emergency_contacts: c }) }} style={inp} /></div>
                            <button type="button" onClick={() => setAf({ emergency_contacts: af.emergency_contacts.filter((_, j) => j !== i) })} style={{ padding: '8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', marginBottom: 1 }} aria-label="ลบ"><X size={13}/></button>
                          </div>
                        ))
                      )}
                    </div>
                  </>)}
                </>)}

                {/* Step 2 — ที่อยู่ */}
                {addStep === 2 && (<>
                  <p style={sec}>ที่อยู่ตามบัตรประชาชน</p>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                    {[['บ้านเลขที่','house'],['ถนน','road'],['ซอย','soi'],['หมู่บ้าน','moo'],['ตำบล/แขวง','sub'],['อำเภอ/เขต','district'],['จังหวัด','province'],['รหัสไปรษณีย์','zip']].map(([lb, k]) => (
                      <div key={k}>
                        <label style={lbl}>{lb}</label>
                        <input value={(af.addr_id as Record<string,string>)[k]} onChange={e => addAddr('addr_id')(k, e.target.value)} style={inp} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <p style={sec}>ที่อยู่ปัจจุบัน</p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={af.addr_cur_same} onChange={e => setAf({ addr_cur_same: e.target.checked })} />
                      ที่อยู่เดียวกันในบัตรประชาชน
                    </label>
                  </div>
                  {!af.addr_cur_same && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      {[['บ้านเลขที่','house'],['ถนน','road'],['ซอย','soi'],['หมู่บ้าน','moo'],['ตำบล/แขวง','sub'],['อำเภอ/เขต','district'],['จังหวัด','province'],['รหัสไปรษณีย์','zip']].map(([lb, k]) => (
                        <div key={k}>
                          <label style={lbl}>{lb}</label>
                          <input value={(af.addr_cur as Record<string,string>)[k]} onChange={e => addAddr('addr_cur')(k, e.target.value)} style={inp} />
                        </div>
                      ))}
                    </div>
                  )}
                </>)}

                {/* Step 3 — การศึกษา & ทักษะ */}
                {addStep === 3 && (<>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={sec}>ประวัติการศึกษา</p>
                      <button type="button" onClick={() => setAf({ educations: [...af.educations, { level: '', institution: '', field: '', year: '' }] })}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                        <Plus size={12} strokeWidth={2.5}/>
                        เพิ่มข้อมูลการศึกษา
                      </button>
                    </div>
                    {af.educations.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีข้อมูลการศึกษา คลิกปุ่มด้านบนเพื่อเพิ่มข้อมูล</p>
                    ) : (
                      af.educations.map((ed, i) => (
                        <div key={i} style={{ padding: '12px', background: '#f9fafb', borderRadius: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                            <div><label style={lbl}>ระดับการศึกษา</label><select value={ed.level} onChange={e => { const c = [...af.educations]; c[i].level = e.target.value; setAf({ educations: c }) }} style={inp}><option value="">เลือก</option>{['ประถมศึกษา','มัธยมศึกษา','ปวช.','ปวส.','ปริญญาตรี','ปริญญาโท','ปริญญาเอก'].map(l => <option key={l}>{l}</option>)}</select></div>
                            <div><label style={lbl}>ปีที่จบ</label><input value={ed.year} onChange={e => { const c = [...af.educations]; c[i].year = e.target.value; setAf({ educations: c }) }} placeholder="2565" style={inp} /></div>
                            <div><label style={lbl}>สถาบัน</label><input value={ed.institution} onChange={e => { const c = [...af.educations]; c[i].institution = e.target.value; setAf({ educations: c }) }} style={inp} /></div>
                            <div><label style={lbl}>สาขา/วิชาเอก</label><input value={ed.field} onChange={e => { const c = [...af.educations]; c[i].field = e.target.value; setAf({ educations: c }) }} style={inp} /></div>
                          </div>
                          <button type="button" onClick={() => setAf({ educations: af.educations.filter((_, j) => j !== i) })} style={{ alignSelf: 'flex-end', padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>ลบ</button>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={sec}>ทักษะ</p>
                      <button type="button" onClick={() => setAf({ skills: [...af.skills, { name: '', level: 'ปานกลาง' }] })}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                        <Plus size={12} strokeWidth={2.5}/>
                        เพิ่มทักษะ
                      </button>
                    </div>
                    {af.skills.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>ยังไม่มีข้อมูลทักษะ คลิกปุ่มด้านบนเพื่อเพิ่มข้อมูล</p>
                    ) : (
                      af.skills.map((sk, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1fr 140px auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                          <div><label style={lbl}>ชื่อทักษะ</label><input value={sk.name} onChange={e => { const c = [...af.skills]; c[i].name = e.target.value; setAf({ skills: c }) }} style={inp} /></div>
                          <div><label style={lbl}>ระดับ</label><select value={sk.level} onChange={e => { const c = [...af.skills]; c[i].level = e.target.value; setAf({ skills: c }) }} style={inp}>{['เบื้องต้น','ปานกลาง','ชำนาญ','เชี่ยวชาญ'].map(l => <option key={l}>{l}</option>)}</select></div>
                          <button type="button" onClick={() => setAf({ skills: af.skills.filter((_, j) => j !== i) })} style={{ padding: '8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', marginBottom: 1 }} aria-label="ลบ"><X size={13}/></button>
                        </div>
                      ))
                    )}
                  </div>
                </>)}

                {/* Step 4 — การจ้างงาน */}
                {addStep === 4 && (<>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>ประเภทพนักงาน</label>
                      <select value={af.emp_type} onChange={e => setAf({ emp_type: e.target.value })} style={inp}>
                        {['ประจำ','พาร์ทไทม์','สัญญาจ้าง','ฝึกงาน'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>สถานะ</label>
                      <input value={af.status} readOnly style={{ ...inp, background: '#f9fafb', color: '#374151' }} />
                    </div>
                    <div>
                      <label style={lbl}>วันที่เข้าทำงาน</label>
                      <input type="date" value={af.hired_at} onChange={e => setAf({ hired_at: e.target.value })} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>เงินเดือน (บาท)</label>
                      <input type="number" value={af.salary} onChange={e => setAf({ salary: e.target.value })} placeholder="18000" style={inp} min="0" />
                    </div>
                    <div>
                      <label style={lbl}>แผนก <span style={required}>*</span></label>
                      <select value={af.department}
                        onChange={e => {
                          const val = e.target.value
                          // เปลี่ยนแผนก → ถ้าตำแหน่งที่เลือกไว้ไม่อยู่ในแผนกใหม่แล้ว เคลียร์ทิ้ง กันข้อมูลขัดกัน
                          const stillValid = af.position_id && filterPositionsByDept(positions, val).some(p => p.id === af.position_id)
                          setAf({ department: val, ...(stillValid ? {} : { position_id: '' }) })
                          if (val) setAddErrors(er => ({ ...er, department: undefined }))
                        }}
                        style={{ ...inp, ...(addErrors.department ? { border: '1.5px solid #ef4444', background: '#fff5f5' } : {}) }}>
                        <option value="">เลือกแผนก</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{deptName(d)}</option>)}
                      </select>
                      {addErrors.department && <p style={{ fontSize: '11px', color: '#ef4444', margin: '3px 0 0' }}>{addErrors.department}</p>}
                    </div>
                    <div>
                      <label style={lbl}>ตำแหน่ง (ผังองค์กร)</label>
                      <select value={af.position_id}
                        onChange={e => {
                          const pos = positions.find(p => p.id === e.target.value)
                          // เลือกตำแหน่งก่อน → auto-fill ช่องแผนกด้านบนถ้าหาแผนกที่ตรงกันเจอ
                          const matched = pos ? matchLegacyDept(positionDivisionName(pos)) : undefined
                          setAf({ position_id: e.target.value, ...(matched ? { department: matched } : {}) })
                        }}
                        style={inp}>
                        <option value="">— ไม่ระบุ —</option>
                        {filterPositionsByDept(positions, af.department).map(p => <option key={p.id} value={p.id}>{positionLabel(p)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>สถานะพนักงาน (โควต้าวันหยุด)</label>
                      <select value={af.employee_status_type_id} onChange={e => setAf({ employee_status_type_id: e.target.value })} style={inp}>
                        <option value="">— ไม่ระบุ —</option>
                        {statusTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.monthly_off_quota} วัน/เดือน)</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>สถานะบัญชี</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={af.account_status} readOnly style={{ ...inp, flex: 1, background: '#f9fafb', color: '#374151' }} />
                        <button type="button" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock size={12}/>
                          ดูประวัติ
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>หมายเหตุ</label>
                    <textarea value={af.notes} onChange={e => setAf({ notes: e.target.value })} rows={4} placeholder="ระบุหมายเหตุเพิ่มเติม" style={{ ...inp, resize: 'vertical' }} />
                  </div>
                </>)}

                {/* Step 5 — สิทธิ์การใช้งาน */}
                {addStep === 5 && (<>
                  {/* รูปโปรไฟล์ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1px dashed #d1d5db' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={22} stroke="#9ca3af" strokeWidth={1.5}/>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '0 0 5px' }}>รูปโปรไฟล์ <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ไม่บังคับ)</span></p>
                      <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                        <Upload size={12}/>อัปโหลดรูป
                      </button>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>JPG, PNG ≤ 5MB</span>
                    </div>
                  </div>

                  <p style={sec}>สิทธิ์การเข้าถึงตามสาขา</p>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 10px' }}>เพิ่มสาขาใหม่</p>
                    <div>
                      <label style={lbl}>เลือกสาขา</label>
                      <select defaultValue=""
                        onChange={e => {
                          if (!e.target.value) return
                          const br = branches.find(b => b.id === e.target.value)
                          if (!br) return
                          if (af.branch_accesses.some(a => a.branch_id === br.id)) return
                          setAf({ branch_accesses: [...af.branch_accesses, { branch_id: br.id, branch_name: br.name }] })
                          e.target.value = ''
                        }}
                        style={inp}>
                        <option value="">เลือกสาขา...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 12px', fontSize: '12px', color: '#15803d', lineHeight: 1.55 }}>
                    <Smartphone size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><strong>ขั้นตอนถัดไป</strong> — หลังบันทึก ระบบจะส่งลิงก์ยืนยัน Line ให้พนักงาน พนักงานต้องกดลิงก์ก่อนจึงจะเช็คอินได้</span>
                  </div>

                  {af.branch_accesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                      <Building2 size={36} stroke="#d1d5db" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 8px' }}/>
                      <p style={{ fontSize: '13px', margin: 0 }}>ยังไม่มีสาขาที่เข้าถึงได้</p>
                      <p style={{ fontSize: '11px', margin: '4px 0 0' }}>เลือกสาขาด้านบนเพื่อเริ่มต้น</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {af.branch_accesses.map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{a.branch_name}</span>
                          </div>
                          <button type="button" onClick={() => setAf({ branch_accesses: af.branch_accesses.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} aria-label="ลบ"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>)}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button onClick={addStep === 1 ? () => setModal(null) : () => setAddStep(s => s - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>
                  {addStep === 1 ? 'ยกเลิก' : (<><ChevronLeft size={13}/> ย้อนกลับ</>)}
                </button>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {addStep > 1 && (
                    <button onClick={() => setModal(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
                  )}
                  {addStep < 5 ? (
                    <button onClick={() => {
                      if (addStep === 1) {
                        const errs: { first_name?: string; last_name?: string; nickname?: string } = {}
                        if (!af.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง'
                        if (!af.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล'
                        if (!af.nickname.trim()) errs.nickname = 'กรุณากรอกชื่อเล่น'
                        if (Object.keys(errs).length) { setAddErrors(er => ({ ...er, ...errs })); return }
                        setAddErrors(er => ({ ...er, first_name: undefined, last_name: undefined, nickname: undefined }))
                      }
                      if (addStep === 4) {
                        if (!af.department) { setAddErrors(er => ({ ...er, department: 'กรุณาเลือกแผนก' })); return }
                        setAddErrors(er => ({ ...er, department: undefined }))
                      }
                      setAddStep(s => s + 1)
                    }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      ถัดไป <ChevronRight size={13}/>
                    </button>
                  ) : (
                    <button onClick={handleAddSave} disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'กำลังบันทึก...' : (<><Check size={13} strokeWidth={2.5}/> บันทึก</>)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Edit Modal ── */}
      {modal === 'edit' && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox} onClick={ev => ev.stopPropagation()}>
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: 0 }}>
                แก้ไข: {editTarget?.first_name} {editTarget?.last_name}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }} aria-label="ปิด"><X size={18}/></button>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}>
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>รหัสพนักงาน</span>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#1e293b', fontWeight: 700 }}>{editTarget?.employee_code}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
                <div><label style={label}>ชื่อ - สกุล</label><input autoFocus value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="เช่น สมชาย ใจดี" style={input} /></div>
                <div><label style={label}>ชื่อเล่น</label><input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="เช่น บาส, ฟ้า" style={input} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>แผนก</label><select value={form.department} onChange={e => {
                  const val = e.target.value
                  const stillValid = form.position_id && filterPositionsByDept(positions, val).some(p => p.id === form.position_id)
                  setForm(f => ({ ...f, department: val, ...(stillValid ? {} : { position_id: '' }) }))
                }} style={input}><option value="">เลือกแผนก</option>{DEPARTMENTS.map(d => <option key={d} value={d}>{deptName(d)}</option>)}</select></div>
                <div><label style={label}>เบอร์โทร</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0XXXXXXXXX" style={input} inputMode="tel" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>สาขา</label><select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} style={input}><option value="">เลือกสาขา</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label style={label}>วันที่เข้าทำงาน</label><input type="date" value={form.hired_at} onChange={e => setForm(f => ({ ...f, hired_at: e.target.value }))} style={input} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>ตำแหน่ง (ผังองค์กร)</label>
                  <select value={form.position_id} onChange={e => {
                    const pos = positions.find(p => p.id === e.target.value)
                    const matched = pos ? matchLegacyDept(positionDivisionName(pos)) : undefined
                    setForm(f => ({ ...f, position_id: e.target.value, ...(matched ? { department: matched } : {}) }))
                  }} style={input}>
                    <option value="">— ไม่ระบุ —</option>
                    {filterPositionsByDept(positions, form.department).map(p => <option key={p.id} value={p.id}>{positionLabel(p)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>สถานะพนักงาน (โควต้าวันหยุด)</label>
                  <select value={form.employee_status_type_id} onChange={e => setForm(f => ({ ...f, employee_status_type_id: e.target.value }))} style={input}>
                    <option value="">— ไม่ระบุ —</option>
                    {statusTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.monthly_off_quota} วัน/เดือน)</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={label}>โหมดจองวันหยุด</label>
                <select value={form.weekly_off_mode} onChange={e => setForm(f => ({ ...f, weekly_off_mode: e.target.value as any }))} style={input}>
                  <option value="WEEKLY">{WEEKLY_OFF_MODE_LABEL.WEEKLY}</option>
                  <option value="MONTHLY_BATCH">{WEEKLY_OFF_MODE_LABEL.MONTHLY_BATCH}</option>
                </select>
              </div>
              {editTarget && (
                <div style={{ background: editTarget.line_user_id ? '#f0fdf4' : '#fef9f0', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: editTarget.line_user_id ? '#15803d' : '#92400e' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Smartphone size={14}/>Line: {editTarget.line_user_id ? `ผูกแล้ว (${editTarget.line_user_id.slice(0, 12)}...)` : 'ยังไม่ผูก — พนักงานต้องยืนยันตัวตนผ่าน LIFF'}</span>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบพนักงาน?"
          message={`"${deleteTarget.first_name} ${deleteTarget.last_name}" (${deleteTarget.employee_code}) จะถูกลบออกจากระบบ`}
          confirmLabel="ลบพนักงาน"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {statusModalTarget && (
        <ChangeStatusModal
          employee={statusModalTarget}
          onClose={() => setStatusModalTarget(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['employees'] })}
        />
      )}
    </div>
  )
}

// ─── Change Status Modal ────────────────────────────────────────────────────
function ChangeStatusModal({ employee, onClose, onSaved }: {
  employee: ApiEmployee; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const qc = useQueryClient()
  const [newStatus, setNewStatus] = useState<EmployeeStatusValue>(employee.status)
  const [reason, setReason] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const historyQ = useQuery<StatusLogEntry[]>({
    queryKey: ['employee', employee.id, 'status-history'],
    queryFn: () => api.get(`/api/v1/admin/employees/${employee.id}/status-history`).then(r => r.data.data),
    enabled: showHistory,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/api/v1/admin/employees/${employee.id}/status`, { status: newStatus, reason: reason.trim() }),
    onSuccess: () => {
      showToast('success', `เปลี่ยนสถานะ "${employee.first_name} ${employee.last_name}" เป็น "${STATUS_CFG[newStatus].label}" แล้ว`)
      onSaved(); onClose()
    },
    onError: () => showToast('error', 'เปลี่ยนสถานะไม่สำเร็จ'),
  })

  function handleSubmit() {
    if (!reason.trim()) { showToast('error', 'กรุณาระบุหมายเหตุ'); return }
    saveMutation.mutate()
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300,
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
  }
  const box: React.CSSProperties = {
    background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16,
    width: isMobile ? '100%' : 480, maxWidth: '96vw',
    maxHeight: isMobile ? '92vh' : 'min(88vh, 700px)', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  }
  const fieldLabel: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6 }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={ev => ev.stopPropagation()}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: '0 0 2px' }}>เปลี่ยนสถานะบัญชีพนักงาน</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>เปลี่ยนสถานะบัญชีพนักงาน โดยต้องระบุหมายเหตุทุกครั้ง</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }} aria-label="ปิด"><X size={18}/></button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Employee info card */}
          <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              <User size={14} color="var(--text-muted)" />
              {employee.employee_code} — {employee.first_name} {employee.last_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: 'var(--text-muted)' }}>
              สถานะปัจจุบัน:
              <span style={{ background: STATUS_CFG[employee.status].bg, color: STATUS_CFG[employee.status].color, borderRadius: 99, padding: '2px 10px', fontWeight: 700, fontSize: '12px' }}>
                {STATUS_CFG[employee.status].label}
              </span>
            </div>
          </div>

          {/* New status select */}
          <div>
            <label style={fieldLabel}>สถานะใหม่ <span style={required}>*</span></label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value as EmployeeStatusValue)} style={input}>
              {Object.entries(STATUS_CFG).map(([v, cfg]) => (
                <option key={v} value={v}>● {cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label style={fieldLabel}>หมายเหตุ <span style={required}>*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="ระบุเหตุผลในการเปลี่ยนสถานะ (บังคับ)"
              style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* History */}
          <div>
            <button onClick={() => setShowHistory(s => !s)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#f97316', fontWeight: 600, fontSize: '12px' }}>
              {showHistory ? '▲ ซ่อนประวัติการเปลี่ยนสถานะ' : '▼ ดูประวัติการเปลี่ยนสถานะ'}
            </button>
            {showHistory && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {historyQ.isLoading && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>กำลังโหลด...</div>}
                {historyQ.data?.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ยังไม่มีประวัติการเปลี่ยนสถานะ</div>}
                {historyQ.data?.map(log => (
                  <div key={log.id} style={{ fontSize: '12px', background: '#f9fafb', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>
                      {log.from_status ? STATUS_CFG[log.from_status].label : '—'} → {STATUS_CFG[log.to_status].label}
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{log.reason}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: '11px' }}>
                      {new Date(log.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={saveMutation.isPending}
            style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saveMutation.isPending ? 0.7 : 1 }}>
            {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
