// admin/src/pages/holiday/index.tsx  [MOCK MODE]
import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil, Trash2, X, Check, Pin, Repeat2, CheckCircle2, Save } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type HolidayType = 'NATIONAL' | 'COMPANY' | 'RELIGIOUS'
type PageView = 'calendar' | 'branch-override'

interface Holiday {
  id: string
  date: string        // YYYY-MM-DD
  name: string
  type: HolidayType
  recurring: boolean
}

interface MockBranch { id: string; name: string; desc: string }

// ── Thai National Holidays 2026 ───────────────────────────────────────────────
const THAI_NATIONAL_2026: Omit<Holiday, 'id'>[] = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่',                                    type: 'NATIONAL',  recurring: true  },
  { date: '2026-02-12', name: 'วันมาฆบูชา',                                        type: 'RELIGIOUS', recurring: false },
  { date: '2026-04-06', name: 'วันจักรี',                                           type: 'NATIONAL',  recurring: true  },
  { date: '2026-04-13', name: 'วันสงกรานต์',                                       type: 'NATIONAL',  recurring: true  },
  { date: '2026-04-14', name: 'วันสงกรานต์ (วันครอบครัว)',                         type: 'NATIONAL',  recurring: true  },
  { date: '2026-04-15', name: 'วันสงกรานต์ (วันผู้สูงอายุ)',                       type: 'NATIONAL',  recurring: true  },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ',                                type: 'NATIONAL',  recurring: true  },
  { date: '2026-05-11', name: 'วันวิสาขบูชา',                                      type: 'RELIGIOUS', recurring: false },
  { date: '2026-05-13', name: 'วันฉัตรมงคล',                                       type: 'NATIONAL',  recurring: true  },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา พระบรมราชินี',                type: 'NATIONAL',  recurring: true  },
  { date: '2026-07-10', name: 'วันอาสาฬหบูชา',                                    type: 'RELIGIOUS', recurring: false },
  { date: '2026-07-11', name: 'วันเข้าพรรษา',                                     type: 'RELIGIOUS', recurring: false },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10',                        type: 'NATIONAL',  recurring: true  },
  { date: '2026-08-12', name: 'วันเฉลิมพระชนมพรรษา ร.9 (วันแม่แห่งชาติ)',       type: 'NATIONAL',  recurring: true  },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9',                           type: 'NATIONAL',  recurring: true  },
  { date: '2026-10-23', name: 'วันปิยมหาราช',                                     type: 'NATIONAL',  recurring: true  },
  { date: '2026-12-05', name: 'วันเฉลิมพระชนมพรรษา ร.9 (วันพ่อแห่งชาติ)',       type: 'NATIONAL',  recurring: true  },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ',                                    type: 'NATIONAL',  recurring: true  },
  { date: '2026-12-31', name: 'วันสิ้นปี',                                         type: 'NATIONAL',  recurring: true  },
]

const COMPANY_EXTRA: Omit<Holiday, 'id'>[] = [
  { date: '2026-01-02', name: 'หยุดชดเชยวันขึ้นปีใหม่',  type: 'COMPANY', recurring: false },
  { date: '2026-04-16', name: 'หยุดพิเศษสงกรานต์',        type: 'COMPANY', recurring: false },
  { date: '2026-12-28', name: 'วันหยุดพักผ่อนบริษัท',     type: 'COMPANY', recurring: false },
]

let _idSeq = 1
function makeId() { return `hol-${_idSeq++}` }

const INIT_HOLIDAYS: Holiday[] = [
  ...THAI_NATIONAL_2026.map(h => ({ ...h, id: makeId() })),
  ...COMPANY_EXTRA.map(h => ({ ...h, id: makeId() })),
]

// วันหยุดพื้นฐาน: ปีใหม่ + สงกรานต์ (สำหรับสาขาที่ไม่ได้สิทธิ์ทุกวัน)
const BASE_HOLIDAY_DATES = new Set([
  '2026-01-01','2026-01-02',
  '2026-04-13','2026-04-14','2026-04-15','2026-04-16',
])

