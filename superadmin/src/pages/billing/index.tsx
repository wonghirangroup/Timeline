import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type BillingStatus = 'paid' | 'overdue' | 'trial' | 'cancelled'
type Plan = 'Starter' | 'Pro' | 'Enterprise'
interface BillingRecord { id: string; abbr: string; tenant: string; plan: Plan; amount: number; employees: number; status: BillingStatus; dueDate: string; paidDate?: string }

const planPrice: Record<Plan, number> = { Starter: 1990, Pro: 4990, Enterprise: 12990 }

const billingData: BillingRecord[] = [
  { id: 'b1', abbr: 'ดท', tenant: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', plan: 'Enterprise', amount: 12990, employees: 380, status: 'paid', dueDate: '1 พ.ค.', paidDate: '28 เม.ย.' },
  { id: 'b2', abbr: 'ทบ', tenant: 'บริษัท ไทยเบเวอเรจ จำกัด', plan: 'Pro', amount: 4990, employees: 120, status: 'paid', dueDate: '1 พ.ค.', paidDate: '1 พ.ค.' },
  { id: 'b3', abbr: 'มด', tenant: 'บริษัท มีดี โลจิสติกส์ จำกัด', plan: 'Pro', amount: 4990, employees: 210, status: 'paid', dueDate: '1 พ.ค.', paidDate: '30 เม.ย.' },
  { id: 'b4', abbr: 'อท', tenant: 'บริษัท อินโนเวทีฟ เทค', plan: 'Enterprise', amount: 12990, employees: 520, status: 'overdue', dueDate: '1 พ.ค.' },
  { id: 'b5', abbr: 'สจ', tenant: 'ห้างหุ้นส่วน สมใจ จำกัด', plan: 'Starter', amount: 1990, employees: 45, status: 'paid', dueDate: '5 พ.ค.', paidDate: '4 พ.ค.' },
  { id: 'b6', abbr: 'ทฟ', tenant: 'บริษัท ไทยฟู้ด อินดัสทรี', plan: 'Starter', amount: 1990, employees: 62, status: 'overdue', dueDate: '1 พ.ค.' },
  { id: 'b7', abbr: 'ซก', tenant: 'บริษัท ซันไรส์ กรุ๊ป จำกัด', plan: 'Pro', amount: 0, employees: 88, status: 'trial', dueDate: '15 มิ.ย.' },
  { id: 'b8', abbr: 'ฟม', tenant: 'บริษัท เฟรชมาร์ท จำกัด', plan: 'Starter', amount: 1990, employees: 30, status: 'cancelled', dueDate: '1 เม.ย.' },
]

const mrrHistory = [
  { month: 'ม.ค.', mrr: 62000 }, { month: 'ก.พ.', mrr: 67000 },
  { month: 'มี.ค.', mrr: 72000 }, { month: 'เม.ย.', mrr: 78000 }, { month: 'พ.ค.', mrr: 84000 },
]

const statusStyle: Record<BillingStatus, { label: string; dot: string; bg: string; color: string }> = {
  paid:      { label: 'ชำระแล้ว',   dot: '#10b981', bg: '#d1fae5', color: '#065f46' },
  overdue:   { label: 'เกินกำหนด',  dot: '#f43f5e', bg: '#fee2e2', color: '#9f1239' },
  trial:     { label: 'ทดลองใช้',   dot: '#f59e0b', bg: '#fef3c7', color: '#92400e' },
  cancelled: { label: 'ยกเลิก',     dot: '#94a3b8', bg: '#f1f5f9', color: '#64748b' },
}

const planStyle: Record<Plan, { bg: string; color: string }> = {
  Starter:    { bg: '#f1f5f9', color: '#475569' },
  Pro:        { bg: '#dbeafe', color: '#1d4ed8' },
  Enterprise: { bg: '#ede9fe', color: '#6d28d9' },
}

const card: React.CSSProperties = {
  background: 'white', borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(15,23,42,0.06)',
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px', fontSize: '12px', border: '1px solid #f1f5f9' }}>
      <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: '#6b7280', margin: 0 }}>MRR: <strong style={{ color: '#111827' }}>฿{payload[0]?.value?.toLocaleString()}</strong></p>
    </div>
  )
}

