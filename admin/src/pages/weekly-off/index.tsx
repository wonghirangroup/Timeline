// admin/src/pages/weekly-off/index.tsx  [MOCK MODE]
import { useState, useMemo, useEffect } from 'react'
import { Pencil, Trash2, Check, X, CalendarDays, Smartphone } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { useIsMobile } from '../../hooks/useIsMobile'
import HolidayPage from '../holiday'
import LiffPreview from './LiffPreview'

type WeeklyOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface WeeklyOffBooking {
  id: string; employee_id: string; week_start: string; day_of_week: number; status: WeeklyOffStatus
  reject_note?: string | null
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } }
}
interface ApiBranch   { id: string; name: string }
interface ApiEmployee { id: string; first_name: string; last_name: string; nickname: string | null; branch: { id: string; name: string } }

// ── Holiday Types ──────────────────────────────────────────────────────────────
type HolidayType = 'NATIONAL' | 'COMPANY' | 'RELIGIOUS'
interface HolidayEntry { date: string; name: string; type: HolidayType }

const HOL_CFG: Record<HolidayType, { color: string; bg: string; border: string }> = {
  NATIONAL:  { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  RELIGIOUS: { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  COMPANY:   { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
}

const HOLIDAY_DATA_2026: HolidayEntry[] = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่',                         type: 'NATIONAL'  },
  { date: '2026-01-02', name: 'หยุดชดเชยวันขึ้นปีใหม่',                type: 'COMPANY'   },
  { date: '2026-02-12', name: 'วันมาฆบูชา',                             type: 'RELIGIOUS' },
  { date: '2026-04-06', name: 'วันจักรี',                               type: 'NATIONAL'  },
  { date: '2026-04-13', name: 'วันสงกรานต์',                            type: 'NATIONAL'  },
  { date: '2026-04-14', name: 'วันสงกรานต์ (วันครอบครัว)',              type: 'NATIONAL'  },
  { date: '2026-04-15', name: 'วันสงกรานต์ (วันผู้สูงอายุ)',            type: 'NATIONAL'  },
  { date: '2026-04-16', name: 'หยุดพิเศษสงกรานต์',                      type: 'COMPANY'   },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ',                     type: 'NATIONAL'  },
  { date: '2026-05-11', name: 'วันวิสาขบูชา',                           type: 'RELIGIOUS' },
  { date: '2026-05-13', name: 'วันฉัตรมงคล',                            type: 'NATIONAL'  },
  { date: '2026-06-03', name: 'เฉลิมพระชนมพรรษา พระบรมราชินี',        type: 'NATIONAL'  },
  { date: '2026-07-10', name: 'วันอาสาฬหบูชา',                          type: 'RELIGIOUS' },
  { date: '2026-07-11', name: 'วันเข้าพรรษา',                           type: 'RELIGIOUS' },
  { date: '2026-07-28', name: 'เฉลิมพระชนมพรรษา ร.10',                 type: 'NATIONAL'  },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ',                         type: 'NATIONAL'  },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9',                 type: 'NATIONAL'  },
  { date: '2026-10-23', name: 'วันปิยมหาราช',                           type: 'NATIONAL'  },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ',                         type: 'NATIONAL'  },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ',                          type: 'NATIONAL'  },
  { date: '2026-12-28', name: 'วันหยุดพักผ่อนบริษัท',                   type: 'COMPANY'   },
  { date: '2026-12-31', name: 'วันสิ้นปี',                              type: 'NATIONAL'  },
]

const STATIC_HOL_MAP = new Map<string, HolidayEntry[]>()
HOLIDAY_DATA_2026.forEach(h => {
  if (!STATIC_HOL_MAP.has(h.date)) STATIC_HOL_MAP.set(h.date, [])
  STATIC_HOL_MAP.get(h.date)!.push(h)
})

// ── Branch holiday entitlements ────────────────────────────────────────────────
// สาขา br-01 ได้ทุกวันหยุด, br-02/br-04 ได้เฉพาะปีใหม่+สงกรานต์
const BRANCH_HOL_DATES: Record<string, Set<string>> = {
  'br-01': new Set(HOLIDAY_DATA_2026.map(h => h.date)),
  'br-02': new Set(['2026-01-01','2026-04-13','2026-04-14','2026-04-15']),
  'br-04': new Set(['2026-01-01','2026-04-13','2026-04-14','2026-04-15']),
}

// ── Compensatory Day ──────────────────────────────────────────────────────────
interface CompDay {
  id: string; employee_name: string; branch_id: string; branch: string
  holiday_date: string; holiday_name: string; status: 'PENDING' | 'APPROVED' | 'DISMISSED'
}

const INIT_COMP_DAYS: CompDay[] = [
  { id: 'cp-01', employee_name: 'ชาย (สมชาย ใจดี)', branch_id: 'br-01', branch: 'วงษ์หิรัญ',
    holiday_date: '2026-06-03', holiday_name: 'เฉลิมพระชนมพรรษา พระบรมราชินี', status: 'PENDING' },
  { id: 'cp-02', employee_name: 'วัฒน์ (ธนวัฒน์ มงคล)', branch_id: 'br-01', branch: 'วงษ์หิรัญ',
    holiday_date: '2026-06-03', holiday_name: 'เฉลิมพระชนมพรรษา พระบรมราชินี', status: 'PENDING' },
]

// ── Mock Data ──────────────────────────────────────────────────────────────────
let _woSeq = 100
function genWoId() { return `wo-mock-${_woSeq++}` }

