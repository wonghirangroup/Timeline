// admin/src/pages/leave/DayOffBatchModal.tsx
// ลงวันหยุดให้พนักงานจากหน้า "ปฏิทินรวม" (feedback 2026-10-05):
//   mode 'single' — เลือกพนักงาน 1 คน → กดวันที่บนปฏิทินได้หลายวัน → บันทึก
//   mode 'multi'  — modal เต็มจอแบบตาราง (แถว = พนักงาน, คอลัมน์ = วันที่ในเดือน) ติ๊กวันหยุดได้หลายคนพร้อมกัน
// ทั้งสองโหมดเลือกได้ไม่เกิน "โควต้าที่เหลือ" ต่อคน (โควต้าจองวันหยุด/เดือน ตาม cascade เดียวกับพนักงานจองเอง — ปกติ 5 วัน)
// บันทึกผ่าน POST /admin/weekly-off/batch (อนุมัติอัตโนมัติ) — วันไหนไม่ผ่านจะแจ้งเหตุผลรายวัน
// เกินโควต้าแล้วกดวันเพิ่ม → ถามว่า "ใช้ลาพักร้อนไหม" ถ้าใช่วันนั้นลงเป็นใบลาพักร้อน (ส้ม) หักจากโควต้าพักร้อน แทนวันหยุดจอง
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/axios'
import Modal from '../../components/ui/Modal'
import SearchSelect from '../../components/shared/SearchSelect'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'

