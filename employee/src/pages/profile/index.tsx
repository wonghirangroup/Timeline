// employee/src/pages/profile/index.tsx
import { useNavigate } from 'react-router-dom'
import { IdCard, Building2, Clock, MessageCircle, Wrench } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'

const MENU_ITEMS = [
  { Icon: Clock,          label: 'รายการ OT',       sub: 'ประวัติทำงานล่วงเวลา', bubbleClass: 'icon-bubble-blue',   path: '/ot' },
  { Icon: MessageCircle,  label: 'ส่งความคิดเห็น', sub: 'ไม่ระบุตัวตน',         bubbleClass: 'icon-bubble-purple', path: '/feedback' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)

  if (!employee) return <PageLoader />

  const fullName = `${employee.first_name} ${employee.last_name}`

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header" style={{ paddingBottom: 64, paddingTop: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            {employee.first_name.charAt(0)}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{fullName}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{employee.branch.name}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '5px 14px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>พนักงานประจำ</span>
          </div>
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* ── Work Info ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>ข้อมูลการทำงาน</div>
          {[
            { label: 'รหัสพนักงาน', value: employee.employee_code, Icon: IdCard },
            { label: 'สาขา',        value: employee.branch.name,    Icon: Building2 },
          ].map(row => (
            <div key={row.label} className="fw-row">
              <row.Icon size={17} color="#6B7D90" style={{ width: 22, flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#6B7D90', flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1A2B3C' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* ── Menu ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>เมนูอื่นๆ</div>
          {MENU_ITEMS.map(({ Icon, label, sub, bubbleClass, path }) => (
            <div key={path} className="fw-row" style={{ cursor: 'pointer' }} onClick={() => navigate(path)}>
              <div className={`icon-bubble ${bubbleClass}`} style={{ borderRadius: 14 }}><Icon size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A2B3C' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#6C89F5', marginTop: 2 }}>{sub}</div>
              </div>
              <span style={{ color: '#D1D5DB', fontSize: '1.1rem' }}>›</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', paddingTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {import.meta.env.DEV && (
            <button onClick={() => { localStorage.removeItem('dev_employee_id'); window.location.reload() }}
              style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={13} /> DEV: เปลี่ยนพนักงาน
            </button>
          )}
          <button onClick={() => navigate('/verify')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#9CA3AF', textDecoration: 'underline', fontFamily: 'inherit' }}>
            เปลี่ยนบัญชี LINE
          </button>
        </div>
      </div>
    </div>
  )
}
