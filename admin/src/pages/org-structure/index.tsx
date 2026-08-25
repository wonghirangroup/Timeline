// admin/src/pages/org-structure/index.tsx
// ผังองค์กร 4 ชั้น (แผนก → ฝ่าย → ส่วน → ตำแหน่ง) — ข้ามชั้นได้ ไม่บังคับสร้างครบทุกชั้น
// (เช่น สร้างตำแหน่งแนบตรงกับแผนกได้เลยถ้าไม่มีฝ่าย/ส่วน หรือสร้างลอยไว้ก่อนก็ได้)
// + สถานะพนักงาน (โควต้าวันหยุดต่อเดือน + เงื่อนไขวันหยุดอัตโนมัติ)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Briefcase, Layers, UserSquare2, Plus, Pencil, Trash2, ChevronRight, IdCard, Ghost } from 'lucide-react'
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

interface Ref { id: string; name: string }
interface Dept { id: string; name: string; code: string | null; is_active: boolean; _count: { divisions: number; sections_direct: number; positions_direct: number } }
interface Div  { id: string; name: string; department_id: string | null; department: Ref | null; is_active: boolean; _count: { sections: number; positions_direct: number } }
interface Sec  { id: string; name: string; division_id: string | null; department_id: string | null; division: Ref | null; department: Ref | null; is_active: boolean; _count: { positions: number } }
interface Pos  { id: string; name: string; section_id: string | null; division_id: string | null; department_id: string | null; is_active: boolean; _count: { employees: number } }

// เงื่อนไขวันเสาร์/อาทิตย์ — 3 สถานะ ไม่ใช่แค่หยุด/ไม่หยุด เพราะบางตำแหน่ง (เช่น office)
// หยุดวันอาทิตย์ แต่วันเสาร์ต้อง "ทำงานนอกสถานที่" ไม่ใช่ทำงานปกติในออฟฟิศ แต่ก็ไม่ใช่วันหยุด
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

interface TreePos extends Pos {}
interface TreeSec extends Sec { positions: TreePos[] }
interface TreeDiv extends Div { sections: TreeSec[]; positions_direct: TreePos[] }
interface TreeDept extends Dept { divisions: TreeDiv[]; sections_direct: TreeSec[]; positions_direct: TreePos[] }

type Level = 'division' | 'section' | 'position'
const LEVEL_LABEL: Record<Level, string> = { division: 'ฝ่าย', section: 'ส่วน', position: 'ตำแหน่ง' }
const LEVEL_ICON: Record<Level, JSX.Element> = { division: <Layers size={15}/>, section: <Briefcase size={15}/>, position: <UserSquare2 size={15}/> }
const LEVEL_COLOR: Record<Level, string> = { division: '#6366f1', section: '#0891b2', position: '#16a34a' }
const LEVEL_ENDPOINT: Record<Level, string> = { division: 'divisions', section: 'sections', position: 'positions' }