interface Emp { id: string; first_name: string; last_name: string; nickname?: string | null; employee_code: string; branch: { id: string; name: string } }
interface QuotaRow { employee_id: string; quota: number; booked: number; remaining: number }
interface OffReq { id: string; employee_id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface BatchFailed { employee_id: string; date: string; code?: string; kind?: 'off' | 'vacation' }
interface VacAsk { empId: string; date: string }

const DOW_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const REASON_TH: Record<string, string> = {
  BOOKING_DISABLED: 'สาขา/กลุ่มปิดสิทธิ์จองวันหยุด',
  OVER_QUOTA: 'เกินโควต้าของเดือน',
  ALREADY_REQUESTED: 'มีวันหยุดวันนี้อยู่แล้ว',
  MONTHLY_CAP_EXCEEDED: 'หยุด + พักร้อน เกิน 10 วัน/เดือน',
  LEAVE_OVERLAP: 'มีวันลาทับซ้อนอยู่แล้ว',
  LEAVE_DISABLED: 'สาขา/กลุ่มปิดการลาประเภทนี้',
}
const ORANGE = { fg: '#c2410c', bg: '#ffedd5', bd: '#fb923c' }

function daysIn(month: string) { const [y, m] = month.split('-').map(Number); return new Date(y, m, 0).getDate() }
function keyOf(month: string, d: number) { return `${month}-${String(d).padStart(2, '0')}` }
function dowOf(month: string, d: number) { const [y, m] = month.split('-').map(Number); return new Date(y, m - 1, d).getDay() }
// week_start (จันทร์) + day_of_week → วันที่จริง
function resolveDate(weekStart: string, dow: number): string {
  const d = new Date(weekStart.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}
const nameOf = (e: Emp) => `${e.first_name} ${e.last_name}${e.nickname ? ` (${e.nickname})` : ''}`

// ── ข้อมูลที่ใช้ร่วมกันทั้งสองโหมด ──
function useBatchData(month: string) {
  const { data: employees = [] } = useQuery<Emp[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: quotas = [] } = useQuery<QuotaRow[]>({
    queryKey: ['admin', 'weekly-off', month, 'quotas-all'],
    queryFn: () => api.get('/api/v1/admin/weekly-off/quotas', { params: { month, all: true } }).then(r => r.data.data),
  })
  const { data: requests = [] } = useQuery<OffReq[]>({
    queryKey: ['admin', 'weekly-off', month],
    queryFn: () => api.get('/api/v1/admin/weekly-off', { params: { month } }).then(r => r.data.data),
  })
  // ยอดพักร้อนคงเหลือต่อคน (ไว้บอกในคำถาม "ใช้พักร้อนไหม") — ดึงไม่ได้ (ไม่มีสิทธิ์/ปิดฟีเจอร์) ก็ไม่แสดงตัวเลข ไม่กระทบการลงวันหยุด
  const year = Number(month.slice(0, 4))
  const { data: balances = [] } = useQuery<{ employee_id: string; vacation: { total: number; used: number } }[]>({
    queryKey: ['admin', 'leave-balances-vac', year],
    queryFn: () => api.get('/api/v1/admin/leave-balances/employees', { params: { year } }).then(r => r.data.data),
    retry: false,
  })
  const vacLeftOf = useMemo(() => new Map(balances.map(b => [b.employee_id, b.vacation.total - b.vacation.used])), [balances])
  const quotaOf = useMemo(() => new Map(quotas.map(q => [q.employee_id, q])), [quotas])
  // วันที่จองไว้แล้ว (ไม่นับที่ปฏิเสธ) ต่อพนักงาน → date → สถานะ
  const bookedIdOf = useMemo(() => {
    const m = new Map<string, Map<string, string>>()
    for (const r of requests) {
      if (r.status === 'REJECTED') continue
      const d = resolveDate(r.week_start, r.day_of_week)
      if (d.slice(0, 7) !== month) continue
      if (!m.has(r.employee_id)) m.set(r.employee_id, new Map())
      m.get(r.employee_id)!.set(d, r.id)
    }
    return m
  }, [requests, month])
  const bookedOf = useMemo(() => {
    const m = new Map<string, Map<string, 'PENDING' | 'APPROVED'>>()
    for (const r of requests) {
      if (r.status === 'REJECTED') continue
      const d = resolveDate(r.week_start, r.day_of_week)
      if (d.slice(0, 7) !== month) continue
      if (!m.has(r.employee_id)) m.set(r.employee_id, new Map())
      m.get(r.employee_id)!.set(d, r.status)
    }
    return m
  }, [requests, month])
  return { employees: [...employees].sort((a, b) => a.first_name.localeCompare(b.first_name, 'th')), quotaOf, bookedOf, bookedIdOf, vacLeftOf }
}

// โควต้าที่ยังเลือกเพิ่มได้ = โควต้า − จองไว้แล้ว (ค่าเริ่มต้น 5 ถ้ายังไม่มีข้อมูลโควต้า)
function useRemaining(quotaOf: Map<string, QuotaRow>, bookedOf: Map<string, Map<string, string>>) {
  return (empId: string) => {
    const q = quotaOf.get(empId)
    const booked = bookedOf.get(empId)?.size ?? 0
    return { quota: q?.quota ?? 5, booked, remaining: Math.max(0, (q?.quota ?? 5) - booked) }
  }
}

// ── บันทึก + แสดงผลรายวัน ──
function useBatchSave(month: string, onDone: () => void) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [result, setResult] = useState<{ created: number; failed: BatchFailed[]; items: { employee_id: string; dates?: string[]; vacation_dates?: string[] }[] } | null>(null)
  const [success, setSuccess] = useState<{ created: number } | null>(null)
  const mut = useMutation({
    mutationFn: (p: { items: { employee_id: string; dates?: string[]; vacation_dates?: string[] }[]; force?: boolean }) =>
      api.post('/api/v1/admin/weekly-off/batch', p).then(r => r.data.data as { created: number; failed: BatchFailed[]; total: number }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'weekly-off'] })
      onDone()
      if (data.failed.length === 0) { setResult(null); setSuccess({ created: data.created }) }
      else setResult({ created: data.created, failed: data.failed, items: vars.items })
    },
    onError: () => showToast('error', 'ลงวันหยุดไม่สำเร็จ'),
  })
  return { mut, result, setResult, success, setSuccess }
}

