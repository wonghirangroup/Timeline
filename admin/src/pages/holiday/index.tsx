// admin/src/pages/holiday/index.tsx
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, Check, Repeat2, Plus, Landmark, Building2, Target, Flag, Download, Users, AlertTriangle, Search, Gift } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/axios'
import { deptName } from '../../lib/format'

// ── Types ─────────────────────────────────────────────────────────────────────
type HolidayType = 'NATIONAL' | 'COMPANY' | 'RELIGIOUS'

interface Holiday {
  id: string
  date: string        // YYYY-MM-DD
  name: string
  type: HolidayType
  recurring: boolean
  target_branches?: string[] | null
  target_departments?: string[] | null
  employee_includes?: string[] | null   // employee_id ที่ "ได้หยุด" เพิ่ม แม้ branch/dept จะไม่ครอบคลุม
  employee_excludes?: string[] | null   // employee_id ที่ "ไม่ได้หยุด" แม้ branch/dept จะครอบคลุม (ชนะทุกอย่าง)
  compensate_days?: number              // วันชดเชยถ้ามาทำงานในวันที่ควรหยุด
}

interface HolidayEmployee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  nickname: string | null
  branch: { id: string; name: string }
}

interface HolidayAlert {
  id: string
  date: string
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; branch: { id: string; name: string } | null }
}

// แผนก — สำเนาจาก employee/index.tsx (ตามธรรมเนียมของโปรเจกต์นี้ที่ define ค่าคงที่ต่อไฟล์)
const DEPARTMENTS = [
  '01 ผู้บริหาร',
  '02 Office',
  '03 พนักงานขาย',
  '04 พนักงานขนส่ง',
]
function deptCode(d: string) { return d.slice(0, 2).trim() }

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

// ── Employee multi-select (ค้นหา + เลือกได้หลายคน) ──────────────────────────────
function empDisplayName(e: HolidayEmployee) {
  const full = `${e.first_name} ${e.last_name}`.trim()
  return e.nickname ? `${full} (${e.nickname})` : full
}

