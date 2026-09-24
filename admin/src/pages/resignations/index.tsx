// admin/src/pages/resignations/index.tsx
// คำขอลาออกที่พนักงานยื่นผ่าน LIFF — อนุมัติ = set สถานะพนักงานเป็น RESIGNED
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DoorOpen, Check, X, Search, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useFocusHighlight } from '../../hooks/useFocusHighlight'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'

const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา', c: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   c: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ', c: '#dc2626', bg: '#fee2e2' },
}
function thDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) }

export default function ResignationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const isMobile = useIsMobile()
  const { focusId, autoApprove, focusRef, rowHighlight } = useFocusHighlight()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'card' | 'table'>('card')
  const [approveTarget, setApproveTarget] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'resignations', statusFilter],
    queryFn: () => api.get('/api/v1/admin/resignations', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  })

  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter(r => `${r.employee.first_name} ${r.employee.last_name} ${r.employee.nickname ?? ''} ${r.employee.employee_code}`.toLowerCase().includes(q))
    : rows

  // กระดิ่งแจ้งเตือนส่ง ?approve=<id> มา → เปิด popup อนุมัติลาออกให้เลย
  useEffect(() => {
    if (!autoApprove || !focusId || isReadOnly) return
    const row = rows.find((r: any) => r.id === focusId && r.status === 'PENDING')
    if (row) setApproveTarget(row)
  }, [autoApprove, focusId, rows, isReadOnly])

  const reviewMut = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      api.post(`/api/v1/admin/resignations/${id}/review`, { approve, reject_note: note || undefined }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'resignations'] })
      qc.invalidateQueries({ queryKey: ['admin', 'employees'] })
      showToast('success', v.approve ? 'อนุมัติลาออกแล้ว — สถานะพนักงานเปลี่ยนเป็น "ลาออก"' : 'ปฏิเสธคำขอแล้ว')
      setApproveTarget(null); setRejectTarget(null); setRejectNote('')
    },
    onError: () => showToast('error', 'ดำเนินการไม่สำเร็จ'),
  })

  return (
    <div>
      <div className="page-header">
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><DoorOpen size={20} /> คำขอลาออก</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส"
            style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}>
          <option value="">ทุกสถานะ</option>
          <option value="PENDING">รอพิจารณา</option>
          <option value="APPROVED">อนุมัติ</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
        </select>
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2, marginLeft: 'auto' }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#EC6F44' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}><SkeletonRows rows={5} /></div>
      ) : filteredRows.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <EmptyState icon={<DoorOpen size={22} />} title={rows.length === 0 ? 'ไม่มีคำขอลาออก' : 'ไม่พบคำขอที่ค้นหา'} hint={rows.length === 0 ? 'พนักงานยื่นผ่าน LINE แล้วจะมาโผล่ที่นี่' : undefined} />
        </div>
      ) : (isMobile || view === 'card') ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredRows.map((r, i) => {
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ padding: '14px 18px', borderBottom: i < filteredRows.length - 1 ? '1px solid #f3f4f6' : 'none', ...rowHighlight(r.id) }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#EC6F44', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    {r.employee.first_name} {r.employee.last_name}{r.employee.nickname ? ` (${r.employee.nickname})` : ''}
                  </button>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{r.employee.employee_code} · {r.employee.branch?.name}</div>
                  <div style={{ fontSize: '12.5px', color: '#374151', marginTop: 6 }}>
                    วันทำงานสุดท้าย: <b>{thDate(r.last_working_date)}</b>
                  </div>
                  {r.reason && <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 3 }}>เหตุผล: {r.reason}</div>}
                  {r.reject_note && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: 3, background: '#fef2f2', padding: '5px 9px', borderRadius: 6 }}>หมายเหตุ: {r.reject_note}</div>}
                </div>
                <span style={{ background: sc.bg, color: sc.c, borderRadius: 99, padding: '3px 12px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{sc.label}</span>
              </div>
              {r.status === 'PENDING' && !isReadOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button variant="success" size="sm" icon={<Check size={13} />} onClick={() => setApproveTarget(r)}>อนุมัติลาออก</Button>
                  <Button variant="danger-soft" size="sm" icon={<X size={13} />} onClick={() => { setRejectTarget(r); setRejectNote('') }}>ปฏิเสธ</Button>
                </div>
              )}
            </div>
          )
        })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['พนักงาน', 'วันทำงานสุดท้าย', 'เหตุผล / หมายเหตุ', 'สถานะ', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => {
                const sc = STATUS_CFG[r.status]
                return (
                  <tr key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ borderBottom: i < filteredRows.length - 1 ? '1px solid #E6ECF4' : 'none', ...rowHighlight(r.id) }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ fontWeight: 700, color: '#EC6F44', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.employee.first_name} {r.employee.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.employee.employee_code} · {r.employee.branch?.name}</div>
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#374151', whiteSpace: 'nowrap' }}>{thDate(r.last_working_date)}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b' }}>
                      {r.reason && <div>{r.reason}</div>}
                      {r.reject_note && <div style={{ color: '#dc2626', marginTop: 2 }}>ปฏิเสธ: {r.reject_note}</div>}
                      {!r.reason && !r.reject_note && <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span style={{ background: sc.bg, color: sc.c, borderRadius: 99, padding: '3px 10px', fontSize: '11.5px', fontWeight: 700 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {r.status === 'PENDING' && !isReadOnly ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setApproveTarget(r)} title="อนุมัติลาออก"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => { setRejectTarget(r); setRejectNote('') }} title="ปฏิเสธ"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : <span style={{ color: '#cbd5e1', display: 'block', textAlign: 'right' }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {approveTarget && (
        <ConfirmDialog variant="warning"
          title="อนุมัติการลาออก?"
          message={`สถานะของ ${approveTarget.employee.first_name} จะเปลี่ยนเป็น "ลาออก" — พนักงานจะเข้าใช้ LIFF และเช็คอินไม่ได้อีก`}
          confirmLabel="อนุมัติลาออก"
          onConfirm={() => reviewMut.mutate({ id: approveTarget.id, approve: true })}
          onCancel={() => setApproveTarget(null)} />
      )}
      {rejectTarget && (
        <Modal onClose={() => setRejectTarget(null)} width={400}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>ปฏิเสธคำขอลาออก</p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>เหตุผล (ไม่บังคับ)</label>
            <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button variant="ghost" block onClick={() => setRejectTarget(null)}>ยกเลิก</Button>
              <Button variant="danger" block loading={reviewMut.isPending}
                onClick={() => reviewMut.mutate({ id: rejectTarget.id, approve: false, note: rejectNote })}>ปฏิเสธคำขอ</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
