// admin/src/pages/leave/DayOffBatchModal.tsx
// ลงวันหยุดให้พนักงานจากหน้า "ปฏิทินรวม" (feedback 2026-10-05):
//   mode 'single' — เลือกพนักงาน 1 คน → กดวันที่บนปฏิทินได้หลายวัน → บันทึก
//   mode 'multi'  — modal เต็มจอแบบตาราง (แถว = พนักงาน, คอลัมน์ = วันที่ในเดือน) ติ๊กวันหยุดได้หลายคนพร้อมกัน
// ทั้งสองโหมดเลือกได้ไม่เกิน "โควต้าที่เหลือ" ต่อคน (โควต้าจองวันหยุด/เดือน ตาม cascade เดียวกับพนักงานจองเอง — ปกติ 5 วัน)
// บันทึกผ่าน POST /admin/weekly-off/batch (อนุมัติอัตโนมัติ) — วันไหนไม่ผ่านจะแจ้งเหตุผลรายวัน
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/axios'
import Modal from '../../components/ui/Modal'
import SearchSelect from '../../components/shared/SearchSelect'
import { useToast } from '../../components/ui/Toast'

interface Emp { id: string; first_name: string; last_name: string; nickname?: string | null; employee_code: string; branch: { id: string; name: string } }
interface QuotaRow { employee_id: string; quota: number; booked: number; remaining: number }
interface OffReq { id: string; employee_id: string; week_start: string; day_of_week: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' }
interface BatchFailed { employee_id: string; date: string; code?: string }

const DOW_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const REASON_TH: Record<string, string> = {
  BOOKING_DISABLED: 'สาขา/กลุ่มปิดสิทธิ์จองวันหยุด',
  OVER_QUOTA: 'เกินโควต้าของเดือน',
  ALREADY_REQUESTED: 'มีวันหยุดวันนี้อยู่แล้ว',
  MONTHLY_CAP_EXCEEDED: 'หยุด + พักร้อน เกิน 10 วัน/เดือน',
}

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
  const quotaOf = useMemo(() => new Map(quotas.map(q => [q.employee_id, q])), [quotas])
  // วันที่จองไว้แล้ว (ไม่นับที่ปฏิเสธ) ต่อพนักงาน → date → สถานะ
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
  return { employees: [...employees].sort((a, b) => a.first_name.localeCompare(b.first_name, 'th')), quotaOf, bookedOf }
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
  const [result, setResult] = useState<{ created: number; failed: BatchFailed[]; items: { employee_id: string; dates: string[] }[] } | null>(null)
  const mut = useMutation({
    mutationFn: (p: { items: { employee_id: string; dates: string[] }[]; force?: boolean }) =>
      api.post('/api/v1/admin/weekly-off/batch', p).then(r => r.data.data as { created: number; failed: BatchFailed[]; total: number }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'weekly-off'] })
      onDone()
      if (data.failed.length === 0) { showToast('success', `ลงวันหยุดสำเร็จ ${data.created} วัน`); setResult(null) }
      else setResult({ created: data.created, failed: data.failed, items: vars.items })
    },
    onError: () => showToast('error', 'ลงวันหยุดไม่สำเร็จ'),
  })
  return { mut, result, setResult }
}

