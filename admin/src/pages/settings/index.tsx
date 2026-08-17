// admin/src/pages/settings/index.tsx
//
// หมายเหตุ (17 ส.ค. 2569): หน้านี้เคยมีแท็บ "กฎค่าปรับ" ที่เป็น local-state mock
// ล้วนๆ (useState + toast "บันทึกสำเร็จ" ปลอมๆ ไม่มี API ใดๆ) และ calcFine()
// ก็ไม่ถูกเรียกใช้จากที่ไหนในระบบเลย — ของจริงที่ backend ใช้คำนวณค่าปรับสาย
// จริงๆ คือ shift.late_threshold / late_fine_1 / late_fine_2 ต่อกะ
// (ตั้งค่าที่ กะ & เวลา → จัดการกะ) ถูกตัดสินใจแล้วว่าจะ "คงไว้ต่อกะเหมือนเดิม"
// ไม่รวมเป็น setting ระดับ tenant — เลยเอาแท็บ mock นั้นออกไปกันสับสน
import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>การตั้งค่า</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
          การตั้งค่าที่เกี่ยวกับเวลาเข้างาน (ค่าปรับสาย, รัศมี GPS) กำหนดแยกทีละกะเพื่อรองรับแต่ละสาขา/กะที่กฎไม่เหมือนกัน
        </p>
      </div>

      <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
            <Clock size={18} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>เกณฑ์การสาย & ค่าปรับ</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '3px 0 0' }}>
              ตั้งค่าแยกทีละกะ — ไปที่ <strong>กะ & เวลา → จัดการกะ</strong> เลือกกะที่ต้องการ แล้วดูส่วน "เกณฑ์การสาย & ค่าปรับ"
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
            <MapPin size={18} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>รัศมีเช็คอิน GPS</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '3px 0 0' }}>
              ตั้งค่าแยกทีละกะเช่นกัน — ไปที่ <strong>กะ & เวลา → จัดการกะ</strong>
            </p>
          </div>
        </div>
        <Link to="/shift" style={{
          alignSelf: 'flex-start', marginTop: 4, padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
          background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600,
        }}>
          ไปที่จัดการกะ →
        </Link>
      </div>
    </div>
  )
}
