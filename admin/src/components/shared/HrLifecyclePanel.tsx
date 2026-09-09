// admin/src/components/shared/HrLifecyclePanel.tsx
// เอกสาร / ทดลองงาน / หนังสือเตือน ของพนักงาน 1 คน — โผล่แต่ละส่วนตาม feature ที่เปิด
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Trash2, Target, AlertTriangle, CheckCircle2, X, Upload, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../ui/Toast'
import { useAuthStore } from '../../stores/authStore'
import ConfirmDialog from '../ui/ConfirmDialog'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { uploadFile } from '../../lib/upload'

const DOC_TYPE_LABEL: Record<string, string> = {
  CONTRACT: 'สัญญาจ้าง', ID_CARD: 'บัตรประชาชน', HOUSE_REG: 'ทะเบียนบ้าน', WORK_PERMIT: 'ใบอนุญาตทำงาน',
  VISA: 'วีซ่า', LICENSE: 'ใบอนุญาต/ใบขับขี่', CERT: 'ใบรับรอง/certificate', OTHER: 'อื่นๆ',
}
const DISC_CAT_LABEL: Record<string, string> = {
  LATE: 'มาสาย', ABSENCE: 'ขาดงาน', MISCONDUCT: 'ประพฤติผิด', PERFORMANCE: 'ผลงาน', SAFETY: 'ความปลอดภัย', OTHER: 'อื่นๆ',
}
const DISC_LEVEL_LABEL: Record<number, string> = { 1: 'เตือนด้วยวาจา', 2: 'เตือนเป็นลายลักษณ์อักษร', 3: 'เตือนครั้งสุดท้าย' }

