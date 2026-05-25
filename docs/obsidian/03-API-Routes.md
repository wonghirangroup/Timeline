---
tags: [api, routes, rest]
---

# API Routes

← [[00-HOME]] | Base: `/api/v1/`

## Response Format มาตรฐาน

```json
// Success
{ "success": true, "data": {}, "message": "string",
  "pagination": { "page": 1, "limit": 20, "total": 100 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```
→ helper: `server/src/common/utils/response.ts` → `ok()`, `paginated()`, `fail()`

---

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Web App login → JWT |
| POST | `/api/v1/auth/refresh` | refresh access token |

→ [[Module-Auth]]

---

## Super Admin `/api/v1/super-admin/`

Middleware: JWT + `requireRole('SUPER_ADMIN')`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tenants` | list ทุก tenant |
| POST | `/tenants` | สร้าง tenant ใหม่ |
| GET | `/tenants/:id` | ดู tenant |
| PATCH | `/tenants/:id` | แก้ไข tenant |
| DELETE | `/tenants/:id` | soft delete tenant |
| GET | `/tenants/:id/line-config` | ดู Line config |
| PUT | `/tenants/:id/line-config` | setup/update Line OA |

→ [[Module-Tenant]] | [[05-Line-Integration]]

---

## Admin `/api/v1/admin/`

Middleware: JWT + `requireRole('ADMIN', 'SUPER_ADMIN')`  
> Manager มี permission เดียวกับ Admin — ดู [[04-Roles-Permissions]]

### Branch
| Method | Path | Description |
|--------|------|-------------|
| GET | `/branches` | list branches ใน tenant |
| POST | `/branches` | สร้าง branch |
| GET | `/branches/:id` | ดู branch |
| PATCH | `/branches/:id` | แก้ไข branch |
| DELETE | `/branches/:id` | soft delete |

→ [[Module-Branch]]

### Shift
| Method | Path | Description |
|--------|------|-------------|
| GET | `/shifts?branchId=` | list shifts |
| POST | `/shifts` | สร้าง shift |
| PATCH | `/shifts/:id` | แก้ไข shift |
| DELETE | `/shifts/:id` | soft delete |

→ [[Module-Shift]]

### Employee
| Method | Path | Description |
|--------|------|-------------|
| GET | `/employees?branchId=` | list employees |
| POST | `/employees` | เพิ่มพนักงาน |
| GET | `/employees/:id` | ดูพนักงาน |
| PATCH | `/employees/:id` | แก้ไขพนักงาน |
| DELETE | `/employees/:id` | soft delete |
| POST | `/employees/:id/send-verify-link` | ส่งลิงก์ Line verify |

→ [[Module-Employee]]

### Holiday
| Method | Path | Description |
|--------|------|-------------|
| GET | `/holidays?year=` | list holidays |
| POST | `/holidays` | เพิ่มวันหยุด |
| DELETE | `/holidays/:id` | ลบ |

### Leave Requests (Admin view)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/leave-requests?status=&branchId=` | list ทุก branch |
| GET | `/leave-requests/:id` | ดูรายละเอียด |
| POST | `/leave-requests/:id/approve` | อนุมัติ |
| POST | `/leave-requests/:id/reject` | ปฏิเสธ |

→ [[Module-Leave]]

### Attendance Report (Admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance?branchId=&date=&shiftId=` | รายงานเช็คชื่อ |

→ [[Module-Attendance]]

### Announcement (Phase 2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/announcements` | list |
| POST | `/announcements` | สร้าง + optional Line broadcast |

→ [[Module-Announcement]]

---

## Manager `/api/v1/manager/`

Middleware: JWT + `requireRole('MANAGER', 'ADMIN', 'SUPER_ADMIN')`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance?branchId=&date=` | รายงาน Branch ตัวเอง |
| GET | `/leave-requests?status=` | leave requests ใน Branch |
| POST | `/leave-requests/:id/approve` | อนุมัติ (เฉพาะ Branch ตัวเอง) |
| POST | `/leave-requests/:id/reject` | ปฏิเสธ |

→ [[Module-Leave]] | [[Module-Attendance]]

---

## Employee `/api/v1/employee/`

Middleware: `liffMiddleware` → ใช้ LIFF token เท่านั้น ❌ ห้าม JWT

| Method | Path | Description |
|--------|------|-------------|
| POST | `/attendance/check-in` | เช็คอิน (LIFF only) |
| POST | `/attendance/check-out` | เช็คเอาต์ (LIFF only) |
| GET | `/attendance/history` | ประวัติของตัวเอง |
| GET | `/leave-requests` | list วันลาของตัวเอง |
| POST | `/leave-requests` | ยื่นใบลา |
| GET | `/leave-balances` | โควต้าวันลาคงเหลือ |

→ [[Module-Attendance]] | [[Module-Leave]] | [[08-Frontend-LIFF]]

---

## Line Webhook `/api/v1/line/`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook` | รับ event จาก Line OA |

→ [[Module-Line]] | [[05-Line-Integration]]

---

## Error Codes สำคัญ

| Code | ความหมาย |
|------|----------|
| `UNAUTHORIZED` | ไม่มี/invalid token |
| `FORBIDDEN` | role ไม่มีสิทธิ์ |
| `LIFF_MISSING_HEADERS` | ขาด x-liff-token header |
| `LIFF_INVALID_TOKEN` | LIFF token ไม่ถูกต้อง |
| `TENANT_NOT_FOUND` | ไม่พบ Line channel ใน DB |
| `EMPLOYEE_NOT_MAPPED` | line_user_id ยังไม่ verify |
| `LEAVE_OVERLAP` | วันลาทับซ้อน |
| `CHECKIN_DUPLICATE` | check-in ซ้ำกะเดียวกัน |
