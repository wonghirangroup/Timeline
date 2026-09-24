// admin/src/pages/org-structure/index.tsx
// กลุ่ม(บริษัท) → ผังองค์กร 3 ชั้น (ฝ่าย → แผนก → ตำแหน่ง) ใต้กลุ่มที่เลือก + สถานะพนักงาน
// (โควต้าวันหยุดต่อเดือน + เงื่อนไขวันหยุดอัตโนมัติ) — ทุกชั้นผูก parent ชัดเจนเสมอ เพราะเป็น
// ที่อยู่ของ policy cascade (booking_enabled) ด้วย ไม่ใช่แค่ label เฉยๆ แบบเวอร์ชันก่อน
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Layers, UserSquare2, Plus, Pencil, Trash2, IdCard, Landmark, MapPinned, Eye, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { PlanMeter } from '../../components/shared/PlanUsage'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #E6ECF4',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: '#EC6F44', color: '#fff', fontSize: '13px', fontWeight: 600,
}
const btnGhost = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 8, border: `1px dashed ${color}55`, cursor: 'pointer',
  background: bg, color, fontSize: '12.5px', fontWeight: 700,
})
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }
// maxHeight/overflowY กันเนื้อหายาว (เช่น modal นโยบาย+รายชื่อสมาชิก) ล้นจอบนมือถือจอเตี้ย
// (feedback 2026-09-14: "ปรับหน้าจอ Admin ให้ responsive mobile ได้หมด")
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 400, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', boxSizing: 'border-box' }
const label: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

type WeekendQuota = { saturday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null; sunday_rule?: 'WORK' | 'OFF' | 'OFFSITE' | null; booking_quota?: number | null }
interface GroupT extends WeekendQuota { id: string; name: string; booking_enabled: boolean; leave_enabled: boolean; is_active: boolean; _count: { branches: number; divisions: number } }
interface BranchT { id: string; name: string; group_id: string | null }
interface Div  extends WeekendQuota { id: string; name: string; group_id: string; booking_enabled: boolean | null; leave_enabled: boolean | null; is_active: boolean; _count: { departments: number } }
interface Dept extends WeekendQuota { id: string; name: string; division_id: string; booking_enabled: boolean | null; leave_enabled: boolean | null; is_active: boolean; _count: { positions: number } }
interface Pos  extends WeekendQuota { id: string; name: string; department_id: string; booking_enabled: boolean | null; leave_enabled: boolean | null; is_active: boolean; _count: { employees: number }
  vacation_base_days?: number | null; vacation_increment_days?: number | null; vacation_increment_years?: number | null }

interface TreePos extends Pos {}
interface TreeDept extends Dept { positions: TreePos[] }
interface TreeDiv extends Div { departments: TreeDept[] }

type Level = 'division' | 'department' | 'position'
const LEVEL_LABEL: Record<Level, string> = { division: 'ฝ่าย', department: 'แผนก', position: 'ตำแหน่ง' }
const LEVEL_ICON: Record<Level, JSX.Element> = { division: <Layers size={15}/>, department: <Building2 size={14}/>, position: <UserSquare2 size={15}/> }
const LEVEL_COLOR: Record<Level, string> = { division: '#6366f1', department: '#0891b2', position: '#16a34a' }
const LEVEL_ENDPOINT: Record<Level, string> = { division: 'divisions', department: 'departments', position: 'positions' }

