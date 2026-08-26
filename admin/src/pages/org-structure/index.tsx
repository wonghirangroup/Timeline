// admin/src/pages/org-structure/index.tsx
// กลุ่ม(บริษัท) → ผังองค์กร 3 ชั้น (ฝ่าย → แผนก → ตำแหน่ง) ใต้กลุ่มที่เลือก + สถานะพนักงาน
// (โควต้าวันหยุดต่อเดือน + เงื่อนไขวันหยุดอัตโนมัติ) — ทุกชั้นผูก parent ชัดเจนเสมอ เพราะเป็น
// ที่อยู่ของ policy cascade (booking_enabled) ด้วย ไม่ใช่แค่ label เฉยๆ แบบเวอร์ชันก่อน
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Layers, UserSquare2, Plus, Pencil, Trash2, ChevronRight, IdCard, Landmark, MapPinned } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600,
}
const btnGhost = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, border: `1px dashed ${color}55`, cursor: 'pointer',
  background: bg, color, fontSize: '12.5px', fontWeight: 700,
})
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 400, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }
const label: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

interface GroupT { id: string; name: string; booking_enabled: boolean; is_active: boolean; _count: { branches: number; divisions: number } }
interface BranchT { id: string; name: string; group_id: string | null }
interface Div  { id: string; name: string; group_id: string; booking_enabled: boolean | null; is_active: boolean; _count: { departments: number } }
interface Dept { id: string; name: string; division_id: string; booking_enabled: boolean | null; is_active: boolean; _count: { positions: number } }
interface Pos  { id: string; name: string; department_id: string; is_active: boolean; _count: { employees: number } }

interface TreePos extends Pos {}
interface TreeDept extends Dept { positions: TreePos[] }
interface TreeDiv extends Div { departments: TreeDept[] }

type Level = 'division' | 'department' | 'position'
const LEVEL_LABEL: Record<Level, string> = { division: 'ฝ่าย', department: 'แผนก', position: 'ตำแหน่ง' }
const LEVEL_ICON: Record<Level, JSX.Element> = { division: <Layers size={15}/>, department: <Building2 size={14}/>, position: <UserSquare2 size={15}/> }
const LEVEL_COLOR: Record<Level, string> = { division: '#6366f1', department: '#0891b2', position: '#16a34a' }
const LEVEL_ENDPOINT: Record<Level, string> = { division: 'divisions', department: 'departments', position: 'positions' }

