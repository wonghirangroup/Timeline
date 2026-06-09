import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_BRANCHES, MOCK_TODAY_ATTENDANCE } from '../../lib/mock'
import type { AttendanceStatus } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<AttendanceStatus, { label: string; color: string; bg: string; dot: string }> = {
  ON_TIME:    { label: 'มาปกติ',      color: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
  LATE_1:     { label: 'มาสาย',       color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  LATE_2:     { label: 'สายมาก',      color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  ABSENT:     { label: 'ขาดงาน',      color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  LEAVE:      { label: 'ลาหยุด',      color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  VACATION:   { label: 'ลาพักร้อน',   color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  HALF_DAY:   { label: 'ลาครึ่งวัน',  color: '#7c3aed', bg: '#ede9fe', dot: '#8b5cf6' },
  WEEKLY_OFF: { label: 'หยุดประจำ',   color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  SAT_OFF:    { label: 'หยุดเสาร์',   color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  SUN_OFF:    { label: 'หยุดอาทิตย์', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  HOLIDAY:    { label: 'วันหยุด',     color: '#0891b2', bg: '#e0f2fe', dot: '#06b6d4' },
  MANAGER:    { label: 'ผู้บริหาร',   color: '#0891b2', bg: '#e0f2fe', dot: '#06b6d4' },
}

// Mock pending leave requests count
const MOCK_PENDING_LEAVE = 3
const MOCK_PENDING_OT    = 2

export default function DashboardPage() {
  const navigate      = useNavigate()
  const name          = useAuthStore(s => s.name)
  const isMobile      = useIsMobile()
  const [branch, setBranch] = useState('all')
  const [showAll, setShowAll] = useState(false)

  const all      = MOCK_TODAY_ATTENDANCE
  const filtered = branch === 'all' ? all : all.filter(r => r.branch_name === branch)
  const display  = showAll ? filtered : filtered.slice(0, 6)

  // Stats
  const onTime  = filtered.filter(r => r.status === 'ON_TIME').length
  const late    = filtered.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length
  const absent  = filtered.filter(r => r.status === 'ABSENT').length
  const offToday = filtered.filter(r => ['WEEKLY_OFF','SAT_OFF','SUN_OFF','LEAVE','VACATION','HOLIDAY'].includes(r.status)).length

  // Greeting
  const hour    = new Date().getHours()
  const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'
  const today   = (() => {
    const d = new Date()
    const DAYS   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return `วัน${DAYS[d.getDay()]}ที่ ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
  })()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
      gap: 24,
      alignItems: 'start'
    }}>

      {/* ── Left Column ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* ── Action required ──────────────────────────────────────── */}
        {(MOCK_PENDING_LEAVE > 0 || MOCK_PENDING_OT > 0) && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              ⚡ ต้องดำเนินการ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {MOCK_PENDING_LEAVE > 0 && (
                <button
                  onClick={() => navigate('/leave')}
                  className="premium-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                    cursor: 'pointer', textAlign: 'left',
                    border: '1px solid var(--warning-bg)', borderLeft: '4px solid var(--warning)'
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📋</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>ใบลา รออนุมัติ</div>
                    <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 600, marginTop: 2 }}>{MOCK_PENDING_LEAVE} รายการ</div>
                  </div>
                </button>
              )}
              {MOCK_PENDING_OT > 0 && (
                <button
                  onClick={() => navigate('/ot')}
                  className="premium-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
                    cursor: 'pointer', textAlign: 'left',
                    border: '1px solid var(--info-bg)', borderLeft: '4px solid var(--info)'
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⏰</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>OT รออนุมัติ</div>
                    <div style={{ fontSize: '12px', color: 'var(--info)', fontWeight: 600, marginTop: 2 }}>{MOCK_PENDING_OT} รายการ</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── KPI cards ────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            วันนี้ · สถานะพนักงาน
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { label: 'เข้างาน',    value: onTime,   icon: '✅', color: 'var(--success)', bg: 'var(--success-bg)' },
              { label: 'มาสาย',      value: late,     icon: '⚠️', color: 'var(--warning)', bg: 'var(--warning-bg)' },
              { label: 'ขาดงาน',     value: absent,   icon: '❌', color: 'var(--error)', bg: 'var(--error-bg)' },
              { label: 'หยุด/ลา',    value: offToday, icon: '🏖️', color: 'var(--info)', bg: 'var(--info-bg)' },
            ].map(card => (
              <div key={card.label} className="premium-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {card.icon}
                  </div>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick link row ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
          {[
            { label: 'จัดการพนักงาน', icon: '👥', path: '/employee', bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
            { label: 'ดูรายงาน',      icon: '📊', path: '/report',   bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
            { label: 'จัดการกะ',      icon: '⏰', path: '/shift',    bg: '#FAF5FF', color: '#6B21A8', border: '#E9D5FF' },
          ].map(q => (
            <button
              key={q.path}
              onClick={() => navigate(q.path)}
              className="premium-card"
              style={{
                padding: '16px', border: `1px solid ${q.border}`, cursor: 'pointer',
                background: q.bg, textAlign: 'center', fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: 8 }}>{q.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: q.color }}>{q.label}</div>
            </button>
          ))}
        </div>

      </div>

      {/* ── Right Column (Attendance List) ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: isMobile ? 'auto' : 'calc(100vh - 110px)' }}>
        
        {/* ── Branch quick pills ───────────────────────────────────── */}
        <div>
          <select 
            value={branch}
            onChange={(e) => { setBranch(e.target.value); setShowAll(false) }}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
              fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
              background: '#fff', color: '#374151', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)', outline: 'none'
            }}
          >
            {[{ id: 'all', name: 'ทั้งหมด', count: all.length }, ...MOCK_BRANCHES.map(b => ({ id: b.name, name: b.name, count: all.filter(r => r.branch_name === b.name).length }))].map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.count})</option>
            ))}
          </select>
        </div>

        {/* List Card */}
        <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>รายชื่อวันนี้</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, background: '#e2e8f0', padding: '2px 10px', borderRadius: 99 }}>{filtered.length} คน</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>📋</div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>ไม่มีข้อมูล</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((row, i) => {
                  const s = STATUS_CFG[row.status]
                  const isOff = ['WEEKLY_OFF','SAT_OFF','SUN_OFF','HOLIDAY','MANAGER'].includes(row.status)
                  return (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 20px',
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                        background: 'var(--bg-card)',
                        opacity: isOff ? 0.6 : 1,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)' }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg, hsl(${(i * 47) % 360},60%,60%), hsl(${(i * 47 + 30) % 360},70%,45%))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 800, color: '#fff',
                      }}>
                        {row.full_name.charAt(0)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.full_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                          {row.check_in_time || '—'} · {s.label}
                        </div>
                      </div>

                      {/* Check-in time / Status indicator */}
                      <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: s.dot }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
