// admin/src/pages/audit-log/index.tsx
// บันทึกกิจกรรมพนักงาน (feedback 2026-09-28 "admin ดูได้สาขาตัวเอง ว่ามีการ
// เพิ่มลบ แก้ไข หรือแจ้งเตือนอะไรไหม") — รวม feed จาก AuditLog (เพิ่ม/ลบ/แก้ไข
// พนักงาน) + LineMessageLog (แจ้งเตือนที่ส่งถึงพนักงาน) ที่ backend รวมให้แล้ว
// (audit-log.service.ts) — กรองสาขาได้ผ่าน dropdown เดียวกับหน้าอื่นที่ใช้
// OrgFilterBar
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileClock, UserPlus, UserCog, UserX, Bell, ShieldPlus, ShieldCheck, ShieldX } from 'lucide-react'
import { api } from '../../lib/axios'
import { useOrgFilterOptions } from '../../components/shared/OrgFilterBar'

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

export default function AuditLogPage() {
  const { branches } = useOrgFilterOptions()
  const [branchId, setBranchId] = useState('')

  const { data: logs = [], isLoading } = useQuery<LogEntry[]>({
    queryKey: ['audit-log', branchId],
    queryFn: () => api.get('/api/v1/admin/audit-log', { params: { branch_id: branchId || undefined, limit: 100 } }).then(r => r.data.data),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>บันทึกกิจกรรมพนักงาน</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>การเพิ่ม/แก้ไข/ลบข้อมูลพนักงาน ผู้ใช้งานเว็บ และการแจ้งเตือนที่ส่งถึงพนักงาน</p>
        </div>
        <div className="page-header-actions">
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.85rem', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">ทุกสาขา</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="premium-card" style={{ padding: '8px 20px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>กำลังโหลด...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ยังไม่มีกิจกรรมที่บันทึกไว้</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((l, i) => {
              const cfg = ACTION_CFG[l.action] ?? DEFAULT_CFG
              return (
                <div key={l.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', color: '#111827', fontWeight: 600 }}>{l.message}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateTime(l.created_at)}</div>
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
