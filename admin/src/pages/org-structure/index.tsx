// admin/src/pages/org-structure/index.tsx
// ผังองค์กร 4 ชั้น (แผนก → ฝ่าย → ส่วน → ตำแหน่ง) + สถานะพนักงาน (โควต้าวันหยุดต่อเดือน)
// สอง entity นี้แยกกันแต่เกี่ยวข้องกัน — ตำแหน่งผูกกับพนักงานตอนสร้าง/แก้ไขพนักงาน,
// สถานะพนักงานกำหนดว่าจองวันหยุดแบบ "เลือกจากเดือน" ได้กี่วัน (ดู leave/index.tsx ฝั่ง employee)
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Briefcase, Layers, UserSquare2, Plus, Pencil, Trash2, ChevronRight, IdCard } from 'lucide-react'
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

interface Dept { id: string; name: string; code: string | null; is_active: boolean; _count: { divisions: number } }
interface Div  { id: string; name: string; department_id: string; department: { id: string; name: string }; is_active: boolean; _count: { sections: number } }
interface Sec  { id: string; name: string; division_id: string; division: { id: string; name: string }; is_active: boolean; _count: { positions: number } }
interface Pos  { id: string; name: string; section_id: string; section: { id: string; name: string }; is_active: boolean; _count: { employees: number } }
interface StatusType { id: string; name: string; monthly_off_quota: number; is_active: boolean; _count: { employees: number } }

type Level = 'department' | 'division' | 'section' | 'position'
const LEVEL_CFG: Record<Level, { label: string; icon: JSX.Element; color: string; bg: string; endpoint: string; parentKey?: string; parentLabel?: string }> = {
  department: { label: 'แผนก', icon: <Building2 size={15}/>, color: '#f97316', bg: '#fff7ed', endpoint: 'departments' },
  division:   { label: 'ฝ่าย',  icon: <Layers size={15}/>,    color: '#6366f1', bg: '#eef2ff', endpoint: 'divisions', parentKey: 'department_id', parentLabel: 'แผนก' },
  section:    { label: 'ส่วน',  icon: <Briefcase size={15}/>, color: '#0891b2', bg: '#ecfeff', endpoint: 'sections',  parentKey: 'division_id',   parentLabel: 'ฝ่าย' },
  position:   { label: 'ตำแหน่ง', icon: <UserSquare2 size={15}/>, color: '#16a34a', bg: '#f0fdf4', endpoint: 'positions', parentKey: 'section_id', parentLabel: 'ส่วน' },
}

