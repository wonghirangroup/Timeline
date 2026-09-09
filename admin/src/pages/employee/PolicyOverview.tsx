// สรุปสิทธิ์วันหยุด / การลา ต่อพนักงาน — เห็นทีเดียวทั้งบริษัทว่าใครหยุดเสาร์-อาทิตย์,
// โควต้าจองวันหยุด, สิทธิ์จอง/ลา (cascade 6 ชั้น), บทบาทแอดมิน
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download } from 'lucide-react'
import { api } from '../../lib/axios'
import { deptName } from '../../lib/format'
import { avatarUrl } from '../../lib/upload'
import { useIsMobile } from '../../hooks/useIsMobile'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

type DayRule = 'WORK' | 'OFF' | 'OFFSITE'
type PolicyNode = { booking_enabled?: boolean | null; leave_enabled?: boolean | null }

interface PolicyEmployee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  nickname: string | null
  department: string | null
  is_active: boolean
  photo_url?: string | null
  weekly_off_mode: 'WEEKLY' | 'MONTHLY_BATCH'
  booking_enabled_override?: boolean | null
  leave_enabled_override?: boolean | null
  branch: { id: string; name: string; group_id?: string | null } & PolicyNode & { group?: PolicyNode | null }
  position?: (PolicyNode & { id: string; name: string; department?: (PolicyNode & { id: string; name: string; division?: (PolicyNode & { group_id?: string }) | null }) | null }) | null
  employee_status_type?: {
    id: string; name: string; monthly_off_quota: number
    saturday_rule: DayRule; sunday_rule: DayRule; off_on_public_holiday: boolean
  } | null
  admin_user?: { role: 'ADMIN' | 'MANAGER' | 'EXECUTIVE' | 'DEPT_HEAD'; is_active: boolean } | null
}

interface ApiPositionLite {
  id: string; name: string
  department?: { id: string; name: string; division?: { id: string; name: string; group_id: string } | null } | null
}

const pick = (v: boolean | null | undefined) => (v === null || v === undefined ? null : v)

// port ของ resolvePolicyFromChain ฝั่ง server (group.service.ts) — เจาะจงกว่าชนะ, null ทั้งสาย → true
function resolvePolicy(e: PolicyEmployee, flag: 'booking' | 'leave'): boolean {
  const b = flag === 'booking'
  const pos = e.position
  const dept = pos?.department
  const div = dept?.division
  const br = e.branch
  const chain: (boolean | null)[] = [
    pick(b ? e.booking_enabled_override : e.leave_enabled_override),
    pick(b ? pos?.booking_enabled : pos?.leave_enabled),
    pick(b ? dept?.booking_enabled : dept?.leave_enabled),
    pick(b ? div?.booking_enabled : div?.leave_enabled),
    pick(b ? br?.booking_enabled : br?.leave_enabled),
    pick(b ? br?.group?.booking_enabled : br?.group?.leave_enabled),
  ]
  for (const v of chain) if (v !== null) return v
  return true
}

const RULE_CFG: Record<DayRule, { label: string; color: string; bg: string }> = {
  WORK:    { label: 'ทำงาน',      color: '#b45309', bg: '#fef3c7' },
  OFF:     { label: 'หยุด',       color: '#15803d', bg: '#dcfce7' },
  OFFSITE: { label: 'นอกสถานที่', color: '#1d4ed8', bg: '#dbeafe' },
}
const ROLE_TH: Record<string, string> = {
  ADMIN: 'แอดมิน', MANAGER: 'ผู้จัดการ', EXECUTIVE: 'ผู้บริหาร (ดูอย่างเดียว)', DEPT_HEAD: 'หัวหน้าแผนก',
}

// พนักงานที่ยังไม่ผูกสถานะ — ปฏิทิน LIFF ถือว่าหยุดเสาร์-อาทิตย์เป็นค่าเริ่มต้น
const DEFAULT_RULE: DayRule = 'OFF'