function ResultView({ result, empById, onRetryForce, onClose, saving }: {
  result: NonNullable<ReturnType<typeof useBatchSave>['result']>; empById: Map<string, Emp>
  onRetryForce: () => void; onClose: () => void; saving: boolean
}) {
  const canForce = result.failed.some(f => f.code === 'BOOKING_DISABLED')
  return (
    <div style={{ padding: 22 }}>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>ลงวันหยุดสำเร็จ {result.created} วัน · ไม่สำเร็จ {result.failed.length} วัน</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>วันที่ผ่านถูกบันทึกแล้ว วันที่ไม่ผ่านมีเหตุผลด้านล่าง</div>
      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        {result.failed.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderBottom: i < result.failed.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.8rem' }}>
            <span><b>{empById.get(f.employee_id) ? nameOf(empById.get(f.employee_id)!) : f.employee_id}</b> · {f.date.slice(8)}/{f.date.slice(5, 7)}</span>
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

// สถานะรอส่ง force ซ้ำ: เอาเฉพาะวันที่ล้มเหลวเพราะ BOOKING_DISABLED
function forceItems(result: NonNullable<ReturnType<typeof useBatchSave>['result']>) {
  const m = new Map<string, string[]>()
  for (const f of result.failed) if (f.code === 'BOOKING_DISABLED') m.set(f.employee_id, [...(m.get(f.employee_id) ?? []), f.date])
  return [...m.entries()].map(([employee_id, dates]) => ({ employee_id, dates }))
}

// ═════════════════ โหมดรายคน ═════════════════
function SingleMode({ month, onClose, onDone }: { month: string; onClose: () => void; onDone: () => void }) {
  const { employees, quotaOf, bookedOf } = useBatchData(month)
  const remainingOf = useRemaining(quotaOf, bookedOf)
  const [empId, setEmpId] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const { mut, result, setResult } = useBatchSave(month, onDone)
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])

  const info = empId ? remainingOf(empId) : null
  const booked = empId ? bookedOf.get(empId) : undefined
  const room = info ? info.remaining - picked.length : 0
  const total = daysIn(month)
  const lead = dowOf(month, 1)
  const [y, m] = month.split('-').map(Number)

  function toggle(date: string) {
    setPicked(p => p.includes(date) ? p.filter(d => d !== date) : (room > 0 ? [...p, date] : p))
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
      <SearchSelect value={empId} onChange={v => { setEmpId(v); setPicked([]) }} placeholder="เลือกพนักงาน..."
        options={employees.map(e => ({ value: e.id, label: `${nameOf(e)} · ${e.branch.name}`, keywords: e.employee_code }))}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem' }} />

      {info && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px', flexWrap: 'wrap', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>2. กดเลือกวันหยุดบนปฏิทิน (หลายวันได้)</label>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: room > 0 ? '#f0fdf4' : '#fffbeb', color: room > 0 ? '#16a34a' : '#b45309', border: `1px solid ${room > 0 ? '#bbf7d0' : '#fde68a'}` }}>
              จองแล้ว {info.booked}/{info.quota} · เลือกเพิ่ม {picked.length} · เหลือ {room} วัน
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DOW_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', padding: '3px 0' }}>{d}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: total }, (_, i) => i + 1).map(d => {
              const date = keyOf(month, d)
              const bk = booked?.get(date)
              const sel = picked.includes(date)
              const blocked = !sel && !bk && room <= 0
              return (
                <button key={d} disabled={!!bk || blocked} onClick={() => toggle(date)}
                  title={bk ? (bk === 'APPROVED' ? 'มีวันหยุดแล้ว (อนุมัติ)' : 'มีวันหยุดแล้ว (รอพิจารณา)') : blocked ? 'ครบโควต้าแล้ว' : undefined}
                  style={{
                    height: 40, borderRadius: 9, fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 700,
                    border: `1.5px solid ${sel ? '#244B83' : bk ? (bk === 'APPROVED' ? '#86efac' : '#fde68a') : '#e5e7eb'}`,
                    background: sel ? '#244B83' : bk ? (bk === 'APPROVED' ? '#dcfce7' : '#fef9c3') : '#fff',
                    color: sel ? '#fff' : bk ? (bk === 'APPROVED' ? '#16a34a' : '#b45309') : (blocked ? '#cbd5e1' : '#374151'),
                    cursor: bk || blocked ? 'not-allowed' : 'pointer',
                  }}>
                  {d}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, flexWrap: 'wrap' }}>
            <span><b style={{ color: '#244B83' }}>■</b> เลือกใหม่</span><span><b style={{ color: '#16a34a' }}>■</b> มีอยู่แล้ว (อนุมัติ)</span><span><b style={{ color: '#ca8a04' }}>■</b> มีอยู่แล้ว (รอพิจารณา)</span>
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>ยกเลิก</button>
        <button disabled={!empId || picked.length === 0 || mut.isPending}
          onClick={() => mut.mutate({ items: [{ employee_id: empId, dates: picked }] })}
          style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: !empId || picked.length === 0 ? 0.5 : 1 }}>
          {mut.isPending ? 'กำลังบันทึก...' : `บันทึก${picked.length ? ` (${picked.length} วัน)` : ''}`}
        </button>
      </div>
    </div>
  )
}

