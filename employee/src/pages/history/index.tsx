// employee/src/pages/history/index.tsx
import { useState } from 'react'
import { MOCK_ATTENDANCE, MOCK_EMPLOYEE } from '../../lib/mock'
import type { AttendanceRecord, AttendanceStatus } from '../../types'

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_TH = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']

function pad(n: number) { return String(n).padStart(2, '0') }

function formatTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateRow(dateStr: string) {
  const d = new Date(dateStr)
  return `${DAYS_TH[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const STATUS_MAP: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  ON_TIME:    { label: 'ตรงเวลา',    color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  LATE_1:     { label: 'สายเล็กน้อย', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  LATE_2:     { label: 'สายมาก',     color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  ABSENT:     { label: 'ขาดงาน',     color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  OFF_SITE:   { label: 'นอกสถานที่', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  HOLIDAY:    { label: 'วันหยุด',    color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
  LEAVE:      { label: 'วันลา',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  WEEKLY_OFF: { label: 'หยุดประจำ', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
}

function calcStats(records: AttendanceRecord[]) {
  const workDays = records.filter(r => r.status !== 'WEEKLY_OFF' && r.status !== 'HOLIDAY')
  const onTime   = records.filter(r => r.status === 'ON_TIME').length
  const late     = records.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length
  const leave    = records.filter(r => r.status === 'LEAVE').length
  const totalOt  = records.reduce((s, r) => s + (r.ot_hours || 0), 0)
  return { workDays: workDays.length, onTime, late, leave, totalOt }
}

export default function HistoryPage() {
  const emp = MOCK_EMPLOYEE
  // derive available months from mock data
  const allMonths = [...new Set(MOCK_ATTENDANCE.map(r => r.date.slice(0, 7)))].sort().reverse()
  const [selectedMonth, setSelectedMonth] = useState(allMonths[0])

  const records = MOCK_ATTENDANCE.filter(r => r.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const stats = calcStats(records)
  const [yr, mo] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS[mo - 1]} ${yr + 543}`

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>

      {/* Header */}
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>ประวัติเช็คชื่อ</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>
          {emp.full_name} · {emp.branch_name}
        </div>

        {/* Month Selector */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          {allMonths.map(m => {
            const [y, mo2] = m.split('-').map(Number)
            const isActive = m === selectedMonth
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                style={{
                  padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: isActive ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' : 'rgba(0,0,0,0.06)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 10px rgba(255,107,53,0.3)' : 'none',
                }}
              >
                {MONTHS[mo2 - 1]} {y + 543}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, margin: '14px 16px 0' }}>
        {[
          { label: 'ทำงาน', value: stats.workDays, unit: 'วัน', color: 'var(--accent-start)' },
          { label: 'ตรงเวลา', value: stats.onTime, unit: 'วัน', color: '#16a34a' },
          { label: 'สาย', value: stats.late, unit: 'วัน', color: '#d97706' },
          { label: 'OT', value: stats.totalOt, unit: 'ชม.', color: '#7c3aed' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '12px 8px', textAlign: 'center', animationDelay: `${i * 50}ms` }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}<br />{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Records List */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 4 }}>
          {monthLabel} — {records.length} รายการ
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r, i) => {
            const s = STATUS_MAP[r.status]
            const isOff = r.status === 'WEEKLY_OFF' || r.status === 'HOLIDAY'
            return (
              <div
                key={r.id}
                className="glass-card animate-slide-up"
                style={{ padding: '14px 16px', animationDelay: `${i * 40}ms`, opacity: isOff ? 0.6 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Date Circle */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: isOff ? 'rgba(0,0,0,0.05)' : 'rgba(255,107,53,0.08)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isOff ? 'var(--text-muted)' : 'var(--accent-start)', lineHeight: 1 }}>
                        {new Date(r.date).getDate()}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                        {DAYS_TH[new Date(r.date).getDay()]}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatDateRow(r.date)}
                      </div>
                      {!isOff && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatTime(r.check_in_time)} → {formatTime(r.check_out_time)}
                          {r.is_manual && (
                            <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(255,107,53,0.1)', color: 'var(--accent-start)', borderRadius: 99, padding: '1px 6px', fontWeight: 600 }}>
                              ปรับแก้
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color, background: s.bg, borderRadius: 99, padding: '3px 10px' }}>
                      {s.label}
                    </span>
                    {r.ot_hours > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: 'rgba(124,58,237,0.08)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
                        OT +{r.ot_hours} ชม.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {records.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
              <div style={{ fontWeight: 600 }}>ไม่มีข้อมูลเดือนนี้</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
