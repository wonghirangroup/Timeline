// admin/src/pages/document-requests/index.tsx
// คำขอเอกสาร HR ที่พนักงานยื่นผ่าน LIFF (สลิปเงินเดือน/หนังสือรับรองเงินเดือน/
// หนังสือรับรองการทำงาน) — แอดมินอัปโหลดไฟล์แนบแล้ว mark เสร็จ หรือปฏิเสธพร้อมเหตุผล
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Check, X, Upload, Loader2, Paperclip, Sparkles, Search, Table2, LayoutGrid, Plus, Pencil, Trash2, Download, Wallet } from 'lucide-react'
import { api } from '../../lib/axios'
import { uploadFile } from '../../lib/upload'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useFocusHighlight } from '../../hooks/useFocusHighlight'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import HrDocumentGenerateModal from '../hr-documents/generate'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

const TYPE_LABEL: Record<string, string> = {
  PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', WORK_CERT: 'หนังสือรับรองการทำงาน', OTHER: 'อื่นๆ',
}
const REQUEST_TYPES = ['PAYSLIP', 'SALARY_CERT', 'WORK_CERT', 'OTHER'] as const
const EMPTY_REQ_FORM = { employee_id: '', type: 'PAYSLIP' as typeof REQUEST_TYPES[number], custom_type: '', period: '', note: '' }
const reqLabel: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }
const reqInput: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: 8, border: '1px solid #d1d5db', boxSizing: 'border-box', fontFamily: 'inherit' }
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
  const [reqModal, setReqModal] = useState<'add' | 'edit' | null>(null)
  const [reqEditTarget, setReqEditTarget] = useState<any>(null)
  const [reqForm, setReqForm] = useState(EMPTY_REQ_FORM)
  const [reqDeleteTarget, setReqDeleteTarget] = useState<any>(null)

  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'document-requests', statusFilter],
    queryFn: () => api.get('/api/v1/admin/document-requests', { params: { status: statusFilter || undefined } }).then(r => r.data.data),
  })
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
    enabled: !isReadOnly,
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

  // ── เพิ่ม/แก้ไข/ลบคำขอเอกสาร (feedback 2026-09-24) — เดิมมีแต่รีวิว
  // (อนุมัติ/ปฏิเสธ) คำขอที่พนักงานยื่นผ่าน LIFF เท่านั้น เผื่อกรณีพนักงานโทร/
  // เดินมาขอตรงๆ ไม่ได้ยื่นผ่านแอป ──
  const addReqMut = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/document-requests', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'document-requests'] }); showToast('success', 'สร้างคำขอเอกสารสำเร็จ'); setReqModal(null) },
    onError: () => showToast('error', 'สร้างคำขอไม่สำเร็จ'),
  })
  const editReqMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/document-requests/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'document-requests'] }); showToast('success', 'บันทึกการแก้ไขเรียบร้อย'); setReqModal(null) },
    onError: (err: any) => showToast('error', err?.response?.data?.error?.code === 'NOT_PENDING' ? 'คำขอนี้ดำเนินการไปแล้ว แก้ไขไม่ได้' : 'บันทึกไม่สำเร็จ'),
  })
  const deleteReqMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/document-requests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'document-requests'] }); showToast('success', 'ลบคำขอเรียบร้อย'); setReqDeleteTarget(null) },
    onError: () => showToast('error', 'ลบคำขอไม่สำเร็จ'),
  })

  function openAddReq() { setReqForm(EMPTY_REQ_FORM); setReqEditTarget(null); setReqModal('add') }
  function openEditReq(r: any) {
    setReqForm({ employee_id: r.employee.id, type: r.type, custom_type: r.custom_type ?? '', period: r.period ?? '', note: r.note ?? '' })
    setReqEditTarget(r)
    setReqModal('edit')
  }
  function handleSaveReq() {
    if (!reqForm.employee_id || !reqForm.type) { showToast('error', 'กรุณาเลือกพนักงานและประเภทเอกสาร'); return }
    const body = {
      type: reqForm.type,
      custom_type: reqForm.type === 'OTHER' ? (reqForm.custom_type || undefined) : undefined,
      period: reqForm.period || undefined,
      note: reqForm.note || undefined,
    }
    if (reqEditTarget) editReqMut.mutate({ id: reqEditTarget.id, body })
    else addReqMut.mutate({ employee_id: reqForm.employee_id, ...body })
  }

  const [showIssuedPanel, setShowIssuedPanel] = useState(false)

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> ขอเอกสาร HR</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={<Wallet size={14} />} onClick={() => setShowIssuedPanel(true)}>สรุปเงินเดือน/สลิป</Button>
          {!isReadOnly && (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openAddReq}>เพิ่มคำขอ</Button>
          )}
        </div>
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
                  <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#EC6F44', textDecoration: 'underline', textUnderlineOffset: 2 }}>
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
                  <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => openEditReq(r)}>แก้ไข</Button>
                  <Button variant="danger-soft" size="sm" icon={<Trash2 size={13} />} onClick={() => setReqDeleteTarget(r)}>ลบ</Button>
                </div>
              )}
              {r.status !== 'PENDING' && !isReadOnly && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button variant="danger-soft" size="sm" icon={<Trash2 size={13} />} onClick={() => setReqDeleteTarget(r)}>ลบคำขอ</Button>
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
                  <tr key={r.id} ref={r.id === focusId ? (focusRef as any) : undefined} style={{ borderBottom: i < filteredRows.length - 1 ? '1px solid #E6ECF4' : 'none', ...rowHighlight(r.id) }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button onClick={() => navigate(`/employee/${r.employee.id}`)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ fontWeight: 700, color: '#EC6F44', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.employee.first_name} {r.employee.last_name}</div>
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
                          <button onClick={() => openEditReq(r)} title="แก้ไข"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setReqDeleteTarget(r)} title="ลบ"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : !isReadOnly ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => setReqDeleteTarget(r)} title="ลบ"
                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
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

      {reqModal && (
        <Modal onClose={() => setReqModal(null)} width={420}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 16px' }}>{reqModal === 'add' ? 'เพิ่มคำขอเอกสาร' : `แก้ไขคำขอ: ${reqEditTarget?.employee.first_name} ${reqEditTarget?.employee.last_name}`}</p>

            {reqModal === 'add' && (
              <div style={{ marginBottom: 12 }}>
                <label style={reqLabel}>พนักงาน</label>
                <select value={reqForm.employee_id} onChange={e => setReqForm(f => ({ ...f, employee_id: e.target.value }))} style={reqInput}>
                  <option value="">เลือกพนักงาน</option>
                  {employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''} — {e.employee_code}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={reqLabel}>ประเภทเอกสาร</label>
              <select value={reqForm.type} onChange={e => setReqForm(f => ({ ...f, type: e.target.value as any }))} style={reqInput}>
                {REQUEST_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>

            {reqForm.type === 'OTHER' && (
              <div style={{ marginBottom: 12 }}>
                <label style={reqLabel}>ระบุประเภทเอกสาร</label>
                <input value={reqForm.custom_type} onChange={e => setReqForm(f => ({ ...f, custom_type: e.target.value }))} placeholder="เช่น หนังสือรับรองภาษี" style={reqInput} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={reqLabel}>งวด/เดือนที่ต้องการ (ถ้ามี)</label>
              <input value={reqForm.period} onChange={e => setReqForm(f => ({ ...f, period: e.target.value }))} placeholder="เช่น 2026-09" style={reqInput} />
            </div>

            <div style={{ marginBottom: 4 }}>
              <label style={reqLabel}>หมายเหตุ</label>
              <textarea value={reqForm.note} onChange={e => setReqForm(f => ({ ...f, note: e.target.value }))} rows={3} style={{ ...reqInput, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setReqModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSaveReq} disabled={addReqMut.isPending || editReqMut.isPending}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#EC6F44', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (addReqMut.isPending || editReqMut.isPending) ? 0.7 : 1 }}>
                {(addReqMut.isPending || editReqMut.isPending) ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {reqDeleteTarget && (
        <ConfirmDialog
          title="ลบคำขอเอกสาร?"
          message={<>ยืนยันลบคำขอ "<strong>{TYPE_LABEL[reqDeleteTarget.type] ?? reqDeleteTarget.type}</strong>" ของ "<strong>{reqDeleteTarget.employee.first_name} {reqDeleteTarget.employee.last_name}</strong>" — ไม่กระทบเอกสารที่สร้างไว้แล้วในระบบ</>}
          confirmLabel="ลบคำขอ"
          variant="danger"
          onConfirm={() => deleteReqMut.mutate(reqDeleteTarget.id)}
          onCancel={() => setReqDeleteTarget(null)}
        />
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

      {showIssuedPanel && <IssuedDocsPanel onClose={() => setShowIssuedPanel(false)} />}
    </div>
  )
}

// ── สรุปเอกสารเงินเดือน/สลิปที่ออกแล้ว (feedback 2026-09-24: "ระบบ Export
// เงินเดือน/สลิป จากเอกสาร HR") — แยกจากคำขอ (PENDING/COMPLETED/REJECTED)
// ด้านบนโดยตั้งใจ: นี่คือรายการเอกสารจริงที่ "สร้างแล้ว" (HrDocument, จาก
// generate.tsx) ไม่ใช่คำขอ — กรองกลุ่ม/สาขา/แผนกได้ + export CSV
interface ApiHrDoc {
  id: string; type: 'PAYSLIP' | 'SALARY_CERT' | 'RESIGNATION_LETTER'
  doc_number: string | null; period: string | null; created_at: string
  data: any
  employee: { id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string; position_id?: string | null; branch: { id: string; name: string; group_id?: string | null } }
}
const HR_DOC_TYPE_LABEL: Record<string, string> = { PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', RESIGNATION_LETTER: 'ใบลาออก' }

function netAmount(doc: ApiHrDoc): number | null {
  if (doc.type === 'PAYSLIP' && doc.data?.income) {
    const incomeTotal = Object.values(doc.data.income as Record<string, unknown>).reduce((s: number, v) => s + (Number(v) || 0), 0)
    const deductTotal = Object.values((doc.data.deduction ?? {}) as Record<string, unknown>).reduce((s: number, v) => s + (Number(v) || 0), 0)
    return incomeTotal - deductTotal
  }
  if (doc.type === 'SALARY_CERT' && doc.data?.monthly_wage) return Number(doc.data.monthly_wage) || null
  return null
}

function IssuedDocsPanel({ onClose }: { onClose: () => void }) {
  const [typeFilter, setTypeFilter] = useState<'PAYSLIP' | 'SALARY_CERT' | ''>('PAYSLIP')
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)

  const { data: docs = [], isLoading } = useQuery<ApiHrDoc[]>({
    queryKey: ['admin', 'hr-documents', 'all', typeFilter],
    queryFn: () => api.get('/api/v1/admin/hr-documents', { params: { type: typeFilter || undefined } }).then(r => r.data.data),
  })
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<any[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const employeeOrgMap = buildEmployeeOrgMap(employees, positions)
  const filtered = docs.filter(d => matchesOrgFilter(employeeOrgMap[d.employee.id] ?? {
    groupId: d.employee.branch.group_id ?? null, branchId: d.employee.branch.id, departmentId: null, positionId: d.employee.position_id ?? null,
  }, orgFilter))

  function exportIssuedDocs() {
    const header = ['พนักงาน', 'รหัสพนักงาน', 'สาขา', 'ประเภทเอกสาร', 'เลขที่เอกสาร', 'งวด', 'วันที่ออก', 'ยอดสุทธิ (บาท)']
    const rows = filtered.map(d => [
      `${d.employee.first_name} ${d.employee.last_name}`, d.employee.employee_code, d.employee.branch.name,
      HR_DOC_TYPE_LABEL[d.type] ?? d.type, d.doc_number || '', d.period || '',
      thDate(d.created_at), netAmount(d) != null ? String(netAmount(d)) : '',
    ])
    const csv = '﻿' + [header, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `เอกสารที่ออกแล้ว_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const totalNet = filtered.reduce((s, d) => s + (netAmount(d) ?? 0), 0)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 760, maxWidth: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E6ECF4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>สรุปเอกสารเงินเดือน/สลิปที่ออกแล้ว</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18}/></button>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #E6ECF4' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
            <option value="PAYSLIP">สลิปเงินเดือน</option>
            <option value="SALARY_CERT">หนังสือรับรองเงินเดือน</option>
            <option value="">ทุกประเภท</option>
          </select>
          <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportIssuedDocs} disabled={filtered.length === 0} style={{ marginLeft: 'auto' }}>
            Export
          </Button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>ไม่พบเอกสารที่ออกแล้วตามตัวกรองนี้</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0 }}>
                  {['พนักงาน', 'ประเภท', 'งวด/เลขที่', 'วันที่ออก', 'ยอดสุทธิ'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const net = netAmount(d)
                  return (
                    <tr key={d.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #E6ECF4' : 'none' }}>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{d.employee.first_name} {d.employee.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.employee.employee_code} · {d.employee.branch.name}</div>
                      </td>
                      <td style={{ padding: '9px 14px', color: '#374151' }}>{HR_DOC_TYPE_LABEL[d.type] ?? d.type}</td>
                      <td style={{ padding: '9px 14px', color: '#374151' }}>{d.period || d.doc_number || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{thDate(d.created_at)}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: '#111827' }}>{net != null ? `฿${net.toLocaleString()}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E6ECF4', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{filtered.length} ฉบับ</span>
            <span style={{ fontWeight: 700 }}>รวม ฿{totalNet.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
