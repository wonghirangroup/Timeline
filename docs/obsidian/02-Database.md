---
tags: [database, prisma, mysql, schema]
---

# Database Schema

← [[00-HOME]] | Schema: `server/src/prisma/schema.prisma`

## กฎทั่วไป

- Charset: `utf8mb4` (รองรับภาษาไทย + emoji)
- Timezone: `+07:00` (Asia/Bangkok)
- ทุก table มี `id` (UUID), `tenant_id`, `created_at`, `updated_at`, `deleted_at`
- Soft delete ด้วย `deleted_at` — ห้าม `DELETE` / `TRUNCATE`
- `tenant_id` มี index ทุก table

---

## Model Map

```
Tenant
  ├── TenantLineConfig   (1:1)
  ├── User[]             (Admin/Manager — Web App)
  ├── Branch[]
  │     ├── BranchManager[]  (User ↔ Branch)
  │     ├── Shift[]
  │     └── Employee[]
  │           ├── AttendanceRecord[]
  │           ├── LeaveRequest[]
  │           ├── LeaveBalance[]
  │           └── OtRequest[]
  ├── Holiday[]
  └── Announcement[]
```

---

## Tenant

```prisma
model Tenant {
  id            String      @id @default(uuid())
  name          String
  plan          TenantPlan  @default(FREE)   // FREE | STARTER | PRO | ENTERPRISE
  max_employees Int         @default(5)
  max_branches  Int         @default(1)
  is_active     Boolean     @default(true)
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt
  deleted_at    DateTime?
}
```
→ ดูการจัดการ tenant ที่ [[Module-Tenant]]

## TenantLineConfig

```prisma
model TenantLineConfig {
  tenant_id           String   @unique
  line_channel_id     String
  line_channel_secret String   // encrypted at rest
  line_liff_id        String
  rich_menu_id        String?
  logo_url            String?  // white-label
  primary_color       String?  // white-label
}
```
→ 1 tenant = 1 Line OA — ดู [[05-Line-Integration]]

## User (Web App Login)

```prisma
model User {
  tenant_id  String?   // null = SUPER_ADMIN
  email      String    @unique
  password   String    // bcrypt hashed
  role       UserRole  // SUPER_ADMIN | ADMIN | MANAGER
}
```
→ EMPLOYEE ไม่มีใน `users` — ใช้ Line UID แทน — ดู [[Module-Employee]]

## Employee (LIFF Login)

```prisma
model Employee {
  tenant_id     String
  branch_id     String
  employee_code String
  line_user_id  String?   // null จนกว่าจะ verify Line
  @@unique([tenant_id, employee_code])
  @@unique([tenant_id, line_user_id])
}
```
→ Mapping flow: Admin เพิ่ม employee → ส่งลิงก์ Line verify → ได้ `line_user_id`

## Branch

```prisma
model Branch {
  tenant_id  String
  name       String
  location   String?
}
model BranchManager {
  branch_id String
  user_id   String
  @@unique([branch_id, user_id])
}
```
→ Manager เห็นเฉพาะ Branch ที่ assign ใน `BranchManager`

## Shift

```prisma
model Shift {
  tenant_id      String
  branch_id      String
  name           String
  start_time     String   // "08:00"
  end_time       String   // "17:00"
  late_threshold Int      @default(15)   // นาที
  allow_overlap  Boolean  @default(false) // Phase 2
  day_off_quota  Int      @default(1)     // Phase 2
}
```

## AttendanceRecord

```prisma
model AttendanceRecord {
  tenant_id       String
  employee_id     String
  shift_id        String
  date            DateTime  @db.Date
  check_in_at     DateTime?
  check_out_at    DateTime?
  check_in_method CheckInMethod  // LIFF | WEB_FALLBACK | SELFIE | OFFSITE
  is_late         Boolean
  late_minutes    Int
  gps_lat         Decimal?  // Phase 4
  gps_lng         Decimal?  // Phase 4
  @@unique([employee_id, shift_id, date])  // ห้าม check-in ซ้ำ
}
```
→ ดู business rule ที่ [[10-Business-Rules]] | route ที่ [[Module-Attendance]]

## LeaveRequest

```prisma
model LeaveRequest {
  tenant_id   String
  employee_id String
  leave_type  LeaveType    // SICK | PERSONAL | VACATION | MATERNITY
  start_date  DateTime
  end_date    DateTime
  days        Int
  status      LeaveStatus  @default(PENDING)  // PENDING | APPROVED | REJECTED
  reviewed_by String?      // user_id
  reject_note String?
}
```
→ ดู flow ที่ [[Module-Leave]] | balance ที่ [[#LeaveBalance]]

## LeaveBalance

```prisma
model LeaveBalance {
  employee_id String
  leave_type  LeaveType
  year        Int
  total_days  Int
  used_days   Int  @default(0)
  @@unique([employee_id, leave_type, year])
}
```

## OtRequest (Phase 2)

```prisma
model OtRequest {
  tenant_id   String
  employee_id String
  date        DateTime
  start_time  String
  end_time    String
  hours       Decimal
  status      LeaveStatus  @default(PENDING)
}
```
→ ดู [[Module-OT]]

## Holiday

```prisma
model Holiday {
  tenant_id String
  name      String
  date      DateTime @db.Date
}
```

## Announcement (Phase 2)

```prisma
model Announcement {
  tenant_id  String
  title      String
  content    String @db.Text
  send_line  Boolean  // broadcast ผ่าน Line ด้วย
  created_by String   // user_id
}
```
→ ดู [[Module-Announcement]]

---

## Enums

| Enum | Values |
|------|--------|
| `TenantPlan` | FREE, STARTER, PRO, ENTERPRISE |
| `UserRole` | SUPER_ADMIN, ADMIN, MANAGER |
| `LeaveType` | SICK, PERSONAL, VACATION, MATERNITY |
| `LeaveStatus` | PENDING, APPROVED, REJECTED |
| `CheckInMethod` | LIFF, WEB_FALLBACK, SELFIE, OFFSITE |

→ TypeScript types ดู [[11-Shared-Types]]
