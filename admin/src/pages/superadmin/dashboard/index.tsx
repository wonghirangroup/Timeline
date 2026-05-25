// admin/src/pages/superadmin/dashboard/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_TENANTS } from '../../../lib/mock'
import type { TenantStatus, TenantPlan } from '../../../types'

const STATUS_CFG: Record<TenantStatus, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE:    { label: 'ใช้งาน',  color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
  SUSPENDED: { label: 'ระงับ',   color: '#dc2626', bg: '#fee2e2', dot: '#dc2626' },
  TRIAL:     { label: 'ทดลองใช้',color: '#d97706', bg: '#fef3c7', dot: '#d97706' },
}

const PLAN_CFG: Record<TenantPlan, { label: string; color: string; bg: string }> = {
  STARTER:      { label: 'Starter',      color: '#374151', bg: '#f3f4f6' },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe' },
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) { const d = new Date(s); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` }

const RECENT_ACTIVITY = [
  { time: '10:32', msg: 'ร้านกาแฟดอยตุง สาขาโคราช ลงทะเบียนระบบใหม่', type: 'new' },
  { time: '09:15', msg: 'โรงแรมพักดีมีสุข เริ่มทดลองใช้ระบบ (Trial)', type: 'trial' },
  { time: '08:47', msg: 'วงษ์หิรัญ กรุ๊ป ต่ออายุ Plan Enterprise', type: 'renew' },
  { time: 'เมื่อวาน', msg: 'บริษัทก่อสร้างนครราชสีมา จำกัด ถูกระงับการใช้งาน', type: 'suspend' },
  { time: 'เมื่อวาน', msg: 'ห้างสรรพสินค้าสยามโคราช เพิ่มสาขาใหม่ 1 สาขา', type: 'update' },
]

const ACTIVITY_CFG: Record<string, { icon: string; color: string }> = {
  new:     { icon: '🆕', color: '#16a34a' },
  trial:   { icon: '🔬', color: '#d97706' },
  renew:   { icon: '♻️', color: '#2563eb' },
  suspend: { icon: '🚫', color: '#dc2626' },
  update:  { icon: '📝', color: '#6b7280' },
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('')

  const totalEmployees = MOCK_TENANTS.reduce((s, t) => s + t.employee_count, 0)
  const activeTenants  = MOCK_TENANTS.filter(t => t.status === 'ACTIVE').length
  const trialTenants   = MOCK_TENANTS.filter(t => t.status === 'TRIAL').length
  const lineConfigured = MOCK_TENANTS.filter(t => t.line_configured).length

  const filtered = MOCK_TENANTS.filter(t => !statusFilter || t.status === statusFilter)

  return (
    <div>
      {/* Alert for expiring trials */}
      {trialTenants > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
            มี <strong>{trialTenants} Tenant</strong> ที่อยู่ในช่วงทดลองใช้ — ควรติดตามเพื่อปิดการขาย
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Tenant ทั้งหมด',       value: MOCK_TENANTS.length, unit: 'บริษัท', color: '#4f46e5', bg: '#ede9fe', icon: '🏗' },
          { label: 'ใช้งานอยู่',            value: activeTenants,       unit: 'Tenant', color: '#16a34a', bg: '#dcfce7', icon: '✅' },
          { label: 'พนักงานรวมทุก Tenant', value: totalEmployees,       unit: 'คน',    color: '#2563eb', bg: '#dbeafe', icon: '👥' },
          { label: 'Line OA ตั้งค่าแล้ว',  value: lineConfigured,       unit: 'Tenant', color: '#f97316', bg: '#fff7ed', icon: '💚' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
              <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: 6, color: '#6b7280' }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Tenant Table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>รายการ Tenant</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
                <option value="">ทุกสถานะ</option>
                <option value="ACTIVE">ใช้งาน</option>
                <option value="TRIAL">ทดลองใช้</option>
                <option value="SUSPENDED">ระงับ</option>
              </select>
              <button onClick={() => navigate('/superadmin/tenants')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                จัดการทั้งหมด →
              </button>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#ede9fe' }}>
                  {['บริษัท / ผู้ดูแล', 'Plan', 'สาขา', 'พนักงาน', 'Line OA', 'สถานะ', 'หมดอายุ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#4338ca', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const sc = STATUS_CFG[t.status]
                  const pc = PLAN_CFG[t.plan]
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                      onClick={() => navigate('/superadmin/tenants')}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.owner_email}</div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{pc.label}</span>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 600 }}>{t.branch_count}</td>
                      <td style={{ padding: '11px 14px', color: '#374151', fontWeight: 600 }}>{t.employee_count}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {t.line_configured
                          ? <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.82rem' }}>✓ ตั้งค่าแล้ว</span>
                          : <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>— ยังไม่ตั้งค่า</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {t.expires_at ? thDate(t.expires_at) : <span style={{ color: '#16a34a' }}>ไม่หมดอายุ</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Plan breakdown */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700 }}>📊 แบ่งตาม Plan</h3>
            {(['ENTERPRISE','PROFESSIONAL','STARTER'] as const).map(plan => {
              const count = MOCK_TENANTS.filter(t => t.plan === plan).length
              const pct = Math.round((count / MOCK_TENANTS.length) * 100)
              const pc = PLAN_CFG[plan]
              return (
                <div key={plan} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: pc.color }}>{pc.label}</span>
                    <span style={{ color: '#374151', fontWeight: 700 }}>{count} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#f3f4f6' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pc.color, borderRadius: 99 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent Activity */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700 }}>🕑 กิจกรรมล่าสุด</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RECENT_ACTIVITY.map((a, i) => {
                const cfg = ACTIVITY_CFG[a.type]
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.4 }}>{a.msg}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>{a.time}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
