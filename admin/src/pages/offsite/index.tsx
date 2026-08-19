import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Clock, ExternalLink, Navigation } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'

interface ApiOffsiteCheckin {
  id: string
  check_in_at: string
  check_in_lat: string
  check_in_lng: string
  check_in_address: string | null
  check_out_at: string | null
  check_out_lat: string | null
  check_out_lng: string | null
  check_out_address: string | null
  note: string | null
  employee: {
    id: string; first_name: string; last_name: string; nickname: string; employee_code: string
    branch: { id: string; name: string }
  }
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9',
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} · ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
}
function mapsUrl(lat: string, lng: string) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}
function duration(startIso: string, endIso: string | null): string {
  if (!endIso) return '—'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (mins < 60) return `${mins} นาที`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

export default function OffsitePage() {
  const isMobile = useIsMobile()
  const [branchFilter, setBranchFilter] = useState('')

  const { data: rows = [] } = useQuery<ApiOffsiteCheckin[]>({
    queryKey: ['admin', 'offsite-checkins'],
    queryFn: () => api.get('/api/v1/admin/offsite-checkins').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const branches = useMemo(() => [...new Set(rows.map(r => r.employee.branch.name))], [rows])
  const filtered = branchFilter ? rows.filter(r => r.employee.branch.name === branchFilter) : rows

  const activeCount = rows.filter(r => !r.check_out_at).length
  const monthCount  = rows.filter(r => {
    const d = new Date(r.check_in_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: isMobile ? 8 : 10 }}>
        {[
          { label: 'กำลังอยู่นอกสถานที่', icon: <Navigation size={15}/>, value: activeCount, unit: 'คน', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'รวมเดือนนี้',          icon: <Clock size={15}/>,      value: monthCount,  unit: 'ครั้ง', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">ทุกสาขา</option>
          {branches.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {/* ── List ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {isMobile ? (
          <div>
            {filtered.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: !r.check_out_at ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{r.employee.first_name} {r.employee.last_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 1 }}>{r.employee.branch.name}</div>
                  </div>
                  {!r.check_out_at && (
                    <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>กำลังนอกสถานที่</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: '#374151', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#9ca3af', minWidth: 46 }}>เข้า</span>
                    <span>{thDateTime(r.check_in_at)}</span>
                    <a href={mapsUrl(r.check_in_lat, r.check_in_lng)} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <MapPin size={12} /><ExternalLink size={10} />
                    </a>
                  </div>
                  {r.check_in_address && (
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 52 }}>{r.check_in_address}</div>
                  )}
                  {r.check_out_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#9ca3af', minWidth: 46 }}>ออก</span>
                      <span>{thDateTime(r.check_out_at)}</span>
                      <a href={mapsUrl(r.check_out_lat!, r.check_out_lng!)} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MapPin size={12} /><ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  {r.check_out_address && (
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: 52 }}>{r.check_out_address}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#9ca3af', minWidth: 46 }}>ระยะเวลา</span>
                    <span style={{ fontWeight: 600 }}>{duration(r.check_in_at, r.check_out_at)}</span>
                  </div>
                </div>
                {r.note && <div style={{ fontSize: '0.76rem', color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '6px 10px' }}>{r.note}</div>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีรายการเช็คอินนอกสถานที่</div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#eff6ff', borderBottom: '1px solid #f1f5f9' }}>
                  {['พนักงาน','สาขา','เข้า','ออก','ระยะเวลา','หมายเหตุ','สถานะ'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#2563eb', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', background: !r.check_out_at ? '#f0f7ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{r.employee.first_name} {r.employee.last_name}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{r.employee.nickname}</p>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.employee.branch.name}</td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', maxWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        {thDateTime(r.check_in_at)}
                        <a href={mapsUrl(r.check_in_lat, r.check_in_lng)} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'flex' }}><MapPin size={13} /></a>
                      </div>
                      {r.check_in_address && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 2 }}>{r.check_in_address}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', maxWidth: 220 }}>
                      {r.check_out_at ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            {thDateTime(r.check_out_at)}
                            <a href={mapsUrl(r.check_out_lat!, r.check_out_lng!)} target="_blank" rel="noreferrer" style={{ color: '#2563eb', display: 'flex' }}><MapPin size={13} /></a>
                          </div>
                          {r.check_out_address && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: 2 }}>{r.check_out_address}</div>}
                        </>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{duration(r.check_in_at, r.check_out_at)}</td>
                    <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: '12px', maxWidth: 200 }}>{r.note || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {!r.check_out_at ? (
                        <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>กำลังนอกสถานที่</span>
                      ) : (
                        <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>เสร็จสิ้น</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีรายการเช็คอินนอกสถานที่</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
