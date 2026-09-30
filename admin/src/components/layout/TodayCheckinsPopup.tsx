// admin/src/components/layout/TodayCheckinsPopup.tsx
// popup รายชื่อคนที่เช็คอินวันนี้ทั้งหมด กดเปิดได้จาก Topbar ทุกหน้า (มือถือ/
// บราวเซอร์) — feedback 2026-09-30: "อยากเปิดเป็น popup รายชื่อคนที่เช็คอิน
// วันนี้... เพื่อให้ HR ไว้ดูตอนเช้า" ข้อมูลชุดเดียวกับที่ Dashboard ใช้คำนวณ
// การ์ดสถานะ แต่ทำเป็น popup แยกที่เข้าถึงได้จากทุกหน้าโดยไม่ต้องไปหน้า Dashboard
// ก่อน แล้วกดการ์ดเพื่อดูรายชื่อ (เดิมต้อง 2 ขั้นตอนบนมือถือ)
//
// จอ Desktop (feedback 2026-09-30 รอบ 2): "แบ่งเป็นสาขาเลย ให้เต็มจอเป็นช่องๆ
// แบ่งเป็น Grid เลย แต่ว่าจะขึ้นเป็นสาขาที่เช็คอินด้วยในกรณีที่มีสาขารอง" —
// เปลี่ยนจาก modal เล็กเป็น overlay เต็มจอ แบ่งช่อง grid ต่อสาขา คนที่เช็คอิน
// แล้วจัดเข้าสาขาตามกะที่เช็คอินจริง (shift.branch) ไม่ใช่สาขาหลักของพนักงาน
// (เผื่อเช็คอินที่สาขารอง) ส่วนคนที่ยังไม่เช็คอินเลย ใช้สาขาหลักไปก่อน (ยังไม่รู้
// ว่าจะมาเช็คอินที่ไหน) — มือถือยังคงเป็นลิสต์เดียวเหมือนเดิม (จอเล็กเกินจะแบ่ง grid)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck2, Search, Building2, X } from 'lucide-react'
import { api } from '../../lib/axios'
import { avatarUrl } from '../../lib/upload'
import { fmtThaiDate } from '../../lib/format'
import { useIsMobile } from '../../hooks/useIsMobile'
import Modal from '../ui/Modal'
import { SkeletonRows } from '../ui/Skeleton'

interface ApiRecord {
  id: string; employee_id: string
  check_in_at: string | null
  is_late: boolean; is_absent: boolean
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; photo_url?: string | null; branch: { id: string; name: string } }
  shift: { id: string; name: string; late_threshold_2: string | null; branch: { id: string; name: string } }
}
interface ApiEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  photo_url?: string | null; branch: { id: string; name: string }
}
interface ApiBranch { id: string; name: string }

type Status = 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'ABSENT' | 'PENDING'
const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  ON_TIME: { label: 'มาปกติ',    color: '#16a34a', bg: '#dcfce7' },
  LATE_1:  { label: 'มาสาย',    color: '#d97706', bg: '#fef3c7' },
  LATE_2:  { label: 'สายมาก',   color: '#dc2626', bg: '#fee2e2' },
  ABSENT:  { label: 'ขาด',      color: '#7f1d1d', bg: '#fef2f2' },
  PENDING: { label: 'ยังไม่เช็ค', color: '#64748b', bg: '#E6ECF4' },
}

