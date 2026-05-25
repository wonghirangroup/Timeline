---
tags: [business-rules, logic, constraints]
---

# Business Rules

← [[00-HOME]]

## Attendance (เช็คชื่อ)

| Rule | Detail |
|------|--------|
| LIFF only | เช็คอินได้ผ่าน Line LIFF เท่านั้น — ห้ามมี endpoint จาก Web App |
| ไม่ duplicate | `UNIQUE(employee_id, shift_id, date)` — ห้าม check-in ซ้ำกะเดียวกัน |
| Multi-shift | พนักงาน 1 คน มีได้หลาย shift ต่อวัน (คนละ shift_id) |
| Shift → Branch | Shift ต้องผูกกับ Branch และ Tenant เสมอ |
| Timezone | timestamp ต้องมี timezone Asia/Bangkok |
| Late threshold | คำนวณจาก `shift_start_time + late_threshold (minutes)` |
| GPS (Phase 4) | เก็บ `gps_lat`, `gps_lng` — ยังไม่ enforce ใน Phase 1 |

**Error**: `CHECKIN_DUPLICATE` เมื่อ check-in ซ้ำ

→ [[Module-Attendance]] | [[02-Database#AttendanceRecord]]

---

## Leave (วันลา)

| Rule | Detail |
|------|--------|
| ประเภทลา | SICK, PERSONAL, VACATION, MATERNITY |
| Approval flow | `PENDING → APPROVED / REJECTED` |
| Manager scope | Approve ได้เฉพาะพนักงานใน Branch ตัวเอง |
| Balance | วันลาหักจาก `leave_balance` ของพนักงาน |
| ห้ามย้อนหลัง | ลาย้อนหลังได้ไม่เกิน 3 วัน (configurable per tenant) |
| Line notify | แจ้ง Manager ผ่าน Line Messaging API เมื่อมี leave request ใหม่ |
| ห้ามทับซ้อน | ลาในช่วงเวลาเดิมซ้ำไม่ได้ |
| ใบรับรองแพทย์ | ลาป่วยแนบ `attachment_url` ได้ |

**Error Codes**:
- `LEAVE_OVERLAP` — วันลาทับซ้อน
- `LEAVE_BALANCE_INSUFFICIENT` — โควต้าไม่พอ
- `LEAVE_BACKDATED` — ย้อนหลังเกินกำหนด

→ [[Module-Leave]] | [[02-Database#LeaveRequest]]

---

## Branch & Tenant

| Rule | Detail |
|------|--------|
| Employee สังกัด Branch เดียว | ในช่วงเวลาหนึ่ง (1 branch_id) |
| Manager scope | ดูได้เฉพาะ Branch ที่ assign ใน `BranchManager` |
| Admin scope | ดูได้ทุก Branch ใน tenant เดียวกัน |
| Super Admin | ดูได้ทุก tenant |
| Line OA | 1 tenant = 1 Line OA (1 `line_channel_id`) |
| Tenant plan limit | `max_employees`, `max_branches` per plan |

→ [[Module-Branch]] | [[Module-Tenant]] | [[04-Roles-Permissions]]

---

## OT (Phase 2)

- Request OT → approve flow เหมือน Leave
- เก็บ `start_time`, `end_time`, `hours` แยกจาก Attendance
- Manager approve ได้เฉพาะ Branch ตัวเอง

→ [[Module-OT]]

---

## Safety Guardrails

```
❌  ห้าม DELETE โดยไม่มี WHERE tenant_id = ?
❌  ห้าม query ข้ามข้อมูล tenant (ไม่มี tenant_id filter = bug ร้ายแรง)
❌  ห้าม hardcode LINE_CHANNEL_SECRET, JWT secret
❌  ห้าม Employee เรียก Admin/Manager endpoint
❌  ห้าม DROP TABLE / TRUNCATE
✅  ใช้ soft delete (deleted_at) เสมอ
✅  ทุก API ต้องผ่าน tenantResolver middleware
✅  LIFF endpoint ต้องผ่าน liffVerify ก่อน
✅  confirm environment ก่อน migrate: DEV / STAGING / PROD
```

---

## Migration Policy

> ก่อน migrate หรือ deploy ทุกครั้ง ถามก่อนเสมอ:
> **"กำลังทำงานบน environment: [DEV/STAGING/PROD] — ยืนยันดำเนินการต่อ?"**

→ [[12-Docker-Setup]]
