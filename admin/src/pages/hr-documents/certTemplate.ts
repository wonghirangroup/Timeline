// admin/src/pages/hr-documents/certTemplate.ts
// Logic (ไม่มี JSX) สำหรับระบบ "ออกแบบเทมเพลตเอง" (ลาก-วาง) ของหนังสือรับรอง 2 แบบ
// (SALARY_CERT/WORK_CERT) — feedback 2026-10-01 "ออกแบบ Template และจัดเก็บไว้ได้
// และดูตัวอย่างได้" แต่ละ element เป็นกล่องข้อความที่ลาก-ย้าย-ปรับขนาดได้อิสระ โดยเนื้อหา
// ข้างในฝังตัวแปรแบบ {{employee.full_name}} ได้ (คล้าย mail-merge) — ทำให้เขียนประโยค
// ลื่นไหลแบบเดิมได้ (ไม่ต้องแยกกล่อง "ข้อความ" กับ "ตัวแปร" ออกจากกัน) และไม่ต้องเพิ่ม
// rich-text editor library ใหม่ ตำแหน่งหน่วยเป็น มม. บนหน้า A4 (210×297) เหมือน page
// style ใน templates.tsx เพื่อให้ตำแหน่งตรงกับตอนพิมพ์จริงเป๊ะ
import { thaiFullDate, money } from './templates'
import type { CompanySnap, SignerSnap } from './templates'

export type CertDocType = 'SALARY_CERT' | 'WORK_CERT'

// หมายเหตุ: full_name/position_name เป็น field แบนตรงนี้ (ไม่ซ้อนใต้ employee.*) ให้
// ตรงกับ shape เดิมที่ SALARY_CERT เก็บ snapshot ไว้อยู่แล้วก่อนมีระบบเทมเพลต (ดู
// generate.tsx เดิม) — เอกสารเก่าที่เคยสร้างไว้แล้วจะพิมพ์ซ้ำได้ค่าตรงเป๊ะเหมือนเดิม
// employee_code/branch_name/hired_at เป็นของใหม่ ถ้าไม่มี (เอกสารเก่า) resolve เป็นค่าว่าง
export interface CertData {
  company: CompanySnap
  signer: SignerSnap
  full_name: string
  position_name: string | null
  employee_code?: string | null
  branch_name?: string | null
  hired_at?: string | null
  doc_number: string | null   // มาจาก HrDocument.doc_number (column แยก) ไม่ใช่ใน data — ผูกเข้ามาตอน render
  issue_date: string | null
  start_date?: string | null       // SALARY_CERT เท่านั้น
  monthly_wage?: string | number | null // SALARY_CERT เท่านั้น
  purpose?: string | null          // WORK_CERT เท่านั้น
}

export type ElementKind = 'text' | 'image' | 'line'
export interface TemplateElement {
  id: string
  kind: ElementKind
  x: number; y: number; w: number; h: number   // มม. จากมุมบนซ้ายของหน้า A4
  fontSize?: number    // pt — text เท่านั้น
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  content?: string     // text เท่านั้น — รองรับ token {{path}} และ \n
}

// วันที่ที่ format เป็นวันที่ไทยอัตโนมัติ, ค่าเงินที่ format เป็นเลขไทยอัตโนมัติ
const DATE_KEYS = new Set(['hired_at', 'issue_date', 'start_date'])
const MONEY_KEYS = new Set(['monthly_wage'])

function getByPath(data: CertData, path: string): string {
  const parts = path.split('.')
  let v: any = data
  for (const p of parts) v = v?.[p]
  if (v === undefined || v === null) return ''
  if (DATE_KEYS.has(path)) return thaiFullDate(v) || ''
  if (MONEY_KEYS.has(path)) return money(v)
  return String(v)
}

// แทน {{path}} ทุกจุดในเนื้อหาด้วยค่าจริง — path ที่ไม่รู้จักจะกลายเป็นว่างเปล่า (ไม่ throw)
export function resolveTemplateText(content: string, data: CertData): string {
  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => getByPath(data, path))
}

export interface VariableOption { key: string; label: string }
const COMMON_VARIABLES: VariableOption[] = [
  { key: 'company.name', label: 'ชื่อบริษัท' },
  { key: 'company.address', label: 'ที่อยู่บริษัท' },
  { key: 'company.tax_id', label: 'เลขประจำตัวผู้เสียภาษี' },
  { key: 'full_name', label: 'ชื่อ-นามสกุลพนักงาน' },
  { key: 'employee_code', label: 'รหัสพนักงาน' },
  { key: 'position_name', label: 'ตำแหน่ง' },
  { key: 'branch_name', label: 'สาขา' },
  { key: 'hired_at', label: 'วันที่เริ่มงาน' },
  { key: 'doc_number', label: 'เลขที่เอกสาร' },
  { key: 'issue_date', label: 'วันที่ออกเอกสาร' },
  { key: 'signer.signer_name', label: 'ชื่อผู้ลงนาม' },
  { key: 'signer.signer_title', label: 'ตำแหน่งผู้ลงนาม' },
]
export const CERT_VARIABLES: Record<CertDocType, VariableOption[]> = {
  SALARY_CERT: [
    ...COMMON_VARIABLES,
    { key: 'start_date', label: 'เริ่มงานวันที่ (ที่ใช้ในเอกสารฉบับนี้)' },
    { key: 'monthly_wage', label: 'อัตราค่าจ้างเดือนละ' },
  ],
  WORK_CERT: [
    ...COMMON_VARIABLES,
    { key: 'purpose', label: 'วัตถุประสงค์ (ถ้ามี)' },
  ],
}