function ResultView({ result, empById, onRetryForce, onClose, saving }: {
  result: NonNullable<ReturnType<typeof useBatchSave>['result']>; empById: Map<string, Emp>
  onRetryForce: () => void; onClose: () => void; saving: boolean
}) {
  const canForce = result.failed.some(f => f.code === 'BOOKING_DISABLED' && f.kind !== 'vacation')
  return (
    <div style={{ padding: 22 }}>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>ลงวันหยุดสำเร็จ {result.created} วัน · ไม่สำเร็จ {result.failed.length} วัน</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>วันที่ผ่านถูกบันทึกแล้ว วันที่ไม่ผ่านมีเหตุผลด้านล่าง</div>
      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        {result.failed.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderBottom: i < result.failed.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.8rem' }}>
            <span><b>{empById.get(f.employee_id) ? nameOf(empById.get(f.employee_id)!) : f.employee_id}</b> · {f.date.slice(8)}/{f.date.slice(5, 7)}{f.kind === 'vacation' ? <span style={{ color: ORANGE.fg, fontWeight: 700 }}> (ลาพักร้อน)</span> : null}</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>{REASON_TH[f.code ?? ''] ?? f.code}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        {canForce && (
          <button onClick={onRetryForce} disabled={saving}
            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            ยืนยันเพิ่มให้อยู่ดี (สาขา/กลุ่มปิดสิทธิ์จอง)
          </button>
        )}
        <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ปิด</button>
      </div>
    </div>
  )
}

// popup สำเร็จ: วงกลมเขียวเด้งขึ้น + เครื่องหมายถูกวาดเส้นทีละนิด แล้วเรียก onDone เองหลัง ~1.8 วินาที
function SuccessView({ count, subtitle, onDone, doneLabel }: { count: number; subtitle?: string; onDone: () => void; doneLabel: string }) {
  // เก็บ onDone ล่าสุดไว้ใน ref — ไม่งั้นทุกครั้งที่ข้อมูลรีเฟรช (ได้ฟังก์ชันใหม่) ตัวจับเวลาจะเริ่มนับใหม่ไม่จบ
  const doneRef = useRef(onDone); doneRef.current = onDone
  useEffect(() => { const t = setTimeout(() => doneRef.current(), 1800); return () => clearTimeout(t) }, [])
  return (
    <div style={{ padding: '40px 24px 30px', textAlign: 'center' }}>
      <style>{`
        @keyframes dob-pop { 0% { transform: scale(0.3); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes dob-draw { to { stroke-dashoffset: 0 } }
        @keyframes dob-ring { 0% { transform: scale(0.8); opacity: 0.55 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes dob-rise { from { transform: translateY(8px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .dob-anim, .dob-anim * { animation-duration: 0.01s !important; animation-delay: 0s !important } }
      `}</style>
      <div className="dob-anim" style={{ position: 'relative', width: 92, height: 92, margin: '0 auto 18px' }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#16a34a', animation: 'dob-ring .9s ease-out .15s both' }} />
        <svg viewBox="0 0 92 92" width="92" height="92" style={{ position: 'relative', animation: 'dob-pop .5s cubic-bezier(.2,.9,.3,1.2) both' }}>
          <circle cx="46" cy="46" r="42" fill="#dcfce7" stroke="#16a34a" strokeWidth="4" />
          <path d="M27 48 L41 62 L66 33" fill="none" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="60" strokeDashoffset="60" style={{ animation: 'dob-draw .45s ease-out .35s forwards' }} />
        </svg>
      </div>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', animation: 'dob-rise .4s ease-out .5s both' }}>ลงวันหยุดสำเร็จแล้ว</div>
      <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4, animation: 'dob-rise .4s ease-out .6s both' }}>{subtitle ? `${subtitle} · ` : ''}{count} วัน (อนุมัติอัตโนมัติ)</div>
      <button onClick={onDone} style={{ marginTop: 20, padding: '8px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', animation: 'dob-rise .4s ease-out .8s both' }}>{doneLabel}</button>
    </div>
  )
}

// คำถามเมื่อเลือกวันหยุดเกินโควต้า: ใช้ลาพักร้อนแทนไหม (ยืนยัน = วันนั้นลงเป็นใบลาพักร้อน)
function VacationAsk({ ask, name, quota, vacLeft, vacPicked, onYes, onNo }: {
  ask: VacAsk | null; name: string; quota: number; vacLeft: number | undefined; vacPicked: number; onYes: () => void; onNo: () => void
}) {
  if (!ask) return null
  const d = `${ask.date.slice(8)}/${ask.date.slice(5, 7)}`
  const after = vacLeft != null ? vacLeft - vacPicked - 1 : null
  return (
    <ConfirmDialog
      variant="warning"
      title="ครบโควต้าวันหยุดแล้ว — ใช้ลาพักร้อนไหม?"
      message={`${name} จองวันหยุดครบโควต้า ${quota} วัน/เดือนแล้ว ต้องการลงวันที่ ${d} เป็น "ลาพักร้อน" เพิ่มหรือไม่? (หักจากโควต้าพักร้อน 1 วัน${vacLeft != null ? ` · คงเหลือ ${vacLeft - vacPicked} วัน → หลังลงเหลือ ${after}${after != null && after < 0 ? ' (ติดลบ)' : ''}` : ''})`}
      confirmLabel="ใช้ลาพักร้อน"
      onConfirm={onYes}
      onCancel={onNo}
    />
  )
}

