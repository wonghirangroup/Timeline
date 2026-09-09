// employee/src/pages/history/index.tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Ban, Clock, XCircle, ClipboardList, Wallet, FileText, Palmtree, MapPin, AlertTriangle, PartyPopper } from 'lucide-react'
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
  shift: { name: string; start_time: string; fine_mode?: 'TIER' | 'PER_MINUTE' | null }
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
interface HolidayRec { date: string; name: string }

const MONTHS   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS_TH_FULL = ['วันอาทิตย์','วันจันทร์','วันอังคาร','วันพุธ','วันพฤหัสบดี','วันศุกร์','วันเสาร์']

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

// ── สถานะรายวันในแท็บ "เช็คชื่อ" ────────────────────────────────────
// รวม record จริง + วันลา/วันหยุด (APPROVED) + เสาร์อาทิตย์ + วันธรรมดาที่ผ่านมาแล้ว
// เพื่อไม่ให้วันที่ลา/หยุด/ขาด แสดงว่า "ไม่มีข้อมูล" เฉยๆ
type Tone = 'leave' | 'off' | 'holiday' | 'weekend'
type AttItem =
  | { kind: 'record'; date: string; rec: AttendanceRecord }
  | { kind: 'synthetic'; date: string; label: string; tone: Tone }

type DayStatus = { label: string; color: string; bg: string; Icon: typeof CheckCircle2; bubble: string }

const ST_LEAVE:   Omit<DayStatus, 'label'> = { color: '#0369a1', bg: '#e0f2fe', Icon: FileText,    bubble: 'icon-bubble icon-bubble-blue' }
const ST_OFF:     Omit<DayStatus, 'label'> = { color: '#475569', bg: '#f1f5f9', Icon: Palmtree,    bubble: 'icon-bubble icon-bubble-purple' }
const ST_HOLIDAY: Omit<DayStatus, 'label'> = { color: '#4338ca', bg: '#e0e7ff', Icon: PartyPopper, bubble: 'icon-bubble icon-bubble-purple' }
const ST_WEEKEND: Omit<DayStatus, 'label'> = { color: COLOR.textMuted, bg: '#f8fafc', Icon: Palmtree, bubble: 'icon-bubble icon-bubble-purple' }
const TONE_ST: Record<Tone, Omit<DayStatus, 'label'>> = { leave: ST_LEAVE, off: ST_OFF, holiday: ST_HOLIDAY, weekend: ST_WEEKEND }

function buildLeaveByDate(recs: LeaveRecord[]): Map<string, { label: string; off: boolean }> {
  const m = new Map<string, { label: string; off: boolean }>()
  for (const l of recs) {
    if (l.status !== 'APPROVED') continue
    const bracket = String(l.reason ?? '').match(/^\[(.+?)\]/)?.[1]
    const label = bracket ?? LEAVE_TYPE_CFG[l.leave_type]?.label ?? l.leave_type
    const off = !!bracket || l.leave_type === 'COMPENSATE'
    const start = new Date(l.start_date.slice(0, 10) + 'T00:00:00')
    const end   = new Date(l.end_date.slice(0, 10) + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue
      m.set(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, { label, off })
    }
  }
  return m
}
function buildOffDates(recs: WeeklyOffRecord[]): Set<string> {
  const s = new Set<string>()
  for (const w of recs) if (w.status === 'APPROVED') s.add(resolveDate(w.week_start, w.day_of_week))
  return s
}

