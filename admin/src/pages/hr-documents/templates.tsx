// admin/src/pages/hr-documents/templates.tsx
// เทมเพลตเอกสาร HR — render จาก snapshot data ล้วนๆ (ไม่ fetch ข้อมูลสดเพิ่ม) ตาม reference
// ที่ user ส่งมา (feedback 2026-09-15): ใบลาออก / สลิปเงินเดือน — layout hardcode คงเดิม
// ส่วนหนังสือรับรองเงินเดือน/การทำงาน (SALARY_CERT/WORK_CERT) ย้ายไปใช้ CertView ด้านล่าง
// ซึ่ง render จากเทมเพลตที่แอดมินออกแบบเอง (ลาก-วาง) แทน — feedback 2026-10-01
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/axios'
import CertCanvas from './CertCanvas'
import { DEFAULT_ELEMENTS, type CertData, type CertDocType, type TemplateElement } from './certTemplate'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

export function thaiFullDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}
export function thaiDateParts(iso?: string | null) {
  if (!iso) return { day: '', month: '', year: '' }
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { day: '', month: '', year: '' }
  return { day: String(d.getDate()), month: MONTHS_TH[d.getMonth()], year: String(d.getFullYear() + 543) }
}
export function money(v: number | string | undefined | null) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (n === undefined || n === null || isNaN(n) || n === 0) return '-'
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── shared types ─────────────────────────────────────────────────────────────
export interface CompanySnap { name: string; address: string | null; tax_id: string | null; logo_url: string | null }
export interface SignerSnap { signer_name: string | null; signer_title: string | null }

export interface PayslipData {
  company: CompanySnap; signer: SignerSnap
  full_name: string; employee_code: string; position_name: string | null
  pay_date: string | null; pay_period: string | null
  income: { salary: string; commission: string; attendance_bonus: string; transport: string; position_allowance: string; experience_allowance: string; day_off_buyback: string; kpi: string; birthday_bonus: string }
  deduction: { social_security: string; other: string }
}
export interface ResignationData {
  company: CompanySnap
  full_name: string; position_name: string | null
  place: string; write_date: string | null; reason: string; effective_date: string | null
}

const page: React.CSSProperties = {
  width: '210mm', minHeight: '297mm', margin: '0 auto', background: '#fff',
  padding: '18mm 20mm', boxSizing: 'border-box', fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
  color: '#111827', fontSize: '14px', lineHeight: 1.9,
}
const dotted = { borderBottom: '1px dotted #9ca3af', display: 'inline-block', minWidth: 24 }
function Blank({ w = 160 }: { w?: number }) { return <span style={{ ...dotted, width: w }}>&nbsp;</span> }

// ── 1. ใบลาออก ────────────────────────────────────────────────────────────────
export function ResignationLetterView({ data }: { data: ResignationData }) {
  const wd = thaiDateParts(data.write_date)
  const ed = thaiDateParts(data.effective_date)
  return (
    <div style={page}>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '19px', marginBottom: 26 }}>ใบลาออก</div>
      <div style={{ textAlign: 'right', marginBottom: 18 }}>เขียนที่ {data.place || <Blank w={200} />}</div>
      <div style={{ textAlign: 'right', marginBottom: 18 }}>
        วันที่ {wd.day || <Blank w={30} />} เดือน {wd.month || <Blank w={90} />} พ.ศ. {wd.year || <Blank w={50} />}
      </div>
      <div style={{ marginBottom: 14 }}>เรื่อง &nbsp;ขอลาออก</div>
      <div style={{ marginBottom: 14 }}>เรียน &nbsp;กรรมการผู้จัดการ บริษัท {data.company.name} จำกัด</div>
      <div style={{ marginBottom: 6 }}>
        ข้าพเจ้า {data.full_name} &nbsp;ตำแหน่ง {data.position_name || <Blank w={140} />}
      </div>
      <div style={{ marginBottom: 14 }}>
        ของบริษัท {data.company.name} จำกัด มีความประสงค์จะขอลาออกจากการเป็นพนักงานของบริษัทฯ เนื่องจาก
      </div>
      <div style={{ marginBottom: 24 }}>{data.reason || <><Blank w={620} /><br /><Blank w={620} /></>}</div>
      <div style={{ marginBottom: 30 }}>
        จึงขอแจ้งให้ทราบล่วงหน้า และขอให้มีผลตั้งแต่วันที่ {ed.day || <Blank w={30} />} เดือน {ed.month || <Blank w={90} />} พ.ศ. {ed.year || <Blank w={50} />} เป็นต้นไป
      </div>
      <div style={{ marginBottom: 40 }}>จึงเรียนมาเพื่อโปรดทราบ</div>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div>ขอแสดงความนับถือ</div>
        <div style={{ marginTop: 46 }}>ลงชื่อ..............................................</div>
        <div style={{ marginTop: 4 }}>({data.full_name})</div>
        <div style={{ marginTop: 2, fontSize: '12.5px', color: '#475569' }}>พนักงาน</div>
      </div>
    </div>
  )
}

