// admin/src/pages/hr-documents/generate.tsx
// ฟอร์มสร้างเอกสาร HR — auto-fill ส่วนที่ระบบมีอยู่แล้ว (ชื่อ/ตำแหน่ง/บริษัท/เลขที่เอกสาร)
// ส่วนตัวเลขการเงินแอดมินกรอกเอง (ระบบไม่มีข้อมูลการเงิน) — feedback 2026-09-15
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import Modal from '../../components/ui/Modal'

type DocType = 'PAYSLIP' | 'SALARY_CERT' | 'RESIGNATION_LETTER'

const TYPE_LABEL: Record<DocType, string> = { PAYSLIP: 'สลิปเงินเดือน', SALARY_CERT: 'หนังสือรับรองเงินเดือน', RESIGNATION_LETTER: 'ใบลาออก' }

interface DocData {
  employee: { id: string; employee_code: string; full_name: string; nickname: string | null; position_name: string | null; branch_name: string | null; hired_at: string | null }
  tenant: { name: string; address: string | null; tax_id: string | null; logo_url: string | null; signer_name: string | null; signer_title: string | null }
  suggested_doc_number: string | null
}

const label: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontFamily: 'inherit' }
const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }

function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function HrDocumentGenerateModal({ employeeId, type, documentRequestId, period, onClose, onCreated }: {
  employeeId: string; type: DocType; documentRequestId?: string; period?: string
  onClose: () => void; onCreated?: () => void
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()

  const { data, isLoading } = useQuery<DocData>({
    queryKey: ['hr-doc-data', employeeId, type],
    queryFn: () => api.get(`/api/v1/admin/employees/${employeeId}/hr-doc-data`, { params: { type } }).then(r => r.data.data),
  })

  // Payslip fields
  const [payDate, setPayDate] = useState(todayISO())
  const [payPeriod, setPayPeriod] = useState(period ?? '')
  const [income, setIncome] = useState({ salary: '', commission: '', attendance_bonus: '', transport: '', position_allowance: '', experience_allowance: '', day_off_buyback: '', kpi: '', birthday_bonus: '' })
  const [deduction, setDeduction] = useState({ social_security: '', other: '' })

  // Salary cert fields
  const [docNumber, setDocNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [monthlyWage, setMonthlyWage] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())

  // Resignation fields
  const [place, setPlace] = useState('')
  const [writeDate, setWriteDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')

  useEffect(() => {
    if (!data) return
    setDocNumber(data.suggested_doc_number ?? '')
    setStartDate(data.employee.hired_at ? data.employee.hired_at.slice(0, 10) : '')
  }, [data])

  const mut = useMutation({
    mutationFn: () => {
      if (!data) throw new Error('no data')
      const company = { name: data.tenant.name, address: data.tenant.address, tax_id: data.tenant.tax_id, logo_url: data.tenant.logo_url }
      const signer = { signer_name: data.tenant.signer_name, signer_title: data.tenant.signer_title }
      let payload: any
      if (type === 'PAYSLIP') {
        payload = {
          employee_id: employeeId, type, period: payPeriod || null, document_request_id: documentRequestId ?? null,
          data: { company, signer, full_name: data.employee.full_name, employee_code: data.employee.employee_code, position_name: data.employee.position_name, pay_date: payDate || null, pay_period: payPeriod || null, income, deduction },
        }
      } else if (type === 'SALARY_CERT') {
        payload = {
          employee_id: employeeId, type, doc_number: docNumber || null, document_request_id: documentRequestId ?? null,
          data: { company, signer, full_name: data.employee.full_name, position_name: data.employee.position_name, start_date: startDate || null, monthly_wage: monthlyWage, issue_date: issueDate || null },
        }
      } else {
        payload = {
          employee_id: employeeId, type,
          data: { company, full_name: data.employee.full_name, position_name: data.employee.position_name, place, write_date: writeDate || null, reason, effective_date: effectiveDate || null },
        }
      }
      return api.post('/api/v1/admin/hr-documents', payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['hr-documents'] })
      showToast('success', 'สร้างเอกสารสำเร็จ')
      window.open(`/hr-documents/${res.data.data.id}/print`, '_blank')
      onCreated?.()
      onClose()
    },
    onError: () => showToast('error', 'สร้างเอกสารไม่สำเร็จ'),
  })

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileText size={17} color="#ea580c" />
          <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>สร้าง{TYPE_LABEL[type]}</p>
        </div>

        {isLoading || !data ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 className="animate-spin" size={20} /></div>
        ) : (
          <>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', margin: '12px 0 16px', fontSize: '12.5px', color: '#374151' }}>
              <div><b>{data.employee.full_name}</b>{data.employee.nickname ? ` (${data.employee.nickname})` : ''} · {data.employee.employee_code}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>ตำแหน่ง {data.employee.position_name ?? '—ยังไม่ผูกตำแหน่ง—'} · {data.tenant.name}</div>
              {!data.employee.position_name && <div style={{ color: '#d97706', marginTop: 4 }}>ยังไม่ได้ผูกตำแหน่งพนักงานคนนี้ในผังองค์กร — เอกสารจะเว้นช่องว่างไว้</div>}
            </div>

            {type === 'PAYSLIP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={row2}>
                  <div><label style={label}>วันที่จ่ายเงิน</label><input type="date" style={inputStyle} value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
                  <div><label style={label}>เงินเดือนประจำเดือน</label><input style={inputStyle} value={payPeriod} onChange={e => setPayPeriod(e.target.value)} placeholder="เช่น พ.ค. 69" /></div>
                </div>
                <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#6b7280', margin: '4px 0 0' }}>รายการเงินได้ (บาท) — ไม่มีในระบบ กรอกเอง</p>
                <div style={row2}>
                  {(Object.keys(income) as (keyof typeof income)[]).map(k => (
                    <div key={k}>
                      <label style={label}>{{ salary: 'เงินเดือน', commission: 'ค่าคอมมิชชั่น', attendance_bonus: 'ค่าเบี้ยขยัน', transport: 'ค่าเดินทาง+สื่อสาร', position_allowance: 'เงินประจำตำแหน่ง', experience_allowance: 'ค่าประสบการณ์', day_off_buyback: 'ซื้อคืนวันหยุด', kpi: 'KPI', birthday_bonus: 'เงินวันเกิด' }[k]}</label>
                      <input type="number" style={inputStyle} value={income[k]} onChange={e => setIncome(v => ({ ...v, [k]: e.target.value }))} placeholder="0.00" />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#6b7280', margin: '4px 0 0' }}>รายการเงินหัก (บาท)</p>
                <div style={row2}>
                  <div><label style={label}>ประกันสังคม</label><input type="number" style={inputStyle} value={deduction.social_security} onChange={e => setDeduction(v => ({ ...v, social_security: e.target.value }))} placeholder="0.00" /></div>
                  <div><label style={label}>อื่นๆ</label><input type="number" style={inputStyle} value={deduction.other} onChange={e => setDeduction(v => ({ ...v, other: e.target.value }))} placeholder="0.00" /></div>
                </div>
              </div>
            )}

            {type === 'SALARY_CERT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><label style={label}>เลขที่เอกสาร</label><input style={inputStyle} value={docNumber} onChange={e => setDocNumber(e.target.value)} /></div>
                <div style={row2}>
                  <div><label style={label}>เริ่มงานวันที่</label><input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  <div><label style={label}>ออกให้ ณ วันที่</label><input type="date" style={inputStyle} value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
                </div>
                <div><label style={label}>อัตราค่าจ้างเดือนละ (บาท) — ไม่มีในระบบ กรอกเอง</label><input type="number" style={inputStyle} value={monthlyWage} onChange={e => setMonthlyWage(e.target.value)} placeholder="0.00" /></div>
              </div>
            )}

            {type === 'RESIGNATION_LETTER' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>เว้นว่างได้ถ้าจะให้พนักงานเขียนเองด้วยลายมือหลังพิมพ์</p>
                <div style={row2}>
                  <div><label style={label}>เขียนที่</label><input style={inputStyle} value={place} onChange={e => setPlace(e.target.value)} placeholder="เช่น ชื่อบริษัท/สาขา" /></div>
                  <div><label style={label}>วันที่เขียน</label><input type="date" style={inputStyle} value={writeDate} onChange={e => setWriteDate(e.target.value)} /></div>
                </div>
                <div><label style={label}>เหตุผล</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={reason} onChange={e => setReason(e.target.value)} /></div>
                <div><label style={label}>วันที่มีผล (วันสุดท้ายที่ทำงาน)</label><input type="date" style={inputStyle} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={() => mut.mutate()} disabled={mut.isPending}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: mut.isPending ? 'default' : 'pointer', opacity: mut.isPending ? 0.7 : 1 }}>
                {mut.isPending ? 'กำลังบันทึก...' : 'บันทึกและพิมพ์'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