// สถานะรอส่ง force ซ้ำ: เอาเฉพาะวันที่ล้มเหลวเพราะ BOOKING_DISABLED
function forceItems(result: NonNullable<ReturnType<typeof useBatchSave>['result']>) {
  const m = new Map<string, string[]>()
  for (const f of result.failed) if (f.code === 'BOOKING_DISABLED' && f.kind !== 'vacation') m.set(f.employee_id, [...(m.get(f.employee_id) ?? []), f.date])
  return [...m.entries()].map(([employee_id, dates]) => ({ employee_id, dates }))
}

// ═════════════════ โหมดรายคน ═════════════════
function SingleMode({ month, onClose, onDone }: { month: string; onClose: () => void; onDone: () => void }) {
  const { employees, quotaOf, bookedOf, bookedIdOf, vacLeftOf } = useBatchData(month)
  const remainingOf = useRemaining(quotaOf, bookedOf)
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [empId, setEmpId] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  // วันที่จองไว้แล้วที่กด "ปล่อย" (คืนโควต้า) เพื่อไปลงวันอื่นแทน — เท่ากับเปลี่ยนวันหยุด; ลบจริงตอนกดบันทึกเท่านั้น
  const [released, setReleased] = useState<string[]>([])
  const [releasing, setReleasing] = useState(false)
  const [vac, setVac] = useState<string[]>([])          // วันที่เกินโควต้าแล้วเลือกใช้ลาพักร้อน
  const [ask, setAsk] = useState<VacAsk | null>(null)
  const { mut, result, setResult, success, setSuccess } = useBatchSave(month, onDone)
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])
  const [savedName, setSavedName] = useState('')

  const info = empId ? remainingOf(empId) : null
  const booked = empId ? bookedOf.get(empId) : undefined
  const room = info ? info.remaining + released.length - picked.length : 0
  const total = daysIn(month)
  const lead = dowOf(month, 1)
  const [y, m] = month.split('-').map(Number)

  function toggleRelease(date: string) {
    setReleased(r => r.includes(date) ? r.filter(d => d !== date) : [...r, date])
    // ถ้าปล่อยแล้วกลับมาติ๊กคืน แต่ที่เลือกใหม่เกินโควต้า ให้ตัดวันที่เลือกล่าสุดออกให้พอดี
    setPicked(p => { const cap = (info?.remaining ?? 0) + (released.includes(date) ? released.length - 1 : released.length + 1); return p.length > cap ? p.slice(0, Math.max(0, cap)) : p })
  }

  async function saveAll() {
    setSavedName(empById.get(empId) ? nameOf(empById.get(empId)!) : '')
    const ids = released.map(d => bookedIdOf.get(empId)?.get(d)).filter((x): x is string => !!x)
    if (ids.length > 0) {
      setReleasing(true)
      try {
        await Promise.all(ids.map(id => api.delete(`/api/v1/admin/weekly-off/${id}`)))
        await qc.invalidateQueries({ queryKey: ['admin', 'weekly-off'] })
      } catch {
        showToast('error', 'ปล่อยวันหยุดเดิมไม่สำเร็จ — ยังไม่ได้ลงวันใหม่ ลองอีกครั้ง')
        setReleasing(false); return
      }
      setReleasing(false)
    }
    if (picked.length + vac.length > 0) mut.mutate({ items: [{ employee_id: empId, dates: picked, vacation_dates: vac }] })
    else { showToast('success', `ยกเลิกวันหยุดเดิม ${ids.length} วันแล้ว`); onDone(); setReleased([]) }
  }

  function toggle(date: string) {
    if (picked.includes(date)) { setPicked(p => p.filter(d => d !== date)); return }
    if (vac.includes(date)) { setVac(v => v.filter(d => d !== date)); return }
    if (room > 0) setPicked(p => [...p, date])
    else setAsk({ empId, date })   // ครบโควต้าแล้ว → ถามว่าจะใช้ลาพักร้อนไหม
  }

  // บันทึกสำเร็จ → โชว์แอนิเมชัน แล้วกลับมาที่ฟอร์มนี้ (เคลียร์ชื่อ/วันที่ พร้อมลงให้คนต่อไป)
  if (success) {
    return <SuccessView count={success.created} subtitle={savedName} doneLabel="ลงให้คนต่อไป"
      onDone={() => { setSuccess(null); setEmpId(''); setPicked([]); setVac([]); setReleased([]); setResult(null) }} />
  }
  if (result) {
    return <ResultView result={result} empById={empById} saving={mut.isPending}
      onRetryForce={() => mut.mutate({ items: forceItems(result), force: true })} onClose={onClose} />
  }

  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>ลงวันหยุดให้พนักงาน · {MONTHS_TH[m - 1]} {y + 543}</div>
        <button onClick={onClose} aria-label="ปิด" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={18} /></button>
      </div>

      <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>1. เลือกพนักงาน</label>
      <SearchSelect value={empId} onChange={v => { setEmpId(v); setPicked([]); setVac([]); setReleased([]) }} placeholder="เลือกพนักงาน..."
        options={employees.map(e => ({ value: e.id, label: `${nameOf(e)} · ${e.branch.name}`, keywords: e.employee_code }))}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem' }} />

      {info && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px', flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>2. กดเลือกวันหยุดบนปฏิทิน (หลายวันได้) · กดวันที่จองไว้แล้วเพื่อ "ปล่อย" ไปลงวันอื่นแทน</label>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: room > 0 ? '#f0fdf4' : '#fffbeb', color: room > 0 ? '#16a34a' : '#b45309', border: `1px solid ${room > 0 ? '#bbf7d0' : '#fde68a'}` }}>
              จองแล้ว {info.booked - released.length}/{info.quota}{released.length > 0 && <span style={{ color: '#dc2626' }}> · ปล่อย {released.length}</span>} · เลือกเพิ่ม {picked.length} · เหลือ {room} วัน
              {vac.length > 0 && <span style={{ color: ORANGE.fg }}> · ลาพักร้อน {vac.length}</span>}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DOW_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', padding: '3px 0' }}>{d}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: total }, (_, i) => i + 1).map(d => {
              const date = keyOf(month, d)
              const bk = booked?.get(date)
              const rel = !!bk && released.includes(date)
              const sel = picked.includes(date)
              const vsel = vac.includes(date)
              const full = !sel && !vsel && !bk && room <= 0   // ครบโควต้า — ยังกดได้ (จะถามว่าใช้ลาพักร้อนไหม)
              return (
                <button key={d} onClick={() => bk ? toggleRelease(date) : toggle(date)}
                  title={bk ? (rel ? 'จะปล่อยวันนี้ตอนบันทึก — กดอีกครั้งเพื่อยกเลิก' : `มีวันหยุดแล้ว (${bk === 'APPROVED' ? 'อนุมัติ' : 'รอพิจารณา'}) — กดเพื่อปล่อยวันนี้ แล้วเลือกวันอื่นแทน`) : vsel ? 'ลาพักร้อน (กดเพื่อยกเลิก)' : full ? 'ครบโควต้าแล้ว — กดเพื่อใช้ลาพักร้อน' : undefined}
                  style={{
                    height: 40, borderRadius: 9, fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700,
                    border: `1.5px ${rel ? 'dashed' : 'solid'} ${rel ? '#f87171' : sel ? '#244B83' : vsel ? ORANGE.bd : bk ? (bk === 'APPROVED' ? '#86efac' : '#fde68a') : '#e5e7eb'}`,
                    background: rel ? '#fef2f2' : sel ? '#244B83' : vsel ? ORANGE.bg : bk ? (bk === 'APPROVED' ? '#dcfce7' : '#fef9c3') : '#fff',
                    color: rel ? '#dc2626' : sel ? '#fff' : vsel ? ORANGE.fg : bk ? (bk === 'APPROVED' ? '#16a34a' : '#b45309') : (full ? '#94a3b8' : '#374151'),
                    textDecoration: rel ? 'line-through' : 'none',
                    cursor: 'pointer',
                  }}>
                  {d}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, flexWrap: 'wrap' }}>
            <span><b style={{ color: '#244B83' }}>■</b> เลือกใหม่</span><span><b style={{ color: '#ea580c' }}>■</b> ใช้ลาพักร้อน</span><span><b style={{ color: '#dc2626' }}>■</b> ปล่อย (จะลบตอนบันทึก)</span><span><b style={{ color: '#16a34a' }}>■</b> มีอยู่แล้ว (อนุมัติ)</span><span><b style={{ color: '#ca8a04' }}>■</b> มีอยู่แล้ว (รอพิจารณา)</span>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>ยกเลิก</button>
        <button disabled={!empId || picked.length + vac.length + released.length === 0 || mut.isPending || releasing}
          onClick={saveAll}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !empId || picked.length + vac.length + released.length === 0 ? 0.5 : 1 }}>
          {mut.isPending || releasing ? 'กำลังบันทึก...' : released.length > 0 ? `บันทึก (ปล่อย ${released.length} · เพิ่ม ${picked.length + vac.length})` : `บันทึก${picked.length + vac.length ? ` (${picked.length + vac.length} วัน)` : ''}`}
        </button>
      </div>

      <VacationAsk ask={ask} name={empById.get(empId) ? nameOf(empById.get(empId)!) : ''} quota={info?.quota ?? 5} vacLeft={vacLeftOf.get(empId)} vacPicked={vac.length}
        onYes={() => { if (ask) setVac(v => [...v, ask.date]); setAsk(null) }} onNo={() => setAsk(null)} />
    </div>
  )
}

