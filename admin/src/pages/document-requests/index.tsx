// admin/src/pages/document-requests/index.tsx
// คำขอเอกสาร HR ที่พนักงานยื่นผ่าน LIFF (สลิปเงินเดือน/หนังสือรับรองเงินเดือน/
// หนังสือรับรองการทำงาน) — แอดมินอัปโหลดไฟล์แนบแล้ว mark เสร็จ หรือปฏิเสธพร้อมเหตุผล
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Check, X, Upload, Loader2, Paperclip, Sparkles } from 'lucide-react'
import { api } from '../../lib/axios'
import { uploadFile } from '../../lib/upload'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { useFocusHighlight } from '../../hooks/useFocusHighlight'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import HrDocumentGenerateModal from '../hr-documents/generate'

const TYPE_LABEL: Record<string, string> = {
  PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', WORK_CERT: 'หนังสือรับรองการทำงาน', OTHER: 'อื่นๆ',
}
const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  PENDING:   { label: 'รอดำเนินการ', c: '#d97706', bg: '#fef3c7' },
  COMPLETED: { label: 'เสร็จแล้ว',   c: '#16a34a', bg: '#dcfce7' },
  REJECTED:  { label: 'ปฏิเสธ',      c: '#dc2626', bg: '#fee2e2' },
}
function thDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function DocumentRequestsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const { focusId, autoApprove, focusRef, rowHighlight } = useFocusHighlight()
  const [statusFilter, setStatusFilter] = useState('')
  const [completeTarget, setCompleteTarget] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [genTarget, setGenTarget] = useState<any>(null)

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'document-requests', statusFilter],
    queryFn: () => api.get('/api/v1/admin/document-requests', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  })

  // กระดิ่งแจ้งเตือนส่ง ?approve=<id> มา → เปิด popup แนบไฟล์ให้เลย
  useEffect(() => {
    if (!autoApprove || !focusId || isReadOnly) return
    const row = rows.find((r: any) => r.id === focusId && r.status === 'PENDING')
    if (row) setCompleteTarget(row)
  }, [autoApprove, focusId, rows, isReadOnly])

  const reviewMut = useMutation({
    mutationFn: ({ id, approve, file_url, note }: { id: string; approve: boolean; file_url?: string; note?: string }) =>
      api.post(`/api/v1/admin/document-requests/${id}/review`, { approve, file_url, reject_note: note || undefined }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'document-requests'] })
      showToast('success', v.approve ? 'บันทึกเอกสารสำเร็จ' : 'ปฏิเสธคำขอแล้ว')
      setCompleteTarget(null); setRejectTarget(null); setRejectNote(''); setPickedFile(null)
    },
    onError: () => showToast('error', 'ดำเนินการไม่สำเร็จ'),
  })

  async function handleComplete() {
    if (!completeTarget || !pickedFile) return
    setUploading(true)
    try {
      const url = await uploadFile(pickedFile, 'timeline/documents')
      reviewMut.mutate({ id: completeTarget.id, approve: true, file_url: url })
    } catch {
      showToast('error', 'อัปโหลดไฟล์ไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> ขอเอกสาร HR</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}>
          <option value="">ทุกสถานะ</option>
          <option value="PENDING">รอดำเนินการ</option>
          <option value="COMPLETED">เสร็จแล้ว</option>
          <option value="REJECTED">ปฏิเสธ</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {isLoading ? <SkeletonRows rows={5} /> : rows.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title="ไม่มีคำขอเอกสาร" hint="พนักงานยื่นผ่าน LINE แล้วจะมาโผล่ที่นี่" />
        ) : rows.map((r, i) => {
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ padding: '14px 18px', borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none', ...rowHighlight(r.id) }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                    {r.employee.first_name} {r.employee.last_name}{r.employee.nickname ? ` (${r.employee.nickname})` : ''}
                  </button>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{r.employee.employee_code} · {r.employee.branch?.name}</div>
                  <div style={{ fontSize: '12.5px', color: '#374151', marginTop: 6 }}>
                    <b>{TYPE_LABEL[r.type] ?? r.custom_type ?? r.type}</b>{r.period ? ` — ${r.period}` : ''} · ยื่นเมื่อ {thDate(r.created_at)}
                  </div>
                  {r.note && <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 3 }}>หมายเหตุ: {r.note}</div>}
                  {r.reject_note && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: 3, background: '#fef2f2', padding: '5px 9px', borderRadius: 6 }}>เหตุผลที่ปฏิเสธ: {r.reject_note}</div>}
                  {r.file_url && (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '12.5px', color: '#2563eb', marginTop: 4, textDecoration: 'none', fontWeight: 600 }}>
                      <Paperclip size={12} /> ดูไฟล์ที่แนบ
                    </a>
                  )}
                </div>
                <span style={{ background: sc.bg, color: sc.c, borderRadius: 99, padding: '3px 12px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{sc.label}</span>
              </div>
              {r.status === 'PENDING' && !isReadOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {(r.type === 'PAYSLIP' || r.type === 'SALARY_CERT') && (
                    <Button variant="secondary" size="sm" icon={<Sparkles size={13} />} onClick={() => setGenTarget(r)}>สร้างในระบบ</Button>
                  )}
                  <Button variant="success" size="sm" icon={<Upload size={13} />} onClick={() => { setCompleteTarget(r); setPickedFile(null) }}>แนบไฟล์ + เสร็จ</Button>
                  <Button variant="danger-soft" size="sm" icon={<X size={13} />} onClick={() => { setRejectTarget(r); setRejectNote('') }}>ปฏิเสธ</Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {genTarget && (
        <HrDocumentGenerateModal
          employeeId={genTarget.employee.id}
          type={genTarget.type}
          documentRequestId={genTarget.id}
          period={genTarget.period ?? undefined}
          onClose={() => setGenTarget(null)}
          onCreated={() => showToast('success', 'พิมพ์/บันทึกเป็น PDF แล้วกลับมากด "แนบไฟล์ + เสร็จ" เพื่อปิดคำขอนี้')}
        />
      )}

      {completeTarget && (
        <Modal onClose={() => { setCompleteTarget(null); setPickedFile(null) }} width={400}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>แนบไฟล์เอกสาร</p>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {completeTarget.employee.first_name} {completeTarget.employee.last_name} — {TYPE_LABEL[completeTarget.type] ?? completeTarget.type}{completeTarget.period ? ` (${completeTarget.period})` : ''}
            </p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>ไฟล์เอกสาร (PDF/รูปภาพ)</label>
            <input type="file" accept="application/pdf,image/*" onChange={e => setPickedFile(e.target.files?.[0] ?? null)}
              style={{ width: '100%', fontSize: '0.82rem' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setCompleteTarget(null); setPickedFile(null) }} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleComplete} disabled={!pickedFile || uploading || reviewMut.isPending}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!pickedFile || uploading) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploading ? <><Loader2 size={14} className="animate-spin" /> กำลังอัปโหลด...</> : 'บันทึกเสร็จสิ้น'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {rejectTarget && (
        <Modal onClose={() => setRejectTarget(null)} width={400}>
          <div style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontWeight: 700 }}>ปฏิเสธคำขอเอกสาร</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {rejectTarget.employee.first_name} {rejectTarget.employee.last_name} — {TYPE_LABEL[rejectTarget.type] ?? rejectTarget.type}
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 5 }}>เหตุผลที่ปฏิเสธ (ไม่บังคับ)</label>
              <input value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                placeholder="เช่น ข้อมูลไม่ครบ ติดต่อ HR โดยตรง"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onKeyDown={e => { if (e.key === 'Enter') reviewMut.mutate({ id: rejectTarget.id, approve: false, note: rejectNote }) }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setRejectTarget(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => reviewMut.mutate({ id: rejectTarget.id, approve: false, note: rejectNote })} disabled={reviewMut.isPending}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: reviewMut.isPending ? 0.7 : 1 }}>
                {reviewMut.isPending ? 'กำลังบันทึก...' : 'ปฏิเสธ'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
