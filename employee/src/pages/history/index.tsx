// employee/src/pages/history/index.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

interface AttendanceRecord {
  id: string; date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  is_outside_area: boolean
  shift: { name: string; start_time: string }
}

const MONTHS   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_TH  = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type FilterTab = 'all' | 'ontime' | 'late'

export default function HistoryPage() {
  const employee = useAuthStore(s => s.employee)
  const now      = new Date()
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
  const [filterTab, setFilterTab]         = useState<FilterTab>('all')

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['employee', 'attendance', 'history', employee?.id],
    queryFn: () =>
      api.get('/employee/attendance/history', { params: { employeeId: employee?.id } })
         .then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const months = [...new Set(records.map(r => r.date.slice(0, 7)))].sort().reverse()
  const allFiltered = records
    .filter(r => r.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const onTime    = allFiltered.filter(r => r.check_in_at && !r.is_late).length
  const late      = allFiltered.filter(r => r.is_late).length
  const noCheckIn = allFiltered.filter(r => !r.check_in_at).length

  const filtered = filterTab === 'ontime'
    ? allFiltered.filter(r => r.check_in_at && !r.is_late)
    : filterTab === 'late'
    ? allFiltered.filter(r => r.is_late || !r.check_in_at)
    : allFiltered

  const displayMonths = months.length > 0 ? months : [`${now.getFullYear()}-${pad(now.getMonth() + 1)}`]

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>ประวัติเช็คชื่อ</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {employee ? `${employee.first_name} ${employee.last_name} · ${employee.branch.name}` : ''}
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        <div className="header-stat-row">
          <div className="header-stat-col">
            <div className="header-stat-label">✅ ตรงเวลา</div>
            <div className="header-stat-value">{onTime} วัน</div>
          </div>
          <div className="header-stat-col">
            <div className="header-stat-label">⏰ มาสาย</div>
            <div className="header-stat-value">{late} วัน</div>
          </div>
        </div>

        {/* Month selector */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {displayMonths.map(mo => {
            const [yy, mm] = mo.split('-').map(Number)
            const active = mo === selectedMonth
            return (
              <button key={mo} onClick={() => { setSelectedMonth(mo); setFilterTab('all') }}
                style={{ padding: '5px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit', background: active ? '#fff' : 'rgba(255,255,255,0.2)', color: active ? COLOR.primary : 'rgba(255,255,255,0.85)', transition: 'all 0.15s' }}>
                {MONTHS[mm - 1]} {yy + 543}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* Filter tabs */}
        <div className="fw-tabs" style={{ background: COLOR.pageBg, padding: 6, borderRadius: 16 }}>
          {([
            { key: 'all',    label: `ทั้งหมด (${allFiltered.length})` },
            { key: 'ontime', label: `ตรงเวลา (${onTime})` },
            { key: 'late',   label: `สาย/ขาด (${late + noCheckIn})` },
          ] as { key: FilterTab; label: string }[]).map(t => (
            <button key={t.key} className={`fw-tab${filterTab === t.key ? ' active' : ''}`} onClick={() => setFilterTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: COLOR.textMuted }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 600 }}>กำลังโหลด...</div>
          </div>
        )}

        {/* Record list */}
        {!isLoading && (
          filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.5 }}>📋</div>
              <div style={{ fontWeight: 600, color: COLOR.textMuted }}>ไม่มีข้อมูลในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {filtered.map((r, i) => {
                const d = new Date(r.date)
                const isNoData = !r.check_in_at

                const iconBubbleClass = isNoData ? 'icon-bubble icon-bubble-purple'
                  : r.is_late ? 'icon-bubble icon-bubble-orange'
                  : 'icon-bubble icon-bubble-blue'

                const statusColor = isNoData ? COLOR.textMuted : r.is_late ? COLOR.warning : COLOR.success
                const statusLabel = isNoData ? 'ไม่มีข้อมูล' : r.is_late ? `สาย ${r.late_minutes} น.` : 'ตรงเวลา'

                return (
                  <div key={r.id} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div className={iconBubbleClass}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {isNoData ? '❌' : r.is_late ? '⏰' : '✅'}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: COLOR.textPrimary }}>
                        {d.getDate()} {MONTHS[d.getMonth()]} · {DAYS_TH[d.getDay()]}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: COLOR.info, marginTop: 4, fontWeight: 500 }}>
                        {fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)} · {r.shift.name}
                      </div>
                      {r.is_outside_area && (
                        <span style={{ fontSize: '0.7rem', background: COLOR.warningBg, color: COLOR.warning, border: `1px solid ${COLOR.warningBorder}`, borderRadius: 99, padding: '2px 10px', fontWeight: 700, marginTop: 6, display: 'inline-block' }}>นอกพื้นที่</span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: statusColor, whiteSpace: 'nowrap', background: isNoData ? '#f3f4f6' : r.is_late ? COLOR.warningBg : COLOR.successBg, padding: '6px 12px', borderRadius: 12 }}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
