# CLAUDE.md — HR Attendance & Leave Management System

## ⚡ เริ่ม Session ใหม่ — อ่านก่อนทำทุกครั้ง

**ทุกครั้งที่เริ่ม session ใหม่ คุณต้องทำตามลำดับนี้ก่อนเสมอ:**

1. อ่านไฟล์นี้ (CLAUDE.md) ทั้งหมดให้เข้าใจ context
2. อ่าน `brain/INDEX.md` — รู้ว่ามีโน้ตอะไรใน vault
3. อ่าน `brain/daily/` ล่าสุด 2-3 ไฟล์ — รู้ว่าทำอะไรค้างไว้
4. สรุปให้ผู้ใช้เห็นว่า "งานค้าง" และ "context ปัจจุบัน" คืออะไร

> หรือให้ผู้ใช้รัน `/ctx` เพื่อทำทั้ง 4 ขั้นตอนนี้อัตโนมัติ

**ห้ามเริ่มทำงานก่อนอ่าน brain/daily/ ล่าสุด — อาจทำงานซ้ำหรือขัดแย้ง decision ที่ตัดสินใจไปแล้ว**

---

## Project Overview
ระบบ HR SaaS แบบ **Multi-tenant** สำหรับ Vendor ที่ขายระบบให้ลูกค้าหลายบริษัท
- เช็คชื่อพนักงานแบบกะ (Shift-based attendance) — ผ่าน **Line LIFF เท่านั้น**
- แยกตามสาขา (Branch-based) ของแต่ละ tenant
- ลงวันลา / วันหยุดพนักงาน (Leave & Holiday management)
- Setup Line OA per tenant โดย Vendor (Super Admin)

---

## Tech Stack

### Frontend
- **Framework**: React + Vite
- **Styling**: Tailwind CSS v4
- **State**: Zustand (global) + React Query (server state)
- **Form**: React Hook Form + Zod
- **UI Components**: shadcn/ui (Tailwind v4 compatible)
- **Date/Time**: dayjs (timezone-aware, Asia/Bangkok)
- **HTTP Client**: Axios with interceptors + auto-attach `tenant_id` header

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify v4
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma (MySQL)
- **Auth**: JWT (Access Token + Refresh Token) + Line LIFF Token verify
- **Validation**: Zod (shared schema กับ Frontend)
- **API Style**: RESTful + versioned (`/api/v1/`)

### Database
- **DB**: MySQL (via phpMyAdmin)
- **Migrations**: Prisma Migrate
- **Naming**: `snake_case` สำหรับ column, `PascalCase` สำหรับ model

### Line Integration
- **Line LIFF**: Employee check-in (login ด้วย Line account)
- **Line OA**: 1 OA ต่อ 1 tenant (setup ตอน onboard)
- **Line Messaging API**: notify manager เมื่อมีการ approve/reject leave

---

## Multi-tenant Architecture

### หลักการ
- ทุก tenant (บริษัทลูกค้า) มีข้อมูลแยกกันสมบูรณ์
- ทุก API request ต้องมี `tenant_id` — resolve จาก JWT หรือ Line LIFF token
- ห้าม query ข้ามข้อมูล tenant โดยเด็ดขาด

### Tenant Isolation Pattern
```typescript
// ทุก service method ต้องรับ tenantId เสมอ
async getEmployees(tenantId: string, branchId?: string) {
  return prisma.employee.findMany({
    where: { tenant_id: tenantId, branch_id: branchId }
  })
}
```

### Tenant Resolver Middleware (Fastify)
```
Request → resolveTenant middleware → attach req.tenantId → route handler
```
- Web App: resolve จาก JWT payload (`tenant_id`)
- Line LIFF: resolve จาก `line_channel_id` → lookup tenant ใน DB

---

## 4 Actor Roles

### 1. SUPER_ADMIN (Vendor — ทีมเรา)
- จัดการ tenant ทั้งหมด (สร้าง / ระงับ / ดูข้อมูล)
- Setup Line OA + LIFF per tenant ตอน onboard
- เข้าถึง dashboard ภาพรวมทุก tenant
- ใช้ Web App เท่านั้น
- Route prefix: `/api/v1/super-admin/...`

### 2. ADMIN (ของ tenant/ลูกค้า)
- จัดการ Branch, Shift, Employee ของ tenant ตัวเอง
- ดูรายงาน Attendance + Leave ทุก Branch ใน tenant
- กำหนดวันหยุดประจำปี
- ใช้ Web App เท่านั้น
- Route prefix: `/api/v1/admin/...`

