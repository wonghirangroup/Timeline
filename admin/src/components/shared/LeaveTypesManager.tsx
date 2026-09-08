// admin/src/components/shared/LeaveTypesManager.tsx
// ประเภทการลาที่กำหนดเอง + กติกาสะสมวันลา — โผล่ในหน้า การตั้งค่า → นโยบายการลา
// ตาม feature: custom_leave_types / leave_accrual
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Play, ArrowRightLeft } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../ui/Toast'
import { useAuthStore } from '../../stores/authStore'
import ConfirmDialog from '../ui/ConfirmDialog'
import Modal from '../ui/Modal'

const STD_TYPES: { code: string; label: string }[] = [
  { code: 'SICK', label: 'ลาป่วย' }, { code: 'PERSONAL', label: 'ลากิจ' }, { code: 'VACATION', label: 'พักร้อน' },
  { code: 'MATERNITY', label: 'ลาคลอด' }, { code: 'COMPENSATE', label: 'ชดเชย' },
]
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginTop: 16 }

export default function LeaveTypesManager() {
  const ef = useAuthStore(s => s.enabledFeatures)
  const on = (k: string) => !ef || ef[k] !== false
  const readOnly = useAuthStore(s => s.role) === 'EXECUTIVE'
  if (!on('custom_leave_types') && !on('leave_accrual')) return null
  return (
    <>
      {on('custom_leave_types') && <CustomTypes readOnly={readOnly} />}
      {on('leave_accrual') && <Accrual readOnly={readOnly} customEnabled={on('custom_leave_types')} />}
    </>
  )
}

// ── ประเภทการลากำหนดเอง ─────────────────────────────────────────────────────
function CustomTypes({ readOnly }: { readOnly: boolean }) {
  const qc = useQueryClient(); const { showToast } = useToast()
  const [add, setAdd] = useState(false)
  const [del, setDel] = useState<any>(null)
  const [form, setForm] = useState({ name: '', color: '#64748b', default_days: 0, paid: true, deducts_quota: true })
  const { data: types = [] } = useQuery<any[]>({ queryKey: ['leave-types'], queryFn: () => api.get('/api/v1/admin/leave-types', { params: { includeInactive: true } }).then(r => r.data.data) })
  const addMut = useMutation({
    mutationFn: () => api.post('/api/v1/admin/leave-types', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); showToast('success', 'เพิ่มประเภทการลาแล้ว'); setAdd(false); setForm({ name: '', color: '#64748b', default_days: 0, paid: true, deducts_quota: true }) },
    onError: () => showToast('error', 'เพิ่มไม่สำเร็จ'),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/api/v1/admin/leave-types/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  })
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/leave-types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); showToast('success', 'ปิดใช้งานแล้ว'); setDel(null) },
  })

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ประเภทการลาที่กำหนดเอง</p>
        {!readOnly && <button onClick={() => setAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={13} /> เพิ่ม</button>}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 12px' }}>เช่น ลาบวช / ลาเกณฑ์ทหาร / ลาไม่รับเงิน — พนักงานเลือกได้ในฟอร์มขอลา (LIFF)</p>
      {types.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>ยังไม่มีประเภทการลาที่กำหนดเอง</div>
      ) : types.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: t.active ? '#111827' : '#9ca3af' }}>{t.name}</span>
            <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: 8 }}>
              โควต้าเริ่มต้น {t.default_days} วัน · {t.paid ? 'ได้รับเงิน' : 'ไม่ได้รับเงิน'} · {t.deducts_quota ? 'หักโควต้า' : 'ไม่จำกัดวัน'}
            </span>
          </div>
          {!readOnly && <>
            <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#64748b' }}>
              <input type="checkbox" checked={t.active} onChange={e => toggleMut.mutate({ id: t.id, active: e.target.checked })} style={{ accentColor: '#16a34a' }} /> ใช้งาน
            </label>
            <button onClick={() => setDel(t)} aria-label="ปิดใช้งาน" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Trash2 size={13} /></button>
          </>}
        </div>
      ))}

      {add && (
        <Modal onClose={() => setAdd(false)} width={400}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>เพิ่มประเภทการลา</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>ชื่อ *</label><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ลาบวช" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>สี</label><input type="color" style={{ ...inp, height: 38, padding: 3 }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
                <div><label style={lbl}>โควต้าเริ่มต้น (วัน/ปี)</label><input type="number" min={0} style={inp} value={form.default_days} onChange={e => setForm(f => ({ ...f, default_days: Number(e.target.value) }))} /></div>
              </div>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} style={{ accentColor: '#16a34a' }} /> ลาแบบได้รับเงิน
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.deducts_quota} onChange={e => setForm(f => ({ ...f, deducts_quota: e.target.checked }))} style={{ accentColor: '#16a34a' }} /> หักโควต้า (ปิด = ลาได้ไม่จำกัดวัน)
              </label>
              <button onClick={() => addMut.mutate()} disabled={!form.name.trim() || addMut.isPending}
                style={{ marginTop: 4, padding: '10px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>บันทึก</button>
            </div>
          </div>
        </Modal>
      )}
      {del && <ConfirmDialog variant="warning" title="ปิดใช้งานประเภทการลานี้?" message={`${del.name} — ประวัติที่มีอยู่ยังคงอยู่ แต่พนักงานจะเลือกไม่ได้อีก`} confirmLabel="ปิดใช้งาน" onConfirm={() => delMut.mutate(del.id)} onCancel={() => setDel(null)} />}
    </div>
  )
}

