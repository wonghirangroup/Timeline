// admin/src/pages/superadmin/dashboard/index.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../lib/axios'

// API shape from /api/v1/super-admin/tenants
interface ApiTenant {
  id: string
  name: string
  plan: string          // FREE | STARTER | PRO | ENTERPRISE
  is_active: boolean
  created_at: string
  expires_at?: string | null
  _count: { employees: number; branches: number }
  line_config: { line_channel_id: string; line_liff_id: string } | null
  users: { email: string; first_name: string; last_name: string }[]
}

type DashStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL'

interface DashTenant {
  id: string
  name: string
  plan: string
  status: DashStatus
  employee_count: number
  branch_count: number
  owner_email: string
  line_configured: boolean
  expires_at: string | null
}

function adaptTenant(t: ApiTenant): DashTenant {
  return {
    id: t.id,
    name: t.name,
    plan: t.plan === 'PRO' ? 'PROFESSIONAL' : t.plan,
    status: t.is_active ? 'ACTIVE' : 'SUSPENDED',
    employee_count: t._count.employees,
    branch_count: t._count.branches,
    owner_email: t.users[0]?.email ?? '',
    line_configured: t.line_config !== null,
    expires_at: t.expires_at ?? null,
  }
}

const STATUS_CFG: Record<DashStatus, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE:    { label: 'ใช้งาน',   color: 'var(--success-text)', bg: '#dcfce7', dot: 'var(--success-text)' },
  SUSPENDED: { label: 'ระงับ',    color: 'var(--error-text)', bg: '#fee2e2', dot: 'var(--error-text)' },
  TRIAL:     { label: 'ทดลองใช้', color: 'var(--warning-text)', bg: '#fef3c7', dot: 'var(--warning-text)' },
}

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:         { label: 'Free',         color: 'var(--text-gray)', bg: '#f3f4f6' },
  STARTER:      { label: 'Starter',      color: 'var(--text-body)', bg: '#f3f4f6' },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe' },
}
const PLAN_DISPLAY_ORDER = ['ENTERPRISE', 'PROFESSIONAL', 'STARTER', 'FREE']

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) { const d = new Date(s); return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}` }

const ACTIVITY_CFG: Record<string, { icon: string; color: string }> = {
  new:     { icon: '🆕', color: 'var(--success-text)' },
  trial:   { icon: '🔬', color: 'var(--warning-text)' },
  renew:   { icon: '♻️', color: '#2563eb' },
  suspend: { icon: '🚫', color: 'var(--error-text)' },
  update:  { icon: '📝', color: 'var(--text-gray)' },
}

interface ActivityItem { time: string; msg: string; type: string }

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [tenants, setTenants]       = useState<DashTenant[]>([])
  const [activity, setActivity]     = useState<ActivityItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState<DashStatus | ''>('')

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/super-admin/tenants'),
      api.get('/api/v1/super-admin/activity').catch(() => ({ data: { data: [] } })),
    ]).then(([tenantsRes, activityRes]) => {
      if (Array.isArray(tenantsRes.data?.data)) {
        setTenants(tenantsRes.data.data.map(adaptTenant))
      }
      if (Array.isArray(activityRes.data?.data)) {
        setActivity(activityRes.data.data)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalEmployees = tenants.reduce((s, t) => s + t.employee_count, 0)
  const activeTenants  = tenants.filter(t => t.status === 'ACTIVE').length
  const trialTenants   = tenants.filter(t => t.status === 'TRIAL').length
  const lineConfigured = tenants.filter(t => t.line_configured).length
  const filtered       = tenants.filter(t => !statusFilter || t.status === statusFilter)

  return (
    <div>
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span className="animate-spin" style={{ display: 'inline-block', fontSize: '1.2rem' }}>⟳</span> กำลังโหลด…</div>
      )}

      {!loading && (
        <>
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
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            {[
              { label: 'Tenant ทั้งหมด',       value: tenants.length, unit: 'บริษัท', color: 'var(--sa-accent)', bg: '#ede9fe', icon: '🏗' },
              { label: 'ใช้งานอยู่',            value: activeTenants,  unit: 'Tenant', color: 'var(--success-text)', bg: '#dcfce7', icon: '✅' },
              { label: 'พนักงานรวมทุก Tenant', value: totalEmployees,  unit: 'คน',    color: '#2563eb', bg: '#dbeafe', icon: '👥' },
              { label: 'Line OA ตั้งค่าแล้ว',  value: lineConfigured,  unit: 'Tenant', color: '#f97316', bg: '#fff7ed', icon: '💚' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-gray)', fontWeight: 500 }}>{s.label}</div>
                  <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                  {s.value}
                  <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: 6, color: 'var(--text-gray)' }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
            {/* Tenant Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)' }}>รายการ Tenant</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DashStatus | '')} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
                    <option value="">ทุกสถานะ</option>
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="TRIAL">ทดลองใช้</option>
                    <option value="SUSPENDED">ระงับ</option>
                  </select>
                  <button onClick={() => navigate('/superadmin/tenants')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--sa-accent)', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                    จัดการทั้งหมด →
                  </button>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-subtle)', fontSize: '0.875rem' }}>
                    ไม่พบข้อมูล Tenant
                  </div>
                ) : (
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
                        const pc = PLAN_CFG[t.plan] ?? { label: t.plan, color: 'var(--text-body)', bg: '#f3f4f6' }
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                            onClick={() => navigate('/superadmin/tenants')}
                          >
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.875rem' }}>{t.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{t.owner_email}</div>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{pc.label}</span>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-body)', fontWeight: 600 }}>{t.branch_count}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-body)', fontWeight: 600 }}>{t.employee_count}</td>
                            <td style={{ padding: '11px 14px' }}>
                              {t.line_configured
                                ? <span style={{ color: 'var(--success-text)', fontWeight: 700, fontSize: '0.82rem' }}>✓ ตั้งค่าแล้ว</span>
                                : <span style={{ color: 'var(--text-subtle)', fontSize: '0.82rem' }}>— ยังไม่ตั้งค่า</span>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                                {sc.label}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-gray)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {t.expires_at ? thDate(t.expires_at) : <span style={{ color: 'var(--success-text)' }}>ไม่หมดอายุ</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Plan breakdown */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700 }}>📊 แบ่งตาม Plan</h3>
                {PLAN_DISPLAY_ORDER.filter(plan => tenants.some(t => t.plan === plan)).map(plan => {
                  const count = tenants.filter(t => t.plan === plan).length
                  const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0
                  const pc = PLAN_CFG[plan] ?? { label: plan, color: 'var(--text-body)', bg: '#f3f4f6' }
                  return (
                    <div key={plan} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: pc.color }}>{pc.label}</span>
                        <span style={{ color: 'var(--text-body)', fontWeight: 700 }}>{count} <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>({pct}%)</span></span>
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
                {activity.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-subtle)', fontSize: '0.82rem' }}>
                    ยังไม่มีกิจกรรม
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activity.slice(0, 5).map((a, i) => {
                        const cfg = ACTIVITY_CFG[a.type] ?? { icon: '📌', color: 'var(--text-gray)' }
                        return (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{cfg.icon}</span>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.4 }}>{a.msg}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>{a.time}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {activity.length > 5 && (
                      <button
                        onClick={() => navigate('/superadmin/announcement')}
                        style={{ display: 'block', width: '100%', marginTop: 10, padding: '7px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: 'var(--sa-accent)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                      >
                        ดูทั้งหมด ({activity.length}) →
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
