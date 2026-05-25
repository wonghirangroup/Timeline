# System Design — TimeLine HR SaaS

> Multi-tenant HR & Attendance Management Platform  
> Stack: React + Vite / Fastify + Node.js / MySQL + Prisma / LINE LIFF  
> Roles: **SUPER_ADMIN → ADMIN → MANAGER → EMPLOYEE**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Role & Permission Matrix](#2-role--permission-matrix)
3. [Super Admin Features](#3-super-admin-features)
4. [Admin — Dashboard](#4-admin--dashboard)
5. [Admin — Calendar & Leave Management](#5-admin--calendar--leave-management)
6. [Admin — Employee Management](#6-admin--employee-management)
7. [Admin — Branch Management](#7-admin--branch-management)
8. [Admin — Manual Check-in](#8-admin--manual-check-in)
9. [Admin — Settings (System Heart)](#9-admin--settings-system-heart)
10. [Employee — LINE LIFF Features](#10-employee--line-liff-features)
11. [Data Dictionary (All Tables)](#11-data-dictionary-all-tables)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  SUPER ADMIN PORTAL                  │
│         (จัดการ Tenant, Package, Billing)            │
└──────────────────────┬──────────────────────────────┘
                       │  tenant_id isolation
          ┌────────────┼────────────┐
          │            │            │
    ┌─────▼──┐   ┌─────▼──┐  ┌─────▼──┐
    │Tenant A│   │Tenant B│  │Tenant C│
    └─────┬──┘   └────────┘  └────────┘
          │
    ┌─────┴──────────────────┐
    │    ADMIN / MANAGER      │
    │     Web Portal          │
    │  (React + shadcn/ui)   │
    └─────┬──────────────────┘
          │  REST API /api/v1/
    ┌─────▼──────────────────┐
    │   FASTIFY BACKEND       │
    │ Middleware: tenantId    │
    │ Middleware: RBAC        │
    │ Middleware: liffVerify  │
    └─────┬──────────────────┘
          │
    ┌─────▼──────────────────┐
    │   MySQL Database        │
    │ (Prisma ORM)           │
    └────────────────────────┘
          ▲
    ┌─────┴──────────────────┐
    │  EMPLOYEE LINE LIFF     │
    │  (React + liff.init)   │
    │  QR Scan + GPS Verify  │
    └────────────────────────┘
```

### Multi-tenant Rule
- ทุก table มี `tenant_id` — ห้าม query ข้ามข้อมูล tenant
- ทุก API ผ่าน `resolveTenant` middleware
- Web App: resolve จาก JWT | LIFF: resolve จาก `line_channel_id`

---

## 2. Role & Permission Matrix

| Feature | SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|
| จัดการ Package / Tenant | ✅ | ❌ | ❌ | ❌ |
| Suspend Tenant | ✅ | ❌ | ❌ | ❌ |
| Login as Admin (Impersonate) | ✅ | ❌ | ❌ | ❌ |
| จัดการ Branch / Shift | ✅ | ✅ | ❌ | ❌ |
| จัดการ Employee | ✅ | ✅ | ❌ | ❌ |
| Manual Check-in | ✅ | ✅ | ❌ | ❌ |
| ดู Dashboard ทุก Branch | ✅ | ✅ | ❌ | ❌ |
| ดู Dashboard เฉพาะ Branch | ✅ | ✅ | ✅ | ❌ |
| Approve / Reject Leave | ✅ | ✅ | ✅ | ❌ |
| ตั้งค่า Payroll / Policy | ✅ | ✅ | ❌ | ❌ |
| เช็คอิน / เช็คเอาท์ | ❌ | ❌ | ❌ | ✅ |
| ลงวันลา | ❌ | ❌ | ❌ | ✅ |
| ดูรายงานของตัวเอง | ❌ | ❌ | ❌ | ✅ |
| ขอแลกกะ | ❌ | ❌ | ❌ | ✅ |
| ขอ e-Slip / เอกสาร | ❌ | ❌ | ❌ | ✅ |

---

## 3. Super Admin Features

### 3.1 Dashboard (Platform Overview)

**Flow:**
```
Super Admin Login → JWT (role: SUPER_ADMIN)
→ Dashboard ดึง aggregate จากทุก tenant
→ แสดง Revenue / Active Tenants / System Health
```

**หน้าจอ:**
- Revenue Metrics: ยอดรายเดือน/ปี, จำนวน Tenant ที่ต่ออายุ/ยกเลิก
- Active Tenants: แยกตาม Package (Starter / Business / Enterprise)
- System Health: สถานะ API, LINE Message quota remaining
- Expiring Soon: บริษัทที่ใกล้หมด subscription (< 7 วัน)

---

### 3.2 Package Management

**Flow:**
```
Super Admin สร้าง Package
→ กำหนด: ชื่อ, ราคา, จำนวนพนักงาน, จำนวนสาขา, feature flags
→ บันทึก features_json เช่น { "payroll": true, "ot": true, "expense_claim": false }
```

**Package Tiers ตัวอย่าง:**

| Package | พนักงาน | สาขา | ฟีเจอร์ | ราคา/เดือน |
|---|---|---|---|---|
| Starter | ≤ 20 | 1 | เช็คชื่อพื้นฐาน | 499 บาท |
| Business | ≤ 100 | 5 | + ลางาน + Payroll | 1,500 บาท |
| Enterprise | ไม่จำกัด | ไม่จำกัด | Full Features | 5,000+ บาท |

**Feature Flag Check (Backend):**
```typescript
// middleware/packageGuard.ts
if (!tenant.package.features.payroll) {
  throw { code: 'PACKAGE_LIMIT', message: 'กรุณาอัปเกรด Package' }
}
```

---

### 3.3 Tenant Management

**Flow — สร้าง Tenant ใหม่:**
```
1. ลูกค้าสมัคร → Super Admin อนุมัติ
2. ระบบสร้าง tenant_id (UUID)
3. ระบบสร้าง Admin User รายแรกของ Tenant นั้น
4. ส่ง email invite ให้ Admin ตั้งรหัสผ่าน
5. Super Admin ตั้งค่า LINE OA (channel_id, channel_secret) ให้ Tenant
```

**Flow — Suspend Tenant:**
```
Super Admin กด Suspend → status = 'SUSPENDED'
→ JWT middleware ตรวจ tenant.status → reject 403 ทุก request
→ พนักงานและ Admin เข้าใช้งานไม่ได้
```

**Flow — Impersonate (Login as Admin):**
```
Super Admin เลือก Tenant → กด "เข้าในฐานะ Admin"
→ ระบบออก Short-lived Token (15 นาที) มี role: ADMIN + tenant_id ของนั้น
→ Super Admin เห็นหน้าบ้านลูกค้าเพื่อช่วย Support
→ ทุก action ถูก log ไว้ใน audit_logs
```

---

### 3.4 Global Announcements

**Flow:**
```
Super Admin พิมพ์ข้อความ → เลือก Broadcast ถึง "ทุก Admin" หรือเฉพาะ Tenant
→ ระบบยิง LINE Push Message ไปยัง Admin ของทุก Tenant ที่เลือก
→ บันทึก log การส่ง
```

---

## 4. Admin — Dashboard

### Flow การทำงาน

```
Admin Login → JWT มี tenant_id, role: ADMIN
→ Dashboard API GET /api/v1/admin/dashboard?date=&branchId=
→ Backend filter ทุก query ด้วย tenant_id
→ Return: summary cards + table records
```

### Filter Options
- **Date Picker**: Single Date หรือ Date Range (ดูย้อนหลังได้)
- **Branch Filter**: Dropdown สาขาทั้งหมดใน Tenant
- **Search Box**: ค้นหาชื่อพนักงาน / รหัสพนักงาน (Debounce 300ms)

### Summary Cards

| Card | Logic การคำนวณ |
|---|---|
| พนักงานทั้งหมด | COUNT(employees) WHERE tenant_id AND status=ACTIVE |
| เข้างานปกติ | มี attendance record + check_in ≤ shift_start |
| มาสาย (1) | check_in > shift_start AND ≤ late_threshold_1 |
| มาสาย (2) | check_in > late_threshold_1 |
| ขาด | มีกะงานแต่ไม่มี attendance record และไม่มี leave |
| ลา | มี leave_request ที่ status=APPROVED |
| หยุด | วันหยุดประจำสัปดาห์ของพนักงานคนนั้น |
| หยุดประจำปี | อยู่ใน holidays table (นักขัตฤกษ์) |

**สีของสถานะ (Badge Colors):**

| สถานะ | สี |
|---|---|
| มาปกติ | 🟢 เขียว |
| มาสาย (1) | 🟡 เหลือง |
| มาสาย (2) | 🟠 ส้ม |
| ขาด | 🔴 แดง |
| ลา (ป่วย/กิจ/พักร้อน) | 🔵 ฟ้า + ตัวย่อ |
| หยุด / นักขัตฤกษ์ | ⚪ เทา |
| นอกพื้นที่ | 🟣 ม่วง |

### Table Record

**Columns:** `#` | `ชื่อ-นามสกุล` | `สาขา` | `กะ` | `เวลาเช็คอิน` | `เวลาเช็คเอาท์` | `สถานะ` | `จัดการ`

**Manage Modal** (คลิกดูรายละเอียด):
- แผนที่แสดงพิกัดที่สแกนจริง vs พิกัดสาขา
- ระยะห่าง (เมตร)
- รูปหลักฐาน (กรณีลาป่วย)
- ประวัติการเช็คชื่อย้อนหลังของพนักงานคนนั้น

**Pagination:** Server-side (LIMIT/OFFSET) รองรับพนักงานหลักพันคน

### Performance Optimization

สำหรับการดูย้อนหลัง — ใช้ `daily_summary` table ที่ถูก aggregate ทุกคืน:
```
Cron job 00:05 น. → ประมวลผลสรุปวันที่ผ่านมา → INSERT INTO daily_summary
```

---

## 5. Admin — Calendar & Leave Management

### Flow การดูปฏิทิน

```
GET /api/v1/admin/calendar?month=2026-05&branchId=
→ Return: วันหยุดนักขัตฤกษ์ + leave_requests ของเดือน
→ แสดงใน Calendar View (FullCalendar / React Big Calendar)
```

**Filter:**
- ดูทุกสาขา หรือ แยกตามสาขา
- ดูทุกคน หรือ แยกตามพนักงาน

---

### Flow การลงวันหยุดโดย Admin

```
Admin คลิกวันในปฏิทิน
→ Modal: เลือกประเภท (วันหยุดบริษัท / วันหยุดสาขา / สลับวันหยุดพนักงาน)
→ เลือกพนักงานและเหตุผล
→ ระบบอัปเดต attendance_overrides table
→ Dashboard recalculate สถานะของวันนั้นใหม่
```

**Admin Override Cases:**
- สลับวันหยุด (จาก "ขาด" → "หยุดสลับ")
- แก้ไขการลงเวลาย้อนหลัง
- ยกเลิก Leave ที่อนุมัติผิด

---

### Flow การขอลา (ผ่าน LINE LIFF)

```
พนักงาน กด "ลางาน" ใน Rich Menu
→ LIFF เปิดฟอร์ม: ประเภทลา / วันที่ / หมายเหตุ / อัปโหลดรูป
→ รูปใบรับรองแพทย์ → upload ไป Cloud Storage → เก็บ URL ใน DB
→ POST /api/v1/employee/leave-requests
→ ระบบส่ง LINE Flex Message หาหัวหน้า (Manager/Admin)
```

**Flex Message ที่หัวหน้าได้รับ:**
```
┌────────────────────────────────┐
│  📋 คำขอลางาน                  │
│  นาย สมชาย มีสุข               │
│  ประเภท: ลาป่วย                │
│  วันที่: 20-21 พ.ค. 2026 (2 วัน)│
│  [รูปใบรับรองแพทย์]             │
│  ┌──────────┐  ┌──────────┐   │
│  │ ✅ อนุมัติ│  │ ❌ ปฏิเสธ│   │
│  └──────────┘  └──────────┘   │
└────────────────────────────────┘
```

**Security:** ปุ่มอนุมัติฝัง `approval_token` ที่มีอายุ 72 ชั่วโมง เพื่อป้องกันการสวมสิทธิ์

**Flow Approval:**
```
หัวหน้ากด "อนุมัติ"
→ LINE Postback → POST /api/v1/line/webhook
→ Backend verify approval_token
→ UPDATE leave_requests SET status='APPROVED'
→ หัก leave_balance ของพนักงาน
→ LINE Push Message แจ้งพนักงานว่า "ลาผ่านแล้ว"
→ อัปเดตปฏิทิน Admin
```

---

### Flow การเลือกวันหยุดประจำสัปดาห์ (Weekly Day-off Booking)

```
Admin ตั้งค่า: จำนวนคนที่หยุดได้ต่อวัน/สาขา (Quota)
→ พนักงานเปิด LIFF → ดูปฏิทินสัปดาห์ถัดไป
→ วันที่โควต้าเต็ม → ปุ่มสีเทา (กดไม่ได้)
→ พนักงานเลือกวัน → POST /api/v1/employee/weekly-off
→ ระบบบันทึก status='WEEKLY_OFF' + แจ้งเตือนยืนยัน
```

---

## 6. Admin — Employee Management

### Flow การเพิ่มพนักงาน

```
Admin กรอกข้อมูลพนักงาน (หรือ Import Excel)
→ ระบบสร้าง employee record + status='PENDING_LINE_VERIFY'
→ ส่ง LINE OA Message พร้อม Verify Link ให้พนักงาน
→ พนักงานคลิก Link → LIFF เปิด → กรอกรหัสพนักงาน/เบอร์โทร
→ ระบบ match กับ DB → บันทึก line_user_id → status='ACTIVE'
```

### Flow การเปลี่ยนสถานะพนักงาน

```
Admin กด Toggle สถานะ
→ Modal บังคับเลือกเหตุผล:
   - ลาออก (สิ้นสุดสภาพ)
   - พักงาน (วินัย)
   - ลาบวช
   - เกณฑ์ทหาร
   - ลาคลอด
   - อื่นๆ (กรอกเอง)
→ INSERT ประวัติลง user_status_history
→ status = 'INACTIVE'
→ พนักงานเช็คชื่อผ่าน LINE ไม่ได้อีกต่อไป
```

### ข้อมูลพนักงาน (Employee Profile)

| ส่วน | ฟิลด์ | สิทธิ์ |
|---|---|---|
| ข้อมูลทั่วไป | ชื่อ, เบอร์, อีเมล, รูป, รหัสพนักงาน | ADMIN + HR |
| สังกัด | สาขา, กะงาน, ตำแหน่ง, วันเริ่มงาน | ADMIN |
| LINE | line_user_id, สถานะผูกบัญชี | ADMIN |
| Payroll | เงินเดือน, ประเภท (รายเดือน/วัน), OT multiplier | HR เท่านั้น |
| สถานะ | ACTIVE / INACTIVE + เหตุผล | ADMIN + HR |

**Feature Toggle สำหรับ Payroll:**
```
IT Admin → ไม่เห็นยอดเงิน (แสดง *****)
HR Admin → เห็นและแก้ไขได้
ตั้งค่าใน tenant_settings.show_salary_to_it = false
```

---

## 7. Admin — Branch Management

### Flow การสร้างสาขา

```
Admin กรอกชื่อสาขา + ค้นหาที่ตั้งบนแผนที่
→ Map Picker: คลิกปักหมุด → ได้ lat, lng
→ Radius Slider: ลากเลือก 50-500 เมตร (วงกลมบนแผนที่)
→ Accuracy Buffer: กำหนดค่าความคลาดเคลื่อนที่ยอมรับ (เช่น 30 เมตร)
→ ระบบ Generate QR Code (เนื้อหาใน QR = location_id UUID เท่านั้น ไม่มีพิกัด)
→ Admin download/print QR Code ไปแปะที่หน้าบริษัท
```

### GPS Verification Logic (Backend)

```typescript
// สูตร Haversine + Accuracy Buffer
const distance = haversine(currentLat, currentLng, branch.lat, branch.lng)
const effectiveDistance = distance - currentAccuracy // หักค่าคลาดเคลื่อน GPS

if (effectiveDistance <= branch.radius_meter) {
  // ✅ อนุญาต
} else {
  // ❌ นอกพื้นที่
}
```

**กรณี Off-site Check-in:**
```
พนักงานกด "เช็คอินนอกสถานที่"
→ ระบบ Skip การเช็ค radius
→ บันทึก is_offsite = true + บันทึกพิกัดจริง
→ สถานะใน Dashboard = "นอกพื้นที่" (🟣 ม่วง)
→ Admin ตรวจสอบภายหลังว่าพิกัดสมเหตุสมผลไหม
```

---

## 8. Admin — Manual Check-in

### Flow

```
Admin ค้นหาพนักงาน → เลือกชื่อ
→ เลือก: เช็คอิน หรือ เช็คเอาท์
→ เลือก: วันที่ + เวลา (ย้อนหลังได้)
→ กรอกเหตุผล (บังคับ): เช่น "มือถือพนักงานเสีย", "GPS ขัดข้อง"
→ INSERT attendance_records
→ บันทึก metadata: { source: 'MANUAL', created_by: adminId, reason: '...' }
```

**Audit Trail ใน Table:**
```
is_manual = true
manual_by  = admin_id ของคนที่ลง
manual_at  = timestamp
manual_reason = "เหตุผล"
```

> **สำคัญ:** Record ที่ถูกลง Manual จะแสดง icon พิเศษใน Dashboard เพื่อให้ Super Admin ตรวจสอบได้

---

## 9. Admin — Settings (System Heart)

### 9.1 กะเวลา (Shift Management)

**Priority ในการนำไปใช้:**
```
รายบุคคล (Individual) > สาขา (Branch) > บริษัท (Company Default)
```

**ฟิลด์การตั้งค่ากะ:**

| ฟิลด์ | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| shift_name | ชื่อกะ | กะเช้า |
| start_time | เวลาเริ่มงาน | 08:00 |
| end_time | เวลาเลิกงาน | 17:00 |
| late_threshold_1 | นาทีสาย Level 1 | 15 นาที |
| late_threshold_2 | นาทีสาย Level 2 | 30 นาที |
| early_checkin_minutes | เช็คอินล่วงหน้าได้กี่นาที | 30 นาที |
| allow_overlap | อนุญาตกะซ้อนกันได้ | true/false |
| branch_id | สาขาที่ใช้กะนี้ (null = ทุกสาขา) | UUID |
| employee_id | พนักงานเฉพาะคน (null = ตามสาขา) | UUID |

**Flow การขอแลกกะ (ผ่าน LINE):**
```
พนักงาน A กด "ขอแลกกะ" → เลือกวันที่ + เลือกพนักงาน B
→ ระบบส่ง Flex Message หาพนักงาน B ให้ยืนยัน
→ B กด "ยืนยัน" → ระบบส่ง Flex Message หาหัวหน้า
→ หัวหน้ากด "อนุมัติ" → ระบบสลับ shift ใน DB
→ แจ้ง A และ B ว่า "กะถูกเปลี่ยนแล้ว"
```

---

### 9.2 Payroll & Smart Deduction

**ฐานเงินเดือนรายวัน:**

| แบบ | สูตร | เลือกได้ใน Settings |
|---|---|---|
| มาตรฐาน | เงินเดือน ÷ 30 | ✅ |
| วันทำงานจริง | เงินเดือน ÷ วันทำงานในเดือน | ✅ |

**Late Deduction Rules (ตั้งค่าได้ต่อ Tenant):**

| สาย | หัก |
|---|---|
| 1-15 นาที | ไม่หัก |
| 16-30 นาที | 50 บาท (ปรับได้) |
| 31-60 นาที | 100 บาท (ปรับได้) |
| > 60 นาที | ครึ่งวัน |

**OT Rate (ตั้งค่าได้):**

| วัน | ตัวคูณ |
|---|---|
| วันทำงานปกติ | × 1.5 |
| วันหยุดประจำสัปดาห์ | × 2.0 |
| วันหยุดนักขัตฤกษ์ | × 3.0 |

**Deduction Engine Flow:**
```
ทุกครั้งที่มีการบันทึก attendance / leave:
→ ระบบคำนวณ deduction ทันที
→ สะสมใน monthly_payroll_records
   - late_deduction += x บาท
   - unpaid_leave_deduction += daily_rate
   - ot_allowance += OT hours × rate

สิ้นเดือน:
→ Admin กด "Confirm & Export"
→ ระบบ Generate สรุปเงินเดือน (net_salary)
→ Export เป็น Excel/CSV สำหรับธนาคาร
```

**Safety Net — Final Audit:**
> ก่อนปิดยอด Admin ต้องกด "Confirm Deduction" เพื่อตรวจทานเคสพิเศษ ก่อนส่งข้อมูลออก

---

### 9.3 Leave Policy Engine

**Anniversary Leave Entitlement:**

| อายุงาน | วันลาพักร้อนที่ได้รับ |
|---|---|
| 1 ปี | 6 วัน |
| 5 ปี | 10 วัน |
| 10 ปี | 15 วัน |

> ตั้งค่า Tier ได้เองต่อ Tenant — Cron Job รันทุกคืน ตรวจ `hired_date` ทุกคน → ถ้าครบรอบปีจะ recalculate โควต้า

**Leave Types Config (ปรับได้ต่อ Tenant):**

| ประเภทลา | โควต้า/ปี | จ่ายสูงสุด | เงื่อนไขพิเศษ |
|---|---|---|---|
| ลาป่วย | ไม่จำกัด | 30 วัน | ต้องมีใบรับรองแพทย์ |
| ลากิจ | 3 วัน | 3 วัน | — |
| ลาพักร้อน | ตาม Tier | เท่าโควต้า | ต้องอนุมัติล่วงหน้า |
| ลาฌาปนกิจ | 4 วันต่อเนื่อง | 4 วัน | ต่อเนื่องเท่านั้น |
| ลาคลอด (< 180 วันงาน) | 90 วัน | 0 วัน | — |
| ลาคลอด (≥ 180 วันงาน) | 90 วัน | 45 วัน | — |
| ลาฝึกทหาร | 60 วัน | 60 วัน | — |
| ลาบวช | 30 วัน | 15 วัน | 1 ครั้งต่อชีวิต |

**Auto Deduction เมื่อลาเกินโควต้า:**
```
พนักงาน ลากิจ วันที่ 4 (เกินโควต้า 3 วัน)
→ ระบบ flag: is_paid = false
→ monthly_payroll_records.unpaid_leave_deduction += daily_rate
→ สถานะใน e-Slip: "ลากิจ (ไม่ได้รับค่าจ้าง)"
```

---

### 9.4 Communication Settings

**ช่องทางการสื่อสาร:**

| ฟีเจอร์ | ผู้ส่ง | ผู้รับ | วิธี |
|---|---|---|---|
| Broadcast Announcement | Admin/HR | พนักงานทุกคน | LINE Push Message |
| Direct Message | Admin/Manager | พนักงานรายคน | LINE Push Message |
| Anonymous Feedback | พนักงาน | Admin (ไม่เห็นชื่อ) | LIFF → ซ่อน lineUserId |

---

## 10. Employee — LINE LIFF Features

### 10.1 Check-in (QR + GPS)

**Flow:**
```
พนักงานกด "เช็คอิน" ใน Rich Menu
→ LIFF เปิด
→ liff.scanCodeV2() → พนักงานสแกน QR Code ที่สาขา
→ ได้ qr_key (UUID ของสาขา)
→ navigator.geolocation → ได้ lat, lng, accuracy
→ POST /api/v1/employee/attendance/check-in {
    liff_token, qr_key, lat, lng, accuracy
  }
→ Backend:
   1. verify liff_token กับ LINE API
   2. resolve employee จาก line_user_id + tenant_id
   3. หา branch จาก qr_key
   4. คำนวณระยะทาง (Haversine) - accuracy buffer
   5. เปรียบเทียบกับ shift เพื่อตัดสิน สาย/ปกติ
   6. INSERT attendance_records
   7. LINE Push Message ยืนยัน "เช็คอินเรียบร้อย เวลา 08:45"
```

### 10.2 Check-out

**Flow เหมือน Check-in แต่:**
```
POST /api/v1/employee/attendance/check-out
→ UPDATE attendance_records SET check_out_time = now()
→ คำนวณ OT = check_out_time - shift.end_time (ถ้าเกิน)
→ บันทึก ot_hours ใน attendance_records
→ LINE Push Message ยืนยัน "เช็คเอาท์ เวลา 18:05 | OT 1 ชม."
```

### 10.3 Leave Request (ผ่าน LIFF)

```
พนักงานกด "ลางาน"
→ เลือกประเภทลา → เลือกวันที่ → กรอกเหตุผล
→ อัปโหลดรูปหลักฐาน (ถ้าลาป่วย) → ไปเก็บที่ Cloud Storage
→ POST /api/v1/employee/leave-requests
→ ระบบส่ง Flex Message ขออนุมัติหาหัวหน้า
```

### 10.4 Shift Request (ขอแลกกะ)

```
พนักงานเลือกวันที่ + พนักงานที่จะแลกด้วย
→ ระบบส่ง Flex Message ให้คู่แลกยืนยัน
→ คู่ยืนยัน → ส่งต่อหัวหน้าอนุมัติ
→ หัวหน้าอนุมัติ → สลับกะใน DB → แจ้งทั้งสองคน
```

### 10.5 Personal Report

```
พนักงานเปิดหน้า "ประวัติ"
→ GET /api/v1/employee/attendance/history?month=2026-05
→ ดูสรุปรายเดือน: มา X วัน / สาย Y ครั้ง / ลา Z วัน
→ ดู e-Slip Preview (ยอดหักสะสมถึงปัจจุบัน)
```

### 10.6 Document Request (ขอเอกสาร)

```
พนักงานเลือก: "สลิปเงินเดือน" / "ใบรับรองการทำงาน" / "ใบรับรองเงินเดือน"
→ ระบบ Generate PDF จากข้อมูล DB
→ ส่งไฟล์ PDF กลับใน LINE Chat (ไม่เกิน 24 ชม.)
```

### 10.7 Expense Claim (เบิกค่าใช้จ่าย)

```
พนักงานถ่ายรูปใบเสร็จ → กรอกจำนวน → เลือกประเภท
→ POST /api/v1/employee/expense-claims
→ ส่ง Flex Message หาหัวหน้า (รูปใบเสร็จ + ยอดเงิน)
→ หัวหน้ากด "อนุมัติ"
→ ยอดจะบวกเข้า expense_allowance ในรอบเงินเดือนนั้น
```

### 10.8 Anonymous Feedback

```
พนักงานกด "ส่งความคิดเห็น"
→ LIFF เปิดกล่องข้อความ
→ POST /api/v1/employee/feedback { message }
→ Backend ไม่บันทึก line_user_id ไว้กับข้อความ (store separately with hash)
→ Admin เห็นแต่ข้อความ — ไม่รู้ว่าใครส่ง
```

---

## 11. Data Dictionary (All Tables)

### tenants

| Column | Type | Description |
|---|---|---|
| id | UUID PK | Tenant ID |
| company_name | VARCHAR(255) | ชื่อบริษัท |
| package_id | UUID FK | Package ที่ใช้งาน |
| status | ENUM | ACTIVE, SUSPENDED, TRIAL |
| line_channel_id | VARCHAR(255) | LINE OA Channel ID (encrypted) |
| line_channel_secret | VARCHAR(255) | LINE OA Secret (encrypted) |
| created_at | DATETIME | — |
| deleted_at | DATETIME | soft delete |

---

### packages

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| name | VARCHAR(100) | Starter / Business / Enterprise |
| max_employees | INT | 0 = unlimited |
| max_branches | INT | 0 = unlimited |
| price_monthly | DECIMAL(10,2) | ราคา/เดือน |
| features_json | JSON | { "payroll": true, "ot": true, "expense_claim": false } |

---

### users (Admin / Manager / Super Admin)

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | (null สำหรับ SUPER_ADMIN) |
| email | VARCHAR(255) | UNIQUE |
| password_hash | VARCHAR(255) | bcrypt |
| role | ENUM | SUPER_ADMIN, ADMIN, MANAGER |
| branch_id | UUID FK | Manager ดูแลสาขาไหน |
| show_salary | BOOLEAN | HR Permission Toggle |
| created_at | DATETIME | — |
| deleted_at | DATETIME | — |

---

### employees

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| branch_id | UUID FK | สาขาหลัก |
| employee_code | VARCHAR(50) | รหัสพนักงาน |
| full_name | VARCHAR(255) | — |
| phone | VARCHAR(20) | ใช้ verify ตอนผูก LINE |
| line_user_id | VARCHAR(100) | UNIQUE ต่อ tenant |
| hire_date | DATE | วันเริ่มงาน (ใช้คำนวณ leave) |
| salary_type | ENUM | MONTHLY, DAILY |
| base_salary | DECIMAL(12,2) | — |
| ot_multiplier_weekday | DECIMAL(3,1) | default 1.5 |
| ot_multiplier_holiday | DECIMAL(3,1) | default 3.0 |
| status | ENUM | ACTIVE, INACTIVE, PENDING_VERIFY |
| created_at | DATETIME | — |
| deleted_at | DATETIME | — |

---

### branches

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| name | VARCHAR(255) | ชื่อสาขา |
| address | TEXT | ที่อยู่ |
| lat | DECIMAL(10,8) | ละติจูด |
| lng | DECIMAL(11,8) | ลองจิจูด |
| radius_meter | INT | รัศมีอนุญาต |
| accuracy_buffer | INT | ค่าคลาดเคลื่อน GPS ที่ยอมรับ |
| qr_key | VARCHAR(100) | UNIQUE — ใช้ใน QR Code |
| qr_is_active | BOOLEAN | เปิด/ปิดจุดสแกน |
| created_at | DATETIME | — |
| deleted_at | DATETIME | — |

---

### shifts

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| branch_id | UUID FK | null = ทุกสาขา |
| employee_id | UUID FK | null = ตามสาขา, มีค่า = รายบุคคล |
| name | VARCHAR(100) | ชื่อกะ |
| start_time | TIME | เวลาเริ่ม |
| end_time | TIME | เวลาเลิก |
| late_threshold_1 | INT | นาที (สาย Level 1) |
| late_threshold_2 | INT | นาที (สาย Level 2) |
| early_checkin_minutes | INT | เช็คอินล่วงหน้าได้กี่นาที |
| allow_overlap | BOOLEAN | กะซ้อนได้ไหม |
| created_at | DATETIME | — |

---

### attendance_records

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| branch_id | UUID FK | — |
| shift_id | UUID FK | — |
| check_in_time | DATETIME | Asia/Bangkok |
| check_out_time | DATETIME | null ถ้ายังไม่เช็คเอาท์ |
| check_in_lat | DECIMAL(10,8) | — |
| check_in_lng | DECIMAL(11,8) | — |
| check_in_accuracy | INT | เมตร (GPS accuracy) |
| distance_from_branch | INT | ระยะจากสาขา (คำนวณแล้ว) |
| status | ENUM | ON_TIME, LATE_1, LATE_2, ABSENT, OFF_SITE |
| is_offsite | BOOLEAN | นอกสถานที่ |
| is_manual | BOOLEAN | ลงโดย Admin |
| manual_by | UUID FK | Admin ที่ลงให้ |
| manual_reason | TEXT | เหตุผล |
| ot_hours | DECIMAL(4,2) | OT ที่คำนวณได้ |
| date | DATE | วันที่ (ใช้ index) |
| created_at | DATETIME | — |

---

### leave_requests

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| leave_type_id | UUID FK | ประเภทลา |
| start_date | DATE | — |
| end_date | DATE | — |
| days_count | INT | จำนวนวัน |
| reason | TEXT | เหตุผล |
| evidence_url | VARCHAR(500) | URL รูปใบรับรองแพทย์ |
| status | ENUM | PENDING, APPROVED, REJECTED, CANCELLED |
| approved_by | UUID FK | Manager/Admin |
| approval_token | VARCHAR(255) | Token สำหรับปุ่ม LINE |
| approval_token_expires | DATETIME | อายุ 72 ชม. |
| is_paid | BOOLEAN | ได้รับค่าจ้างไหม |
| created_at | DATETIME | — |

---

### leave_types_config

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| leave_type_code | VARCHAR(50) | SICK, PERSONAL, VACATION, MATERNITY, … |
| name_th | VARCHAR(100) | ชื่อภาษาไทย |
| quota_per_year | INT | วันลาสูงสุด (0 = ไม่จำกัด) |
| max_paid_days | INT | จ่ายเงินสูงสุดกี่วัน |
| min_tenure_days | INT | อายุงานขั้นต่ำ |
| continuous_limit | INT | ลาต่อเนื่องสูงสุดกี่วัน (0 = ไม่จำกัด) |
| once_per_lifetime | BOOLEAN | ลาได้ครั้งเดียว (เช่น บวช) |
| require_evidence | BOOLEAN | ต้องแนบหลักฐาน |
| is_active | BOOLEAN | เปิดใช้ประเภทลานี้ไหม |

---

### leave_balances

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| leave_type_id | UUID FK | — |
| year | INT | ปี (พ.ค.) |
| entitled_days | INT | โควต้าที่ได้รับ |
| used_days | INT | ใช้ไปแล้ว |
| remaining_days | INT | คงเหลือ |
| updated_at | DATETIME | — |

---

### vacation_tenure_tiers

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| years_of_service | INT | ทำงานครบกี่ปี |
| entitled_days | INT | วันพักร้อนที่ได้รับ |

---

### holidays

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| branch_id | UUID FK | null = ทุกสาขา |
| date | DATE | วันหยุด |
| name | VARCHAR(255) | ชื่อวันหยุด |
| type | ENUM | PUBLIC_HOLIDAY, COMPANY_HOLIDAY, BRANCH_HOLIDAY |

---

### attendance_overrides (Admin แก้ไข)

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| date | DATE | วันที่แก้ไข |
| original_status | ENUM | สถานะเดิม |
| override_status | ENUM | สถานะใหม่ |
| reason | TEXT | เหตุผล |
| overridden_by | UUID FK | Admin |
| created_at | DATETIME | — |

---

### monthly_payroll_records

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| month_year | VARCHAR(7) | เช่น "2026-05" |
| base_salary | DECIMAL(12,2) | เงินเดือนตั้งต้น |
| working_days | INT | วันทำงานในเดือน |
| late_deduction | DECIMAL(10,2) | รวมหักจากมาสาย |
| unpaid_leave_deduction | DECIMAL(10,2) | รวมหักจากลาไม่ได้รับค่าจ้าง |
| absent_deduction | DECIMAL(10,2) | รวมหักจากขาด |
| ot_allowance | DECIMAL(10,2) | รวม OT |
| expense_allowance | DECIMAL(10,2) | รวมค่าใช้จ่ายที่อนุมัติ |
| net_salary | DECIMAL(12,2) | ยอดสุทธิ |
| is_confirmed | BOOLEAN | Admin กด Confirm แล้ว |
| confirmed_at | DATETIME | — |
| confirmed_by | UUID FK | — |

---

### shift_swap_requests

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| requester_id | UUID FK | คนขอแลก |
| swap_target_id | UUID FK | คนที่จะแลกด้วย |
| requester_shift_id | UUID FK | กะของผู้ขอ |
| target_shift_id | UUID FK | กะที่อยากได้ |
| swap_date | DATE | วันที่แลก |
| status | ENUM | PENDING_TARGET, PENDING_MANAGER, APPROVED, REJECTED |
| approved_by | UUID FK | Manager |
| created_at | DATETIME | — |

---

### user_status_history

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| status | ENUM | ACTIVE, INACTIVE |
| reason | ENUM | RESIGNED, SUSPENDED, ORDAINED, MILITARY, MATERNITY, OTHER |
| reason_detail | TEXT | รายละเอียดเพิ่มเติม |
| changed_by | UUID FK | Admin |
| created_at | DATETIME | — |

---

### expense_claims

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| employee_id | UUID FK | — |
| amount | DECIMAL(10,2) | จำนวนเงิน |
| category | ENUM | TRAVEL, MEAL, ENTERTAINMENT, OTHER |
| receipt_url | VARCHAR(500) | รูปใบเสร็จ |
| description | TEXT | รายละเอียด |
| status | ENUM | PENDING, APPROVED, REJECTED |
| approved_by | UUID FK | Manager |
| month_year | VARCHAR(7) | รอบเดือน |
| created_at | DATETIME | — |

---

### announcements

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| branch_id | UUID FK | null = ทุกสาขา |
| title | VARCHAR(255) | — |
| body | TEXT | — |
| target | ENUM | ALL, BRANCH, INDIVIDUAL |
| created_by | UUID FK | Admin |
| sent_at | DATETIME | เวลาส่งจริง |
| created_at | DATETIME | — |

---

### audit_logs

| Column | Type | Description |
|---|---|---|
| id | UUID PK | — |
| tenant_id | UUID FK | — |
| actor_id | UUID FK | ใครทำ |
| actor_role | ENUM | SUPER_ADMIN, ADMIN, MANAGER |
| action | VARCHAR(100) | เช่น MANUAL_CHECKIN, LEAVE_APPROVED |
| target_type | VARCHAR(50) | employee, leave_request, … |
| target_id | UUID | ID ของสิ่งที่ถูกแก้ |
| metadata | JSON | ข้อมูลเพิ่มเติม |
| created_at | DATETIME | — |

---

## API Route Summary

```
/api/v1/super-admin/packages
/api/v1/super-admin/tenants
/api/v1/super-admin/tenants/:id/suspend
/api/v1/super-admin/tenants/:id/impersonate

/api/v1/admin/dashboard
/api/v1/admin/calendar
/api/v1/admin/employees
/api/v1/admin/employees/:id/status
/api/v1/admin/branches
/api/v1/admin/shifts
/api/v1/admin/holidays
/api/v1/admin/leave-requests
/api/v1/admin/attendance/manual
/api/v1/admin/payroll/:month
/api/v1/admin/payroll/:month/confirm
/api/v1/admin/settings/leave-policy
/api/v1/admin/settings/shifts
/api/v1/admin/settings/payroll-rules
/api/v1/admin/announcements

/api/v1/manager/dashboard
/api/v1/manager/leave-requests
/api/v1/manager/leave-requests/:id/approve
/api/v1/manager/leave-requests/:id/reject
/api/v1/manager/shift-swap-requests/:id/approve

/api/v1/employee/attendance/check-in        ← LIFF only
/api/v1/employee/attendance/check-out       ← LIFF only
/api/v1/employee/attendance/history
/api/v1/employee/leave-requests
/api/v1/employee/shift-swap-requests
/api/v1/employee/weekly-off
/api/v1/employee/expense-claims
/api/v1/employee/document-requests
/api/v1/employee/payslip/:month
/api/v1/employee/feedback

/api/v1/line/webhook                         ← LINE Webhook
/api/v1/auth/login
/api/v1/auth/refresh
```

---

*อัปเดตล่าสุด: 2026-05-18*
