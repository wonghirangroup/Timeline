# API Documentation

## ภาพรวม

REST API ให้บริการโดย `server/` (Fastify) — ทุก endpoint ขึ้นต้นด้วย `/api/v1` เอกสาร interactive (Swagger UI) เปิดใช้งานอยู่แล้วในตัวเซิร์ฟเวอร์ ดูสเปกทุก field/response แบบละเอียดที่นั่นได้โดยตรง (schema ของแต่ละ route กำหนดด้วย JSON Schema/Zod ในโค้ด)

## รูปแบบ Response มาตรฐาน (Response Envelope)

ทุก endpoint ตอบกลับในรูปแบบเดียวกัน:

```json
// สำเร็จ
{ "success": true, "data": { /* ... */ } }

// ล้มเหลว
{ "success": false, "error": { "code": "ERROR_CODE", "message": "ข้อความภาษาไทยพร้อมแสดงผล" } }
```

## การยืนยันตัวตน (Authentication)

| วิธี | ใช้กับ |
|---|---|
| **Bearer JWT** (`Authorization: Bearer <access_token>`) | ทุก endpoint ที่ต้อง login (Admin/Manager/Super Admin) |
| **OAuth2 Password Flow** (`POST /api/v1/auth/token`) | สำหรับปุ่ม Authorize ใน Swagger UI |
| **Refresh Token** (`POST /api/v1/auth/refresh`) | ขอ access token ใหม่โดยไม่ต้อง login ซ้ำ |
| **Magic Login** (`POST /api/v1/auth/magic-login`) | ล็อกอินอัตโนมัติครั้งเดียวจากลิงก์แจ้งเตือน LINE |
| **LIFF ID Token** | ฝั่งพนักงาน (`employeeAuthRoutes`) ยืนยันตัวตนผ่าน LINE โดยไม่ใช้รหัสผ่าน |

RBAC ตรวจสอบทุก endpoint ผ่าน middleware `requireRole(...)` — แต่ละ route ระบุ role ที่อนุญาตไว้ชัดเจน (ดู [Class Diagram.md](Class%20Diagram.md))

## Base URL

| สภาพแวดล้อม | URL |
|---|---|
| Development | `http://localhost:3000/api/v1` |
| Production | `https://timeline-api.wonghiran.com/api/v1` (ตัวอย่างตาม tenant จริง) |

## หมวดหมู่ Endpoint (ตาม module ที่ลงทะเบียนใน `app.ts`)

