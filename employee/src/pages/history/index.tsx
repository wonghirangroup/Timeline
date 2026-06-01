// employee/src/pages/history/index.tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, liffLogin } from '../../lib/axios'
import { initLiff } from '../../lib/liff'

interface EmployeeInfo { id: string; first_name: string; last_name: string; branch: { name: string } }
interface AttendanceRecord {
  id: string; date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  is_outside_area: boolean
  check_in_method: string
  shift: { name: string; start_time: string }
}

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_TH = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HistoryPage() {
  const navigate   = useNavigate()
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [records,  setRecords]  = useState<AttendanceRecord[]>([])
  const [booting,  setBooting]  = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  })

  useEffect(() => {
    ;(async () => {
      try { await initLiff() } catch { setBooting(false); return }
      try { await liffLogin() } catch (e: any) {
        if (e?.response?.data?.error?.code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setBooting(false); return
      }
      try {
        const res = await api.get('/employee/me')
        setEmployee(res.data.data.employee)
      } catch { /* ignore */ }
      finally { setBooting(false) }
    })()
  }, [])

  const loadHistory = useCallback(async (empId: string) => {
    const res = await api.get('/employee/attendance/history', { params: { employeeId: empId } })
    setRecords(res.data.data ?? [])
  }, [])

  useEffect(() => { if (employee) loadHistory(employee.id) }, [employee])

  const months = [...new Set(records.map(r => r.date.slice(0, 7)))].sort().reverse()
  const filtered = records.filter(r => r.date.startsWith(selectedMonth)).sort((a, b) => b.date.localeCompare(a.date))

  const onTime  = filtered.filter(r => r.check_in_at && !r.is_late).length
  const late    = filtered.filter(r => r.is_late).length
  const noCheckIn = filtered.filter(r => !r.check_in_at).length

  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  const [yr, mo] = selectedMonth.split('-').map(Number)
  const monthLabel = `${MONTHS[mo - 1]} ${yr + 543}`

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', padding: '0 0 16px' }}>
      <div className="header-strip animate-fade-in" style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg,var(--accent-start),var(--accent-end))', margin: '0 auto 14px' }} />
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>ประวัติเช็คชื่อ</div>
        {employee && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>{employee.first_name} {employee.last_name} · {employee.branch.name}</div>}

        {/* Month selector */}
        {months.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {months.map(m => {
              const [y, mo2] = m.split('-').map(Number)
              return (
                <button key={m} onClick={() => setSelectedMonth(m)}
                  style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: m === selectedMonth ? 'linear-gradient(135deg,var(--accent-start),var(--accent-end))' : 'rgba(0,0,0,0.06)', color: m === selectedMonth ? '#fff' : 'var(--text-secondary)', boxShadow: m === selectedMonth ? '0 2px 10px rgba(255,107,53,0.3)' : 'none', transition: 'all 0.15s' }}>
                  {MONTHS[mo2 - 1]} {y + 543}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, margin: '14px 16px 0' }}>
        {[
          { label: 'ตรงเวลา',  value: onTime,    color: '#16a34a' },
          { label: 'สาย',      value: late,       color: '#d97706' },
          { label: 'ไม่มีข้อมูล', value: noCheckIn, color: '#9ca3af' },
        ].map((s, i) => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '12px 8px', textAlign: 'center', animationDelay: `${i * 50}ms` }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}<br />วัน</div>
          </div>
        ))}
      </div>

      {/* Records */}
      <div style={{ margin: '14px 16px 0' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, paddingLeft: 4 }}>
          {monthLabel} — {filtered.length} รายการ
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📋</div>
            <div>ไม่มีข้อมูลเดือนนี้</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((r, i) => {
            const d     = new Date(r.date)
            const isLate = r.is_late
            const statusColor = !r.check_in_at ? '#9ca3af' : isLate ? '#d97706' : '#16a34a'
            const statusBg    = !r.check_in_at ? 'rgba(156,163,175,0.1)' : isLate ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)'
            const statusLabel = !r.check_in_at ? 'ไม่มีข้อมูล' : isLate ? `สาย ${r.late_minutes} นาที` : 'ตรงเวลา'

            return (
              <div key={r.id} className="glass-card animate-slide-up" style={{ padding: '14px 16px', animationDelay: `${i * 40}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,107,53,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-start)', lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>{DAYS_TH[d.getDay()]}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {d.getDate()} {MONTHS[d.getMonth()]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {r.shift.name} · {fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)}
                        {r.is_outside_area && <span style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(217,119,6,0.1)', color: '#d97706', borderRadius: 99, padding: '1px 6px' }}>นอกพื้นที่</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor, background: statusBg, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
