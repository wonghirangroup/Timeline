# Entity Relationship Diagram

แหล่งที่มาของความจริง (source of truth) คือ `server/src/prisma/schema.prisma` — เอกสารนี้สรุปเฉพาะ entity และความสัมพันธ์หลักที่สำคัญต่อความเข้าใจระบบ แบ่งเป็นกลุ่มย่อยเพื่อให้อ่านง่าย ดูรายละเอียดฟิลด์ครบทุกตารางที่ [Data_Dictionary.md](Data_Dictionary.md)

## 1. Tenant, ผังองค์กร และผู้ใช้งาน

```mermaid
erDiagram
    TENANT ||--o{ USER : "มีผู้ใช้"
    TENANT ||--o{ EMPLOYEE : "มีพนักงาน"
    TENANT ||--o{ BRANCH : "มีสาขา"
    TENANT ||--o{ GROUP : "มีกลุ่ม"
    TENANT ||--o| TENANT_LINE_CONFIG : "ตั้งค่า LINE"
    TENANT ||--o{ INVOICE : "มีใบแจ้งหนี้"

    GROUP ||--o{ BRANCH : "มีสาขาในกลุ่ม"
    GROUP ||--o{ DIVISION : "มีฝ่าย"
    DIVISION ||--o{ DEPARTMENT : "มีแผนก"
    DEPARTMENT ||--o{ POSITION : "มีตำแหน่ง"
    POSITION ||--o{ EMPLOYEE : "พนักงานในตำแหน่ง"

    BRANCH ||--o{ EMPLOYEE : "พนักงานสาขาหลัก"
    BRANCH ||--o{ EMPLOYEE_BRANCH : "สาขาเสริม (M:N)"
    EMPLOYEE ||--o{ EMPLOYEE_BRANCH : "สังกัดสาขาเสริม"

    USER ||--o| EMPLOYEE : "ผูกบัญชีแอดมิน (1:1 optional)"
    USER ||--o{ USER_DEPARTMENT : "หัวหน้าแผนกดูแล (DEPT_HEAD)"
    DEPARTMENT ||--o{ USER_DEPARTMENT : "ถูกดูแลโดย"
    USER ||--o{ MAGIC_LOGIN_TOKEN : "ออกลิงก์ auto-login"

    TENANT {
        string id PK
        string name
        enum plan "FREE STARTER PRO ENTERPRISE"
        int max_employees
        int max_branches
        json enabled_features
    }
    USER {
        string id PK
        string tenant_id FK
        string email
        enum role "SUPER_ADMIN ADMIN MANAGER EXECUTIVE DEPT_HEAD"
    }
    EMPLOYEE {
        string id PK
        string tenant_id FK
        string branch_id FK
        string position_id FK
        string user_id FK "nullable — สิทธิ์แอดมิน"
        string line_user_id
        enum status "ACTIVE INACTIVE RESIGNED TERMINATED"
    }
```

## 2. กะการทำงาน และการเช็คชื่อ

```mermaid
erDiagram
    BRANCH ||--o{ SHIFT : "มีกะ"
    SHIFT ||--o{ EMPLOYEE_SHIFT : "พนักงานประจำกะ (M:N)"
    EMPLOYEE ||--o{ EMPLOYEE_SHIFT : "อยู่ได้หลายกะ"
    SHIFT ||--o{ SHIFT_ASSIGNMENT : "override รายวัน"
    SHIFT ||--o{ ATTENDANCE_RECORD : "บันทึกเช็คชื่อของกะ"
    EMPLOYEE ||--o{ ATTENDANCE_RECORD : "เช็คชื่อ"
    EMPLOYEE ||--o{ OFFSITE_CHECKIN : "เช็คอินนอกสถานที่"

    ATTENDANCE_RECORD {
        string id PK
        string employee_id FK
        string shift_id FK
        date date
        datetime check_in_at
        datetime check_out_at
        enum check_in_method "LIFF QR ADMIN"
        boolean is_late
        boolean is_absent
        decimal fine
        boolean is_outside_area
        boolean worked_on_holiday
        boolean worked_on_weekly_off
    }
    SHIFT {
        string id PK
        string branch_id FK
        string start_time
        string end_time
        enum shift_type "REGULAR SPECIAL"
        enum fine_mode
    }
```

## 3. วันลา วันหยุด และ OT

