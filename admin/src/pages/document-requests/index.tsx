// admin/src/pages/document-requests/index.tsx
// คำขอเอกสาร HR ที่พนักงานยื่นผ่าน LIFF (สลิปเงินเดือน/หนังสือรับรองเงินเดือน/
// หนังสือรับรองการทำงาน) — แอดมินอัปโหลดไฟล์แนบแล้ว mark เสร็จ หรือปฏิเสธพร้อมเหตุผล
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Check, X, Upload, Loader2, Paperclip, Sparkles, Search, Table2, LayoutGrid } from 'lucide-react'
import { api } from '../../lib/axios'
import { uploadFile } from '../../lib/upload'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
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
function thDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) }

export default function DocumentRequestsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isReadOnly = useIsReadOnly()
  const isMobile = useIsMobile()
  const { focusId, autoApprove, focusRef, rowHighlight } = useFocusHighlight()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'card' | 'table'>('card')
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

  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter(r => `${r.employee.first_name} ${r.employee.last_name} ${r.employee.nickname ?? ''} ${r.employee.employee_code}`.toLowerCase().includes(q))
    : rows

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
          <option value="PENDING">รอดำเนินการ</option>
          <option value="COMPLETED">เสร็จแล้ว</option>
          <option value="REJECTED">ปฏิเสธ</option>
        </select>
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2, marginLeft: 'auto' }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#ea580c' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
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
          <EmptyState icon={<FileText size={22} />} title={rows.length === 0 ? 'ไม่มีคำขอเอกสาร' : 'ไม่พบคำขอที่ค้นหา'} hint={rows.length === 0 ? 'พนักงานยื่นผ่าน LINE แล้วจะมาโผล่ที่นี่' : undefined} />
        </div>
      ) : (isMobile || view === 'card') ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {filteredRows.map((r, i) => {
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ padding: '14px 18px', borderBottom: i < filteredRows.length - 1 ? '1px solid #f3f4f6' : 'none', ...rowHighlight(r.id) }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#ea580c', textDecoration: 'underline', textUnderlineOffset: 2 }}>
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
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['พนักงาน', 'ประเภทเอกสาร', 'ยื่นเมื่อ', 'หมายเหตุ', 'สถานะ', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => {
                const sc = STATUS_CFG[r.status]
                return (
                  <tr key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ borderBottom: i < filteredRows.length - 1 ? '1px solid #f1f5f9' : 'none', ...rowHighlight(r.id) }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ fontWeight: 700, color: '#ea580c', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.employee.first_name} {r.employee.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.employee.employee_code} · {r.employee.branch?.name}</div>
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#374151' }}>
                      {TYPE_LABEL[r.type] ?? r.custom_type ?? r.type}{r.period ? ` — ${r.period}` : ''}
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: '#2563eb', marginTop: 3, textDecoration: 'none', fontWeight: 600 }}>
                          <Paperclip size={11} /> ดูไฟล์ที่แนบ
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b', whiteSpace: 'nowrap' }}>{thDate(r.created_at)}</td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#64748b' }}>
                      {r.note && <div>{r.note}</div>}
                      {r.reject_note && <div style={{ color: '#dc2626', marginTop: 2 }}>ปฏิเสธ: {r.reject_note}</div>}
                      {!r.note && !r.reject_note && <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <span style={{ background: sc.bg, color: sc.c, borderRadius: 99, padding: '3px 10px', fontSize: '11.5px', fontWeight: 700 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {r.status === 'PENDING' && !isReadOnly ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {(r.type === 'PAYSLIP' || r.type === 'SALARY_CERT') && (
                            <button onClick={() => setGenTarget(r)} title="สร้างในระบบ"
                              style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Sparkles size={13} />
                            </button>
                          )}
                          <button onClick={() => { setCompleteTarget(r); setPickedFile(null) }} title="แนบไฟล์ + เสร็จ"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Upload size={13} />
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