// ── Branch mock data ──────────────────────────────────────────────────────────
const MOCK_BRANCHES: MockBranch[] = [
  { id: 'br-01', name: 'วงษ์หิรัญ',              desc: 'สาขาหลัก — สำนักงาน + คลังสินค้า' },
  { id: 'br-02', name: 'ฟุคุโระ แม่กิมเฮง',      desc: 'หน้าร้านค้า — พนักงานขาย/ขนส่ง' },
  { id: 'br-04', name: 'ฟุคุโระ ไนท์สวนหมาก',   desc: 'หน้าร้านค้า — พนักงานขาย/ขนส่ง' },
]

// Initial branch override: br-01 ได้ทุกวัน, br-02/br-04 ได้เฉพาะปีใหม่+สงกรานต์
function initBranchOverrides(holidays: Holiday[]): Record<string, Set<string>> {
  const allDates = new Set(holidays.map(h => h.date))
  return {
    'br-01': new Set(allDates),
    'br-02': new Set(BASE_HOLIDAY_DATES),
    'br-04': new Set(BASE_HOLIDAY_DATES),
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<HolidayType, { label: string; color: string; bg: string; dot: string }> = {
  NATIONAL:  { label: 'นักขัตฤกษ์', color: '#dc2626', bg: '#fee2e2', dot: '#ef4444' },
  RELIGIOUS: { label: 'ศาสนา',      color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  COMPANY:   { label: 'บริษัท',     color: '#2563eb', bg: '#dbeafe', dot: '#3b82f6' },
}

const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAY_TH_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส']

function toKey(date: string) { return date.slice(0, 10) }
function padZ(n: number, l = 2) { return String(n).padStart(l, '0') }
function ymd(y: number, m: number, d: number) { return `${y}-${padZ(m)}-${padZ(d)}` }

// ── Mini Month Calendar ───────────────────────────────────────────────────────
function MiniMonth({
  year, month, holidayMap, onDayClick, selectedDate,
}: {
  year: number
  month: number
  holidayMap: Map<string, Holiday[]>
  onDayClick: (date: string) => void
  selectedDate: string | null
}) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', textAlign: 'center' }}>
        {MONTH_TH[month - 1]}
      </div>
      <div style={{ padding: '6px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
          {DAY_TH_SHORT.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : '#94a3b8', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} />
            const dateStr = ymd(year, month, d)
            const hols = holidayMap.get(dateStr) ?? []
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === today
            const dow = (firstDay + d - 1) % 7
            const isSun = dow === 0
            const isSat = dow === 6
            return (
              <button key={idx} onClick={() => onDayClick(dateStr)}
                style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 6,
                  border: isSelected ? '2px solid #4f46e5' : isToday ? '2px solid #f97316' : '2px solid transparent',
                  background: isSelected ? '#eef2ff' : hols.length > 0 ? TYPE_CFG[hols[0].type].bg : 'transparent',
                  cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}>
                <span style={{ fontSize: '0.7rem', fontWeight: hols.length > 0 || isToday ? 700 : 400,
                  color: isSelected ? '#4f46e5' : hols.length > 0 ? TYPE_CFG[hols[0].type].color : isSun ? '#dc2626' : isSat ? '#2563eb' : '#374151', lineHeight: 1 }}>
                  {d}
                </span>
                {hols.length > 0 && (
                  <div style={{ display: 'flex', gap: 1 }}>
                    {hols.slice(0, 3).map((h, i) => (
                      <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: TYPE_CFG[h.type].dot }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
interface ModalProps {
  initial?: Partial<Holiday>
  onSave: (h: Omit<Holiday, 'id'>) => void
  onClose: () => void
}

function HolidayModal({ initial, onSave, onClose }: ModalProps) {
  const [date,      setDate]      = useState(initial?.date ?? '')
  const [name,      setName]      = useState(initial?.name ?? '')
  const [type,      setType]      = useState<HolidayType>(initial?.type ?? 'NATIONAL')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (overlayRef.current === e.target) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const canSave = date.length === 10 && name.trim().length > 0

  return (
    <div ref={overlayRef} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{initial?.id ? 'แก้ไขวันหยุด' : '➕ เพิ่มวันหยุด'}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>กรอกข้อมูลวันหยุดที่ต้องการเพิ่ม</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18}/></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>วันที่ <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>ชื่อวันหยุด <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="เช่น วันขึ้นปีใหม่, วันหยุดพิเศษบริษัท"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>{name.length}/80</div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>ประเภท</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.entries(TYPE_CFG) as [HolidayType, typeof TYPE_CFG[HolidayType]][]).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 9, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', border: `2px solid ${type === k ? v.color : '#e2e8f0'}`, background: type === k ? v.bg : '#fff', color: type === k ? v.color : '#64748b' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, background: recurring ? '#ede9fe' : '#f8fafc', border: `1.5px solid ${recurring ? '#c4b5fd' : '#e2e8f0'}` }}>
            <button type="button" onClick={() => setRecurring(r => !r)}
              style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0, background: recurring ? '#7c3aed' : '#d1d5db', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', top: 3, left: recurring ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: recurring ? '#6d28d9' : '#374151' }}>ทำซ้ำทุกปีอัตโนมัติ</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>ระบบจะเพิ่มวันนี้ให้อัตโนมัติในปีถัดไป</div>
            </div>
          </label>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
          <button onClick={() => canSave && onSave({ date, name: name.trim(), type, recurring })} disabled={!canSave}
            style={{ padding: '9px 22px', borderRadius: 9, border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? '#4f46e5' : '#e2e8f0', color: canSave ? '#fff' : '#94a3b8' }}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Branch Override View ──────────────────────────────────────────────────────
function BranchOverrideView({
  holidays, branchOverrides, onToggle, onSave,
}: {
  holidays: Holiday[]
  branchOverrides: Record<string, Set<string>>
  onToggle: (branchId: string, date: string) => void
  onSave: () => void
}) {
  const [selBranch, setSelBranch] = useState(MOCK_BRANCHES[0].id)

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date))
  const branchSet = branchOverrides[selBranch] ?? new Set()
  const checkedCount = sorted.filter(h => branchSet.has(h.date)).length

  function selectAll() {
    sorted.forEach(h => { if (!branchSet.has(h.date)) onToggle(selBranch, h.date) })
  }
  function deselectAll() {
    sorted.forEach(h => { if (branchSet.has(h.date)) onToggle(selBranch, h.date) })
  }
  function setBaseOnly() {
    // เลือกเฉพาะปีใหม่ + สงกรานต์
    sorted.forEach(h => {
      const shouldHave = BASE_HOLIDAY_DATES.has(h.date)
      const hasNow = branchSet.has(h.date)
      if (shouldHave !== hasNow) onToggle(selBranch, h.date)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.6 }}>
        <strong>สิทธิ์วันหยุดตามสาขา</strong> — กำหนดว่าพนักงานแต่ละสาขาได้หยุดวันไหนบ้าง<br />
        พนักงานที่ทำงานในวันที่สาขาตัวเองควรหยุด → Admin สามารถ approve วันชดเชยได้
      </div>

      {/* Branch selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {MOCK_BRANCHES.map(b => {
          const isActive = selBranch === b.id
          const cnt = [...(branchOverrides[b.id] ?? new Set())].length
          return (
            <button key={b.id} onClick={() => setSelBranch(b.id)}
              style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${isActive ? '#4f46e5' : '#e2e8f0'}`, background: isActive ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#4f46e5' : '#374151' }}>{b.name}</div>
              <div style={{ fontSize: '0.7rem', color: isActive ? '#6366f1' : '#9ca3af', marginTop: 1 }}>{cnt} วันหยุด · {b.desc.split('—')[0].trim()}</div>
            </button>
          )
        })}
      </div>

      {/* Branch detail + quick actions */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              {MOCK_BRANCHES.find(b => b.id === selBranch)?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>
              {MOCK_BRANCHES.find(b => b.id === selBranch)?.desc}
              {' '}— ได้ <strong style={{ color: '#4f46e5' }}>{checkedCount}</strong>/{sorted.length} วันหยุด
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={selectAll} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #d1fae5', background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>เลือกทั้งหมด</button>
            <button onClick={setBaseOnly} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>ปีใหม่+สงกรานต์</button>
            <button onClick={deselectAll} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>ล้างทั้งหมด</button>
          </div>
        </div>

        {/* Holiday checklist */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {sorted.map((h, idx) => {
            const tc = TYPE_CFG[h.type]
            const isChecked = branchSet.has(h.date)
            const isBase = BASE_HOLIDAY_DATES.has(h.date)
            return (
              <div key={h.id} onClick={() => onToggle(selBranch, h.date)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: idx < sorted.length - 1 ? '1px solid #f8fafc' : 'none', background: isChecked ? '#fafbff' : '#fff', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = isChecked ? '#f5f3ff' : '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = isChecked ? '#fafbff' : '#fff'}>
                {/* Checkbox */}
                <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isChecked ? '#4f46e5' : '#d1d5db'}`, background: isChecked ? '#4f46e5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                  {isChecked && <Check size={12} color="#fff" strokeWidth={3}/>}
                </div>
                {/* Date */}
                <div style={{ width: 48, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: tc.color, lineHeight: 1 }}>{h.date.slice(8)}</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{MONTH_TH[Number(h.date.slice(5,7))-1].slice(0,3)}</div>
                </div>
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isChecked ? '#111827' : '#6b7280' }}>{h.name}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                    <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 99, background: tc.bg, color: tc.color, fontWeight: 600 }}>{tc.label}</span>
                    {isBase && <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 99, background: '#eff6ff', color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Pin size={9}/>วันหยุดพื้นฐาน</span>}
                    {h.recurring && <span style={{ fontSize: '0.65rem', padding: '1px 7px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Repeat2 size={9}/>ประจำปี</span>}
                  </div>
                </div>
                {/* Status badge */}
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: isChecked ? '#fff7ed' : '#f3f4f6', color: isChecked ? '#ea580c' : '#9ca3af', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {isChecked ? <><CheckCircle2 size={11}/>ได้หยุด</> : '— ไม่หยุด'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSave}
          style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(249,115,22,0.3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Save size={15}/>บันทึกสิทธิ์วันหยุด
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HolidayPage() {
  const { showToast } = useToast()
  const [year, setYear]       = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState<Holiday[]>(INIT_HOLIDAYS)
  const [saving,   setSaving]   = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modal, setModal]       = useState<{ mode: 'add'; date?: string } | { mode: 'edit'; holiday: Holiday } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Holiday | null>(null)
  const [filterType, setFilterType]       = useState<HolidayType | 'ALL'>('ALL')
  const [importConfirm, setImportConfirm] = useState(false)
  const [pageView, setPageView] = useState<PageView>('calendar')

  // Branch override state
  const [branchOverrides, setBranchOverrides] = useState<Record<string, Set<string>>>(() => initBranchOverrides(INIT_HOLIDAYS))

  const load = useCallback(() => { setHolidays(INIT_HOLIDAYS) }, [year])

  const yearHolidays = holidays.filter(h => h.date.startsWith(`${year}-`))
  const holidayMap = new Map<string, Holiday[]>()
  yearHolidays.forEach(h => {
    const key = toKey(h.date)
    if (!holidayMap.has(key)) holidayMap.set(key, [])
    holidayMap.get(key)!.push(h)
  })

  const listFiltered = yearHolidays
    .filter(h => filterType === 'ALL' || h.type === filterType)
    .sort((a, b) => a.date.localeCompare(b.date))

  const selectedHols = selectedDate ? (holidayMap.get(selectedDate) ?? []) : []

  async function handleAdd(data: Omit<Holiday, 'id'>) {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setHolidays(prev => [...prev, { ...data, id: makeId() }])
    showToast('success', `เพิ่ม "${data.name}" เรียบร้อยแล้ว`)
    setModal(null)
    setSaving(false)
  }

  async function handleEdit(data: Omit<Holiday, 'id'>) {
    if (modal?.mode !== 'edit') return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setHolidays(prev => prev.map(h => h.id === (modal as any).holiday.id ? { ...h, ...data } : h))
    showToast('success', `แก้ไข "${data.name}" เรียบร้อยแล้ว`)
    setModal(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const h = holidays.find(x => x.id === id)
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setHolidays(prev => prev.filter(x => x.id !== id))
    showToast('success', `ลบ "${h?.name}" เรียบร้อยแล้ว`)
    setDeleteConfirm(null)
    setSelectedDate(null)
    setSaving(false)
  }

  async function handleImport() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    const existing = new Set(holidays.map(h => h.date))
    const newItems = THAI_NATIONAL_2026.filter(h => !existing.has(h.date)).map(h => ({ ...h, id: makeId() }))
    setHolidays(prev => [...prev, ...newItems])
    showToast('success', newItems.length > 0 ? `นำเข้าวันหยุดนักขัตฤกษ์ ${newItems.length} รายการ` : 'ไม่มีวันหยุดใหม่ (มีครบแล้ว)')
    setImportConfirm(false)
    setSaving(false)
  }

  function handleBranchToggle(branchId: string, date: string) {
    setBranchOverrides(prev => {
      const newSet = new Set(prev[branchId] ?? [])
      if (newSet.has(date)) newSet.delete(date)
      else newSet.add(date)
      return { ...prev, [branchId]: newSet }
    })
  }

  async function handleSaveBranchOverride() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    showToast('success', 'บันทึกสิทธิ์วันหยุดต่อสาขาเรียบร้อยแล้ว')
    setSaving(false)
  }

  function thDate(d: string) {
    const [y, m, day] = d.split('-').map(Number)
    const dow = new Date(y, m - 1, day).getDay()
    return `${DAY_TH_SHORT[dow]} ${day} ${MONTH_TH[m - 1]} ${y + 543}`
  }

  const stats = {
    total:     yearHolidays.length,
    national:  yearHolidays.filter(h => h.type === 'NATIONAL').length,
    religious: yearHolidays.filter(h => h.type === 'RELIGIOUS').length,
    company:   yearHolidays.filter(h => h.type === 'COMPANY').length,
    recurring: yearHolidays.filter(h => h.recurring).length,
  }

  return (
    <div>
      {/* ── Page tab bar ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #f1f5f9', marginBottom: 20 }}>
        {([
          { id: 'calendar'       as PageView, label: '📅 วันหยุดประจำปี' },
          { id: 'branch-override' as PageView, label: '🏢 สิทธิ์ตามสาขา' },
        ] as const).map(v => {
          const isActive = pageView === v.id
          return (
            <button key={v.id} onClick={() => setPageView(v.id)}
              style={{ padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: isActive ? 700 : 400,
                color: isActive ? '#4f46e5' : '#6b7280', background: isActive ? '#eef2ff' : 'transparent',
                borderBottom: `2px solid ${isActive ? '#6366f1' : 'transparent'}`, borderRadius: '6px 6px 0 0', marginBottom: -2, whiteSpace: 'nowrap' }}>
              {v.label}
            </button>
          )
        })}
      </div>

      {/* ── Branch Override View ── */}
      {pageView === 'branch-override' && (
        <BranchOverrideView
          holidays={yearHolidays.length > 0 ? yearHolidays : INIT_HOLIDAYS}
          branchOverrides={branchOverrides}
          onToggle={handleBranchToggle}
          onSave={handleSaveBranchOverride}
        />
      )}

      {/* ── Calendar View ── */}
      {pageView === 'calendar' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>วันหยุดประจำปี</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                จัดการวันหยุดนักขัตฤกษ์และวันหยุดบริษัท — ไปที่แท็บ "สิทธิ์ตามสาขา" เพื่อตั้งค่าสิทธิ์ต่อสาขา
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setImportConfirm(true)}
                style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                🇹🇭 นำเข้าวันหยุดไทย {year}
              </button>
              <button onClick={() => setModal({ mode: 'add' })}
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                + เพิ่มวันหยุด
              </button>
            </div>
          </div>

          {/* Year selector + Stats */}
          <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '4px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <button onClick={() => setYear(y => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px 8px', fontSize: '1rem', borderRadius: 6 }}>‹</button>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', minWidth: 60, textAlign: 'center' }}>{year}</span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', marginLeft: -4 }}>({year + 543})</span>
              <button onClick={() => setYear(y => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px 8px', fontSize: '1rem', borderRadius: 6 }}>›</button>
            </div>
            {[
              { label: `รวม ${stats.total} วัน`,           color: '#4f46e5', bg: '#eef2ff' },
              { label: `🇹🇭 นักขัตฤกษ์ ${stats.national}`,  color: '#dc2626', bg: '#fee2e2' },
              { label: `🕌 ศาสนา ${stats.religious}`,        color: '#d97706', bg: '#fef3c7' },
              { label: `🏢 บริษัท ${stats.company}`,         color: '#2563eb', bg: '#dbeafe' },
              { label: `🔁 ทำซ้ำ ${stats.recurring}`,        color: '#7c3aed', bg: '#ede9fe' },
            ].map(s => (
              <span key={s.label} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
            ))}
          </div>

          {/* Main layout */}
          <div style={{ padding: '0 0 24px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <MiniMonth key={m} year={year} month={m} holidayMap={holidayMap}
                    onDayClick={date => setSelectedDate(s => s === date ? null : date)} selectedDate={selectedDate} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                {(Object.entries(TYPE_CFG) as [HolidayType, typeof TYPE_CFG[HolidayType]][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: v.dot }} />
                    {v.label}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: '2px solid #f97316', background: 'transparent' }} />
                  วันนี้
                </div>
              </div>
            </div>

            <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedDate && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{thDate(selectedDate)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{selectedHols.length === 0 ? 'ไม่มีวันหยุด' : `${selectedHols.length} รายการ`}</div>
                    </div>
                    <button onClick={() => setModal({ mode: 'add', date: selectedDate })}
                      style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #c7d2fe', background: '#eef2ff', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>
                      + เพิ่ม
                    </button>
                  </div>
                  {selectedHols.length === 0 ? (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>คลิก "+ เพิ่ม" เพื่อเพิ่มวันหยุดวันนี้</div>
                  ) : (
                    <div style={{ padding: '8px' }}>
                      {selectedHols.map(h => {
                        const tc = TYPE_CFG[h.type]
                        return (
                          <div key={h.id} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 4, background: tc.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: tc.color }}>{h.name}</div>
                              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: 99, color: tc.color, fontWeight: 600 }}>{tc.label}</span>
                                {h.recurring && <span style={{ fontSize: '0.68rem', background: 'rgba(124,58,237,0.1)', padding: '1px 6px', borderRadius: 99, color: '#7c3aed', fontWeight: 600 }}>🔁 ทำซ้ำ</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setModal({ mode: 'edit', holiday: h })} style={{ background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#374151' }}><Pencil size={13}/></button>
                              <button onClick={() => setDeleteConfirm(h)} style={{ background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13}/></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>รายการวันหยุด {year}</span>
                  <select value={filterType} onChange={e => setFilterType(e.target.value as HolidayType | 'ALL')}
                    style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: '0.75rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                    <option value="ALL">ทั้งหมด</option>
                    <option value="NATIONAL">นักขัตฤกษ์</option>
                    <option value="RELIGIOUS">ศาสนา</option>
                    <option value="COMPANY">บริษัท</option>
                  </select>
                </div>
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {listFiltered.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>ยังไม่มีวันหยุดในหมวดนี้</div>
                  ) : listFiltered.map((h, idx) => {
                    const tc = TYPE_CFG[h.type]
                    const isSelected = selectedDate === h.date
                    return (
                      <div key={h.id} onClick={() => setSelectedDate(s => s === h.date ? null : h.date)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: idx < listFiltered.length - 1 ? '1px solid #f8fafc' : 'none', background: isSelected ? '#f8f9ff' : 'transparent', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafbff' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                        <div style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: tc.color, lineHeight: 1 }}>{h.date.slice(8)}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>{MONTH_TH[Number(h.date.slice(5, 7)) - 1].slice(0, 3)}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: tc.bg, color: tc.color }}>{tc.label}</span>
                            {h.recurring && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>🔁</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={e => { e.stopPropagation(); setModal({ mode: 'edit', holiday: h }) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 5, color: '#94a3b8' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <Pencil size={13}/>
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(h) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 5px', borderRadius: 5, color: '#dc2626' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {modal?.mode === 'add' && <HolidayModal initial={modal.date ? { date: modal.date } : undefined} onSave={handleAdd} onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && <HolidayModal initial={modal.holiday} onSave={handleEdit} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 360, padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 12, textAlign: 'center' }}>🗑️</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>ยืนยันการลบ</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
              ต้องการลบ <strong>"{deleteConfirm.name}"</strong><br />
              <span style={{ color: '#94a3b8' }}>{thDate(deleteConfirm.date)}</span> ออกจากระบบ?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>ลบออก</button>
            </div>
          </div>
        </div>
      )}

      {/* Import confirm */}
      {importConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 12, textAlign: 'center' }}>🇹🇭</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>นำเข้าวันหยุดนักขัตฤกษ์ {year}</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: 6, lineHeight: 1.6 }}>
              ระบบจะนำเข้าวันหยุดราชการไทยปี {year + 543} จำนวน {THAI_NATIONAL_2026.length} รายการ
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>(วันที่มีอยู่แล้วจะถูกข้ามไป ไม่เพิ่มซ้ำ)</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setImportConfirm(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleImport} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>นำเข้าเลย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