function daysLabel(dateStr: string) {
  const d = Math.round((new Date(dateStr + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
  if (d < 0) return { text: `เลยมา ${-d} วัน`, color: '#dc2626' }
  if (d === 0) return { text: 'วันนี้', color: '#dc2626' }
  if (d <= 30) return { text: `อีก ${d} วัน`, color: '#d97706' }
  return { text: `อีก ${d} วัน`, color: '#64748b' }
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: 4, color: '#374151' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }
const secHead: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }

interface Features { employee_documents?: boolean; probation?: boolean; disciplinary?: boolean }

export default function HrLifecyclePanel({ employeeId, emp, features }: { employeeId: string; emp: any; features: Features }) {
  const readOnly = useAuthStore(s => s.role) === 'EXECUTIVE'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {features.probation !== false && <ProbationSection employeeId={employeeId} emp={emp} readOnly={readOnly} />}
      {features.employee_documents !== false && <DocumentsSection employeeId={employeeId} readOnly={readOnly} />}
      {features.disciplinary !== false && <DisciplinarySection employeeId={employeeId} readOnly={readOnly} />}
    </div>
  )
}

// ── ทดลองงาน ────────────────────────────────────────────────────────────────
function ProbationSection({ employeeId, emp, readOnly }: { employeeId: string; emp: any; readOnly: boolean }) {
  const qc = useQueryClient(); const { showToast } = useToast()
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({ probation_end_date: emp.probation_end_date?.slice(0, 10) ?? '', probation_result: emp.probation_result ?? '', probation_note: emp.probation_note ?? '' })
  const mut = useMutation({
    mutationFn: () => api.patch(`/api/v1/admin/employees/${employeeId}/probation`, {
      probation_end_date: form.probation_end_date || null,
      probation_result: form.probation_result || null,
      probation_note: form.probation_note || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee', employeeId] }); showToast('success', 'บันทึกทดลองงานแล้ว'); setEdit(false) },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const resultBadge = emp.probation_result === 'PASS'
    ? { t: 'ผ่านทดลองงาน', bg: '#dcfce7', c: '#15803d' }
    : emp.probation_result === 'FAIL'
      ? { t: 'ไม่ผ่านทดลองงาน', bg: '#fee2e2', c: '#dc2626' }
      : emp.probation_end_date ? { t: 'อยู่ระหว่างทดลองงาน', bg: '#fef3c7', c: '#92400e' } : null

  return (
    <div style={card}>
      <div style={secHead}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: '13px', color: '#111827' }}><Target size={14} /> ทดลองงาน</span>
        {!readOnly && !edit && <button onClick={() => setEdit(true)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>แก้ไข</button>}
      </div>
      <div style={{ padding: 16 }}>
        {!edit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '13px' }}>
            {resultBadge && <span style={{ alignSelf: 'flex-start', background: resultBadge.bg, color: resultBadge.c, borderRadius: 99, padding: '3px 12px', fontSize: '12px', fontWeight: 700 }}>{resultBadge.t}</span>}
            <div style={{ color: '#374151' }}>ครบทดลองงาน: <b>{emp.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '— ไม่ได้ระบุ'}</b></div>
            {emp.probation_note && <div style={{ color: '#64748b', fontSize: '12.5px' }}>บันทึก: {emp.probation_note}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>วันครบทดลองงาน</label><input type="date" style={inp} value={form.probation_end_date} onChange={e => setForm(f => ({ ...f, probation_end_date: e.target.value }))} /></div>
            <div><label style={lbl}>ผลประเมิน</label>
              <select style={inp} value={form.probation_result} onChange={e => setForm(f => ({ ...f, probation_result: e.target.value }))}>
                <option value="">ยังไม่ประเมิน</option><option value="PASS">ผ่าน</option><option value="FAIL">ไม่ผ่าน</option>
              </select>
            </div>
            <div><label style={lbl}>บันทึกผลประเมิน</label><textarea rows={2} style={{ ...inp, resize: 'none' }} value={form.probation_note} onChange={e => setForm(f => ({ ...f, probation_note: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => setEdit(false)}>ยกเลิก</Button>
              <Button variant="primary" size="sm" loading={mut.isPending} onClick={() => mut.mutate()}>บันทึก</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── เอกสาร ──────────────────────────────────────────────────────────────────
function DocumentsSection({ employeeId, readOnly }: { employeeId: string; readOnly: boolean }) {
  const qc = useQueryClient(); const { showToast } = useToast()
  const [add, setAdd] = useState(false)
  const [del, setDel] = useState<any>(null)
  const [form, setForm] = useState({ type: 'CONTRACT', name: '', file_url: '', issued_date: '', expiry_date: '', note: '' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { data: docs = [] } = useQuery<any[]>({ queryKey: ['emp-docs', employeeId], queryFn: () => api.get(`/api/v1/admin/employees/${employeeId}/documents`).then(r => r.data.data) })

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 15 * 1024 * 1024) { showToast('error', 'ไฟล์ใหญ่เกิน 15MB'); return }
    setUploading(true)
    try {
      const url = await uploadFile(file)
      setForm(f => ({ ...f, file_url: url, name: f.name || file.name.replace(/\.[^.]+$/, '') }))
      showToast('success', 'อัปโหลดไฟล์แล้ว')
    } catch { showToast('error', 'อัปโหลดไม่สำเร็จ') } finally { setUploading(false) }
  }
  const reset = () => setForm({ type: 'CONTRACT', name: '', file_url: '', issued_date: '', expiry_date: '', note: '' })
  const addMut = useMutation({
    mutationFn: () => api.post(`/api/v1/admin/employees/${employeeId}/documents`, {
      type: form.type, name: form.name.trim(), file_url: form.file_url.trim(),
      issued_date: form.issued_date || null, expiry_date: form.expiry_date || null, note: form.note.trim() || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-docs', employeeId] }); showToast('success', 'เพิ่มเอกสารแล้ว'); setAdd(false); reset() },
    onError: () => showToast('error', 'เพิ่มไม่สำเร็จ'),
  })
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/employee-documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-docs', employeeId] }); showToast('success', 'ลบแล้ว'); setDel(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })

  return (
    <div style={card}>
      <div style={secHead}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: '13px', color: '#111827' }}><FileText size={14} /> เอกสาร ({docs.length})</span>
        {!readOnly && <button onClick={() => setAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={13} /> เพิ่ม</button>}
      </div>
      {docs.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ยังไม่มีเอกสาร</div>
      ) : docs.map((d, i) => {
        const exp = d.expiry_date ? daysLabel(d.expiry_date.slice(0, 10)) : null
        return (
          <div key={d.id} style={{ padding: '12px 16px', borderBottom: i < docs.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {d.name} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>· {DOC_TYPE_LABEL[d.type] ?? d.type}</span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>เปิดไฟล์</a>
                {exp && <span style={{ color: exp.color, fontWeight: 700 }}>หมดอายุ {exp.text}</span>}
                {d.note && <span>{d.note}</span>}
              </div>
            </div>
            {!readOnly && <button onClick={() => setDel(d)} aria-label="ลบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Trash2 size={14} /></button>}
          </div>
        )
      })}

      {add && (
        <Modal onClose={() => setAdd(false)} width={420}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>เพิ่มเอกสาร</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>ประเภท</label><select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{Object.entries(DOC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label style={lbl}>ชื่อเอกสาร *</label><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น สัญญาจ้าง 2569" /></div>
              <div>
                <label style={lbl}>ไฟล์เอกสาร *</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button variant="secondary" size="sm" icon={uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}
                  </Button>
                  {form.file_url && <a href={form.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={12} /> อัปโหลดแล้ว</a>}
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={pickFile} hidden />
                <input style={{ ...inp, marginTop: 6, fontSize: '12px' }} value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="หรือวางลิงก์ URL (Google Drive ฯลฯ)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>วันออก</label><input type="date" style={inp} value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} /></div>
                <div><label style={lbl}>วันหมดอายุ</label><input type="date" style={inp} value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              </div>
              <div><label style={lbl}>หมายเหตุ</label><input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
              <Button variant="primary" block loading={addMut.isPending} disabled={!form.name.trim() || !form.file_url.trim()} onClick={() => addMut.mutate()} style={{ marginTop: 4 }}>บันทึก</Button>
            </div>
          </div>
        </Modal>
      )}
      {del && <ConfirmDialog title="ลบเอกสารนี้?" message={del.name} onConfirm={() => delMut.mutate(del.id)} onCancel={() => setDel(null)} />}
    </div>
  )
}

// ── หนังสือเตือน ────────────────────────────────────────────────────────────
function DisciplinarySection({ employeeId, readOnly }: { employeeId: string; readOnly: boolean }) {
  const qc = useQueryClient(); const { showToast } = useToast()
  const [add, setAdd] = useState(false)
  const [del, setDel] = useState<any>(null)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ level: 1, category: 'LATE', detail: '', incident_date: today })
  const { data: recs = [] } = useQuery<any[]>({ queryKey: ['emp-disc', employeeId], queryFn: () => api.get(`/api/v1/admin/employees/${employeeId}/disciplinary`).then(r => r.data.data) })
  const addMut = useMutation({
    mutationFn: () => api.post(`/api/v1/admin/employees/${employeeId}/disciplinary`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-disc', employeeId] }); showToast('success', 'ออกหนังสือเตือนแล้ว'); setAdd(false); setForm({ level: 1, category: 'LATE', detail: '', incident_date: today }) },
    onError: () => showToast('error', 'ไม่สำเร็จ'),
  })
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/disciplinary/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-disc', employeeId] }); showToast('success', 'ลบแล้ว'); setDel(null) },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })
  const levelColor = (l: number) => l >= 3 ? '#dc2626' : l === 2 ? '#d97706' : '#64748b'

  return (
    <div style={card}>
      <div style={secHead}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: '13px', color: '#111827' }}><AlertTriangle size={14} /> หนังสือเตือน ({recs.length})</span>
        {!readOnly && <button onClick={() => setAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Plus size={13} /> ออกหนังสือ</button>}
      </div>
      {recs.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ไม่มีประวัติหนังสือเตือน</div>
      ) : recs.map((r, i) => (
        <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < recs.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', gap: 12 }}>
          <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: levelColor(r.level) + '18', color: levelColor(r.level), fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.level}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: '#111827' }}>
              <b>{DISC_CAT_LABEL[r.category] ?? r.category}</b> <span style={{ color: '#94a3b8', fontSize: '12px' }}>· {DISC_LEVEL_LABEL[r.level]}</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#374151', marginTop: 2 }}>{r.detail}</div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>เหตุเกิด {new Date(r.incident_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {r.acknowledged_at
                ? <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle2 size={11} /> พนักงานรับทราบแล้ว</span>
                : <span style={{ color: '#d97706', fontWeight: 700 }}>รอพนักงานรับทราบ</span>}
            </div>
          </div>
          {!readOnly && <button onClick={() => setDel(r)} aria-label="ลบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, alignSelf: 'flex-start' }}><Trash2 size={14} /></button>}
        </div>
      ))}

      {add && (
        <Modal onClose={() => setAdd(false)} width={420}>
          <div style={{ padding: 24 }}>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>ออกหนังสือเตือน</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lbl}>ระดับ</label><select style={inp} value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))}>{[1, 2, 3].map(l => <option key={l} value={l}>{l} · {DISC_LEVEL_LABEL[l]}</option>)}</select></div>
                <div><label style={lbl}>หมวด</label><select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{Object.entries(DISC_CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><label style={lbl}>วันที่เกิดเหตุ *</label><input type="date" style={inp} value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} /></div>
              <div><label style={lbl}>รายละเอียด *</label><textarea rows={3} style={{ ...inp, resize: 'none' }} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="อธิบายเหตุการณ์และข้อตักเตือน" /></div>
              <Button variant="danger" block disabled={!form.detail.trim()} loading={addMut.isPending} onClick={() => addMut.mutate()} style={{ marginTop: 4 }}>ออกหนังสือเตือน</Button>
            </div>
          </div>
        </Modal>
      )}
      {del && <ConfirmDialog title="ลบหนังสือเตือนนี้?" message={`${DISC_LEVEL_LABEL[del.level]} — ${DISC_CAT_LABEL[del.category] ?? del.category}`} onConfirm={() => delMut.mutate(del.id)} onCancel={() => setDel(null)} />}
    </div>
  )
}
