// admin/src/pages/superadmin/tenants/index.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../lib/axios'

type Plan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

interface ApiTenant {
  id: string
  name: string
  plan: Plan
  max_employees: number
  max_branches: number
  is_active: boolean
  created_at: string
  _count: { employees: number; branches: number }
  line_config: { line_channel_id: string; line_liff_id: string } | null
  users: { email: string; first_name: string; last_name: string }[]
}

const PLAN_CFG: Record<Plan, { label: string; color: string; bg: string; price: string }> = {
  FREE:       { label: 'Free',         color: '#374151', bg: '#f3f4f6', price: 'ฟรี' },
  STARTER:    { label: 'Starter',      color: '#374151', bg: '#f3f4f6', price: '990 ฿/เดือน' },
  PRO:        { label: 'Pro',          color: '#2563eb', bg: '#dbeafe', price: '2,490 ฿/เดือน' },
  ENTERPRISE: { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe', price: 'Custom' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) {
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

const EMPTY_FORM = {
  name: '',
  admin_first_name: '',
  admin_last_name: '',
  admin_email: '',
  admin_password: '',
  plan: 'STARTER' as Plan,
  max_employees: 50,
  max_branches: 5,
}

const EMPTY_EDIT = {
  name: '',
  plan: 'STARTER' as Plan,
  max_employees: 50,
  max_branches: 5,
}

export default function TenantsPage() {
  const navigate = useNavigate()

  const [tenants, setTenants]     = useState<ApiTenant[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')

  // Create modal
  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm]   = useState(EMPTY_FORM)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError]     = useState<string | null>(null)
  const [showPassword, setShowPassword]   = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<ApiTenant | null>(null)
  const [editForm, setEditForm]     = useState(EMPTY_EDIT)
  const [editLoading, setEditLoading] = useState(false)

  // Confirm modals
  const [suspendTarget, setSuspendTarget] = useState<ApiTenant | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<ApiTenant | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Line OA modal (local only for now)
  const [lineModal, setLineModal]   = useState<ApiTenant | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreateModal(false); setEditTarget(null); setSuspendTarget(null); setDeleteTarget(null); setLineModal(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const [lineForm, setLineForm]     = useState({ line_channel_id: '', line_channel_secret: '', liff_id: '' })
  const [showSecret, setShowSecret] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')

  async function loadTenants() {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/v1/super-admin/tenants')
      setTenants(res.data.data ?? [])
    } catch (e: any) {
      setError(e.response?.data?.error?.message ?? 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTenants() }, [])

  const filtered = tenants.filter(t => {
    if (activeFilter === 'ACTIVE'    && !t.is_active) return false
    if (activeFilter === 'SUSPENDED' &&  t.is_active) return false
    if (search) {
      const admin = t.users[0]
      const hay = `${t.name} ${admin?.first_name ?? ''} ${admin?.last_name ?? ''} ${admin?.email ?? ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  // ── Create tenant ────────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.name || !createForm.admin_email || !createForm.admin_password || !createForm.admin_first_name || !createForm.admin_last_name) {
      setCreateError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    try {
      await api.post('/api/v1/super-admin/tenants', {
        name:             createForm.name,
        plan:             createForm.plan,
        max_employees:    createForm.max_employees,
        max_branches:     createForm.max_branches,
        admin_email:      createForm.admin_email,
        admin_password:   createForm.admin_password,
        admin_first_name: createForm.admin_first_name,
        admin_last_name:  createForm.admin_last_name,
      })
      setCreateModal(false)
      setCreateForm(EMPTY_FORM)
      await loadTenants()
    } catch (e: any) {
      setCreateError(e.response?.data?.error?.message ?? 'สร้าง Tenant ไม่สำเร็จ')
    } finally {
      setCreateLoading(false)
    }
  }

  // ── Edit tenant ──────────────────────────────────────────────────
  function openEdit(t: ApiTenant) {
    setEditTarget(t)
    setEditForm({ name: t.name, plan: t.plan, max_employees: t.max_employees, max_branches: t.max_branches })
  }
  async function handleEdit() {
    if (!editTarget) return
    setEditLoading(true)
    try {
      await api.patch(`/api/v1/super-admin/tenants/${editTarget.id}`, editForm)
      setEditTarget(null)
      await loadTenants()
    } catch {
      // error silently for now
    } finally {
      setEditLoading(false)
    }
  }

  // ── Suspend / Activate ───────────────────────────────────────────
  async function handleSuspend() {
    if (!suspendTarget) return
    setActionLoading(true)
    try {
      await api.patch(`/api/v1/super-admin/tenants/${suspendTarget.id}`, { is_active: !suspendTarget.is_active })
      setSuspendTarget(null)
      await loadTenants()
    } catch {
      // error silently
    } finally {
      setActionLoading(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await api.delete(`/api/v1/super-admin/tenants/${deleteTarget.id}`)
      setDeleteTarget(null)
      await loadTenants()
    } catch {
      // error silently
    } finally {
      setActionLoading(false)
    }
  }

  const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }
  const labelSt: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>🏗 จัดการ Tenant ทั้งหมด</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>เพิ่ม / แก้ไข / ระงับ บริษัทลูกค้า และตั้งค่า Line OA</p>
        </div>
        <button onClick={() => { setCreateModal(true); setCreateError(null) }}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
          + เพิ่ม Tenant ใหม่
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อบริษัท / ผู้ดูแล / อีเมล..."
          style={{ ...inputSt, width: 280 }} />
        {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${activeFilter === f ? '#4f46e5' : '#d1d5db'}`, cursor: 'pointer', background: activeFilter === f ? '#ede9fe' : '#fff', color: activeFilter === f ? '#4f46e5' : '#374151', fontSize: '0.82rem', fontWeight: activeFilter === f ? 700 : 400 }}>
            {f === 'ALL' ? 'ทั้งหมด' : f === 'ACTIVE' ? '✓ ใช้งาน' : '⏸ ระงับ'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#6b7280' }}>
          แสดง {filtered.length} / {tenants.length} Tenant
        </div>
      </div>

      {/* Error / Loading */}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#ede9fe' }}>
                {['บริษัท / Admin', 'Plan / Limits', 'สาขา', 'พนักงาน', 'Line OA', 'สร้างเมื่อ', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#4338ca', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่พบ Tenant</td></tr>
              )}
              {!loading && filtered.map((t, i) => {
                const admin = t.users[0]
                const pc = PLAN_CFG[t.plan] ?? PLAN_CFG.FREE
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                        onClick={() => navigate(`/superadmin/tenants/${t.id}`)}>
                        {t.name}
                      </div>
                      {admin
                        ? <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{admin.first_name} {admin.last_name} · {admin.email}</div>
                        : <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>ยังไม่มี Admin</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '2px 9px', fontSize: '0.75rem', fontWeight: 700 }}>{pc.label}</span>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 3 }}>
                        สูงสุด {t.max_employees} คน / {t.max_branches} สาขา
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>{t._count.branches}</td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>{t._count.employees}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {t.line_config
                        ? <span style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 700 }}>✓ ตั้งค่าแล้ว</span>
                        : <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>— ยังไม่ตั้งค่า</span>}
                      <br />
                      <button onClick={() => { setLineModal(t); setShowSecret(false); setTestResult('idle'); setLineForm({ line_channel_id: t.line_config?.line_channel_id ?? '', line_channel_secret: '', liff_id: t.line_config?.line_liff_id ?? '' }) }}
                        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #4f46e5', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 600, marginTop: 4 }}>
                        {t.line_config ? '⚙ แก้ไข' : '+ ตั้งค่า'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{thDate(t.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: t.is_active ? '#dcfce7' : '#fee2e2', color: t.is_active ? '#16a34a' : '#dc2626', borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {t.is_active ? 'ใช้งาน' : 'ระงับ'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #4f46e5', cursor: 'pointer', background: '#ede9fe', fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>ดู</button>
                        <button onClick={() => openEdit(t)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#374151' }}>✏</button>
                        <button onClick={() => setSuspendTarget(t)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.is_active ? '#f59e0b' : '#16a34a'}`, cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: t.is_active ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                          {t.is_active ? '⏸ ระงับ' : '▶ เปิด'}
                        </button>
                        <button onClick={() => setDeleteTarget(t)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#dc2626' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Tenant Modal ── */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 560, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>+ เพิ่ม Tenant ใหม่</h3>

            {createError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: '0.82rem' }}>
                {createError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>ชื่อบริษัท / Tenant <span style={{ color: '#dc2626' }}>*</span></label>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น บริษัท ABC จำกัด" style={inputSt} />
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', fontSize: '0.82rem', color: '#0369a1' }}>
                <strong>บัญชี Admin</strong> — ระบบจะสร้างผู้ใช้ ADMIN พร้อมกับ Tenant
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>ชื่อ Admin <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={createForm.admin_first_name} onChange={e => setCreateForm(f => ({ ...f, admin_first_name: e.target.value }))}
                    placeholder="ชื่อ" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>นามสกุล Admin <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={createForm.admin_last_name} onChange={e => setCreateForm(f => ({ ...f, admin_last_name: e.target.value }))}
                    placeholder="นามสกุล" style={inputSt} />
                </div>
              </div>

              <div>
                <label style={labelSt}>อีเมล Admin <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="email" value={createForm.admin_email} onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                  placeholder="admin@company.com" style={inputSt} />
              </div>

              <div>
                <label style={labelSt}>รหัสผ่าน Admin <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={createForm.admin_password}
                    onChange={e => setCreateForm(f => ({ ...f, admin_password: e.target.value }))}
                    placeholder="อย่างน้อย 8 ตัวอักษร" style={{ ...inputSt, paddingRight: 44 }} />
                  <button onClick={() => setShowPassword(s => !s)} type="button"
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Plan</label>
                  <select value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value as Plan }))} style={inputSt}>
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter — 990 ฿</option>
                    <option value="PRO">Pro — 2,490 ฿</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={labelSt}>พนักงานสูงสุด</label>
                  <input type="number" value={createForm.max_employees} onChange={e => setCreateForm(f => ({ ...f, max_employees: +e.target.value }))} style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>สาขาสูงสุด</label>
                  <input type="number" value={createForm.max_branches} onChange={e => setCreateForm(f => ({ ...f, max_branches: +e.target.value }))} style={inputSt} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setCreateModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={handleCreate} disabled={createLoading}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: createLoading ? 'not-allowed' : 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, opacity: createLoading ? 0.7 : 1 }}>
                {createLoading ? 'กำลังสร้าง...' : '+ สร้าง Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ── */}
      {editTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 460, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>✏ แก้ไข Tenant</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>ชื่อบริษัท</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputSt} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Plan</label>
                  <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value as Plan }))} style={inputSt}>
                    <option value="FREE">Free</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={labelSt}>พนักงานสูงสุด</label>
                  <input type="number" value={editForm.max_employees} onChange={e => setEditForm(f => ({ ...f, max_employees: +e.target.value }))} style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>สาขาสูงสุด</label>
                  <input type="number" value={editForm.max_branches} onChange={e => setEditForm(f => ({ ...f, max_branches: +e.target.value }))} style={inputSt} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setEditTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={handleEdit} disabled={editLoading}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, opacity: editLoading ? 0.7 : 1 }}>
                {editLoading ? 'กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend Confirm ── */}
      {suspendTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400 }}>
            <h3 style={{ margin: '0 0 10px', fontWeight: 700 }}>
              {suspendTarget.is_active ? '⏸ ระงับ Tenant' : '▶ เปิดใช้งาน Tenant'}
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.875rem' }}><strong>{suspendTarget.name}</strong></p>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
              {suspendTarget.is_active
                ? 'พนักงานทั้งหมดจะไม่สามารถเช็คอินหรือใช้งานระบบได้ทันที'
                : 'พนักงานจะสามารถเช็คอินและใช้งานระบบได้อีกครั้ง'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setSuspendTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={handleSuspend} disabled={actionLoading}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: suspendTarget.is_active ? '#f59e0b' : '#f97316', color: '#fff', fontWeight: 700 }}>
                {actionLoading ? '...' : suspendTarget.is_active ? '⏸ ยืนยันระงับ' : '▶ เปิดใช้งาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400 }}>
            <h3 style={{ margin: '0 0 10px', fontWeight: 700, color: '#dc2626' }}>🗑 ลบ Tenant</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.875rem' }}><strong>{deleteTarget.name}</strong></p>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#dc2626', marginBottom: 20 }}>
              ⚠️ Soft delete — ข้อมูลจะถูกซ่อน ไม่ได้ลบจริงจาก Database
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={handleDelete} disabled={actionLoading}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700 }}>
                {actionLoading ? '...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Line OA Modal (local state for now) ── */}
      {lineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 520, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.4rem' }}>💚</span>
              <h3 style={{ margin: 0, fontWeight: 700 }}>ตั้งค่า Line OA</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>{lineModal.name}</p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8rem', color: '#15803d', lineHeight: 1.7 }}>
              <strong>Webhook URL:</strong><br />
              <code style={{ fontSize: '0.75rem' }}>{`https://api.timeline.app/api/v1/line/webhook/${lineModal.id}`}</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>Line Channel ID</label>
                <input value={lineForm.line_channel_id} onChange={e => setLineForm(f => ({ ...f, line_channel_id: e.target.value }))} placeholder="เช่น 2006123456" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Line Channel Secret</label>
                <div style={{ position: 'relative' }}>
                  <input type={showSecret ? 'text' : 'password'} value={lineForm.line_channel_secret}
                    onChange={e => setLineForm(f => ({ ...f, line_channel_secret: e.target.value }))} style={{ ...inputSt, paddingRight: 44 }} />
                  <button onClick={() => setShowSecret(s => !s)} type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>{showSecret ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div>
                <label style={labelSt}>LIFF ID</label>
                <input value={lineForm.liff_id} onChange={e => setLineForm(f => ({ ...f, liff_id: e.target.value }))} placeholder="เช่น 2006123456-AbCdEfGh" style={inputSt} />
              </div>
              {testResult !== 'idle' && (
                <div style={{ background: testResult === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult === 'ok' ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: testResult === 'ok' ? '#15803d' : '#dc2626' }}>
                  {testResult === 'ok' ? '✓ เชื่อมต่อสำเร็จ' : '✕ เชื่อมต่อไม่ได้ — ตรวจสอบ Channel ID และ Secret'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 22 }}>
              <button onClick={() => { setTestResult('idle'); setTimeout(() => setTestResult(lineForm.line_channel_id && lineForm.line_channel_secret ? 'ok' : 'fail'), 1200) }}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #4f46e5', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontWeight: 600 }}>🔌 Test</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setLineModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ปิด</button>
                <button onClick={() => setLineModal(null)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700 }}>💾 บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