export default function BillingPage() {
  const totalMRR = billingData.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0)
  const overdueCount = billingData.filter(b => b.status === 'overdue').length
  const overdueAmount = billingData.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0)
  const trialCount = billingData.filter(b => b.status === 'trial').length

  const kpis = [
    { label: 'MRR เดือนนี้', value: `฿${totalMRR.toLocaleString()}`, sub: '+12% vs เดือนที่แล้ว', accent: '#10b981', bg: '#d1fae5', color: '#065f46', up: true },
    { label: 'ค้างชำระ', value: `฿${overdueAmount.toLocaleString()}`, sub: `${overdueCount} tenants`, accent: '#f43f5e', bg: '#fee2e2', color: '#9f1239', up: false },
    { label: 'Trial ที่จะหมด', value: `${trialCount} tenants`, sub: 'ภายใน 30 วัน', accent: '#f59e0b', bg: '#fef3c7', color: '#92400e', up: null as any },
    { label: 'ARR คาดการณ์', value: `฿${(totalMRR * 12).toLocaleString()}`, sub: 'จาก active tenants', accent: '#6366f1', bg: '#e0e7ff', color: '#3730a3', up: true },
  ]

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Billing</h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0' }}>สรุปรายได้และสถานะการชำระเงินของ tenant ทั้งหมด</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...card, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', color: k.accent }}>●</span>
              </div>
              {k.up !== null && (
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px', background: k.up ? '#d1fae5' : '#fee2e2', color: k.up ? '#065f46' : '#9f1239' }}>
                  {k.up ? '↑' : '↓'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '20px', fontWeight: 700, color: k.color, margin: 0, lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '6px 0 2px' }}>{k.label}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart + Plan */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
        <div style={{ ...card, padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: '0 0 3px' }}>MRR ย้อนหลัง 5 เดือน</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px' }}>Monthly Recurring Revenue รวมทุก tenant</p>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={mrrHistory} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} fill="url(#gM)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...card, padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: '0 0 3px' }}>แผนตามประเภท</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 16px' }}>จำนวน tenant ต่อแผน</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(Object.entries(planPrice) as [Plan, number][]).map(([plan, price]) => {
              const count = billingData.filter(b => b.plan === plan && b.status !== 'cancelled').length
              const total = billingData.filter(b => b.status !== 'cancelled').length
              const pct = Math.round((count / total) * 100)
              const pl = planStyle[plan]
              return (
                <div key={plan}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: pl.color }}>{plan}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}><strong style={{ color: '#1e293b' }}>{count}</strong> tenants</span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '99px', background: '#f1f5f9' }}>
                    <div style={{ height: '5px', borderRadius: '99px', background: pl.color, width: `${pct}%` }} />
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '3px 0 0' }}>฿{(count * price).toLocaleString()}/เดือน</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>รายการบิล — พ.ค. 2569</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{billingData.length} รายการ</p>
          </div>
          {overdueCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: '#fee2e2', color: '#9f1239' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }} />
              {overdueCount} รายการเกินกำหนด
            </span>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['บริษัท', 'แผน', 'จำนวนเงิน', 'กำหนดชำระ', 'ชำระเมื่อ', 'สถานะ', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {billingData.map((b, i) => {
              const ss = statusStyle[b.status]; const pl = planStyle[b.plan]
              return (
                <tr key={b.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #f8fafc', background: b.status === 'overdue' ? '#fff5f5' : 'white' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, background: pl.bg, color: pl.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>{b.abbr}</div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', margin: 0, fontSize: '13px' }}>{b.tenant}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '1px 0 0' }}>{b.employees} พนักงาน</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: pl.bg, color: pl.color }}>{b.plan}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: '#374151' }}>
                    {b.status === 'trial' ? <span style={{ color: '#cbd5e1' }}>ฟรี</span> : `฿${b.amount.toLocaleString()}`}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: '#64748b' }}>{b.dueDate}</td>
                  <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8' }}>{b.paidDate ?? <span style={{ color: '#e2e8f0' }}>—</span>}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px', background: ss.bg, color: ss.color }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ss.dot, display: 'inline-block' }} />
                      {ss.label}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                    {b.status === 'overdue' && (
                      <button style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 500, background: '#fee2e2', color: '#9f1239', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>ส่งแจ้งเตือน</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f8fafc', background: '#fafafa', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>{billingData.length} รายการ</span>
          <span style={{ fontWeight: 600, color: '#374151' }}>รวม MRR: ฿{totalMRR.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
