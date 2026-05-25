---
tags: [types, typescript, shared]
---

# Shared Types

← [[00-HOME]] | File: `shared/types/index.ts`

## ใช้ร่วมกัน Frontend ↔ Backend

```typescript
// shared/types/index.ts

export type UserRole      = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
export type LeaveType     = 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
export type LeaveStatus   = 'PENDING' | 'APPROVED' | 'REJECTED'
export type TenantPlan    = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
export type CheckInMethod = 'LIFF' | 'WEB_FALLBACK' | 'SELFIE' | 'OFFSITE'

export interface ApiResponse<T> {
  success:    boolean
  data:       T
  message:    string
  pagination?: { page: number; limit: number; total: number }
}

export interface ApiError {
  success: false
  error:   { code: string; message: string }
}
```

---

## Mapping กับ Prisma Enums

| Shared Type | Prisma Enum | ใช้ที่ |
|-------------|-------------|--------|
| `UserRole` | `UserRole` | `users.role` |
| `LeaveType` | `LeaveType` | `leave_requests.leave_type`, `leave_balances.leave_type` |
| `LeaveStatus` | `LeaveStatus` | `leave_requests.status`, `ot_requests.status` |
| `TenantPlan` | `TenantPlan` | `tenants.plan` |
| `CheckInMethod` | `CheckInMethod` | `attendance_records.check_in_method` |

→ [[02-Database]]

---

## ApiResponse Pattern

ทุก API endpoint return `ApiResponse<T>` หรือ `ApiError`:

```typescript
// Success — paginated list
return paginated(employees, total, page, limit)
// { success: true, data: [...], pagination: {...} }

// Success — single item
return ok(employee)
// { success: true, data: {...}, message: 'success' }

// Error
return fail('EMPLOYEE_NOT_FOUND', 'ไม่พบพนักงาน')
// { success: false, error: { code: '...', message: '...' } }
```

→ `server/src/common/utils/response.ts` — ดู [[06-Middleware#Response Helpers]]

---

## Zod Schemas (Validation)

แต่ละ module มี `*.schema.ts` ที่ใช้ Zod validate:

| Module | Schema File |
|--------|-------------|
| Employee | `server/src/modules/employee/employee.schema.ts` |
| Attendance | `server/src/modules/attendance/attendance.schema.ts` |
| Leave | `server/src/modules/leave/leave.schema.ts` |
| Shift | `server/src/modules/shift/shift.schema.ts` |
| Branch | `server/src/modules/branch/branch.schema.ts` |
| Tenant | `server/src/modules/tenant/tenant.schema.ts` |
| OT | `server/src/modules/ot/ot.schema.ts` |
| Announcement | `server/src/modules/announcement/announcement.schema.ts` |
| Line | `server/src/modules/line/line.schema.ts` |

> ทุก schema file ยัง TODO — รอ implement
