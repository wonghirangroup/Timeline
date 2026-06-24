// admin/src/pages/employee/detail.tsx
import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api as axios } from '../../lib/axios'
import {
  Thermometer, ClipboardList, Sun, RefreshCw, ChevronLeft,
  BarChart2, CalendarDays, Umbrella, Info,
  CheckCircle2, Clock, XCircle, Scale, Folder, Phone,
  Building2, Smartphone, AlertTriangle, Users,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function thDate(d: string | null | undefined) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  const [y, m, day] = s.split('-').map(Number)
  return `${day}/${m}/${y + 543}`
}
function yearsFrom(d: string | null | undefined) {
  if (!d) return 0
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365))
}
function fmtTime(dt: string | null | undefined) {
  if (!dt) return null
  const d = new Date(dt)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

const AVATAR_PALETTES = [
  ['#fde68a','#78350f'], ['#bfdbfe','#1e3a8a'], ['#bbf7d0','#14532d'],
  ['#fecaca','#7f1d1d'], ['#ddd6fe','#4c1d95'], ['#fed7aa','#7c2d12'],
]
function avatarPalette(id: string) {
  const i = id.charCodeAt(id.length - 1) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[i]
}

type Tab = 'overview' | 'attendance' | 'leave' | 'info'

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ employeeId }: { employeeId: string }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth(year, month)).padStart(2,'0')}`

  const { data: attData } = useQuery({
    queryKey: ['attendance', employeeId, start, end],
    queryFn: () => axios.get('/api/v1/admin/attendance', { params: { employeeId, startDate: start, endDate: end } }).then((r: any) => r.data.data ?? []),
  })
  const { data: balData } = useQuery({
    queryKey: ['leave-balances', employeeId, year],
    queryFn: () => axios.get('/api/v1/admin/leave-balances', { params: { employeeId, year } }).then((r: any) => r.data.data ?? []),
  })
  const { data: leaveData } = useQuery({
    queryKey: ['leave-requests', employeeId],
    queryFn: () => axios.get('/api/v1/admin/leave-requests', { params: { employeeId } }).then((r: any) => r.data.data ?? []),
  })

  const records = attData ?? []
  const balances = balData ?? []
  const leaves   = leaveData ?? []

  const stats = useMemo(() => {
    const present = records.filter((r: any) => r.check_in_at)
    const late    = records.filter((r: any) => r.is_late)
    const noteAbsent = records.filter((r: any) => r.note?.includes('ขาดงาน'))
    return {
      work:   present.length,
      late:   late.length,
      absent: noteAbsent.length,
      leave:  leaves.filter((l: any) => l.status === 'APPROVED').length,
    }
  }, [records, leaves])

  function bal(type: string, field: 'used_days' | 'total_days') {
    const b = balances.find((b: any) => b.leave_type === type)
    return b ? (b[field] ?? 0) : 0
  }

  const leaveTypes = [
    { key: 'SICK',     label: 'ลาป่วย',  icon: <Thermometer size={16}/>,   color: '#dc2626', bg: '#fee2e2' },
    { key: 'PERSONAL', label: 'ลากิจ',   icon: <ClipboardList size={16}/>, color: '#d97706', bg: '#fef3c7' },
    { key: 'VACATION', label: 'พักร้อน', icon: <Sun size={16}/>,           color: '#059669', bg: '#d1fae5' },
    { key: 'MATERNITY',label: 'ลาคลอด',  icon: <RefreshCw size={16}/>,     color: '#2563eb', bg: '#dbeafe' },
  ]

  const recent = [...records].sort((a: any, b: any) => (b.date ?? '').slice(0,10).localeCompare((a.date ?? '').slice(0,10))).slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10 }}>สถิติเดือน{MONTH_TH[month-1]} {year}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {([
            { label: 'วันทำงาน', value: stats.work,   icon: <CheckCircle2 size={18}/>, color: '#059669', bg: '#d1fae5' },
            { label: 'มาสาย',   value: stats.late,   icon: <Clock size={18}/>,        color: '#d97706', bg: '#fef3c7' },
            { label: 'ขาดงาน',  value: stats.absent, icon: <XCircle size={18}/>,      color: '#dc2626', bg: '#fee2e2' },
            { label: 'วันลา',   value: stats.leave,  icon: <CalendarDays size={18}/>, color: '#2563eb', bg: '#dbeafe' },
          ] as { label: string; value: number; icon: ReactNode; color: string; bg: string }[]).map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 12px', textAlign: 'center', border: `1px solid ${s.color}20` }}>
              <div style={{ marginBottom: 4, color: s.color, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10 }}>โควต้าวันลาคงเหลือ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {leaveTypes.map(lt => {
            const used  = bal(lt.key, 'used_days')
            const quota = bal(lt.key, 'total_days')
            const rem   = Math.max(0, quota - used)
            const pct   = quota === 0 ? 0 : Math.min(100, Math.round((used / quota) * 100))
            const barColor = pct >= 100 ? '#dc2626' : pct >= 80 ? '#f59e0b' : '#10b981'
            return (
              <div key={lt.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ color: lt.color }}>{lt.icon}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: lt.color }}>{lt.label}</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: quota === 0 ? '#94a3b8' : lt.color, lineHeight: 1 }}>
                  {quota === 0 ? '—' : rem}
                  {quota > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8', marginLeft: 2 }}>/{quota} วัน</span>}
                </div>
                {quota > 0 && (
                  <>
                    <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden', margin: '8px 0 4px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ใช้ไป {used} วัน ({pct}%)</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: 10 }}>บันทึกล่าสุด 7 วัน</div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {recent.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>ยังไม่มีบันทึก</div>
          )}
          {recent.map((r: any, idx: number) => {
            const note = r.note ?? ''
            const isLate2 = note.includes('ระดับ 2')
            const isLate1 = r.is_late && !isLate2
            const isAbsent = note.includes('ขาดงาน')
            const isOff   = note.includes('วันหยุด')
            const { label, color, bg } = isAbsent
              ? { label: 'ขาดงาน', color: '#dc2626', bg: '#fee2e2' }
              : isOff
              ? { label: 'วันหยุด', color: '#0891b2', bg: '#e0f2fe' }
              : isLate2
              ? { label: 'สาย ระดับ 2', color: '#c2410c', bg: '#fde8d8' }
              : isLate1
              ? { label: 'สาย ระดับ 1', color: '#d97706', bg: '#fef3c7' }
              : r.check_in_at
              ? { label: 'มาปกติ', color: '#059669', bg: '#dcfce7' }
              : { label: '—', color: '#94a3b8', bg: '#f1f5f9' }
            const dateStr = (r.date ?? '').slice(0, 10)
            const d = new Date(dateStr + 'T00:00:00')
            const dayNames = ['อา','จ','อ','พ','พฤ','ศ','ส']
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: idx < recent.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ width: 54, flexShrink: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{dayNames[d.getDay()]}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{dateStr.slice(8)} {MONTH_TH[d.getMonth()].slice(0,3)}</div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: bg, color, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {r.check_in_at  && <span style={{ fontSize: '0.8rem', color: '#374151' }}>เข้า <strong>{fmtTime(r.check_in_at)}</strong></span>}
                  {r.check_out_at && <span style={{ fontSize: '0.8rem', color: '#374151' }}>ออก <strong>{fmtTime(r.check_out_at)}</strong></span>}
                  {r.late_minutes > 0 && <span style={{ fontSize: '0.75rem', color: '#d97706' }}>สาย {r.late_minutes} นาที</span>}
                  {r.note && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.note}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Attendance Tab ────────────────────────────────────────────────────────────
function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year,  setYear]  = useState(() => new Date().getFullYear())

  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth(year, month)).padStart(2,'0')}`

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', employeeId, start, end],
    queryFn: () => axios.get('/api/v1/admin/attendance', { params: { employeeId, startDate: start, endDate: end } }).then((r: any) => r.data.data ?? []),
  })
  const records: any[] = data ?? []

  const byDate = useMemo(() => {
    const m = new Map<string, any[]>()
    for (const r of records) {
      const k = (r.date ?? '').slice(0, 10)
      if (!k) continue
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return m
  }, [records])

  const summary = useMemo(() => {
    let work = 0, late = 0, absent = 0, leave = 0
    for (const r of records) {
      const note = r.note ?? ''
      if (note.includes('ขาดงาน')) { absent++; continue }
      if (note.includes('วันหยุด')) { leave++; continue }
      if (r.check_in_at) work++
      if (r.is_late) late++
    }
    return { work, late, absent, leave }
  }, [records])

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }

  const dayNames = ['อา','จ','อ','พ','พฤ','ศ','ส']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>‹ ก่อนหน้า</button>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{MONTH_TH[month-1]} {year} ({year+543})</span>
        <button onClick={nextMonth} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>ถัดไป ›</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: `ทำงาน ${summary.work} วัน`,   color: '#059669', bg: '#d1fae5' },
          { label: `สาย ${summary.late} ครั้ง`,   color: '#d97706', bg: '#fef3c7' },
          { label: `ขาด ${summary.absent} วัน`,   color: '#dc2626', bg: '#fee2e2' },
          { label: `หยุด/ลา ${summary.leave} วัน`, color: '#0891b2', bg: '#e0f2fe' },
        ].map(s => (
          <span key={s.label} style={{ fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>กำลังโหลด...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 90px 90px 120px 1fr', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['วันที่','วัน','เวลาเข้า','เวลาออก','สถานะ','หมายเหตุ'].map(h => (
              <div key={h} style={{ padding: '9px 12px', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>
          {Array.from({ length: daysInMonth(year, month) }, (_, i) => {
            const dayNum = i + 1
            const dateKey = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
            const recs = byDate.get(dateKey)
            const r = recs?.[0]
            const dow = new Date(dateKey).getDay()
            const note = r?.note ?? ''
            const isAbsent = note.includes('ขาดงาน')
            const isOff    = note.includes('วันหยุด')
            const isLate2  = note.includes('ระดับ 2')
            const isLate1  = r?.is_late && !isLate2
            const { label, color, bg } = isAbsent
              ? { label: 'ขาดงาน',     color: '#dc2626', bg: '#fff5f5' }
              : isOff
              ? { label: 'วันหยุด',    color: '#0891b2', bg: '#f0f9ff' }
              : isLate2
              ? { label: 'สาย ระดับ 2', color: '#c2410c', bg: '#fff7ed' }
              : isLate1
              ? { label: 'สาย ระดับ 1', color: '#d97706', bg: '#fffbeb' }
              : r?.check_in_at
              ? { label: 'มาปกติ',     color: '#059669', bg: '#f0fdf4' }
              : (dow === 0 || dow === 6)
              ? { label: 'เสาร์/อาทิตย์', color: '#94a3b8', bg: '#fafafa' }
              : { label: '—',           color: '#94a3b8', bg: '#fff' }
            return (
              <div key={dateKey} style={{
                display: 'grid', gridTemplateColumns: '90px 80px 90px 90px 120px 1fr',
                borderBottom: dayNum < daysInMonth(year, month) ? '1px solid #f8fafc' : 'none',
                background: bg,
              }}>
                <div style={{ padding: '9px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center' }}>{dateKey.slice(8)} {MONTH_TH[month-1].slice(0,3)}</div>
                <div style={{ padding: '9px 12px', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>{dayNames[dow]}</div>
                <div style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#059669', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                  {fmtTime(r?.check_in_at) ?? '—'}
                </div>
                <div style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#374151', display: 'flex', alignItems: 'center' }}>
                  {fmtTime(r?.check_out_at) ?? '—'}
                </div>
                <div style={{ padding: '9px 8px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: `${color}20`, color, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                <div style={{ padding: '9px 12px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                  {note && note !== label ? note : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Leave Tab ─────────────────────────────────────────────────────────────────
function LeaveTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', employeeId],
    queryFn: () => axios.get('/api/v1/admin/leave-requests', { params: { employeeId } }).then((r: any) => r.data.data ?? []),
  })
  const requests: any[] = data ?? []

  const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
    PENDING:  { color: '#d97706', bg: '#fef3c7' },
    APPROVED: { color: '#059669', bg: '#d1fae5' },
    REJECTED: { color: '#dc2626', bg: '#fee2e2' },
  }
  const STATUS_LABEL: Record<string, string> = {
    PENDING: 'รอ', APPROVED: 'อนุมัติ', REJECTED: 'ปฏิเสธ',
  }
  const TYPE_COLOR: Record<string, { color: string; label: string }> = {
    SICK:      { color: '#dc2626', label: 'ลาป่วย' },
    PERSONAL:  { color: '#d97706', label: 'ลากิจ' },
    VACATION:  { color: '#059669', label: 'พักร้อน' },
    MATERNITY: { color: '#2563eb', label: 'ลาคลอด' },
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>กำลังโหลด...</div>

  if (requests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.4 }}><CalendarDays size={40}/></div>
        <div style={{ fontSize: '0.9rem' }}>ยังไม่มีประวัติการลา</div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '130px 130px 80px 1fr 90px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {['ประเภท','ช่วงวันที่','จำนวน','เหตุผล','สถานะ'].map(h => (
          <div key={h} style={{ padding: '9px 12px', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>
      {requests.map((r: any, idx: number) => {
        // ถ้า reason มี prefix [ประเภทเดิม] จาก Firebase → แสดงชื่อเดิมแทน
        const originalType = r.reason?.match(/^\[(.+?)\]/)?.[1]
        const baseLabel = TYPE_COLOR[r.leave_type]?.label ?? r.leave_type
        const tc = {
          color: TYPE_COLOR[r.leave_type]?.color ?? '#64748b',
          label: originalType ?? baseLabel,
        }
        const sc = STATUS_COLOR[r.status] ?? { color: '#64748b', bg: '#f1f5f9' }
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '130px 130px 80px 1fr 90px', borderBottom: idx < requests.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: `${tc.color}20`, color: tc.color }}>{tc.label}</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{thDate(r.start_date)}</div>
              {r.end_date && r.end_date.slice(0,10) !== r.start_date?.slice(0,10) && (
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ถึง {thDate(r.end_date)}</div>
              )}
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{r.days ?? 1}</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 3 }}>วัน</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.reason ?? '—').replace(/^\[.+?\]\s*/, '')}</span>
            </div>
            <div style={{ padding: '11px 12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: sc.bg, color: sc.color }}>{STATUS_LABEL[r.status] ?? r.status}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Info Tab ──────────────────────────────────────────────────────────────────
function InfoTab({ emp }: { emp: any }) {
  const rows = [
    { label: 'รหัสพนักงาน',   value: emp.employee_code,  mono: true },
    { label: 'ชื่อ-สกุล',     value: `${emp.first_name} ${emp.last_name}` },
    { label: 'ชื่อเล่น',      value: emp.nickname ?? '—' },
    { label: 'แผนก',          value: emp.department ?? '—' },
    { label: 'สาขา',          value: emp.branch?.name ?? '—' },
    { label: 'เบอร์โทร',      value: emp.phone ?? '—', mono: true },
    { label: 'วันที่เริ่มงาน', value: thDate(emp.hired_at) },
    { label: 'อายุงาน',       value: `${yearsFrom(emp.hired_at)} ปี` },
    { label: 'สถานะ',         value: emp.is_active ? 'ปฏิบัติงานอยู่' : 'ไม่ได้ปฏิบัติงาน' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', borderBottom: i < rows.length - 1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={{ width: 140, padding: '13px 16px', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>{r.label}</div>
            <div style={{ flex: 1, padding: '13px 16px', fontSize: '0.875rem', color: '#0f172a', fontFamily: r.mono ? 'monospace' : 'inherit', fontWeight: r.mono ? 600 : 400 }}>{r.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${emp.line_user_id ? '#e2e8f0' : '#fde68a'}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 140, padding: '13px 16px', background: emp.line_user_id ? '#f8fafc' : '#fffbeb', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>Line Account</div>
          <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {emp.line_user_id ? (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#15803d' }}>✓ ผูกแล้ว</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {emp.line_user_id.slice(0, 8)}••••{emp.line_user_id.slice(-4)}
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e' }}>⚠ ยังไม่ผูก</span>
                <span style={{ fontSize: '0.78rem', color: '#b45309' }}>พนักงานต้องกดลิงก์ยืนยันตัวตนก่อนใช้ LIFF</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [inviteSent, setInviteSent] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => axios.get(`/api/v1/admin/employees/${id}`).then((r: any) => r.data.data ?? null),
    enabled: !!id,
  })

  const emp = data

  function handleSendInvite() {
    setInviteSent(true)
    setTimeout(() => setInviteSent(false), 3000)
  }

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</div>
  }

  if (isError || !emp) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', opacity: 0.4 }}><Users size={36}/></div>
        <div style={{ fontSize: '1rem', color: '#64748b' }}>ไม่พบข้อมูลพนักงาน</div>
        <button onClick={() => navigate('/employee')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>
          <ChevronLeft size={14} style={{ display: 'inline', marginRight: 4 }}/>กลับรายการ
        </button>
      </div>
    )
  }

  const fullName = `${emp.first_name} ${emp.last_name}`
  const nickname = emp.nickname ?? fullName.slice(0, 2)
  const [avatarBg, avatarText] = avatarPalette(emp.id)

  const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: 'overview',   label: 'ภาพรวม',        icon: <BarChart2 size={15}/> },
    { key: 'attendance', label: 'ประวัติเช็คอิน', icon: <ClipboardList size={15}/> },
    { key: 'leave',      label: 'วันลา',          icon: <Umbrella size={15}/> },
    { key: 'info',       label: 'ข้อมูลส่วนตัว',  icon: <Info size={15}/> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Profile Header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px' }}>
        <button
          onClick={() => navigate('/employee')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.84rem', marginBottom: 16, padding: 0 }}
        >
          <ChevronLeft size={16}/> รายการพนักงาน
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, flexShrink: 0,
            background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: avatarText,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          }}>
            {nickname.slice(0, 2)}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{fullName}</h1>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({nickname})</span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: emp.is_active ? '#d1fae5' : '#fee2e2',
                color: emp.is_active ? '#059669' : '#dc2626',
              }}>{emp.is_active ? '● ปฏิบัติงาน' : '○ ไม่ได้ปฏิบัติงาน'}</span>
              {emp.line_user_id ? (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                  ✓ ผูก Line แล้ว
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                  ⚠ ยังไม่ผูก Line
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f1f5f9', padding: '3px 10px', borderRadius: 7, color: '#374151', fontWeight: 600 }}>{emp.employee_code}</span>
              {emp.department && <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Folder size={13}/>{emp.department}</span>}
              {emp.phone && <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13}/>{emp.phone}</span>}
              {emp.hired_at && <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={13}/>เริ่มงาน {thDate(emp.hired_at)} ({yearsFrom(emp.hired_at)} ปี)</span>}
            </div>

            {emp.branch && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={11}/>{emp.branch.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {!emp.line_user_id && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#92400e' }}>พนักงานยังไม่ได้ผูก Line account</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>ไม่สามารถเช็คอินผ่าน Line LIFF ได้จนกว่าจะผูก account</div>
            </div>
            {inviteSent ? (
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '6px 14px', borderRadius: 8 }}>✓ ส่งแล้ว!</span>
            ) : (
              <button
                onClick={handleSendInvite}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Smartphone size={14}/>ส่งลิงก์ผูก Line
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 2, marginTop: 20, borderBottom: '2px solid #f1f5f9' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 18px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: tab === t.key ? 700 : 500,
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#ea580c' : '#64748b',
              borderBottom: tab === t.key ? '2px solid #f97316' : '2px solid transparent',
              marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {tab === 'overview'   && <OverviewTab   employeeId={emp.id} />}
        {tab === 'attendance' && <AttendanceTab employeeId={emp.id} />}
        {tab === 'leave'      && <LeaveTab      employeeId={emp.id} />}
        {tab === 'info'       && <InfoTab       emp={emp} />}
      </div>
    </div>
  )
}