function resolveItemStatus(
  it: AttItem,
  leaveByDate: Map<string, { label: string; off: boolean }>,
  offDates: Set<string>,
  holidayByDate: Map<string, string>,
  isWeekendOff: (dow: number) => boolean,
  todayStr: string,
): DayStatus {
  if (it.kind === 'synthetic')
    return { label: it.label, ...TONE_ST[it.tone] }

  const r = it.rec
  if (r.check_in_at) {
    if (r.is_late) {
      // โชว์จำนวนนาทีเฉพาะกะที่คิดค่าปรับแบบรายนาที — กะปกติ (คงที่ตามระดับ) โชว์แค่ "มาสาย"
      const lateLabel = r.shift.fine_mode === 'PER_MINUTE' ? `สาย ${r.late_minutes} นาที` : 'มาสาย'
      return { label: lateLabel, color: COLOR.warning, bg: COLOR.warningBg, Icon: Clock, bubble: 'icon-bubble icon-bubble-orange' }
    }
    return { label: 'ตรงเวลา', color: COLOR.success, bg: COLOR.successBg, Icon: CheckCircle2, bubble: 'icon-bubble icon-bubble-blue' }
  }
  // ไม่มีเช็คอิน — เรียงตาม: ลา > นักขัตฤกษ์ > จองหยุด > เสาร์อาทิตย์ที่เป็นวันหยุด > ขาด
  const lv = leaveByDate.get(it.date)
  if (lv) return lv.off ? { label: lv.label, ...ST_OFF } : { label: lv.label, ...ST_LEAVE }
  const hol = holidayByDate.get(it.date)
  if (hol) return { label: hol, ...ST_HOLIDAY }
  if (offDates.has(it.date)) return { label: 'หยุด', ...ST_OFF }

  const dow = new Date(it.date + 'T00:00:00').getDay()
  if (isWeekendOff(dow)) return { label: 'หยุดสุดสัปดาห์', ...ST_WEEKEND }
  if (r.is_absent) return { label: 'นับเป็นขาด', color: COLOR.error, bg: COLOR.errorBg, Icon: Ban, bubble: 'icon-bubble icon-bubble-orange' }
  if (it.date < todayStr) return { label: 'ขาดงาน', color: COLOR.error, bg: COLOR.errorBg, Icon: Ban, bubble: 'icon-bubble icon-bubble-orange' }
  return { label: 'ไม่มีข้อมูล', color: COLOR.textMuted, bg: '#f3f4f6', Icon: XCircle, bubble: 'icon-bubble icon-bubble-purple' }
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
    enabled: !!employee?.id,
  })

  const { data: dayoffRecords = [], isLoading: loadingDayoff } = useQuery<WeeklyOffRecord[]>({
    queryKey: ['employee', 'weekly-off-history', employee?.id],
    queryFn: () => api.get('/employee/weekly-off', { params: { employeeId: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const { data: offsiteRecords = [], isLoading: loadingOffsite } = useQuery<OffsiteRecord[]>({
    queryKey: ['employee', 'offsite-history', employee?.id],
    queryFn: () => api.get('/employee/offsite-checkins', { params: { employeeId: employee?.id } }).then(r => r.data.data),
    enabled: !!employee?.id,
  })

  const selYear = Number(selectedMonth.slice(0, 4)) || now.getFullYear()
  const { data: holidayRecs = [] } = useQuery<HolidayRec[]>({
    queryKey: ['employee', 'holidays', employee?.id, selYear],
    queryFn: () => api.get('/employee/holidays', { params: { year: selYear } })
      .then(r => (r.data.data as any[]).map(h => ({ date: String(h.date ?? '').slice(0, 10), name: h.name }))),
    enabled: !!employee?.id,
  })
  const holidayByDate = useMemo(() => {
    const m = new Map<string, string>()
    for (const h of holidayRecs) if (h.date) m.set(h.date, h.name)
    return m
  }, [holidayRecs])

  // ── เช็คชื่อ ──────────────────────────────────────────────────────
  // รายการเดือนใน dropdown — ช่วงต่อเนื่องจากเดือนแรกสุดที่มีข้อมูล → เดือนล่าสุด
  // (เติมเดือนที่ไม่มีข้อมูลด้วย ไม่ให้เดือนหายเป็นช่วง ๆ)
  const months = useMemo(() => {
    const s = new Set<string>()
    for (const r of records)        if (r.date)         s.add(r.date.slice(0, 7))
    for (const l of leaveRecords)    if (l.start_date)   s.add(l.start_date.slice(0, 7))
    for (const w of dayoffRecords)   s.add(resolveDate(w.week_start, w.day_of_week).slice(0, 7))
    for (const o of offsiteRecords)  if (o.check_in_at)  s.add(o.check_in_at.slice(0, 7))
    for (const h of holidayRecs)     if (h.date)         s.add(h.date.slice(0, 7))
    const cur = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    s.add(cur)
    const sorted = [...s].sort()
    let [y, m]   = sorted[0].split('-').map(Number)
    const [ey, em] = sorted[sorted.length - 1].split('-').map(Number)
    const out: string[] = []
    while ((y < ey || (y === ey && m <= em)) && out.length < 60) {
      out.push(`${y}-${pad(m)}`)
      if (++m > 12) { m = 1; y++ }
    }
    return out.reverse()
  }, [records, leaveRecords, dayoffRecords, offsiteRecords, holidayRecs])
  const allFiltered = records
    .filter(r => r.date.startsWith(selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date))

  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const leaveByDate = useMemo(() => buildLeaveByDate(leaveRecords), [leaveRecords])
  const offDates    = useMemo(() => buildOffDates(dayoffRecords), [dayoffRecords])

  // เสาร์/อาทิตย์เป็นวันหยุดไหม — ดูจากสถานะพนักงาน (saturday_rule/sunday_rule)
  // ไม่ผูกสถานะ หรือ rule ≠ WORK → ถือเป็นวันหยุด (ตรงกับที่คนส่วนใหญ่คาดหวัง);
  // ตั้ง rule = WORK เมื่อไหร่ วันนั้นกลับเป็นวันทำงานปกติ (สาย/ขาดได้)
  const isWeekendOff = useMemo(() => {
    // resolve จาก cascade 6 ชั้น ฝั่ง server (สถานะพนักงาน→ตำแหน่ง→…→กลุ่ม) — default OFF
    const sat = employee?.saturday_rule ?? 'OFF'
    const sun = employee?.sunday_rule ?? 'OFF'
    return (dow: number) => {
      if (dow === 6) return sat !== 'WORK'
      if (dow === 0) return sun !== 'WORK'
      return false
    }
  }, [employee])

  // record จริง + วันลา/หยุด (APPROVED) + วันหยุดนักขัตฤกษ์ ที่ผ่านมาแล้วและไม่มี record ในเดือนที่เลือก
  const attItems = useMemo<AttItem[]>(() => {
    const seen = new Set(allFiltered.map(r => r.date.slice(0, 10)))
    const items: AttItem[] = allFiltered.map(r => ({ kind: 'record' as const, date: r.date.slice(0, 10), rec: r }))
    const inMonth = (date: string) => date.slice(0, 7) === selectedMonth && date <= todayStr && !seen.has(date)
    for (const [date, info] of leaveByDate) {
      if (!inMonth(date)) continue
      items.push({ kind: 'synthetic', date, label: info.label, tone: info.off ? 'off' : 'leave' }); seen.add(date)
    }
    for (const [date, name] of holidayByDate) {
      if (!inMonth(date)) continue
      items.push({ kind: 'synthetic', date, label: name, tone: 'holiday' }); seen.add(date)
    }
    for (const date of offDates) {
      if (!inMonth(date)) continue
      items.push({ kind: 'synthetic', date, label: 'หยุด', tone: 'off' }); seen.add(date)
    }
    // เสาร์/อาทิตย์ที่เป็นวันหยุด — เติมทุกวันในเดือน (ที่ผ่านมาแล้ว) ที่ยังไม่มีรายการ
    const [yy, mm] = selectedMonth.split('-').map(Number)
    for (let day = 1; day <= new Date(yy, mm, 0).getDate(); day++) {
      const date = `${yy}-${pad(mm)}-${pad(day)}`
      const dow = new Date(date + 'T00:00:00').getDay()
      if (!isWeekendOff(dow) || !inMonth(date)) continue
      items.push({ kind: 'synthetic', date, label: 'หยุดสุดสัปดาห์', tone: 'weekend' }); seen.add(date)
    }
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }, [allFiltered, leaveByDate, offDates, holidayByDate, isWeekendOff, selectedMonth, todayStr])

  const resolved = attItems.map(it => ({ it, st: resolveItemStatus(it, leaveByDate, offDates, holidayByDate, isWeekendOff, todayStr) }))
  const cntOnTime = resolved.filter(x => x.st.label === 'ตรงเวลา').length
  const cntLate   = resolved.filter(x => x.it.kind === 'record' && x.it.rec.is_late).length
  const cntAbsent = resolved.filter(x => x.st.label === 'ขาดงาน' || x.st.label === 'นับเป็นขาด').length

  const displayItems = resolved.filter(({ it, st }) => {
    if (filterTab === 'ontime') return st.label === 'ตรงเวลา'
    if (filterTab === 'late')   return it.kind === 'record' && (it.rec.is_late || st.label === 'ขาดงาน' || st.label === 'นับเป็นขาด')
    return true
  })

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
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.9)', marginTop: 1 }}>
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
              <div className="header-stat-value">{cntOnTime} วัน</div>
            </div>
            <div className="header-stat-col">
              <div className="header-stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> มาสาย</div>
              <div className="header-stat-value">{cntLate} วัน</div>
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
              { key: 'all',    label: `ทั้งหมด (${resolved.length})` },
              { key: 'ontime', label: `ตรงเวลา (${cntOnTime})` },
              { key: 'late',   label: `สาย/ขาด (${cntLate + cntAbsent})` },
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
          displayItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <ClipboardList size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีข้อมูลในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {displayItems.map(({ it, st }, i) => {
                const d = new Date(it.date + 'T00:00:00')
                const rec = it.kind === 'record' ? it.rec : null
                const totalFine = rec ? Number(rec.fine ?? 0) + Number(rec.carried_fine ?? 0) : 0
                const StatusIcon = st.Icon

                return (
                  <div key={it.kind === 'record' ? it.rec.id : `syn-${it.date}`} className="glass-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms`, border: `1.5px solid ${st.color}`, background: `${st.bg}40` }}>
                    <div className={st.bubble}>
                      <StatusIcon size={22} strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: COLOR.textPrimary }}>
                        {d.getDate()} {MONTHS[d.getMonth()]}
                      </div>
                      {rec?.check_in_at ? (
                        <div style={{ fontSize: '0.88rem', color: COLOR.info, marginTop: 4, fontWeight: 500 }}>
                          {fmtTime(rec.check_in_at)} → {fmtTime(rec.check_out_at)} · {rec.shift.name}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: COLOR.textMuted, marginTop: 4, fontWeight: 500 }}>
                          {DAYS_TH_FULL[d.getDay()]} · {rec ? rec.shift.name : 'ไม่ต้องเช็คอิน'}
                        </div>
                      )}
                      {rec?.is_outside_area && (
                        <span style={{ fontSize: '0.75rem', background: COLOR.warningBg, color: COLOR.warning, border: `1px solid ${COLOR.warningBorder}`, borderRadius: 99, padding: '2px 10px', fontWeight: 700, marginTop: 6, display: 'inline-block' }}>นอกพื้นที่</span>
                      )}
                      {totalFine > 0 && (
                        <div style={{ fontSize: '0.78rem', color: COLOR.error, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Wallet size={13} /> ค่าปรับ {totalFine} บาท
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: st.color, background: '#fff', border: `1px solid ${st.color}`, padding: '6px 12px', borderRadius: 12, flexShrink: 0, maxWidth: 140, textAlign: 'right', lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {st.label}
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
                        {DAYS_TH_FULL[r.day_of_week]} {fmtDateShort(date)}
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