// ── สะสมวันลา ───────────────────────────────────────────────────────────────
function Accrual({ readOnly, customEnabled }: { readOnly: boolean; customEnabled: boolean }) {
  const qc = useQueryClient(); const { showToast } = useToast()
  const [editing, setEditing] = useState<any>(null)
  const { data: rules = [] } = useQuery<any[]>({ queryKey: ['accrual-rules'], queryFn: () => api.get('/api/v1/admin/leave-accrual').then(r => r.data.data) })
  const { data: customTypes = [] } = useQuery<any[]>({ queryKey: ['leave-types'], enabled: customEnabled, queryFn: () => api.get('/api/v1/admin/leave-types').then(r => r.data.data) })

  const saveMut = useMutation({
    mutationFn: (body: any) => api.put('/api/v1/admin/leave-accrual', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accrual-rules'] }); showToast('success', 'บันทึกกติกาแล้ว'); setEditing(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const runMut = useMutation({
    mutationFn: () => api.post('/api/v1/admin/leave-accrual/run', {}),
    onSuccess: (r: any) => showToast('success', r.data.message),
    onError: () => showToast('error', 'ประมวลผลไม่สำเร็จ'),
  })

  const typeLabel = (r: any) => r.leave_type === 'OTHER' ? (r.custom_type?.name ?? 'กำหนดเอง') : (STD_TYPES.find(t => t.code === r.leave_type)?.label ?? r.leave_type)
  const activeCount = rules.filter(r => r.active).length

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>สะสมวันลา</p>
        {!readOnly && <button onClick={() => setEditing({ leave_type: 'SICK', days_per_month: 1, max_balance: null, max_carryover: null, start_after_probation: false, active: false })}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={13} /> เพิ่มกติกา</button>}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 12px' }}>
        สะสม X วัน/เดือน เข้าโควต้าพนักงาน · <b>ยังไม่มี cron อัตโนมัติ</b> — กดปุ่ม "ประมวลผลเดือนนี้" เอง (กันรันซ้ำเดือนเดิม)
      </p>

      {rules.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>ยังไม่มีกติกาสะสม</div>
      ) : rules.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #f3f4f6', fontSize: '13px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.active ? '#16a34a' : '#cbd5e1', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{typeLabel(r)}</b> — สะสม {r.days_per_month} วัน/เดือน
            <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: '11.5px' }}>
              {r.max_balance != null && `เพดาน ${r.max_balance} · `}
              ยกยอด {r.max_carryover == null ? 'ไม่จำกัด' : `≤${r.max_carryover}`}
              {r.start_after_probation && ' · หลังผ่านโปร'}
              {r.last_run_ym && ` · รันล่าสุด ${r.last_run_ym}`}
            </span>
          </div>
          {!readOnly && <button onClick={() => setEditing(r)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>แก้</button>}
        </div>
      ))}

      {!readOnly && activeCount > 0 && (
        <button onClick={() => runMut.mutate()} disabled={runMut.isPending}
          style={{ marginTop: 14, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Play size={13} /> {runMut.isPending ? 'กำลังประมวลผล...' : 'ประมวลผลสะสมเดือนนี้'}
        </button>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} width={400}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>กติกาสะสม</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>ประเภทการลา</label>
                <select style={inp} value={editing.leave_type === 'OTHER' ? `C:${editing.custom_type_id ?? editing.custom_type?.id}` : editing.leave_type}
                  onChange={e => {
                    const v = e.target.value
                    if (v.startsWith('C:')) setEditing((s: any) => ({ ...s, leave_type: 'OTHER', custom_type_id: v.slice(2) }))
                    else setEditing((s: any) => ({ ...s, leave_type: v, custom_type_id: null }))
                  }}>
                  {STD_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  {customTypes.map(t => <option key={t.id} value={`C:${t.id}`}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>วัน/เดือน</label><input type="number" min={0} step={0.5} style={inp} value={editing.days_per_month} onChange={e => setEditing((s: any) => ({ ...s, days_per_month: Number(e.target.value) }))} /></div>
                <div><label style={lbl}>เพดานยอดสะสม</label><input type="number" min={0} style={inp} value={editing.max_balance ?? ''} placeholder="ไม่จำกัด" onChange={e => setEditing((s: any) => ({ ...s, max_balance: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              </div>
              <div><label style={lbl}>ยกยอดข้ามปีได้ไม่เกิน (วัน)</label><input type="number" min={0} style={inp} value={editing.max_carryover ?? ''} placeholder="ไม่จำกัด (0 = ไม่ยก)" onChange={e => setEditing((s: any) => ({ ...s, max_carryover: e.target.value === '' ? null : Number(e.target.value) }))} /></div>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.start_after_probation} onChange={e => setEditing((s: any) => ({ ...s, start_after_probation: e.target.checked }))} style={{ accentColor: '#16a34a' }} /> เริ่มสะสมหลังผ่านทดลองงาน
              </label>
              <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700 }}>
                <input type="checkbox" checked={editing.active} onChange={e => setEditing((s: any) => ({ ...s, active: e.target.checked }))} style={{ accentColor: '#16a34a' }} /> เปิดใช้กติกานี้
              </label>
              <button onClick={() => saveMut.mutate({ leave_type: editing.leave_type, custom_type_id: editing.custom_type_id ?? null, days_per_month: editing.days_per_month, max_balance: editing.max_balance, max_carryover: editing.max_carryover, start_after_probation: editing.start_after_probation, active: editing.active })}
                disabled={saveMut.isPending}
                style={{ marginTop: 4, padding: '10px', borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>บันทึกกติกา</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