| Prefix / Module | สิทธิ์หลัก | หน้าที่ |
|---|---|---|
| `/auth` | ทุกคน (บางส่วน) | login, refresh, magic-login, เปลี่ยนรหัสผ่าน, แก้โปรไฟล์ |
| `/super-admin` (tenant) | SUPER_ADMIN | จัดการ tenant, แพ็กเกจ, วันหยุด (`/holidays` — role จริงอนุญาต ADMIN ด้วย), ผู้ใช้ |
| `/admin` (branch) | ADMIN | จัดการสาขา, QR code |
| `/admin` (employee) | ADMIN | จัดการพนักงาน, สิทธิ์แอดมิน |
| `/admin` (shift) | ADMIN | จัดการกะการทำงาน |
| `/admin` (shift-assignment) | ADMIN | override กะรายวัน |
| `/` (employee-auth) | ไม่ต้อง login | ยืนยันตัวตนพนักงานผ่าน LIFF |
| `/` (employee-me) | EMPLOYEE (LIFF) | โปรไฟล์/กะของตัวเอง, สลับไปเว็บแอดมิน |
| `/` (attendance) | MANAGER อ่าน / EMPLOYEE เขียน | เช็คอิน-เอาท์ทุกรูปแบบ, รายงานเช็คชื่อ |
| `/` (leave) | MANAGER อนุมัติ / EMPLOYEE ยื่น | คำขอลา |
| `/` (ot) | MANAGER อนุมัติ / EMPLOYEE ยื่น | คำขอ OT |
| `/admin` (announcement) | ADMIN | ประกาศบริษัท |
| `/` (weekly-off) | ADMIN จัดการ / EMPLOYEE จอง | วันหยุดประจำสัปดาห์/เดือน, สลับวันหยุด |
| `/` (feedback) | ADMIN อ่าน / EMPLOYEE ส่ง | ความคิดเห็น (ไม่ระบุตัวตน) |
| `/` (issue-report) | ไม่ต้อง login | แจ้งปัญหาการใช้งานแอป (กรณีเข้าแอปไม่ได้เลย) |
| `/super-admin` (billing) | SUPER_ADMIN | ติดตามใบแจ้งหนี้ |
| `/super-admin` (activity) | SUPER_ADMIN | feed กิจกรรมล่าสุด |
| `/` (offsite) | ADMIN ดู / EMPLOYEE ปักหมุด | เช็คอิน-เอาท์นอกสถานที่ |
| `/admin` (group) | ADMIN | กลุ่ม(บริษัท) — ชั้นนโยบายเหนือสาขา |
| `/admin` (org-structure) | ADMIN | ผังองค์กร ฝ่าย→แผนก→ตำแหน่ง |
| `/admin` (employee-status-type) | ADMIN | สถานะพนักงาน + โควต้าวันหยุดต่อเดือน |
| `/admin` (dashboard) | ADMIN | KPI สรุปตามช่วงวันที่ |
| `/admin` (notifications) | ADMIN | กระดิ่งแจ้งเตือนรวม + ประวัติการส่งไลน์ |
| `/admin` (settings) | ADMIN | ตั้งค่าบริษัท (โปรไฟล์/แบรนด์/นโยบาย) |
| `/` (hr-lifecycle) | ADMIN จัดการ / EMPLOYEE รับทราบ | เอกสาร/ทดลองงาน/หนังสือเตือน/ลาออก |
| `/` (hr-document) | ADMIN | สร้างเอกสาร HR ในระบบ |
| `/` (leave-types) | ADMIN ตั้งค่า / EMPLOYEE ดู | ประเภทลากำหนดเอง |
| `/` (vacation-policy) | ADMIN | นโยบายพักร้อนตามอายุงาน (preview/run-bonus/run-reset) |
| `/line` | LINE Platform | Webhook รับ event จาก LINE |
| `/super-admin` (firebase-sync) | SUPER_ADMIN | ซิงค์ข้อมูลจากระบบเก่า (bespoke, เฉพาะ tenant ที่ migrate มา) |

## ตัวอย่าง Endpoint สำคัญ

| Method | Path | คำอธิบาย |
|---|---|---|
| `POST` | `/auth/login` | ล็อกอิน username/password |
| `POST` | `/auth/magic-login` | บริโภค magic-login token (ใช้ครั้งเดียว) |
| `GET` | `/admin/employees` | รายชื่อพนักงาน (กรองตามสาขา/สถานะได้) |
| `GET` | `/admin/attendance` | รายงานเช็คชื่อ (กรอง date/startDate-endDate/branchId/employeeId) |
| `POST` | `/attendance/check-in-auto` | พนักงานเช็คอิน (auto-detect กะ) |
| `GET` | `/admin/leave-requests` | รายการคำขอลา |
| `POST` | `/leave-requests/:id/review` | อนุมัติ/ปฏิเสธคำขอลา |
| `GET` | `/admin/weekly-off` | รายการคำขอจองวันหยุด |
| `POST` | `/admin/weekly-off/periods` | เปิดรอบจองวันหยุดต่อสาขา/เดือน |
| `GET` | `/admin/resignations` | รายการคำขอลาออก |
| `POST` | `/admin/document-requests/:id/review` | ดำเนินการคำขอเอกสาร HR |
| `GET` | `/admin/line-message-logs` | ประวัติการส่งข้อความ LINE (สำหรับรายงาน) |
| `GET` | `/health` | Health check (ไม่ต้อง auth) |

## เอกสารที่เกี่ยวข้อง

[Data_Dictionary.md](Data_Dictionary.md) สำหรับ field ของข้อมูลที่แต่ละ endpoint คืนค่า · [Flowchart.md](Flowchart.md) สำหรับลำดับการเรียกใช้ในแต่ละ flow