// null = inherit จากชั้นบน, true/false = override ตรงๆ — ใช้ซ้ำทั้ง Branch/Division/Department/Position/Employee
const POLICY_TXT = {
  booking: { on: 'เปิด (จองได้)', off: 'ปิด (จองไม่ได้)' },
  leave:   { on: 'เปิด (ลาได้)',  off: 'ปิด (ลาไม่ได้)' },
} as const
const PolicyToggle = ({ value, onChange, inheritLabel, kind }: { value: boolean | null; onChange: (v: boolean | null) => void; inheritLabel: string; kind: 'booking' | 'leave' }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {([
      { v: null,  label: inheritLabel,        color: '#6b7280', bg: '#f9fafb' },
      { v: true,  label: POLICY_TXT[kind].on,  color: '#16a34a', bg: '#f0fdf4' },
      { v: false, label: POLICY_TXT[kind].off, color: '#dc2626', bg: '#fef2f2' },
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

// 2-state (ไม่มี inherit) — ใช้ที่ชั้นกลุ่ม
const GROUP_TXT = {
  booking: { on: 'เปิด — จองได้', off: 'ปิด — หยุดได้แค่เสาร์-อาทิตย์ตายตัว' },
  leave:   { on: 'เปิด — ลาได้',  off: 'ปิด — ยื่นคำขอลาไม่ได้' },
} as const
const GroupToggle = ({ value, onChange, kind }: { value: boolean; onChange: (v: boolean) => void; kind: 'booking' | 'leave' }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {[{ v: true, label: GROUP_TXT[kind].on }, { v: false, label: GROUP_TXT[kind].off }].map(opt => {
      const active = value === opt.v
      return (
        <button key={String(opt.v)} type="button" onClick={() => onChange(opt.v)}
          style={{ flex: 1, padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${active ? (opt.v ? '#16a34a' : '#dc2626') : '#e5e7eb'}`, background: active ? (opt.v ? '#f0fdf4' : '#fef2f2') : '#fff', color: active ? (opt.v ? '#16a34a' : '#dc2626') : '#9ca3af', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
          {opt.label}
        </button>
      )
    })}
  </div>
)

// ── นโยบายวันหยุด (เสาร์/อาทิตย์ + โควต้าจอง) — cascade เดียวกัน ─────────────
const DAY_RULE_OPTS: { v: DayRule; label: string; color: string; bg: string }[] = [
  { v: 'OFF',     label: 'หยุด',       color: '#16a34a', bg: '#f0fdf4' },
  { v: 'WORK',    label: 'ทำงาน',      color: '#dc2626', bg: '#fef2f2' },
  { v: 'OFFSITE', label: 'นอกสถานที่', color: '#2563eb', bg: '#eff6ff' },
]
// 3-state (กลุ่ม) — non-null
const DayRuleGroup = ({ value, onChange }: { value: DayRule; onChange: (v: DayRule) => void }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {DAY_RULE_OPTS.map(o => {
      const active = value === o.v
      return <button key={o.v} type="button" onClick={() => onChange(o.v)}
        style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${active ? o.color : '#e5e7eb'}`, background: active ? o.bg : '#fff', color: active ? o.color : '#9ca3af', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>{o.label}</button>
    })}
  </div>
)
// 4-state (ชั้นล่าง) — null = inherit
const DayRuleInherit = ({ value, onChange, inheritLabel }: { value: DayRule | null; onChange: (v: DayRule | null) => void; inheritLabel: string }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {([{ v: null, label: inheritLabel, color: '#6b7280', bg: '#f9fafb' }, ...DAY_RULE_OPTS] as { v: DayRule | null; label: string; color: string; bg: string }[]).map(o => {
      const active = value === o.v
      return <button key={String(o.v)} type="button" onClick={() => onChange(o.v)}
        style={{ flex: 1, padding: '7px 3px', borderRadius: 8, border: `1.5px solid ${active ? o.color : '#e5e7eb'}`, background: active ? o.bg : '#fff', color: active ? o.color : '#9ca3af', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}>{o.label}</button>
    })}
  </div>
)
const quotaInputStyle: React.CSSProperties = { ...inputStyle, width: 90 }

// ── กลุ่ม (บริษัท) Tab ───────────────────────────────────────────────────────
function GroupsTab({ onViewTree }: { onViewTree: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [view, setView] = useState<'card' | 'table'>('card')
  const [modal, setModal] = useState<{ edit?: GroupT } | null>(null)
  const [form, setForm] = useState({ name: '', booking_enabled: true, leave_enabled: true, saturday_rule: 'OFF' as DayRule, sunday_rule: 'OFF' as DayRule, booking_quota: '5' })
  const [deleteTarget, setDeleteTarget] = useState<GroupT | null>(null)
  const [assignBranchGroup, setAssignBranchGroup] = useState<Record<string, string>>({})

  const { data: groups = [], isLoading } = useQuery<GroupT[]>({ queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data) })
  const { data: branches = [] } = useQuery<BranchT[]>({ queryKey: ['branches'], queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data) })

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['branches'] }); qc.invalidateQueries({ queryKey: ['plan-usage'] }) }

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

  const openAdd = () => { setForm({ name: '', booking_enabled: true, leave_enabled: true, saturday_rule: 'OFF', sunday_rule: 'OFF', booking_quota: '5' }); setModal({}) }
  const openEdit = (g: GroupT) => { setForm({ name: g.name, booking_enabled: g.booking_enabled, leave_enabled: g.leave_enabled, saturday_rule: g.saturday_rule ?? 'OFF', sunday_rule: g.sunday_rule ?? 'OFF', booking_quota: String(g.booking_quota ?? 5) }); setModal({ edit: g }) }
  const handleSave = () => {
    if (!modal || !form.name.trim()) return
    const body = { ...form, booking_quota: parseInt(form.booking_quota) || 0 }
    if (modal.edit) updateMutation.mutate({ id: modal.edit.id, body })
    else createMutation.mutate(body)
  }

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: 480 }}>
          กลุ่ม (บริษัท) คั่นระหว่างสาขากับผังองค์กร — กำหนดสิทธิ์จองวันหยุด/การลา เริ่มต้นของทุกสาขา/ฝ่าย/แผนก/ตำแหน่ง/พนักงานในกลุ่มนั้น (ชั้นล่างกว่า override ได้)
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isMobile && (
            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
              {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  title={label}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#EC6F44' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          )}
          <button style={btnPrimary} onClick={openAdd}><Plus size={14}/> เพิ่มกลุ่ม</button>
        </div>
      </div>

      <PlanMeter kind="groups" />

      {(isMobile || view === 'card') && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.length === 0 && <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีกลุ่ม</div>}
        {groups.map(g => {
          const groupBranches = branches.filter(b => b.group_id === g.id)
          const unassignedBranches = branches.filter(b => b.group_id !== g.id)
          return (
            <div key={g.id} style={{ ...card, padding: 14, border: '1px solid #E6ECF4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC6F44', flexShrink: 0 }}>
                  <Landmark size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>{g.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{g._count.branches} สาขา · {g._count.divisions} ฝ่าย</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: g.booking_enabled ? '#16a34a' : '#dc2626', background: g.booking_enabled ? '#f0fdf4' : '#fef2f2', padding: '4px 10px', borderRadius: 99 }}>
                  {g.booking_enabled ? 'จองวันหยุดได้' : 'จองวันหยุดไม่ได้'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: g.leave_enabled ? '#16a34a' : '#dc2626', background: g.leave_enabled ? '#f0fdf4' : '#fef2f2', padding: '4px 10px', borderRadius: 99 }}>
                  {g.leave_enabled ? 'ลาได้' : 'ลาไม่ได้'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: '#E6ECF4', padding: '4px 10px', borderRadius: 99 }}>
                  ส {g.saturday_rule === 'WORK' ? 'ทำงาน' : g.saturday_rule === 'OFFSITE' ? 'นอก' : 'หยุด'} · อา {g.sunday_rule === 'WORK' ? 'ทำงาน' : g.sunday_rule === 'OFFSITE' ? 'นอก' : 'หยุด'} · จอง {g.booking_quota ?? 5}/ด
                </span>
                <button onClick={onViewTree} style={btnGhost('#EC6F44', '#FEF8F6')}>
                  ดูผังองค์กร
                </button>
                <button onClick={() => openEdit(g)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
                <button onClick={() => setDeleteTarget(g)} style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E6ECF4', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
      )}

      {!isMobile && view === 'table' && (
        groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีกลุ่ม</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['กลุ่ม', 'สาขาในกลุ่ม', 'สิทธิ์', 'กฎวันหยุด', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, idx) => {
                  const groupBranches = branches.filter(b => b.group_id === g.id)
                  return (
                    <tr key={g.id} style={{ borderBottom: idx < groups.length - 1 ? '1px solid #E6ECF4' : 'none' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC6F44', flexShrink: 0 }}>
                            <Landmark size={14} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{g.name}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{g._count.branches} สาขา · {g._count.divisions} ฝ่าย</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        {groupBranches.length === 0
                          ? <span style={{ color: '#d1d5db', fontStyle: 'italic', fontSize: '11.5px' }}>ยังไม่มีสาขา</span>
                          : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 220 }}>
                              {groupBranches.map(b => (
                                <span key={b.id} style={{ fontSize: '11px', color: '#374151', background: '#f9fafb', padding: '2px 8px', borderRadius: 99, border: '1px solid #e5e7eb' }}>{b.name}</span>
                              ))}
                            </div>
                          )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: g.booking_enabled ? '#16a34a' : '#dc2626', width: 'fit-content' }}>{g.booking_enabled ? '✓ จองวันหยุดได้' : '✕ จองวันหยุดไม่ได้'}</span>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: g.leave_enabled ? '#16a34a' : '#dc2626', width: 'fit-content' }}>{g.leave_enabled ? '✓ ลาได้' : '✕ ลาไม่ได้'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#475569', fontSize: '11.5px' }}>
                        ส {g.saturday_rule === 'WORK' ? 'ทำงาน' : g.saturday_rule === 'OFFSITE' ? 'นอก' : 'หยุด'} · อา {g.sunday_rule === 'WORK' ? 'ทำงาน' : g.sunday_rule === 'OFFSITE' ? 'นอก' : 'หยุด'}
                        <div>จอง {g.booking_quota ?? 5} วัน/ด.</div>
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={onViewTree} title="ดูผังองค์กร"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px dashed #EC6F44', background: '#FEF8F6', color: '#EC6F44', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => openEdit(g)} title="แก้ไข"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(g)} title="ลบ"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )
      )}

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขกลุ่ม' : 'เพิ่มกลุ่มใหม่'}</h3>
            <label style={label}>ชื่อกลุ่ม</label>
            <input autoFocus style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น วงษ์, สมาร์ทจิ๊กซอว์" />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '14px 0 6px', fontWeight: 700 }}>ค่าเริ่มต้นของทุกสาขา/ฝ่าย/แผนก/ตำแหน่ง/คนในกลุ่มนี้ (ชั้นล่าง/สถานะพนักงาน override ได้)</p>
            <label style={{ ...label, margin: '10px 0 6px' }}>สิทธิ์จองวันหยุด</label>
            <GroupToggle value={form.booking_enabled} onChange={v => setForm(f => ({ ...f, booking_enabled: v }))} kind="booking" />
            <label style={{ ...label, margin: '12px 0 6px' }}>สิทธิ์การลา</label>
            <GroupToggle value={form.leave_enabled} onChange={v => setForm(f => ({ ...f, leave_enabled: v }))} kind="leave" />
            <div style={{ display: 'flex', gap: 10, margin: '12px 0 6px' }}>
              <div style={{ flex: 1 }}>
                <label style={label}>วันเสาร์</label>
                <DayRuleGroup value={form.saturday_rule} onChange={v => setForm(f => ({ ...f, saturday_rule: v }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>วันอาทิตย์</label>
                <DayRuleGroup value={form.sunday_rule} onChange={v => setForm(f => ({ ...f, sunday_rule: v }))} />
              </div>
            </div>
            <label style={{ ...label, margin: '12px 0 6px' }}>จองวันหยุดได้กี่วัน/เดือน</label>
            <input type="number" min={0} max={31} style={quotaInputStyle} value={form.booking_quota} onChange={e => setForm(f => ({ ...f, booking_quota: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
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
          <button onClick={handleSave} disabled={!canSave || createMutation.isPending} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !canSave ? 0.5 : 1 }}>
            สร้าง
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ผังต้นไม้แบบ chart จริง (เส้นเชื่อมพ่อแม่-ลูก) ────────────────────────────
// trick มาตรฐาน: nested <ul><li> + connector line ผ่าน ::before/::after ของ <li>
// ต้อง inject <style> เพราะ inline style ของ React ทำ pseudo-element ไม่ได้
const TREE_CSS = `
.org-chart-tree { display: flex; justify-content: center; min-width: max-content; padding: 4px 24px 12px; }
.org-chart-tree ul { display: flex; padding-top: 26px; position: relative; }
.org-chart-tree li { display: flex; flex-direction: column; align-items: center; list-style: none; margin: 0; padding: 26px 10px 0 10px; position: relative; }
.org-chart-tree li::before, .org-chart-tree li::after {
  content: ''; position: absolute; top: 0; right: 50%;
  border-top: 2px solid #e2e8f0; width: 50%; height: 26px;
}
.org-chart-tree li::after { right: auto; left: 50%; border-left: 2px solid #e2e8f0; }
.org-chart-tree li:only-child::before, .org-chart-tree li:only-child::after { display: none; }
.org-chart-tree li:only-child { padding-top: 0; }
.org-chart-tree li:first-child::before, .org-chart-tree li:last-child::after { border: 0 none; }
.org-chart-tree li:last-child::before { border-right: 2px solid #e2e8f0; border-radius: 0 8px 0 0; }
.org-chart-tree li:first-child::after { border-radius: 8px 0 0 0; }
.org-chart-tree ul ul::before {
  content: ''; position: absolute; top: 0; left: 50%;
  border-left: 2px solid #e2e8f0; width: 0; height: 26px;
}
`
const NODE_CFG: Record<Level, { color: string }> = {
  division: { color: '#6366f1' }, department: { color: '#0891b2' }, position: { color: '#16a34a' },
}

function TreeNode({ level, name, subtitle, badge, onView, onEdit, onDelete, onDropEmployee, children }: {
  level: Level; name: string; subtitle: string; badge?: React.ReactNode
  onView: () => void; onEdit: () => void; onDelete: () => void
  onDropEmployee?: (employeeId: string) => void
  children?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const cfg = NODE_CFG[level]
  return (
    <li>
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onDragOver={onDropEmployee ? (e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) }) : undefined}
        onDragLeave={onDropEmployee ? (() => setDragOver(false)) : undefined}
        onDrop={onDropEmployee ? (e => {
          e.preventDefault()
          setDragOver(false)
          const employeeId = e.dataTransfer.getData('text/employee-id')
          if (employeeId) onDropEmployee(employeeId)
        }) : undefined}
        style={{
          position: 'relative', background: dragOver ? `${cfg.color}14` : '#fff',
          border: `1.5px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? cfg.color : `${cfg.color}40`}`,
          borderRadius: 12, padding: '9px 16px', minWidth: 108,
          boxShadow: dragOver ? `0 0 0 3px ${cfg.color}22` : (hovered ? '0 6px 18px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)'),
          transition: 'box-shadow 0.15s, background 0.15s, border-color 0.15s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <span style={{ display: 'flex', color: cfg.color }}>{LEVEL_ICON[level]}</span>
          <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#111827', whiteSpace: 'nowrap' }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 3, cursor: 'pointer' }} onClick={onView}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{subtitle}</span>
          {badge}
        </div>
        {hovered && (
          <div style={{ position: 'absolute', top: -9, right: -7, display: 'flex', gap: 3 }}>
            <button onClick={onView} title="ดูรายละเอียด" style={{ width: 20, height: 20, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}><Eye size={10}/></button>
            <button onClick={onEdit} style={{ width: 20, height: 20, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}><Pencil size={10}/></button>
            <button onClick={onDelete} style={{ width: 20, height: 20, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}><Trash2 size={10}/></button>
          </div>
        )}
      </div>
      {children && <ul>{children}</ul>}
    </li>
  )
}

// ── Org Tree Tab (ผังของกลุ่มที่เลือก) ───────────────────────────────────────
// ── รายละเอียดนโยบายของ node (กด "ดู") — โชว์ค่าที่ตั้งเอง + ค่าที่มีผลจริง + มาจากไหน ──
const RULE_TH: Record<string, string> = { WORK: 'ทำงาน', OFF: 'หยุด', OFFSITE: 'นอกสถานที่' }
function NodeDetailModal({ level, row, tree, grp, employees, onClose }: {
  level: Level; row: any; tree: TreeDiv[]; grp?: GroupT; employees: any[]; onClose: () => void
}) {
  // ancestor chain — เจาะจงสุด → กลุ่ม
  const chain: { label: string; n: any }[] = []
  if (level === 'division') {
    chain.push({ label: LEVEL_LABEL.division, n: row })
  } else if (level === 'department') {
    const dv = tree.find(d => d.departments.some(x => x.id === row.id))
    chain.push({ label: LEVEL_LABEL.department, n: row }, { label: LEVEL_LABEL.division, n: dv })
  } else {
    let dv: any, dt: any
    for (const d of tree) for (const x of d.departments) if (x.positions.some((p: any) => p.id === row.id)) { dv = d; dt = x }
    chain.push({ label: LEVEL_LABEL.position, n: row }, { label: LEVEL_LABEL.department, n: dt }, { label: LEVEL_LABEL.division, n: dv })
  }
  chain.push({ label: 'กลุ่ม', n: grp })

  // field → { own, effVal, effSource }
  function resolve(key: string, fmt: (v: any) => string) {
    const own = row[key]
    let effVal: any = null, effSource = ''
    for (const c of chain) {
      const v = c.n?.[key]
      if (v !== null && v !== undefined) { effVal = v; effSource = c.label; break }
    }
    return {
      own: own === null || own === undefined ? '—' : fmt(own),
      eff: effVal === null || effVal === undefined ? '—' : fmt(effVal),
      from: effSource,
    }
  }
  // พนักงานที่อยู่ใต้ node นี้
  const posIds: string[] = level === 'position'
    ? [row.id]
    : level === 'department'
      ? (row.positions ?? []).map((p: any) => p.id)
      : (row.departments ?? []).flatMap((d: any) => (d.positions ?? []).map((p: any) => p.id))
  const members = employees.filter(e => posIds.includes(e.position_id) && e.is_active !== false)

  const bool = (v: any) => (v ? 'เปิด' : 'ปิด')
  const rows = [
    { label: 'สิทธิ์จองวันหยุด', ...resolve('booking_enabled', bool) },
    { label: 'สิทธิ์การลา',      ...resolve('leave_enabled', bool) },
    { label: 'วันเสาร์',         ...resolve('saturday_rule', v => RULE_TH[v] ?? v) },
    { label: 'วันอาทิตย์',       ...resolve('sunday_rule', v => RULE_TH[v] ?? v) },
    { label: 'จองวันหยุด/เดือน', ...resolve('booking_quota', v => `${v} วัน`) },
    // พักร้อนตามอายุงาน — ไม่ cascade (ตั้งตรงต่อตำแหน่งเท่านั้น) เลยไม่ใช้ resolve()
    ...(level === 'position' && row.vacation_base_days != null ? (() => {
      const txt = `ครบ 1 ปี = ${row.vacation_base_days} วัน · +${row.vacation_increment_days ?? 1} ทุก ${row.vacation_increment_years ?? 2} ปี`
      return [{ label: 'พักร้อนตามอายุงาน', own: txt, eff: txt, from: '' }]
    })() : []),
  ]

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, width: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{LEVEL_LABEL[level]}: {row.name}</h3>
        <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
          สายการสืบทอด: {chain.map(c => c.n?.name ?? c.label).join(' → ')}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ color: '#9ca3af', textAlign: 'left' }}>
              <th style={{ padding: '5px 6px', fontWeight: 700 }}>รายการ</th>
              <th style={{ padding: '5px 6px', fontWeight: 700 }}>ตั้งที่นี่</th>
              <th style={{ padding: '5px 6px', fontWeight: 700 }}>มีผลจริง</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} style={{ borderTop: '1px solid #E6ECF4' }}>
                <td style={{ padding: '7px 6px', color: '#374151' }}>{r.label}</td>
                <td style={{ padding: '7px 6px', color: r.own === '—' ? '#cbd5e1' : '#111827', fontWeight: r.own === '—' ? 400 : 700 }}>{r.own}</td>
                <td style={{ padding: '7px 6px' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{r.eff}</span>
                  {r.from && r.own === '—' && <span style={{ color: '#9ca3af', fontSize: '10.5px' }}> · จาก{r.from}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: '12px 0 0', fontSize: '10.5px', color: '#9ca3af' }}>"ตั้งที่นี่" = "—" หมายถึงใช้ค่าจากชั้นบน · สาขาที่พนักงานสังกัดก็ override ได้อีกชั้น</p>

        <div style={{ marginTop: 14, borderTop: '1px solid #E6ECF4', paddingTop: 12 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: 8 }}>พนักงานใน{LEVEL_LABEL[level]}นี้ ({members.length})</div>
          {members.length === 0 ? (
            <p style={{ fontSize: '11.5px', color: '#9ca3af', margin: 0 }}>ยังไม่มีพนักงาน</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {members.map(m => (
                <span key={m.id} style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', background: '#E6ECF4', padding: '3px 9px', borderRadius: 99 }}>
                  {m.first_name} {m.last_name}{m.nickname ? ` (${m.nickname})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 14 }}>ปิด</button>
      </div>
    </div>
  )
}

// ผังรวมทุกกลุ่มในเทแนนต์เดียวกัน (feedback 2026-09-14: "เอา 3 กลุ่มมารวมกันในผังเดียว
// ไม่ต้องมี dropdown เลือกกลุ่มแล้วค่อยดูผัง") — กล่องชื่อบริษัทอยู่บนสุด แตกเป็นกล่อง
// แต่ละกลุ่ม แล้วค่อยเป็นฝ่าย/แผนก/ตำแหน่งของกลุ่มนั้นตามปกติ (โครงสร้างข้อมูลยังแยก
// ตามกลุ่มเดิมทุกประการ — นี่คือการรวมแค่ "มุมมอง" เท่านั้น ไม่ได้ย้ายกลุ่ม/สาขาใดๆ)
function OrgTreeTab({ groups, companyName }: { groups: GroupT[]; companyName: string }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [addModal, setAddModal] = useState<{ level: Level; groupId: string } | null>(null)
  const [viewTarget, setViewTarget] = useState<{ level: Level; row: any; groupId: string } | null>(null)
  const [editModal, setEditModal] = useState<{ level: Level; row: any } | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; booking_enabled: boolean | null; leave_enabled: boolean | null; saturday_rule: DayRule | null; sunday_rule: DayRule | null; booking_quota: string
    vacation_base_days: string; vacation_increment_days: string; vacation_increment_years: string }>({
    name: '', booking_enabled: null, leave_enabled: null, saturday_rule: null, sunday_rule: null, booking_quota: '',
    vacation_base_days: '', vacation_increment_days: '', vacation_increment_years: '',
  })
  const [deleteTarget, setDeleteTarget] = useState<{ level: Level; id: string; name: string } | null>(null)

  // ไม่ส่ง group_id = ผังรวมทุกกลุ่ม (แต่ละ division มี group_id ติดมาด้วยเสมอ ใช้จัดกลุ่มเอง)
  const { data: tree = [], isLoading } = useQuery<(TreeDiv & { group_id: string })[]>({
    queryKey: ['org-tree', 'all'],
    queryFn: () => api.get('/api/v1/admin/org-structure/tree').then(r => r.data.data),
  })
  // queryKey ตรงกับ employee/index.tsx ('employees','all') — ดูคอมเมนต์เดียวกันที่นั่น
  const { data: allEmployees = [] } = useQuery<any[]>({ queryKey: ['employees', 'all'], queryFn: () => api.get('/api/v1/admin/employees', { params: { includeInactive: true } }).then(r => r.data.data) })

  const treeByGroup = new Map<string, TreeDiv[]>()
  for (const dv of tree) {
    const arr = treeByGroup.get(dv.group_id) ?? []
    arr.push(dv)
    treeByGroup.set(dv.group_id, arr)
  }

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

  // ── ลาก-วางจัดพนักงานเข้าผัง (feedback 2026-09-23) ──────────────────────
  const [employeePanelOpen, setEmployeePanelOpen] = useState(false)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const groupName = new Map(groups.map(g => [g.id, g.name]))

  const assignMutation = useMutation({
    mutationFn: ({ employeeId, level, targetId }: { employeeId: string; level: Level; targetId: string }) =>
      api.post('/api/v1/admin/org-structure/assign-employee', { employee_id: employeeId, level, target_id: targetId }),
    onSuccess: () => {
      invalidateAll()
      qc.invalidateQueries({ queryKey: ['employees'] })
      showToast('success', 'ย้ายพนักงานสำเร็จ')
    },
    onError: () => showToast('error', 'ย้ายพนักงานไม่สำเร็จ'),
  })
  const handleDropEmployee = (level: Level, targetId: string) => (employeeId: string) => {
    assignMutation.mutate({ employeeId, level, targetId })
  }
  const employeeList = allEmployees.filter((e: any) => {
    if (e.is_active === false) return false
    if (unassignedOnly && e.position_id) return false
    if (employeeSearch.trim()) {
      const q = employeeSearch.trim().toLowerCase()
      const hay = `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const openEdit = (level: Level, row: any) => { setEditForm({
    name: row.name, booking_enabled: row.booking_enabled ?? null, leave_enabled: row.leave_enabled ?? null, saturday_rule: row.saturday_rule ?? null, sunday_rule: row.sunday_rule ?? null, booking_quota: row.booking_quota == null ? '' : String(row.booking_quota),
    vacation_base_days: row.vacation_base_days == null ? '' : String(row.vacation_base_days),
    vacation_increment_days: row.vacation_increment_days == null ? '' : String(row.vacation_increment_days),
    vacation_increment_years: row.vacation_increment_years == null ? '' : String(row.vacation_increment_years),
  }); setEditModal({ level, row }) }
  const handleEditSave = () => {
    if (!editModal || !editForm.name.trim()) return
    // ทุกชั้น (รวมตำแหน่ง) รับ policy fields แล้ว — null/'' = inherit
    updateMutation.mutate({ level: editModal.level, id: editModal.row.id, body: {
      name: editForm.name, booking_enabled: editForm.booking_enabled, leave_enabled: editForm.leave_enabled,
      saturday_rule: editForm.saturday_rule, sunday_rule: editForm.sunday_rule,
      booking_quota: editForm.booking_quota.trim() === '' ? null : (parseInt(editForm.booking_quota) || 0),
      // สิทธิ์พักร้อนตามอายุงาน — เฉพาะตำแหน่งเท่านั้น (feedback 2026-09-15 ข้อ 6)
      ...(editModal.level === 'position' ? {
        vacation_base_days: editForm.vacation_base_days.trim() === '' ? null : (parseInt(editForm.vacation_base_days) || 0),
        vacation_increment_days: editForm.vacation_increment_days.trim() === '' ? null : (parseInt(editForm.vacation_increment_days) || 0),
        vacation_increment_years: editForm.vacation_increment_years.trim() === '' ? null : (parseInt(editForm.vacation_increment_years) || 0),
      } : {}),
    } })
  }
  const policyBadge = (v: boolean | null, on: string, off: string) => v === null ? null : (
    <span style={{ fontSize: '9.5px', fontWeight: 700, color: v ? '#16a34a' : '#dc2626', background: v ? '#f0fdf4' : '#fef2f2', padding: '1px 6px', borderRadius: 99 }}>{v ? on : off}</span>
  )
  const orgBadges = (row: { booking_enabled: boolean | null; leave_enabled: boolean | null }) => (
    <>{policyBadge(row.booking_enabled, 'จองได้', 'จองไม่ได้')}{policyBadge(row.leave_enabled, 'ลาได้', 'ลาไม่ได้')}</>
  )

  if (isLoading) return <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>

  const addModalGroupId = addModal?.groupId
  const addModalDivs  = addModalGroupId ? (treeByGroup.get(addModalGroupId) ?? []) : []
  const addModalDepts = addModalDivs.flatMap(d => d.departments)
  const viewGrp = viewTarget ? groups.find(g => g.id === viewTarget.groupId) : undefined
  const viewTree = viewTarget ? (treeByGroup.get(viewTarget.groupId) ?? []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setEmployeePanelOpen(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8,
              border: `1.5px solid ${employeePanelOpen ? '#EC6F44' : '#e5e7eb'}`, cursor: 'pointer',
              background: employeePanelOpen ? '#FEF8F6' : '#fff', color: employeePanelOpen ? '#EC6F44' : '#374151',
              fontSize: '13px', fontWeight: 700,
            }}>
            <UserSquare2 size={15} /> {employeePanelOpen ? 'ปิดแผงลาก-วางพนักงาน' : 'ลาก-วางจัดพนักงาน'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ ...card, overflowX: 'auto', flex: 1, minWidth: 0 }}>
        <style>{TREE_CSS}</style>
        <div className="org-chart-tree">
          <ul>
            <li>
              <div style={{ background: '#1e293b', border: '1.5px solid #1e293b', borderRadius: 12, padding: '11px 20px', minWidth: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
                  <Landmark size={15} color="#fff" />
                  <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#fff', whiteSpace: 'nowrap' }}>{companyName}</span>
                </div>
              </div>
              <ul>
                {groups.map(g => {
                  const divs = treeByGroup.get(g.id) ?? []
                  return (
                    <li key={g.id}>
                      <div style={{ background: '#FEF8F6', border: '1.5px solid #EC6F44', borderRadius: 12, padding: '10px 18px', minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                          <Building2 size={14} color="#EC6F44" />
                          <span style={{ fontWeight: 800, fontSize: '13px', color: '#111827', whiteSpace: 'nowrap' }}>{g.name}</span>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>{divs.length} ฝ่าย</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                          <button onClick={() => setAddModal({ level: 'division', groupId: g.id })}
                            style={{ ...btnGhost(LEVEL_COLOR.division, '#eef2ff'), justifyContent: 'center', padding: '5px 10px', fontSize: '10.5px' }}>
                            <Plus size={11}/> ฝ่าย
                          </button>
                          <button onClick={() => setAddModal({ level: 'department', groupId: g.id })} disabled={divs.length === 0}
                            style={{ ...btnGhost(LEVEL_COLOR.department, '#ecfeff'), justifyContent: 'center', padding: '5px 10px', fontSize: '10.5px', opacity: divs.length === 0 ? 0.4 : 1 }}>
                            <Plus size={11}/> แผนก
                          </button>
                          <button onClick={() => setAddModal({ level: 'position', groupId: g.id })} disabled={divs.every(d => d.departments.length === 0)}
                            style={{ ...btnGhost(LEVEL_COLOR.position, '#f0fdf4'), justifyContent: 'center', padding: '5px 10px', fontSize: '10.5px', opacity: divs.every(d => d.departments.length === 0) ? 0.4 : 1 }}>
                            <Plus size={11}/> ตำแหน่ง
                          </button>
                        </div>
                      </div>
                      {divs.length > 0 && (
                        <ul>
                          {divs.map(dv => (
                            <TreeNode key={dv.id} level="division" name={dv.name} subtitle={`${dv.departments.length} แผนก`} badge={orgBadges(dv)}
                              onView={() => setViewTarget({ level: 'division', row: dv, groupId: g.id })}
                              onEdit={() => openEdit('division', dv)} onDelete={() => setDeleteTarget({ level: 'division', id: dv.id, name: dv.name })}
                              onDropEmployee={employeePanelOpen ? handleDropEmployee('division', dv.id) : undefined}>
                              {dv.departments.length > 0 ? dv.departments.map(dt => (
                                <TreeNode key={dt.id} level="department" name={dt.name} subtitle={`${dt.positions.length} ตำแหน่ง`} badge={orgBadges(dt)}
                                  onView={() => setViewTarget({ level: 'department', row: dt, groupId: g.id })}
                                  onEdit={() => openEdit('department', dt)} onDelete={() => setDeleteTarget({ level: 'department', id: dt.id, name: dt.name })}
                                  onDropEmployee={employeePanelOpen ? handleDropEmployee('department', dt.id) : undefined}>
                                  {dt.positions.map(p => (
                                    <TreeNode key={p.id} level="position" name={p.name} subtitle={`${p._count.employees} คน`} badge={orgBadges(p)}
                                      onView={() => setViewTarget({ level: 'position', row: p, groupId: g.id })}
                                      onEdit={() => openEdit('position', p)} onDelete={() => setDeleteTarget({ level: 'position', id: p.id, name: p.name })}
                                      onDropEmployee={employeePanelOpen ? handleDropEmployee('position', p.id) : undefined} />
                                  ))}
                                </TreeNode>
                              )) : null}
                            </TreeNode>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </div>
      </div>

      {employeePanelOpen && !isMobile && (
        <div style={{ ...card, width: 260, flexShrink: 0, padding: 14, position: 'sticky', top: 8, maxHeight: 640, display: 'flex', flexDirection: 'column' }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 800, color: '#111827' }}>รายชื่อพนักงาน</p>
          <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--text-muted)' }}>ลากชื่อพนักงานไปวางบนฝ่าย/แผนก/ตำแหน่งในผังทางซ้าย</p>
          <input value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="ค้นหาชื่อ/รหัส..."
            style={{ ...inputStyle, marginBottom: 8, fontSize: '12.5px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#374151', cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={unassignedOnly} onChange={e => setUnassignedOnly(e.target.checked)} />
            เฉพาะยังไม่มีตำแหน่ง
          </label>
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {employeeList.length === 0 && (
              <p style={{ fontSize: '11.5px', color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>ไม่พบพนักงาน</p>
            )}
            {employeeList.map((e: any) => (
              <div key={e.id} draggable
                onDragStart={ev => { ev.dataTransfer.setData('text/employee-id', e.id); ev.dataTransfer.effectAllowed = 'move' }}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: e.position_id ? '#fff' : '#FEF8F6', cursor: 'grab',
                }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                  {e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {e.branch?.name ?? '—'}{e.branch?.group_id && groupName.get(e.branch.group_id) ? ` · ${groupName.get(e.branch.group_id)}` : ''}
                </span>
                {!e.position_id && (
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#EC6F44', width: 'fit-content' }}>ยังไม่มีตำแหน่ง</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {addModal && (
        <AddEntityModal level={addModal.level} groupId={addModal.groupId} divs={addModalDivs} depts={addModalDepts} onClose={() => setAddModal(null)} />
      )}

      {viewTarget && <NodeDetailModal level={viewTarget.level} row={viewTarget.row} tree={viewTree} grp={viewGrp} employees={allEmployees} onClose={() => setViewTarget(null)} />}

      {editModal && (
        <div style={modalOverlay} onClick={() => setEditModal(null)}>
          <div style={{ ...modalBox, width: 360 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>แก้ไข{LEVEL_LABEL[editModal.level]}</h3>
            <label style={label}>ชื่อ</label>
            <input autoFocus style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            {(() => {
              const inheritLabel = editModal.level === 'division' ? 'ใช้ค่าจากกลุ่ม' : editModal.level === 'department' ? 'ใช้ค่าจากฝ่าย' : 'ใช้ค่าจากแผนก'
              return (
                <>
                  <label style={{ ...label, margin: '12px 0 6px' }}>สิทธิ์จองวันหยุด</label>
                  <PolicyToggle kind="booking" value={editForm.booking_enabled} onChange={v => setEditForm(f => ({ ...f, booking_enabled: v }))} inheritLabel={inheritLabel} />
                  <label style={{ ...label, margin: '12px 0 6px' }}>สิทธิ์การลา</label>
                  <PolicyToggle kind="leave" value={editForm.leave_enabled} onChange={v => setEditForm(f => ({ ...f, leave_enabled: v }))} inheritLabel={inheritLabel} />
                  <label style={{ ...label, margin: '12px 0 6px' }}>วันเสาร์</label>
                  <DayRuleInherit value={editForm.saturday_rule} onChange={v => setEditForm(f => ({ ...f, saturday_rule: v }))} inheritLabel={inheritLabel} />
                  <label style={{ ...label, margin: '12px 0 6px' }}>วันอาทิตย์</label>
                  <DayRuleInherit value={editForm.sunday_rule} onChange={v => setEditForm(f => ({ ...f, sunday_rule: v }))} inheritLabel={inheritLabel} />
                  <label style={{ ...label, margin: '12px 0 6px' }}>จองวันหยุด/เดือน <span style={{ fontWeight: 400, color: '#9ca3af' }}>(ว่าง = {inheritLabel})</span></label>
                  <input type="number" min={0} max={31} style={quotaInputStyle} value={editForm.booking_quota} placeholder="—" onChange={e => setEditForm(f => ({ ...f, booking_quota: e.target.value }))} />
                  {editModal.level === 'position' && (
                    <>
                      <label style={{ ...label, margin: '14px 0 6px', paddingTop: 10, borderTop: '1px solid #E6ECF4' }}>สิทธิ์พักร้อนตามอายุงาน <span style={{ fontWeight: 400, color: '#9ca3af' }}>(ว่าง = ไม่มีโปรแกรมพักร้อน)</span></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ ...label, fontSize: '11px', fontWeight: 500 }}>ครบ 1 ปี (วัน)</label>
                          <input type="number" min={0} style={quotaInputStyle} placeholder="—" value={editForm.vacation_base_days} onChange={e => setEditForm(f => ({ ...f, vacation_base_days: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ ...label, fontSize: '11px', fontWeight: 500 }}>เพิ่มครั้งละ (วัน)</label>
                          <input type="number" min={0} style={quotaInputStyle} placeholder="1" value={editForm.vacation_increment_days} onChange={e => setEditForm(f => ({ ...f, vacation_increment_days: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ ...label, fontSize: '11px', fontWeight: 500 }}>ทุกๆ (ปี)</label>
                          <input type="number" min={1} style={quotaInputStyle} placeholder="2" value={editForm.vacation_increment_years} onChange={e => setEditForm(f => ({ ...f, vacation_increment_years: e.target.value }))} />
                        </div>
                      </div>
                      {(() => {
                        const base = parseInt(editForm.vacation_base_days)
                        if (!Number.isFinite(base) || editForm.vacation_base_days.trim() === '') {
                          return <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 6 }}>ตำแหน่งนี้ยังไม่มีสิทธิ์พักร้อนตามอายุงาน</div>
                        }
                        const incDays  = parseInt(editForm.vacation_increment_days) || 1
                        const incYears = parseInt(editForm.vacation_increment_years) || 0
                        const preview = [1, 3, 5].map(years => {
                          const steps = incYears > 0 ? Math.floor((years - 1) / incYears) : 0
                          return `ครบ ${years} ปี = ${base + incDays * steps} วัน`
                        }).join(' · ')
                        return <div style={{ fontSize: '11px', color: '#0369a1', marginTop: 6, background: '#f0f9ff', borderRadius: 6, padding: '5px 8px' }}>{preview}</div>
                      })()}
                    </>
                  )}
                </>
              )
            })()}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setEditModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleEditSave} disabled={!editForm.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !editForm.name.trim() ? 0.5 : 1 }}>
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: checked ? '#FEF8F6' : '#f9fafb', cursor: 'pointer', marginBottom: 6 }}>
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
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid #E6ECF4' : 'none', flexWrap: 'wrap' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC6F44', flexShrink: 0 }}>
              <IdCard size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{t.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{t._count.employees} คน</p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#EC6F44', background: '#FEF8F6', padding: '3px 9px', borderRadius: 99 }}>{t.monthly_off_quota} วัน/เดือน</span>
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
              <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
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

// เดิมฝังในหน้า "จัดการพนักงาน" เป็นแท็บย่อย 1 อัน ("ผังองค์กร") แล้วมีแท็บซ้อน
// อีกชั้นข้างในเอง (กลุ่ม/ผังองค์กร/สถานะพนักงาน) — feedback 2026-09-15
// "เอากลุ่มและสถานะพนักงานมาไว้ Layer เดียวกับ พนักงาน/สิทธิ์วันหยุด/การลา"
// เลยยกแท็บย่อยทั้ง 3 ขึ้นไปเป็น top-level tab ที่ employee/index.tsx แทน —
// คอมโพเนนต์นี้เหลือแค่ "แสดงมุมมองเดียวตาม view ที่รับมา" ไม่มีแท็บของตัวเองแล้ว
export default function OrgStructurePage({ view, onViewTree }: { view: 'groups' | 'tree' | 'status'; onViewTree: () => void }) {
  const { data: groups = [] } = useQuery<GroupT[]>({ queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data) })
  const { data: settings } = useQuery<{ name: string }>({ queryKey: ['tenant-settings'], queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {view === 'groups' && (
        <GroupsTab onViewTree={onViewTree} />
      )}
      {view === 'tree' && (
        groups.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
            ยังไม่มีกลุ่ม — ไปที่แท็บ "กลุ่ม (บริษัท)" เพื่อสร้างกลุ่มก่อน
          </div>
        ) : (
          <OrgTreeTab groups={groups} companyName={settings?.name ?? ''} />
        )
      )}
      {view === 'status' && <StatusTypesTab />}
    </div>
  )
}