### 3. MANAGER (ของ tenant)
- ดูรายงาน Attendance + Leave เฉพาะ Branch ที่ดูแล
- Approve / Reject leave request
- ใช้ Web App เท่านั้น
- Route prefix: `/api/v1/manager/...`

### 4. EMPLOYEE (ของ tenant)
- เช็คอิน / เช็คเอาต์ผ่าน **Line LIFF เท่านั้น**
- ลงวันลาผ่าน Line LIFF
- ดูประวัติการเช็คชื่อ + สถานะวันลาของตัวเอง
- ไม่มี Web App — ทุกอย่างอยู่ใน Line
- Route prefix: `/api/v1/employee/...`

### Permission Matrix
| Action                   | SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE |
|--------------------------|:-----------:|:-----:|:-------:|:--------:|
| จัดการ Tenant            | ✅          | ❌    | ❌      | ❌       |
| Setup Line OA            | ✅          | ❌    | ❌      | ❌       |
| จัดการ Branch/Shift      | ✅          | ✅    | ❌      | ❌       |
| จัดการ Employee          | ✅          | ✅    | ❌      | ❌       |
| ดูรายงานทุก Branch       | ✅          | ✅    | ❌      | ❌       |
| ดูรายงาน Branch ตัวเอง   | ✅          | ✅    | ✅      | ❌       |
| Approve Leave            | ✅          | ✅    | ✅      | ❌       |
| เช็คอิน / เช็คเอาต์      | ❌          | ❌    | ❌      | ✅       |
| ลงวันลา                  | ❌          | ❌    | ❌      | ✅       |
| ดูข้อมูลตัวเอง           | ❌          | ❌    | ❌      | ✅       |

---

## Line LIFF Integration

### Flow การเช็คอิน
```
Employee เปิด Line OA
→ กด Check-in
→ Line เปิด LIFF App (React embed)
→ liff.init() + liff.login()
→ ได้ line_user_id + liff_access_token
→ POST /api/v1/employee/attendance/check-in
   { liff_token, line_user_id, shift_id, branch_id }
→ Server verify liff_token กับ Line API
→ resolve employee จาก line_user_id + tenant_id
→ บันทึก attendance record
→ ตอบกลับ + ส่ง Line message ยืนยัน
```

### LIFF Token Verification (Backend)
```typescript
async verifyLiffToken(liffToken: string, lineUserId: string): Promise<boolean> {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    body: new URLSearchParams({
      id_token: liffToken,
      client_id: process.env.LINE_CHANNEL_ID
    })
  })
  const data = await res.json()
  return data.sub === lineUserId
}
```

### Employee ↔ Line UID Mapping
- ตอน Admin เพิ่มพนักงาน → ส่งลิงก์ผ่าน Line OA ให้พนักงาน verify
- พนักงาน verify → ระบบ map `employee_id` ↔ `line_user_id` ใน DB
- ถ้า `line_user_id` ยังไม่ถูก map → LIFF แสดงหน้า "กรุณายืนยันตัวตน"

---

## Folder Structure

### Frontend — Web App (Admin / Manager / Super Admin)
```
src/
├── assets/
├── components/
│   ├── ui/               # shadcn base components
│   └── shared/           # reusable business components
├── features/
│   ├── super-admin/      # tenant management (Super Admin only)
│   ├── attendance/       # รายงานเช็คชื่อ
│   ├── leave/            # จัดการวันลา
│   ├── branch/           # จัดการสาขา
│   ├── shift/            # จัดการกะ
│   └── employee/         # จัดการพนักงาน
├── hooks/
├── lib/
│   ├── axios.ts          # instance + tenant_id interceptor
│   └── utils.ts
├── pages/
├── stores/               # Zustand
└── types/
```

### Frontend — LIFF App (Employee only)
```
src-liff/                 # แยก Vite project สำหรับ LIFF
├── components/
├── features/
│   ├── checkin/          # เช็คอิน / เช็คเอาต์
│   ├── leave/            # ลงวันลา
│   └── history/          # ประวัติของตัวเอง
├── lib/
│   ├── liff.ts           # liff.init, liff.login, getProfile
│   └── axios.ts          # ส่ง liff_token แทน JWT
└── pages/
```

