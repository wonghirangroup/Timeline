# Data Dictionary

เอกสารนี้สรุปฟิลด์ของตารางข้อมูลหลัก (core tables) ที่สำคัญต่อความเข้าใจระบบ ดูรายการตารางทั้งหมด (~40 ตาราง) และคำอธิบายละเอียดทุกฟิลด์ (มีคอมเมนต์ภาษาไทยกำกับเกือบทุกบรรทัด) ที่ `server/src/prisma/schema.prisma` ซึ่งเป็นแหล่งความจริงหลัก (single source of truth) ของโครงสร้างข้อมูล

ทุกตารางที่มี `tenant_id` หมายถึงข้อมูลถูกแยกตามบริษัทลูกค้า (multi-tenant) เสมอ

## tenants

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสบริษัทลูกค้า |
| name | string | ชื่อบริษัท |
| plan | enum | FREE / STARTER / PRO / ENTERPRISE |
| max_employees / max_branches / max_groups | int | เพดานตามแพ็กเกจ |
| enabled_features | json | เปิด/ปิดฟีเจอร์ต่อบริษัท (key ที่ไม่มี = เปิดใช้งานโดย default) |
| notification_prefs | json | เปิด/ปิดประเภทการแจ้งเตือน LINE แต่ละแบบ |
| is_active | boolean | ปิดใช้งานทั้งบริษัทได้ (Super Admin) |

## users

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสผู้ใช้ (บัญชีที่ล็อกอินเว็บได้) |
| tenant_id | UUID (FK, nullable) | null = Super Admin (ไม่สังกัดบริษัทใด) |
| email | string (unique) | ใช้เป็น username ล็อกอิน |
| password | string | bcrypt hash |
| role | enum | SUPER_ADMIN / ADMIN / MANAGER / EXECUTIVE / DEPT_HEAD |
| must_change_password | boolean | บังคับเปลี่ยนรหัสรอบแรก (ตั้งโดย Super Admin ตอนสร้างให้) |

## employees

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสพนักงาน |
| tenant_id / branch_id / position_id | UUID (FK) | สังกัดบริษัท/สาขาหลัก/ตำแหน่ง |
| user_id | UUID (FK, nullable, unique) | บัญชีแอดมินที่ผูกไว้ (ถ้ามี) |
| employee_code | string | รหัสพนักงาน (unique ต่อ tenant) |
| line_user_id | string (nullable) | ผูกหลังยืนยันตัวตนผ่าน LINE ครั้งแรก |
| status | enum | ACTIVE / INACTIVE / RESIGNED / TERMINATED |
| is_active | boolean | derive จาก status=ACTIVE (คงไว้เพราะมีจุดเช็คตรงๆ หลายจุด) |
| weekly_off_mode | enum | WEEKLY (จองทีละสัปดาห์) / MONTHLY_BATCH (จองครบเดือนรวด) |
| default_shift_id | UUID (FK, nullable) | กะหลัก — informational เท่านั้น ไม่บังคับตอนเช็คอินจริง |
| booking_enabled_override / leave_enabled_override | boolean (nullable) | null = inherit นโยบายจากผังองค์กร |
| offsite_checkin_enabled | boolean | สิทธิ์เช็คอินนอกสถานที่ (ตั้งรายคน ไม่ cascade) |
| photo_url | text (nullable) | รูปโปรไฟล์ |

## branches

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสสาขา |
| group_id | UUID (FK, nullable) | กลุ่ม(บริษัท)ที่สังกัด |
| lat / lng | decimal | พิกัดสาขา |
| gps_radius | int | รัศมียอมรับ (เมตร) default 200 |
| geo_mode | enum | WARN (เตือนแต่เข้าได้) / BLOCK (บล็อกถ้านอกพื้นที่) |
| booking_enabled / leave_enabled / saturday_rule / sunday_rule / booking_quota | nullable | null = inherit จาก Group |

## shifts

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสกะ |
| branch_id | UUID (FK) | สาขาที่กะนี้สังกัด |
| start_time / end_time | string "HH:mm" | เวลาเข้า-ออก (end ≤ start = กะข้ามเที่ยงคืน) |
| shift_type | enum | REGULAR / SPECIAL (กะพิเศษ ทับซ้อนกะปกติได้ ไม่นับสาย) |
| late_threshold_1 / late_threshold_2 / absent_threshold | string (nullable) | เกณฑ์เวลาสาย 2 ระดับ / ขาด |
| late_fine_1 / late_fine_2 / absent_fine | decimal | ค่าปรับต่อระดับ |
| fine_mode | enum | โหมดคิดค่าปรับแบบขั้นบันไดหรือต่อนาที |

## attendance_records

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสบันทึกเช็คชื่อ |
| employee_id / shift_id | UUID (FK) | พนักงาน/กะที่เช็คอิน |
| date | date | วันที่ของบันทึก (สำหรับกะข้ามเที่ยงคืน = วันที่กะเริ่ม ไม่ใช่วันปฏิทินที่กดเช็คอินจริงเสมอไป) |
| check_in_at / check_out_at | datetime (nullable) | เวลาจริงที่เช็คอิน/เอาท์ |
| check_in_method | enum | LIFF / QR / ADMIN |
| is_late / is_absent | boolean | ผลคำนวณสาย/ขาด |
| fine / carried_fine | decimal | ค่าปรับวันนี้ / ค่าปรับที่ยกมาจากวันก่อนหน้า |
| gps_lat / gps_lng | decimal (nullable) | พิกัดตอนเช็คอิน (null = ไม่ได้ส่งมา เช่น sync จากระบบเก่า) |
| is_outside_area | boolean | เช็คอินนอกรัศมี (โหมด WARN) |
| worked_on_holiday / worked_on_weekly_off | boolean | เช็คอินวันที่ควรหยุด (บริษัทประกาศ / จองวันหยุดเอง) |

