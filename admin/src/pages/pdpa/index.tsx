// admin/src/pages/pdpa/index.tsx
// นโยบายความเป็นส่วนตัว (PDPA) — เขียนจากการสำรวจ schema.prisma จริงว่าระบบเก็บ
// ข้อมูลอะไรบ้าง (feedback 2026-09-28 "ช่วยเขียนได้ไหม โดยดูจากระบบว่ามีส่วนไหน
// เข้าข่าย pdpa") ไม่ใช่ template ทั่วไปที่ copy มา — รายการข้อมูล/วัตถุประสงค์/
// ผู้ประมวลผลบุคคลที่สามทั้งหมดอ้างอิงจากฟิลด์ที่มีอยู่จริงใน Employee/
// AttendanceRecord/OffsiteCheckin ฯลฯ และ third-party ที่ใช้จริง (LINE, Cloudinary)
//
// จุดที่ยังเป็น TODO (ต้องให้ผู้ใช้ระบบกรอกเอง ไม่ใช่ข้อมูลที่เดาได้จากโค้ด):
// ระยะเวลาเก็บรักษาข้อมูล, ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูล/DPO
// — ไม่ใช่คำแนะนำทางกฎหมาย ควรให้ฝ่ายกฎหมาย/DPO ของบริษัทตรวจทานก่อนเผยแพร่จริง
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
const todo: React.CSSProperties = { background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#92400E', margin: '10px 0' }

export default function PdpaPage() {
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

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>นโยบายความเป็นส่วนตัว (PDPA)</h1>
        <p style={{ ...p, color: '#6b7280', marginBottom: 24 }}>ปรับปรุงล่าสุด: 28 กันยายน 2569 · ใช้กับระบบ YooNai HR ที่ให้บริการแก่ {companyName}</p>

        <p style={p}>
          นโยบายนี้อธิบายว่าระบบ YooNai HR ("ระบบ") เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของพนักงานอย่างไร ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล
          พ.ศ. 2562 (PDPA) — <strong>{companyName}</strong> ในฐานะนายจ้างเป็น "ผู้ควบคุมข้อมูลส่วนบุคคล" ของพนักงานของตนเอง ส่วนระบบ YooNai HR
          ทำหน้าที่เป็น "ผู้ประมวลผลข้อมูลส่วนบุคคล" ที่ประมวลผลข้อมูลตามคำสั่งของ {companyName} เท่านั้น
        </p>

        <h2 style={h2}>1. ข้อมูลส่วนบุคคลที่ระบบเก็บรวบรวม</h2>
        <p style={p}>ระบบเก็บข้อมูลของพนักงานตามที่แอดมิน/ฝ่ายบุคคลของ {companyName} บันทึกเข้าระบบ หรือที่พนักงานกรอกเอง ได้แก่</p>
        <p style={{ ...p, fontWeight: 700, marginBottom: 2 }}>ข้อมูลระบุตัวตน</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>คำนำหน้า ชื่อ-นามสกุล ชื่อเล่น</li>
          <li style={li}>เลขบัตรประชาชน วันเดือนปีเกิด กรุ๊ปเลือด</li>
          <li style={li}>รูปโปรไฟล์ (จัดเก็บผ่านผู้ให้บริการภายนอก Cloudinary)</li>
        </ul>
        <p style={{ ...p, fontWeight: 700, marginBottom: 2 }}>ข้อมูลติดต่อ</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>เบอร์โทรศัพท์หลัก/สำรอง อีเมล</li>
          <li style={li}>ที่อยู่ตามบัตรประชาชน และที่อยู่ปัจจุบัน</li>
          <li style={li}>ชื่อ ความสัมพันธ์ และเบอร์โทรของผู้ติดต่อฉุกเฉิน</li>
        </ul>
        <p style={{ ...p, fontWeight: 700, marginBottom: 2 }}>ข้อมูลการจ้างงาน</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>รหัสพนักงาน ตำแหน่ง แผนก ฝ่าย สาขา ประเภทการจ้าง วันเริ่มงาน</li>
          <li style={li}>อัตราเงินเดือน (ที่แอดมินกรอกไว้เพื่ออ้างอิงภายใน)</li>
          <li style={li}>ผลประเมินทดลองงาน ประวัติการตักเตือนทางวินัย</li>
          <li style={li}>เอกสารประจำตัว เช่น สำเนาบัตร ใบอนุญาตทำงาน ใบขับขี่ (พร้อมวันหมดอายุ)</li>
          <li style={li}>วุฒิการศึกษาและทักษะ (ถ้ามีการบันทึก)</li>
        </ul>
        <p style={{ ...p, fontWeight: 700, marginBottom: 2 }}>ข้อมูลการเข้างานและตำแหน่งที่ตั้ง</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>เวลาเช็คอิน-เช็คเอาต์ และวิธีเช็คอิน (แอป LINE / สแกน QR / แอดมินบันทึกให้)</li>
          <li style={li}>พิกัด GPS เฉพาะตอนเช็คอินนอกสถานที่ หรือกรณีเปิดใช้งานฟีเจอร์นี้ให้พนักงานรายบุคคล</li>
          <li style={li}>ภาพถ่ายกรณีใช้ฟีเจอร์ยืนยันตัวตนด้วยรูปถ่าย (ถ้าเปิดใช้งาน)</li>
        </ul>
        <p style={{ ...p, fontWeight: 700, marginBottom: 2 }}>ข้อมูลการลา/OT/วันหยุด และบัญชี LINE</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>ประวัติคำขอลา ทำงานล่วงเวลา (OT) และการสลับวันหยุด</li>
          <li style={li}>LINE User ID ที่ใช้ผูกบัญชีเพื่อเข้าสู่ระบบผ่าน LINE และรับการแจ้งเตือน</li>
        </ul>

        <h2 style={h2}>2. วัตถุประสงค์ในการเก็บรวบรวมและใช้ข้อมูล</h2>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>บริหารจัดการงานบุคคล เช่น บันทึกเวลาเข้า-ออกงาน การลา การทำงานล่วงเวลา</li>
          <li style={li}>จัดทำเอกสารที่เกี่ยวข้องกับการจ้างงาน เช่น หนังสือรับรองเงินเดือน สลิปเงินเดือน</li>
          <li style={li}>ยืนยันตัวตนก่อนเข้าใช้งานระบบ และแจ้งเตือนผ่าน LINE (เช่น ผลอนุมัติคำขอลา เอกสารพร้อมให้ดาวน์โหลด)</li>
          <li style={li}>ตรวจสอบสิทธิ์การเข้าสถานที่ทำงาน/พื้นที่ปฏิบัติงานตามที่นายจ้างกำหนด</li>
          <li style={li}>จัดทำรายงานสรุปผลการดำเนินงานภายในองค์กรของ {companyName}</li>
        </ul>

        <h2 style={h2}>3. การเปิดเผยข้อมูลให้บุคคลที่สาม</h2>
        <p style={p}>ระบบส่งข้อมูลบางส่วนให้ผู้ให้บริการภายนอกเท่าที่จำเป็นต่อการทำงานของระบบเท่านั้น ได้แก่</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}><strong>LINE Corporation</strong> — สำหรับการเข้าสู่ระบบผ่าน LINE (LIFF) และส่งข้อความแจ้งเตือน</li>
          <li style={li}><strong>Cloudinary</strong> — สำหรับจัดเก็บไฟล์รูปภาพ (รูปโปรไฟล์/เอกสารแนบ)</li>
        </ul>
        <div style={todo}>
          <strong>TODO (ต้องระบุเอง):</strong> ชื่อผู้ให้บริการเซิร์ฟเวอร์/โฮสติ้งที่เก็บฐานข้อมูล และผู้ประมวลผลอื่นที่ {companyName} อาจใช้เพิ่มเติม
          (เช่น ผู้ให้บริการบัญชีเงินเดือนภายนอก ถ้ามี)
        </div>
        <p style={p}>ระบบไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลแก่บุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาด</p>

        <h2 style={h2}>4. ระยะเวลาการเก็บรักษาข้อมูล</h2>
        <div style={todo}>
          <strong>TODO (ต้องระบุเอง):</strong> {companyName} ต้องกำหนดนโยบายระยะเวลาเก็บรักษาข้อมูลพนักงาน (ระหว่างเป็นพนักงาน และหลังพ้นสภาพพนักงานกี่ปี)
          ตามที่กฎหมายแรงงาน/บัญชี/ภาษีกำหนด แล้วนำมาแทนที่ข้อความนี้
        </div>

        <h2 style={h2}>5. มาตรการรักษาความปลอดภัย</h2>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>เข้ารหัสการรับส่งข้อมูลระหว่างอุปกรณ์ผู้ใช้กับเซิร์ฟเวอร์ด้วย HTTPS/TLS ทุกช่องทาง</li>
          <li style={li}>จำกัดสิทธิ์การเข้าถึงข้อมูลตามบทบาทของผู้ใช้งาน (แอดมิน/ผู้จัดการ/หัวหน้าแผนก เห็นข้อมูลตามขอบเขตที่ได้รับมอบหมายเท่านั้น)</li>
          <li style={li}>จัดเก็บรหัสผ่านในรูปแบบ hash ไม่สามารถย้อนกลับเป็นข้อความต้นฉบับได้</li>
        </ul>

        <h2 style={h2}>6. สิทธิของเจ้าของข้อมูลส่วนบุคคล</h2>
        <p style={p}>ในฐานะเจ้าของข้อมูล พนักงานมีสิทธิตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ดังนี้</p>
        <ul style={{ margin: '0 0 10px', paddingLeft: 20 }}>
          <li style={li}>สิทธิขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของตนเอง</li>
          <li style={li}>สิทธิขอแก้ไขข้อมูลให้ถูกต้อง เป็นปัจจุบัน</li>
          <li style={li}>สิทธิขอให้ลบหรือทำลายข้อมูล เมื่อหมดความจำเป็นในการเก็บรักษา</li>
          <li style={li}>สิทธิขอให้ระงับการใช้ข้อมูลชั่วคราว</li>
          <li style={li}>สิทธิคัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล</li>
          <li style={li}>สิทธิขอถอนความยินยอม ในกรณีที่การประมวลผลใช้ฐานความยินยอม</li>
        </ul>
        <p style={p}>การใช้สิทธิบางส่วนอาจถูกจำกัดตามกฎหมายแรงงาน กฎหมายภาษี หรือกฎหมายอื่นที่เกี่ยวข้องกับสถานะการเป็นพนักงาน</p>

        <h2 style={h2}>7. ช่องทางติดต่อเพื่อใช้สิทธิ/สอบถาม</h2>
        <div style={todo}>
          <strong>TODO (ต้องระบุเอง):</strong> ชื่อและช่องทางติดต่อของเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) หรือฝ่ายบุคคลของ {companyName}
          ที่พนักงานติดต่อได้เมื่อต้องการใช้สิทธิตามข้อ 6 หรือสอบถามเกี่ยวกับข้อมูลของตนเอง
        </div>

        <h2 style={h2}>8. การปรับปรุงนโยบาย</h2>
        <p style={p}>นโยบายนี้อาจได้รับการปรับปรุงเป็นครั้งคราวเพื่อให้สอดคล้องกับการเปลี่ยนแปลงของระบบหรือกฎหมาย — วันที่ปรับปรุงล่าสุดแสดงไว้ด้านบนของหน้านี้</p>
      </div>
    </div>
  )
}
