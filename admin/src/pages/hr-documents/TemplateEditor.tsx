// admin/src/pages/hr-documents/TemplateEditor.tsx
// หน้าออกแบบเทมเพลตเอกสาร HR (ลาก-วาง) — เฉพาะหนังสือรับรองเงินเดือน/การทำงาน
// (feedback 2026-10-01 "ออกแบบ Template และจัดเก็บไว้ได้ และดูตัวอย่างได้") แก้ไข/ลาก/
// ปรับขนาดกล่องข้อความบน canvas เดียวกับที่ใช้ render จริง (CertCanvas) แท็บ "ดูตัวอย่าง"
// สลับ editable=false บน component เดียวกัน จึงตรงกับของจริงตอนพิมพ์เป๊ะเสมอ
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Minus, Trash2, Bold, AlignLeft, AlignCenter, AlignRight, Eye, Pencil, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { useIsReadOnly } from '../../stores/authStore'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import CertCanvas from './CertCanvas'
import { CERT_VARIABLES, CERT_DOC_LABEL, DEFAULT_ELEMENTS, SAMPLE_DATA, type CertDocType, type TemplateElement } from './certTemplate'

const VALID_TYPES: CertDocType[] = ['SALARY_CERT', 'WORK_CERT']

let seq = 0
function newId() { seq += 1; return `el_new_${Date.now()}_${seq}` }

const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }

export default function HrDocumentTemplateEditorPage() {
  const { docType: docTypeParam } = useParams<{ docType: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // เก็บตำแหน่ง cursor ล่าสุดไว้ตอน textarea เสีย focus (เช่นตอนคลิก dropdown
  // "แทรกตัวแปร") เพราะตอน onChange ของ <select> ทำงาน activeElement จะเป็น
  // select ไปแล้ว เช็ค document.activeElement ตอนนั้นไม่เจอ textarea อีกต่อไป
  const lastSelRef = useRef<{ start: number; end: number } | null>(null)

  const docType = VALID_TYPES.includes(docTypeParam as CertDocType) ? (docTypeParam as CertDocType) : null

  const { data: tpl, isLoading } = useQuery<{ elements: TemplateElement[] } | null>({
    queryKey: ['hr-document-template', docType],
    queryFn: () => api.get(`/api/v1/admin/hr-document-templates/${docType}`).then(r => r.data.data),
    enabled: !!docType,
  })

  const [elements, setElements] = useState<TemplateElement[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [confirmReset, setConfirmReset] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (isLoading || loaded.current || !docType) return
    loaded.current = true
    setElements(tpl?.elements ?? DEFAULT_ELEMENTS[docType])
  }, [isLoading, tpl, docType])

  // เลือก element ใหม่ → ตำแหน่ง cursor เดิม (ของกล่องก่อนหน้า) ใช้ไม่ได้แล้ว
  useEffect(() => { lastSelRef.current = null }, [selectedId])

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/api/v1/admin/hr-document-templates/${docType}`, { elements }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-document-template', docType] }); showToast('success', 'บันทึกเทมเพลตแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const resetMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/admin/hr-document-templates/${docType}/reset`),
    onSuccess: () => {
      if (docType) setElements(DEFAULT_ELEMENTS[docType])
      setSelectedId(null)
      qc.invalidateQueries({ queryKey: ['hr-document-template', docType] })
      showToast('success', 'รีเซ็ตเทมเพลตแล้ว')
    },
    onError: () => showToast('error', 'รีเซ็ตไม่สำเร็จ'),
  })

  if (!docType) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>ไม่พบประเภทเอกสารนี้</div>

  const selected = elements?.find(e => e.id === selectedId) ?? null
  const hasLogo = elements?.some(e => e.kind === 'image') ?? false
  const variables = CERT_VARIABLES[docType]

  function update(patch: Partial<TemplateElement>) {
    if (!selectedId) return
    setElements(els => els!.map(e => (e.id === selectedId ? { ...e, ...patch } : e)))
  }

  function addText() {
    const el: TemplateElement = { id: newId(), kind: 'text', x: 20, y: 200, w: 100, h: 10, fontSize: 13, align: 'left', content: 'ข้อความใหม่' }
    setElements(els => [...(els ?? []), el])
    setSelectedId(el.id)
  }
  function addLine() {
    const el: TemplateElement = { id: newId(), kind: 'line', x: 20, y: 200, w: 170, h: 0 }
    setElements(els => [...(els ?? []), el])
    setSelectedId(el.id)
  }
  function toggleLogo() {
    if (hasLogo) {
      setElements(els => els!.filter(e => e.kind !== 'image'))
      if (selected?.kind === 'image') setSelectedId(null)
    } else {
      const el: TemplateElement = { id: newId(), kind: 'image', x: 20, y: 10, w: 32, h: 18 }
      setElements(els => [...(els ?? []), el])
      setSelectedId(el.id)
    }
  }
  function deleteSelected() {
    if (!selectedId) return
    setElements(els => els!.filter(e => e.id !== selectedId))
    setSelectedId(null)
  }
  function insertVariable(key: string) {
    if (!selected || selected.kind !== 'text') return
    const token = `{{${key}}}`
    const content = selected.content ?? ''
    const sel = lastSelRef.current
    const start = sel?.start ?? content.length
    const end = sel?.end ?? content.length
    const nextContent = content.slice(0, start) + token + content.slice(end)
    update({ content: nextContent })
    const caret = start + token.length
    lastSelRef.current = { start: caret, end: caret }
    // ตั้ง cursor กลับไปหลัง token ที่เพิ่งแทรก ให้แทรกตัวแปรถัดไปต่อท้ายได้เลย
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(caret, caret))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/document-requests')} style={{ ...btn, border: 'none', padding: '7px 4px' }}>
          <ArrowLeft size={15} /> กลับ
        </button>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, flex: 1 }}>ออกแบบเทมเพลต: {CERT_DOC_LABEL[docType]}</h1>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2 }}>
          <button onClick={() => setMode('edit')} style={{ ...btn, border: 'none', background: mode === 'edit' ? '#fff' : 'transparent', boxShadow: mode === 'edit' ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
            <Pencil size={13} /> แก้ไข
          </button>
          <button onClick={() => setMode('preview')} style={{ ...btn, border: 'none', background: mode === 'preview' ? '#fff' : 'transparent', boxShadow: mode === 'preview' ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
            <Eye size={13} /> ดูตัวอย่าง
          </button>
        </div>
        {!readOnly && (
          <>
            <button onClick={() => setConfirmReset(true)} style={btn}><RefreshCw size={13} /> รีเซ็ตเป็นค่าเริ่มต้น</button>
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !elements}
              style={{ ...btn, border: 'none', background: '#244B83', color: '#fff' }}>
              {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </>
        )}
      </div>

      {!readOnly && mode === 'edit' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={addText} style={btn}><Plus size={13} /> เพิ่มข้อความ</button>
          <button onClick={addLine} style={btn}><Minus size={13} /> เส้นคั่น</button>
          <button onClick={toggleLogo} style={btn}><ImageIcon size={13} /> {hasLogo ? 'ลบโลโก้บริษัท' : 'เพิ่มโลโก้บริษัท'}</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', background: '#e5e7eb', borderRadius: 12, padding: 24 }}>
          {!elements ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>กำลังโหลด...</div>
          ) : (
            <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <CertCanvas
                elements={elements}
                data={SAMPLE_DATA}
                editable={mode === 'edit' && !readOnly}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={setElements}
              />
            </div>
          )}
        </div>

        {mode === 'edit' && !readOnly && selected && (
          <div style={{ width: 260, flexShrink: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151' }}>
                {selected.kind === 'text' ? 'กล่องข้อความ' : selected.kind === 'line' ? 'เส้นคั่น' : 'โลโก้บริษัท'}
              </span>
              <button onClick={deleteSelected} title="ลบ" style={{ border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={13} />
              </button>
            </div>

            {selected.kind === 'text' && (
              <>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>เนื้อหา</label>
                  <textarea ref={textareaRef} value={selected.content ?? ''}
                    onChange={e => { update({ content: e.target.value }); lastSelRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd } }}
                    onSelect={e => { const t = e.currentTarget; lastSelRef.current = { start: t.selectionStart, end: t.selectionEnd } }}
                    style={{ width: '100%', minHeight: 100, padding: 8, borderRadius: 7, border: '1px solid #e5e7eb', fontSize: '12.5px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>แทรกตัวแปร</label>
                  <select value="" onChange={e => e.target.value && insertVariable(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: '12px', fontFamily: 'inherit' }}>
                    <option value="">เลือกตัวแปร...</option>
                    {variables.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#6b7280' }}>ขนาดฟอนต์</label>
                  <input type="number" min={8} max={32} value={selected.fontSize ?? 13} onChange={e => update({ fontSize: parseInt(e.target.value) || 13 })}
                    style={{ width: 54, padding: '5px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '12px', textAlign: 'center' }} />
                  <button onClick={() => update({ bold: !selected.bold })}
                    style={{ ...btn, padding: '5px 8px', background: selected.bold ? '#F4F6F9' : '#fff', borderColor: selected.bold ? '#244B83' : '#e5e7eb', color: selected.bold ? '#244B83' : '#374151' }}>
                    <Bold size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                    <button key={a} onClick={() => update({ align: a })}
                      style={{ ...btn, padding: '6px 10px', background: (selected.align ?? 'left') === a ? '#F4F6F9' : '#fff', borderColor: (selected.align ?? 'left') === a ? '#244B83' : '#e5e7eb', color: (selected.align ?? 'left') === a ? '#244B83' : '#374151' }}>
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
              </>
            )}

            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>ลากกล่องเพื่อย้ายตำแหน่ง ลากมุมขวาล่างเพื่อปรับขนาด</p>
          </div>
        )}
      </div>

      {confirmReset && (
        <ConfirmDialog
          variant="warning"
          title="รีเซ็ตเทมเพลตเป็นค่าเริ่มต้น?"
          message="การแก้ไขที่บันทึกไว้ทั้งหมดของเทมเพลตนี้จะถูกลบ และกลับไปใช้ layout เริ่มต้นของระบบ"
          confirmLabel="ยืนยันรีเซ็ต"
          onConfirm={() => { setConfirmReset(false); resetMutation.mutate() }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}
