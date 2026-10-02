// admin/src/pages/audit-log/index.tsx
// บันทึกกิจกรรมพนักงาน (feedback 2026-09-28 "admin ดูได้สาขาตัวเอง ว่ามีการ
// เพิ่มลบ แก้ไข หรือแจ้งเตือนอะไรไหม") — รวม feed จาก AuditLog (เพิ่ม/ลบ/แก้ไข
// พนักงาน) + LineMessageLog (แจ้งเตือนที่ส่งถึงพนักงาน) ที่ backend รวมให้แล้ว
// (audit-log.service.ts) — กรองสาขาได้ผ่าน dropdown เดียวกับหน้าอื่นที่ใช้
// OrgFilterBar
import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileClock, UserPlus, UserCog, UserX, Bell, ShieldPlus, ShieldCheck, ShieldX, Search, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { useOrgFilterOptions } from '../../components/shared/OrgFilterBar'
import InfoTooltip from '../../components/ui/InfoTooltip'
import Pagination from '../../components/ui/Pagination'

interface LogEntry {
  id: string
  action: string
  actor_name: string
  entity_name: string
  message: string
  branch_id: string | null
  created_at: string
}

const ACTION_CFG: Record<string, { color: string; bg: string; icon: JSX.Element }> = {
  EMPLOYEE_CREATED:   { color: '#16A34A', bg: '#DCFCE7', icon: <UserPlus size={14} /> },
  EMPLOYEE_UPDATED:   { color: '#D97706', bg: '#FEF3C7', icon: <UserCog size={14} /> },
  EMPLOYEE_DELETED:   { color: '#DC2626', bg: '#FEE2E2', icon: <UserX size={14} /> },
  NOTIFICATION_SENT:  { color: '#244B83', bg: '#F4F6F9', icon: <Bell size={14} /> },
  WEB_USER_CREATED:   { color: '#4338CA', bg: '#EEF2FF', icon: <ShieldPlus size={14} /> },
  WEB_USER_UPDATED:   { color: '#7C3AED', bg: '#F5F3FF', icon: <ShieldCheck size={14} /> },
  WEB_USER_DELETED:   { color: '#BE123C', bg: '#FFE4E6', icon: <ShieldX size={14} /> },
}
const DEFAULT_CFG = { color: '#6b7280', bg: '#f3f4f6', icon: <FileClock size={14} /> }

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const PAGE_SIZE = 15

// โมดูล = หมวดของกิจกรรม (จัดกลุ่มจาก action)
const MODULES = [
  { value: 'employee', label: 'ข้อมูลพนักงาน', match: (a: string) => a.startsWith('EMPLOYEE_') },
  { value: 'web_user', label: 'ผู้ใช้งานเว็บ / แอดมิน', match: (a: string) => a.startsWith('WEB_USER_') },
  { value: 'notification', label: 'การแจ้งเตือน LINE', match: (a: string) => a === 'NOTIFICATION_SENT' },
]
const NO_BRANCH = 'none'
const ACTION_LABEL: Record<string, string> = {
  EMPLOYEE_CREATED: 'เพิ่มพนักงาน', EMPLOYEE_UPDATED: 'แก้ไขพนักงาน', EMPLOYEE_DELETED: 'ลบพนักงาน', NOTIFICATION_SENT: 'ส่งแจ้งเตือน',
  WEB_USER_CREATED: 'เพิ่มผู้ใช้เว็บ', WEB_USER_UPDATED: 'แก้ไขผู้ใช้เว็บ', WEB_USER_DELETED: 'ลบผู้ใช้เว็บ',
}
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.85rem', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }

export default function AuditLogPage() {
  const { branches } = useOrgFilterOptions()
  const [branchId, setBranchId] = useState('')
  const [moduleKey, setModuleKey] = useState('')
  const [actor, setActor] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'card'>('table')
  const [page, setPage] = useState(1)

  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ['audit-log', branchId],
    // 200 = เพดานสูงสุดที่ backend ยอมให้ขอ (ดู audit-log.route.ts) — feed นี้รวม
    // 2 แหล่ง (AuditLog + LineMessageLog) มาเรียงรวมกันแล้ว ยังไม่มี cursor/offset
    // ข้ามแหล่งจริง เลย paginate ฝั่ง client จากชุดนี้แทน (feedback 2026-10-01
    // "ทำ pagination")
    queryFn: () => api.get('/api/v1/admin/audit-log', { params: { branch_id: branchId || undefined, limit: 200 } }).then(r => r.data.data),
  })
  useEffect(() => { setPage(1) }, [branchId, moduleKey, actor, search])

  // ผู้ดำเนินการ (แอดมิน) ที่ปรากฏใน feed — ไม่รวม 'ระบบ' ที่ส่งแจ้งเตือนอัตโนมัติ
  const actors = useMemo(() => [...new Set(logs.map(l => l.actor_name).filter(n => n && !n.startsWith('ระบบ')))].sort((a, b) => a.localeCompare(b, 'th')), [logs])

  const filtered = useMemo(() => {
    const mod = MODULES.find(m => m.value === moduleKey)
    const q = search.trim().toLowerCase()
    return logs.filter(l =>
      (!mod || mod.match(l.action)) &&
      (!actor || l.actor_name === actor) &&
      (!q || `${l.message} ${l.actor_name} ${l.entity_name}`.toLowerCase().includes(q)))
  }, [logs, moduleKey, actor, search])
  const hasFilter = !!(moduleKey || actor || search.trim())

  const branchName = (id: string | null) => (id ? branches.find(b => b.id === id)?.name : null) ?? 'ไม่ผูกสาขา'
  const chip = (action: string) => {
    const cfg = ACTION_CFG[action] ?? DEFAULT_CFG
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: cfg.bg, color: cfg.color, fontSize: '0.74rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {cfg.icon} {ACTION_LABEL[action] ?? action}
      </span>
    )
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            บันทึกกิจกรรมพนักงาน
            <InfoTooltip size="md" title="บันทึกกิจกรรมพนักงาน" width={300} content={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>รวม 2 แหล่ง: การเพิ่ม/แก้ไข/ลบข้อมูลพนักงานและผู้ใช้งานเว็บ กับประวัติการแจ้งเตือนที่ระบบส่งถึงพนักงานทาง LINE</li>
                <li>กรองตามสาขา โมดูล และผู้ดำเนินการ (แอดมิน) หรือค้นหาจากข้อความได้ที่แถบด้านบน</li>
                <li>เลือก "ไม่ผูกสาขา" เพื่อดูกิจกรรมของบัญชีแอดมินส่วนกลางที่ไม่ได้ผูกกับพนักงานคนใด</li>
              </ul>
            } />
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>การเพิ่ม/แก้ไข/ลบข้อมูลพนักงาน ผู้ใช้งานเว็บ และการแจ้งเตือนที่ส่งถึงพนักงาน</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัสพนักงาน / ข้อความ..."
            style={{ ...selectStyle, cursor: 'text', width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
        </div>
        <select value={branchId} onChange={e => setBranchId(e.target.value)} style={selectStyle}>
          <option value="">ทุกสาขา</option>
          <option value={NO_BRANCH}>ไม่ผูกสาขา (แอดมินส่วนกลาง)</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={moduleKey} onChange={e => setModuleKey(e.target.value)} style={selectStyle}>
          <option value="">ทุกโมดูล</option>
          {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={actor} onChange={e => setActor(e.target.value)} style={selectStyle}>
          <option value="">ผู้ดำเนินการทุกคน</option>
          {actors.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          {([['table', 'ตาราง', Table2], ['card', 'การ์ด', LayoutGrid]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setView(v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, background: view === v ? '#fff' : 'transparent', color: view === v ? '#244B83' : '#64748b', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {hasFilter && (
          <button onClick={() => { setModuleKey(''); setActor(''); setSearch('') }}
            style={{ ...selectStyle, color: '#dc2626', borderColor: '#fecaca', fontWeight: 600 }}>ล้างตัวกรอง</button>
        )}
      </div>

      {isLoading ? (
        <div className="premium-card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="premium-card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{logs.length === 0 ? 'ยังไม่มีกิจกรรมที่บันทึกไว้' : 'ไม่พบกิจกรรมที่ตรงกับตัวกรอง'}</div>
      ) : view === 'table' ? (
        <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['เวลา', 'โมดูล / การกระทำ', 'ผู้ดำเนินการ', 'เกี่ยวกับ', 'สาขา', 'รายละเอียด'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i < paginated.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)', verticalAlign: 'top' }}>{fmtDateTime(l.created_at)}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{chip(l.action)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', verticalAlign: 'top' }}>{l.actor_name}</td>
                    <td style={{ padding: '10px 12px', color: '#374151', verticalAlign: 'top' }}>{l.entity_name}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{branchName(l.branch_id)}</td>
                    <td style={{ padding: '10px 12px', color: '#374151', minWidth: 260, verticalAlign: 'top' }}>{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {paginated.map(l => {
            const cfg = ACTION_CFG[l.action] ?? DEFAULT_CFG
            return (
              <div key={l.id} className="premium-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  {chip(l.action)}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</span>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#111827', fontWeight: 600, lineHeight: 1.45, wordBreak: 'break-word' }}>{l.message}</div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.74rem', color: '#64748b' }}>
                  <span style={{ color: cfg.color, fontWeight: 600 }}>โดย {l.actor_name}</span>
                  <span>· {branchName(l.branch_id)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} itemLabel="รายการ" />
      )}
    </div>
  )
}
