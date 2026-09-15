// admin/src/pages/hr-documents/EmployeeDocsTab.tsx
// แท็บ "ออกเอกสาร" ในหน้ารายละเอียดพนักงาน — สร้างเอกสาร 3 แบบ + ดูประวัติ/พิมพ์ซ้ำ
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Receipt, LogOut, Printer, Plus } from 'lucide-react'
import { api } from '../../lib/axios'
import HrDocumentGenerateModal from './generate'

type DocType = 'PAYSLIP' | 'SALARY_CERT' | 'RESIGNATION_LETTER'
const TYPE_CFG: Record<DocType, { label: string; icon: React.ReactNode; color: string }> = {
  PAYSLIP:             { label: 'สลิปเงินเดือน',        icon: <Receipt size={16}/>, color: '#0891b2' },
  SALARY_CERT:         { label: 'หนังสือรับรองเงินเดือน', icon: <FileText size={16}/>, color: '#16a34a' },
  RESIGNATION_LETTER:  { label: 'ใบลาออก',              icon: <LogOut size={16}/>,  color: '#dc2626' },
}
function thDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }

interface HistoryRow { id: string; type: DocType; doc_number: string | null; period: string | null; created_at: string }

export default function EmployeeDocsTab({ employeeId }: { employeeId: string }) {
  const [genType, setGenType] = useState<DocType | null>(null)

  const { data: rows = [], isLoading, refetch } = useQuery<HistoryRow[]>({
    queryKey: ['hr-documents', employeeId],
    queryFn: () => api.get('/api/v1/admin/hr-documents', { params: { employee_id: employeeId } }).then(r => r.data.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {(Object.keys(TYPE_CFG) as DocType[]).map(t => (
          <button key={t} onClick={() => setGenType(t)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12,
            border: '1.5px dashed #e5e7eb', background: '#fff', cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, color-mix(in srgb, ${TYPE_CFG[t].color} 55%, white), ${TYPE_CFG[t].color})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{TYPE_CFG[t].icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={12}/> สร้าง{TYPE_CFG[t].label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>เติมข้อมูลอัตโนมัติจากระบบ</div>
            </div>
          </button>
        ))}
      </div>

      <div>
        <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>ประวัติเอกสารที่ออกแล้ว</p>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>กำลังโหลด...</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>ยังไม่มีเอกสารที่ออก</div>
          ) : rows.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{TYPE_CFG[r.type].label}{r.doc_number ? ` · ${r.doc_number}` : ''}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{r.period ? `${r.period} · ` : ''}ออกเมื่อ {thDate(r.created_at)}</div>
              </div>
              <a href={`/hr-documents/${r.id}/print`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 700, color: '#ea580c', textDecoration: 'none', flexShrink: 0 }}>
                <Printer size={13}/> พิมพ์ซ้ำ
              </a>
            </div>
          ))}
        </div>
      </div>

      {genType && (
        <HrDocumentGenerateModal employeeId={employeeId} type={genType} onClose={() => setGenType(null)} onCreated={refetch} />
      )}
    </div>
  )
}
