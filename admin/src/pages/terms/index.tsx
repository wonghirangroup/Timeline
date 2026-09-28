// admin/src/pages/terms/index.tsx
// เงื่อนไขการใช้งาน — คู่กับ pdpa/index.tsx (feedback 2026-09-28) เขียนจากลักษณะ
// ระบบจริง (multi-tenant HR SaaS, พัฒนาโดย Smart Jigsaw, ให้บริการผ่านแบรนด์
// YooNai HR) ไม่ใช่ template ทั่วไป — ไม่ใช่คำแนะนำทางกฎหมาย ควรให้ฝ่ายกฎหมาย
// ตรวจทานก่อนเผยแพร่จริง
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/axios'

interface TenantSettings { name: string }

const wrap: React.CSSProperties = { minHeight: '100vh', background: '#E6ECF4', padding: '32px 20px 60px' }
const box: React.CSSProperties = { maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }
const h2: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '28px 0 10px' }
const p: React.CSSProperties = { fontSize: '0.9rem', lineHeight: 1.75, color: '#374151', margin: '0 0 10px' }
const li: React.CSSProperties = { fontSize: '0.9rem', lineHeight: 1.75, color: '#374151', marginBottom: 4 }

export default function TermsPage() {
  const { data } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data),
    retry: false,
  })
  const companyName = data?.name ?? 'บริษัทผู้ใช้งานระบบ'

  return (
    <div style={wrap}>
      <div style={box}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#244B83', textDecoration: 'none', fontWeight: 700, marginBottom: 20 }}>
          <ArrowLeft size={15} /> กลับหน้าหลัก
        </Link>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>เงื่อนไขการใช้งาน</h1>
        <p style={{ ...p, color: '#6b7280', marginBottom: 24 }}>ปรับปรุงล่าสุด: 28 กันยายน 2569 · ระบบ YooNai HR</p>

        <h2 style={h2}>1. การยอมรับเงื่อนไข</h2>
        <p style={p}>
          การเข้าใช้งานระบบ YooNai HR ("ระบบ") ไม่ว่าจะในฐานะแอดมิน ผู้จัดการ หรือพนักงานของ {companyName} ถือว่าผู้ใช้งานยอมรับเงื่อนไขการใช้งานนี้
          หากไม่ยอมรับเงื่อนไข กรุณาหยุดใช้งานระบบและติดต่อฝ่ายบุคคลของ {companyName}
        </p>

        <h2 style={h2}>2. คำนิยาม</h2>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}><strong>"ระบบ"</strong> หมายถึงแอปพลิเคชัน YooNai HR ทั้งฝั่งเว็บแอดมินและแอปพนักงานผ่าน LINE (LIFF)</li>
          <li style={li}><strong>"ผู้พัฒนา"</strong> หมายถึงผู้พัฒนาและดูแลระบบ (Smart Jigsaw)</li>
          <li style={li}><strong>"บริษัท"</strong> หมายถึง {companyName} ผู้ใช้บริการระบบในฐานะนายจ้าง</li>
          <li style={li}><strong>"ผู้ใช้งาน"</strong> หมายถึงบุคคลที่ได้รับสิทธิ์เข้าใช้งานระบบ ทั้งแอดมินและพนักงานของบริษัท</li>
        </ul>

        <h2 style={h2}>3. ขอบเขตการใช้งาน</h2>
        <p style={p}>
          ระบบนี้จัดทำขึ้นเพื่อใช้บริหารจัดการงานบุคคลภายในองค์กรของ {companyName} เท่านั้น เช่น การบันทึกเวลาเข้า-ออกงาน การลา การทำงานล่วงเวลา
          และการจัดทำเอกสารที่เกี่ยวข้องกับการจ้างงาน ห้ามนำระบบไปใช้เพื่อวัตถุประสงค์อื่นนอกเหนือจากที่ระบุไว้
        </p>

        <h2 style={h2}>4. บัญชีผู้ใช้งานและความปลอดภัย</h2>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>ผู้ใช้งานมีหน้าที่รักษารหัสผ่านของตนเองเป็นความลับ และรับผิดชอบต่อกิจกรรมทั้งหมดที่เกิดขึ้นภายใต้บัญชีของตน</li>
          <li style={li}>ห้ามใช้บัญชีร่วมกันระหว่างผู้ใช้งานหลายคน หรือให้ผู้อื่นเข้าใช้งานแทนตนเอง</li>
          <li style={li}>หากพบว่ามีการใช้งานบัญชีโดยไม่ได้รับอนุญาต ต้องแจ้งฝ่ายบุคคล/แอดมินของบริษัททันที</li>
        </ul>

        <h2 style={h2}>5. หน้าที่ของผู้ใช้งาน</h2>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>ให้ข้อมูลที่ถูกต้องและเป็นความจริงเมื่อกรอกข้อมูลในระบบ (เช่น ข้อมูลส่วนตัว เหตุผลการลา)</li>
          <li style={li}>ไม่ใช้ระบบในทางที่ผิดกฎหมาย ละเมิดสิทธิผู้อื่น หรือรบกวนการทำงานของระบบ (เช่น พยายามเข้าถึงข้อมูลของผู้อื่นโดยไม่ได้รับอนุญาต)</li>
          <li style={li}>ไม่คัดลอก ดัดแปลง หรือทำวิศวกรรมย้อนกลับ (reverse engineer) ส่วนหนึ่งส่วนใดของระบบ</li>
        </ul>

        <h2 style={h2}>6. ทรัพย์สินทางปัญญา</h2>
        <p style={p}>
          ซอฟต์แวร์ โค้ด และองค์ประกอบการออกแบบของระบบเป็นทรัพย์สินของผู้พัฒนา ข้อมูลที่บริษัทและพนักงานบันทึกเข้าระบบ (เช่น ข้อมูลพนักงาน
          ประวัติการเข้างาน) ยังคงเป็นกรรมสิทธิ์ของ {companyName}
        </p>

        <h2 style={h2}>7. ข้อจำกัดความรับผิด</h2>
        <p style={p}>
          ระบบให้บริการตามสภาพที่เป็นอยู่ ("as-is") ผู้พัฒนาพยายามอย่างเต็มที่เพื่อให้ระบบทำงานได้อย่างถูกต้องและต่อเนื่อง แต่ไม่รับประกันว่าระบบ
          จะปราศจากข้อผิดพลาดหรือหยุดชะงักตลอดเวลา ผู้พัฒนาไม่รับผิดชอบต่อความเสียหายทางอ้อมที่เกิดจากการหยุดชะงักของบริการ ระบบเครือข่าย
          หรือบริการของบุคคลที่สาม (เช่น LINE) ที่อยู่นอกเหนือการควบคุม
        </p>

        <h2 style={h2}>8. การระงับหรือยกเลิกการใช้งาน</h2>
        <p style={p}>
          {companyName} หรือผู้พัฒนาขอสงวนสิทธิ์ในการระงับหรือยกเลิกสิทธิ์การเข้าใช้งานของผู้ใช้งานคนใดคนหนึ่ง หากพบว่ามีการใช้งานที่ผิดเงื่อนไขนี้
          หรือเมื่อผู้ใช้งานพ้นสภาพการเป็นพนักงานของ {companyName}
        </p>

        <h2 style={h2}>9. การเปลี่ยนแปลงเงื่อนไข</h2>
        <p style={p}>เงื่อนไขการใช้งานนี้อาจได้รับการปรับปรุงเป็นครั้งคราว การใช้งานระบบต่อไปหลังมีการปรับปรุงถือว่าผู้ใช้งานยอมรับเงื่อนไขฉบับใหม่</p>

        <h2 style={h2}>10. กฎหมายที่ใช้บังคับ</h2>
        <p style={p}>เงื่อนไขการใช้งานนี้อยู่ภายใต้บังคับและตีความตามกฎหมายไทย</p>
      </div>
    </div>
  )
}