## leave_requests

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสคำขอลา |
| employee_id | UUID (FK) | ผู้ยื่นคำขอ |
| leave_type | enum | SICK / PERSONAL / VACATION / MATERNITY / COMPENSATE / OTHER |
| start_date / end_date | date | ช่วงวันที่ลา |
| days | float | จำนวนวันที่หักโควต้า (รองรับ 0.5 และเศษวันจากลาระบุช่วงเวลา) |
| leave_period | enum | FULL / MORNING / AFTERNOON / CUSTOM |
| status | enum | PENDING / APPROVED / REJECTED |
| has_conflict | boolean | มีคนตำแหน่งเดียวกันลาวันทับซ้อนไว้แล้ว (ไม่บล็อก แค่ flag) |
| conflict_deduct_type | enum (nullable) | แอดมินเลือกตอนอนุมัติว่าจะหักโควต้าประเภทไหน |

## leave_balances

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| employee_id / leave_type / year | composite | โควต้าต่อพนักงาน/ประเภท/ปี |
| total_days | float | โควต้ารวมของปีนั้น |
| used_days | float | ใช้ไปแล้ว |

## weekly_off_requests

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสการจอง |
| employee_id | UUID (FK) | ผู้จอง |
| week_start | date | วันจันทร์ของสัปดาห์ที่จอง |
| day_of_week | int | 0 (อาทิตย์) – 6 (เสาร์) |
| status | enum | PENDING / APPROVED / REJECTED |

## resignation_requests

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสคำขอลาออก |
| employee_id | UUID (FK) | ผู้ยื่น |
| last_working_date | date | วันทำงานสุดท้าย |
| status | enum | PENDING / APPROVED / REJECTED |

## document_requests

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสคำขอเอกสาร |
| employee_id | UUID (FK) | ผู้ขอ |
| type | enum | PAYSLIP / SALARY_CERT / WORK_CERT / OTHER |
| status | enum | PENDING / COMPLETED / REJECTED |
| file_url | string (nullable) | ไฟล์ที่แอดมินแนบ |

## hr_documents

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสเอกสาร |
| employee_id | UUID (FK) | เจ้าของเอกสาร |
| type | enum | PAYSLIP / SALARY_CERT / RESIGNATION_LETTER |
| doc_number | string | เลขที่เอกสาร (format `HR-<ปี><ลำดับ 3 หลัก>`) |
| data | json | snapshot ข้อมูลพนักงาน/บริษัท ณ วันที่ออกเอกสาร (ไม่ join ข้อมูลสดย้อนหลัง) |

## line_message_logs

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัส log |
| category | string | ประเภทข้อความ เช่น `pending_leave`, `ANNOUNCEMENT` |
| recipient_type | enum | EMPLOYEE / ADMIN |
| recipient_id / recipient_label | string | ผู้รับ (id + ชื่อ snapshot กันข้อมูลหายถ้าลบพนักงาน/ผู้ใช้ภายหลัง) |
| success / error_message | boolean / text | ผลการส่ง |

## holidays

| ฟิลด์ | ชนิด | คำอธิบาย |
|---|---|---|
| id | UUID (PK) | รหัสวันหยุด |
| date / name | date / string | วันที่และชื่อวันหยุด |
| target_branches | json (nullable) | null = ทั้งบริษัท, ไม่ null = เฉพาะสาขาที่ระบุ |
| compensate_days | int (nullable) | จำนวนวันชดเชยถ้ามาทำงานวันนี้ |
| compensate_leave_type | enum | เลือกได้ว่าให้ชดเชยเป็น COMPENSATE หรือ VACATION |

## Enum สำคัญที่ใช้ร่วมหลายตาราง

| Enum | ค่า |
|---|---|
| UserRole | SUPER_ADMIN, ADMIN, MANAGER, EXECUTIVE, DEPT_HEAD |
| EmployeeStatus | ACTIVE, INACTIVE, RESIGNED, TERMINATED |
| LeaveType | SICK, PERSONAL, VACATION, MATERNITY, COMPENSATE, OTHER |
| LeaveStatus / WeeklyOffStatus / DocumentRequestStatus | PENDING, APPROVED, REJECTED (หรือเทียบเท่า) |
| CheckInMethod | LIFF, QR, ADMIN |
| GeoMode | WARN, BLOCK |
| TenantPlan | FREE, STARTER, PRO, ENTERPRISE |

ดู [ER_Diagram.md](ER_Diagram.md) สำหรับความสัมพันธ์ระหว่างตาราง และ [Master_Data.md](Master_Data.md) สำหรับตารางข้อมูลอ้างอิง/ตั้งค่าที่แอดมินปรับแต่งได้เอง