function toMins(hhmm: string): number { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

function deriveStatus(r: ApiRecord | null): Status {
  if (!r || !r.check_in_at) return 'PENDING'
  if (r.is_absent) return 'ABSENT'
  if (!r.is_late) return 'ON_TIME'
  if (r.shift.late_threshold_2) {
    const bkk = new Date(new Date(r.check_in_at).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    if (bkk.getHours() * 60 + bkk.getMinutes() >= toMins(r.shift.late_threshold_2)) return 'LATE_2'
  }
  return 'LATE_1'
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false })
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Row {
  id: string; name: string; nickname: string | null; photo_url?: string | null
  branchId: string; branchName: string; shiftName: string | null
  checkInAt: string | null; status: Status
}

function useRows() {
  const today = useMemo(todayStr, [])
  const { data: employees = [], isLoading: empLoading } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: records = [], isLoading: recLoading } = useQuery<ApiRecord[]>({
    queryKey: ['admin', 'attendance', today],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { date: today } }).then(r => r.data.data),
  })
  const { data: branches = [], isLoading: branchLoading } = useQuery<ApiBranch[]>({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data),
  })

  const rows = useMemo((): Row[] => {
    const byEmp = new Map(records.map(r => [r.employee_id, r]))
    const out = employees.map(e => {
      const r = byEmp.get(e.id) ?? null
      // จัดเข้าสาขาตามที่เช็คอินจริง (shift.branch) ถ้ามี ไม่งั้นใช้สาขาหลักของ
      // พนักงานไปก่อน (ยังไม่เช็คอิน เลยยังไม่รู้ว่าจะมาที่ไหน)
      const branchId   = r?.shift.branch.id   ?? e.branch.id
      const branchName = r?.shift.branch.name ?? e.branch.name
      return {
        id: e.id, name: `${e.first_name} ${e.last_name}`, nickname: e.nickname,
        photo_url: e.photo_url, branchId, branchName, shiftName: r?.shift.name ?? null,
        checkInAt: r?.check_in_at ?? null, status: deriveStatus(r),
      }
    })
    out.sort((a, b) => {
      if (a.checkInAt && b.checkInAt) return a.checkInAt < b.checkInAt ? -1 : 1
      if (a.checkInAt) return -1
      if (b.checkInAt) return 1
      return a.name.localeCompare(b.name, 'th')
    })
    return out
  }, [employees, records])

  return { rows, branches, today, loading: empLoading || recLoading || branchLoading }
}