// ── 2. หนังสือรับรองเงินเดือน / หนังสือรับรองการทำงาน ──────────────────────────
// render จากเทมเพลตที่แอดมินออกแบบเอง (ลาก-วาง) — fallback ไปใช้ DEFAULT_ELEMENTS
// ถ้ายังไม่เคยปรับแต่ง (ยังไม่มีแถวในตาราง hr_document_templates)
export function CertView({ docType, data, docNumber }: { docType: CertDocType; data: Omit<CertData, 'doc_number'>; docNumber: string | null }) {
  const { data: tpl, isLoading } = useQuery<{ elements: TemplateElement[] } | null>({
    queryKey: ['hr-document-template', docType],
    queryFn: () => api.get(`/api/v1/admin/hr-document-templates/${docType}`).then(r => r.data.data),
  })
  if (isLoading) return <div style={page} />
  const elements = tpl?.elements ?? DEFAULT_ELEMENTS[docType]
  return <CertCanvas elements={elements} data={{ ...data, doc_number: docNumber }} editable={false} />
}

// ── 3. สลิปเงินเดือน ──────────────────────────────────────────────────────────
const INCOME_LABELS: [keyof PayslipData['income'], string][] = [
  ['salary', 'เงินเดือน'], ['commission', 'ค่าคอมมิชชั่น'], ['attendance_bonus', 'ค่าเบี้ยขยัน'],
  ['transport', 'ค่าเดินทาง+สื่อสาร'], ['position_allowance', 'เงินประจำตำแหน่ง'],
  ['experience_allowance', 'ค่าประสบการณ์'], ['day_off_buyback', 'ซื้อคืนวันหยุด'], ['kpi', 'KPI'], ['birthday_bonus', 'เงินวันเกิด'],
]
const cell: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' }
export function PayslipView({ data }: { data: PayslipData }) {
  const totalIncome = INCOME_LABELS.reduce((s, [k]) => s + (parseFloat(data.income[k]) || 0), 0)
  const totalDeduct = (parseFloat(data.deduction.social_security) || 0) + (parseFloat(data.deduction.other) || 0)
  return (
    <div style={{ ...page, fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #244B83', paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {data.company.logo_url && <img src={data.company.logo_url} alt="" style={{ height: 40, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontWeight: 800 }}>{data.company.name}</div>
            {data.company.address && <div style={{ fontSize: '11px', color: '#475569' }}>{data.company.address}</div>}
          </div>
        </div>
        <div style={{ fontWeight: 800, fontSize: '15px' }}>สลิปเงินเดือน</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
        <div>ชื่อ-สกุล: <b>{data.full_name}</b></div>
        <div>รหัสพนักงาน: <b>{data.employee_code}</b></div>
        <div>ตำแหน่ง: <b>{data.position_name || '-'}</b></div>
        <div>วันที่จ่ายเงิน: <b>{data.pay_date ? thaiFullDate(data.pay_date) : '-'}</b></div>
        <div style={{ gridColumn: '1 / -1' }}>เงินเดือนประจำเดือน: <b>{data.pay_period || '-'}</b></div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ background: '#F4F6F9' }}>
            <th style={{ ...cell, textAlign: 'left' }}>รายการเงินได้ (บาท)</th>
            <th style={{ ...cell, textAlign: 'left' }}>รายการเงินหัก (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(INCOME_LABELS.length, 2) }).map((_, i) => {
            const inc = INCOME_LABELS[i]
            return (
              <tr key={i}>
                <td style={cell}>{inc ? <>{inc[1]}<span style={{ float: 'right' }}>{money(data.income[inc[0]])}</span></> : ''}</td>
                <td style={cell}>
                  {i === 0 && <>ประกันสังคม<span style={{ float: 'right' }}>{money(data.deduction.social_security)}</span></>}
                  {i === 1 && <>อื่นๆ<span style={{ float: 'right' }}>{money(data.deduction.other)}</span></>}
                </td>
              </tr>
            )
          })}
          <tr style={{ fontWeight: 800, background: '#f9fafb' }}>
            <td style={cell}>รวมรายการได้<span style={{ float: 'right' }}>{money(totalIncome)}</span></td>
            <td style={cell}>รวมรายการหัก<span style={{ float: 'right' }}>{money(totalDeduct)}</span></td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', marginTop: 10 }}>
        รวมเงินเดือนสุทธิ {money(totalIncome - totalDeduct)} บาท
      </div>
      <div style={{ marginTop: 60, textAlign: 'center' }}>
        <div>..............................................</div>
        <div style={{ marginTop: 4 }}>กรรมการผู้จัดการ {data.signer.signer_name ? `(${data.signer.signer_name})` : ''}</div>
      </div>
    </div>
  )
}
