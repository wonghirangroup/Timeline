// admin/src/pages/settings/index.tsx
//
// หมายเหตุ (17 ส.ค. 2569): หน้านี้เคยมีแท็บ "กฎค่าปรับ" ที่เป็น local-state mock
// ล้วนๆ (useState + toast "บันทึกสำเร็จ" ปลอมๆ ไม่มี API ใดๆ) และ calcFine()
// ก็ไม่ถูกเรียกใช้จากที่ไหนในระบบเลย — ของจริงที่ backend ใช้คำนวณค่าปรับสาย
// จริงๆ คือ shift.late_threshold / late_fine_1 / late_fine_2 ต่อกะ
// (ตั้งค่าที่ กะ & เวลา → จัดการกะ) ถูกตัดสินใจแล้วว่าจะ "คงไว้ต่อกะเหมือนเดิม"
// ไม่รวมเป็น setting ระดับ tenant — เลยเอาแท็บ mock นั้นออกไปกันสับสน
//
// (18 ส.ค. 2569) เคยมีส่วน "ภาพหน้าจอ Loading" ให้ Admin อัปโหลดเองต่อ tenant
// (เก็บไฟล์บน Cloudinary) — เอาออกแล้ว (27 ส.ค. 2569): เปลี่ยนไปใช้ animation
// แมววิ่งตัวเดียวกันทุก tenant แทน ไม่ต้องอัปโหลดเองอีกต่อไป (ดู
// employee/src/components/ui/index.tsx PageLoader)
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Clock, MapPin, Trash2, Users, Plus, Pencil, KeyRound, Building2, CalendarClock, Lock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsReadOnly } from '../../stores/authStore'
import { PlanUsageRow } from '../../components/shared/PlanUsage'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 420, maxWidth: '92vw', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '85vh', overflowY: 'auto' as const }
const fieldLabel: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }

// ── จัดการผู้ใช้งานเว็บ (Admin/Manager/ผู้บริหาร/หัวหน้าแผนก) ────────────────
const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'แอดมิน / HR / ผู้จัดการ', MANAGER: 'แอดมิน / HR / ผู้จัดการ',
  EXECUTIVE: 'ผู้บริหาร (ดูอย่างเดียว)', DEPT_HEAD: 'หัวหน้าแผนก',
}
const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: '#fff7ed', color: '#c2410c' }, MANAGER: { bg: '#fff7ed', color: '#c2410c' },
  EXECUTIVE: { bg: '#eef2ff', color: '#4338ca' }, DEPT_HEAD: { bg: '#ecfeff', color: '#0e7490' },
}
interface WebUser { id: string; email: string; first_name: string; last_name: string; role: string; is_active: boolean; created_at: string }
interface Dept { id: string; name: string; division: { id: string; name: string } | null }
const EMPTY_USER_FORM = { email: '', password: '', first_name: '', last_name: '', role: 'ADMIN', department_ids: [] as string[] }