function EmployeeMultiSelect({
  employees, selected, onToggle, accent, accentBg, placeholder,
}: {
  employees: HolidayEmployee[]
  selected: Set<string>
  onToggle: (id: string) => void
  accent: string
  accentBg: string
  placeholder: string
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query.length === 0 ? employees : employees.filter(e =>
    empDisplayName(e).toLowerCase().includes(query) || e.employee_code.toLowerCase().includes(query))
  const selectedEmps = employees.filter(e => selected.has(e.id))

  return (
    <div>
      {selectedEmps.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {selectedEmps.map(e => (
            <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 10px', borderRadius: 99, background: accentBg, color: accent, fontSize: '0.74rem', fontWeight: 600 }}>
              {empDisplayName(e)}
              <button type="button" onClick={() => onToggle(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: 2, display: 'flex' }}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.76rem', color: '#94a3b8' }}>ไม่พบพนักงาน</div>
        ) : filtered.slice(0, 60).map(e => {
          const active = selected.has(e.id)
          return (
            <button key={e.id} type="button" onClick={() => onToggle(e.id)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: 'none', borderBottom: '1px solid #f8fafc', background: active ? accentBg : '#fff', cursor: 'pointer' }}>
              <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${active ? accent : '#cbd5e1'}`, background: active ? accent : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {active && <Check size={10} color="#fff" />}
              </div>
              <span style={{ fontSize: '0.78rem', color: active ? accent : '#374151', fontWeight: active ? 700 : 500, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empDisplayName(e)}</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>{e.employee_code}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
interface ModalProps {
  initial?: Partial<Holiday>
  branches: { id: string; name: string }[]
  employees: HolidayEmployee[]
  onSave: (h: Omit<Holiday, 'id'>) => void
  onClose: () => void
}

function HolidayModal({ initial, branches, employees, onSave, onClose }: ModalProps) {
  const [date,      setDate]      = useState(initial?.date ?? '')
  const [name,      setName]      = useState(initial?.name ?? '')
  const [type,      setType]      = useState<HolidayType>(initial?.type ?? 'NATIONAL')
  const [recurring, setRecurring] = useState(initial?.recurring ?? false)
  const [targetBranches,    setTargetBranches]    = useState<Set<string>>(new Set(initial?.target_branches ?? []))
  const [targetDepartments, setTargetDepartments] = useState<Set<string>>(new Set(initial?.target_departments ?? []))
  const [employeeIncludes,  setEmployeeIncludes]  = useState<Set<string>>(new Set(initial?.employee_includes ?? []))
  const [employeeExcludes,  setEmployeeExcludes]  = useState<Set<string>>(new Set(initial?.employee_excludes ?? []))
  const [compensateDays,    setCompensateDays]    = useState(initial?.compensate_days ?? 1)
  const [showIndividual,    setShowIndividual]    = useState(() => (initial?.employee_includes?.length ?? 0) > 0 || (initial?.employee_excludes?.length ?? 0) > 0)
  const overlayRef = useRef<HTMLDivElement>(null)

  function toggleBranch(id: string) {
    setTargetBranches(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleDept(d: string) {
    setTargetDepartments(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n })
  }
  // ระบุไว้ฝั่งหนึ่งแล้วต้องเอาออกจากอีกฝั่งเสมอ — คนเดียวกันเป็นทั้ง "ได้หยุด" และ "ไม่ได้หยุด" พร้อมกันไม่ได้
  function toggleInclude(id: string) {
    setEmployeeIncludes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setEmployeeExcludes(prev => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n })
  }
  function toggleExclude(id: string) {
    setEmployeeExcludes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setEmployeeIncludes(prev => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n })
  }

  useEffect(() => {
    function h(e: MouseEvent) { if (overlayRef.current === e.target) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const canSave = date.length === 10 && name.trim().length > 0

  return (
    <div ref={overlayRef} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: 480, maxHeight: 'min(90vh, 780px)', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>{initial?.id ? 'แก้ไขวันหยุด' : <><Plus size={16} /> เพิ่มวันหยุด</>}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>กรอกข้อมูลวันหยุดที่ต้องการเพิ่ม</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} aria-label="ปิด"><X size={18}/></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>วันที่ <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>ชื่อวันหยุด <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="เช่น วันขึ้นปีใหม่, วันหยุดพิเศษบริษัท"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
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

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>สาขาที่ให้หยุด</label>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8 }}>ไม่เลือก = หยุดทุกสาขา</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {branches.map(b => {
                const active = targetBranches.has(b.id)
                return (
                  <button key={b.id} type="button" onClick={() => toggleBranch(b.id)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#4f46e5' : '#e2e8f0'}`, background: active ? '#eef2ff' : '#fff', color: active ? '#4f46e5' : '#64748b' }}>
                    {active && <Check size={11} style={{ verticalAlign: -1, marginRight: 3 }}/>}{b.name}
                  </button>
                )
              })}
              {branches.length === 0 && <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ไม่มีสาขา</span>}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>แผนกที่ให้หยุด</label>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8 }}>ไม่เลือก = หยุดทุกแผนก</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEPARTMENTS.map(d => {
                const active = targetDepartments.has(d)
                return (
                  <button key={d} type="button" onClick={() => toggleDept(d)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#4f46e5' : '#e2e8f0'}`, background: active ? '#eef2ff' : '#fff', color: active ? '#4f46e5' : '#64748b' }}>
                    {active && <Check size={11} style={{ verticalAlign: -1, marginRight: 3 }}/>}{deptName(d)}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
            <button type="button" onClick={() => setShowIndividual(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Users size={14} color="#374151" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', flex: 1, textAlign: 'left' }}>ระบุเป็นรายบุคคล</span>
              {(employeeIncludes.size > 0 || employeeExcludes.size > 0) && (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}>
                  {employeeIncludes.size + employeeExcludes.size}
                </span>
              )}
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', transform: showIndividual ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
            </button>
            {showIndividual && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: 4 }}>ได้หยุดเพิ่ม (แม้สาขา/แผนกจะไม่ครอบคลุม)</label>
                  <EmployeeMultiSelect employees={employees} selected={employeeIncludes} onToggle={toggleInclude}
                    accent="#15803d" accentBg="#dcfce7" placeholder="ค้นหาชื่อหรือรหัสพนักงาน..." />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>ไม่ได้หยุด (แม้สาขา/แผนกจะครอบคลุม)</label>
                  <EmployeeMultiSelect employees={employees} selected={employeeExcludes} onToggle={toggleExclude}
                    accent="#dc2626" accentBg="#fee2e2" placeholder="ค้นหาชื่อหรือรหัสพนักงาน..." />
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Gift size={14} color="#d97706" /> วันชดเชยถ้ามาทำงาน
              </label>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ถ้าพนักงานเช็คอินในวันนี้ทั้งที่ควรหยุด ระบบจะให้วันหยุดชดเชยอัตโนมัติ</div>
            </div>
            <input type="number" min={0} max={5} value={compensateDays}
              onChange={e => setCompensateDays(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
              style={{ width: 60, padding: '8px 6px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
          <button onClick={() => canSave && onSave({
              date, name: name.trim(), type, recurring,
              target_branches:    targetBranches.size    > 0 ? [...targetBranches]    : null,
              target_departments: targetDepartments.size > 0 ? [...targetDepartments] : null,
              employee_includes:  employeeIncludes.size   > 0 ? [...employeeIncludes]  : null,
              employee_excludes:  employeeExcludes.size   > 0 ? [...employeeExcludes]  : null,
              compensate_days:    compensateDays,
            })} disabled={!canSave}
            style={{ padding: '9px 22px', borderRadius: 9, border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? '#4f46e5' : '#e2e8f0', color: canSave ? '#fff' : '#94a3b8' }}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HolidayPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()

  const [year,          setYear]          = useState(new Date().getFullYear())
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null)
  const [modal,         setModal]         = useState<{ mode: 'add'; date?: string } | { mode: 'edit'; holiday: Holiday } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Holiday | null>(null)
  const [filterType,    setFilterType]    = useState<HolidayType | 'ALL'>('ALL')
  const [importConfirm, setImportConfirm] = useState(false)

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['admin', 'holidays', year],
    queryFn: () =>
      api.get('/api/v1/super-admin/holidays', { params: { year } })
         .then(r => (r.data.data as any[]).map((h: any) => ({
           ...h,
           date: h.date?.slice(0, 10) ?? h.date,
         }))),
  })

  const { data: apiBranches = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const { data: employees = [] } = useQuery<HolidayEmployee[]>({
    queryKey: ['admin', 'employees', 'for-holiday'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })

  const { data: alerts = [] } = useQuery<HolidayAlert[]>({
    queryKey: ['admin', 'holiday-worked-alerts'],
    queryFn: () => api.get('/api/v1/super-admin/holidays/worked-alerts').then(r => r.data.data),
  })

  function invalidate() { qc.invalidateQueries({ queryKey: ['admin', 'holidays', year] }) }

  const addMutation = useMutation({
    mutationFn: (data: Omit<Holiday, 'id'>) =>
      api.post('/api/v1/super-admin/holidays', data).then(r => r.data),
    onSuccess: (_, data) => { invalidate(); showToast('success', `เพิ่ม "${data.name}" เรียบร้อยแล้ว`); setModal(null) },
    onError: () => showToast('error', 'เพิ่มไม่สำเร็จ'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Omit<Holiday, 'id'> }) =>
      api.patch(`/api/v1/super-admin/holidays/${id}`, data).then(r => r.data),
    onSuccess: (_, { data }) => { invalidate(); showToast('success', `แก้ไข "${data.name}" เรียบร้อยแล้ว`); setModal(null) },
    onError: () => showToast('error', 'แก้ไขไม่สำเร็จ'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/super-admin/holidays/${id}`).then(r => r.data),
    onSuccess: (_, id) => {
      const h = holidays.find(x => x.id === id)
      invalidate(); showToast('success', `ลบ "${h?.name}" เรียบร้อยแล้ว`); setDeleteConfirm(null); setSelectedDate(null)
    },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

  const importMutation = useMutation({
    mutationFn: (items: Omit<Holiday, 'id'>[]) =>
      api.post('/api/v1/super-admin/holidays/batch', { items }).then(r => r.data),
    onSuccess: (res) => {
      invalidate()
      showToast('success', res.data?.count > 0 ? `นำเข้าวันหยุดนักขัตฤกษ์ ${res.data.count} รายการ` : 'ไม่มีวันหยุดใหม่ (มีครบแล้ว)')
      setImportConfirm(false)
    },
    onError: () => showToast('error', 'นำเข้าไม่สำเร็จ'),
  })

  const saving = addMutation.isPending || editMutation.isPending || deleteMutation.isPending || importMutation.isPending

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

  function handleAdd(data: Omit<Holiday, 'id'>) { addMutation.mutate(data) }

  function handleEdit(data: Omit<Holiday, 'id'>) {
    if (modal?.mode !== 'edit') return
    editMutation.mutate({ id: (modal as any).holiday.id, data })
  }

  function handleDelete(id: string) { deleteMutation.mutate(id) }

  function handleImport() {
    importMutation.mutate([...THAI_NATIONAL_2026, ...COMPANY_EXTRA])
  }

  // label เล็กๆ บอกว่าวันหยุดนี้จำกัดสาขา/แผนกไหมสำหรับแสดงในรายการ
  function targetLabel(h: Holiday): string | null {
    const branchNames = (h.target_branches ?? []).map(id => apiBranches.find(b => b.id === id)?.name ?? id)
    const deptCount = (h.target_departments ?? []).length
    const parts: string[] = []
    if (branchNames.length > 0) parts.push(branchNames.length === 1 ? branchNames[0] : `${branchNames.length} สาขา`)
    if (deptCount > 0) parts.push(`${deptCount} แผนก`)
    return parts.length > 0 ? parts.join(' · ') : null
  }

  // label แยกต่างหากบอกว่ามีการระบุเป็นรายบุคคลไหม (include/exclude)
  function individualLabel(h: Holiday): string | null {
    const inc = (h.employee_includes ?? []).length
    const exc = (h.employee_excludes ?? []).length
    if (inc === 0 && exc === 0) return null
    const parts: string[] = []
    if (inc > 0) parts.push(`+${inc} คน`)
    if (exc > 0) parts.push(`-${exc} คน`)
    return parts.join(' ')
  }

  function alertEmpName(a: HolidayAlert) {
    const full = `${a.employee.first_name} ${a.employee.last_name}`.trim()
    return a.employee.nickname ? `${full} (${a.employee.nickname})` : full
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>วันหยุดประจำปี</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                จัดการวันหยุดนักขัตฤกษ์และวันหยุดบริษัท — กดแก้ไขวันหยุดเพื่อเลือกสาขา/แผนกที่จะให้หยุด
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setImportConfirm(true)}
                style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> นำเข้าวันหยุดไทย {year}
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
              { icon: null,      label: `รวม ${stats.total} วัน`,          color: '#4f46e5', bg: '#eef2ff' },
              { icon: Flag,      label: `นักขัตฤกษ์ ${stats.national}`,    color: '#dc2626', bg: '#fee2e2' },
              { icon: Landmark,  label: `ศาสนา ${stats.religious}`,        color: '#d97706', bg: '#fef3c7' },
              { icon: Building2, label: `บริษัท ${stats.company}`,         color: '#2563eb', bg: '#dbeafe' },
              { icon: Repeat2,   label: `ทำซ้ำ ${stats.recurring}`,        color: '#7c3aed', bg: '#ede9fe' },
            ].map(s => (
              <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: s.bg, color: s.color }}>{s.icon && <s.icon size={12} />}{s.label}</span>
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
                              <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: 99, color: tc.color, fontWeight: 600 }}>{tc.label}</span>
                                {h.recurring && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', background: 'rgba(124,58,237,0.1)', padding: '1px 6px', borderRadius: 99, color: '#7c3aed', fontWeight: 600 }}><Repeat2 size={10} /> ทำซ้ำ</span>}
                                {targetLabel(h) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: 99, color: '#374151', fontWeight: 600 }}><Target size={10} /> {targetLabel(h)}</span>}
                                {individualLabel(h) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', background: 'rgba(255,255,255,0.6)', padding: '1px 6px', borderRadius: 99, color: '#374151', fontWeight: 600 }}><Users size={10} /> {individualLabel(h)}</span>}
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

              {alerts.length > 0 && (
                <div style={{ background: '#fffbeb', borderRadius: 14, border: '1px solid #fde68a', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={15} color="#d97706" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', flex: 1 }}>มาทำงานในวันหยุด</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: '#fef3c7', color: '#d97706' }}>{alerts.length}</span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {alerts.map((a, idx) => (
                      <div key={a.id} style={{ padding: '9px 14px', borderBottom: idx < alerts.length - 1 ? '1px solid #fef3c7' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#78350f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alertEmpName(a)}</div>
                          <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: 1 }}>{thDate(toKey(a.date))}{a.employee.branch ? ` · ${a.employee.branch.name}` : ''}</div>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fef3c7', color: '#92400e', flexShrink: 0 }}>{a.employee.employee_code}</span>
                      </div>
                    ))}
                  </div>
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
                          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: tc.bg, color: tc.color }}>{tc.label}</span>
                            {h.recurring && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed' }}><Repeat2 size={10} /></span>}
                            {targetLabel(h) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#f1f5f9', color: '#374151' }}><Target size={10} /> {targetLabel(h)}</span>}
                            {individualLabel(h) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#f1f5f9', color: '#374151' }}><Users size={10} /> {individualLabel(h)}</span>}
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

      {/* Add / Edit Modal */}
      {modal?.mode === 'add' && <HolidayModal initial={modal.date ? { date: modal.date } : undefined} branches={apiBranches} employees={employees} onSave={handleAdd} onClose={() => setModal(null)} />}
      {modal?.mode === 'edit' && <HolidayModal initial={modal.holiday} branches={apiBranches} employees={employees} onSave={handleEdit} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 360, padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#dc2626' }}><Trash2 size={28} /></div>
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
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: '#4f46e5' }}><Download size={28} /></div>
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