export const CERT_DOC_LABEL: Record<CertDocType, string> = {
  SALARY_CERT: 'หนังสือรับรองเงินเดือน',
  WORK_CERT: 'หนังสือรับรองการทำงาน',
}

export const SAMPLE_DATA: CertData = {
  company: { name: 'บริษัท ตัวอย่าง จำกัด', address: '123 ถนนตัวอย่าง แขวง/ตำบล เขต/อำเภอ จังหวัด 10000', tax_id: '0000000000000', logo_url: null },
  signer: { signer_name: 'นางสาวตัวอย่าง ใจดี', signer_title: 'กรรมการผู้จัดการ' },
  full_name: 'นายตัวอย่าง ทดสอบ', employee_code: '00-00-000', position_name: 'พนักงานตัวอย่าง', branch_name: 'สำนักงานใหญ่', hired_at: '2024-01-15',
  doc_number: 'HR-2569001',
  issue_date: new Date().toISOString().slice(0, 10),
  start_date: '2024-01-15',
  monthly_wage: '25000',
  purpose: 'เพื่อใช้ประกอบการขอวีซ่า',
}

let seq = 0
function eid() { seq += 1; return `el_${Date.now()}_${seq}` }

// ตำแหน่งอ้างอิงจาก page style เดิม (templates.tsx): padding 18mm บน/ล่าง, 20mm ซ้าย/ขวา
// บน A4 210×297 → เนื้อหาเขียนได้ในกรอบ x:20–190, กว้าง 170mm
function certBody(docType: CertDocType): TemplateElement[] {
  const bodyText = docType === 'SALARY_CERT'
    ? 'หนังสือรับรองฉบับนี้ออกให้ไว้เพื่อแสดงว่า {{full_name}} เป็นพนักงานตำแหน่ง {{position_name}} ของบริษัท {{company.name}} จำกัด โดยได้เข้าปฏิบัติงานตั้งแต่วันที่ {{start_date}} ถึงปัจจุบัน ได้รับอัตราค่าจ้างเดือนละ {{monthly_wage}} บาท โดยไม่รวมเงินพิเศษอื่นๆ จึงได้ออกหนังสือรับรองฉบับนี้ไว้เป็นหลักฐาน'
    : 'หนังสือรับรองฉบับนี้ออกให้ไว้เพื่อแสดงว่า {{full_name}} ตำแหน่ง {{position_name}} เป็นพนักงานของบริษัท {{company.name}} จำกัด ตั้งแต่วันที่ {{hired_at}} จนถึงปัจจุบัน ปฏิบัติหน้าที่ด้วยความซื่อสัตย์สุจริตและมีความรับผิดชอบในหน้าที่เป็นอย่างดี {{purpose}}\n\nจึงออกหนังสือรับรองฉบับนี้ไว้เป็นหลักฐาน'

  return [
    { id: eid(), kind: 'image', x: 20, y: 10, w: 32, h: 18 },
    { id: eid(), kind: 'text', x: 56, y: 10, w: 134, h: 18, fontSize: 12, align: 'left', content: '{{company.name}}\n{{company.address}}' },
    { id: eid(), kind: 'line', x: 20, y: 31, w: 170, h: 0 },
    { id: eid(), kind: 'text', x: 20, y: 36, w: 100, h: 7, fontSize: 11, align: 'left', content: 'เอกสารเลขที่ {{doc_number}}' },
    { id: eid(), kind: 'text', x: 20, y: 46, w: 170, h: 10, fontSize: 16, bold: true, align: 'center', content: CERT_DOC_LABEL[docType] },
    { id: eid(), kind: 'text', x: 20, y: 62, w: 170, h: 50, fontSize: 13, align: 'left', content: bodyText },
    { id: eid(), kind: 'text', x: 20, y: 118, w: 170, h: 8, fontSize: 13, align: 'left', content: 'ออกให้ ณ วันที่ {{issue_date}}' },
    { id: eid(), kind: 'text', x: 55, y: 140, w: 100, h: 55, fontSize: 13, align: 'center', content: 'ขอรับรองว่าข้อความข้างต้นเป็นความจริงทุกประการ\n\n\n..............................................\n({{signer.signer_name}})\n{{signer.signer_title}}' },
  ]
}

export const DEFAULT_ELEMENTS: Record<CertDocType, TemplateElement[]> = {
  SALARY_CERT: certBody('SALARY_CERT'),
  WORK_CERT: certBody('WORK_CERT'),
}