```mermaid
erDiagram
    EMPLOYEE ||--o{ LEAVE_REQUEST : "ยื่นคำขอลา"
    EMPLOYEE ||--o{ LEAVE_BALANCE : "มีโควต้าลา (ต่อปี/ประเภท)"
    EMPLOYEE ||--o{ VACATION_GRANT_LOG : "ประวัติการให้สิทธิ์พักร้อน"
    EMPLOYEE ||--o{ WEEKLY_OFF_REQUEST : "จองวันหยุด"
    EMPLOYEE ||--o{ OT_REQUEST : "ยื่นขอ OT"
    EMPLOYEE ||--o{ WEEKLY_OFF_SWAP_REQUEST : "ขอสลับวันหยุด (ผู้ขอ/ผู้รับ)"
    BRANCH ||--o{ WEEKLY_OFF_PERIOD : "เปิด-ปิดรอบจองต่อเดือน"
    BRANCH ||--o{ HOLIDAY : "วันหยุดนักขัตฤกษ์"
    TENANT ||--o{ TENANT_LEAVE_TYPE : "ประเภทลากำหนดเอง"

    LEAVE_REQUEST {
        string id PK
        string employee_id FK
        enum leave_type "SICK PERSONAL VACATION MATERNITY COMPENSATE OTHER"
        date start_date
        date end_date
        float days
        enum status "PENDING APPROVED REJECTED"
        boolean has_conflict
    }
    WEEKLY_OFF_REQUEST {
        string id PK
        string employee_id FK
        date week_start
        int day_of_week
        enum status
    }
    LEAVE_BALANCE {
        string id PK
        string employee_id FK
        enum leave_type
        int year
        float total_days
        float used_days
    }
```

## 4. วงจรชีวิตพนักงาน เอกสาร และประกาศ

```mermaid
erDiagram
    EMPLOYEE ||--o{ RESIGNATION_REQUEST : "ยื่นลาออก"
    EMPLOYEE ||--o{ DOCUMENT_REQUEST : "ขอเอกสาร HR"
    EMPLOYEE ||--o{ HR_DOCUMENT : "เอกสารที่ออกให้ในระบบ"
    EMPLOYEE ||--o{ EMPLOYEE_DOCUMENT : "เอกสารประจำตัว (บัตร/วีซ่า)"
    EMPLOYEE ||--o{ DISCIPLINARY_RECORD : "หนังสือเตือน"
    EMPLOYEE ||--o{ EMPLOYEE_STATUS_LOG : "ประวัติเปลี่ยนสถานะ"
    DOCUMENT_REQUEST ||--o| HR_DOCUMENT : "ออกเอกสารจากคำขอ"
    TENANT ||--o{ ANNOUNCEMENT : "ประกาศ"

    RESIGNATION_REQUEST {
        string id PK
        string employee_id FK
        date last_working_date
        enum status
    }
    HR_DOCUMENT {
        string id PK
        string employee_id FK
        enum type "PAYSLIP SALARY_CERT RESIGNATION_LETTER"
        string doc_number
        json data "snapshot ข้อมูล ณ วันออกเอกสาร"
    }
```

## 5. การแจ้งเตือนและ Log

```mermaid
erDiagram
    TENANT ||--o{ LINE_MESSAGE_LOG : "บันทึกการส่งไลน์"
    TENANT ||--o{ ACTIVITY_LOG : "บันทึกกิจกรรม Super Admin"
    TENANT ||--o{ FEEDBACK : "ความคิดเห็นพนักงาน"

    LINE_MESSAGE_LOG {
        string id PK
        string tenant_id FK
        string category
        enum recipient_type "EMPLOYEE ADMIN"
        string recipient_id
        boolean success
    }
```

## หมายเหตุการออกแบบที่สำคัญ

- ทุก entity หลักมี `tenant_id` เป็น foreign key ไปยัง `Tenant` เพื่อแยกข้อมูลระหว่างบริษัทลูกค้า (multi-tenant isolation)
- `Employee.user_id` เป็นความสัมพันธ์ 1:1 (optional) ที่เชื่อมพนักงานเข้ากับบัญชีแอดมิน — ใช้ตอนพนักงานคนหนึ่งมีสิทธิ์เป็นแอดมินด้วย (เช่น หัวหน้าสาขา) ทำให้สลับเข้าเว็บแอดมินจาก LIFF ได้
- นโยบาย (booking/leave enabled, โควต้า) resolve แบบ cascade ผ่านฟังก์ชัน `resolvePolicyFlag()` ไล่จาก Employee override → Position → Department → Division → Branch → Group
- `HrDocument.data` เก็บเป็น JSON snapshot ของข้อมูลพนักงาน/บริษัท ณ เวลาที่ออกเอกสาร โดยตั้งใจไม่ join ข้อมูลสดตอนแสดงผลย้อนหลัง เพื่อให้เอกสารเก่าคงข้อมูลเดิมแม้พนักงานย้ายสาขา/เปลี่ยนตำแหน่งภายหลัง