// ═════════════════ โหมดหลายคน (ตารางเต็มจอ) ═════════════════
function MultiMode({ month, onClose, onDone }: { month: string; onClose: () => void; onDone: () => void }) {
  const { employees, quotaOf, bookedOf } = useBatchData(month)
  const remainingOf = useRemaining(quotaOf, bookedOf)
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const { mut, result } = useBatchSave(month, onDone)
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees])
  const total = daysIn(month)
  const [y, m] = month.split('-').map(Number)

  const branches = useMemo(() => [...new Map(employees.map(e => [e.branch.id, e.branch.name])).entries()], [employees])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter(e => (!branchId || e.branch.id === branchId) &&
      (!q || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q)))
  }, [employees, search, branchId])

  const totalDays = Object.values(picked).reduce((n, a) => n + a.length, 0)
  const totalPeople = Object.values(picked).filter(a => a.length > 0).length

  function toggle(empId: string, date: string) {
    setPicked(p => {
      const cur = p[empId] ?? []
      if (cur.includes(date)) return { ...p, [empId]: cur.filter(d => d !== date) }
      if (cur.length >= remainingOf(empId).remaining) return p   // ครบโควต้าที่เหลือแล้ว
      return { ...p, [empId]: [...cur, date] }
    })
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
              const left = info.remaining - sel.length
              const booked = bookedOf.get(e.id)
              return (
                <tr key={e.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '5px 12px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{nameOf(e)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{e.employee_code} · {e.branch.name}</div>
                  </td>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #e5e7eb', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: left > 0 ? '#f0fdf4' : '#fffbeb', color: left > 0 ? '#16a34a' : '#b45309' }}>
                      {info.booked + sel.length}/{info.quota}
                    </span>
                  </td>
                  {Array.from({ length: total }, (_, i) => i + 1).map(d => {
                    const date = keyOf(month, d)
                    const bk = booked?.get(date)
                    const on = sel.includes(date)
                    const blocked = !on && !bk && left <= 0
                    const dw = dowOf(month, d)
                    return (
                      <td key={d} style={{ padding: 2, borderBottom: '1px solid #f1f5f9', background: dw === 0 || dw === 6 ? '#fffafa' : undefined }}>
                        <button disabled={!!bk || blocked} onClick={() => toggle(e.id, date)}
                          title={bk ? 'มีวันหยุดแล้ว' : blocked ? 'ครบโควต้าแล้ว' : undefined}
                          style={{
                            width: CELL - 6, height: CELL - 6, borderRadius: 6, padding: 0, fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 800,
                            border: `1.5px solid ${on ? '#244B83' : bk ? (bk === 'APPROVED' ? '#86efac' : '#fde68a') : '#e5e7eb'}`,
                            background: on ? '#244B83' : bk ? (bk === 'APPROVED' ? '#dcfce7' : '#fef9c3') : '#fff',
                            color: on ? '#fff' : bk ? (bk === 'APPROVED' ? '#16a34a' : '#b45309') : 'transparent',
                            cursor: bk || blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.35 : 1,
                          }}>
                          {on ? '✓' : bk ? '•' : ''}
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
          <span><b style={{ color: '#244B83' }}>■</b> เลือกใหม่</span><span><b style={{ color: '#16a34a' }}>■</b> มีอยู่แล้ว (อนุมัติ)</span><span><b style={{ color: '#ca8a04' }}>■</b> มีอยู่แล้ว (รอพิจารณา)</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>เลือกแล้ว {totalDays} วัน · {totalPeople} คน</span>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>ยกเลิก</button>
        <button disabled={totalDays === 0 || mut.isPending}
          onClick={() => mut.mutate({ items: Object.entries(picked).filter(([, a]) => a.length > 0).map(([employee_id, dates]) => ({ employee_id, dates })) })}
          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#244B83', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: totalDays === 0 ? 0.5 : 1 }}>
          {mut.isPending ? 'กำลังบันทึก...' : `บันทึกทั้งหมด (${totalDays} วัน)`}
        </button>
      </div>
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