### Backend
```
src/
├── modules/
│   ├── tenant/           # SUPER_ADMIN: จัดการ tenant
│   ├── line/             # Line OA setup, LIFF verify, webhook
│   ├── auth/             # JWT, refresh token
│   ├── attendance/       # check-in/out, รายงาน
│   ├── leave/            # leave request, approve flow
│   ├── branch/
│   ├── shift/
│   └── employee/
├── common/
│   ├── middleware/
│   │   ├── auth.ts       # verify JWT
│   │   ├── liff.ts       # verify LIFF token
│   │   ├── tenant.ts     # resolve + attach tenantId
│   │   └── rbac.ts       # role-based access control
│   └── utils/
├── config/
├── prisma/
└── app.ts
```

### Module Structure (Backend)
```
module/
├── module.route.ts
├── module.controller.ts
├── module.service.ts
├── module.schema.ts      # Zod validation
└── module.test.ts
```

---

## Naming Conventions

### Frontend
- Components: `PascalCase` (เช่น `AttendanceTable.tsx`)
- Hooks: `camelCase` prefix `use` (เช่น `useAttendanceQuery.ts`)
- Stores: `camelCase` suffix `Store` (เช่น `attendanceStore.ts`)
- Types: `PascalCase` (เช่น `AttendanceRecord`)
- API functions: `camelCase` verb+noun (เช่น `getAttendanceByShift`)

### Backend
- Routes: `kebab-case` (เช่น `/api/v1/attendance-records`)
- Files: `kebab-case.type.ts` (เช่น `attendance.service.ts`)
- DB columns: `snake_case` (เช่น `check_in_time`)
- Prisma models: `PascalCase` (เช่น `AttendanceRecord`)

---

## Core Business Logic Rules

### Attendance (เช็คชื่อ)
- เช็คอินได้เฉพาะผ่าน Line LIFF — ห้ามมี check-in endpoint จาก Web App
- พนักงาน 1 คน มีได้หลาย shift ต่อวัน
- Shift ต้องผูกกับ Branch และ Tenant เสมอ
- Check-in / Check-out ต้องมี timestamp + timezone (Asia/Bangkok)
- Late threshold คำนวณจาก `shift_start_time`
- ห้าม check-in ซ้ำในกะเดียวกัน (unique: `employee_id + shift_id + date`)

### Leave (วันลา)
- ประเภทลา: ลาป่วย, ลากิจ, ลาพักร้อน, ลาคลอด
- Approval flow: `PENDING → APPROVED / REJECTED`
- Manager approve ได้เฉพาะพนักงานใน Branch ตัวเอง
- วันลาหักจาก `leave_balance` ของพนักงาน
- ห้ามลาย้อนหลังเกิน 3 วัน (configurable per tenant)
- แจ้ง Manager ผ่าน Line Messaging API เมื่อมี leave request ใหม่

### Branch & Tenant
- Employee สังกัด Branch ได้ 1 สาขาในช่วงเวลาหนึ่ง
- Manager ดูได้เฉพาะ Branch ของตัวเอง
- Admin ดูได้ทุก Branch ใน tenant เดียวกัน
- Super Admin ดูได้ทุก tenant

### Line OA per Tenant
- 1 tenant = 1 Line OA = 1 `line_channel_id`
- Super Admin setup `LINE_CHANNEL_ID` และ `LINE_CHANNEL_SECRET` per tenant ตอน onboard
- เก็บ credential ใน `tenant_line_configs` table (encrypted at rest)

---

## API Route Structure

```
/api/v1/super-admin/tenants
/api/v1/super-admin/tenants/:id/line-config

/api/v1/admin/branches
/api/v1/admin/employees
/api/v1/admin/shifts
/api/v1/admin/holidays
/api/v1/admin/leave-requests

/api/v1/manager/attendance?branchId=&date=
/api/v1/manager/leave-requests
/api/v1/manager/leave-requests/:id/approve
/api/v1/manager/leave-requests/:id/reject

/api/v1/employee/attendance/check-in        ← LIFF only
/api/v1/employee/attendance/check-out       ← LIFF only
/api/v1/employee/leave-requests             ← LIFF only
/api/v1/employee/attendance/history         ← LIFF only

/api/v1/line/webhook                        ← Line webhook
/api/v1/auth/login
/api/v1/auth/refresh
```