// ── Org Tree Tab ──────────────────────────────────────────────────────────
function OrgTreeTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ level: Level; parentId?: string; parentName?: string; edit?: any } | null>(null)
  const [form, setForm] = useState({ name: '', code: '' })
  const [deleteTarget, setDeleteTarget] = useState<{ level: Level; id: string; name: string } | null>(null)

  const { data: depts = [], isLoading } = useQuery<Dept[]>({
    queryKey: ['departments'], queryFn: () => api.get('/api/v1/admin/departments').then(r => r.data.data),
  })
  const { data: divs = [] } = useQuery<Div[]>({
    queryKey: ['divisions'], queryFn: () => api.get('/api/v1/admin/divisions').then(r => r.data.data),
  })
  const { data: secs = [] } = useQuery<Sec[]>({
    queryKey: ['sections'], queryFn: () => api.get('/api/v1/admin/sections').then(r => r.data.data),
  })
  const { data: poss = [] } = useQuery<Pos[]>({
    queryKey: ['positions'], queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['departments'] })
    qc.invalidateQueries({ queryKey: ['divisions'] })
    qc.invalidateQueries({ queryKey: ['sections'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
  }

  const createMutation = useMutation({
    mutationFn: ({ level, body }: { level: Level; body: object }) => api.post(`/api/v1/admin/${LEVEL_CFG[level].endpoint}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', 'สร้างสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'สร้างไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ level, id, body }: { level: Level; id: string; body: object }) => api.patch(`/api/v1/admin/${LEVEL_CFG[level].endpoint}/${id}`, body),
    onSuccess: () => { invalidateAll(); showToast('success', 'บันทึกสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ level, id }: { level: Level; id: string }) => api.delete(`/api/v1/admin/${LEVEL_CFG[level].endpoint}/${id}`),
    onSuccess: () => { invalidateAll(); showToast('success', 'ลบสำเร็จ'); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ (อาจมีข้อมูลย่อยผูกอยู่)'),
  })

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const openAdd = (level: Level, parentId?: string, parentName?: string) => {
    setForm({ name: '', code: '' })
    setModal({ level, parentId, parentName })
  }
  const openEdit = (level: Level, row: any) => {
    setForm({ name: row.name, code: row.code ?? '' })
    setModal({ level, edit: row })
  }

  const handleSave = () => {
    if (!modal || !form.name.trim()) return
    const cfg = LEVEL_CFG[modal.level]
    if (modal.edit) {
      updateMutation.mutate({ level: modal.level, id: modal.edit.id, body: { name: form.name, ...(modal.level === 'department' ? { code: form.code || undefined } : {}) } })
    } else {
      const body: any = { name: form.name }
      if (modal.level === 'department') body.code = form.code || undefined
      if (cfg.parentKey && modal.parentId) body[cfg.parentKey] = modal.parentId
      createMutation.mutate({ level: modal.level, body })
    }
  }

  const rowStyle = (depth: number): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
    paddingLeft: 10 + depth * 24, borderRadius: 8,
  })

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnPrimary} onClick={() => openAdd('department')}><Plus size={14}/> เพิ่มแผนก</button>
      </div>

      <div style={{ ...card, padding: 8 }}>
        {depts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            ยังไม่มีแผนก — เริ่มสร้างผังองค์กรที่นี่
          </div>
        )}
        {depts.map(d => {
          const isOpen = expanded.has(d.id)
          const myDivs = divs.filter(x => x.department_id === d.id)
          return (
            <div key={d.id}>
              <div style={rowStyle(0)}>
                <button onClick={() => toggle(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                  <ChevronRight size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                <span style={{ display: 'flex', color: LEVEL_CFG.department.color }}>{LEVEL_CFG.department.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827', flex: 1 }}>{d.name}</span>
                {d.code && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.code}</span>}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{myDivs.length} ฝ่าย</span>
                <button onClick={() => openAdd('division', d.id, d.name)} title="เพิ่มฝ่าย" style={{ padding: '4px 8px', borderRadius: 6, border: '1px dashed #c7d2fe', background: '#eef2ff', color: '#6366f1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Plus size={10}/>ฝ่าย</button>
                <button onClick={() => openEdit('department', d)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
                <button onClick={() => setDeleteTarget({ level: 'department', id: d.id, name: d.name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
              </div>

              {isOpen && myDivs.map(dv => {
                const dvOpen = expanded.has(dv.id)
                const mySecs = secs.filter(x => x.division_id === dv.id)
                return (
                  <div key={dv.id}>
                    <div style={rowStyle(1)}>
                      <button onClick={() => toggle(dv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                        <ChevronRight size={13} style={{ transform: dvOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>
                      <span style={{ display: 'flex', color: LEVEL_CFG.division.color }}>{LEVEL_CFG.division.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#1f2937', flex: 1 }}>{dv.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mySecs.length} ส่วน</span>
                      <button onClick={() => openAdd('section', dv.id, dv.name)} title="เพิ่มส่วน" style={{ padding: '4px 8px', borderRadius: 6, border: '1px dashed #a5f3fc', background: '#ecfeff', color: '#0891b2', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Plus size={10}/>ส่วน</button>
                      <button onClick={() => openEdit('division', dv)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
                      <button onClick={() => setDeleteTarget({ level: 'division', id: dv.id, name: dv.name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
                    </div>

                    {dvOpen && mySecs.map(sc => {
                      const scOpen = expanded.has(sc.id)
                      const myPoss = poss.filter(x => x.section_id === sc.id)
                      return (
                        <div key={sc.id}>
                          <div style={rowStyle(2)}>
                            <button onClick={() => toggle(sc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                              <ChevronRight size={12} style={{ transform: scOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                            <span style={{ display: 'flex', color: LEVEL_CFG.section.color }}>{LEVEL_CFG.section.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '12px', color: '#374151', flex: 1 }}>{sc.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{myPoss.length} ตำแหน่ง</span>
                            <button onClick={() => openAdd('position', sc.id, sc.name)} title="เพิ่มตำแหน่ง" style={{ padding: '4px 8px', borderRadius: 6, border: '1px dashed #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Plus size={10}/>ตำแหน่ง</button>
                            <button onClick={() => openEdit('section', sc)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
                            <button onClick={() => setDeleteTarget({ level: 'section', id: sc.id, name: sc.name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
                          </div>

                          {scOpen && myPoss.map(p => (
                            <div key={p.id} style={rowStyle(3)}>
                              <span style={{ width: 14 }} />
                              <span style={{ display: 'flex', color: LEVEL_CFG.position.color }}>{LEVEL_CFG.position.icon}</span>
                              <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{p.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p._count.employees} คน</span>
                              <button onClick={() => openEdit('position', p)} style={{ padding: 5, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={12}/></button>
                              <button onClick={() => setDeleteTarget({ level: 'position', id: p.id, name: p.name })} style={{ padding: 5, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={12}/></button>
                            </div>
                          ))}
                          {scOpen && myPoss.length === 0 && (
                            <div style={{ ...rowStyle(3), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีตำแหน่ง</div>
                          )}
                        </div>
                      )
                    })}
                    {dvOpen && mySecs.length === 0 && (
                      <div style={{ ...rowStyle(2), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีส่วน</div>
                    )}
                  </div>
                )
              })}
              {isOpen && myDivs.length === 0 && (
                <div style={{ ...rowStyle(1), color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>ยังไม่มีฝ่าย</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 380, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>
              {modal.edit ? `แก้ไข${LEVEL_CFG[modal.level].label}` : `เพิ่ม${LEVEL_CFG[modal.level].label}ใหม่`}
            </h3>
            {modal.parentName && (
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)' }}>ภายใต้{LEVEL_CFG[modal.level].parentLabel}: <strong>{modal.parentName}</strong></p>
            )}
            {!modal.parentName && !modal.edit && <div style={{ marginBottom: 14 }} />}
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>ชื่อ{LEVEL_CFG[modal.level].label}</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`เช่น ${modal.level === 'department' ? 'ฝ่ายขาย' : modal.level === 'division' ? 'ฝ่ายขายในประเทศ' : modal.level === 'section' ? 'ส่วนขายภาคกลาง' : 'พนักงานขาย'}`} />
            {modal.level === 'department' && (
              <>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '10px 0 4px', display: 'block' }}>รหัสแผนก (ถ้ามี)</label>
                <input style={inputStyle} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="เช่น 01" />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
                {modal.edit ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`ลบ${LEVEL_CFG[deleteTarget.level].label}`}
          message={<>ยืนยันลบ "<strong>{deleteTarget.name}</strong>" — ถ้ามีข้อมูลย่อยผูกอยู่ (เช่น ฝ่าย/ส่วน/ตำแหน่ง/พนักงาน) ระบบจะลบไม่สำเร็จ</>}
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
  const [form, setForm] = useState({ name: '', monthly_off_quota: '4' })
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

  const openAdd = () => { setForm({ name: '', monthly_off_quota: '4' }); setModal({}) }
  const openEdit = (t: StatusType) => { setForm({ name: t.name, monthly_off_quota: String(t.monthly_off_quota) }); setModal({ edit: t }) }
  const handleSave = () => {
    if (!modal || !form.name.trim()) return
    const body = { name: form.name, monthly_off_quota: parseInt(form.monthly_off_quota) || 0 }
    if (modal.edit) updateMutation.mutate({ id: modal.edit.id, body })
    else createMutation.mutate(body)
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: 480 }}>
          กำหนดสถานะพนักงาน (เช่น ประจำ, ชั่วคราว) พร้อมโควต้าจำนวนวันหยุดที่จองได้ต่อเดือน — ใช้กับโหมด "เลือกจากเดือน" ในหน้าจองวันหยุดของพนักงาน
        </p>
        <button style={btnPrimary} onClick={openAdd}><Plus size={14}/> เพิ่มสถานะ</button>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {types.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีสถานะพนักงาน</div>
        )}
        {types.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
              <IdCard size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{t.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{t._count.employees} คน</p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c', background: '#fff7ed', padding: '4px 10px', borderRadius: 99 }}>
              {t.monthly_off_quota} วัน/เดือน
            </span>
            <button onClick={() => openEdit(t)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
            <button onClick={() => setDeleteTarget(t)} style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: 360, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขสถานะพนักงาน' : 'เพิ่มสถานะพนักงานใหม่'}</h3>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>ชื่อสถานะ</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ประจำ, ชั่วคราว, รายวัน" />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '12px 0 4px', display: 'block' }}>โควต้าวันหยุดต่อเดือน</label>
            <input type="number" min={0} style={inputStyle} value={form.monthly_off_quota} onChange={e => setForm(f => ({ ...f, monthly_off_quota: e.target.value }))} />
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>จำนวนวันที่พนักงานสถานะนี้เลือกจองวันหยุดได้ต่อเดือน (โหมด "เลือกจากเดือน")</p>
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
          จัดการโครงสร้างแผนก → ฝ่าย → ส่วน → ตำแหน่ง และสถานะพนักงานที่กำหนดโควต้าวันหยุดต่อเดือน
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
