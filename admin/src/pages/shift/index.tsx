// admin/src/pages/shift/index.tsx
import { useState } from 'react'
import { MOCK_SHIFTS, MOCK_BRANCHES } from '../../lib/mock'
import type { ShiftDef } from '../../types'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'

const EMPTY_SHIFT: Omit<ShiftDef, 'id' | 'employee_count'> = {
  name: 'กะเช้า',
  branch_name: 'วงษ์หิรัญ',
  start_time: '08:00',
  end_time: '17:00',
  late_threshold_1: '08:05',
  late_threshold_2: '08:20',
}

export default function ShiftPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<ShiftDef[]>(MOCK_SHIFTS)
  const [branchFilter, setBranchFilter] = useState('')
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: ShiftDef | null } | null>(null)
  const [form, setForm] = useState<Omit<ShiftDef, 'id' | 'employee_count'>>(EMPTY_SHIFT)
  const [deleteTarget, setDeleteTarget] = useState<ShiftDef | null>(null)

  const filtered = rows.filter(r => !branchFilter || r.branch_name === branchFilter)

  function openAdd() {
    setForm(EMPTY_SHIFT)
    setModal({ mode: 'add', data: null })
  }

  function openEdit(r: ShiftDef) {
    setForm({ name: r.name, branch_name: r.branch_name, start_time: r.start_time, end_time: r.end_time, late_threshold_1: r.late_threshold_1, late_threshold_2: r.late_threshold_2 })
    setModal({ mode: 'edit', data: r })
  }

  function handleSave() {
    if (modal?.mode === 'add') {
      const newRow: ShiftDef = { ...form, id: `sh-${Date.now()}`, employee_count: 0 }
      setRows(prev => [...prev, newRow])
      showToast('success', `เพิ่มกะ "${form.name}" สำเร็จแล้ว`)
    } else if (modal?.data) {
      setRows(prev => prev.map(r => r.id === modal.data!.id ? { ...r, ...form } : r))
      showToast('success', `บันทึกกะ "${form.name}" เรียบร้อยแล้ว`)
    }
    setModal(null)
  }

  function confirmDelete() {
    if (deleteTarget) {
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id))
      showToast('success', `ลบกะ "${deleteTarget.name}" เรียบร้อยแล้ว`)
    }
    setDeleteTarget(null)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff' }
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>⏰ จัดการกะ (Shift)</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>กำหนดเวลาเข้า-ออกงานแต่ละกะ รายสาขา</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          + {isMobile ? 'เพิ่ม' : 'เพิ่มกะใหม่'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'กะทั้งหมด',       value: rows.length,                              unit: 'กะ',      color: '#3b82f6', bg: '#eff6ff' },
          { label: 'สาขาที่มีกะ',     value: new Set(rows.map(r => r.branch_name)).size, unit: 'สาขา',   color: '#f97316', bg: '#fff7ed' },
          { label: 'พนักงานในกะ',     value: rows.reduce((s, r) => s + r.employee_count, 0), unit: 'คน', color: '#16a34a', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: isMobile ? '12px' : '16px 20px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 700, color: s.color }}>{s.value} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>{s.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Branch filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>
          <option value="">ทุกสาขา</option>
          {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {/* Table or Cards */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '3px 10px', fontSize: '0.82rem', fontWeight: 700 }}>{r.name}</span>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>{r.branch_name}</div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#374151', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{r.employee_count}</span> คน
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.78rem', color: '#374151' }}>เข้า <span style={{ fontWeight: 700 }}>{r.start_time}</span></div>
                  <div style={{ fontSize: '0.78rem', color: '#374151' }}>ออก <span style={{ fontWeight: 700 }}>{r.end_time}</span></div>
                  <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 600 }}>สาย1: {r.late_threshold_1}</span>
                  <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 600 }}>สาย2: {r.late_threshold_2}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(r)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.8rem', color: '#374151' }}>✏ แก้ไข</button>
                  <button onClick={() => setDeleteTarget(r)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.8rem' }}>🗑 ลบ</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่พบกะ</div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#dbeafe' }}>
                  {['ชื่อกะ', 'สาขา', 'เวลาเริ่ม', 'เวลาเลิก', 'สายระดับ 1', 'สายระดับ 2 / ขาด', 'พนักงาน', 'จัดการ'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '3px 10px', fontSize: '0.82rem', fontWeight: 700 }}>{r.name}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '0.82rem' }}>{r.branch_name}</td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 600 }}>{r.start_time}</td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 600 }}>{r.end_time}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '3px 10px', fontSize: '0.82rem', fontWeight: 600 }}>{r.late_threshold_1}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '3px 10px', fontSize: '0.82rem', fontWeight: 600 }}>{r.late_threshold_2}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{r.employee_count}</span>
                      <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}> คน</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(r)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.8rem', color: '#374151' }}>✏ แก้ไข</button>
                        <button onClick={() => setDeleteTarget(r)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', color: '#dc2626', fontSize: '0.8rem' }}>🗑 ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่พบกะ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal — bottom sheet on mobile */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding: '24px', width: isMobile ? '100%' : 480, maxWidth: isMobile ? '100%' : '90vw', paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : 24, maxHeight: isMobile ? '90vh' : 'none', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>{modal.mode === 'add' ? '+ เพิ่มกะใหม่' : '✏ แก้ไขกะ'}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>ชื่อกะ</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="เช่น กะเช้า" />
                </div>
                <div>
                  <label style={labelStyle}>สาขา</label>
                  <select value={form.branch_name} onChange={e => setForm(f => ({ ...f, branch_name: e.target.value }))} style={inputStyle}>
                    {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>⏰ เวลาทำงาน</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>เวลาเริ่มงาน</label>
                    <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>เวลาเลิกงาน</label>
                    <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ background: '#fef9f0', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: 10 }}>⊙ เกณฑ์การสาย</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>สายระดับ 1 (หลังเวลา)</label>
                    <input type="time" value={form.late_threshold_1} onChange={e => setForm(f => ({ ...f, late_threshold_1: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>สายระดับ 2 / นับว่าขาด</label>
                    <input type="time" value={form.late_threshold_2} onChange={e => setForm(f => ({ ...f, late_threshold_2: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 600 }}>
                {modal.mode === 'add' ? '+ เพิ่มกะ' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบกะนี้?"
          message={`"${deleteTarget.name}" (${deleteTarget.branch_name}) จะถูกลบออก พนักงาน ${deleteTarget.employee_count} คนที่ผูกกับกะนี้จะได้รับผลกระทบ`}
          confirmLabel="ลบกะ"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