### Response Format มาตรฐาน
```json
{
  "success": true,
  "data": {},
  "message": "string",
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "LEAVE_OVERLAP",
    "message": "มีวันลาที่ทับซ้อนกันอยู่แล้ว"
  }
}
```

---

## Safety Rules (Guardrails)

- ❌ ห้าม `DELETE` โดยไม่มี `WHERE tenant_id = ?`
- ❌ ห้าม query ข้ามข้อมูล tenant (ไม่มี `tenant_id` filter = bug ร้ายแรง)
- ❌ ห้าม hardcode `LINE_CHANNEL_SECRET`, JWT secret, หรือ credential ใดๆ
- ❌ ห้าม Employee เรียก Admin/Manager endpoint และในทางกลับกัน
- ❌ ห้าม `DROP TABLE` / `TRUNCATE` ทุกกรณี
- ✅ ใช้ soft delete (`deleted_at`) เสมอ
- ✅ ทุก API ต้องผ่าน `tenantResolver` middleware
- ✅ LIFF endpoint ต้องผ่าน `liffVerify` middleware ก่อน `auth`
- ✅ ต้อง confirm environment ก่อน migrate (dev / staging / prod)

> ก่อน migrate หรือ deploy ทุกครั้ง ถามก่อนเสมอ:
> "กำลังทำงานบน environment: **[DEV/STAGING/PROD]** — ยืนยันดำเนินการต่อ?"

---

## Testing Expectations

- Unit test ทุก service function
- Integration test ทุก API endpoint หลัก
- Test coverage ขั้นต่ำ 70%
- ใช้ Vitest (Frontend + Backend)
- Mock Line LIFF token verify ใน test environment
- Test file อยู่ใน `__tests__/` หรือ `.test.ts` คู่กับ file จริง

---

## Work Mode (Agent Roles)

ทุก task ที่ซับซ้อน ให้ทำตามลำดับนี้:

1. **🔍 Explorer** — อ่าน codebase ที่เกี่ยวข้อง, ตรวจสอบ `tenant_id` isolation
2. **📐 Planner** — วางแผนไฟล์ที่แก้, ระบุ role ที่ได้รับผลกระทบ
3. **🔨 Builder** — เขียน code ตาม plan
4. **👀 Reviewer** — ตรวจ tenant isolation + role permission ทุก endpoint
5. **🧪 Tester** — เขียน / run test รวมถึง mock LIFF token

ห้ามข้ามขั้นตอน — ถ้าไม่ผ่าน step ใด ให้บอกและรอ confirm

---

## Database Notes (phpMyAdmin / MySQL)

- Charset: `utf8mb4` เสมอ (รองรับภาษาไทย + emoji)
- Timezone: `+07:00` (Asia/Bangkok)
- ทุก table ต้องมี: `id` (UUID), `tenant_id`, `created_at`, `updated_at`, `deleted_at`
- `tenant_id` ต้องมี index บน **ทุก table** ที่มีข้อมูล tenant
- Foreign key ต้องมี index เสมอ
- ชื่อ table: `plural_snake_case`

### Core Tables
```
tenants                  → ข้อมูลลูกค้าแต่ละบริษัท
tenant_line_configs      → LINE_CHANNEL_ID/SECRET per tenant (encrypted)
users                    → Super Admin / Admin / Manager (Web App login)
employees                → พนักงาน + line_user_id mapping
branches                 → สาขาของแต่ละ tenant
shifts                   → กะของแต่ละสาขา
attendance_records       → บันทึกเช็คชื่อ
leave_requests           → คำขอวันลา
leave_balances           → โควต้าวันลาของพนักงาน
holidays                 → วันหยุดของแต่ละ tenant
```

---

## Product Roadmap — TimeLine

> ใช้ section นี้เป็น context ให้ Claude Code รู้ว่าฟีเจอร์ไหนกำลังจะมา
> เพื่อออกแบบ DB / API ให้รองรับล่วงหน้า แม้ยังไม่ implement

### 🟢 Phase 1 — Core (MVP ที่กำลังทำอยู่)
- [x] เช็คอิน / เช็คเอาต์ผ่าน Line LIFF (Shift-based)
- [x] ระบบวันลา (Leave Request) + Approval flow
- [x] จัดการ Branch / Shift / Employee
- [x] Multi-tenant + Line OA per tenant
- [x] Web Dashboard (Admin / Manager / Super Admin)

---

### 🔵 Phase 2 — Engagement (ต่อจาก MVP)