// ── Add/Edit modal — cascading parent picker แบบข้ามชั้นได้ทุกชั้น ─────────────
function AddEntityModal({ level, depts, divs, secs, onClose }: {
  level: Level; depts: Dept[]; divs: Div[]; secs: Sec[]; onClose: () => void
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [deptId, setDeptId] = useState('')
  const [divId, setDivId]   = useState('')
  const [secId, setSecId]   = useState('')
  const [name, setName]     = useState('')

  const availableDivs = divs.filter(d => d.department_id === deptId)
  const availableSecs = secs.filter(s => s.division_id === divId)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['divisions'] })
    qc.invalidateQueries({ queryKey: ['sections'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
    qc.invalidateQueries({ queryKey: ['org-tree'] })
    qc.invalidateQueries({ queryKey: ['org-unassigned'] })
  }

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`/api/v1/admin/${LEVEL_ENDPOINT[level]}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', `สร้าง${LEVEL_LABEL[level]}สำเร็จ`); onClose() },
    onError: () => showToast('error', 'สร้างไม่สำเร็จ'),
  })

  const handleSave = () => {
    if (!name.trim()) return
    const body: any = { name }
    if (level === 'division') {
      if (deptId) body.department_id = deptId
    } else if (level === 'section') {
      if (divId) body.division_id = divId
      else if (deptId) body.department_id = deptId
    } else {
      if (secId) body.section_id = secId
      else if (divId) body.division_id = divId
      else if (deptId) body.department_id = deptId
    }
    createMutation.mutate(body)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>เพิ่ม{LEVEL_LABEL[level]}ใหม่</h3>
        <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          ไม่บังคับเลือกชั้นบน — ข้ามได้ถ้ายังไม่มี หรือปล่อยว่างไว้สร้างลอยก่อนก็ได้
        </p>

        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>แผนก (ไม่บังคับ)</label>
        <select style={inputStyle} value={deptId} onChange={e => { setDeptId(e.target.value); setDivId(''); setSecId('') }}>
          <option value="">— ไม่ระบุ —</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {level !== 'division' && (
          <>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '10px 0 4px', display: 'block' }}>ฝ่าย (ไม่บังคับ — ข้ามได้ถ้าไม่มี)</label>
            <select style={inputStyle} value={divId} onChange={e => { setDivId(e.target.value); setSecId('') }} disabled={!deptId && availableDivs.length === 0 && divs.length === 0}>
              <option value="">— ไม่ระบุ / ข้าม —</option>
              {(deptId ? availableDivs : divs).map(d => <option key={d.id} value={d.id}>{d.name}{!deptId ? ` (${d.department?.name ?? 'ไม่มีแผนก'})` : ''}</option>)}
            </select>
          </>
        )}

        {level === 'position' && (
          <>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '10px 0 4px', display: 'block' }}>ส่วน (ไม่บังคับ — ข้ามได้ถ้าไม่มี)</label>
            <select style={inputStyle} value={secId} onChange={e => setSecId(e.target.value)}>
              <option value="">— ไม่ระบุ / ข้าม —</option>
              {(divId ? availableSecs : secs).map(s => <option key={s.id} value={s.id}>{s.name}{!divId ? ` (${s.division?.name ?? s.department?.name ?? 'ไม่มีฝ่าย'})` : ''}</option>)}
            </select>
          </>
        )}

        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '10px 0 4px', display: 'block' }}>ชื่อ{LEVEL_LABEL[level]}</label>
        <input autoFocus style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={`ชื่อ${LEVEL_LABEL[level]}`} />

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={!name.trim() || createMutation.isPending} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !name.trim() ? 0.5 : 1 }}>
            สร้าง
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Org Tree Tab ──────────────────────────────────────────────────────────
function OrgTreeTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addModal, setAddModal] = useState<Level | null>(null)
  const [editModal, setEditModal] = useState<{ level: 'department' | Level; row: any } | null>(null)
  const [editForm, setEditForm] = useState({ name: '', code: '' })
  const [deleteTarget, setDeleteTarget] = useState<{ level: 'department' | Level; id: string; name: string } | null>(null)

  const { data: depts = [], isLoading } = useQuery<Dept[]>({ queryKey: ['departments'], queryFn: () => api.get('/api/v1/admin/departments').then(r => r.data.data) })
  const { data: divs  = [] } = useQuery<Div[]>({ queryKey: ['divisions'], queryFn: () => api.get('/api/v1/admin/divisions').then(r => r.data.data) })
  const { data: secs  = [] } = useQuery<Sec[]>({ queryKey: ['sections'], queryFn: () => api.get('/api/v1/admin/sections').then(r => r.data.data) })
  const { data: tree  = [] } = useQuery<TreeDept[]>({ queryKey: ['org-tree'], queryFn: () => api.get('/api/v1/admin/org-structure/tree').then(r => r.data.data) })
  const { data: unassigned } = useQuery<{ divisions: Div[]; sections: Sec[]; positions: Pos[] }>({
    queryKey: ['org-unassigned'], queryFn: () => api.get('/api/v1/admin/org-structure/unassigned').then(r => r.data.data),
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['divisions'] })
    qc.invalidateQueries({ queryKey: ['sections'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
    qc.invalidateQueries({ queryKey: ['org-tree'] })
    qc.invalidateQueries({ queryKey: ['org-unassigned'] })
  }

  const createDeptMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/departments', body),
    onSuccess: () => { invalidateAll(); showToast('success', 'สร้างแผนกสำเร็จ') },
    onError: () => showToast('error', 'สร้างไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ level, id, body }: { level: 'department' | Level; id: string; body: object }) =>
      api.patch(`/api/v1/admin/${level === 'department' ? 'departments' : LEVEL_ENDPOINT[level]}/${id}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', 'บันทึกสำเร็จ'); setEditModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ level, id }: { level: 'department' | Level; id: string }) =>
      api.delete(`/api/v1/admin/${level === 'department' ? 'departments' : LEVEL_ENDPOINT[level]}/${id}`),
    onSuccess: () => { invalidateAll(); showToast('success', 'ลบสำเร็จ'); setDeleteTarget(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.message ?? 'ลบไม่สำเร็จ'),
  })

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const openEdit = (level: 'department' | Level, row: any) => { setEditForm({ name: row.name, code: row.code ?? '' }); setEditModal({ level, row }) }
  const handleEditSave = () => {
    if (!editModal || !editForm.name.trim()) return
    updateMutation.mutate({ level: editModal.level, id: editModal.row.id, body: { name: editForm.name, ...(editModal.level === 'department' ? { code: editForm.code || undefined } : {}) } })
  }

  const rowStyle = (depth: number): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
    paddingLeft: 10 + depth * 24, borderRadius: 8,
  })

  const editBtn = (level: 'department' | Level, row: any) => (
    <button onClick={() => openEdit(level, row)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
  )
  const delBtn = (level: 'department' | Level, id: string, name: string) => (
    <button onClick={() => setDeleteTarget({ level, id, name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
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
  const sectionRow = (sc: TreeSec, depth: number) => {
    const scOpen = expanded.has(sc.id)
    return (
      <div key={sc.id}>
        <div style={rowStyle(depth)}>
          <button onClick={() => toggle(sc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
            <ChevronRight size={12} style={{ transform: scOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <span style={{ display: 'flex', color: LEVEL_COLOR.section }}>{LEVEL_ICON.section}</span>
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#374151', flex: 1 }}>{sc.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sc.positions.length} ตำแหน่ง</span>
          {editBtn('section', sc)}
          {delBtn('section', sc.id, sc.name)}
        </div>
        {scOpen && sc.positions.map(p => positionRow(p, depth + 1))}
        {scOpen && sc.positions.length === 0 && <div style={{ ...rowStyle(depth + 1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีตำแหน่ง</div>}
      </div>
    )
  }
  const divisionRow = (dv: TreeDiv, depth: number) => {
    const dvOpen = expanded.has(dv.id)
    return (
      <div key={dv.id}>
        <div style={rowStyle(depth)}>
          <button onClick={() => toggle(dv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
            <ChevronRight size={13} style={{ transform: dvOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          <span style={{ display: 'flex', color: LEVEL_COLOR.division }}>{LEVEL_ICON.division}</span>
          <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#1f2937', flex: 1 }}>{dv.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dv.sections.length} ส่วน{dv.positions_direct.length > 0 ? ` · ${dv.positions_direct.length} ตำแหน่งตรง` : ''}</span>
          {editBtn('division', dv)}
          {delBtn('division', dv.id, dv.name)}
        </div>
        {dvOpen && dv.sections.map(sc => sectionRow(sc, depth + 1))}
        {dvOpen && dv.positions_direct.map(p => positionRow(p, depth + 1))}
        {dvOpen && dv.sections.length === 0 && dv.positions_direct.length === 0 && (
          <div style={{ ...rowStyle(depth + 1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีส่วน/ตำแหน่ง</div>
        )}
      </div>
    )
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button style={btnPrimary} onClick={() => { const name = prompt('ชื่อแผนกใหม่'); if (name?.trim()) createDeptMutation.mutate({ name }) }}><Plus size={14}/> แผนก</button>
        <button style={btnGhost(LEVEL_COLOR.division, '#eef2ff')} onClick={() => setAddModal('division')}><Plus size={12}/> ฝ่าย</button>
        <button style={btnGhost(LEVEL_COLOR.section, '#ecfeff')} onClick={() => setAddModal('section')}><Plus size={12}/> ส่วน</button>
        <button style={btnGhost(LEVEL_COLOR.position, '#f0fdf4')} onClick={() => setAddModal('position')}><Plus size={12}/> ตำแหน่ง</button>
      </div>

      <div style={{ ...card, padding: 8 }}>
        {tree.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            ยังไม่มีแผนก — เริ่มสร้างผังองค์กรที่นี่ (หรือกดปุ่ม "ฝ่าย"/"ส่วน"/"ตำแหน่ง" ด้านบนเพื่อสร้างลอยไว้ก่อนก็ได้)
          </div>
        )}
        {tree.map(d => {
          const isOpen = expanded.has(d.id)
          return (
            <div key={d.id}>
              <div style={rowStyle(0)}>
                <button onClick={() => toggle(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                  <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                <span style={{ display: 'flex', color: '#f97316' }}><Building2 size={15}/></span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827', flex: 1 }}>{d.name}</span>
                {d.code && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.code}</span>}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {d.divisions.length} ฝ่าย{d.sections_direct.length > 0 ? ` · ${d.sections_direct.length} ส่วนตรง` : ''}{d.positions_direct.length > 0 ? ` · ${d.positions_direct.length} ตำแหน่งตรง` : ''}
                </span>
                {editBtn('department', d)}
                {delBtn('department', d.id, d.name)}
              </div>
              {isOpen && d.divisions.map(dv => divisionRow(dv, 1))}
              {isOpen && d.sections_direct.map(sc => sectionRow(sc, 1))}
              {isOpen && d.positions_direct.map(p => positionRow(p, 1))}
              {isOpen && d.divisions.length === 0 && d.sections_direct.length === 0 && d.positions_direct.length === 0 && (
                <div style={{ ...rowStyle(1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีฝ่าย/ส่วน/ตำแหน่ง</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ยังไม่ได้จัดเข้าแผนก — ฝ่าย/ส่วน/ตำแหน่งที่สร้างลอยไว้ก่อน */}
      {unassigned && (unassigned.divisions.length > 0 || unassigned.sections.length > 0 || unassigned.positions.length > 0) && (
        <div style={{ ...card, padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', color: 'var(--text-muted)' }}>
            <Ghost size={14} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>ยังไม่ได้จัดเข้าแผนก (สร้างลอยไว้ก่อน)</span>
          </div>
          {unassigned.divisions.map(dv => (
            <div key={dv.id} style={rowStyle(1)}>
              <span style={{ width: 14 }} />
              <span style={{ display: 'flex', color: LEVEL_COLOR.division }}>{LEVEL_ICON.division}</span>
              <span style={{ fontSize: '12.5px', color: '#374151', flex: 1 }}>{dv.name}</span>
              {editBtn('division', dv)}{delBtn('division', dv.id, dv.name)}
            </div>
          ))}
          {unassigned.sections.map(sc => (
            <div key={sc.id} style={rowStyle(1)}>
              <span style={{ width: 14 }} />
              <span style={{ display: 'flex', color: LEVEL_COLOR.section }}>{LEVEL_ICON.section}</span>
              <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{sc.name}</span>
              {editBtn('section', sc)}{delBtn('section', sc.id, sc.name)}
            </div>
          ))}
          {unassigned.positions.map(p => (
            <div key={p.id} style={rowStyle(1)}>
              <span style={{ width: 14 }} />
              <span style={{ display: 'flex', color: LEVEL_COLOR.position }}>{LEVEL_ICON.position}</span>
              <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p._count.employees} คน</span>
              {editBtn('position', p)}{delBtn('position', p.id, p.name)}
            </div>
          ))}
        </div>
      )}

      {addModal && <AddEntityModal level={addModal} depts={depts} divs={divs} secs={secs} onClose={() => setAddModal(null)} />}

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setEditModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 360, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>แก้ไข{editModal.level === 'department' ? 'แผนก' : LEVEL_LABEL[editModal.level as Level]}</h3>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>ชื่อ</label>
            <input autoFocus style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            {editModal.level === 'department' && (
              <>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '10px 0 4px', display: 'block' }}>รหัสแผนก (ถ้ามี)</label>
                <input style={inputStyle} value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
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
          title={`ลบ${deleteTarget.level === 'department' ? 'แผนก' : LEVEL_LABEL[deleteTarget.level as Level]}`}
          message={<>ยืนยันลบ "<strong>{deleteTarget.name}</strong>" — ถ้ามีข้อมูลย่อยผูกอยู่ (ฝ่าย/ส่วน/ตำแหน่ง/พนักงาน) ระบบจะลบไม่สำเร็จ</>}
          onConfirm={() => deleteMutation.mutate({ level: deleteTarget.level, id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── Employee Status Types Tab ───────────────────────────────────────────────
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

  const CheckRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: checked ? '#fff7ed' : '#f9fafb', cursor: 'pointer', marginBottom: 6 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 600 }}>{label}</span>
    </label>
  )
  const DayRuleRow = ({ label, value, onChange }: { label: string; value: DayRule; onChange: (v: DayRule) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 600, width: 64, flexShrink: 0 }}>{label}</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 380, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขสถานะพนักงาน' : 'เพิ่มสถานะพนักงานใหม่'}</h3>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>ชื่อสถานะ</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ประจำ, ชั่วคราว, รายวัน" />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '12px 0 4px', display: 'block' }}>โควต้าวันหยุดต่อเดือน</label>
            <input type="number" min={0} style={inputStyle} value={form.monthly_off_quota} onChange={e => setForm(f => ({ ...f, monthly_off_quota: e.target.value }))} />

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
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

export default function OrgStructurePage() {
  const [tab, setTab] = useState<'tree' | 'status'>('tree')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>ผังองค์กร & สถานะพนักงาน</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
          จัดการโครงสร้างแผนก → ฝ่าย → ส่วน → ตำแหน่ง (ข้ามชั้นได้) และสถานะพนักงานที่กำหนดโควต้า+เงื่อนไขวันหยุด
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid rgba(0,0,0,0.05)', marginBottom: 4, overflowX: 'auto' }}>
        {([
          { id: 'tree',   label: 'ผังองค์กร',    icon: <Building2 size={15}/>, color: '#f97316', activeBg: '#fff7ed' },
          { id: 'status', label: 'สถานะพนักงาน', icon: <IdCard size={15}/>,    color: '#ea580c', activeBg: '#fff7ed' },
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

      {tab === 'tree' ? <OrgTreeTab /> : <StatusTypesTab />}
    </div>
  )
}