const MOCK_EMPLOYEES_WO: ApiEmployee[] = [
  { id: 'em-01', first_name: 'สมชาย',    last_name: 'ใจดี',         nickname: 'ชาย',   branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-02', first_name: 'วิภาวดี',  last_name: 'ศรีสุข',       nickname: 'แนน',   branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-03', first_name: 'ธนวัฒน์',  last_name: 'มงคล',         nickname: 'วัฒน์', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-04', first_name: 'นันทิชา',  last_name: 'พรหมบุตร',     nickname: 'แพรว',  branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
  { id: 'em-05', first_name: 'กมลชัย',   last_name: 'ทองดี',         nickname: 'เดียว', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-06', first_name: 'สุดารัตน์',last_name: 'เจริญสุข',      nickname: 'ต้าร์', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-07', first_name: 'บุญมา',    last_name: 'สีดา',          nickname: 'บุญ',   branch: { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' } },
  { id: 'em-08', first_name: 'รัตนา',    last_name: 'แก้วมณี',       nickname: 'แนน',   branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
  { id: 'em-09', first_name: 'ประเสริฐ', last_name: 'ศรีวิชัย',      nickname: 'เสริฐ', branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-10', first_name: 'มณีรัตน์', last_name: 'ปานแก้ว',       nickname: 'มณี',   branch: { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' } },
  { id: 'em-11', first_name: 'วรวุฒิ',   last_name: 'อินทร์ชัย',     nickname: 'วุฒิ',  branch: { id: 'br-01', name: 'วงษ์หิรัญ' } },
  { id: 'em-12', first_name: 'สิริพร',   last_name: 'ฤทธิ์เดช',      nickname: 'ส้ม',   branch: { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' } },
]
const MOCK_BRANCHES_WO: ApiBranch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ' },
  { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง' },
  { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก' },
]

// ── Helper สร้าง booking ──────────────────────────────────────────────────────
function mk(id: string, empIdx: number, weekStart: string, dow: number, status: WeeklyOffBooking['status'], code: string, rejectNote?: string): WeeklyOffBooking {
  const e = MOCK_EMPLOYEES_WO[empIdx]
  return { id, employee_id: e.id, week_start: weekStart, day_of_week: dow, status, reject_note: rejectNote ?? null, employee: { ...e, employee_code: code } }
}

// actualDate ด่วน: week_start '2026-06-08' (จันทร์), dow=1 → 8 มิ.ย., dow=2 → 9, dow=3 → 10 ...
// week_start '2026-06-15' dow=1 → 15, dow=2 → 16, dow=4 → 18, dow=5 → 19
// week_start '2026-06-22' dow=2 → 23, dow=4 → 25
// week_start '2026-06-01' dow=1 → 1, dow=5 → 5
const MOCK_BOOKINGS_INIT: WeeklyOffBooking[] = [
  // ── 2 มิ.ย. (อังคาร) — 1 คน ────────────────────────────────────────────────
  mk('wo-01', 0, '2026-06-01', 2, 'APPROVED', '2567-03-001'),

  // ── 5 มิ.ย. (ศุกร์) — 2 คน ──────────────────────────────────────────────────
  mk('wo-02', 1, '2026-06-01', 5, 'APPROVED', '2567-02-002'),
  mk('wo-03', 7, '2026-06-01', 5, 'PENDING',  '2567-03-008'),

  // ── 7 มิ.ย. (อาทิตย์) — 3 คน ────────────────────────────────────────────────
  mk('wo-04', 3, '2026-06-01', 0, 'APPROVED', '2567-03-004'),
  mk('wo-05', 9, '2026-06-01', 0, 'APPROVED', '2567-04-010'),
  mk('wo-06', 6, '2026-06-01', 0, 'PENDING',  '2567-04-007'),

  // ── 8 มิ.ย. (จันทร์/วันนี้) — 7 คน → เห็น +5 more ───────────────────────────
  mk('wo-07', 0,  '2026-06-08', 1, 'APPROVED', '2567-03-001'),
  mk('wo-08', 2,  '2026-06-08', 1, 'APPROVED', '2567-04-003'),
  mk('wo-09', 4,  '2026-06-08', 1, 'PENDING',  '2567-03-005'),
  mk('wo-10', 5,  '2026-06-08', 1, 'PENDING',  '2567-03-006'),
  mk('wo-11', 8,  '2026-06-08', 1, 'APPROVED', '2567-03-009'),
  mk('wo-12', 10, '2026-06-08', 1, 'REJECTED', '2567-03-011', 'กะดึกวันจันทร์'),
  mk('wo-13', 11, '2026-06-08', 1, 'PENDING',  '2567-02-012'),

  // ── 10 มิ.ย. (พุธ) — 4 คน ───────────────────────────────────────────────────
  mk('wo-14', 1,  '2026-06-08', 3, 'APPROVED', '2567-02-002'),
  mk('wo-15', 7,  '2026-06-08', 3, 'PENDING',  '2567-03-008'),
  mk('wo-16', 9,  '2026-06-08', 3, 'APPROVED', '2567-04-010'),
  mk('wo-17', 3,  '2026-06-08', 3, 'PENDING',  '2567-03-004'),

  // ── 12 มิ.ย. (ศุกร์) — 2 คน ─────────────────────────────────────────────────
  mk('wo-18', 6,  '2026-06-08', 5, 'APPROVED', '2567-04-007'),
  mk('wo-19', 10, '2026-06-08', 5, 'PENDING',  '2567-04-010'),

  // ── 15 มิ.ย. (จันทร์) — 5 คน → เห็น +3 more ─────────────────────────────────
  mk('wo-20', 0,  '2026-06-15', 1, 'APPROVED', '2567-03-001'),
  mk('wo-21', 4,  '2026-06-15', 1, 'APPROVED', '2567-03-005'),
  mk('wo-22', 5,  '2026-06-15', 1, 'PENDING',  '2567-03-006'),
  mk('wo-23', 8,  '2026-06-15', 1, 'REJECTED', '2567-03-009', 'ต้องสต็อกของ'),
  mk('wo-24', 11, '2026-06-15', 1, 'APPROVED', '2567-02-012'),

  // ── 16 มิ.ย. (อังคาร) — 3 คน ────────────────────────────────────────────────
  mk('wo-25', 2,  '2026-06-15', 2, 'PENDING',  '2567-04-003'),
  mk('wo-26', 7,  '2026-06-15', 2, 'APPROVED', '2567-03-008'),
  mk('wo-27', 9,  '2026-06-15', 2, 'PENDING',  '2567-04-010'),

  // ── 18 มิ.ย. (พฤหัส) — 2 คน ─────────────────────────────────────────────────
  mk('wo-28', 3,  '2026-06-15', 4, 'APPROVED', '2567-03-004'),
  mk('wo-29', 6,  '2026-06-15', 4, 'PENDING',  '2567-04-007'),

  // ── 22 มิ.ย. (จันทร์) — 4 คน ────────────────────────────────────────────────
  mk('wo-30', 1,  '2026-06-22', 1, 'APPROVED', '2567-02-002'),
  mk('wo-31', 4,  '2026-06-22', 1, 'PENDING',  '2567-03-005'),
  mk('wo-32', 10, '2026-06-22', 1, 'APPROVED', '2567-04-010'),
  mk('wo-33', 11, '2026-06-22', 1, 'PENDING',  '2567-02-012'),

  // ── 25 มิ.ย. (พฤหัส) — 2 คน ─────────────────────────────────────────────────
  mk('wo-34', 5,  '2026-06-22', 4, 'APPROVED', '2567-03-006'),
  mk('wo-35', 8,  '2026-06-22', 4, 'PENDING',  '2567-03-009'),
]

// ── Config ────────────────────────────────────────────────────────────────────
const DAYS_TH   = ['อา','จ','อ','พ','พฤ','ศ','ส']
const DAYS_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const BRANCH_COLORS = ['#f97316','#6366f1','#0891b2','#16a34a','#a21caf','#d97706','#dc2626']

const WO_CFG: Record<WeeklyOffStatus,{ label: string; color: string; bg: string; border: string }> = {
  PENDING:  { label: 'รอพิจารณา', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  APPROVED: { label: 'อนุมัติ',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  REJECTED: { label: 'ไม่อนุมัติ',color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
}

// ── Date utils ────────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date)   { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function toYYYYMM(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}` }

function actualDate(weekStart: string, dow: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function empName(w: WeeklyOffBooking)   { return w.employee.nickname ?? w.employee.first_name }
function empFull(w: WeeklyOffBooking)   { return `${w.employee.first_name} ${w.employee.last_name}` }
function empBranch(w: WeeklyOffBooking) { return w.employee.branch.name }

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WeeklyOffPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const today = new Date()
  const [month,    setMonth]    = useState(toYYYYMM(today))
  const [bookings, setBookings] = useState<WeeklyOffBooking[]>(MOCK_BOOKINGS_INIT)
  const [employees] = useState<ApiEmployee[]>(MOCK_EMPLOYEES_WO)
  const [branches]  = useState<ApiBranch[]>(MOCK_BRANCHES_WO)
  const [saving,    setSaving]  = useState(false)

  // UI state
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null)
  const [showPreview,     setShowPreview]     = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowPreview(false); setShowLiffPreview(false); setModal(null) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const [branchFilter,    setBranchFilter]    = useState('')
  const [modal,           setModal]           = useState<{ mode: 'add'; date: string } | { mode: 'edit'; booking: WeeklyOffBooking } | null>(null)
  const [form,            setForm]            = useState({ employee_id: '', day_of_week: 1 })
  const [deleteTarget,    setDeleteTarget]    = useState<WeeklyOffBooking | null>(null)
  const [showHolidays,    setShowHolidays]    = useState(true)
  const [showHolidayMgmt, setShowHolidayMgmt] = useState(false)
  const [compDays,        setCompDays]        = useState<CompDay[]>(INIT_COMP_DAYS)
  const [showCompPanel,   setShowCompPanel]   = useState(false)

  // ── Booking rounds — key = `${branchId}::${monthStr}` ─────────────────────
  const [bookingRounds, setBookingRounds] = useState<Record<string, 'OPEN' | 'CLOSED'>>({
    'br-01::2026-06': 'OPEN',
  })
  const [showLiffPreview, setShowLiffPreview] = useState(false)
  const [liffBranch, setLiffBranch] = useState('br-01')

  function toggleRound(branchId: string, monthStr: string) {
    const key = `${branchId}::${monthStr}`
    setBookingRounds(prev => ({ ...prev, [key]: prev[key] === 'OPEN' ? 'CLOSED' : 'OPEN' }))
    const next = bookingRounds[`${branchId}::${monthStr}`] === 'OPEN' ? 'ปิด' : 'เปิด'
    const brName = MOCK_BRANCHES_WO.find(b => b.id === branchId)?.name ?? branchId
    showToast('success', `${next}การจองวันหยุด — ${brName}`)
  }

  function roundStatus(branchId: string, monthStr: string): 'OPEN' | 'CLOSED' {
    return bookingRounds[`${branchId}::${monthStr}`] ?? 'CLOSED'
  }

  // ── Day-off slot config ────────────────────────────────────────────────────
  // key = `${branchId}::${monthStr}`, value = sorted date strings
  const [dayOffSlots,   setDayOffSlots]   = useState<Record<string, string[]>>({
    'br-01::2026-06': ['2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23', '2026-06-30'],
  })
  const [showSlotCfg,  setShowSlotCfg]   = useState(false)
  const [slotBranch,   setSlotBranch]    = useState(MOCK_BRANCHES_WO[0].id)
  const [slotMonth,    setSlotMonth]     = useState(toYYYYMM(today))
  const [slotPicks,    setSlotPicks]     = useState<Set<string>>(new Set())
  const [slotSaving,   setSlotSaving]    = useState(false)

  function openSlotCfg() {
    const key = `${slotBranch}::${slotMonth}`
    setSlotPicks(new Set(dayOffSlots[key] ?? []))
    setShowSlotCfg(true)
  }

  function changeSlotMonth(delta: number) {
    const [sy, sm] = slotMonth.split('-').map(Number)
    const d = new Date(sy, sm - 1 + delta, 1)
    const nm = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    setSlotMonth(nm)
    setSlotPicks(new Set(dayOffSlots[`${slotBranch}::${nm}`] ?? []))
  }

  function onSlotBranchChange(bid: string) {
    setSlotBranch(bid)
    setSlotPicks(new Set(dayOffSlots[`${bid}::${slotMonth}`] ?? []))
  }

  function toggleSlotDate(dateStr: string) {
    setSlotPicks(prev => {
      const next = new Set(prev)
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
  }

  async function saveSlotConfig() {
    setSlotSaving(true)
    await new Promise(r => setTimeout(r, 500))
    const key = `${slotBranch}::${slotMonth}`
    setDayOffSlots(prev => ({ ...prev, [key]: Array.from(slotPicks).sort() }))
    setSlotSaving(false)
    setShowSlotCfg(false)
    showToast('success', `บันทึกวันจองสำหรับ ${MOCK_BRANCHES_WO.find(b => b.id === slotBranch)?.name} เดือน ${fmtMonthSlot(slotMonth)} แล้ว`)
  }

  function fmtMonthSlot(ym: string) {
    const [sy, sm] = ym.split('-').map(Number)
    return `${MONTHS_TH[sm - 1]} ${sy + 543}`
  }

  // ── Calendar days ──────────────────────────────────────────────────────────
  const [y, m] = month.split('-').map(Number)
  const firstDay    = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const byDate = useMemo(() => {
    const map: Record<string, WeeklyOffBooking[]> = {}
    bookings.forEach(w => {
      const d = actualDate(w.week_start, w.day_of_week)
      if (!map[d]) map[d] = []
      if (!branchFilter || w.employee.branch.id === branchFilter) map[d].push(w)
    })
    return map
  }, [bookings, branchFilter])

  const branchColor = (name: string) => {
    const list = [...new Set(bookings.map(w => empBranch(w)))]
    return BRANCH_COLORS[list.indexOf(name) % BRANCH_COLORS.length]
  }

  const pendingAll = bookings
    .filter(w => w.status === 'PENDING' && (!branchFilter || w.employee.branch.id === branchFilter))
    .sort((a, b) => actualDate(a.week_start, a.day_of_week).localeCompare(actualDate(b.week_start, b.day_of_week)))

  const selectedBookings = selectedDate ? (byDate[selectedDate] ?? []) : []

  const pendingComp = compDays.filter(c => c.status === 'PENDING')

  async function approveComp(id: string) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setCompDays(prev => prev.map(c => c.id === id ? { ...c, status: 'APPROVED' } : c))
    showToast('success', '+1 วันชดเชยเพิ่มเข้า Leave Balance แล้ว')
    setSaving(false)
  }

  async function dismissComp(id: string) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    setCompDays(prev => prev.map(c => c.id === id ? { ...c, status: 'DISMISSED' } : c))
    showToast('info', 'ยกเลิกวันชดเชย')
    setSaving(false)
  }

  // holidays in current month (for legend strip)
  const monthHolidays = useMemo(() => {
    const result: HolidayEntry[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${pad(m)}-${pad(d)}`
      const hs = STATIC_HOL_MAP.get(ds)
      if (hs) result.push(...hs)
    }
    return result
  }, [y, m, daysInMonth])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleApprove(id: string) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setBookings(prev => prev.map(w => w.id === id ? { ...w, status: 'APPROVED' } : w))
    showToast('success', 'อนุมัติสำเร็จ')
    setSaving(false)
  }

  async function handleReject(id: string) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setBookings(prev => prev.map(w => w.id === id ? { ...w, status: 'REJECTED' } : w))
    showToast('info', 'ปฏิเสธแล้ว')
    setSaving(false)
  }

  async function handleApproveAll() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const count = bookings.filter(w => w.status === 'PENDING').length
    setBookings(prev => prev.map(w => w.status === 'PENDING' ? { ...w, status: 'APPROVED' } : w))
    showToast('success', `อนุมัติ ${count} รายการ`)
    setShowPreview(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setBookings(prev => prev.filter(w => w.id !== deleteTarget.id))
    showToast('success', `ลบวันหยุด ${empName(deleteTarget)} แล้ว`)
    if (selectedDate && (byDate[selectedDate] ?? []).length <= 1) setSelectedDate(null)
    setDeleteTarget(null)
    setSaving(false)
  }

  async function handleSave() {
    if (!form.employee_id) { showToast('error', 'กรุณาเลือกพนักงาน'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    if (modal?.mode === 'add') {
      const emp = employees.find(e => e.id === form.employee_id) ?? employees[0]
      const newBooking: WeeklyOffBooking = {
        id: genWoId(), employee_id: form.employee_id,
        week_start: modal.date, day_of_week: form.day_of_week, status: 'PENDING', reject_note: null,
        employee: { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, nickname: emp.nickname, employee_code: '', branch: emp.branch },
      }
      setBookings(prev => [...prev, newBooking])
      showToast('success', `เพิ่มวันหยุด วัน${DAYS_FULL[form.day_of_week]}`)
    } else if (modal?.mode === 'edit') {
      setBookings(prev => prev.map(w => w.id === modal.booking.id ? { ...w, day_of_week: form.day_of_week } : w))
      showToast('success', `เปลี่ยนวันหยุด → วัน${DAYS_FULL[form.day_of_week]}`)
    }
    setModal(null)
    setSaving(false)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
  const btn: React.CSSProperties  = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>📅 วันหยุดประจำเดือน</h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>จัดการวันหยุด 1 วัน/สัปดาห์ ต่อพนักงาน</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Holiday toggle */}
          <button
            onClick={() => setShowHolidays(v => !v)}
            style={{ ...btn, display: 'flex', alignItems: 'center', gap: 6,
              background: showHolidays ? '#fee2e2' : '#fff',
              borderColor: showHolidays ? '#fca5a5' : '#e5e7eb',
              color: showHolidays ? '#dc2626' : '#6b7280',
              fontWeight: showHolidays ? 600 : 400,
            }}>
            <CalendarDays size={14} />
            {showHolidays ? 'ซ่อนวันหยุด' : 'แสดงวันหยุด'}
          </button>
          {/* Slot config */}
          <button onClick={openSlotCfg} style={{ ...btn, color: '#2563eb', borderColor: '#93c5fd', background: '#eff6ff', fontWeight: 600 }}>
            📅 ตั้งค่าวันจอง
          </button>
          {/* LIFF preview */}
          <button onClick={() => { setLiffBranch(branchFilter || 'br-01'); setShowLiffPreview(true) }}
            style={{ ...btn, color: '#06C755', borderColor: '#86efac', background: '#f0fdf4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Smartphone size={14}/> ดูหน้า Employee
          </button>
          {/* Holiday management */}
          <button onClick={() => setShowHolidayMgmt(true)} style={{ ...btn, color: '#374151' }}>
            ⚙️ จัดการวันหยุด
          </button>
          {pendingAll.length > 0 && (
            <button onClick={() => setShowPreview(true)}
              style={{ ...btn, background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', fontWeight: 700 }}>
              👁 Preview {pendingAll.length} รายการ
            </button>
          )}
          <button onClick={() => { setForm({ employee_id: '', day_of_week: 1 }); setModal({ mode: 'add', date: fmt(today) }) }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
            + เพิ่มวันหยุด
          </button>
        </div>
      </div>

      {/* ── Holiday legend strip (เดือนปัจจุบัน) ── */}
      {showHolidays && (
        (() => {
          const branchHolSet = branchFilter ? (BRANCH_HOL_DATES[branchFilter] ?? new Set<string>()) : null
          const visibleHols = monthHolidays.filter(h => !branchHolSet || branchHolSet.has(h.date))
          if (visibleHols.length === 0) return null
          const branchName = branchFilter ? MOCK_BRANCHES_WO.find(b => b.id === branchFilter)?.name : null
          return (
            <div style={{ ...card, padding: '10px 16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>
                วันหยุดเดือน{MONTHS_TH[m-1]}{branchName ? ` · สาขา${branchName}` : ' · ทุกสาขา'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {visibleHols.map((h, i) => {
                  const cfg = HOL_CFG[h.type]
                  return (
                    <span key={i} style={{ fontSize: '0.7rem', padding: '2px 9px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontWeight: 600 }}>
                      {h.date.slice(8)} — {h.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })()
      )}

      {/* ── Month nav + filters ── */}
      <div style={{ ...card, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { const d = new Date(y, m-2, 1); setMonth(toYYYYMM(d)); setSelectedDate(null) }} style={{ ...btn, padding: '7px 12px', fontSize: '1rem' }}>‹</button>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', flex: 1, textAlign: 'center' }}>
          {MONTHS_TH[m-1]} {y+543}
        </div>
        <button onClick={() => { const d = new Date(y, m, 1); setMonth(toYYYYMM(d)); setSelectedDate(null) }} style={{ ...btn, padding: '7px 12px', fontSize: '1rem' }}>›</button>
        <button onClick={() => { setMonth(toYYYYMM(today)); setSelectedDate(null) }} style={{ ...btn, fontSize: '12px', color: '#f97316', borderColor: '#fed7aa' }}>วันนี้</button>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', fontFamily: 'inherit' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* ── Comp Day Alert ── */}
      {pendingComp.length > 0 && (
        <div style={{ border: '1px solid #fcd34d', borderRadius: 12, overflow: 'hidden' }}>
          <div onClick={() => setShowCompPanel(v => !v)}
            style={{ padding: '12px 16px', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ fontSize: '1.3rem' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400e' }}>
                พนักงาน {pendingComp.length} คนทำงานในวันหยุดของสาขา — รอ approve วันชดเชย
              </div>
              <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 2 }}>
                คลิกเพื่อ approve / dismiss รายการ
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>{showCompPanel ? '▲' : '▼'}</div>
          </div>

          {showCompPanel && (
            <div style={{ background: '#fff' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 0, borderTop: '1px solid #fef3c7', padding: '8px 16px', background: '#fffdf0' }}>
                {['พนักงาน', 'สาขา', 'วันหยุดที่ทำงาน', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af' }}>{h}</div>
                ))}
              </div>
              {compDays.map((c, idx) => {
                const isPending  = c.status === 'PENDING'
                const isApproved = c.status === 'APPROVED'
                return (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 0, padding: '10px 16px', alignItems: 'center', borderTop: '1px solid #f3f4f6', background: isApproved ? '#f0fdf4' : c.status === 'DISMISSED' ? '#f9fafb' : '#fff', opacity: !isPending ? 0.7 : 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{c.employee_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{c.branch}</div>
                    <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                      <div style={{ fontWeight: 600 }}>{c.holiday_date.slice(5).replace('-', '/')}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.68rem' }}>{c.holiday_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      {isPending ? (
                        <>
                          <button onClick={() => approveComp(c.id)} disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                            ✅ +1 วันชดเชย
                          </button>
                          <button onClick={() => dismissComp(c.id)} disabled={saving}
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#9ca3af', fontSize: '0.75rem', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: isApproved ? '#dcfce7' : '#f3f4f6', color: isApproved ? '#16a34a' : '#9ca3af' }}>
                          {isApproved ? '✅ อนุมัติแล้ว' : 'ยกเลิก'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: '10px 16px', background: '#fffdf0', borderTop: '1px solid #fef3c7', fontSize: '0.72rem', color: '#b45309' }}>
                💡 วันชดเชยที่ approve จะถูกเพิ่มเข้า Leave Balance ประเภท "วันหยุดชดเชย" ของพนักงาน
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'รอพิจารณา', value: bookings.filter(w => w.status === 'PENDING').length, color: '#d97706', bg: '#fef3c7' },
          { label: 'อนุมัติ',   value: bookings.filter(w => w.status === 'APPROVED').length, color: '#16a34a', bg: '#dcfce7' },
          { label: 'ไม่อนุมัติ',value: bookings.filter(w => w.status === 'REJECTED').length, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Booking round status ── */}
      <div style={{ ...card, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827', margin: 0 }}>
            รอบการจอง — {MONTHS_TH[m-1]} {y+543}
          </p>
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>ตั้งค่าได้รายสาขา</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 12px' }}>
          ต้องเปิดรอบก่อน พนักงานจึงจะเห็นปุ่มจองวันหยุดใน Line — ถ้ายังไม่เปิด พนักงานจะเห็น "ยังไม่เปิดให้จอง"
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_BRANCHES_WO.map(br => {
            const status = roundStatus(br.id, month)
            const isOpen = status === 'OPEN'
            const slotCount = (dayOffSlots[`${br.id}::${month}`] ?? []).length
            return (
              <div key={br.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: `1px solid ${isOpen ? '#86efac' : '#e5e7eb'}`, background: isOpen ? '#f0fdf4' : '#fafafa' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', margin: 0 }}>{br.name}</p>
                  <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: '2px 0 0' }}>
                    {slotCount > 0 ? `${slotCount} วันที่กำหนดไว้` : 'ยังไม่ตั้งค่าวันจอง'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isOpen ? '#16a34a' : '#6b7280', background: isOpen ? '#dcfce7' : '#f1f5f9', padding: '3px 10px', borderRadius: 99, border: `1px solid ${isOpen ? '#86efac' : '#e5e7eb'}` }}>
                    {isOpen ? '● เปิดแล้ว' : '○ ปิดอยู่'}
                  </span>
                  <button
                    onClick={() => toggleRound(br.id, month)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, background: isOpen ? '#fee2e2' : 'linear-gradient(135deg,#f97316,#ea580c)', color: isOpen ? '#dc2626' : '#fff', transition: 'all 0.15s' }}>
                    {isOpen ? 'ปิดการจอง' : 'เปิดการจอง'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Smartphone size={11}/>
          📱 เปิด = พนักงานเห็นปุ่มจองใน Line · ปิด = พนักงานเห็น "ยังไม่เปิดให้จอง"
        </p>
      </div>

      {/* ── Calendar ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {/* Day headers Mon–Sun */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          {['จ','อ','พ','พฤ','ศ','ส','อา'].map((d, i) => (
            <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: i === 6 ? '#dc2626' : '#6b7280' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} style={{ borderRight: idx % 7 < 6 ? '1px solid #f3f4f6' : 'none', borderBottom: '1px solid #f3f4f6', background: '#fafafa', minHeight: 76 }} />

            const dateStr  = `${y}-${pad(m)}-${pad(day)}`
            const dayItems = byDate[dateStr] ?? []
              const branchHolSet = branchFilter ? (BRANCH_HOL_DATES[branchFilter] ?? new Set<string>()) : null
              const dayHols = showHolidays
                ? (STATIC_HOL_MAP.get(dateStr) ?? []).filter(h => !branchHolSet || branchHolSet.has(h.date))
                : []
            const isToday  = dateStr === fmt(today)
            const isSel    = dateStr === selectedDate
            const dow      = (startOffset + day - 1) % 7   // 0=Mon
            const isSun    = dow === 6
            const hasPending = dayItems.some(w => w.status === 'PENDING')
            const isHoliday  = dayHols.length > 0

            return (
              <div key={idx} onClick={() => setSelectedDate(isSel ? null : dateStr)}
                style={{
                  borderRight: idx % 7 < 6 ? '1px solid #f3f4f6' : 'none',
                  borderBottom: '1px solid #f3f4f6',
                  minHeight: 76, padding: '5px 4px', cursor: 'pointer',
                  background: isSel ? '#fff7ed' : isHoliday ? '#fff9f9' : isToday ? '#fff7ed' : isSun ? '#fafafa' : '#fff',
                  borderLeft: isSel ? '2px solid #f97316' : isHoliday ? '2px solid #fca5a5' : '2px solid transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = '#fff7ed' }}
                onMouseLeave={e => {
                  if (!isSel) (e.currentTarget as HTMLDivElement).style.background =
                    isHoliday ? '#fff9f9' : isSun ? '#fafafa' : isToday ? '#fff7ed' : '#fff'
                }}>

                {/* Day number + pending dot */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#f97316' : isSun ? '#dc2626' : '#374151', width: 22, height: 22, borderRadius: '50%', background: isToday ? '#fff7ed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {day}
                  </span>
                  {hasPending && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />}
                </div>

                {/* Holiday badges */}
                {dayHols.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: dayItems.length > 0 ? 3 : 0 }}>
                    {dayHols.slice(0, 1).map((hol, hi) => {
                      const hcfg = HOL_CFG[hol.type]
                      return (
                        <div key={hi} style={{ padding: '1px 4px', borderRadius: 3, background: hcfg.bg, border: `1px solid ${hcfg.border}`, fontSize: '0.56rem', fontWeight: 700, color: hcfg.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.5' }}>
                          {hol.name}
                        </div>
                      )
                    })}
                    {dayHols.length > 1 && (
                      <div style={{ fontSize: '0.55rem', color: '#ef4444', fontWeight: 600 }}>+{dayHols.length - 1} วันหยุด</div>
                    )}
                  </div>
                )}

                {/* Employee off chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayItems.slice(0, isMobile ? 1 : 2).map(w => {
                    const cfg = WO_CFG[w.status]; const bc = branchColor(empBranch(w))
                    return (
                      <div key={w.id}
                        onClick={e => { e.stopPropagation(); setForm({ employee_id: w.employee_id, day_of_week: w.day_of_week }); setModal({ mode: 'edit', booking: w }) }}
                        style={{ padding: '2px 5px', borderRadius: 5, background: cfg.bg, border: `1px solid ${cfg.border}`, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: bc, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 40 : 54 }}>
                            {empName(w)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {dayItems.length > (isMobile ? 1 : 2) && (
                    <div style={{ fontSize: '0.6rem', color: '#9ca3af', textAlign: 'center' }}>+{dayItems.length - (isMobile ? 1 : 2)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Day Detail (inline) ── */}
        {selectedDate && (selectedBookings.length > 0 || (STATIC_HOL_MAP.get(selectedDate) ?? []).length > 0) && (
          <div style={{ borderTop: '2px solid #f97316', background: '#fffbf7', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#111827' }}>
                {(() => { const d = new Date(selectedDate + 'T00:00:00'); return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()+543}` })()}
                <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>{selectedBookings.length} รายการ</span>
              </div>
              <button onClick={() => setSelectedDate(null)} style={{ ...btn, padding: '4px 10px', color: '#9ca3af' }}><X size={15}/></button>
            </div>

            {/* Holiday detail on selected date */}
            {showHolidays && (STATIC_HOL_MAP.get(selectedDate) ?? []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {(STATIC_HOL_MAP.get(selectedDate) ?? []).map((hol, hi) => {
                  const hcfg = HOL_CFG[hol.type]
                  return (
                    <div key={hi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: hcfg.bg, border: `1px solid ${hcfg.border}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: hcfg.color }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: hcfg.color }}>{hol.name}</span>
                      <span style={{ fontSize: '0.68rem', color: hcfg.color, opacity: 0.7 }}>
                        {hol.type === 'NATIONAL' ? 'นักขัตฤกษ์' : hol.type === 'RELIGIOUS' ? 'ศาสนา' : 'บริษัท'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Employee bookings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedBookings.map(w => {
                const cfg = WO_CFG[w.status]; const bc = branchColor(empBranch(w))
                return (
                  <div key={w.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${cfg.border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                      {empName(w).slice(0,2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{empName(w)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{empFull(w)} · {empBranch(w)}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {w.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(w.id)} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: 600 }}><Check size={13}/></button>
                          <button onClick={() => handleReject(w.id)}  disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}><X size={13}/></button>
                        </>
                      )}
                      <button onClick={() => { setForm({ employee_id: w.employee_id, day_of_week: w.day_of_week }); setModal({ mode: 'edit', booking: w }) }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}><Pencil size={13}/></button>
                      <button onClick={() => setDeleteTarget(w)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={13}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Preview & Approve All Modal ── */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
          onClick={() => setShowPreview(false)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16, width: '100%', maxWidth: 560, maxHeight: isMobile ? '85vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>👁 Preview วันหยุดรอพิจารณา</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>{MONTHS_TH[m-1]} {y+543} — {pendingAll.length} รายการ</div>
              </div>
              <button onClick={() => setShowPreview(false)} style={{ ...btn, padding: '4px 10px', color: '#9ca3af' }}><X size={15}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingAll.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>ไม่มีรายการรอพิจารณา</div>
              ) : pendingAll.map(w => {
                const ad = actualDate(w.week_start, w.day_of_week)
                const d  = new Date(ad + 'T00:00:00')
                const bc = branchColor(empBranch(w))
                return (
                  <div key={w.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700, color: bc, flexShrink: 0 }}>
                      {empName(w).slice(0,2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{empName(w)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{empBranch(w)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>วัน{DAYS_FULL[d.getDay()]}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{d.getDate()} {MONTHS_TH[d.getMonth()]}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => handleApprove(w.id)} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontWeight: 600 }}><Check size={13}/></button>
                      <button onClick={() => handleReject(w.id)}  disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}><X size={13}/></button>
                    </div>
                  </div>
                )
              })}
            </div>
            {pendingAll.length > 0 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
                <button onClick={() => setShowPreview(false)} style={btn}>ปิด</button>
                <button onClick={handleApproveAll} disabled={saving}
                  style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'กำลังอนุมัติ...' : `อนุมัติทั้งหมด ${pendingAll.length} รายการ`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
          onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 14, padding: isMobile ? '24px 20px 32px' : 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontWeight: 800 }}>
              {modal.mode === 'add' ? '+ เพิ่มวันหยุด' : `แก้ไขวันหยุด — ${empName(modal.booking)}`}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal.mode === 'add' && (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 5 }}>พนักงาน *</label>
                  <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">— เลือกพนักงาน —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.nickname ?? e.first_name} ({e.first_name} {e.last_name})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>วันหยุด</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
                  {DAYS_TH.map((d, i) => (
                    <button key={i} type="button" onClick={() => setForm(f => ({ ...f, day_of_week: i }))}
                      style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${form.day_of_week === i ? '#f97316' : '#e5e7eb'}`, background: form.day_of_week === i ? '#fff7ed' : '#fff', color: form.day_of_week === i ? '#f97316' : i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#374151', fontWeight: form.day_of_week === i ? 700 : 400, fontSize: '0.78rem', cursor: 'pointer' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={btn}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px' }}>ยืนยันการลบ</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: 20 }}>
              ลบวันหยุดของ <strong>{empName(deleteTarget)}</strong> วัน{DAYS_FULL[deleteTarget.day_of_week]}?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteTarget(null)} style={btn}>ยกเลิก</button>
              <button onClick={handleDelete} disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Day-off Slot Config Overlay ── */}
      {showSlotCfg && (() => {
        const [sy, sm] = slotMonth.split('-').map(Number)
        const slotFirst = new Date(sy, sm - 1, 1).getDay()
        const slotDays  = new Date(sy, sm, 0).getDate()
        const DAYS_SLOT = ['อา','จ','อ','พ','พฤ','ศ','ส']
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>📅 ตั้งค่าวันจองหยุด</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>เลือกวันที่พนักงานสามารถจองหยุดได้ในแต่ละเดือน</div>
              </div>
              <button onClick={() => setShowSlotCfg(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>
                <X size={14}/> ปิด
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', maxWidth: 640, width: '100%', margin: '0 auto' }}>

              {/* Branch selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>เลือกสาขา</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {MOCK_BRANCHES_WO.map(b => (
                    <button key={b.id} onClick={() => onSlotBranchChange(b.id)}
                      style={{ padding: '8px 18px', borderRadius: 99, border: `2px solid ${slotBranch === b.id ? '#3b82f6' : '#e5e7eb'}`, background: slotBranch === b.id ? '#eff6ff' : '#fff', color: slotBranch === b.id ? '#2563eb' : '#6b7280', fontWeight: slotBranch === b.id ? 700 : 400, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button onClick={() => changeSlotMonth(-1)} style={{ ...btn, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ← ก่อนหน้า
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{fmtMonthSlot(slotMonth)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>{slotPicks.size} วันที่เลือก</div>
                </div>
                <button onClick={() => changeSlotMonth(1)} style={{ ...btn, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ถัดไป →
                </button>
              </div>

              {/* Calendar */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
                  {DAYS_SLOT.map((d, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, padding: '4px 0',
                      color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#9ca3af' }}>
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {Array.from({ length: slotFirst }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: slotDays }).map((_, i) => {
                    const day     = i + 1
                    const dow     = (slotFirst + i) % 7
                    const dateStr = `${slotMonth}-${pad(day)}`
                    const picked  = slotPicks.has(dateStr)
                    return (
                      <button key={day} onClick={() => toggleSlotDate(dateStr)}
                        style={{
                          border: picked ? '2px solid #3b82f6' : '1.5px solid transparent',
                          borderRadius: 10, padding: '8px 2px', cursor: 'pointer', textAlign: 'center',
                          background: picked ? '#eff6ff' : 'rgba(0,0,0,0.02)',
                          transition: 'all 0.12s', fontFamily: 'inherit',
                        }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: picked ? 800 : 400,
                          color: picked ? '#2563eb' : dow === 0 ? '#dc2626' : dow === 6 ? '#2563eb' : '#374151' }}>
                          {day}
                        </div>
                        {picked && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', margin: '3px auto 0' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected chips */}
              {slotPicks.size > 0 && (
                <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>
                    วันที่พนักงานจองได้ ({slotPicks.size} วัน)
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Array.from(slotPicks).sort().map(d => {
                      const dd = new Date(d + 'T00:00:00')
                      return (
                        <button key={d} onClick={() => toggleSlotDate(d)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.75rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {dd.getDate()} {['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][dd.getMonth()]}
                          <X size={11} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {slotPicks.size === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: '0.82rem', marginBottom: 16 }}>
                  ยังไม่ได้เลือกวัน — พนักงานจะไม่สามารถจองวันหยุดเดือนนี้ได้
                </div>
              )}

              {/* Save */}
              <button onClick={saveSlotConfig} disabled={slotSaving}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit', opacity: slotSaving ? 0.7 : 1 }}>
                {slotSaving ? '⏳ กำลังบันทึก...' : `💾 บันทึกวันจอง ${slotPicks.size > 0 ? `(${slotPicks.size} วัน)` : '— ล้างทั้งหมด'}`}
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── LIFF Employee Preview ── */}
      {showLiffPreview && (() => {
        const liffMonth = month
        const liffSlots = dayOffSlots[`${liffBranch}::${liffMonth}`] ?? []
        const liffStatus = roundStatus(liffBranch, liffMonth)
        // simulate this employee's bookings from mock data (first employee in branch)
        const liffEmpId = MOCK_EMPLOYEES_WO.find(e => e.branch.id === liffBranch)?.id ?? ''
        const liffMyBookings = bookings
          .filter(b => b.employee_id === liffEmpId)
          .map(b => ({ date: actualDate(b.week_start, b.day_of_week), status: b.status }))
          .filter(b => liffSlots.includes(b.date))

        function handleLiffBook(date: string) {
          const emp = MOCK_EMPLOYEES_WO.find(e => e.id === liffEmpId)
          if (!emp) return
          const weekStart = (() => {
            const d = new Date(date + 'T00:00:00')
            const dow = d.getDay() // 0=Sun
            const diff = dow === 0 ? -6 : 1 - dow
            d.setDate(d.getDate() + diff)
            return fmt(d)
          })()
          const dateObj = new Date(date + 'T00:00:00')
          const dayOfWeek = dateObj.getDay() // 0=Sun,1=Mon,...
          setBookings(prev => [...prev, {
            id: genWoId(), employee_id: emp.id,
            week_start: weekStart, day_of_week: dayOfWeek, status: 'PENDING', reject_note: null,
            employee: { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, nickname: emp.nickname, employee_code: '', branch: emp.branch },
          }])
          showToast('success', `พนักงานจอง ${date} — รอ Admin อนุมัติ`)
        }

        return (
          <LiffPreview
            roundStatus={liffStatus}
            month={liffMonth}
            slots={liffSlots}
            myBookings={liffMyBookings}
            onBook={handleLiffBook}
            onCancelBooking={() => {}}
            onClose={() => setShowLiffPreview(false)}
          />
        )
      })()}

      {/* ── Holiday Management Full-screen Overlay ── */}
      {showHolidayMgmt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>⚙️ จัดการวันหยุดบริษัท</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>เพิ่ม / แก้ไข / ลบวันหยุดประจำปี</div>
            </div>
            <button
              onClick={() => setShowHolidayMgmt(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>
              <X size={14}/> ปิด
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            <HolidayPage />
          </div>
        </div>
      )}
    </div>
  )
}
