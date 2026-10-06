// employee/src/pages/history/index.tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Ban, Clock, XCircle, ClipboardList, Wallet, FileText, Palmtree, MapPin, AlertTriangle, PartyPopper, CalendarDays, ChevronDown } from 'lucide-react'
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
const DAYS_TH = ['อา','จ','อ','พ','พฤ','ศ','ส']

const LEAVE_TYPE_CFG: Record<string, { label: string; color: string }> = {
  SICK:       { label: 'ลาป่วย',       color: '#3B82F6' },
  PERSONAL:   { label: 'ลากิจ',        color: '#8B5CF6' },
  VACATION:   { label: 'พักร้อน',      color: '#F59E0B' },
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
const ST_OFF:     Omit<DayStatus, 'label'> = { color: '#475569', bg: '#E6ECF4', Icon: Palmtree,    bubble: 'icon-bubble icon-bubble-purple' }
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
const isOffLeave = (l: LeaveRecord) => !!String(l.reason ?? '').match(/^\[(.+?)\]/) || l.leave_type === 'COMPENSATE'
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
  isWeekendOff: (dow: number, date?: string) => boolean,
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
  if (isWeekendOff(dow, it.date)) return { label: 'หยุดสุดสัปดาห์', ...ST_WEEKEND }
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
    // สถานะ "โควต้า = เสาร์-อาทิตย์ของเดือน": เดือนไหนมีวันหยุดจองอนุมัติแล้ว เสาร์-อาทิตย์ไม่ใช่วันหยุดอัตโนมัติ (หยุดเฉพาะวันที่อนุมัติ)
    const pool = employee?.off_quota_mode === 'WEEKENDS_IN_MONTH'
    return (dow: number, date?: string) => {
      if (pool && date) { for (const d of offDates) if (d.startsWith(date.slice(0, 7))) return false }
      if (dow === 6) return sat !== 'WORK'
      if (dow === 0) return sun !== 'WORK'
      return false
    }
  }, [employee, offDates])

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
      if (!isWeekendOff(dow, date) || !inMonth(date)) continue
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
  const leaveFiltered   = leaveRecords.filter(r => !isOffLeave(r) && r.start_date.slice(0, 7) === selectedMonth).sort((a, b) => b.start_date.localeCompare(a.start_date))
  const dayoffFiltered  = dayoffRecords.filter(r => resolveDate(r.week_start, r.day_of_week).slice(0, 7) === selectedMonth).sort((a, b) => b.week_start.localeCompare(a.week_start))
  const offsiteFiltered = offsiteRecords.filter(r => r.check_in_at.slice(0, 7) === selectedMonth).sort((a, b) => b.check_in_at.localeCompare(a.check_in_at))
  // แท็บ "วันหยุด" รวมทั้งวันหยุดที่จองประจำเดือน + วันหยุดนักขัตฤกษ์ เข้าด้วยกัน
  // (feedback 2026-09-15: เดิมแยกกันคนละที่ ดูยาก) — เรียงตามวันที่ล่าสุดก่อน
  const holidayFiltered = holidayRecs.filter(h => h.date.startsWith(selectedMonth))
  // แท็บ "วันหยุด" = ทุกอย่างที่เป็นหยุด: วันหยุดที่จอง + นักขัตฤกษ์ + หยุดสุดสัปดาห์ตามสถานะ + วันลาประเภทหยุด (ชดเชย ฯลฯ) — ประเภท "ลา" จริงอยู่แท็บวันลา
  const dayoffMerged: ({ kind: 'booking'; date: string; rec: WeeklyOffRecord } | { kind: 'holiday'; date: string; name: string } | { kind: 'weekend'; date: string } | { kind: 'offleave'; date: string; rec: LeaveRecord; label: string })[] = (() => {
    const out: ({ kind: 'booking'; date: string; rec: WeeklyOffRecord } | { kind: 'holiday'; date: string; name: string } | { kind: 'weekend'; date: string } | { kind: 'offleave'; date: string; rec: LeaveRecord; label: string })[] = [
      ...dayoffFiltered.map(r => ({ kind: 'booking' as const, date: resolveDate(r.week_start, r.day_of_week), rec: r })),
      ...holidayFiltered.map(h => ({ kind: 'holiday' as const, date: h.date, name: h.name })),
      ...leaveRecords.filter(r => isOffLeave(r) && r.start_date.slice(0, 7) === selectedMonth).map(r => ({
        kind: 'offleave' as const, date: r.start_date.slice(0, 10), rec: r,
        label: String(r.reason ?? '').match(/^\[(.+?)\]/)?.[1] ?? LEAVE_TYPE_CFG[r.leave_type]?.label ?? r.leave_type,
      })),
    ]
    const taken = new Set(out.map(x => x.date))
    const [yy, mm] = selectedMonth.split('-').map(Number)
    for (let day = 1; day <= new Date(yy, mm, 0).getDate(); day++) {
      const date = `${yy}-${pad(mm)}-${pad(day)}`
      const dow = new Date(date + 'T00:00:00').getDay()
      if (taken.has(date) || !isWeekendOff(dow, date)) continue
      out.push({ kind: 'weekend' as const, date })
    }
    return out.sort((a, b) => b.date.localeCompare(a.date))
  })()

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
    <div className="page-container hx-page" style={{ maxWidth: 430, margin: '0 auto', background: '#EAF4FF url(/checkin/bg.webp) center top / cover fixed no-repeat' }}>
      <style>{`
        .hx-card { background: #fff; border-radius: 26px; box-shadow: 0 6px 22px rgba(36,75,131,0.08); border: 1.5px solid #E3ECF8 }
        .hx-late { border-color: #FB923C !important; box-shadow: 0 0 0 4px rgba(251,146,60,0.14), 0 10px 28px rgba(251,146,60,0.22) !important; background: #FFFBF5 !important }
        .hx-tab { transition: background .15s, transform .12s }
        .hx-tab:active { transform: scale(.96) }
        @keyframes hx-owl { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @media (prefers-reduced-motion: reduce) { .hx-owl { animation: none !important } }
      `}</style>

      <div style={{ padding: '16px 16px 120px' }}>

        {/* ── แบนเนอร์หัวหน้า (ท้องฟ้า+เมฆ+นกฮูกถือปฏิทิน) ───────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, padding: '24px 22px', minHeight: 150,
          background: 'linear-gradient(135deg, #1B6EF0 0%, #3B9BFF 100%)', boxShadow: '0 12px 30px rgba(27,110,240,0.28)' }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: 108, top: 16, width: 90, height: 34, borderRadius: 99, background: 'rgba(255,255,255,0.22)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', left: -30, bottom: -34, width: 190, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.28)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', left: 90, bottom: -42, width: 170, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', right: -24, bottom: -40, width: 200, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', left: 150, top: 22, color: '#BFE0FF', fontSize: '1.1rem' }}>✦</span>
          <span aria-hidden="true" style={{ position: 'absolute', right: 18, top: 24, color: '#FFD76A', fontSize: '1rem' }}>✦</span>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '62%' }}>
            <div style={{ fontWeight: 800, fontSize: '2.2rem', color: '#fff', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,40,120,0.25)' }}>ประวัติ</div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.95)', marginTop: 10, lineHeight: 1.4 }}>
              {employee ? `${employee.first_name} ${employee.last_name} · ${employee.branch.name}` : ''}
            </div>
          </div>
          <img src="/checkin/owl-calendar.webp" alt="" aria-hidden="true" draggable={false} className="hx-owl"
            style={{ position: 'absolute', right: -6, bottom: -8, width: 158, height: 158, objectFit: 'contain', zIndex: 2, pointerEvents: 'none' }} />
        </div>

        {/* ── แท็บประเภท ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, padding: 8, borderRadius: 26, background: 'linear-gradient(180deg, #2F86F2, #1D6FE0)', boxShadow: '0 8px 22px rgba(29,111,224,0.28)' }}>
          {TABS.map(t => {
            const active = recordType === t.id
            return (
              <button key={t.id} className="hx-tab" onClick={() => setRecordType(t.id)} aria-pressed={active}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '11px 2px 9px', borderRadius: 18, border: active ? 'none' : '1px solid rgba(255,255,255,0.28)', cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? '#fff' : 'rgba(255,255,255,0.16)', color: active ? '#1D4ED8' : '#fff', boxShadow: active ? '0 4px 12px rgba(0,40,120,0.18)' : 'none' }}>
                <t.Icon size={22} strokeWidth={2} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── เลือกเดือน ──────────────────────────────────────────── */}
        <div style={{ position: 'relative', marginTop: 14, height: 58, borderRadius: 22, background: '#fff', boxShadow: '0 6px 20px rgba(36,75,131,0.10)', border: '1.5px solid #E3ECF8', overflow: 'hidden' }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: 70, bottom: -24, width: 130, height: 56, borderRadius: '50%', background: '#DCEBFB' }} />
          <span aria-hidden="true" style={{ position: 'absolute', right: 20, bottom: -26, width: 90, height: 50, borderRadius: '50%', background: '#E8F1FC' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, height: '100%', padding: '0 20px' }}>
            <CalendarDays size={26} color="#1D6FE0" strokeWidth={2} />
            <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0B3A9E' }}>
              {(() => { const [yy, mm] = selectedMonth.split('-').map(Number); return `${MONTHS[mm - 1]} ${yy + 543}` })()}
            </span>
            <ChevronDown size={22} color="#F97316" strokeWidth={3} style={{ marginLeft: 'auto' }} />
          </div>
          <select aria-label="เลือกเดือน" value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); setFilterTab('all') }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: '16px' }}>
            {displayMonths.map(mo => {
              const [yy, mm] = mo.split('-').map(Number)
              return <option key={mo} value={mo}>{MONTHS[mm - 1]} {yy + 543}</option>
            })}
          </select>
        </div>

        {/* ── สรุป ตรงเวลา / มาสาย (เฉพาะแท็บเช็คชื่อ) ──────────────── */}
        {recordType === 'attendance' && (
          <div style={{ position: 'relative', overflow: 'hidden', marginTop: 14, display: 'flex', alignItems: 'center', borderRadius: 26, padding: '16px 18px', background: 'rgba(255,255,255,0.94)', border: '1.5px solid #E3ECF8', boxShadow: '0 6px 22px rgba(36,75,131,0.08)' }}>
            <img src="/checkin/owl-ghost2.webp" alt="" aria-hidden="true" draggable={false}
              style={{ position: 'absolute', right: -52, bottom: -56, width: 128, height: 128, opacity: 0.45, pointerEvents: 'none' }} />
            {[
              { label: 'ตรงเวลา', value: cntOnTime, Icon: Clock, color: '#15803D', tile: '#DCFCE7' },
              { label: 'มาสาย',   value: cntLate,   Icon: Clock, color: '#EA580C', tile: '#FFEDD5' },
            ].map((x, i) => (
              <div key={x.label} style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: i ? 16 : 0, borderLeft: i ? '1.5px solid #DCE6F5' : 'none' }}>
                <div style={{ width: 50, height: 50, borderRadius: 16, background: x.tile, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <x.Icon size={26} color={x.color} strokeWidth={2.3} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', color: '#1E2A4A' }}>{x.label}</div>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0F1B3D', lineHeight: 1.1 }}>
                    {x.value} <span style={{ fontSize: '1.4rem' }}>วัน</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ตัวกรอง (เฉพาะแท็บเช็คชื่อ) ──────────────────────────── */}
        {recordType === 'attendance' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 14, padding: 7, borderRadius: 99, background: 'rgba(235,243,254,0.95)', border: '1px solid #DCE8F8' }}>
            {([
              { key: 'all',    label: `ทั้งหมด (${resolved.length})` },
              { key: 'ontime', label: `ตรงเวลา (${cntOnTime})` },
              { key: 'late',   label: `สาย/ขาด (${cntLate + cntAbsent})` },
            ] as { key: FilterTab; label: string }[]).map(t => {
              const on = filterTab === t.key
              return (
                <button key={t.key} className="hx-tab" onClick={() => setFilterTab(t.key)} aria-pressed={on}
                  style={{ flex: on ? 1.25 : 1, padding: '13px 4px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap',
                    background: on ? 'linear-gradient(180deg, #2563EB, #1740B8)' : 'rgba(214,228,248,0.7)', color: on ? '#fff' : '#475569', boxShadow: on ? '0 6px 16px rgba(23,64,184,0.35)' : 'none' }}>
                  {t.label}
                </button>
              )
            })}
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
                  <div key={it.kind === 'record' ? it.rec.id : `syn-${it.date}`} className={`hx-card animate-slide-up${rec?.is_late || st.label === 'ขาดงาน' || st.label === 'นับเป็นขาด' ? ' hx-late' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div style={{ width: 62, height: 62, borderRadius: 20, background: `${st.color}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <StatusIcon size={30} color={st.color} strokeWidth={2.3} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0B1220' }}>
                        {d.getDate()} {MONTHS[d.getMonth()]} {DAYS_TH[d.getDay()]}
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

                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: st.color, background: '#fff', border: `1px solid ${st.color}`, padding: '6px 12px', borderRadius: 16, flexShrink: 0, maxWidth: 140, textAlign: 'right', lineHeight: 1.3, wordBreak: 'break-word' }}>
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
                  <div key={r.id} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
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

        {/* ── วันหยุด (วันหยุดที่จอง + วันหยุดนักขัตฤกษ์ รวมกัน) ──── */}
        {!isLoading && recordType === 'dayoff' && (
          dayoffMerged.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <Palmtree size={48} style={{ opacity: 0.4, marginBottom: 16 }} color={COLOR.textMuted} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: COLOR.textMuted }}>ไม่มีวันหยุดในเดือนนี้</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {dayoffMerged.map((item, i) => {
                if (item.kind === 'holiday') {
                  return (
                    <div key={`hol-${item.date}`} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PartyPopper size={20} color="#4338ca" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary }}>
                          {fmtDateShort(item.date)} · {item.name}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>นักขัตฤกษ์</span>
                    </div>
                  )
                }
                if (item.kind === 'weekend') {
                  return (
                    <div key={`we-${item.date}`} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Palmtree size={20} color="#64748B" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary }}>{fmtDateShort(item.date)}</div>
                        <div style={{ fontSize: '0.8rem', color: COLOR.textMuted, marginTop: 3 }}>{DAYS_TH_FULL[new Date(item.date + 'T00:00:00').getDay()]}</div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', background: '#F1F5F9', padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>หยุดสุดสัปดาห์</span>
                    </div>
                  )
                }
                if (item.kind === 'offleave') {
                  const lr = item.rec
                  const sc2 = STATUS_CFG[lr.status]
                  const sameDay = lr.start_date.slice(0, 10) === lr.end_date.slice(0, 10)
                  return (
                    <div key={`ol-${lr.id}`} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Palmtree size={20} color="#059669" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary }}>
                          {sameDay ? fmtDateShort(lr.start_date) : `${fmtDateShort(lr.start_date)} – ${fmtDateShort(lr.end_date)}`}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#059669', marginTop: 4, fontWeight: 700 }}>{item.label} · {lr.days} วัน</div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: sc2.color, background: sc2.bg, padding: '5px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>{sc2.label}</span>
                    </div>
                  )
                }
                const r = item.rec
                const sc = STATUS_CFG[r.status]
                return (
                  <div key={r.id} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${COLOR.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Palmtree size={20} color={COLOR.primary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {DAYS_TH_FULL[r.day_of_week]} {fmtDateShort(item.date)}
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
                  <div key={r.id} className="hx-card animate-slide-up" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', animationDelay: `${i * 35}ms` }}>
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
