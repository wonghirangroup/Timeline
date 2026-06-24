import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/axios'

type Status = 'active' | 'suspended' | 'trial'
type PlanKey = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'

interface Tenant {
  id: string; name: string; plan: PlanKey; is_active: boolean; created_at: string
  _count: { employees: number; branches: number }
  line_config: { line_channel_id: string; line_liff_id: string } | null
  users: { email: string; first_name: string; last_name: string }[]
}

interface TenantUI {
  id: string; abbr: string; name: string; email: string
  plan: PlanKey; employees: number; branches: number
  status: Status; lineConfigured: boolean; joined: string
}

const PLAN_LABEL: Record<PlanKey, string> = { FREE: 'Free', STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise' }

const planStyle: Record<PlanKey, { bg: string; color: string }> = {
  FREE:       { bg: '#f8fafc', color: '#64748b' },
  STARTER:    { bg: '#f1f5f9', color: '#475569' },
  PRO:        { bg: '#dbeafe', color: '#1d4ed8' },
  ENTERPRISE: { bg: '#ede9fe', color: '#6d28d9' },
}

const statusConfig: Record<Status, { dot: string; text: string; bg: string; label: string }> = {
  active:    { dot: '#10b981', text: '#065f46', bg: '#d1fae530', label: 'Active' },
  suspended: { dot: '#f43f5e', text: '#9f1239', bg: '#fee2e230', label: 'Suspended' },
  trial:     { dot: '#f59e0b', text: '#92400e', bg: '#fef3c730', label: 'Trial' },
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden',
}

function abbrOf(name: string) {
  return name.replace(/บริษัท|จำกัด|ห้างหุ้นส่วน|อินดัสทรี|\s/g, '').slice(0, 2) || name.slice(0, 2)
}

function formatThaiDate(dateStr: string) {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const d = new Date(dateStr)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

function toUI(t: Tenant): TenantUI {
  return {
    id: t.id, abbr: abbrOf(t.name), name: t.name,
    email: t.users[0]?.email ?? '-',
    plan: t.plan,
    employees: t._count.employees, branches: t._count.branches,
    status: t.is_active ? 'active' : 'suspended',
    lineConfigured: !!t.line_config,
    joined: formatThaiDate(t.created_at),
  }
}

function AddModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', admin_email: '', admin_password: '',
    admin_first_name: '', admin_last_name: '', plan: 'STARTER' as PlanKey,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post('/super-admin/tenants', form),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err: any) => setError(err.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด'),
  })

  const fields = [
    { key: 'name', label: 'ชื่อบริษัท *', type: 'text', placeholder: 'บริษัท ตัวอย่าง จำกัด' },
    { key: 'admin_email', label: 'อีเมล Admin *', type: 'email', placeholder: 'admin@company.co.th' },
    { key: 'admin_password', label: 'รหัสผ่าน Admin *', type: 'password', placeholder: '••••••••' },
    { key: 'admin_first_name', label: 'ชื่อ Admin *', type: 'text', placeholder: 'ชื่อ' },
    { key: 'admin_last_name', label: 'นามสกุล Admin *', type: 'text', placeholder: 'นามสกุล' },
  ] as const

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '460px', margin: '0 16px', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>เพิ่ม Tenant ใหม่</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>กรอกข้อมูลบริษัทลูกค้าและ Admin</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fields.map(f => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
              {f.label}
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
              />
            </label>
          ))}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
            แผนการใช้งาน
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {(['STARTER', 'PRO', 'ENTERPRISE'] as PlanKey[]).map(p => (
                <button key={p} type="button" onClick={() => setForm({ ...form, plan: p })}
                  style={{ padding: '7px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${form.plan === p ? planStyle[p].color : '#e2e8f0'}`, background: form.plan === p ? planStyle[p].bg : 'white', color: form.plan === p ? planStyle[p].color : '#64748b' }}>
                  {PLAN_LABEL[p]}
                </button>
              ))}
            </div>
          </label>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fff1f2', border: '1px solid #fecdd3', fontSize: '12px', color: '#be123c' }}>{error}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '0 20px 16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 500, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>ยกเลิก</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', cursor: mutation.isPending ? 'not-allowed' : 'pointer', color: 'white', opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? 'กำลังสร้าง...' : 'สร้าง Tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TenantsPage() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState<'all' | Status>('all')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading, isError } = useQuery<Tenant[]>({
    queryKey: ['super-admin', 'tenants'],
    queryFn: () => api.get('/super-admin/tenants').then(r => r.data.data),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/super-admin/tenants/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin', 'tenants'] }),
  })

  const tenants: TenantUI[] = (data ?? []).map(toUI)
  const filtered = tenants.filter(t => {
    const q = search.toLowerCase()
    return (t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) &&
      (filterStatus === 'all' || t.status === filterStatus)
  })

  const tabs = [
    { key: 'all' as const,       label: 'ทั้งหมด',   count: tenants.length },
    { key: 'active' as const,    label: 'Active',     count: tenants.filter(t => t.status === 'active').length },
    { key: 'suspended' as const, label: 'Suspended',  count: tenants.filter(t => t.status === 'suspended').length },
  ]

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Tenants</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>บริษัทลูกค้าที่ใช้งาน Platform ทั้งหมด</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          เพิ่ม Tenant
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อบริษัท หรืออีเมล..."
            style={{ paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', fontSize: '13px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '240px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
        </div>
        <div style={{ display: 'flex', background: 'white', borderRadius: '8px', padding: '3px', gap: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid rgba(15,23,42,0.06)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filterStatus === tab.key ? '#6366f1' : 'transparent', color: filterStatus === tab.key ? 'white' : '#64748b' }}>
              {tab.label}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '99px', background: filterStatus === tab.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: filterStatus === tab.key ? 'white' : '#94a3b8' }}>{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>กำลังโหลด...</div>
        ) : isError ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#f43f5e', fontSize: '13px' }}>โหลดข้อมูลไม่สำเร็จ กรุณา refresh</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['บริษัท', 'แผน', 'พนักงาน / สาขา', 'Line OA', 'สถานะ', 'เริ่มใช้', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ไม่พบ tenant ที่ค้นหา</td></tr>
              ) : filtered.map((t, i) => {
                const sc = statusConfig[t.status]
                const pl = planStyle[t.plan]
                return (
                  <tr key={t.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f8fafc', background: 'white' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: pl.bg, color: pl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>{t.abbr}</div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>{t.name}</p>
                          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: pl.bg, color: pl.color }}>{PLAN_LABEL[t.plan]}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#374151', margin: 0 }}>{t.employees.toLocaleString()} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '11px' }}>คน</span></p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.branches} สาขา</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {t.lineConfigured ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#059669' }}>
                          <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          ตั้งค่าแล้ว
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#d97706' }}>
                          <svg width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          ยังไม่ตั้งค่า
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: sc.bg, color: sc.text }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>{t.joined}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => toggleMutation.mutate({ id: t.id, is_active: t.status === 'suspended' })}
                        disabled={toggleMutation.isPending}
                        style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, border: 'none', borderRadius: '6px', cursor: 'pointer', background: t.status === 'active' ? '#fff1f2' : '#d1fae5', color: t.status === 'active' ? '#be123c' : '#065f46' }}>
                        {t.status === 'active' ? 'ระงับ' : 'เปิดใช้'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!isLoading && !isError && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f8fafc', background: '#fafafa', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
            <span>แสดง <strong style={{ color: '#64748b' }}>{filtered.length}</strong> จาก {tenants.length} tenants</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {tenants.filter(t => t.status === 'active').length} active
            </span>
          </div>
        )}
      </div>

      {showModal && (
        <AddModal
          onClose={() => setShowModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['super-admin', 'tenants'] })}
        />
      )}
    </div>
  )
}