// ═════════════════ โหมดหลายคน (ตารางเต็มจอ) ═════════════════
function MultiMode({ month, onClose, onDone }: { month: string; onClose: () => void; onDone: () => void }) {
  const { employees, quotaOf, bookedOf, bookedIdOf, vacLeftOf } = useBatchData(month)
  const remainingOf = useRemaining(quotaOf, bookedOf)
  const qc = useQueryClient()
  const { showToast } = useToast()
  // วันที่จองไว้แล้วที่กด "ปล่อย" (คืนโควต้า) ต่อพนักงาน — ลบจริงตอนกดบันทึกเท่านั้น
  const [released, setReleased] = useState<Record<string, string[]>>({})
  const [releasing, setReleasing] = useState(false)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [vac, setVac] = useState<Record<string, string[]>>({})   // วันที่เกินโควต้าแล้วเลือกใช้ลาพักร้อน
  const [ask, setAsk] = useState<VacAsk | null>(null)
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const { mut, result, success } = useBatchSave(month, onDone)
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])
  const total = daysIn(month)
  const [y, m] = month.split('-').map(Number)

  const branches = useMemo(() => [...new Map(employees.map(e => [e.branch.id, e.branch.name])).entries()], [employees])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter(e => (!branchId || e.branch.id === branchId) &&
      (!q || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q)))
  }, [employees, search, branchId])

  const vacDays = Object.values(vac).reduce((n, a) => n + a.length, 0)
  const totalDays = Object.values(picked).reduce((n, a) => n + a.length, 0) + vacDays
  const releasedDays = Object.values(released).reduce((n, a) => n + a.length, 0)
  const totalPeople = new Set([...Object.entries(picked), ...Object.entries(vac)].filter(([, a]) => a.length > 0).map(([id]) => id)).size

  const roomOf = (empId: string) => remainingOf(empId).remaining + (released[empId]?.length ?? 0)

  function toggleRelease(empId: string, date: string) {
    const cur = released[empId] ?? []
    const nextRel = cur.includes(date) ? cur.filter(d => d !== date) : [...cur, date]
    setReleased(r => ({ ...r, [empId]: nextRel }))
    // ถ้าคืนการปล่อยแล้วที่เลือกใหม่เกินโควต้า ตัดวันที่เลือกล่าสุดออกให้พอดี
    const cap = remainingOf(empId).remaining + nextRel.length
    setPicked(p => (p[empId]?.length ?? 0) > cap ? { ...p, [empId]: p[empId].slice(0, cap) } : p)
  }

  async function saveAll() {
    const delIds: string[] = []
    for (const [empId, dates] of Object.entries(released)) for (const d of dates) { const id = bookedIdOf.get(empId)?.get(d); if (id) delIds.push(id) }
    if (delIds.length > 0) {
      setReleasing(true)
      try {
        await Promise.all(delIds.map(id => api.delete(`/api/v1/admin/weekly-off/${id}`)))
        await qc.invalidateQueries({ queryKey: ['admin', 'weekly-off'] })
      } catch {
        showToast('error', 'ปล่อยวันหยุดเดิมไม่สำเร็จ — ยังไม่ได้ลงวันใหม่ ลองอีกครั้ง')
        setReleasing(false); return
      }
      setReleasing(false)
    }
    const items = [...new Set([...Object.keys(picked), ...Object.keys(vac)])]
      .map(employee_id => ({ employee_id, dates: picked[employee_id] ?? [], vacation_dates: vac[employee_id] ?? [] }))
      .filter(i => i.dates.length + i.vacation_dates.length > 0)
    if (items.length > 0) mut.mutate({ items })
    else { showToast('success', `ยกเลิกวันหยุดเดิม ${delIds.length} วันแล้ว`); onDone(); setReleased({}) }
  }

  function toggle(empId: string, date: string) {
    const cur = picked[empId] ?? []
    if (cur.includes(date)) { setPicked(p => ({ ...p, [empId]: cur.filter(d => d !== date) })); return }
    if ((vac[empId] ?? []).includes(date)) { setVac(v => ({ ...v, [empId]: (v[empId] ?? []).filter(d => d !== date) })); return }
    if (cur.length < roomOf(empId)) setPicked(p => ({ ...p, [empId]: [...cur, date] }))
    else setAsk({ empId, date })   // ครบโควต้าแล้ว → ถามว่าจะใช้ลาพักร้อนไหม
  }

  if (success) {
    return <SuccessView count={success.created} subtitle={`${totalPeople} คน`} doneLabel="ปิด" onDone={onClose} />
  }
  if (result) {
    return <ResultView result={result} empById={empById} saving={mut.isPending}
      onRetryForce={() => mut.mutate({ items: forceItems(result), force: true })} onClose={onClose} />
  }

  const CELL = 30
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '88vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>ลงวันหยุดหลายคน · {MONTHS_TH[m - 1]} {y + 543}</div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส"
            style={{ padding: '7px 10px 7px 28px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', fontFamily: 'inherit', width: 170 }} />
        </div>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', fontFamily: 'inherit' }}>
          <option value="">ทุกสาขา</option>
          {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>กดช่องวันที่เพื่อเลือก/ยกเลิก · เลือกได้ไม่เกินโควต้าที่เหลือของแต่ละคน</span>
        <button onClick={onClose} aria-label="ปิด" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={20} /></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.78rem' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, top: 0, zIndex: 3, background: '#f8fafc', padding: '8px 12px', textAlign: 'left', minWidth: 240, borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>พนักงาน</th>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', padding: '8px 10px', minWidth: 76, borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>โควต้า</th>
              {Array.from({ length: total }, (_, i) => i + 1).map(d => {
                const dw = dowOf(month, d)
                const we = dw === 0 || dw === 6
                return (
                  <th key={d} style={{ position: 'sticky', top: 0, zIndex: 2, background: we ? '#fef2f2' : '#f8fafc', width: CELL, minWidth: CELL, padding: '4px 0', borderBottom: '1px solid #e5e7eb', textAlign: 'center', color: we ? '#dc2626' : '#475569' }}>
                    <div style={{ fontWeight: 800 }}>{d}</div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600 }}>{DOW_SHORT[dw]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map(e => {
              const info = remainingOf(e.id)
              const sel = picked[e.id] ?? []
              const vsel = vac[e.id] ?? []
              const rels = released[e.id] ?? []
              const left = info.remaining + rels.length - sel.length
              const booked = bookedOf.get(e.id)
              return (
                <tr key={e.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '5px 12px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{nameOf(e)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{e.employee_code} · {e.branch.name}</div>
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #e5e7eb', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: left > 0 ? '#f0fdf4' : '#fffbeb', color: left > 0 ? '#16a34a' : '#b45309' }}>
                      {info.booked - rels.length + sel.length}/{info.quota}
                    </span>
                    {vsel.length > 0 && <span title="ลาพักร้อน (เกินโควต้าวันหยุด)" style={{ marginLeft: 4, fontSize: '0.7rem', fontWeight: 800, color: ORANGE.fg }}>+พ{vsel.length}</span>}
                  </td>
                  {Array.from({ length: total }, (_, i) => i + 1).map(d => {
                    const date = keyOf(month, d)
                    const bk = booked?.get(date)
                    const rel = !!bk && rels.includes(date)
                    const on = sel.includes(date)
                    const von = vsel.includes(date)
                    const full = !on && !von && !bk && left <= 0   // ครบโควต้า — ยังกดได้ (จะถามว่าใช้ลาพักร้อนไหม)
                    const dw = dowOf(month, d)
                    return (
                      <td key={d} style={{ padding: 2, borderBottom: '1px solid #f1f5f9', background: dw === 0 || dw === 6 ? '#fffafa' : undefined }}>
                        <button onClick={() => bk ? toggleRelease(e.id, date) : toggle(e.id, date)}
                          title={bk ? (rel ? 'จะปล่อยวันนี้ตอนบันทึก (กดอีกครั้งเพื่อยกเลิก)' : 'มีวันหยุดแล้ว — กดเพื่อปล่อย แล้วเลือกวันอื่นแทน') : von ? 'ลาพักร้อน (กดเพื่อยกเลิก)' : full ? 'ครบโควต้าแล้ว — กดเพื่อใช้ลาพักร้อน' : undefined}
                          style={{
                            width: CELL - 6, height: CELL - 6, borderRadius: 6, padding: 0, fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
                            border: `1.5px ${rel ? 'dashed' : 'solid'} ${rel ? '#f87171' : on ? '#244B83' : von ? ORANGE.bd : bk ? (bk === 'APPROVED' ? '#86efac' : '#fde68a') : '#e5e7eb'}`,
                            background: rel ? '#fef2f2' : on ? '#244B83' : von ? ORANGE.bg : bk ? (bk === 'APPROVED' ? '#dcfce7' : '#fef9c3') : '#fff',
                            color: rel ? '#dc2626' : on ? '#fff' : von ? ORANGE.fg : bk ? (bk === 'APPROVED' ? '#16a34a' : '#b45309') : 'transparent',
                            cursor: 'pointer', opacity: full ? 0.55 : 1,
                          }}>
                          {rel ? '✕' : on ? '✓' : von ? 'พ' : bk ? '•' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {shown.length === 0 && <tr><td colSpan={total + 2} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบพนักงาน</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span><b style={{ color: '#244B83' }}>■</b> เลือกใหม่</span><span><b style={{ color: '#ea580c' }}>■</b> ใช้ลาพักร้อน (เกินโควต้า)</span><span><b style={{ color: '#dc2626' }}>■</b> ปล่อย (กดวันที่จองไว้แล้ว — ลบตอนบันทึก)</span><span><b style={{ color: '#16a34a' }}>■</b> มีอยู่แล้ว (อนุมัติ)</span><span><b style={{ color: '#ca8a04' }}>■</b> มีอยู่แล้ว (รอพิจารณา)</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>{releasedDays > 0 && <span style={{ color: '#dc2626' }}>ปล่อย {releasedDays} วัน · </span>}เลือกแล้ว {totalDays} วัน{vacDays > 0 ? <span style={{ color: ORANGE.fg }}> (ลาพักร้อน {vacDays})</span> : null} · {totalPeople} คน</span>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>ยกเลิก</button>
        <button disabled={totalDays + releasedDays === 0 || mut.isPending || releasing} onClick={saveAll}
          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: totalDays + releasedDays === 0 ? 0.5 : 1 }}>
          {mut.isPending || releasing ? 'กำลังบันทึก...' : releasedDays > 0 ? `บันทึกทั้งหมด (ปล่อย ${releasedDays} · เพิ่ม ${totalDays})` : `บันทึกทั้งหมด (${totalDays} วัน)`}
        </button>
      </div>

      <VacationAsk ask={ask} name={ask && empById.get(ask.empId) ? nameOf(empById.get(ask.empId)!) : ''} quota={ask ? remainingOf(ask.empId).quota : 5}
        vacLeft={ask ? vacLeftOf.get(ask.empId) : undefined} vacPicked={ask ? (vac[ask.empId] ?? []).length : 0}
        onYes={() => { if (ask) setVac(v => ({ ...v, [ask.empId]: [...(v[ask.empId] ?? []), ask.date] })); setAsk(null) }} onNo={() => setAsk(null)} />
    </div>
  )
}

export default function DayOffBatchModal({ mode, month, onClose, onDone }: { mode: 'single' | 'multi'; month: string; onClose: () => void; onDone: () => void }) {
  return (
    <Modal onClose={onClose} dismissable={false} width={mode === 'single' ? 520 : Math.max(640, window.innerWidth - 32)}>
      {mode === 'single' ? <SingleMode month={month} onClose={onClose} onDone={onDone} /> : <MultiMode month={month} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}
