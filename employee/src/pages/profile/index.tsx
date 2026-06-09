// employee/src/pages/profile/index.tsx — FinWise layout
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { MOCK_EMPLOYEE, MOCK_LEAVE_BALANCES } from '../../lib/mock'
import { COLOR } from '../../components/ui/tokens'

function calcTenure(hireDate: string) {
  const hire = new Date(hireDate), now = new Date()
  const total = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth())
  return total < 12 ? `${total} เดือน` : `${Math.floor(total / 12)} ปี ${total % 12} เดือน`
}
function formatThaiDate(dateStr: string) {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const d = new Date(dateStr)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

const WORK_INFO = (emp: typeof MOCK_EMPLOYEE) => [
  { label: 'รหัสพนักงาน',      value: `EMP${emp.employee_code}`,                            icon: '🪪' },
  { label: 'สาขา',             value: emp.branch_name,                                       icon: '🏢' },
  { label: 'กะงาน',            value: `${emp.shift.name}  ${emp.shift.start_time}–${emp.shift.end_time}`, icon: '⏰' },
  { label: 'วันเริ่มงาน',      value: formatThaiDate(emp.hire_date),                         icon: '📅' },
  { label: 'อายุงาน',          value: calcTenure(emp.hire_date),                             icon: '⭐' },
  { label: 'ประเภทเงินเดือน',  value: emp.salary_type === 'MONTHLY' ? 'รายเดือน' : 'รายวัน', icon: '💰' },
]

const MENU_ITEMS = [
  { icon: '⌚', label: 'รายการ OT',       sub: 'ประวัติทำงานล่วงเวลา', bubbleClass: 'icon-bubble-blue',   path: '/ot' },
  { icon: '💬', label: 'ส่งความคิดเห็น', sub: 'ไม่ระบุตัวตน',         bubbleClass: 'icon-bubble-purple', path: '/feedback' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const emp = MOCK_EMPLOYEE

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header" style={{ paddingBottom: 64 }}>
        {/* Bell */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        {/* Avatar + name centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            {emp.full_name.charAt(0)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{emp.full_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{emp.position} · {emp.branch_name}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '5px 14px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>พนักงานประจำ</span>
          </div>
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* ── Leave Balance ───────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 14 }}>วันลาคงเหลือ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MOCK_LEAVE_BALANCES.map((b, i) => {
              const pct = b.entitled_days > 0 ? Math.round((b.used_days / b.entitled_days) * 100) : 0
              return (
                <div key={b.leave_type_code} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms`, background: '#F9FAFB', borderRadius: 16, padding: '14px 12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.leave_type}</div>
                  <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: b.color, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A2B3C' }}>{b.entitled_days - b.used_days}</span>
                    <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>/{b.entitled_days}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Work Info ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>ข้อมูลการทำงาน</div>
          {WORK_INFO(emp).map((row, i) => (
            <div key={row.label} className="fw-row">
              <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
              <span style={{ fontSize: '0.82rem', color: '#6B7D90', flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A2B3C' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Menu ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>เมนูอื่นๆ</div>
          {MENU_ITEMS.map(({ icon, label, sub, bubbleClass, path }) => (
            <div key={path} className="fw-row" style={{ cursor: 'pointer' }} onClick={() => navigate(path)}>
              <div className={`icon-bubble ${bubbleClass}`} style={{ borderRadius: 14, fontSize: '1.2rem' }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A2B3C' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>{sub}</div>
              </div>
              <span style={{ color: '#D1D5DB', fontSize: '1.1rem' }}>›</span>
            </div>
          ))}
        </div>

        {/* ── Change account ──────────────────────────────────── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <button onClick={() => navigate('/verify')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'underline', fontFamily: 'inherit' }}>
            เปลี่ยนบัญชีพนักงาน
          </button>
        </div>
      </div>
    </div>
  )
}
