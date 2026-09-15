// admin/src/pages/hr-documents/print.tsx
// หน้าพิมพ์เอกสาร HR — คนละหน้าจอเลย ไม่มี Sidebar/Topbar (route แยกนอก Layout ใน App.tsx)
// เรนเดอร์จาก snapshot ที่บันทึกไว้ล้วนๆ พิมพ์ซ้ำกี่ครั้งค่าก็ตรงกับตอนออกจริงเสมอ
import { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import { PayslipView, SalaryCertView, ResignationLetterView } from './templates'

interface HrDocRow { id: string; type: 'PAYSLIP' | 'SALARY_CERT' | 'RESIGNATION_LETTER'; doc_number: string | null; data: any }

export default function HrDocumentPrintPage() {
  const { id } = useParams<{ id: string }>()
  const token = useAuthStore(s => s.token)
  const { data: row, isLoading, isError } = useQuery<HrDocRow>({
    queryKey: ['hr-document', id],
    queryFn: () => api.get(`/api/v1/admin/hr-documents/${id}`).then(r => r.data.data),
    enabled: !!token && !!id,
  })

  useEffect(() => { document.title = row?.doc_number ? `เอกสาร ${row.doc_number}` : 'เอกสาร HR' }, [row])

  if (!token) return <Navigate to="/login" replace />

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#111827', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>ตัวอย่างเอกสาร — ใช้ปุ่มพิมพ์เพื่อพิมพ์หรือบันทึกเป็น PDF</span>
        <button onClick={() => window.print()} disabled={!row} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: row ? 'pointer' : 'not-allowed', opacity: row ? 1 : 0.6 }}>
          <Printer size={15} /> พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      <div style={{ padding: '24px 0 60px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: '#6b7280', padding: 60 }}><Loader2 className="animate-spin" size={22} /></div>}
        {isError && <div style={{ textAlign: 'center', color: '#dc2626', padding: 60 }}>ไม่พบเอกสาร หรือไม่มีสิทธิ์เข้าถึง</div>}
        {row && row.type === 'PAYSLIP' && <PayslipView data={row.data} />}
        {row && row.type === 'SALARY_CERT' && <SalaryCertView data={row.data} docNumber={row.doc_number} />}
        {row && row.type === 'RESIGNATION_LETTER' && <ResignationLetterView data={row.data} />}
      </div>
    </div>
  )
}
