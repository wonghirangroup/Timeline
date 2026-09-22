# Master Data

เอกสารนี้อธิบายข้อมูลหลัก/ข้อมูลอ้างอิง (master/reference data) ที่แอดมินของแต่ละบริษัท (tenant) ตั้งค่าเองได้ในระบบ ต่างจากข้อมูลรายวัน (transactional data เช่น การเช็คอิน คำขอลา) ที่เกิดขึ้นจากการใช้งานประจำ

## 1. ผังองค์กร (Organization Structure)

ลำดับชั้น 4 ระดับ ที่ใช้เป็นฐานของนโยบาย (policy cascade):

```
กลุ่ม (Group)  →  ฝ่าย (Division)  →  แผนก (Department)  →  ตำแหน่ง (Position)
```

- **กลุ่ม (Group)**: ชั้นบนสุด ผูกกับสาขาได้หลายสาขา ตั้งนโยบายเริ่มต้น (สิทธิ์จองวันหยุด/ลา, กฎวันเสาร์-อาทิตย์, โควต้าจองต่อเดือน)
- **ฝ่าย (Division)** → **แผนก (Department)** → **ตำแหน่ง (Position)**: โครงสร้างย่อยภายในกลุ่ม ใช้จัดกลุ่มพนักงานตามสายงาน และเป็นจุดตั้งค่า**สิทธิ์พักร้อนตามอายุงาน** (`vacation_base_days`, `vacation_increment_days`, `vacation_increment_years`) ต่อตำแหน่ง

นโยบาย (booking_enabled, leave_enabled, saturday_rule, sunday_rule, booking_quota) เป็นค่า **nullable แบบ inherit** — ชั้นล่างที่ไม่ได้ตั้งค่าเอง (null) จะรับค่าจากชั้นบนถัดไปเสมอ จนถึงพนักงานรายคนที่ override ได้เป็นจุดสุดท้าย

## 2. สาขา (Branch)

แต่ละสาขาตั้งค่าได้เอง:
- พิกัด GPS (lat/lng) + รัศมียอมรับ (`gps_radius`, default 200 เมตร)
- โหมดตรวจสอบตำแหน่ง (`geo_mode`): WARN (เตือนแต่เข้าได้) / BLOCK (บล็อกถ้านอกพื้นที่)
- สังกัดกลุ่ม (Group) — ใช้ inherit นโยบายเริ่มต้น
- เปิด/ปิดใช้งานสาขา (`is_active`)

## 3. กะการทำงาน (Shift)

ผูกกับสาขา แต่ละกะตั้งค่า:
- เวลาเข้า-ออก (`start_time`/`end_time`) — ถ้า end ≤ start ระบบตีความเป็น**กะข้ามเที่ยงคืน**อัตโนมัติ
- ประเภทกะ: REGULAR (ปกติ) / SPECIAL (พิเศษ — ทับซ้อนกะปกติได้ ไม่นับสาย เหมาะกับ OT/งานนอกสถานที่)
- เกณฑ์สาย 2 ระดับ + เกณฑ์ขาด พร้อมค่าปรับ (คิดแบบขั้นบันไดหรือต่อนาทีก็ได้)
- QR Code เฉพาะกะ (สแกนแล้วยืนยันตำแหน่งอัตโนมัติ ใช้กฎ BLOCK เสมอ)

## 4. สถานะพนักงาน (Employee Status Type)

ประเภทการจ้างงานที่แอดมินกำหนดเอง (เช่น "ประจำ", "ชั่วคราว", "รายวัน") แต่ละประเภทตั้ง **โควต้าวันหยุดต่อเดือน** (`monthly_off_quota`) ต่างกันได้ — แยกจาก `EmployeeStatus` (enum ACTIVE/INACTIVE/RESIGNED/TERMINATED ที่บอกสถานะการจ้างงานปัจจุบัน)

## 5. ประเภทการลา (Leave Type)

ประเภทมาตรฐานในระบบ (built-in): ลาป่วย (SICK), ลากิจ (PERSONAL), พักร้อน (VACATION), ลาคลอด (MATERNITY), ชดเชย (COMPENSATE) และ **ประเภทกำหนดเอง** (`TenantLeaveType`, OTHER) ที่แอดมินสร้างเพิ่มได้เอง — ครอบคลุมเคสอย่างลาบวช/ลาติดทหาร โดยไม่ต้องเพิ่ม field ใหม่ในระบบ

## 6. วันหยุดนักขัตฤกษ์ (Holiday)

แอดมินประกาศวันหยุดบริษัทได้ต่อปี พร้อมเลือก:
- ขอบเขต: ทั้งบริษัท หรือเฉพาะบางสาขา (`target_branches`)
- จำนวนวันชดเชยถ้ามาทำงานวันนั้น (`compensate_days`)
- ประเภทที่จะได้รับ: ชดเชย (COMPENSATE) หรือพักร้อน (VACATION) — ตั้งได้ต่อวันหยุดแต่ละรายการ

## 7. สิทธิ์และนโยบายรายบุคคล (Per-employee Overrides)

พนักงานแต่ละคน override ได้เป็นรายบุคคล (ไม่ inherit อัตโนมัติ): สิทธิ์เช็คอินนอกสถานที่ (`offsite_checkin_enabled`, ปิดโดย default) และ override สิทธิ์จอง/ลา (`booking_enabled_override`, `leave_enabled_override`)

## 8. แพ็กเกจและฟีเจอร์ (Tenant Plan)

ตั้งค่าระดับ Super Admin ต่อ tenant: แพ็กเกจ (FREE/STARTER/PRO/ENTERPRISE) กำหนดเพดานจำนวนพนักงาน/สาขา/กลุ่ม และ `enabled_features` (JSON) เปิด/ปิดฟีเจอร์รายฟีเจอร์ต่อบริษัท (เช่น `leave_management`, `resignation`, `document_request`, `ot_management`, `gps_checkin`, `announcement`)

## เอกสารที่เกี่ยวข้อง

[Data_Dictionary.md](Data_Dictionary.md) · [SRS.md](SRS.md) หมวด FR-2