#### ระบบ Line-first
- [ ] **OT Request** — พนักงานขอทำ OT ผ่าน LIFF, Manager approve ผ่าน Line message
- [ ] **Weekly Day-off Scheduling** — พนักงานจองวันหยุดประจำสัปดาห์ผ่าน LIFF (รองรับธุรกิจที่ไม่หยุดเสาร์-อาทิตย์ตายตัว)
- [ ] **Shift Request / Shift Swap** — พนักงานขอเปลี่ยนกะหรือแลกกะ, Manager อนุมัติผ่าน Line
- [ ] **Smart Notification** — แจ้งเตือนพนักงานก่อนเข้างาน, แจ้ง HR เมื่อพบมาสายเกินกำหนดหรือขาดงาน

> **DB Note:** ตาราง `shifts` ต้องรองรับ `overlapping = true` flag และ `day_off_slots` สำหรับ weekly scheduling

#### Document & HR
- [ ] **Document Request** — พนักงานขอใบรับรองเงินเดือน / e-Slip / หนังสือรับรองการทำงานผ่าน LIFF
- [ ] **Expense Claim** — ถ่ายรูปใบเสร็จส่งผ่าน Line, Manager approve ทันที
- [ ] **Anonymous Feedback** — กล่องรับความคิดเห็นแบบไม่ระบุตัวตน

> **DB Note:** ออกแบบ `document_requests` และ `expense_claims` ให้มี `status` + `attachment_url` ตั้งแต่ Phase 1

---

### 🟡 Phase 3 — Intelligence & Scale

#### Analytics & Payroll
- [ ] **Payroll & Smart Deduction** — คำนวณหักเงินอัตโนมัติเมื่อมาสาย (configurable per tenant เช่น มาสาย >15 นาที หัก 50 บาท)
- [ ] **Executive Dashboard** — กราฟ Data Analytics เช่น "แผนกใดมาสายบ่อยสุดในเดือนนี้"
- [ ] **Personal Attendance Report** — พนักงานดูรายงานการเข้างานตัวเองย้อนหลังผ่าน LIFF
- [ ] **Performance / KPI** — เชื่อม attendance data กับระบบประเมินผลประจำปี

> **DB Note:** เตรียม `payroll_configs` (deduction rules per tenant) และ `kpi_records` ให้พร้อม migrate ตั้งแต่ Phase 2

#### Communication
- [ ] **Internal Announcement** — HR broadcast ประกาศวันหยุด / กฎระเบียบใหม่ไปยังพนักงานทุกคนผ่าน Line OA
- [ ] **Direct Message** — HR / หัวหน้าส่งข้อความถึงพนักงานรายบุคคลจาก Web App ไปที่ Line โดยตรง

---

### 🔴 Phase 4 — Reliability & Business

#### UX / Offline
- [ ] **Off-site Check-in** — เช็คอินนอกสถานที่พร้อมบันทึก GPS พิกัด (พนักงานขาย / พนักงานขับรถ)
- [ ] **Offline Fallback** — ถ่ายเซลฟี่ส่งเข้า Line กลุ่ม ระบบดึง Timestamp จากรูปภาพมาบันทึกแทน
- [ ] **LINE Downtime Fallback** — Web Check-in สำรอง (login ด้วยรหัสพนักงาน / เบอร์โทร) เมื่อ Line ล่ม
- [ ] **Account Migration / Recovery** — ระบบ binding เมื่อพนักงานเปลี่ยนเครื่อง / เปลี่ยน Line account

> **DB Note:** `attendance_records` ต้องมี `check_in_method` enum: `LIFF | WEB_FALLBACK | SELFIE | OFFSITE` และ `gps_lat`, `gps_lng` ตั้งแต่ Phase 1

#### Business Model
- [ ] **Freemium / Free Tier** — แพ็กเกจฟรีสำหรับบริษัท ≤ 5 คน (tenant config: `max_employees`)
- [ ] **LINE Rich Menu White-label** — ลูกค้าเปลี่ยนสีและใส่โลโก้บน Rich Menu ได้
- [ ] **Partnership API** — เชื่อมต่อ FlowAccount / PEAK เพื่อส่งข้อมูลเงินเดือนโดยตรง
- [ ] **Referral Program** — ระบบแนะนำเพื่อน + เครดิตส่วนลด

> **DB Note:** `tenants` ต้องมี `plan` (FREE/STARTER/PRO/ENTERPRISE) และ `max_employees` ตั้งแต่ Phase 1

