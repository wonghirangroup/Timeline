import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { Link } from 'react-router-dom'

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  border: '1px solid rgba(15,23,42,0.06)',
}

const stats = [
  {
    label: 'Tenants ทั้งหมด', value: '24', trend: '+3', trendLabel: 'เดือนนี้', up: true,
    accent: '#6366f1', bg: '#eef2ff',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    label: 'Active Tenants', value: '21', trend: '87.5%', trendLabel: 'active rate', up: true,
    accent: '#10b981', bg: '#d1fae5',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: 'พนักงานทั้งหมด', value: '1,842', trend: '+124', trendLabel: 'เดือนนี้', up: true,
    accent: '#8b5cf6', bg: '#ede9fe',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: 'MRR เดือนนี้', value: '฿84,000', trend: '+12%', trendLabel: 'vs เดือนที่แล้ว', up: true,
    accent: '#f59e0b', bg: '#fef3c7',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
]

const checkinData = [
  { month: 'ม.ค.', checkins: 12400, leaves: 340 },
  { month: 'ก.พ.', checkins: 13800, leaves: 290 },
  { month: 'มี.ค.', checkins: 15200, leaves: 410 },
  { month: 'เม.ย.', checkins: 14100, leaves: 380 },
  { month: 'พ.ค.', checkins: 16700, leaves: 450 },
  { month: 'มิ.ย.', checkins: 15900, leaves: 320 },
]

const tenantGrowth = [
  { month: 'ม.ค.', tenants: 18 },
  { month: 'ก.พ.', tenants: 19 },
  { month: 'มี.ค.', tenants: 20 },
  { month: 'เม.ย.', tenants: 21 },
  { month: 'พ.ค.', tenants: 23 },
  { month: 'มิ.ย.', tenants: 24 },
]

const recentTenants = [
  { name: 'บริษัท ไทยเบเวอเรจ จำกัด', abbr: 'ทบ', plan: 'Pro', employees: 120, status: 'active', joined: '10 พ.ค. 2569', planColor: '#3b82f6', planBg: '#dbeafe' },
  { name: 'ห้างหุ้นส่วน สมใจ จำกัด', abbr: 'สจ', plan: 'Starter', employees: 45, status: 'active', joined: '3 พ.ค. 2569', planColor: '#64748b', planBg: '#f1f5f9' },
  { name: 'บริษัท มีดี โลจิสติกส์', abbr: 'มด', plan: 'Pro', employees: 210, status: 'active', joined: '22 เม.ย. 2569', planColor: '#3b82f6', planBg: '#dbeafe' },
  { name: 'บริษัท เฟรชมาร์ท จำกัด', abbr: 'ฟม', plan: 'Starter', employees: 30, status: 'suspended', joined: '15 เม.ย. 2569', planColor: '#64748b', planBg: '#f1f5f9' },
  { name: 'บริษัท ดิจิทัลโซลูชั่น', abbr: 'ดท', plan: 'Enterprise', employees: 380, status: 'active', joined: '1 เม.ย. 2569', planColor: '#7c3aed', planBg: '#ede9fe' },
]

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px', fontSize: '12px', border: '1px solid #f1f5f9' }}>
      <p style={{ fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', marginBottom: '2px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
          <span>{p.name}:</span>
          <span style={{ fontWeight: 600, color: '#111827' }}>{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>ภาพรวม</h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>ข้อมูลรวม HR SaaS Platform — อัปเดตล่าสุด 19 พ.ค. 2569</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...card, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: s.bg, color: s.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <span style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px',
                background: s.up ? '#d1fae5' : '#fee2e2', color: s.up ? '#065f46' : '#991b1b',
              }}>
                {s.up ? '↑' : '↓'} {s.trend}
              </span>
            </div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 2px' }}>{s.label}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{s.trendLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        {/* Area chart */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Check-in &amp; วันลา</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '3px 0 0' }}>ภาพรวม 6 เดือนที่ผ่านมา</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />Check-in
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />วันลา
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={checkinData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="checkins" name="Check-in" stroke="#6366f1" strokeWidth={2} fill="url(#gC)" dot={false} />
              <Area type="monotone" dataKey="leaves" name="วันลา" stroke="#f59e0b" strokeWidth={2} fill="url(#gL)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div style={{ ...card, padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Tenant Growth</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px' }}>จำนวน tenant สะสม</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tenantGrowth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="tenants" name="Tenants" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Tenants */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f8fafc' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Tenant ล่าสุด</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>เข้าใช้งานใหม่ใน 30 วันที่ผ่านมา</p>
          </div>
          <Link to="/tenants" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 500, color: '#6366f1', textDecoration: 'none' }}>
            ดูทั้งหมด
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        {recentTenants.map((t, i) => (
          <div key={t.name} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px',
            borderTop: i === 0 ? 'none' : '1px solid #f8fafc',
            transition: 'background 0.15s',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
              background: t.planBg, color: t.planColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '12px',
            }}>{t.abbr}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{t.employees.toLocaleString()} พนักงาน · {t.joined}</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: t.planBg, color: t.planColor, flexShrink: 0 }}>
              {t.plan}
            </span>
            {t.status === 'active' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: '#065f46', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />Active
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: '#be123c', flexShrink: 0 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }} />Suspended
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
