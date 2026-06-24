// employee/src/pages/profile/index.tsx
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

interface LeaveBalance {
  leave_type: string
  total_days: number
  used_days: number
  remaining: number
}

const LEAVE_COLORS: Record<string, string> = {
  SICK:      '#3b82f6',
  PERSONAL:  '#8b5cf6',
  VACATION:  '#f59e0b',
  MATERNITY: '#ec4899',
}

const LEAVE_LABELS: Record<string, string> = {
  SICK:      'ลาป่วย',
  PERSONAL:  'ลากิจ',
  VACATION:  'ลาพักร้อน',
  MATERNITY: 'ลาคลอด',
}

const MENU_ITEMS = [
  { icon: '⌚', label: 'รายการ OT',       sub: 'ประวัติทำงานล่วงเวลา', bubbleClass: 'icon-bubble-blue',   path: '/ot' },
  { icon: '💬', label: 'ส่งความคิดเห็น', sub: 'ไม่ระบุตัวตน',         bubbleClass: 'icon-bubble-purple', path: '/feedback' },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const employee = useAuthStore(s => s.employee)

  const { data: balances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['employee', 'leave-balances', employee?.id],
    queryFn: () =>
      api.get('/employee/leave-balances', { params: { employeeId: employee?.id } })
         .then(r => r.data.data),
    enabled: !!employee?.id,
  })

  if (!employee) {
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: COLOR.textMuted }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <div>กำลังโหลด...</div>
        </div>
      </div>
    )
  }

  const fullName = `${employee.first_name} ${employee.last_name}`

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header" style={{ paddingBottom: 64 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

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

        {/* ── Leave Balance ───────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 14 }}>วันลาคงเหลือ</div>
          {balances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: COLOR.textMuted, fontSize: '0.82rem' }}>ไม่มีข้อมูลวันลา</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {balances.map((b, i) => {
                const pct = b.total_days > 0 ? Math.round(((b.total_days - b.remaining) / b.total_days) * 100) : 0
                const color = LEAVE_COLORS[b.leave_type] ?? '#6366f1'
                return (
                  <div key={b.leave_type} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms`, background: '#F9FAFB', borderRadius: 16, padding: '14px 12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.62rem', color: '#9CA3AF', fontWeight: 600, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {LEAVE_LABELS[b.leave_type] ?? b.leave_type}
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1A2B3C' }}>{b.remaining}</span>
                      <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>/{b.total_days}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Work Info ───────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1A2B3C', marginBottom: 4 }}>ข้อมูลการทำงาน</div>
          {[
            { label: 'รหัสพนักงาน', value: employee.employee_code, icon: '🪪' },
            { label: 'สาขา',        value: employee.branch.name,    icon: '🏢' },
          ].map(row => (
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

        <div style={{ textAlign: 'center', paddingTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {import.meta.env.DEV && (
            <button onClick={() => { localStorage.removeItem('dev_employee_id'); window.location.reload() }}
              style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit' }}>
              🛠 DEV: เปลี่ยนพนักงาน
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