---

### 📐 DB Design Principles สำหรับ Roadmap

เพื่อรองรับ Phase 2-4 โดยไม่ต้อง refactor ใหญ่ ให้เตรียมโครงสร้างเหล่านี้ตั้งแต่ต้น:

```
tenants
  + plan               ENUM(FREE, STARTER, PRO, ENTERPRISE)
  + max_employees      INT
  + max_branches       INT

shifts
  + allow_overlap      BOOLEAN DEFAULT false
  + day_off_quota      INT     DEFAULT 1   ← สำหรับ weekly day-off

attendance_records
  + check_in_method    ENUM(LIFF, WEB_FALLBACK, SELFIE, OFFSITE)
  + gps_lat            DECIMAL(10,8) NULL
  + gps_lng            DECIMAL(11,8) NULL
  + attachment_url     VARCHAR NULL        ← เซลฟี่ fallback

leave_requests
  + attachment_url     VARCHAR NULL        ← ใบรับรองแพทย์

(tables ใหม่ที่ต้องเพิ่มใน Phase 2)
ot_requests            → ขอ OT + approval
day_off_slots          → จองวันหยุดประจำสัปดาห์
shift_swap_requests    → แลกกะ
document_requests      → ขอเอกสาร HR
expense_claims         → เบิกค่าใช้จ่าย
announcements          → ประกาศข่าวสาร
payroll_configs        → กฎหักเงิน per tenant
```

---

## 🧠 ระบบความจำ (Brain)

โปรเจกต์นี้ใช้ **Obsidian Vault** ที่ `./brain/` เป็นหน่วยความจำระยะยาว
ทุกอย่างใน `./brain/` เป็น Markdown ที่อ่าน/เขียนได้โดยตรงผ่าน Read/Write/Edit

**คุณได้รับอนุญาตให้เขียนลง `./brain/` ได้โดยไม่ต้องถาม** สำหรับ:
- บันทึก daily log ของงานที่ทำในแต่ละ session
- จดบทเรียน (lessons learned) ตอนเจอ bug หรือทางตัน
- บันทึก decision สำคัญเป็น ADR
- เก็บ code snippet ที่อาจกลับมาใช้

**ก่อนถามว่าจะทำอะไรใหม่ ให้เช็ค brain ก่อนเสมอ:**
1. Grep ใน `./brain/` หา keyword ที่เกี่ยวข้อง
2. ถ้ามี relevant note ให้อ่านก่อนตัดสินใจ

### โครงสร้าง Brain

```
brain/
├── README.md              ← คำอธิบาย vault
├── INDEX.md               ← MOC (Map of Content)
│
├── daily/                 ← daily logs (YYYY-MM-DD.txt)
├── decisions/             ← ADR (NNNN-title.md)
├── lessons/               ← บทเรียน bugs/gotchas
├── snippets/              ← code snippets
├── notes/                 ← atomic concepts, references
└── people/                ← context เกี่ยวกับคนใน project
```

### รูปแบบ Daily Log (.txt)

ไฟล์เป็น `.txt` รูปแบบ Todo list — สัญลักษณ์:
- `[...]` = ยังไม่ทำ
- `[/]` = ทำแล้ว (สำเร็จ)
- `[x]` = ทำไม่สำเร็จ

```
# YYYY-MM-DD
================

=== HH:MM session ===
Goal: <เป้าหมาย session นี้>

Tasks:
[/] <งานที่ทำสำเร็จ>
[...] <งานที่ยังค้าง>
[x] <งานที่ลองแล้วไม่สำเร็จ — เหตุผล>

Files changed:
- path/to/file — <สิ่งที่แก้>

Notes:
- <decision หรือ lesson สำคัญ ถ้ามี>
```

### Workflow สำหรับ Claude Code

**ตอนเริ่ม session ใหม่:**
1. อ่าน `brain/daily/` ล่าสุด 2-3 ไฟล์ → รู้บริบทล่าสุดของงาน
2. ถ้าผู้ใช้เริ่มถามเรื่องใด ค้น brain ก่อนตอบ

**ระหว่างทำงาน:**
- เจอ bug แล้วแก้ได้ → `/lesson`
- ผู้ใช้ตัดสินใจเชิง architecture → `/decision`
- เขียน code ส่วนที่ reusable → `/snippet`

**ตอนจบ session:** รัน `/log` ก่อน `/clear` เสมอ