function Pill({ label, color, bg, title }: { label: string; color: string; bg: string; title?: string }) {
  return (
    <span title={title} style={{ fontSize: '0.72rem', fontWeight: 700, color, background: bg, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>{label}</span>
  )
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  return (
    <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: url ? '#e2e8f0' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
      {url ? <img src={avatarUrl(url, 56) ?? url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name.charAt(0) || '?')}
    </span>
  )
}

const MODE_TH = { WEEKLY: 'รายสัปดาห์', MONTHLY_BATCH: 'รวมทั้งเดือน' } as const

export default function PolicyOverview() {
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [onlyActive, setOnlyActive] = useState(true)

  const { data: employees = [], isLoading } = useQuery<PolicyEmployee[]>({
    queryKey: ['employees'],
    queryFn: () => api.get('/api/v1/admin/employees', { params: { includeInactive: true } }).then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPositionLite[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })

  const orgMap = useMemo(() => buildEmployeeOrgMap(employees as any, positions as any), [employees, positions])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees
      .filter(e => (onlyActive ? e.is_active : true))
      .filter(e => matchesOrgFilter(orgMap[e.id], orgFilter))
      .filter(e => !q || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q))
      .map(e => {
        const st = e.employee_status_type
        return {
          e,
          statusName: st?.name ?? 'ยังไม่กำหนด',
          sat: st?.saturday_rule ?? DEFAULT_RULE,
          sun: st?.sunday_rule ?? DEFAULT_RULE,
          pubHoliday: st ? st.off_on_public_holiday : true,
          quota: st?.monthly_off_quota ?? null,
          mode: e.weekly_off_mode,
          booking: resolvePolicy(e, 'booking'),
          leave: resolvePolicy(e, 'leave'),
          role: e.admin_user?.is_active ? e.admin_user.role : null,
        }
      })
      .sort((a, b) => a.e.employee_code.localeCompare(b.e.employee_code))
  }, [employees, orgMap, orgFilter, search, onlyActive])

  const summary = useMemo(() => ({
    total: rows.length,
    satOff: rows.filter(r => r.sat !== 'WORK').length,
    sunOff: rows.filter(r => r.sun !== 'WORK').length,
    noStatus: rows.filter(r => r.statusName === 'ยังไม่กำหนด').length,
    bookingOff: rows.filter(r => !r.booking).length,
    leaveOff: rows.filter(r => !r.leave).length,
  }), [rows])

  function exportCsv() {
    const head = ['รหัส', 'ชื่อ', 'สาขา', 'แผนก', 'สถานะพนักงาน', 'เสาร์', 'อาทิตย์', 'นักขัตฤกษ์', 'โควต้าจอง/เดือน', 'โหมดจอง', 'สิทธิ์จองวันหยุด', 'สิทธิ์ยื่นลา', 'บทบาทแอดมิน']
    const lines = rows.map(r => [
      r.e.employee_code, `${r.e.first_name} ${r.e.last_name}`, r.e.branch.name, deptName(r.e.department) || '-',
      r.statusName, RULE_CFG[r.sat].label, RULE_CFG[r.sun].label, r.pubHoliday ? 'หยุด' : 'ไม่หยุด',
      r.quota ?? '-', MODE_TH[r.mode], r.booking ? 'เปิด' : 'ปิด', r.leave ? 'เปิด' : 'ปิด', r.role ? ROLE_TH[r.role] : '-',
    ])
    const csv = '﻿' + [head, ...lines].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `สิทธิ์วันหยุด-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filterInput: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }
  const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#c2410c', fontSize: '0.76rem', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '9px 12px', fontSize: '0.82rem', verticalAlign: 'middle' }

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 14px' }}>
        กฎวันหยุด/สิทธิ์ของพนักงานแต่ละคน — เสาร์-อาทิตย์ &amp; นักขัตฤกษ์มาจาก <b>สถานะพนักงาน</b> (ตั้งที่ ผังองค์กร → สถานะพนักงาน),
        สิทธิ์จอง/ลามาจากลำดับชั้นนโยบาย 6 ชั้น (บุคคล → ตำแหน่ง → แผนก → ฝ่าย → สาขา → กลุ่ม)
      </p>

      {/* summary chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: 'ทั้งหมด', value: summary.total, color: '#4338ca', bg: '#eef2ff' },
          { label: 'หยุดเสาร์', value: summary.satOff, color: '#15803d', bg: '#dcfce7' },
          { label: 'หยุดอาทิตย์', value: summary.sunOff, color: '#15803d', bg: '#dcfce7' },
          { label: 'ยังไม่ตั้งสถานะ', value: summary.noStatus, color: '#b45309', bg: '#fef3c7' },
          { label: 'ปิดสิทธิ์จอง', value: summary.bookingOff, color: '#b91c1c', bg: '#fee2e2' },
          { label: 'ปิดสิทธิ์ลา', value: summary.leaveOff, color: '#b91c1c', bg: '#fee2e2' },
        ].map(s => (
          <span key={s.label} style={{ fontSize: '0.76rem', fontWeight: 700, color: s.color, background: s.bg, padding: '5px 11px', borderRadius: 99 }}>
            {s.label} {s.value}
          </span>
        ))}
      </div>

      {/* filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {!isMobile && <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส..."
              style={{ ...filterInput, width: '100%', paddingLeft: 32, borderRadius: 10 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} /> เฉพาะที่ใช้งาน
          </label>
          <button onClick={exportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...filterInput, borderRadius: 10, cursor: 'pointer', background: '#fff', color: '#374151', whiteSpace: 'nowrap' }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>กำลังโหลด...</p>}

      {!isLoading && !isMobile && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflowX: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fff7ed' }}>
                {['พนักงาน', 'สาขา / แผนก', 'สถานะพนักงาน', 'เสาร์', 'อาทิตย์', 'นักขัตฤกษ์', 'โควต้าจอง/เดือน', 'โหมดจอง', 'สิทธิ์จองวันหยุด', 'สิทธิ์ยื่นลา', 'บทบาทแอดมิน'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ไม่พบพนักงานที่ตรงกับเงื่อนไข</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.e.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar url={r.e.photo_url} name={r.e.first_name} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{r.e.first_name} {r.e.last_name}{r.e.nickname ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({r.e.nickname})</span> : null}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.e.employee_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.e.branch.name}<br />{deptName(r.e.department) || '—'}</td>
                  <td style={td}>{r.statusName === 'ยังไม่กำหนด'
                    ? <Pill label="ยังไม่กำหนด" color="#b45309" bg="#fef3c7" title="ใช้ค่าเริ่มต้น: หยุดเสาร์-อาทิตย์ + หยุดนักขัตฤกษ์" />
                    : <span style={{ fontWeight: 600 }}>{r.statusName}</span>}</td>
                  <td style={td}><Pill {...RULE_CFG[r.sat]} /></td>
                  <td style={td}><Pill {...RULE_CFG[r.sun]} /></td>
                  <td style={td}>{r.pubHoliday
                    ? <Pill label="หยุด" color="#15803d" bg="#dcfce7" />
                    : <Pill label="ไม่หยุด" color="#b45309" bg="#fef3c7" />}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{r.quota ?? '—'}</td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{MODE_TH[r.mode]}</td>
                  <td style={td}>{r.booking
                    ? <Pill label="เปิด" color="#15803d" bg="#dcfce7" />
                    : <Pill label="ปิด" color="#b91c1c" bg="#fee2e2" title="ปิดสิทธิ์จองวันหยุดตามลำดับชั้นนโยบาย" />}</td>
                  <td style={td}>{r.leave
                    ? <Pill label="เปิด" color="#15803d" bg="#dcfce7" />
                    : <Pill label="ปิด" color="#b91c1c" bg="#fee2e2" title="ปิดสิทธิ์ยื่นคำขอลาตามลำดับชั้นนโยบาย" />}</td>
                  <td style={td}>{r.role
                    ? <Pill label={ROLE_TH[r.role]} color="#4338ca" bg="#eef2ff" />
                    : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.85rem' }}>ไม่พบพนักงานที่ตรงกับเงื่อนไข</p>}
          {rows.map(r => (
            <div key={r.e.id} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar url={r.e.photo_url} name={r.e.first_name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.e.first_name} {r.e.last_name}{r.e.nickname ? ` (${r.e.nickname})` : ''}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.e.employee_code} · {r.e.branch.name}{r.e.department ? ` · ${deptName(r.e.department)}` : ''}</div>
                </div>
                {r.role && <Pill label={ROLE_TH[r.role]} color="#4338ca" bg="#eef2ff" />}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {r.statusName === 'ยังไม่กำหนด'
                  ? <Pill label="สถานะ: ยังไม่กำหนด" color="#b45309" bg="#fef3c7" />
                  : <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', background: '#f1f5f9', padding: '2px 9px', borderRadius: 99 }}>{r.statusName}</span>}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เสาร์</span><Pill {...RULE_CFG[r.sat]} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>อาทิตย์</span><Pill {...RULE_CFG[r.sun]} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>นักขัตฤกษ์</span>
                {r.pubHoliday ? <Pill label="หยุด" color="#15803d" bg="#dcfce7" /> : <Pill label="ไม่หยุด" color="#b45309" bg="#fef3c7" />}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>จอง</span>
                {r.booking ? <Pill label="เปิด" color="#15803d" bg="#dcfce7" /> : <Pill label="ปิด" color="#b91c1c" bg="#fee2e2" />}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ลา</span>
                {r.leave ? <Pill label="เปิด" color="#15803d" bg="#dcfce7" /> : <Pill label="ปิด" color="#b91c1c" bg="#fee2e2" />}
                {r.quota != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>โควต้า {r.quota} ว/ด ({MODE_TH[r.mode]})</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
