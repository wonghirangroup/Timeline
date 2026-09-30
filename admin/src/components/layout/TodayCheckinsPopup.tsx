// admin/src/components/layout/TodayCheckinsPopup.tsx
// popup รายชื่อคนที่เช็คอินวันนี้ทั้งหมด กดเปิดได้จาก Topbar ทุกหน้า (มือถือ/
// บราวเซอร์) — feedback 2026-09-30: "อยากเปิดเป็น popup รายชื่อคนที่เช็คอิน
// วันนี้... เพื่อให้ HR ไว้ดูตอนเช้า" ข้อมูลชุดเดียวกับที่ Dashboard ใช้คำนวณ
// การ์ดสถานะ แต่ทำเป็น popup แยกที่เข้าถึงได้จากทุกหน้าโดยไม่ต้องไปหน้า Dashboard
// ก่อน แล้วกดการ์ดเพื่อดูรายชื่อ (เดิมต้อง 2 ขั้นตอนบนมือถือ)
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck2, Search, Building2, X } from 'lucide-react'
import { api } from '../../lib/axios'
import { avatarUrl } from '../../lib/upload'
import { fmtThaiDate } from '../../lib/format'
import Modal from '../ui/Modal'
import { SkeletonRows } from '../ui/Skeleton'

interface ApiRecord {
  id: string; employee_id: string
  check_in_at: string | null
  is_late: boolean; is_absent: boolean
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; photo_url?: string | null; branch: { id: string; name: string } }
  shift: { id: string; name: string; late_threshold_2: string | null }
}
interface ApiEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null
  photo_url?: string | null; branch: { id: string; name: string }
}

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

export default function TodayCheckinsPopup({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const today = useMemo(todayStr, [])
  const [search, setSearch] = useState('')

  const { data: employees = [], isLoading: empLoading } = useQuery<ApiEmployee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: records = [], isLoading: recLoading } = useQuery<ApiRecord[]>({
    queryKey: ['admin', 'attendance', today],
    queryFn: () => api.get('/api/v1/admin/attendance', { params: { date: today } }).then(r => r.data.data),
  })
  const loading = empLoading || recLoading

  const rows = useMemo(() => {
    const byEmp = new Map(records.map(r => [r.employee_id, r]))
    const out = employees.map(e => {
      const r = byEmp.get(e.id) ?? null
      return {
        id: e.id, name: `${e.first_name} ${e.last_name}`, nickname: e.nickname,
        photo_url: e.photo_url, branch: e.branch, shiftName: r?.shift.name ?? null,
        checkInAt: r?.check_in_at ?? null, status: deriveStatus(r),
      }
    })
    // เช็คอินแล้วขึ้นก่อน เรียงตามเวลา — ที่ยังไม่เช็คไปอยู่ท้ายสุด เรียงชื่อ
    out.sort((a, b) => {
      if (a.checkInAt && b.checkInAt) return a.checkInAt < b.checkInAt ? -1 : 1
      if (a.checkInAt) return -1
      if (b.checkInAt) return 1
      return a.name.localeCompare(b.name, 'th')
    })
    return out
  }, [employees, records])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(r => `${r.name} ${r.nickname ?? ''} ${r.branch?.name ?? ''}`.toLowerCase().includes(q))
  }, [rows, search])

  const checkedIn = rows.filter(r => r.checkInAt).length
  const lateCount = rows.filter(r => r.status === 'LATE_1' || r.status === 'LATE_2').length

  return (
    <Modal onClose={onClose} width={480} dismissable labelledBy="today-checkins-title">
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        {/* Header */}
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 99 }}>เช็คอินแล้ว {checkedIn}/{rows.length} คน</span>
            {lateCount > 0 && <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '4px 10px', borderRadius: 99 }}>มาสาย {lateCount} คน</span>}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ, สาขา..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '8px 20px' }}><SkeletonRows rows={6} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>ไม่พบพนักงาน</div>
          ) : (
            filtered.map((row, i) => {
              const s = STATUS_CFG[row.status]
              return (
                <div key={row.id} onClick={() => { onClose(); navigate(`/employee/${row.id}`) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: row.photo_url ? '#e2e8f0' : `linear-gradient(135deg, hsl(${(i * 47) % 360},60%,60%), hsl(${(i * 47 + 30) % 360},70%,45%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                    {row.photo_url ? <img src={avatarUrl(row.photo_url, 68) ?? row.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : row.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.name}{row.nickname ? ` (${row.nickname})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Building2 size={10} style={{ flexShrink: 0 }} /> {row.branch?.name ?? '—'}{row.shiftName ? ` · ${row.shiftName}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(row.checkInAt)}</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: s.color, background: s.bg, padding: '1px 8px', borderRadius: 99 }}>{s.label}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