### คำสั่งลัด (Slash Commands)

**เริ่ม session — ใช้ก่อนเสมอ**
- `/ctx` ⭐ — โหลด context ทั้งหมด: อ่าน CLAUDE.md + brain vault + งานค้าง

**บันทึกความรู้**
- `/remember <topic>` — บันทึก concept ลง `brain/notes/` (atomic note)
- `/snippet <topic>` — บันทึก code snippet ลง `brain/snippets/`
- `/atomize <filename>` — ตัดโน้ตยาวเป็น atomic notes หลายไฟล์

**บันทึก session**
- `/log` — append session log ลง `brain/daily/<วันนี้>.txt` (Todo format)
- `/lesson` — สร้าง lesson ใหม่จาก bug/ปัญหาที่เพิ่งแก้
- `/decision` — สร้าง ADR ใหม่ลง `brain/decisions/`

**ค้นและสรุป**
- `/recall <query>` — ค้น brain ด้วย keyword
- `/standup` — สร้างสรุป daily standup (Yesterday / Today / Blockers)
- `/retro` — สรุป retrospective รายสัปดาห์จาก daily logs

**จัดการ vault**
- `/brain-index` — สร้าง/อัปเดต `brain/INDEX.md`

### ข้อห้าม (Brain)
- ❌ อย่าเขียน secret, API key, LINE_CHANNEL_SECRET ลง brain
- ❌ อย่าลบไฟล์ใน brain โดยไม่ถาม
- ❌ อย่า commit `brain/` ขึ้น public repo

---

## 📋 Session Log Rule — บังคับทุกครั้งที่เขียนโค้ด

> **กฎนี้มีลำดับความสำคัญสูงสุด — ห้ามข้าม**

**ทุกครั้งที่เขียนหรือแก้ไขโค้ด (ไม่ว่าจะกี่ไฟล์) ต้องอัปเดต `brain/_LOG_VIEW.txt` ด้วยทุกครั้งก่อน response จบ**

### สิ่งที่ต้องเขียนลง _LOG_VIEW.txt

1. **ถ้าเป็นงานชุดใหม่** (session ใหม่หรือ goal ใหม่) → เพิ่ม block `vXXX` ใหม่ต่อท้าย
2. **ถ้าเป็นงานต่อเนื่อง** session เดิม → append เพิ่มใน block ล่าสุด
3. **ทุก block ต้องมี:**
   - หมายเลข version (`v001`, `v002`, …)
   - วันที่ format `DD/MM/YYYY พ.ศ.` หรือ `YYYY-MM-DD`
   - Goal หลักของ session
   - รายการ task ที่ทำ พร้อม `[/]` / `[...]` / `[x]`
   - Files changed พร้อมสรุปสั้นๆ ว่าแก้อะไร
4. **อัปเดต Progress bar** และ **Total session count** ด้านล่าง
5. **อัปเดต Backlog** — ตัดงานที่เสร็จออก, เพิ่มงานใหม่ที่เกิดจาก session นี้

### ตำแหน่งไฟล์

```
brain/_LOG_VIEW.txt   ← ไฟล์เดียว อ่านง่าย ดู progress ภาพรวม
```

### ตัวอย่างการเพิ่ม block ใหม่

```
══════════════════════════════════════════════════════════════════
v006  │  2026-06-01  │  <ชื่อ session>
══════════════════════════════════════════════════════════════════
  Goal: <เป้าหมายหลัก>

  [/] <งานที่ทำสำเร็จ>
  [...] <งานที่ยังค้าง>
  [x] <งานที่ล้มเหลว — เหตุผล>

  Files:
    · path/to/file — <สิ่งที่แก้>
──────────────────────────────────────────────────────────────────
```

> ถ้าลืมอัปเดต log → ผู้ใช้จะไม่เห็น progress และ context ระหว่าง session จะขาดหาย

---

## When Done — Summary Format

```
✅ สิ่งที่เปลี่ยนแปลง:
- [ไฟล์ที่แก้]

🎯 เหตุผล:
- [ทำไมถึงเลือกแนวทางนี้]

🔐 Tenant Isolation:
- [ยืนยันว่า query ทุกตัวมี tenant_id filter]

🧪 สิ่งที่ควร Test:
- [test case สำคัญ รวมถึง LIFF mock]

⚠️ สิ่งที่ต้องระวัง:
- [edge case หรือ dependency]
```