// null = inherit จากชั้นบน, true/false = override ตรงๆ — ใช้ซ้ำทั้ง Division/Department/Employee
const BookingToggle = ({ value, onChange, inheritLabel }: { value: boolean | null; onChange: (v: boolean | null) => void; inheritLabel: string }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {([
      { v: null,  label: inheritLabel,  color: '#6b7280', bg: '#f9fafb' },
      { v: true,  label: 'เปิด (จองได้)', color: '#16a34a', bg: '#f0fdf4' },
      { v: false, label: 'ปิด (จองไม่ได้)', color: '#dc2626', bg: '#fef2f2' },
    ] as const).map(opt => {
      const active = value === opt.v
      return (
        <button key={String(opt.v)} type="button" onClick={() => onChange(opt.v)}
          style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${active ? opt.color : '#e5e7eb'}`, background: active ? opt.bg : '#fff', color: active ? opt.color : '#9ca3af', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
          {opt.label}
        </button>
      )
    })}
  </div>
)

// ── กลุ่ม (บริษัท) Tab ───────────────────────────────────────────────────────
function GroupsTab({ selectedGroupId, onSelectGroup }: { selectedGroupId: string; onSelectGroup: (id: string) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [modal, setModal] = useState<{ edit?: GroupT } | null>(null)
  const [form, setForm] = useState({ name: '', booking_enabled: true })
  const [deleteTarget, setDeleteTarget] = useState<GroupT | null>(null)
  const [assignBranchGroup, setAssignBranchGroup] = useState<Record<string, string>>({})

  const { data: groups = [], isLoading } = useQuery<GroupT[]>({ queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data) })
  const { data: branches = [] } = useQuery<BranchT[]>({ queryKey: ['branches'], queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data) })

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['branches'] }) }

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/groups', body),
    onSuccess: () => { invalidate(); showToast('success', 'สร้างกลุ่มสำเร็จ'); setModal(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.code === 'LIMIT_REACHED' ? 'สร้างกลุ่มครบตามจำนวนที่ package รองรับแล้ว' : 'สร้างไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/groups/${id}`, body),
    onSuccess: () => { invalidate(); showToast('success', 'บันทึกสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/groups/${id}`),
    onSuccess: () => { invalidate(); showToast('success', 'ลบสำเร็จ'); setDeleteTarget(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.code === 'IN_USE' ? 'มีสาขา/ฝ่ายผูกกลุ่มนี้อยู่ ย้ายออกก่อน' : 'ลบไม่สำเร็จ'),
  })
  const assignMutation = useMutation({
    mutationFn: ({ branchId, groupId }: { branchId: string; groupId: string | null }) => api.patch(`/api/v1/admin/branches/${branchId}/group`, { group_id: groupId }),
    onSuccess: () => { invalidate(); showToast('success', 'ผูกสาขาเข้ากลุ่มสำเร็จ') },
    onError: () => showToast('error', 'ผูกไม่สำเร็จ'),
  })

  const openAdd = () => { setForm({ name: '', booking_enabled: true }); setModal({}) }
  const openEdit = (g: GroupT) => { setForm({ name: g.name, booking_enabled: g.booking_enabled }); setModal({ edit: g }) }
  const handleSave = () => {
    if (!modal || !form.name.trim()) return
    if (modal.edit) updateMutation.mutate({ id: modal.edit.id, body: form })
    else createMutation.mutate(form)
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: 480 }}>
          กลุ่ม (บริษัท) คั่นระหว่างสาขากับผังองค์กร — กำหนดสิทธิ์จองวันหยุดเริ่มต้นของทุกสาขา/ฝ่าย/แผนก/พนักงานในกลุ่มนั้น
        </p>
        <button style={btnPrimary} onClick={openAdd}><Plus size={14}/> เพิ่มกลุ่ม</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.length === 0 && <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีกลุ่ม</div>}
        {groups.map(g => {
          const groupBranches = branches.filter(b => b.group_id === g.id)
          const unassignedBranches = branches.filter(b => b.group_id !== g.id)
          const isSelected = selectedGroupId === g.id
          return (
            <div key={g.id} style={{ ...card, padding: 14, border: isSelected ? '1.5px solid #f97316' : '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
                  <Landmark size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>{g.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{g._count.branches} สาขา · {g._count.divisions} ฝ่าย</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: g.booking_enabled ? '#16a34a' : '#dc2626', background: g.booking_enabled ? '#f0fdf4' : '#fef2f2', padding: '4px 10px', borderRadius: 99 }}>
                  {g.booking_enabled ? 'จองวันหยุดได้' : 'จองวันหยุดไม่ได้'}
                </span>
                <button onClick={() => onSelectGroup(g.id)} style={{ ...btnGhost('#f97316', '#fff7ed'), border: isSelected ? '1.5px solid #f97316' : '1px dashed #f9731655' }}>
                  {isSelected ? '✓ กำลังดูผังกลุ่มนี้' : 'ดูผังองค์กร'}
                </button>
                <button onClick={() => openEdit(g)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
                <button onClick={() => setDeleteTarget(g)} style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <MapPinned size={13} color="#9ca3af" />
                {groupBranches.length === 0 && <span style={{ fontSize: '11.5px', color: '#d1d5db', fontStyle: 'italic' }}>ยังไม่มีสาขาในกลุ่มนี้</span>}
                {groupBranches.map(b => (
                  <span key={b.id} style={{ fontSize: '11.5px', color: '#374151', background: '#f9fafb', padding: '3px 9px', borderRadius: 99, border: '1px solid #e5e7eb' }}>{b.name}</span>
                ))}
                {unassignedBranches.length > 0 && (
                  <select
                    style={{ ...inputStyle, width: 'auto', fontSize: '11.5px', padding: '4px 8px' }}
                    value={assignBranchGroup[g.id] ?? ''}
                    onChange={e => {
                      const branchId = e.target.value
                      if (!branchId) return
                      setAssignBranchGroup(m => ({ ...m, [g.id]: '' }))
                      assignMutation.mutate({ branchId, groupId: g.id })
                    }}>
                    <option value="">+ เพิ่มสาขาเข้ากลุ่ม</option>
                    {unassignedBranches.map(b => <option key={b.id} value={b.id}>{b.name}{b.group_id ? ' (ย้ายจากกลุ่มอื่น)' : ''}</option>)}
                  </select>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขกลุ่ม' : 'เพิ่มกลุ่มใหม่'}</h3>
            <label style={label}>ชื่อกลุ่ม</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น วงษ์, สมาร์ทจิ๊กซอว์" />
            <label style={{ ...label, margin: '12px 0 6px' }}>สิทธิ์จองวันหยุด (ค่าเริ่มต้นของทุกอย่างในกลุ่มนี้)</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[{ v: true, label: 'เปิด — จองได้' }, { v: false, label: 'ปิด — หยุดได้แค่เสาร์-อาทิตย์ตายตัว' }].map(opt => {
                const active = form.booking_enabled === opt.v
                return (
                  <button key={String(opt.v)} type="button" onClick={() => setForm(f => ({ ...f, booking_enabled: opt.v }))}
                    style={{ flex: 1, padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${active ? (opt.v ? '#16a34a' : '#dc2626') : '#e5e7eb'}`, background: active ? (opt.v ? '#f0fdf4' : '#fef2f2') : '#fff', color: active ? (opt.v ? '#16a34a' : '#dc2626') : '#9ca3af', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
                {modal.edit ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบกลุ่ม"
          message={<>ยืนยันลบ "<strong>{deleteTarget.name}</strong>" — ถ้ามีสาขา/ฝ่ายผูกอยู่ ระบบจะลบไม่สำเร็จ</>}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── Add Division/Department/Position modal ──────────────────────────────────
function AddEntityModal({ level, groupId, divs, depts, onClose }: {
  level: Level; groupId: string; divs: Div[]; depts: Dept[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [divId, setDivId] = useState('')
  const [deptId, setDeptId] = useState('')
  const [name, setName] = useState('')

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['divisions'] })
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
    qc.invalidateQueries({ queryKey: ['org-tree'] })
  }

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`/api/v1/admin/${LEVEL_ENDPOINT[level]}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', `สร้าง${LEVEL_LABEL[level]}สำเร็จ`); onClose() },
    onError: () => showToast('error', 'สร้างไม่สำเร็จ'),
  })

  const availableDepts = depts.filter(d => d.division_id === divId)
  const canSave = name.trim() && (level === 'division' || (level === 'department' && divId) || (level === 'position' && deptId))

  const handleSave = () => {
    if (!canSave) return
    if (level === 'division') createMutation.mutate({ group_id: groupId, name })
    else if (level === 'department') createMutation.mutate({ division_id: divId, name })
    else createMutation.mutate({ department_id: deptId, name })
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>เพิ่ม{LEVEL_LABEL[level]}ใหม่</h3>

        {level !== 'division' && (
          <>
            <label style={label}>ฝ่าย</label>
            <select style={inputStyle} value={divId} onChange={e => { setDivId(e.target.value); setDeptId('') }}>
              <option value="">— เลือกฝ่าย —</option>
              {divs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </>
        )}

        {level === 'position' && (
          <>
            <label style={{ ...label, margin: '10px 0 4px' }}>แผนก</label>
            <select style={inputStyle} value={deptId} onChange={e => setDeptId(e.target.value)} disabled={!divId}>
              <option value="">— เลือกแผนก —</option>
              {availableDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </>
        )}

        <label style={{ ...label, margin: '10px 0 4px' }}>ชื่อ{LEVEL_LABEL[level]}</label>
        <input autoFocus style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={`ชื่อ${LEVEL_LABEL[level]}`} />

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={!canSave || createMutation.isPending} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !canSave ? 0.5 : 1 }}>
            สร้าง
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Org Tree Tab (ผังของกลุ่มที่เลือก) ───────────────────────────────────────
function OrgTreeTab({ groupId }: { groupId: string }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addModal, setAddModal] = useState<Level | null>(null)
  const [editModal, setEditModal] = useState<{ level: Level; row: any } | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; booking_enabled: boolean | null }>({ name: '', booking_enabled: null })
  const [deleteTarget, setDeleteTarget] = useState<{ level: Level; id: string; name: string } | null>(null)

  const { data: divs  = [], isLoading } = useQuery<Div[]>({ queryKey: ['divisions', groupId], queryFn: () => api.get('/api/v1/admin/divisions', { params: { group_id: groupId } }).then(r => r.data.data) })
  const { data: depts = [] } = useQuery<Dept[]>({ queryKey: ['departments', groupId], queryFn: () => api.get('/api/v1/admin/departments').then(r => r.data.data) })
  const { data: tree  = [] } = useQuery<TreeDiv[]>({ queryKey: ['org-tree', groupId], queryFn: () => api.get('/api/v1/admin/org-structure/tree', { params: { group_id: groupId } }).then(r => r.data.data) })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['divisions'] })
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
    qc.invalidateQueries({ queryKey: ['org-tree'] })
    qc.invalidateQueries({ queryKey: ['groups'] })
  }

  const updateMutation = useMutation({
    mutationFn: ({ level, id, body }: { level: Level; id: string; body: object }) => api.patch(`/api/v1/admin/${LEVEL_ENDPOINT[level]}/${id}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', 'บันทึกสำเร็จ'); setEditModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ level, id }: { level: Level; id: string }) => api.delete(`/api/v1/admin/${LEVEL_ENDPOINT[level]}/${id}`),
    onSuccess: () => { invalidateAll(); showToast('success', 'ลบสำเร็จ'); setDeleteTarget(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.message ?? 'ลบไม่สำเร็จ'),
  })

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const openEdit = (level: Level, row: any) => { setEditForm({ name: row.name, booking_enabled: row.booking_enabled ?? null }); setEditModal({ level, row }) }
  const handleEditSave = () => {
    if (!editModal || !editForm.name.trim()) return
    const body: any = { name: editForm.name }
    if (editModal.level !== 'position') body.booking_enabled = editForm.booking_enabled
    updateMutation.mutate({ level: editModal.level, id: editModal.row.id, body })
  }

  const rowStyle = (depth: number): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
    paddingLeft: 10 + depth * 24, borderRadius: 8,
  })
  const editBtn = (level: Level, row: any) => (
    <button onClick={() => openEdit(level, row)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
  )
  const delBtn = (level: Level, id: string, name: string) => (
    <button onClick={() => setDeleteTarget({ level, id, name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
  )
  const bookingBadge = (v: boolean | null) => v === null ? null : (
    <span style={{ fontSize: '10px', fontWeight: 700, color: v ? '#16a34a' : '#dc2626', background: v ? '#f0fdf4' : '#fef2f2', padding: '2px 7px', borderRadius: 99 }}>{v ? 'จองได้' : 'จองไม่ได้'}</span>
  )

  const positionRow = (p: TreePos, depth: number) => (
    <div key={p.id} style={rowStyle(depth)}>
      <span style={{ width: 14 }} />
      <span style={{ display: 'flex', color: LEVEL_COLOR.position }}>{LEVEL_ICON.position}</span>
      <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{p.name}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p._count.employees} คน</span>
      {editBtn('position', p)}
      {delBtn('position', p.id, p.name)}
    </div>
  )
  const departmentRow = (dt: TreeDept, depth: number) => {
    const open = expanded.has(dt.id)
    return (
      <div key={dt.id}>
        <div style={rowStyle(depth)}>
          <button onClick={() => toggle(dt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
            <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <span style={{ display: 'flex', color: LEVEL_COLOR.department }}>{LEVEL_ICON.department}</span>
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#374151', flex: 1 }}>{dt.name}</span>
          {bookingBadge(dt.booking_enabled)}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dt.positions.length} ตำแหน่ง</span>
          {editBtn('department', dt)}
          {delBtn('department', dt.id, dt.name)}
        </div>
        {open && dt.positions.map(p => positionRow(p, depth + 1))}
        {open && dt.positions.length === 0 && <div style={{ ...rowStyle(depth + 1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีตำแหน่ง</div>}
      </div>
    )
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button style={btnGhost(LEVEL_COLOR.division, '#eef2ff')} onClick={() => setAddModal('division')}><Plus size={12}/> ฝ่าย</button>
        <button style={btnGhost(LEVEL_COLOR.department, '#ecfeff')} onClick={() => setAddModal('department')} disabled={divs.length === 0}><Plus size={12}/> แผนก</button>
        <button style={btnGhost(LEVEL_COLOR.position, '#f0fdf4')} onClick={() => setAddModal('position')} disabled={depts.length === 0}><Plus size={12}/> ตำแหน่ง</button>
      </div>

      <div style={{ ...card, padding: 8 }}>
        {tree.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            กลุ่มนี้ยังไม่มีฝ่าย — กดปุ่ม "ฝ่าย" ด้านบนเพื่อเริ่มสร้างผังองค์กร
          </div>
        )}
        {tree.map(dv => {
          const isOpen = expanded.has(dv.id)
          return (
            <div key={dv.id}>
              <div style={rowStyle(0)}>
                <button onClick={() => toggle(dv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                  <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                <span style={{ display: 'flex', color: LEVEL_COLOR.division }}>{LEVEL_ICON.division}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827', flex: 1 }}>{dv.name}</span>
                {bookingBadge(dv.booking_enabled)}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dv.departments.length} แผนก</span>
                {editBtn('division', dv)}
                {delBtn('division', dv.id, dv.name)}
              </div>
              {isOpen && dv.departments.map(dt => departmentRow(dt, 1))}
              {isOpen && dv.departments.length === 0 && (
                <div style={{ ...rowStyle(1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีแผนก</div>
              )}
            </div>
          )
        })}
      </div>

      {addModal && <AddEntityModal level={addModal} groupId={groupId} divs={divs} depts={depts} onClose={() => setAddModal(null)} />}

      {editModal && (
        <div style={modalOverlay} onClick={() => setEditModal(null)}>
          <div style={{ ...modalBox, width: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>แก้ไข{LEVEL_LABEL[editModal.level]}</h3>
            <label style={label}>ชื่อ</label>
            <input autoFocus style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            {editModal.level !== 'position' && (
              <>
                <label style={{ ...label, margin: '12px 0 6px' }}>สิทธิ์จองวันหยุด</label>
                <BookingToggle
                  value={editForm.booking_enabled}
                  onChange={v => setEditForm(f => ({ ...f, booking_enabled: v }))}
                  inheritLabel={editModal.level === 'division' ? 'ใช้ค่าจากกลุ่ม' : 'ใช้ค่าจากฝ่าย'}
                />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleEditSave} disabled={!editForm.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !editForm.name.trim() ? 0.5 : 1 }}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`ลบ${LEVEL_LABEL[deleteTarget.level]}`}
          message={<>ยืนยันลบ "<strong>{deleteTarget.name}</strong>" — ถ้ามีข้อมูลย่อยผูกอยู่ ระบบจะลบไม่สำเร็จ</>}
          onConfirm={() => deleteMutation.mutate({ level: deleteTarget.level, id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── Employee Status Types Tab ───────────────────────────────────────────────
type DayRule = 'WORK' | 'OFF' | 'OFFSITE'
const DAY_RULE_CFG: Record<DayRule, { label: string; color: string; bg: string }> = {
  WORK:    { label: 'ทำงานปกติ',        color: '#6b7280', bg: '#f9fafb' },
  OFF:     { label: 'หยุด',              color: '#0891b2', bg: '#ecfeff' },
  OFFSITE: { label: 'ทำงานนอกสถานที่',  color: '#9333ea', bg: '#faf5ff' },
}
interface StatusType {
  id: string; name: string; monthly_off_quota: number
  saturday_rule: DayRule; sunday_rule: DayRule; off_on_public_holiday: boolean
  is_active: boolean; _count: { employees: number }
}

function StatusTypesTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [modal, setModal] = useState<{ edit?: StatusType } | null>(null)
  const [form, setForm] = useState({ name: '', monthly_off_quota: '4', saturday_rule: 'WORK' as DayRule, sunday_rule: 'WORK' as DayRule, off_on_public_holiday: true })
  const [deleteTarget, setDeleteTarget] = useState<StatusType | null>(null)

  const { data: types = [], isLoading } = useQuery<StatusType[]>({
    queryKey: ['employee-status-types'], queryFn: () => api.get('/api/v1/admin/employee-status-types').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/employee-status-types', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-status-types'] }); showToast('success', 'สร้างสถานะพนักงานสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'สร้างไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/employee-status-types/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-status-types'] }); showToast('success', 'บันทึกสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/employee-status-types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-status-types'] }); showToast('success', 'ลบสำเร็จ'); setDeleteTarget(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.code === 'IN_USE' ? 'มีพนักงานผูกสถานะนี้อยู่ ย้ายพนักงานออกก่อน' : 'ลบไม่สำเร็จ'),
  })

  const openAdd = () => { setForm({ name: '', monthly_off_quota: '4', saturday_rule: 'WORK', sunday_rule: 'WORK', off_on_public_holiday: true }); setModal({}) }
  const openEdit = (t: StatusType) => { setForm({ name: t.name, monthly_off_quota: String(t.monthly_off_quota), saturday_rule: t.saturday_rule, sunday_rule: t.sunday_rule, off_on_public_holiday: t.off_on_public_holiday }); setModal({ edit: t }) }
  const handleSave = () => {
    if (!modal || !form.name.trim()) return
    const body = {
      name: form.name, monthly_off_quota: parseInt(form.monthly_off_quota) || 0,
      saturday_rule: form.saturday_rule, sunday_rule: form.sunday_rule, off_on_public_holiday: form.off_on_public_holiday,
    }
    if (modal.edit) updateMutation.mutate({ id: modal.edit.id, body })
    else createMutation.mutate(body)
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  const CheckRow = ({ label: lbl, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: checked ? '#fff7ed' : '#f9fafb', cursor: 'pointer', marginBottom: 6 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 600 }}>{lbl}</span>
    </label>
  )
  const DayRuleRow = ({ label: lbl, value, onChange }: { label: string; value: DayRule; onChange: (v: DayRule) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 600, width: 64, flexShrink: 0 }}>{lbl}</span>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {(['WORK', 'OFF', 'OFFSITE'] as DayRule[]).map(rule => {
          const cfg = DAY_RULE_CFG[rule]
          const active = value === rule
          return (
            <button key={rule} type="button" onClick={() => onChange(rule)}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1.5px solid ${active ? cfg.color : '#e5e7eb'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#9ca3af', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: 480 }}>
          กำหนดสถานะพนักงาน (เช่น ประจำ, ชั่วคราว) พร้อมโควต้าวันหยุดต่อเดือน และเงื่อนไขวันหยุดอัตโนมัติ (เสาร์/อาทิตย์/นักขัตฤกษ์)
        </p>
        <button style={btnPrimary} onClick={openAdd}><Plus size={14}/> เพิ่มสถานะ</button>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {types.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีสถานะพนักงาน</div>
        )}
        {types.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', flexWrap: 'wrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
              <IdCard size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{t.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{t._count.employees} คน</p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '3px 9px', borderRadius: 99 }}>{t.monthly_off_quota} วัน/เดือน</span>
              {t.saturday_rule !== 'WORK' && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: DAY_RULE_CFG[t.saturday_rule].color, background: DAY_RULE_CFG[t.saturday_rule].bg, padding: '3px 9px', borderRadius: 99 }}>เสาร์: {DAY_RULE_CFG[t.saturday_rule].label}</span>
              )}
              {t.sunday_rule !== 'WORK' && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: DAY_RULE_CFG[t.sunday_rule].color, background: DAY_RULE_CFG[t.sunday_rule].bg, padding: '3px 9px', borderRadius: 99 }}>อาทิตย์: {DAY_RULE_CFG[t.sunday_rule].label}</span>
              )}
              {t.off_on_public_holiday && <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 9px', borderRadius: 99 }}>หยุดนักขัตฤกษ์</span>}
            </div>
            <button onClick={() => openEdit(t)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
            <button onClick={() => setDeleteTarget(t)} style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={{ ...modalBox, width: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขสถานะพนักงาน' : 'เพิ่มสถานะพนักงานใหม่'}</h3>
            <label style={label}>ชื่อสถานะ</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ประจำ, ชั่วคราว, รายวัน" />
            <label style={{ ...label, margin: '12px 0 4px' }}>โควต้าวันหยุดต่อเดือน</label>
            <input type="number" min={0} style={inputStyle} value={form.monthly_off_quota} onChange={e => setForm(f => ({ ...f, monthly_off_quota: e.target.value }))} />

            <div style={{ marginTop: 14 }}>
              <label style={{ ...label, marginBottom: 8 }}>
                เงื่อนไขวันเสาร์-อาทิตย์
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — เช่น office หยุดอาทิตย์ แต่เสาร์ทำงานนอกสถานที่</span>
              </label>
              <DayRuleRow label="วันเสาร์" value={form.saturday_rule} onChange={v => setForm(f => ({ ...f, saturday_rule: v }))} />
              <DayRuleRow label="วันอาทิตย์" value={form.sunday_rule} onChange={v => setForm(f => ({ ...f, sunday_rule: v }))} />
              <div style={{ marginTop: 8 }}>
                <CheckRow label="หยุดวันนักขัตฤกษ์อัตโนมัติ" checked={form.off_on_public_holiday} onChange={v => setForm(f => ({ ...f, off_on_public_holiday: v }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
                {modal.edit ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบสถานะพนักงาน"
          message={<>ยืนยันลบ "<strong>{deleteTarget.name}</strong>"{deleteTarget._count.employees > 0 ? <> — มีพนักงาน {deleteTarget._count.employees} คนผูกสถานะนี้อยู่ ต้องย้ายออกก่อนจึงลบได้</> : null}</>}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ฝังในหน้า "จัดการพนักงาน" เป็นแท็บย่อย (admin/src/pages/employee/index.tsx) —
// ไม่มี h1/description ของตัวเอง เพราะ header ของหน้าพนักงานทำหน้าที่นั้นแทนแล้ว
export default function OrgStructurePage() {
  const [tab, setTab] = useState<'groups' | 'tree' | 'status'>('groups')
  const [selectedGroupId, setSelectedGroupId] = useState('')

  const { data: groups = [] } = useQuery<GroupT[]>({ queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 4, overflowX: 'auto' }}>
        {([
          { id: 'groups', label: 'กลุ่ม (บริษัท)', icon: <Landmark size={15}/>,  color: '#f97316', activeBg: '#fff7ed' },
          { id: 'tree',   label: 'ผังองค์กร',      icon: <Building2 size={15}/>, color: '#f97316', activeBg: '#fff7ed' },
          { id: 'status', label: 'สถานะพนักงาน',   icon: <IdCard size={15}/>,    color: '#ea580c', activeBg: '#fff7ed' },
        ] as const).map(t => {
          const isActive = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
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

      {tab === 'groups' && (
        <GroupsTab
          selectedGroupId={selectedGroupId}
          onSelectGroup={id => { setSelectedGroupId(id); setTab('tree') }}
        />
      )}
      {tab === 'tree' && (
        groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            ยังไม่มีกลุ่ม — ไปที่แท็บ "กลุ่ม (บริษัท)" เพื่อสร้างกลุ่มก่อน
          </div>
        ) : !selectedGroupId ? (
          <div style={{ ...card, padding: 16 }}>
            <label style={label}>เลือกกลุ่มที่จะดูผังองค์กร</label>
            <select style={inputStyle} value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
              <option value="">— เลือกกลุ่ม —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ ...label, marginBottom: 0 }}>กลุ่ม:</label>
              <select style={{ ...inputStyle, width: 'auto' }} value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <OrgTreeTab groupId={selectedGroupId} />
          </>
        )
      )}
      {tab === 'status' && <StatusTypesTab />}
    </div>
  )
}