// ─── แถวพนักงาน 1 คน — ใช้ร่วมกันทั้งมือถือ (ลิสต์เดียว) และเดสก์ท็อป (ในช่อง grid) ──
function EmployeeRow({ row, i, onClick }: { row: Row; i: number; onClick: () => void }) {
  const s = STATUS_CFG[row.status]
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: row.photo_url ? '#e2e8f0' : `linear-gradient(135deg, hsl(${(i * 47) % 360},60%,60%), hsl(${(i * 47 + 30) % 360},70%,45%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff' }}>
        {row.photo_url ? <img src={avatarUrl(row.photo_url, 60) ?? row.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : row.name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.name}{row.nickname ? ` (${row.nickname})` : ''}
        </div>
        {row.shiftName && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.shiftName}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '12.5px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(row.checkInAt)}</div>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: s.color, background: s.bg, padding: '1px 7px', borderRadius: 99 }}>{s.label}</span>
      </div>
    </div>
  )
}

// ─── Header ใช้ร่วมกันทั้ง 2 โหมด ──────────────────────────────────────────
function Header({ today, checkedIn, total, lateCount, search, setSearch, onClose }: {
  today: string; checkedIn: number; total: number; lateCount: number
  search: string; setSearch: (v: string) => void; onClose: () => void
}) {
  return (
    <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E6ECF4', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div id="today-checkins-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '15px', color: '#111827' }}>
          <CalendarCheck2 size={18} color="#244B83" /> เช็คอินวันนี้
        </div>
        <button onClick={onClose} aria-label="ปิด" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12 }}>{fmtThaiDate(today)}</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 99 }}>เช็คอินแล้ว {checkedIn}/{total} คน</span>
        {lateCount > 0 && <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '4px 10px', borderRadius: 99 }}>มาสาย {lateCount} คน</span>}
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, สาขา..."
          style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
      </div>
    </div>
  )
}

export default function TodayCheckinsPopup({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { rows, branches, today, loading } = useRows()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(r => `${r.name} ${r.nickname ?? ''} ${r.branchName}`.toLowerCase().includes(q))
  }, [rows, search])

  const checkedIn = rows.filter(r => r.checkInAt).length
  const lateCount = rows.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length

  const goToEmployee = (id: string) => { onClose(); navigate(`/employee/${id}`) }

  // Modal.tsx ให้ Esc/scroll-lock ในโหมดมือถืออยู่แล้ว — desktop overlay ทำเอง
  // ตรงนี้ (ต้องอยู่บนสุด ก่อน return แบบมีเงื่อนไข ไม่งั้นผิด Rules of Hooks
  // ตอนย่อ-ขยายจอสลับ mobile/desktop)
  useEffect(() => {
    if (isMobile) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', onKey) }
  }, [isMobile, onClose])

  // ── จัดกลุ่มตามสาขา — ตอนค้นหาโชว์เฉพาะสาขาที่มีคนตรงเงื่อนไข กันช่องว่างรก
  // ตอนไม่ค้นหาโชว์ทุกสาขาแม้ยังไม่มีใครเช็คอินเลย (เห็นภาพรวมครบ) ─────────
  const byBranch = useMemo(() => {
    const map = new Map<string, { name: string; rows: Row[] }>()
    for (const b of branches) map.set(b.id, { name: b.name, rows: [] })
    for (const r of filtered) {
      if (!map.has(r.branchId)) map.set(r.branchId, { name: r.branchName, rows: [] })
      map.get(r.branchId)!.rows.push(r)
    }
    const groups = [...map.entries()].map(([id, v]) => ({ id, ...v }))
    if (search.trim()) return groups.filter(g => g.rows.length > 0)
    return groups.sort((a, b) => b.rows.length - a.rows.length)
  }, [branches, filtered, search])

  // ── มือถือ: ลิสต์เดียวเหมือนเดิม (จอเล็กเกินจะแบ่ง grid หลายสาขา) ──────────
  if (isMobile) {
    return (
      <Modal onClose={onClose} width={480} dismissable labelledBy="today-checkins-title">
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
          <Header today={today} checkedIn={checkedIn} total={rows.length} lateCount={lateCount} search={search} setSearch={setSearch} onClose={onClose} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '8px 20px' }}><SkeletonRows rows={6} /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>ไม่พบพนักงาน</div>
            ) : (
              filtered.map((row, i) => (
                <div key={row.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                  <EmployeeRow row={row} i={i} onClick={() => goToEmployee(row.id)} />
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    )
  }

  // ── เดสก์ท็อป: overlay เต็มจอ แบ่ง grid ต่อสาขา ──────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 500, display: 'flex', flexDirection: 'column' }}
      role="dialog" aria-modal="true" aria-labelledby="today-checkins-title">
      <Header today={today} checkedIn={checkedIn} total={rows.length} lateCount={lateCount} search={search} setSearch={setSearch} onClose={onClose} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {loading ? (
          <SkeletonRows rows={8} />
        ) : byBranch.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>ไม่พบพนักงาน</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {byBranch.map(group => {
              const groupCheckedIn = group.rows.filter(r => r.checkInAt).length
              return (
                <div key={group.id} style={{ border: '1px solid #E6ECF4', borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: '70vh', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #E6ECF4', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Building2 size={14} color="#244B83" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, fontWeight: 700, fontSize: '13px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#244B83', background: '#E6ECF4', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{groupCheckedIn}/{group.rows.length}</span>
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {group.rows.length === 0 ? (
                      <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>ไม่มีพนักงาน</div>
                    ) : (
                      group.rows.map((row, i) => (
                        <div key={row.id} style={{ borderBottom: i < group.rows.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none' }}>
                          <EmployeeRow row={row} i={i} onClick={() => goToEmployee(row.id)} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
