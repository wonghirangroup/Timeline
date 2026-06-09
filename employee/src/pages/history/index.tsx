// employee/src/pages/history/index.tsx  [MOCK MODE — FinWise layout]
import { useState } from 'react'
import { Bell } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'

interface AttendanceRecord {
  id: string; date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  is_outside_area: boolean
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

function makeRecord(dateStr: string, isLate = false, lateMin = 0, noCheckIn = false): AttendanceRecord {
  const base = new Date(dateStr + 'T08:00:00')
  return {
    id: `r-${dateStr}`, date: dateStr,
    check_in_at:  noCheckIn ? null : new Date(base.getTime() + lateMin * 60000).toISOString(),
    check_out_at: noCheckIn ? null : new Date(dateStr + 'T17:05:00').toISOString(),
    is_late: isLate, late_minutes: lateMin,
    is_outside_area: false,
    shift: { name: 'กะเช้า', start_time: '08:00' },
  }
}

const today = new Date()
const y = today.getFullYear(), m = today.getMonth() + 1
const prevM = m === 1 ? 12 : m - 1
const prevY = m === 1 ? y - 1 : y

const MOCK_RECORDS: AttendanceRecord[] = [
  makeRecord(`${y}-${pad(m)}-02`),
  makeRecord(`${y}-${pad(m)}-03`, true, 12),
  makeRecord(`${y}-${pad(m)}-04`),
  makeRecord(`${y}-${pad(m)}-05`),
  makeRecord(`${y}-${pad(m)}-08`, true, 25),
  makeRecord(`${y}-${pad(m)}-09`),
  makeRecord(`${y}-${pad(m)}-10`, false, 0, true),
  makeRecord(`${y}-${pad(m)}-11`),
  makeRecord(`${y}-${pad(m)}-12`),
  makeRecord(`${prevY}-${pad(prevM)}-20`),
  makeRecord(`${prevY}-${pad(prevM)}-21`, true, 8),
  makeRecord(`${prevY}-${pad(prevM)}-22`),
  makeRecord(`${prevY}-${pad(prevM)}-23`),
  makeRecord(`${prevY}-${pad(prevM)}-24`),
  makeRecord(`${prevY}-${pad(prevM)}-25`),
]

type FilterTab = 'all' | 'ontime' | 'late'

export default function HistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState(`${y}-${pad(m)}`)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')

  const months = [...new Set(MOCK_RECORDS.map(r => r.date.slice(0, 7)))].sort().reverse()
  const allFiltered = MOCK_RECORDS
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

  const [yr, mo] = selectedMonth.split('-').map(Number)

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>ประวัติเช็คชื่อ</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>สมชาย ใจดี · สาขาสุขุมวิท</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        {/* Stat row */}
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
          {months.map(mo2 => {
            const [yy, mm2] = mo2.split('-').map(Number)
            const active = mo2 === selectedMonth
            return (
              <button key={mo2} onClick={() => { setSelectedMonth(mo2); setFilterTab('all') }}
                style={{
                  padding: '5px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'inherit',
                  background: active ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: active ? COLOR.primary : 'rgba(255,255,255,0.85)',
                  transition: 'all 0.15s',
                }}>
                {MONTHS[mm2 - 1]} {yy + 543}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* Mock badge */}
        <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
          🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
        </div>

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

        {/* Record list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.5 }}>📋</div>
            <div style={{ fontWeight: 600, color: COLOR.textMuted }}>ไม่มีข้อมูล</div>
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
                  {/* Icon bubble */}
                  <div className={iconBubbleClass}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {isNoData ? '❌' : r.is_late ? '⏰' : '✅'}
                    </span>
                  </div>

                  {/* Date + shift info */}
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

                  {/* Status */}
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: statusColor, whiteSpace: 'nowrap', background: isNoData ? '#f3f4f6' : r.is_late ? COLOR.warningBg : COLOR.successBg, padding: '6px 12px', borderRadius: 12 }}>
                    {statusLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