function UserManagementSettings() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [modal, setModal] = useState<{ edit?: WebUser } | null>(null)
  const [form, setForm] = useState(EMPTY_USER_FORM)
  const [deleteTarget, setDeleteTarget] = useState<WebUser | null>(null)

  const { data: users = [], isLoading } = useQuery<WebUser[]>({
    queryKey: ['settings', 'users'], queryFn: () => api.get('/api/v1/super-admin/users').then((r: any) => r.data.data),
  })
  const { data: departments = [] } = useQuery<Dept[]>({
    queryKey: ['departments'], queryFn: () => api.get('/api/v1/admin/departments').then((r: any) => r.data.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['settings', 'users'] })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/super-admin/users', body),
    onSuccess: () => { invalidate(); showToast('success', 'สร้างผู้ใช้งานสำเร็จ'); setModal(null) },
    onError: (err: any) => showToast('error', err.response?.data?.error?.code === 'DUPLICATE_EMAIL' ? 'อีเมลนี้มีอยู่แล้ว' : 'สร้างไม่สำเร็จ'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/super-admin/users/${id}`, body),
    onSuccess: () => { invalidate(); showToast('success', 'บันทึกสำเร็จ'); setModal(null) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const setDeptsMutation = useMutation({
    mutationFn: ({ id, department_ids }: { id: string; department_ids: string[] }) => api.put(`/api/v1/super-admin/users/${id}/departments`, { department_ids }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/super-admin/users/${id}`),
    onSuccess: () => { invalidate(); showToast('success', 'ลบผู้ใช้งานสำเร็จ'); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

  const openAdd = () => { setForm(EMPTY_USER_FORM); setModal({}) }
  const openEdit = async (u: WebUser) => {
    let department_ids: string[] = []
    if (u.role === 'DEPT_HEAD') {
      const res = await api.get(`/api/v1/super-admin/users/${u.id}/departments`)
      department_ids = res.data.data.map((d: any) => d.department_id)
    }
    setForm({ email: u.email, password: '', first_name: u.first_name, last_name: u.last_name, role: u.role, department_ids })
    setModal({ edit: u })
  }
  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    if (modal?.edit) {
      const body: any = { first_name: form.first_name, last_name: form.last_name }
      if (form.password.trim()) body.password = form.password
      await updateMutation.mutateAsync({ id: modal.edit.id, body })
      if (modal.edit.role === 'DEPT_HEAD') await setDeptsMutation.mutateAsync({ id: modal.edit.id, department_ids: form.department_ids })
    } else {
      if (!form.email.trim() || !form.password.trim()) return
      createMutation.mutate(form)
    }
  }

  const toggleDept = (id: string) => setForm(f => ({
    ...f, department_ids: f.department_ids.includes(id) ? f.department_ids.filter(d => d !== id) : [...f.department_ids, id],
  }))

  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', flexShrink: 0 }}>
            <Users size={18} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ผู้ใช้งานเว็บ</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              จัดการคนที่ล็อกอินเข้าเว็บนี้ได้ — ผู้บริหาร (ดูอย่างเดียว), แอดมิน/HR/ผู้จัดการ, หัวหน้าแผนก (เห็นแค่แผนกที่ดูแล)
            </p>
          </div>
        </div>
        <button onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
          <Plus size={14}/> เพิ่มผู้ใช้งาน
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>กำลังโหลด...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>ยังไม่มีผู้ใช้งาน</p>}
          {users.map(u => {
            const badge = ROLE_BADGE[u.role] ?? { bg: '#f3f4f6', color: '#374151' }
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#f9fafb', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{u.first_name} {u.last_name}{!u.is_active && ' (ปิดใช้งาน)'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: badge.color, background: badge.bg, padding: '3px 9px', borderRadius: 99 }}>{ROLE_LABEL[u.role] ?? u.role}</span>
                <button onClick={() => openEdit(u)} style={{ padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
                <button onClick={() => setDeleteTarget(u)} style={{ padding: 6, borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{modal.edit ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h3>

            {!modal.edit && (
              <>
                <label style={fieldLabel}>อีเมล</label>
                <input autoFocus style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
                <label style={{ ...fieldLabel, margin: '10px 0 4px' }}>รหัสผ่านเริ่มต้น</label>
                <input type="text" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="ตั้งรหัสผ่านชั่วคราว" />
              </>
            )}
            {modal.edit && (
              <>
                <label style={fieldLabel}>อีเมล</label>
                <input style={{ ...inputStyle, background: '#f9fafb', color: 'var(--text-muted)' }} value={form.email} disabled />
                <label style={{ ...fieldLabel, margin: '10px 0 4px' }}>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <KeyRound size={14} color="#9ca3af" />
                  <input type="text" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="รหัสผ่านใหม่" />
                </div>
              </>
            )}

            <label style={{ ...fieldLabel, margin: '10px 0 4px' }}>ชื่อ</label>
            <input style={inputStyle} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            <label style={{ ...fieldLabel, margin: '10px 0 4px' }}>นามสกุล</label>
            <input style={inputStyle} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />

            {!modal.edit && (
              <>
                <label style={{ ...fieldLabel, margin: '10px 0 4px' }}>บทบาท</label>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="ADMIN">แอดมิน / HR / ผู้จัดการ</option>
                  <option value="EXECUTIVE">ผู้บริหาร (ดูอย่างเดียว แก้ไข/ลบไม่ได้)</option>
                  <option value="DEPT_HEAD">หัวหน้าแผนก (เห็นแค่แผนกที่ดูแล)</option>
                </select>
              </>
            )}

            {(modal.edit ? modal.edit.role : form.role) === 'DEPT_HEAD' && (
              <>
                <label style={{ ...fieldLabel, margin: '10px 0 6px' }}>แผนกที่ดูแล (เลือกได้หลายแผนก)</label>
                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 6 }}>
                  {departments.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 4 }}>ยังไม่มีแผนกในระบบ — ไปสร้างที่ผังองค์กรก่อน</p>}
                  {departments.map(d => (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.department_ids.includes(d.id)} onChange={() => toggleDept(d.id)} />
                      <span style={{ fontSize: '12.5px', color: '#374151' }}>{d.name}{d.division ? ` (${d.division.name})` : ''}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                {modal.edit ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบผู้ใช้งาน"
          message={<>ยืนยันลบ "<strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong>" — จะล็อกอินเข้าเว็บนี้ไม่ได้อีก</>}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── รหัสผ่านของฉัน ──────────────────────────────────────────────────────────
function SelfPasswordCard() {
  const { showToast } = useToast()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const mut = useMutation({
    mutationFn: () => api.post('/api/v1/auth/change-password', { current_password: cur, new_password: next }),
    onSuccess: () => { showToast('success', 'เปลี่ยนรหัสผ่านสำเร็จ'); setCur(''); setNext(''); setConfirm('') },
    onError: (err: any) => showToast('error', err.response?.data?.error?.code === 'WRONG_PASSWORD' ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง' : 'เปลี่ยนไม่สำเร็จ'),
  })
  const valid = cur && next.length >= 6 && next === confirm
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', flexShrink: 0 }}><Lock size={18} /></div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>รหัสผ่านของฉัน</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>เปลี่ยนรหัสผ่านของบัญชีที่คุณล็อกอินอยู่</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
        <div><label style={fieldLabel}>รหัสผ่านปัจจุบัน</label><input type="password" style={inputStyle} value={cur} onChange={e => setCur(e.target.value)} /></div>
        <div><label style={fieldLabel}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label><input type="password" style={inputStyle} value={next} onChange={e => setNext(e.target.value)} /></div>
        <div><label style={fieldLabel}>ยืนยันรหัสผ่านใหม่</label><input type="password" style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
        {confirm && next !== confirm && <p style={{ fontSize: '11.5px', color: '#dc2626', margin: 0 }}>รหัสผ่านใหม่ไม่ตรงกัน</p>}
        <button onClick={() => mut.mutate()} disabled={!valid || mut.isPending}
          style={{ justifySelf: 'start', marginTop: 2, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.5 }}>
          {mut.isPending ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </div>
    </div>
  )
}

// ── ข้อมูลบริษัท & แบรนด์ ───────────────────────────────────────────────────
interface TenantSettings { name: string; address: string | null; tax_id: string | null; logo_url: string | null; primary_color: string | null; leave_backdate_days: number | null; plan: string }

function CompanyProfileTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const { data } = useQuery<TenantSettings>({ queryKey: ['tenant-settings'], queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data) })
  const [form, setForm] = useState({ name: '', address: '', tax_id: '', logo_url: '', primary_color: '' })
  useEffect(() => { if (data) setForm({ name: data.name ?? '', address: data.address ?? '', tax_id: data.tax_id ?? '', logo_url: data.logo_url ?? '', primary_color: data.primary_color ?? '' }) }, [data])

  const mut = useMutation({
    mutationFn: () => api.patch('/api/v1/admin/tenant-settings', {
      name: form.name.trim(),
      address: form.address.trim() || null,
      tax_id: form.tax_id.trim() || null,
      logo_url: form.logo_url.trim() || null,
      primary_color: form.primary_color.trim() || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); showToast('success', 'บันทึกข้อมูลบริษัทแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}><Building2 size={18} /></div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ข้อมูลบริษัท & แบรนด์</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>ชื่อ/ที่อยู่บริษัทใช้บนเอกสารและรายงาน · โลโก้และสีใช้ปรับหน้าตาให้ตรงแบรนด์ · แพ็กเกจ {data?.plan}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div><label style={fieldLabel}>ชื่อบริษัท</label><input style={inputStyle} value={form.name} disabled={readOnly} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><label style={fieldLabel}>เลขประจำตัวผู้เสียภาษี</label><input style={inputStyle} value={form.tax_id} disabled={readOnly} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} placeholder="0000000000000" /></div>
        <div style={{ gridColumn: '1 / -1' }}><label style={fieldLabel}>ที่อยู่</label><input style={inputStyle} value={form.address} disabled={readOnly} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" /></div>
        <div><label style={fieldLabel}>โลโก้ (URL รูปภาพ)</label><input style={inputStyle} value={form.logo_url} disabled={readOnly} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
        <div>
          <label style={fieldLabel}>สีหลักของแบรนด์</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" disabled={readOnly} value={form.primary_color || '#f97316'} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: readOnly ? 'default' : 'pointer' }} />
            <input style={{ ...inputStyle, flex: 1 }} value={form.primary_color} disabled={readOnly} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} placeholder="#f97316" />
          </div>
        </div>
      </div>
      {form.logo_url && (
        <div style={{ marginTop: 12 }}>
          <label style={fieldLabel}>ตัวอย่างโลโก้</label>
          <img src={form.logo_url} alt="logo" style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain', borderRadius: 6, border: '1px solid #f1f5f9', padding: 4, background: '#fff' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      {!readOnly && (
        <button onClick={() => mut.mutate()} disabled={!form.name.trim() || mut.isPending}
          style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.5 }}>
          {mut.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      )}
    </div>
  )
}

// ── นโยบายการลา ────────────────────────────────────────────────────────────
function LeavePolicyTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const { data } = useQuery<TenantSettings>({ queryKey: ['tenant-settings'], queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data) })
  const [unlimited, setUnlimited] = useState(true)
  const [days, setDays] = useState(3)
  useEffect(() => {
    if (!data) return
    setUnlimited(data.leave_backdate_days == null)
    setDays(data.leave_backdate_days ?? 3)
  }, [data])

  const mut = useMutation({
    mutationFn: () => api.patch('/api/v1/admin/tenant-settings', { leave_backdate_days: unlimited ? null : Math.max(0, days) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); showToast('success', 'บันทึกนโยบายการลาแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0e7490', flexShrink: 0 }}><CalendarClock size={18} /></div>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>การยื่นลาย้อนหลัง</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            จำกัดว่าพนักงานยื่นลาผ่าน LINE ย้อนหลังได้ไม่เกินกี่วัน — <strong>แอดมินลงวันลาแทนพนักงานได้ไม่จำกัด</strong> (ลาป่วย/ลาคลอดก็ไม่ติดข้อจำกัดนี้ทางฝั่งพนักงานถ้าตั้งไว้)
          </p>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#374151', cursor: readOnly ? 'default' : 'pointer', marginBottom: 10 }}>
        <input type="checkbox" checked={unlimited} disabled={readOnly} onChange={e => setUnlimited(e.target.checked)} /> ไม่จำกัด (ยื่นย้อนหลังได้เท่าไหร่ก็ได้)
      </label>
      {!unlimited && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#374151' }}>
          ย้อนหลังได้ไม่เกิน
          <input type="number" min={0} max={90} value={days} disabled={readOnly} onChange={e => setDays(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ ...inputStyle, width: 72, textAlign: 'center' }} />
          วัน <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(0 = ยื่นได้เฉพาะวันนี้เป็นต้นไป)</span>
        </div>
      )}
      {!readOnly && (
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          {mut.isPending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      )}
    </div>
  )
}

// ── ทางลัดไปตั้งค่าที่อยู่ที่อื่น ──────────────────────────────────────────────
function ShortcutCard() {
  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ตั้งค่าที่อยู่ที่อื่น</p>
      {[
        { icon: <Clock size={16} />, label: 'เกณฑ์การสาย & ค่าปรับ · รัศมีเช็คอิน GPS', desc: 'ตั้งแยกทีละกะ', to: '/shift' },
        { icon: <Users size={16} />, label: 'สถานะพนักงาน (ประจำ/ชั่วคราว) + โควต้าวันหยุด', desc: 'พนักงาน → ผังองค์กร → สถานะพนักงาน', to: '/org-structure' },
      ].map((s, i) => (
        <Link key={i} to={s.to} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f9fafb', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{s.desc}</p>
          </div>
          <span style={{ color: '#9ca3af' }}>→</span>
        </Link>
      ))}
    </div>
  )
}

type SettingsTab = 'general' | 'users' | 'leave' | 'plan'
const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'ทั่วไป' },
  { key: 'users',   label: 'ผู้ใช้งาน' },
  { key: 'leave',   label: 'นโยบายการลา' },
  { key: 'plan',    label: 'แพ็กเกจ' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>การตั้งค่า</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>ข้อมูลบริษัท ผู้ใช้งานเว็บ และนโยบายที่ใช้ทั้งบริษัท</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              color: tab === t.key ? '#c2410c' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.key ? '#f97316' : 'transparent'}`, marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <><CompanyProfileTab /><ShortcutCard /></>}
      {tab === 'users' && <><SelfPasswordCard /><UserManagementSettings /></>}
      {tab === 'leave' && <LeavePolicyTab />}
      {tab === 'plan' && (
        <div style={{ ...card, padding: 20 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>แพ็กเกจ & การใช้งาน</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>ต้องการขยายขีดจำกัด ติดต่อผู้ดูแลระบบ (Super Admin)</p>
          <PlanUsageRow />
        </div>
      )}
    </div>
  )
}
