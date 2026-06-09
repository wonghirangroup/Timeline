// admin/src/pages/leave/index.tsx  [MOCK MODE]
import { useState, useMemo } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

// ─── Types ────────────────────────────────────────────────────────────────────
type LeaveType   = 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch_id: string; branch: { id: string; name: string } }
interface ApiBranch   { id: string; name: string }

interface ApiLeaveRequest {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  reject_note: string | null
  created_at: string
  employee: { id: string; first_name: string; last_name: string; employee_code: string; branch: { id: string; name: string } }
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
let _lvSeq = 100
function genLvId() { return `lv-mock-${_lvSeq++}` }

const MOCK_EMPLOYEES_LV: ApiEmployee[] = [
  { id: 'em-01', first_name: 'สมชาย',    last_name: 'ใจดี',       nickname: 'ชาย',  employee_code: '2567-03-001', branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-02', first_name: 'วิภาวดี',  last_name: 'ศรีสุข',     nickname: 'แนน',  employee_code: '2567-02-002', branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-03', first_name: 'ธนวัฒน์',  last_name: 'มงคล',       nickname: 'วัฒน์',employee_code: '2567-04-003', branch_id: 'br-01', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-04', first_name: 'นันทิชา',  last_name: 'พรหมบุตร',   nickname: 'แพรว', employee_code: '2567-03-004', branch_id: 'br-02', branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
  { id: 'em-07', first_name: 'บุญมา',    last_name: 'สีดา',        nickname: 'บุญ',  employee_code: '2567-04-007', branch_id: 'br-04', branch: { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' } },
]
const MOCK_BRANCHES_LV: ApiBranch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ' },
  { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' },
  { id: 'br-03', name: 'ฟุคุโระ ตลาดย่าโม' },
  { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' },
  { id: 'br-06', name: 'ฟุคุโระ เทิดไท' },
]
const MOCK_LEAVE_REQUESTS: ApiLeaveRequest[] = [
  { id: 'lv-01', employee_id: 'em-01', leave_type: 'SICK',     start_date: '2026-06-05', end_date: '2026-06-06', days: 2, reason: 'ไข้หวัด',         status: 'PENDING',  reviewed_by: null, reviewed_at: null, reject_note: null, created_at: '2026-06-05T08:00:00Z', employee: MOCK_EMPLOYEES_LV[0] },
  { id: 'lv-02', employee_id: 'em-02', leave_type: 'PERSONAL', start_date: '2026-06-10', end_date: '2026-06-10', days: 1, reason: 'ธุระส่วนตัว',      status: 'PENDING',  reviewed_by: null, reviewed_at: null, reject_note: null, created_at: '2026-06-04T10:00:00Z', employee: MOCK_EMPLOYEES_LV[1] },
  { id: 'lv-03', employee_id: 'em-03', leave_type: 'VACATION', start_date: '2026-06-15', end_date: '2026-06-17', days: 3, reason: 'พักผ่อนประจำปี',   status: 'APPROVED', reviewed_by: 'admin-01', reviewed_at: '2026-06-01T09:00:00Z', reject_note: null, created_at: '2026-05-30T09:00:00Z', employee: MOCK_EMPLOYEES_LV[2] },
  { id: 'lv-04', employee_id: 'em-04', leave_type: 'SICK',     start_date: '2026-06-03', end_date: '2026-06-03', days: 1, reason: 'ปวดท้อง',           status: 'REJECTED', reviewed_by: 'admin-01', reviewed_at: '2026-06-03T11:00:00Z', reject_note: 'พนักงานไม่เพียงพอ', created_at: '2026-06-03T07:30:00Z', employee: MOCK_EMPLOYEES_LV[3] },
  { id: 'lv-05', employee_id: 'em-07', leave_type: 'PERSONAL', start_date: '2026-06-20', end_date: '2026-06-20', days: 1, reason: null,               status: 'PENDING',  reviewed_by: null, reviewed_at: null, reject_note: null, created_at: '2026-06-06T14:00:00Z', employee: MOCK_EMPLOYEES_LV[4] },
]

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<LeaveType, { label: string; color: string; bg: string }> = {
  SICK:      { label: 'ลาป่วย',    color: '#16a34a', bg: '#dcfce7' },
  PERSONAL:  { label: 'ลากิจ',     color: '#2563eb', bg: '#dbeafe' },
  VACATION:  { label: 'พักร้อน',   color: '#d97706', bg: '#fef3c7' },
  MATERNITY: { label: 'ลาคลอด',   color: '#7c3aed', bg: '#ede9fe' },
}
const STATUS_CFG: Record<LeaveStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#dc2626', bg: '#fee2e2' },
}
const LEAVE_TYPES: LeaveType[] = ['SICK', 'PERSONAL', 'VACATION', 'MATERNITY']

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none',
}

const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function fmtDate(iso: string) {
  const d = new Date(iso)
  const year = d.getFullYear()
  // ถ้าปี > 2500 แสดงว่า browser ส่ง พ.ศ. มาเป็น CE → ใช้ตรงๆ ไม่บวก 543 อีก
  const beYY = String(year > 2500 ? year : year + 543).slice(-2)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${beYY}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeaveRequestsTab() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const [tab, setTab]               = useState<'requests' | 'add'>('requests')
  const [requests, setRequests]     = useState<ApiLeaveRequest[]>(MOCK_LEAVE_REQUESTS)
  const [employees, setEmployees]   = useState<ApiEmployee[]>(MOCK_EMPLOYEES_LV)
  const [branches, setBranches]     = useState<ApiBranch[]>(MOCK_BRANCHES_LV)
  const [loading, setLoading]       = useState(false)

  const [statusFilter, setStatus]   = useState<'' | LeaveStatus>('')
  const [branchFilter, setBranch]   = useState('')
  const [search, setSearch]         = useState('')

  const [rejectTarget, setRejectTarget]   = useState<ApiLeaveRequest | null>(null)
  const [rejectNote, setRejectNote]       = useState('')
  const [approveTarget, setApproveTarget] = useState<ApiLeaveRequest | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<ApiLeaveRequest | null>(null)
  const [editTarget, setEditTarget]       = useState<ApiLeaveRequest | null>(null)
  const [editForm, setEditForm]           = useState({ leave_type: 'SICK' as LeaveType, start_date: '', end_date: '', days: 1, reason: '' })
  const [saving, setSaving]               = useState(false)

  // Add form
  const [addForm, setAddForm] = useState({
    employee_id: '', leave_type: 'SICK' as LeaveType,
    start_date: '', end_date: '', days: 1, reason: '',
  })
  const [addSaving, setAddSaving] = useState(false)

  function loadAll() {
    setRequests(MOCK_LEAVE_REQUESTS)
    setEmployees(MOCK_EMPLOYEES_LV)
    setBranches(MOCK_BRANCHES_LV)
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false
    if (branchFilter && r.employee.branch.id !== branchFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${r.employee.first_name} ${r.employee.last_name} ${r.employee.employee_code}`.toLowerCase().includes(q)) return false
    }
    return true
  }), [requests, statusFilter, branchFilter, search])

  const summary = useMemo(() => ({
    pending:  requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests])

  // ── Approve ───────────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!approveTarget) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setRequests(prev => prev.map(r => r.id === approveTarget.id
      ? { ...r, status: 'APPROVED', reviewed_by: 'admin-mock', reviewed_at: new Date().toISOString() }
      : r))
    showToast('success', `อนุมัติวันลา ${approveTarget.employee.first_name} สำเร็จ`)
    setApproveTarget(null)
    setSaving(false)
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  async function handleReject() {
    if (!rejectTarget) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setRequests(prev => prev.map(r => r.id === rejectTarget.id
      ? { ...r, status: 'REJECTED', reviewed_by: 'admin-mock', reviewed_at: new Date().toISOString(), reject_note: rejectNote || null }
      : r))
    showToast('success', `ปฏิเสธวันลา ${rejectTarget.employee.first_name} แล้ว`)
    setRejectTarget(null)
    setRejectNote('')
    setSaving(false)
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function openEdit(r: ApiLeaveRequest) {
    setEditForm({
      leave_type:  r.leave_type,
      start_date:  r.start_date.slice(0, 10),
      end_date:    r.end_date.slice(0, 10),
      days:        r.days,
      reason:      r.reason ?? '',
    })
    setEditTarget(r)
  }

  async function handleEdit() {
    if (!editTarget || !editForm.start_date || !editForm.end_date) {
      showToast('error', 'กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (editForm.end_date < editForm.start_date) {
      showToast('error', 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setRequests(prev => prev.map(r => r.id === editTarget.id
      ? { ...r, leave_type: editForm.leave_type, start_date: editForm.start_date,
          end_date: editForm.end_date, days: Number(editForm.days), reason: editForm.reason || null }
      : r))
    showToast('success', 'แก้ไขคำขอวันลาสำเร็จ')
    setEditTarget(null)
    setSaving(false)
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setRequests(prev => prev.filter(r => r.id !== deleteTarget.id))
    showToast('success', `ลบคำขอวันลาของ ${deleteTarget.employee.first_name} แล้ว`)
    setDeleteTarget(null)
    setSaving(false)
  }

  // ── Add leave ─────────────────────────────────────────────────────────────
  async function handleAddLeave() {
    if (!addForm.employee_id || !addForm.start_date || !addForm.end_date) {
      showToast('error', 'กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (addForm.end_date < addForm.start_date) {
      showToast('error', 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น')
      return
    }
    setAddSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const emp = employees.find(e => e.id === addForm.employee_id) ?? employees[0]
    const newReq: ApiLeaveRequest = {
      id: genLvId(), employee_id: addForm.employee_id, leave_type: addForm.leave_type,
      start_date: addForm.start_date, end_date: addForm.end_date, days: Number(addForm.days),
      reason: addForm.reason || null, status: 'PENDING',
      reviewed_by: null, reviewed_at: null, reject_note: null,
      created_at: new Date().toISOString(),
      employee: { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, employee_code: emp.employee_code, branch: emp.branch },
    }
    setRequests(prev => [newReq, ...prev])
    showToast('success', 'สร้างคำขอวันลาสำเร็จ')
    setAddForm({ employee_id: '', leave_type: 'SICK', start_date: '', end_date: '', days: 1, reason: '' })
    setTab('requests')
    setAddSaving(false)
  }

  // ── Auto-calc days ────────────────────────────────────────────────────────
  function calcDays(start: string, end: string) {
    if (!start || !end) return 1
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000
    return Math.max(1, Math.round(diff) + 1)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header / Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setTab(tab === 'add' ? 'requests' : 'add')}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === 'add' ? '#6b7280' : '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
          {tab === 'add' ? '← กลับ' : '+ สร้างวันลา'}
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'รอพิจารณา', value: summary.pending,  color: '#d97706', bg: '#fef3c7', filter: 'PENDING'  as LeaveStatus },
          { label: 'อนุมัติ',   value: summary.approved, color: '#16a34a', bg: '#dcfce7', filter: 'APPROVED' as LeaveStatus },
          { label: 'ไม่อนุมัติ',value: summary.rejected, color: '#dc2626', bg: '#fee2e2', filter: 'REJECTED' as LeaveStatus },
        ].map(k => (
          <button key={k.label} onClick={() => setStatus(statusFilter === k.filter ? '' : k.filter)}
            style={{ flex: 1, background: statusFilter === k.filter ? k.bg : '#fff', border: `2px solid ${statusFilter === k.filter ? k.color : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: k.color, fontWeight: 600 }}>{k.label}</div>
          </button>
        ))}
      </div>

      {/* ── Tab: Add Leave ── */}
      {tab === 'add' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px', maxWidth: 560 }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '15px' }}>+ สร้างคำขอวันลา</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>พนักงาน *</label>
              <select value={addForm.employee_id} onChange={e => setAddForm(f => ({ ...f, employee_id: e.target.value }))} style={inp}>
                <option value="">— เลือกพนักงาน —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code}) · {e.branch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>ประเภทการลา *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEAVE_TYPES.map(t => (
                  <button key={t} onClick={() => setAddForm(f => ({ ...f, leave_type: t }))}
                    style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${addForm.leave_type === t ? TYPE_CFG[t].color : '#e5e7eb'}`, background: addForm.leave_type === t ? TYPE_CFG[t].bg : '#fff', color: addForm.leave_type === t ? TYPE_CFG[t].color : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    {TYPE_CFG[t].label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>วันเริ่มต้น *</label>
                <input type="date" value={addForm.start_date}
                  onChange={e => {
                    const s = e.target.value
                    // ถ้า end_date น้อยกว่า start_date ใหม่ → รีเซ็ต end_date เป็นวันเดียวกัน
                    const end = addForm.end_date && addForm.end_date >= s ? addForm.end_date : s
                    setAddForm(f => ({ ...f, start_date: s, end_date: end, days: calcDays(s, end) }))
                  }} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>วันสิ้นสุด *</label>
                <input type="date" value={addForm.end_date}
                  min={addForm.start_date || undefined}
                  onChange={e => {
                    const end = e.target.value
                    setAddForm(f => ({ ...f, end_date: end, days: calcDays(f.start_date, end) }))
                  }} style={inp} />
              </div>
              <div style={{ textAlign: 'center', padding: '9px 14px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: '13px', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>
                {addForm.days} วัน
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>เหตุผล</label>
              <input value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="ระบุเหตุผล (ไม่บังคับ)" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button onClick={() => setTab('requests')} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>ยกเลิก</button>
              <button onClick={handleAddLeave} disabled={addSaving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: addSaving ? 0.7 : 1 }}>
                {addSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Requests List ── */}
      {tab === 'requests' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อ / รหัส"
              style={{ ...inp, flex: 1, minWidth: 160 }} />
            <select value={branchFilter} onChange={e => setBranch(e.target.value)} style={{ ...inp, width: 'auto' }}>
              <option value="">ทุกสาขา</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatus(e.target.value as any)} style={{ ...inp, width: 'auto' }}>
              <option value="">ทุกสถานะ</option>
              <option value="PENDING">รอพิจารณา</option>
              <option value="APPROVED">อนุมัติ</option>
              <option value="REJECTED">ไม่อนุมัติ</option>
            </select>
          </div>

          {loading && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>กำลังโหลด...</p>}

          {!loading && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {isMobile ? (
                <div>
                  {filtered.length === 0 && <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบรายการ</p>}
                  {filtered.map(r => {
                    const tc = TYPE_CFG[r.leave_type]
                    const sc = STATUS_CFG[r.status]
                    return (
                      <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>{r.employee.first_name} {r.employee.last_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{r.employee.employee_code} · {r.employee.branch.name}</div>
                          </div>
                          <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, alignSelf: 'flex-start' }}>{sc.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: r.status === 'PENDING' ? 10 : 0 }}>
                          <span style={{ background: tc.bg, color: tc.color, borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{tc.label}</span>
                          <span style={{ fontSize: '0.78rem', color: '#374151' }}>{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</span>
                          <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 700 }}>{r.days} วัน</span>
                        </div>
                        {r.reason && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 10px' }}>{r.reason}</p>}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {r.status === 'PENDING' && <>
                            <button onClick={() => setApproveTarget(r)} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Check size={13}/> อนุมัติ</button>
                            <button onClick={() => { setRejectTarget(r); setRejectNote('') }} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><X size={13}/> ปฏิเสธ</button>
                          </>}
                          <button onClick={() => openEdit(r)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '12px', cursor: 'pointer' }}><Pencil size={13}/></button>
                          <button onClick={() => setDeleteTarget(r)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}><Trash2 size={13}/></button>
                        </div>
                        {r.status === 'REJECTED' && r.reject_note && (
                          <p style={{ fontSize: '0.75rem', color: '#dc2626', margin: '6px 0 0', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>หมายเหตุ: {r.reject_note}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#fff7ed' }}>
                      {['พนักงาน', 'สาขา', 'ประเภท', 'ช่วงวันลา', 'จำนวน', 'เหตุผล', 'สถานะ', 'จัดการ'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#c2410c', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบรายการ</td></tr>
                    )}
                    {filtered.map((r, i) => {
                      const tc = TYPE_CFG[r.leave_type]
                      const sc = STATUS_CFG[r.status]
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ fontWeight: 600 }}>{r.employee.first_name} {r.employee.last_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{r.employee.employee_code}</div>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{r.employee.branch.name}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: tc.bg, color: tc.color, borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{tc.label}</span>
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>
                            {fmtDate(r.start_date)} – {fmtDate(r.end_date)}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#6366f1', textAlign: 'center' }}>{r.days}</td>
                          <td style={{ padding: '11px 14px', fontSize: '0.78rem', color: '#6b7280', maxWidth: 160 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason ?? '—'}</div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{sc.label}</span>
                            {r.status === 'REJECTED' && r.reject_note && (
                              <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 3 }}>{r.reject_note}</div>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {r.status === 'PENDING' && <>
                                <button onClick={() => setApproveTarget(r)}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}><Check size={13}/></button>
                                <button onClick={() => { setRejectTarget(r); setRejectNote('') }}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}><X size={13}/></button>
                              </>}
                              <button onClick={() => openEdit(r)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer' }}><Pencil size={13}/></button>
                              <button onClick={() => setDeleteTarget(r)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: '0.75rem', cursor: 'pointer' }}><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setEditTarget(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: 24, width: isMobile ? '100%' : 480, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>แก้ไขคำขอวันลา</h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#6b7280' }}>
              {editTarget.employee.first_name} {editTarget.employee.last_name} · {editTarget.employee.employee_code}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>ประเภทการลา</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {LEAVE_TYPES.map(t => (
                    <button key={t} onClick={() => setEditForm(f => ({ ...f, leave_type: t }))}
                      style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${editForm.leave_type === t ? TYPE_CFG[t].color : '#e5e7eb'}`, background: editForm.leave_type === t ? TYPE_CFG[t].bg : '#fff', color: editForm.leave_type === t ? TYPE_CFG[t].color : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      {TYPE_CFG[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>วันเริ่มต้น</label>
                  <input type="date" value={editForm.start_date}
                    onChange={e => {
                      const s = e.target.value
                      const end = editForm.end_date >= s ? editForm.end_date : s
                      setEditForm(f => ({ ...f, start_date: s, end_date: end, days: calcDays(s, end) }))
                    }} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>วันสิ้นสุด</label>
                  <input type="date" value={editForm.end_date} min={editForm.start_date || undefined}
                    onChange={e => { const end = e.target.value; setEditForm(f => ({ ...f, end_date: end, days: calcDays(f.start_date, end) })) }}
                    style={inp} />
                </div>
                <div style={{ textAlign: 'center', padding: '9px 14px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: '13px', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>
                  {editForm.days} วัน
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>เหตุผล</label>
                <input value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="ระบุเหตุผล" style={inp}
                  onKeyDown={e => { if (e.key === 'Enter') handleEdit() }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleEdit} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="ลบคำขอวันลา?"
          message={`${deleteTarget.employee.first_name} ${deleteTarget.employee.last_name} — ${TYPE_CFG[deleteTarget.leave_type].label} ${deleteTarget.days} วัน${deleteTarget.status === 'APPROVED' ? '\n⚠️ วันลาที่หักไปจะถูกคืนกลับ' : ''}`}
          confirmLabel="ลบ"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Approve confirm */}
      {approveTarget && (
        <ConfirmDialog
          title="อนุมัติวันลา?"
          message={`${approveTarget.employee.first_name} ${approveTarget.employee.last_name} — ${TYPE_CFG[approveTarget.leave_type].label} ${approveTarget.days} วัน (${fmtDate(approveTarget.start_date)} – ${fmtDate(approveTarget.end_date)})`}
          confirmLabel="อนุมัติ"
          variant="default"
          onConfirm={handleApprove}
          onCancel={() => setApproveTarget(null)}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setRejectTarget(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 14, padding: 24, width: isMobile ? '100%' : 420, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>ปฏิเสธวันลา</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#6b7280' }}>
              {rejectTarget.employee.first_name} {rejectTarget.employee.last_name} — {TYPE_CFG[rejectTarget.leave_type].label} {rejectTarget.days} วัน
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>เหตุผลที่ปฏิเสธ (ไม่บังคับ)</label>
              <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                placeholder="เช่น พนักงานไม่เพียงพอในวันนั้น"
                style={inp} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleReject() }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setRejectTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleReject} disabled={saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'ปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
