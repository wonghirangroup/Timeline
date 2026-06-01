// admin/src/pages/employee/index.tsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiBranch {
  id: string
  name: string
}

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
  created_at: string
  branch_id: string
  branch: { id: string; name: string }
}

const DEPARTMENTS = [
  '01 ผู้บริหาร',
  '02 Office',
  '03 พนักงานขาย',
  '04 พนักงานขนส่ง',
]

const EMPTY_FORM = {
  branch_id: '', full_name: '', nickname: '', department: '',
  phone: '', hired_at: '',
}

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', fontSize: '14px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  outline: 'none', boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
  background: '#fff',
}
const disabledInput: React.CSSProperties = {
  ...input, background: '#f9fafb', color: '#9ca3af',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: 6,
}
const required: React.CSSProperties = { color: '#ef4444', marginLeft: 2 }

export default function EmployeePage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  const [employees, setEmployees]     = useState<ApiEmployee[]>([])
  const [branches, setBranches]       = useState<ApiBranch[]>([])
  const [loading, setLoading]         = useState(true)

  const [search, setSearch]           = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [lineFilter, setLineFilter]   = useState<'' | 'linked' | 'unlinked'>('')
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'INACTIVE'>('')

  const [modal, setModal]             = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget]   = useState<ApiEmployee | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployee | null>(null)

  async function loadAll() {
    try {
      setLoading(true)
      const [br, em] = await Promise.all([
        api.get('/api/v1/admin/branches'),
        api.get('/api/v1/admin/employees'),
      ])
      setBranches(br.data.data ?? [])
      setEmployees(em.data.data ?? [])
    } catch {
      showToast('error', 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = useMemo(() => employees.filter(e => {
    if (branchFilter && e.branch_id !== branchFilter) return false
    if (statusFilter === 'ACTIVE'   && !e.is_active) return false
    if (statusFilter === 'INACTIVE' &&  e.is_active) return false
    if (lineFilter === 'linked'   && !e.line_user_id) return false
    if (lineFilter === 'unlinked' &&  e.line_user_id) return false
    if (search) {
      const hay = `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code} ${e.phone ?? ''} ${e.department ?? ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  }), [employees, branchFilter, statusFilter, lineFilter, search])

  function openAdd() {
    setForm({ ...EMPTY_FORM, branch_id: branches[0]?.id ?? '' })
    setEditTarget(null)
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
    })
    setEditTarget(e)
    setModal('edit')
  }

  function parseName(full: string): { first_name: string; last_name: string } {
    const parts = full.trim().split(/\s+/)
    return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') }
  }

  async function handleSave() {
    if (!form.branch_id || !form.full_name.trim()) {
      showToast('error', 'กรุณากรอกชื่อ-สกุล และเลือกสาขา')
      return
    }
    const { first_name, last_name } = parseName(form.full_name)
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        branch_id: form.branch_id,
        first_name,
        last_name,
        nickname: form.nickname || undefined,
        department: form.department || undefined,
        phone: form.phone || undefined,
        hired_at: form.hired_at || undefined,
      }
      if (modal === 'add') {
        await api.post('/api/v1/admin/employees', payload)
        showToast('success', `เพิ่มพนักงาน "${form.full_name}" สำเร็จ`)
      } else if (editTarget) {
        await api.patch(`/api/v1/admin/employees/${editTarget.id}`, payload)
        showToast('success', `บันทึกข้อมูล "${form.full_name}" เรียบร้อย`)
      }
      setModal(null)
      await loadAll()
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'บันทึกไม่สำเร็จ'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(e: ApiEmployee) {
    try {
      await api.patch(`/api/v1/admin/employees/${e.id}`, { is_active: !e.is_active })
      showToast('success', `${e.first_name} ${e.last_name} — ${!e.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}แล้ว`)
      await loadAll()
    } catch {
      showToast('error', 'เปลี่ยนสถานะไม่สำเร็จ')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/v1/admin/employees/${deleteTarget.id}`)
      showToast('success', `ลบพนักงาน "${deleteTarget.first_name} ${deleteTarget.last_name}" เรียบร้อย`)
      setDeleteTarget(null)
      await loadAll()
    } catch {
      showToast('error', 'ลบไม่สำเร็จ')
    }
  }

  const filterInput: React.CSSProperties = {
    ...input, padding: '8px 12px', fontSize: '13px',
  }
  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox: React.CSSProperties = {
    background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16,
    width: isMobile ? '100%' : 720, maxWidth: '96vw',
    maxHeight: isMobile ? '92vh' : '95vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>👥 จัดการพนักงาน</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
            ทั้งหมด {employees.length} คน · กรองอยู่ {filtered.length} คน
          </p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>
          + เพิ่มพนักงาน
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อ / ชื่อเล่น / รหัส..."
          style={{ ...filterInput, width: 230 }} />
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ ...filterInput, width: 'auto' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as '' | 'ACTIVE' | 'INACTIVE')} style={{ ...filterInput, width: 'auto' }}>
          <option value="">ทุกสถานะ</option>
          <option value="ACTIVE">ใช้งาน</option>
          <option value="INACTIVE">ไม่ใช้งาน</option>
        </select>
        <select value={lineFilter} onChange={e => setLineFilter(e.target.value as '' | 'linked' | 'unlinked')} style={{ ...filterInput, width: 'auto' }}>
          <option value="">Line ทั้งหมด</option>
          <option value="linked">✓ ผูก Line แล้ว</option>
          <option value="unlinked">— ยังไม่ผูก Line</option>
        </select>
      </div>

      {loading && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

      {/* Desktop table */}
      {!loading && !isMobile && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                  {employees.length === 0 ? 'ยังไม่มีพนักงาน กรุณาเพิ่มพนักงานแรก' : 'ไม่พบพนักงานที่ตรงกับเงื่อนไข'}
                </td></tr>
              )}
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>{e.employee_code}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => navigate(`/employee/${e.id}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#ea580c', fontSize: '0.875rem', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                      {e.first_name} {e.last_name}
                    </button>
                    {e.nickname && <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 5 }}>({e.nickname})</span>}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{e.department ?? '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.82rem' }}>{e.branch.name}</td>
                  <td style={{ padding: '11px 14px', color: '#374151', fontSize: '0.82rem' }}>{e.phone ?? '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {e.line_user_id
                      ? <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>✓ ผูกแล้ว</span>
                      : <span style={{ background: '#f3f4f6', color: '#9ca3af', borderRadius: 99, padding: '2px 8px', fontSize: '0.75rem' }}>— ยังไม่ผูก</span>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button
                      onClick={() => handleToggleStatus(e)}
                      title={e.is_active ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                      style={{ background: e.is_active ? '#dcfce7' : '#fef2f2', color: e.is_active ? '#16a34a' : '#dc2626', borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, border: e.is_active ? '1px solid #bbf7d0' : '1px solid #fecaca', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {e.is_active ? '● ใช้งาน' : '○ ปิดใช้งาน'}
                    </button>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#374151' }}>✏</button>
                      <button onClick={() => setDeleteTarget(e)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#dc2626' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '13px' }}>ไม่พบพนักงาน</p>
          )}
          {filtered.map(e => (
            <div key={e.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }} onClick={() => navigate(`/employee/${e.id}`)}>
                    {e.first_name} {e.last_name}
                    {e.nickname && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400, marginLeft: 4 }}>({e.nickname})</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 2 }}>{e.employee_code} · {e.branch.name}{e.department ? ` · ${e.department}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleToggleStatus(e)}
                    style={{ background: e.is_active ? '#dcfce7' : '#fef2f2', color: e.is_active ? '#16a34a' : '#dc2626', borderRadius: 99, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, border: e.is_active ? '1px solid #bbf7d0' : '1px solid #fecaca', cursor: 'pointer' }}>
                    {e.is_active ? '● ใช้งาน' : '○ ปิดใช้งาน'}
                  </button>
                  {e.line_user_id
                    ? <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Line ✓</span>
                    : <span style={{ background: '#f3f4f6', color: '#9ca3af', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem' }}>ยังไม่ผูก</span>}
                </div>
              </div>
              {e.phone && <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 10px' }}>📞 {e.phone}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(e)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>✏ แก้ไข</button>
                <button onClick={() => setDeleteTarget(e)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox} onClick={ev => ev.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: 0 }}>
                {modal === 'add' ? 'เพิ่มพนักงานใหม่' : `แก้ไข: ${editTarget?.first_name} ${editTarget?.last_name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1 }}>✕</button>
            </div>

            {/* Body */}
            <div
              style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            >

              {/* รหัสพนักงาน — info banner */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>รหัสพนักงาน</span>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: modal === 'edit' ? '#1e293b' : '#94a3b8', fontWeight: 700 }}>
                  {modal === 'edit' ? editTarget?.employee_code : 'สร้างอัตโนมัติ (ปี-แผนก-ลำดับ)'}
                </span>
              </div>

              {/* Row 1: ชื่อ-สกุล + ชื่อเล่น */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12 }}>
                <div>
                  <label style={label}>ชื่อ - สกุล <span style={required}>*</span></label>
                  <input
                    autoFocus
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="เช่น สมชาย ใจดี"
                    style={input}
                  />
                </div>
                <div>
                  <label style={label}>ชื่อเล่น <span style={required}>*</span></label>
                  <input
                    value={form.nickname}
                    onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                    placeholder="เช่น บาส, ฟ้า, โอ๊ต"
                    style={input}
                  />
                </div>
              </div>

              {/* Row 2: แผนก + เบอร์โทร */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>แผนก <span style={required}>*</span></label>
                  <select
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    style={input}
                  >
                    <option value="">เลือกแผนก</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>เบอร์โทร <span style={required}>*</span></label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="0XXXXXXXXX"
                    style={input}
                    inputMode="tel"
                  />
                </div>
              </div>

              {/* Row 3: สาขา + วันที่เข้าทำงาน */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>สาขา <span style={required}>*</span></label>
                  <select
                    value={form.branch_id}
                    onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}
                    style={input}
                  >
                    <option value="">เลือกสาขา</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>วันที่เข้าทำงาน <span style={required}>*</span></label>
                  <input
                    type="date"
                    value={form.hired_at}
                    onChange={e => setForm(f => ({ ...f, hired_at: e.target.value }))}
                    style={input}
                  />
                </div>
              </div>

              {/* Line status (edit only) */}
              {modal === 'edit' && editTarget && (
                <div style={{ background: editTarget.line_user_id ? '#f0fdf4' : '#fef9f0', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: editTarget.line_user_id ? '#15803d' : '#92400e' }}>
                  💚 Line: {editTarget.line_user_id ? `ผูกแล้ว (${editTarget.line_user_id.slice(0, 12)}...)` : 'ยังไม่ผูก — พนักงานต้องยืนยันตัวตนผ่าน LIFF'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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
    </div>
  )
}
