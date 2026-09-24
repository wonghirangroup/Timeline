// superadmin/src/pages/settings/index.tsx
// ตั้งค่าระดับแพลตฟอร์ม (feedback 2026-09-24): "ช่องทางชำระเงิน" (tenant จ่าย
// บิล TimeLine — invoice เดิมเป็น manual ไม่มี payment gateway อยู่แล้ว จึงเป็น
// แค่ข้อมูลบัญชี/พร้อมเพย์ให้ tenant เห็น) + "ช่องทางติดต่อ" (tenant ติดต่อขอ
// เปลี่ยน/อัปเกรดแพ็กเกจ) — ตั้งครั้งเดียวที่นี่ โชว์ให้ทุก tenant เห็นที่
// Settings → แพ็กเกจ ทุกฟิลด์ optional ว่างได้ ไม่ fill ค่าเดาเอง
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Phone } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'

interface ApiPlatformSettings {
  payment_bank_name: string | null; payment_account_name: string | null; payment_account_no: string | null
  payment_promptpay_id: string | null; payment_qr_url: string | null; payment_note: string | null
  support_phone: string | null; support_line_id: string | null; support_email: string | null
  updated_at: string | null
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
}
const labelSt: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 4, display: 'block' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

const EMPTY = {
  payment_bank_name: '', payment_account_name: '', payment_account_no: '',
  payment_promptpay_id: '', payment_qr_url: '', payment_note: '',
  support_phone: '', support_line_id: '', support_email: '',
}

export default function SAPlatformSettingsPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<ApiPlatformSettings>({
    queryKey: ['sa', 'platform-settings'],
    queryFn: () => api.get('/api/v1/super-admin/platform-settings').then(r => r.data.data),
  })
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (!data) return
    setForm({
      payment_bank_name: data.payment_bank_name ?? '', payment_account_name: data.payment_account_name ?? '',
      payment_account_no: data.payment_account_no ?? '', payment_promptpay_id: data.payment_promptpay_id ?? '',
      payment_qr_url: data.payment_qr_url ?? '', payment_note: data.payment_note ?? '',
      support_phone: data.support_phone ?? '', support_line_id: data.support_line_id ?? '', support_email: data.support_email ?? '',
    })
  }, [data])

  const mut = useMutation({
    mutationFn: () => api.patch('/api/v1/super-admin/platform-settings', {
      payment_bank_name: form.payment_bank_name || null,
      payment_account_name: form.payment_account_name || null,
      payment_account_no: form.payment_account_no || null,
      payment_promptpay_id: form.payment_promptpay_id || null,
      payment_qr_url: form.payment_qr_url || null,
      payment_note: form.payment_note || null,
      support_phone: form.support_phone || null,
      support_line_id: form.support_line_id || null,
      support_email: form.support_email || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa', 'platform-settings'] }); showToast('success', 'บันทึกสำเร็จ') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ — กรุณาลองใหม่'),
  })

  if (isLoading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-gray)' }}>กำลังโหลด...</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>ตั้งค่าแพลตฟอร์ม</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
          ช่องทางชำระเงินและติดต่อของ TimeLine — โชว์ให้แอดมินทุก tenant เห็นที่หน้า "การตั้งค่า → แพ็กเกจ" ของเขา
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        {/* ── ช่องทางชำระเงิน ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CreditCard size={17} color="var(--sa-accent)" />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>ช่องทางชำระเงิน</p>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 16px' }}>
            สำหรับ tenant โอนชำระบิลรายเดือน — ระบบยังเป็น invoice แบบ manual (ไม่มี payment gateway) ข้อมูลนี้แค่โชว์ให้ tenant เห็นว่าจะโอนไปที่ไหน
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelSt}>ธนาคาร</label>
              <input style={inputSt} value={form.payment_bank_name} onChange={e => setForm(f => ({ ...f, payment_bank_name: e.target.value }))} placeholder="เช่น ธนาคารกสิกรไทย" />
            </div>
            <div>
              <label style={labelSt}>ชื่อบัญชี</label>
              <input style={inputSt} value={form.payment_account_name} onChange={e => setForm(f => ({ ...f, payment_account_name: e.target.value }))} placeholder="ชื่อบัญชีธนาคาร" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelSt}>เลขบัญชี</label>
              <input style={inputSt} value={form.payment_account_no} onChange={e => setForm(f => ({ ...f, payment_account_no: e.target.value }))} placeholder="xxx-x-xxxxx-x" />
            </div>
            <div>
              <label style={labelSt}>เลขพร้อมเพย์</label>
              <input style={inputSt} value={form.payment_promptpay_id} onChange={e => setForm(f => ({ ...f, payment_promptpay_id: e.target.value }))} placeholder="เบอร์โทร/เลขนิติบุคคล" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>URL รูป QR โอนเงิน (ถ้ามี)</label>
            <input style={inputSt} value={form.payment_qr_url} onChange={e => setForm(f => ({ ...f, payment_qr_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label style={labelSt}>หมายเหตุเพิ่มเติม</label>
            <textarea style={{ ...inputSt, resize: 'vertical' }} rows={2} value={form.payment_note} onChange={e => setForm(f => ({ ...f, payment_note: e.target.value }))} placeholder="เช่น แจ้งสลิปโอนผ่าน LINE OA ของ TimeLine" />
          </div>
        </div>

        {/* ── ช่องทางติดต่อ ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Phone size={17} color="var(--sa-accent)" />
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>ช่องทางติดต่อ</p>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 16px' }}>
            สำหรับ tenant ติดต่อขอเปลี่ยน/อัปเกรดแพ็กเกจ หรือสอบถามการใช้งาน
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelSt}>เบอร์โทร</label>
              <input style={inputSt} value={form.support_phone} onChange={e => setForm(f => ({ ...f, support_phone: e.target.value }))} placeholder="08X-XXX-XXXX" />
            </div>
            <div>
              <label style={labelSt}>LINE ID</label>
              <input style={inputSt} value={form.support_line_id} onChange={e => setForm(f => ({ ...f, support_line_id: e.target.value }))} placeholder="@timeline" />
            </div>
            <div>
              <label style={labelSt}>อีเมล</label>
              <input style={inputSt} value={form.support_email} onChange={e => setForm(f => ({ ...f, support_email: e.target.value }))} placeholder="support@timeline.app" />
            </div>
          </div>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          style={{
            alignSelf: 'flex-start', padding: '10px 28px', borderRadius: 10, border: 'none',
            background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
            cursor: mut.isPending ? 'default' : 'pointer', opacity: mut.isPending ? 0.7 : 1,
          }}
        >
          {mut.isPending ? 'กำลังบันทึก...' : '💾 บันทึก'}
        </button>
      </div>
    </div>
  )
}
