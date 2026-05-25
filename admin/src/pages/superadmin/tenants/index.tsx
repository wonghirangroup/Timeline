// admin/src/pages/superadmin/tenants/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_TENANTS, MOCK_LINE_CONFIGS } from '../../../lib/mock'
import type { Tenant, TenantStatus, TenantPlan, TenantLineConfig } from '../../../types'

const STATUS_CFG: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'ใช้งาน',   color: '#16a34a', bg: '#dcfce7' },
  SUSPENDED: { label: 'ระงับ',    color: '#dc2626', bg: '#fee2e2' },
  TRIAL:     { label: 'ทดลองใช้', color: '#d97706', bg: '#fef3c7' },
}

const PLAN_CFG: Record<TenantPlan, { label: string; color: string; bg: string; price: string }> = {
  STARTER:      { label: 'Starter',      color: '#374151', bg: '#f3f4f6', price: '990 ฿/เดือน'  },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe', price: '2,490 ฿/เดือน' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe', price: 'Custom'          },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) { const d = new Date(s); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` }

const EMPTY_TENANT: Omit<Tenant, 'id' | 'branch_count' | 'employee_count' | 'line_configured'> = {
  name: '', owner_name: '', owner_email: '', plan: 'STARTER', status: 'TRIAL', created_at: '2026-05-18', expires_at: '2026-06-18',
}

const EMPTY_LINE_CFG: Omit<TenantLineConfig, 'tenant_id' | 'webhook_url' | 'verified'> = {
  line_channel_id: '', line_channel_secret: '', liff_id: '',
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS)
  const [lineConfigs, setLineConfigs] = useState<TenantLineConfig[]>(MOCK_LINE_CONFIGS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('')
  const [planFilter, setPlanFilter] = useState<TenantPlan | ''>('')

  // Tenant modal
  const [tenantModal, setTenantModal] = useState<{ mode: 'add' | 'edit'; data: Tenant | null } | null>(null)
  const [tenantForm, setTenantForm] = useState<Omit<Tenant, 'id' | 'branch_count' | 'employee_count' | 'line_configured'>>(EMPTY_TENANT)

  // Line config modal
  const [lineModal, setLineModal] = useState<Tenant | null>(null)
  const [lineForm, setLineForm] = useState<Omit<TenantLineConfig, 'tenant_id' | 'webhook_url' | 'verified'>>(EMPTY_LINE_CFG)
  const [showSecret, setShowSecret] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [lineSaved, setLineSaved] = useState(false)

  // Suspend confirm
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [detailModal, setDetailModal] = useState<Tenant | null>(null)

  const filtered = tenants.filter(t =>
    (!statusFilter || t.status === statusFilter) &&
    (!planFilter   || t.plan   === planFilter) &&
    (!search       || t.name.includes(search) || t.owner_name.includes(search) || t.owner_email.includes(search))
  )

  // Tenant CRUD
  function openAdd() {
    setTenantForm(EMPTY_TENANT)
    setTenantModal({ mode: 'add', data: null })
  }
  function openEdit(t: Tenant) {
    setTenantForm({ name: t.name, owner_name: t.owner_name, owner_email: t.owner_email, plan: t.plan, status: t.status, created_at: t.created_at, expires_at: t.expires_at })
    setTenantModal({ mode: 'edit', data: t })
  }
  function saveTenant() {
    if (tenantModal?.mode === 'add') {
      const nt: Tenant = { ...tenantForm, id: `tn-${Date.now()}`, branch_count: 0, employee_count: 0, line_configured: false }
      setTenants(prev => [nt, ...prev])
    } else if (tenantModal?.data) {
      setTenants(prev => prev.map(t => t.id === tenantModal.data!.id ? { ...t, ...tenantForm } : t))
    }
    setTenantModal(null)
  }

  function toggleSuspend() {
    if (!suspendTarget) return
    setTenants(prev => prev.map(t => t.id === suspendTarget.id ? { ...t, status: t.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' } : t))
    setSuspendTarget(null)
  }
  function confirmDelete() {
    if (!deleteTarget) return
    setTenants(prev => prev.filter(t => t.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // Line OA modal
  function openLineModal(t: Tenant) {
    setLineModal(t)
    setShowSecret(false)
    setTestResult('idle')
    setLineSaved(false)
    const existing = lineConfigs.find(c => c.tenant_id === t.id)
    setLineForm(existing ? { line_channel_id: existing.line_channel_id, line_channel_secret: existing.line_channel_secret, liff_id: existing.liff_id } : EMPTY_LINE_CFG)
  }
  function saveLineConfig() {
    if (!lineModal) return
    const webhookUrl = `https://api.timeline.app/api/v1/line/webhook/${lineModal.id}`
    const existing = lineConfigs.find(c => c.tenant_id === lineModal.id)
    if (existing) {
      setLineConfigs(prev => prev.map(c => c.tenant_id === lineModal.id ? { ...c, ...lineForm, verified: false } : c))
    } else {
      setLineConfigs(prev => [...prev, { tenant_id: lineModal.id, ...lineForm, webhook_url: webhookUrl, verified: false }])
    }
    setTenants(prev => prev.map(t => t.id === lineModal.id ? { ...t, line_configured: true } : t))
    setLineSaved(true)
    setTimeout(() => { setLineSaved(false); setLineModal(null) }, 1500)
  }
  function testConnection() {
    setTestResult('idle')
    setTimeout(() => setTestResult(lineForm.line_channel_id && lineForm.line_channel_secret ? 'ok' : 'fail'), 1200)
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
        <button onClick={openAdd} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          + เพิ่ม Tenant ใหม่
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อบริษัท / ผู้ดูแล..." style={{ ...inputSt, width: 260 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ ...inputSt, width: 'auto' }}>
          <option value="">ทุกสถานะ</option>
          <option value="ACTIVE">ใช้งาน</option>
          <option value="TRIAL">ทดลองใช้</option>
          <option value="SUSPENDED">ระงับ</option>
        </select>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value as any)} style={{ ...inputSt, width: 'auto' }}>
          <option value="">ทุก Plan</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          แสดง {filtered.length} / {tenants.length} Tenant
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#ede9fe' }}>
                {['บริษัท / ผู้ดูแล', 'Plan', 'สาขา', 'พนักงาน', 'Line OA', 'สร้างเมื่อ', 'หมดอายุ', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#4338ca', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const sc = STATUS_CFG[t.status]
                const pc = PLAN_CFG[t.plan]
                const lineConfig = lineConfigs.find(c => c.tenant_id === t.id)
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }} onClick={() => navigate(`/superadmin/tenants/${t.id}`)}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.owner_name} · {t.owner_email}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '2px 9px', fontSize: '0.75rem', fontWeight: 700, width: 'fit-content' }}>{pc.label}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{pc.price}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>{t.branch_count}</td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontWeight: 600, textAlign: 'center' }}>{t.employee_count}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {t.line_configured
                          ? <span style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 700 }}>✓ ตั้งค่าแล้ว{lineConfig?.verified ? ' · ยืนยันแล้ว' : ''}</span>
                          : <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>— ยังไม่ตั้งค่า</span>}
                        <button onClick={() => openLineModal(t)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #4f46e5', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 600, width: 'fit-content' }}>
                          {t.line_configured ? '⚙ แก้ไข' : '+ ตั้งค่า'}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{thDate(t.created_at)}</td>
                    <td style={{ padding: '12px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {t.expires_at
                        ? <span style={{ color: new Date(t.expires_at) < new Date() ? '#dc2626' : '#374151' }}>{thDate(t.expires_at)}</span>
                        : <span style={{ color: '#16a34a', fontWeight: 600 }}>ไม่หมดอายุ</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/superadmin/tenants/${t.id}`)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #4f46e5', cursor: 'pointer', background: '#ede9fe', fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>ดู</button>
                        <button onClick={() => openEdit(t)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#374151' }}>✏</button>
                        <button onClick={() => setSuspendTarget(t)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.status === 'SUSPENDED' ? '#16a34a' : '#f59e0b'}`, cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: t.status === 'SUSPENDED' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                          {t.status === 'SUSPENDED' ? '▶ เปิด' : '⏸ ระงับ'}
                        </button>
                        <button onClick={() => setDeleteTarget(t)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', cursor: 'pointer', background: '#fff', fontSize: '0.75rem', color: '#dc2626' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ไม่พบ Tenant</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Tenant Modal ── */}
      {tenantModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 520, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>{tenantModal.mode === 'add' ? '+ เพิ่ม Tenant ใหม่' : '✏ แก้ไข Tenant'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>ชื่อบริษัท / Tenant</label>
                <input value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น บริษัท ABC จำกัด" style={inputSt} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>ชื่อผู้ดูแลระบบ</label>
                  <input value={tenantForm.owner_name} onChange={e => setTenantForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="ชื่อ-นามสกุล" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>อีเมลผู้ดูแลระบบ</label>
                  <input type="email" value={tenantForm.owner_email} onChange={e => setTenantForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="admin@company.com" style={inputSt} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Plan</label>
                  <select value={tenantForm.plan} onChange={e => setTenantForm(f => ({ ...f, plan: e.target.value as TenantPlan }))} style={inputSt}>
                    <option value="STARTER">Starter — 990 ฿/เดือน</option>
                    <option value="PROFESSIONAL">Professional — 2,490 ฿/เดือน</option>
                    <option value="ENTERPRISE">Enterprise — Custom</option>
                  </select>
                </div>
                <div>
                  <label style={labelSt}>สถานะ</label>
                  <select value={tenantForm.status} onChange={e => setTenantForm(f => ({ ...f, status: e.target.value as TenantStatus }))} style={inputSt}>
                    <option value="TRIAL">ทดลองใช้</option>
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="SUSPENDED">ระงับ</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>วันที่เริ่ม</label>
                  <input type="date" value={tenantForm.created_at} onChange={e => setTenantForm(f => ({ ...f, created_at: e.target.value }))} style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>วันหมดอายุ (ว่างไว้ = ไม่หมด)</label>
                  <input type="date" value={tenantForm.expires_at ?? ''} onChange={e => setTenantForm(f => ({ ...f, expires_at: e.target.value || null }))} style={inputSt} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setTenantModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={saveTenant} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700 }}>
                {tenantModal.mode === 'add' ? '+ สร้าง Tenant' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Line OA Config Modal ── */}
      {lineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 520, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.4rem' }}>💚</span>
              <h3 style={{ margin: 0, fontWeight: 700 }}>ตั้งค่า Line OA</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>{lineModal.name}</p>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8rem', color: '#15803d', lineHeight: 1.7 }}>
              <strong>ขั้นตอน Onboard:</strong><br />
              1. สร้าง Line Official Account ให้ลูกค้า<br />
              2. เพิ่ม Webhook URL ด้านล่างใน Line Developer Console<br />
              3. กรอก Channel ID + Channel Secret + LIFF ID แล้วกด Test Connection
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>Webhook URL (คัดลอกไปใส่ใน Line Console)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={`https://api.timeline.app/api/v1/line/webhook/${lineModal.id}`} style={{ ...inputSt, flex: 1, background: '#f9fafb', color: '#374151', fontSize: '0.8rem' }} />
                  <button onClick={() => navigator.clipboard?.writeText(`https://api.timeline.app/api/v1/line/webhook/${lineModal.id}`)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>📋 คัดลอก</button>
                </div>
              </div>
              <div>
                <label style={labelSt}>Line Channel ID</label>
                <input value={lineForm.line_channel_id} onChange={e => setLineForm(f => ({ ...f, line_channel_id: e.target.value }))} placeholder="เช่น 2006123456" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Line Channel Secret</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={lineForm.line_channel_secret}
                    onChange={e => setLineForm(f => ({ ...f, line_channel_secret: e.target.value }))}
                    placeholder="••••••••••••••••••••••••••••••••"
                    style={{ ...inputSt, paddingRight: 44 }}
                  />
                  <button onClick={() => setShowSecret(s => !s)} type="button" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem' }}>{showSecret ? '🙈' : '👁'}</button>
                </div>
              </div>
              <div>
                <label style={labelSt}>LIFF ID</label>
                <input value={lineForm.liff_id} onChange={e => setLineForm(f => ({ ...f, liff_id: e.target.value }))} placeholder="เช่น 2006123456-AbCdEfGh" style={inputSt} />
              </div>

              {/* Test result */}
              {testResult !== 'idle' && (
                <div style={{ background: testResult === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult === 'ok' ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: testResult === 'ok' ? '#15803d' : '#dc2626' }}>
                  {testResult === 'ok' ? '✓ เชื่อมต่อสำเร็จ — Channel ID ถูกต้อง' : '✕ เชื่อมต่อไม่ได้ — ตรวจสอบ Channel ID และ Secret อีกครั้ง'}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 22 }}>
              <button onClick={testConnection} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #4f46e5', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem' }}>
                🔌 Test Connection
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setLineModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
                <button onClick={saveLineConfig} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: lineSaved ? '#16a34a' : '#4f46e5', color: '#fff', fontWeight: 700, transition: 'background 0.2s' }}>
                  {lineSaved ? '✓ บันทึกแล้ว!' : '💾 บันทึก Line Config'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend/Activate Confirm ── */}
      {suspendTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400 }}>
            <h3 style={{ margin: '0 0 10px', fontWeight: 700 }}>{suspendTarget.status === 'SUSPENDED' ? '▶ เปิดใช้งาน Tenant' : '⏸ ระงับ Tenant'}</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#374151' }}><strong>{suspendTarget.name}</strong></p>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
              {suspendTarget.status === 'SUSPENDED'
                ? 'พนักงานจะสามารถเช็คอินและใช้งานระบบได้อีกครั้ง'
                : 'พนักงานทั้งหมดจะไม่สามารถเช็คอินหรือใช้งานระบบได้ทันที'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setSuspendTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={toggleSuspend} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: suspendTarget.status === 'SUSPENDED' ? '#16a34a' : '#f59e0b', color: '#fff', fontWeight: 700 }}>
                {suspendTarget.status === 'SUSPENDED' ? '▶ เปิดใช้งาน' : '⏸ ยืนยันระงับ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 400 }}>
            <h3 style={{ margin: '0 0 10px', fontWeight: 700, color: '#dc2626' }}>🗑 ลบ Tenant</h3>
            <p style={{ margin: '0 0 8px', fontSize: '0.875rem' }}><strong>{deleteTarget.name}</strong></p>
            <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#6b7280' }}>ข้อมูลที่จะถูกลบ:</p>
            <ul style={{ margin: '0 0 20px', paddingLeft: 20, fontSize: '0.85rem', color: '#6b7280', lineHeight: 2 }}>
              <li>{deleteTarget.branch_count} สาขา, {deleteTarget.employee_count} พนักงาน</li>
              <li>ประวัติการเช็คอิน, วันลา, คำขอ OT ทั้งหมด</li>
              <li>การตั้งค่า Line OA</li>
            </ul>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#dc2626', marginBottom: 20 }}>
              ⚠️ การลบเป็นการ soft delete — ข้อมูลจะถูกซ่อน ไม่ได้ถูกลบจริงจาก Database
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' }}>ยกเลิก</button>
              <button onClick={confirmDelete} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700 }}>ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tenant Detail Modal ── */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 460, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>{detailModal.name}</h3>
                <span style={{ background: STATUS_CFG[detailModal.status].bg, color: STATUS_CFG[detailModal.status].color, borderRadius: 99, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{STATUS_CFG[detailModal.status].label}</span>
              </div>
              <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'ผู้ดูแลระบบ', value: detailModal.owner_name },
                { label: 'อีเมล', value: detailModal.owner_email },
                { label: 'Plan', value: PLAN_CFG[detailModal.plan].label },
                { label: 'Tenant ID', value: detailModal.id },
                { label: 'สาขา', value: `${detailModal.branch_count} สาขา` },
                { label: 'พนักงาน', value: `${detailModal.employee_count} คน` },
                { label: 'สร้างเมื่อ', value: thDate(detailModal.created_at) },
                { label: 'หมดอายุ', value: detailModal.expires_at ? thDate(detailModal.expires_at) : 'ไม่หมดอายุ' },
              ].map(r => (
                <div key={r.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{r.value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, background: detailModal.line_configured ? '#f0fdf4' : '#fef9f0', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: detailModal.line_configured ? '#15803d' : '#92400e', marginBottom: 4 }}>
                💚 Line OA: {detailModal.line_configured ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}
              </div>
              {detailModal.line_configured && (() => {
                const cfg = lineConfigs.find(c => c.tenant_id === detailModal.id)
                return cfg ? <div style={{ fontSize: '0.75rem', color: '#374151' }}>Channel ID: {cfg.line_channel_id} · LIFF: {cfg.liff_id}</div> : null
              })()}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setDetailModal(null); openEdit(detailModal) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontWeight: 600 }}>✏ แก้ไข</button>
              <button onClick={() => { setDetailModal(null); openLineModal(detailModal) }} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 600 }}>💚 Line Config</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
