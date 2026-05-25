// employee/src/pages/profile/index.tsx
import { useNavigate } from 'react-router-dom'
import { MOCK_EMPLOYEE, MOCK_LEAVE_BALANCES } from '../../lib/mock'

function calcTenure(hireDate: string) {
  const hire = new Date(hireDate)
  const now  = new Date()
  const years  = now.getFullYear() - hire.getFullYear()
  const months = now.getMonth() - hire.getMonth()
  const total  = years * 12 + months
  if (total < 12) return `${total} เดือน`
  return `${Math.floor(total / 12)} ปี ${total % 12} เดือน`
}

function formatThaiDate(dateStr: string) {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const d = new Date(dateStr)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const emp = MOCK_EMPLOYEE

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="header-strip animate-fade-in" style={{ padding: '32px 20px 24px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 18px' }} />

        {/* Avatar */}
        <div style={{
          width: 84, height: 84, borderRadius: '50%', margin: '0 auto 14px',
          background: 'linear-gradient(135deg,var(--accent-start),var(--accent-end))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem', fontWeight: 700, color: '#fff',
          boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
        }}>
          {emp.full_name.charAt(0)}
        </div>

        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {emp.full_name}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {emp.position} · {emp.branch_name}
        </div>

        {/* Active badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(22,163,74,0.1)', borderRadius: 99, padding: '5px 14px' }}>
          <span className="animate-dot-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>พนักงานประจำ</span>
        </div>
      </div>

      {/* ── Employee Info ─────────────────────────────────────────────────── */}
      <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '16px 18px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-start)', marginBottom: 4, letterSpacing: '0.3px' }}>
          ข้อมูลการทำงาน
        </div>
        <InfoRow label="รหัสพนักงาน"  value={`EMP${emp.employee_code}`} />
        <InfoRow label="สาขา"         value={emp.branch_name} />
        <InfoRow label="กะงาน"        value={`${emp.shift.name}  ${emp.shift.start_time}–${emp.shift.end_time} น.`} />
        <InfoRow label="วันเริ่มงาน"  value={formatThaiDate(emp.hire_date)} />
        <InfoRow label="อายุงาน"      value={calcTenure(emp.hire_date)} />
        <InfoRow label="ประเภทเงินเดือน" value={emp.salary_type === 'MONTHLY' ? 'รายเดือน' : 'รายวัน'} />
      </div>

      {/* ── Leave Balance ─────────────────────────────────────────────────── */}
      <div style={{ margin: '16px 16px 0' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 4 }}>
          วันลาคงเหลือ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {MOCK_LEAVE_BALANCES.map((b, i) => {
            const pct = Math.round((b.used_days / b.entitled_days) * 100)
            return (
              <div
                key={b.leave_type_code}
                className="glass-card animate-slide-up"
                style={{ padding: '14px 12px', animationDelay: `${i * 60}ms` }}
              >
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.leave_type}
                </div>
                {/* Progress bar */}
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.06)', marginBottom: 8 }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: b.color, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {b.entitled_days - b.used_days}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>/{b.entitled_days} วัน</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="glass-card animate-slide-up" style={{ margin: '16px 16px 0', padding: '8px 8px' }}>
        {[
          { icon: '⌚', label: 'ดูรายการ OT',      sub: 'ประวัติการทำงานล่วงเวลา',  path: '/ot' },
          { icon: '💬', label: 'ส่งความคิดเห็น',  sub: 'ไม่ระบุตัวตน',             path: '/feedback' },
        ].map(({ icon, label, sub, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 12px', border: 'none', cursor: 'pointer',
              background: 'none', width: '100%', borderRadius: 14,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,53,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,107,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
              {icon}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>›</span>
          </button>
        ))}
      </div>

      {/* ── Verify link ───────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 20, padding: '0 16px' }}>
        <button
          onClick={() => navigate('/verify')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'underline' }}
        >
          เปลี่ยนบัญชีพนักงาน
        </button>
      </div>
    </div>
  )
}
