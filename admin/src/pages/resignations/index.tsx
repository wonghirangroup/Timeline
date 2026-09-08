// admin/src/pages/resignations/index.tsx
// คำขอลาออกที่พนักงานยื่นผ่าน LIFF — อนุมัติ = set สถานะพนักงานเป็น RESIGNED
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DoorOpen, Check, X, Search } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'

const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  PENDING:  { label: 'รอพิจารณา', c: '#d97706', bg: '#fef3c7' },
  APPROVED: { label: 'อนุมัติ',   c: '#16a34a', bg: '#dcfce7' },
  REJECTED: { label: 'ไม่อนุมัติ', c: '#dc2626', bg: '#fee2e2' },
}
function thDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function ResignationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const [statusFilter, setStatusFilter] = useState('')
  const [approveTarget, setApproveTarget] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'resignations', statusFilter],
    queryFn: () => api.get('/api/v1/admin/resignations', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  })

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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}>
          <option value="">ทุกสถานะ</option>
          <option value="PENDING">รอพิจารณา</option>
          <option value="APPROVED">อนุมัติ</option>
          <option value="REJECTED">ไม่อนุมัติ</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isLoading ? <SkeletonRows rows={5} /> : rows.length === 0 ? (
          <EmptyState icon={<DoorOpen size={22} />} title="ไม่มีคำขอลาออก" hint="พนักงานยื่นผ่าน LINE แล้วจะมาโผล่ที่นี่" />
        ) : rows.map((r, i) => {
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id} style={{ padding: '14px 18px', borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#111827' }}>
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
                  <button onClick={() => setApproveTarget(r)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Check size={13} /> อนุมัติลาออก</button>
                  <button onClick={() => { setRejectTarget(r); setRejectNote('') }} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><X size={13} /> ปฏิเสธ</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

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
              <button onClick={() => setRejectTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => reviewMut.mutate({ id: rejectTarget.id, approve: false, note: rejectNote })} disabled={reviewMut.isPending}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>ปฏิเสธคำขอ</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
