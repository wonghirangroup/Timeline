import { useState } from 'react'
import { MOCK_BRANCHES, MOCK_TODAY_ATTENDANCE } from '../../lib/mock'
import type { AttendanceStatus } from '../../types'
import { useIsMobile } from '../../hooks/useIsMobile'

const STATUS_LABEL: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  ON_TIME:    { label: 'มาปกติ',      color: '#16a34a', bg: '#dcfce7' },
  LATE_1:     { label: 'มาสาย',       color: '#d97706', bg: '#fef3c7' },
  LATE_2:     { label: 'สายมาก',      color: '#dc2626', bg: '#fee2e2' },
  ABSENT:     { label: 'ขาดงาน',      color: '#dc2626', bg: '#fee2e2' },
  LEAVE:      { label: 'ลาหยุด',      color: '#7c3aed', bg: '#ede9fe' },
  VACATION:   { label: 'ลาพักร้อน',   color: '#d97706', bg: '#fef3c7' },
  HALF_DAY:   { label: 'ลาครึ่งวัน',  color: '#7c3aed', bg: '#ede9fe' },
  WEEKLY_OFF: { label: 'หยุดประจำ',   color: '#64748b', bg: '#f1f5f9' },
  SAT_OFF:    { label: 'หยุดเสาร์',   color: '#64748b', bg: '#f1f5f9' },
  SUN_OFF:    { label: 'หยุดอาทิตย์', color: '#64748b', bg: '#f1f5f9' },
  HOLIDAY:    { label: 'วันหยุด',     color: '#0891b2', bg: '#e0f2fe' },
  MANAGER:    { label: 'ผู้บริหาร',   color: '#0891b2', bg: '#e0f2fe' },
}

const CARD_CONFIG = [
  { key: 'total',    label: 'พนักงานทั้งหมด',   icon: '👥', bg: '#fdf2f8', color: '#9d174d' },
  { key: 'checkin',  label: 'เข้างาน',           icon: '✓',  bg: '#fefce8', color: '#854d0e' },
  { key: 'late',     label: 'มาสาย',             icon: '⏰', bg: '#f0fdf4', color: '#14532d' },
  { key: 'absent',   label: 'ขาด/ลา/ยังไม่มา',  icon: '✕',  bg: '#fdf4ff', color: '#6b21a8' },
  { key: 'offsite',  label: 'นอกพื้นที่',         icon: '🚗', bg: '#eff6ff', color: '#1e3a8a' },
  { key: 'checkout', label: 'เช็คเอาท์',          icon: '—',  bg: '#f8fafc', color: '#334155' },
]

const PERIOD_MULTIPLIER: Record<'day'|'week'|'month', number> = { day: 1, week: 6, month: 22 }

function getPeriodLabel(period: 'day'|'week'|'month'): string {
  const today = new Date()
  const dd = today.getDate()
  const mm = today.getMonth() // 0-based
  const MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const MONTHS_LONG  = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  const be = today.getFullYear() + 543
  if (period === 'day') {
    return `วันที่ ${dd} ${MONTHS_SHORT[mm]} ${be}`
  }
  if (period === 'week') {
    const dow = today.getDay()
    const mon = new Date(today); mon.setDate(dd - (dow === 0 ? 6 : dow - 1))
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return `สัปดาห์ที่ ${mon.getDate()}-${sun.getDate()} ${MONTHS_SHORT[mm]} ${be}`
  }
  return `${MONTHS_LONG[mm]} ${be}`
}

export default function DashboardPage() {
  const [branchFilter, setBranchFilter] = useState('all')
  const [period, setPeriod] = useState<'day'|'week'|'month'>('day')
  const isMobile = useIsMobile()

  const all = MOCK_TODAY_ATTENDANCE
  const filtered = branchFilter === 'all' ? all : all.filter(r => r.branch_name === branchFilter)

  const mult = PERIOD_MULTIPLIER[period]
  const baseCheckin  = all.filter(r => r.check_in_time).length
  const baseLate     = all.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length
  const baseAbsent   = all.filter(r => !r.check_in_time && r.status !== 'MANAGER').length
  const baseCheckout = all.filter(r => r.check_out_time).length

  const stats = {
    total:    all.length,
    checkin:  baseCheckin  * mult,
    late:     baseLate     * mult,
    absent:   baseAbsent   * mult,
    offsite:  0,
    checkout: baseCheckout * mult,
  }

  return (
    <div>
      {/* Alert Banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.95rem' }}>ℹ️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e40af' }}>
            ระบบ Server จะทำงานอัตโนมัติหลังเวลา <strong>17:00 น.</strong>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>⚠️ รอตัดยอด: 5 คน</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['day', 'week', 'month'] as const).map(p => {
            const labels: Record<string, string> = { day: 'วัน', week: 'สัปดาห์', month: 'เดือน' }
            const isActive = period === p
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#f97316' : '#f3f4f6',
                  color: isActive ? '#fff' : '#6b7280',
                  transition: 'all 0.12s',
                }}
              >{labels[p]}</button>
            )
          })}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{getPeriodLabel(period)}</div>
      </div>

      {/* Stat Cards — 3×2 on mobile, 6×1 on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(6,1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        {CARD_CONFIG.map(c => (
          <div key={c.key} style={{ background: c.bg, borderRadius: 10, padding: isMobile ? '12px 10px' : '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: '#6b7280', marginBottom: 6, lineHeight: 1.3 }}>{c.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: c.color }}>{c.icon}</span>
              <span style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 700, color: '#111827' }}>{(stats as any)[c.key]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Branch Count */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: 10 }}>🏢 จำนวนพนักงานรายสาขา</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MOCK_BRANCHES.map(b => (
            <div key={b.id} style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #f3f4f6', minWidth: isMobile ? 70 : 100 }}>
              <div style={{ fontSize: isMobile ? '0.68rem' : '0.78rem', color: '#6b7280', marginBottom: 2 }}>{b.name.length > 8 ? b.name.slice(0, 8) + '…' : b.name}</div>
              <div style={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700, color: b.employee_count > 0 ? '#f97316' : '#9ca3af' }}>{b.employee_count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Table / Card */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>🗓 รายการลงเวลา</span>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.78rem', cursor: 'pointer', marginLeft: 'auto' }}
          >
            <option value="all">ทั้งหมด ({all.length})</option>
            {MOCK_BRANCHES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>

        {isMobile ? (
          /* Card list on mobile */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((row, i) => {
              const s = STATUS_LABEL[row.status]
              return (
                <div key={row.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#6b7280', flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{row.full_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{row.branch_name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>{s.label}</span>
                    {row.check_in_time && (
                      <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600, marginTop: 4 }}>{row.check_in_time}</div>
                    )}
                    {row.fine > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>{row.fine} ฿</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Table on desktop */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#dbeafe' }}>
                  {['รหัส','ชื่อ - สกุล','ชื่อเล่น','สาขา','เวลาเข้า','เวลาออก','สถานะ','ค่าปรับ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const s = STATUS_LABEL[row.status]
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.code}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>👤</div>
                          {row.full_name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{row.nickname}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{row.branch_name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.check_in_time
                          ? <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{row.check_in_time}</span>
                          : <span style={{ color: '#9ca3af' }}>-</span>
                        }
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{row.check_out_time ?? '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: row.fine > 0 ? '#dc2626' : '#9ca3af', fontWeight: row.fine > 0 ? 600 : 400 }}>
                        {row.fine > 0 ? `${row.fine} ฿` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
