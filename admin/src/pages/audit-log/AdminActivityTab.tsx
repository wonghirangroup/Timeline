// admin/src/pages/audit-log/AdminActivityTab.tsx
// "การกระทำของแอดมิน" — การกดที่เปลี่ยนข้อมูลของแอดมินแต่ละคน: เพิ่ม/แก้ไข/ลบ/อนุมัติ/ลงวันลา-หยุด (POST/PUT/PATCH/DELETE) (feedback 2026-10-05)
// ข้อมูลจาก GET /admin/audit-log/activity (server บันทึกอัตโนมัติที่ระดับ onResponse) — ไม่เก็บการเปิดดู (GET)
import { Fragment, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '../../lib/axios'
import Pagination from '../../components/ui/Pagination'

interface ActivityRow {
  id: string; user_id: string | null; actor_name: string; actor_role: string
  method: string; route: string; url: string; status_code: number; duration_ms: number
  ip: string; user_agent: string; body: string | null; created_at: string
}
interface ActivityResp { rows: ActivityRow[]; total: number; admins: { user_id: string; name: string }[] }

const PAGE_SIZE = 50
const METHOD_CFG: Record<string, { color: string; bg: string; verb: string }> = {
  POST:   { color: '#16a34a', bg: '#dcfce7', verb: 'เพิ่ม/สั่งงาน' },
  PUT:    { color: '#d97706', bg: '#fef3c7', verb: 'แก้ไข' },
  PATCH:  { color: '#d97706', bg: '#fef3c7', verb: 'แก้ไข' },
  DELETE: { color: '#dc2626', bg: '#fee2e2', verb: 'ลบ' },
}
const RESOURCE_TH: Record<string, string> = {
  employees: 'พนักงาน', branches: 'สาขา', shifts: 'กะ', 'shift-assignments': 'ตารางกะ', 'leave-requests': 'วันลา', 'leave-balances': 'โควต้าวันลา',
  'leave-types': 'ประเภทการลา', 'weekly-off': 'วันหยุดประจำสัปดาห์', 'ot-requests': 'OT', ot: 'OT', attendance: 'เช็คอิน', 'offsite-checkins': 'เช็คอินนอกสถานที่',
  resignations: 'คำขอลาออก', 'document-requests': 'ขอเอกสาร HR', 'hr-documents': 'เอกสาร HR', announcements: 'ประกาศ', feedback: 'ฟีดแบ็ค',
  groups: 'กลุ่ม', positions: 'ตำแหน่ง', departments: 'แผนก', divisions: 'ฝ่าย', users: 'ผู้ใช้งานเว็บ', 'tenant-settings': 'ตั้งค่าบริษัท',
  holidays: 'วันหยุดนักขัตฤกษ์', dashboard: 'ภาพรวม', notifications: 'การแจ้งเตือน', 'audit-log': 'บันทึกกิจกรรม', 'master-data': 'Master Data',
  'vacation-policy': 'นโยบายพักร้อน', 'employee-status-types': 'สถานะพนักงาน', 'line-messages': 'ข้อความไลน์', permissions: 'สิทธิ์การใช้งาน',
}
const ACTION_TH: Record<string, string> = {
  approve: 'อนุมัติ', reject: 'ปฏิเสธ', cancel: 'ยกเลิก', reset: 'รีเซ็ต', send: 'ส่ง', export: 'ส่งออก', publish: 'เผยแพร่', 'approve-many': 'อนุมัติหลายรายการ',
  'reject-many': 'ปฏิเสธหลายรายการ', 'bulk-approve': 'อนุมัติหลายรายการ', 'bulk-reject': 'ปฏิเสธหลายรายการ', open: 'เปิด', close: 'ปิด', resolve: 'จัดการ', swap: 'สลับ',
}

// แปลง route → ข้อความอ่านง่าย เช่น POST /admin/leave-requests/:id/approve → "อนุมัติ · วันลา"
function describe(method: string, route: string): string {
  const segs = route.replace(/^\/api\/v1\/(admin|super-admin)\//, '').split('/').filter(Boolean)
  const staticSegs = segs.filter(s => !s.startsWith(':'))
  const resource = RESOURCE_TH[staticSegs[0]] ?? staticSegs[0] ?? route
  const last = staticSegs.length > 1 ? staticSegs[staticSegs.length - 1] : null
  const verb = (last && ACTION_TH[last]) || METHOD_CFG[method]?.verb || method
  const sub = last && !ACTION_TH[last] ? ` / ${RESOURCE_TH[last] ?? last}` : ''
  return `${verb} · ${resource}${sub}`
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.85rem', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }

export default function AdminActivityTab() {
  const [method, setMethod] = useState('')
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => { setPage(1) }, [method, userId, search, from, to])

  const { data, isLoading } = useQuery<ActivityResp>({
    queryKey: ['audit-activity', method, userId, search, from, to, page],
    queryFn: () => api.get('/api/v1/admin/audit-log/activity', {
      params: {
        method: method || undefined, user_id: userId || undefined,
        search: search.trim() || undefined, from: from || undefined, to: to || undefined,
        limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE,
      },
    }).then(r => r.data.data),
    placeholderData: prev => prev,
  })
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / URL / ข้อมูลที่ส่ง..."
            style={{ ...selectStyle, cursor: 'text', width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
        </div>
        <select value={userId} onChange={e => setUserId(e.target.value)} style={selectStyle}>
          <option value="">แอดมินทุกคน</option>
          {(data?.admins ?? []).map(a => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
        </select>
        <select value={method} onChange={e => setMethod(e.target.value)} style={selectStyle}>
          <option value="">ทุกประเภท</option>
          {['POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m} · {METHOD_CFG[m].verb}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={selectStyle} aria-label="ตั้งแต่วันที่" />
        <span style={{ color: '#94a3b8' }}>–</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={selectStyle} aria-label="ถึงวันที่" />
      </div>

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>กำลังโหลด...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ยังไม่มีรายการ</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  {['เวลา', 'แอดมิน', 'การกระทำ', 'คำขอ', 'ผลลัพธ์', 'IP'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const mc = METHOD_CFG[r.method] ?? METHOD_CFG.GET
                  const okStatus = r.status_code < 400
                  const open = openId === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr onClick={() => setOpenId(open ? null : r.id)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: open ? '#f8fafc' : undefined }}>
                        <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)', verticalAlign: 'top' }}>{fmtDateTime(r.created_at)}</td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{r.actor_name}</div>
                          {r.actor_role && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.actor_role}</div>}
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'top', fontWeight: 600, color: '#374151' }}>{describe(r.method, r.route)}</td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'top' }}>
                          <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 6, background: mc.bg, color: mc.color, fontSize: '0.7rem', fontWeight: 800, marginRight: 6 }}>{r.method}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#64748b', wordBreak: 'break-all' }}>{r.route.replace('/api/v1/', '')}</span>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: okStatus ? '#dcfce7' : '#fee2e2', color: okStatus ? '#16a34a' : '#dc2626' }}>{r.status_code}</span>
                        </td>
                        <td style={{ padding: '9px 12px', verticalAlign: 'top', whiteSpace: 'nowrap', color: '#64748b', fontFamily: 'monospace', fontSize: '0.74rem' }}>{r.ip}</td>
                      </tr>
                      {open && (
                        <tr key={r.id + '-d'} style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          <td colSpan={6} style={{ padding: '10px 16px 14px', fontSize: '0.76rem', color: '#475569' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
                              <b>URL</b><span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.method} {r.url}</span>
                              <b>ใช้เวลา</b><span>{r.duration_ms} ms</span>
                              <b>เครื่อง</b><span style={{ wordBreak: 'break-all' }}>{r.user_agent || '-'}</span>
                              {r.body && <><b>ข้อมูลที่ส่ง</b><pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.74rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>{r.body}</pre></>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!isLoading && total > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={total} itemLabel="รายการ" />}
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '10px 2px 0' }}>
        บันทึกอัตโนมัติทุกครั้งที่แอดมินกดเปลี่ยนข้อมูล (เพิ่ม/แก้ไข/ลบ/อนุมัติ/ลงวันลา-หยุด) ไม่รวมการเปิดดูหน้า · ข้อมูลลับ เช่น รหัสผ่าน/เลขบัตร ถูกปิดเป็น *** · เก็บราว 1 ปี
      </p>
    </div>
  )
}
