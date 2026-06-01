// admin/src/pages/shift/index.tsx
import { useState, useEffect } from 'react'
import { api } from '../../lib/axios'
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

  const [shifts, setShifts]     = useState<ApiShift[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading]   = useState(true)
  const [branchFilter, setBranchFilter] = useState('')

  const [modal, setModal]       = useState<{ mode: 'add' | 'edit'; data: ApiShift | null } | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiShift | null>(null)

  async function loadAll() {
    try {
      setLoading(true)
      const [br, sh] = await Promise.all([
        api.get('/api/v1/admin/branches'),
        api.get('/api/v1/admin/shifts'),
      ])
      setBranches(br.data.data ?? [])
      setShifts(sh.data.data ?? [])
    } catch {
      showToast('error', 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = shifts.filter(s => !branchFilter || s.branch_id === branchFilter)

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
    try {
      const payload = {
        name:             form.name,
        start_time:       form.start_time,
        end_time:         form.end_time,
        min_checkout:     form.min_checkout || null,
        late_threshold_1: form.late_threshold_1 || null,
        late_threshold_2: form.late_threshold_2 || null,
        late_fine_1:      form.late_fine_1 ? parseFloat(form.late_fine_1) : null,
        late_fine_2:      form.late_fine_2 ? parseFloat(form.late_fine_2) : null,
        shift_type:       form.shift_type,
      }
      if (modal?.mode === 'add') {
        await api.post('/api/v1/admin/shifts', { branch_id: form.branch_id, ...payload })
        showToast('success', `เพิ่มกะ "${form.name}" สำเร็จ`)
      } else if (modal?.data) {
        await api.patch(`/api/v1/admin/shifts/${modal.data.id}`, payload)
        showToast('success', `บันทึกกะ "${form.name}" เรียบร้อย`)
      }
      setModal(null)
      await loadAll()
    } catch {
      showToast('error', 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/v1/admin/shifts/${deleteTarget.id}`)
      showToast('success', `ลบกะ "${deleteTarget.name}" เรียบร้อย`)
      setDeleteTarget(null)
      await loadAll()
    } catch {
      showToast('error', 'ลบไม่สำเร็จ')
    }
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>⏰ จัดการกะทำงาน</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>กำหนดเวลาเข้า-ออก, เช็คเอาท์ขั้นต่ำ และเกณฑ์การสาย</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
          + เพิ่มกะ
        </button>
      </div>

      {/* Branch filter */}
      {branches.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ id: '', name: 'ทุกสาขา' }, ...branches].map(b => (
            <button key={b.id} onClick={() => setBranchFilter(b.id)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer', border: `1px solid ${branchFilter === b.id ? '#4f46e5' : '#d1d5db'}`, background: branchFilter === b.id ? '#ede9fe' : '#fff', color: branchFilter === b.id ? '#4f46e5' : '#374151', fontWeight: branchFilter === b.id ? 700 : 400 }}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

      {/* Shift cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ marginBottom: 12 }}>{shifts.length === 0 ? 'ยังไม่มีกะ' : 'ไม่พบกะในสาขาที่เลือก'}</p>
              {shifts.length === 0 && <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ เพิ่มกะแรก</button>}
            </div>
          )}
          {filtered.map(s => {
            const st  = getShiftStatus(s)
            const cfg = STATUS_CFG[st]
            return (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${st === 'active' ? '#86efac' : '#e5e7eb'}`, overflow: 'hidden', boxShadow: st === 'active' ? '0 0 0 2px #dcfce7' : 'none' }}>
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

              {/* Time grid */}
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem' }}>
                <TimeRow icon="🟢" label="เวลาเริ่มงาน" value={s.start_time} color="#15803d" />
                <TimeRow icon="🔴" label="เวลาเลิกงาน" value={s.end_time} color="#dc2626" />
                {s.min_checkout && <TimeRow icon="🔒" label="เช็คเอาท์ขั้นต่ำ" value={s.min_checkout} color="#7c3aed" />}
                {s.late_threshold_1 && <TimeRow icon="⚠️" label="สายระดับ 1" value={s.late_threshold_1} color="#d97706" />}
                {s.late_threshold_2 && <TimeRow icon="🚫" label="สายระดับ 2 / ขาด" value={s.late_threshold_2} color="#dc2626" />}
                {!s.late_threshold_1 && !s.late_threshold_2 && (
                  <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#9ca3af' }}>⏱ สายได้ {s.late_threshold} นาที</div>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(s)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✏ แก้ไข</button>
                <button onClick={() => setDeleteTarget(s)} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>🗑</button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>
                {modal.mode === 'add' ? '+ เพิ่มกะใหม่' : `✏ แก้ไขกะ: ${modal.data?.name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px' }}>✕</button>
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
