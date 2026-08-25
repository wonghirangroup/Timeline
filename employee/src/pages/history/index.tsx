// employee/src/pages/history/index.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Ban, Clock, XCircle, ClipboardList, Wallet, FileText, Palmtree, MapPin, AlertTriangle } from 'lucide-react'
import { PageLoader, COLOR } from '../../components/ui'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'

interface AttendanceRecord {
  id: string; date: string
  check_in_at:  string | null
  check_out_at: string | null
  is_late:      boolean
  late_minutes: number
  is_absent:    boolean
  fine:         string
  carried_fine: string
  is_outside_area: boolean
  shift: { name: string; start_time: string }
}

type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
interface LeaveRecord {
  id: string; leave_type: string; start_date: string; end_date: string
  days: number; reason: string | null; status: ReqStatus; reject_note: string | null
  has_conflict?: boolean
}
interface WeeklyOffRecord {
  id: string; week_start: string; day_of_week: number; status: ReqStatus; reject_note: string | null
  has_conflict?: boolean
}
interface OffsiteRecord {
  id: string; check_in_at: string; check_in_address: string | null
  check_out_at: string | null; check_out_address: string | null; note: string | null
}

const MONTHS   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_TH  = ['อา','จ','อ','พ','พฤ','ศ','ส']

const LEAVE_TYPE_CFG: Record<string, { label: string; color: string }> = {
  SICK:       { label: 'ลาป่วย',       color: '#3B82F6' },
  PERSONAL:   { label: 'ลากิจ',        color: '#8B5CF6' },
  VACATION:   { label: 'ลาพักร้อน',    color: '#F59E0B' },
  MATERNITY:  { label: 'ลาคลอด',       color: '#EC4899' },
  COMPENSATE: { label: 'วันหยุดชดเชย', color: '#10B981' },
}
const STATUS_CFG: Record<ReqStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา',  color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  APPROVED: { label: 'อนุมัติแล้ว', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'ไม่อนุมัติ', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtTime(iso: string | null) {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtDateShort(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
// week_start + day_of_week → วันที่จริง (เหมือน resolveDate ใน leave/index.tsx)
function resolveDate(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  if (d.getUTCDay() === dayOfWeek) return weekStart.slice(0, 10)
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

const ConflictBadge = () => (
  <span title="มีพนักงานตำแหน่งเดียวกันจอง/ลาวันนี้ไว้แล้ว" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fef2f2', color: '#dc2626', borderRadius: 5, padding: '1px 6px', fontSize: '0.62rem', fontWeight: 700 }}>
    <AlertTriangle size={9} /> ชนตำแหน่ง
  </span>
)

type RecordType = 'attendance' | 'leave' | 'dayoff' | 'offsite'
type FilterTab = 'all' | 'ontime' | 'late'

export default function HistoryPage() {
  const employee = useAuthStore(s => s.employee)
  const now      = new Date()
  const [recordType,    setRecordType]    = useState<RecordType>('attendance')
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
  const [filterTab,     setFilterTab]     = useState<FilterTab>('all')

  const { data: records = [], isLoading: loadingAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['employee', 'attendance', 'history', employee?.id],
    queryFn: () =>
      api.get('/employee/attendance/history', { params: { employeeId: employee?.id } })
         .then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const { data: leaveRecords = [], isLoading: loadingLeave } = useQuery<LeaveRecord[]>({
    queryKey: ['employee', 'leave-requests', employee?.id],
    queryFn: () => api.get('/employee/leave-requests', { params: { employeeId: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id && recordType === 'leave',
  })

  const { data: dayoffRecords = [], isLoading: loadingDayoff } = useQuery<WeeklyOffRecord[]>({
    queryKey: ['employee', 'weekly-off-history', employee?.id],
    queryFn: () => api.get('/employee/weekly-off', { params: { employeeId: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id && recordType === 'dayoff',
  })

  const { data: offsiteRecords = [], isLoading: loadingOffsite } = useQuery<OffsiteRecord[]>({
    queryKey: ['employee', 'offsite-history', employee?.id],
    queryFn: () => api.get('/employee/offsite-checkins', { params: { employeeId: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id && recordType === 'offsite',
  })

  // ── เช็คชื่อ ──────────────────────────────────────────────────────
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

  // ── วันลา / วันหยุด / นอกสถานที่ — กรองตามเดือนที่เลือกเหมือนกัน ──
  const leaveFiltered   = leaveRecords.filter(r => r.start_date.slice(0, 7) === selectedMonth).sort((a, b) => b.start_date.localeCompare(a.start_date))
  const dayoffFiltered  = dayoffRecords.filter(r => resolveDate(r.week_start, r.day_of_week).slice(0, 7) === selectedMonth).sort((a, b) => b.week_start.localeCompare(a.week_start))
  const offsiteFiltered = offsiteRecords.filter(r => r.check_in_at.slice(0, 7) === selectedMonth).sort((a, b) => b.check_in_at.localeCompare(a.check_in_at))

  const TABS: { id: RecordType; label: string; Icon: typeof CheckCircle2 }[] = [
    { id: 'attendance', label: 'เช็คชื่อ',     Icon: CheckCircle2 },
    { id: 'leave',      label: 'วันลา',        Icon: FileText },
    { id: 'dayoff',     label: 'วันหยุด',      Icon: Palmtree },
    { id: 'offsite',    label: 'นอกสถานที่',   Icon: MapPin },
  ]

  const isLoading = recordType === 'attendance' ? loadingAttendance
    : recordType === 'leave' ? loadingLeave
    : recordType === 'dayoff' ? loadingDayoff
    : loadingOffsite

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>ประวัติ</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              {employee ? `${employee.first_name} ${employee.last_name} · ${employee.branch.name}` : ''}
            </div>
          </div>
        </div>

        {/* ── Record type tabs ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {TABS.map(t => {
            const active = recordType === t.id
            return (
              <button key={t.id} onClick={() => setRecordType(t.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '8px 2px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.14)',
                  color: active ? COLOR.primary : 'rgba(255,255,255,0.85)',
                }}>
                <t.Icon size={15} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {recordType === 'attendance' && (
          <div className="header-stat-row">
            <div className="header-stat-col">
              <div className="header-stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> ตรงเวลา</div>
              <div className="header-stat-value">{onTime} วัน</div>
            </div>
            <div className="header-stat-col">
              <div className="header-stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> มาสาย</div>
              <div className="header-stat-value">{late} วัน</div>
            </div>
          </div>
        )}

        {/* Month selector — dropdown */}
        <div style={{ marginTop: recordType === 'attendance' ? 16 : 0 }}>
          <select
            value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); setFilterTab('all') }}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.94)', color: COLOR.primary, outline: 'none',
              appearance: 'none', WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23FF5E00' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
            }}
          >
            {displayMonths.map(mo => {
              const [yy, mm] = mo.split('-').map(Number)
              return <option key={mo} value={mo}>{MONTHS[mm - 1]} {yy + 543}</option>
            })}
          </select>
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* Filter tabs — เฉพาะแท็บเช็คชื่อ */}
        {recordType === 'attendance' && (
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
        )}

        {/* Loading */}
        {isLoading && <PageLoader fullPage={false} />}

        {/* ── เช็คชื่อ ──────────────────────────────────────────── */}
        {!isLoading && recordType === 'attendance' && (
          filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <ClipboardList size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีข้อมูลในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {filtered.map((r, i) => {
                const d = new Date(r.date)
                const isNoData = !r.check_in_at
                const totalFine = Number(r.fine ?? 0) + Number(r.carried_fine ?? 0)

                const iconBubbleClass = isNoData ? 'icon-bubble icon-bubble-purple'
                  : r.is_absent ? 'icon-bubble icon-bubble-orange'
                  : r.is_late ? 'icon-bubble icon-bubble-orange'
                  : 'icon-bubble icon-bubble-blue'

                const StatusIcon = isNoData ? XCircle : r.is_absent ? Ban : r.is_late ? Clock : CheckCircle2
                const statusColor = isNoData ? COLOR.textMuted : r.is_absent ? COLOR.error : r.is_late ? COLOR.warning : COLOR.success
                const statusLabel = isNoData ? 'ไม่มีข้อมูล' : r.is_absent ? 'นับเป็นขาด' : r.is_late ? `สาย ${r.late_minutes} น.` : 'ตรงเวลา'

                return (
                  <div key={r.id} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div className={iconBubbleClass}>
                      <StatusIcon size={22} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: COLOR.textPrimary }}>
                        {d.getDate()} {MONTHS[d.getMonth()]}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: COLOR.info, marginTop: 4, fontWeight: 500 }}>
                        {fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)} · {r.shift.name}
                      </div>
                      {r.is_outside_area && (
                        <span style={{ fontSize: '0.75rem', background: COLOR.warningBg, color: COLOR.warning, border: `1px solid ${COLOR.warningBorder}`, borderRadius: 99, padding: '2px 10px', fontWeight: 700, marginTop: 6, display: 'inline-block' }}>นอกพื้นที่</span>
                      )}
                      {totalFine > 0 && (
                        <div style={{ fontSize: '0.78rem', color: COLOR.error, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Wallet size={13} /> ค่าปรับ {totalFine} บาท
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: statusColor, whiteSpace: 'nowrap', background: isNoData ? '#f3f4f6' : r.is_absent ? COLOR.errorBg : r.is_late ? COLOR.warningBg : COLOR.successBg, padding: '6px 12px', borderRadius: 12 }}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── วันลา ─────────────────────────────────────────────── */}
        {!isLoading && recordType === 'leave' && (
          leaveFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <FileText size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีวันลาในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {leaveFiltered.map((r, i) => {
                const tc = LEAVE_TYPE_CFG[r.leave_type] ?? { label: r.leave_type, color: '#6B7280' }
                const sc = STATUS_CFG[r.status]
                const sameDay = r.start_date.slice(0, 10) === r.end_date.slice(0, 10)
                return (
                  <div key={r.id} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${tc.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={20} color={tc.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {sameDay ? fmtDateShort(r.start_date) : `${fmtDateShort(r.start_date)} – ${fmtDateShort(r.end_date)}`}
                        {r.has_conflict && <ConflictBadge />}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: tc.color, marginTop: 4, fontWeight: 700 }}>{tc.label} · {r.days} วัน</div>
                      {r.reason && <div style={{ fontSize: '0.78rem', color: COLOR.textMuted, marginTop: 3 }}>{r.reason}</div>}
                      {r.status === 'REJECTED' && r.reject_note && (
                        <div style={{ fontSize: '0.75rem', color: COLOR.error, marginTop: 4 }}>เหตุผล: {r.reject_note}</div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: sc.color, background: sc.bg, padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>{sc.label}</span>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── วันหยุด ───────────────────────────────────────────── */}
        {!isLoading && recordType === 'dayoff' && (
          dayoffFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Palmtree size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีวันหยุดในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {dayoffFiltered.map((r, i) => {
                const date = resolveDate(r.week_start, r.day_of_week)
                const sc = STATUS_CFG[r.status]
                return (
                  <div key={r.id} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${COLOR.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Palmtree size={20} color={COLOR.primary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        วัน{DAYS_TH[r.day_of_week]} {fmtDateShort(date)}
                        {r.has_conflict && <ConflictBadge />}
                      </div>
                      {r.status === 'REJECTED' && r.reject_note && (
                        <div style={{ fontSize: '0.75rem', color: COLOR.error, marginTop: 4 }}>เหตุผล: {r.reject_note}</div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: sc.color, background: sc.bg, padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>{sc.label}</span>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── นอกสถานที่ ────────────────────────────────────────── */}
        {!isLoading && recordType === 'offsite' && (
          offsiteFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <MapPin size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีเช็คอินนอกสถานที่ในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {offsiteFiltered.map((r, i) => {
                const isOpen = !r.check_out_at
                return (
                  <div key={r.id} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={20} color="#9333EA" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: COLOR.textPrimary }}>
                        {fmtDateShort(r.check_in_at)}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: COLOR.info, marginTop: 4, fontWeight: 500 }}>
                        {fmtTime(r.check_in_at)} → {fmtTime(r.check_out_at)}
                      </div>
                      {r.check_in_address && (
                        <div style={{ fontSize: '0.76rem', color: COLOR.textMuted, marginTop: 3, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <MapPin size={11} style={{ marginTop: 2, flexShrink: 0 }} /> {r.check_in_address}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isOpen ? '#9333EA' : COLOR.success, background: isOpen ? '#FAF5FF' : COLOR.successBg, padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                      {isOpen ? 'ยังไม่เช็คเอาต์' : 'เสร็จแล้ว'}
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
