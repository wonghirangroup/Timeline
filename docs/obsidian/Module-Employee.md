---
tags: [module, employee]
---

# Module: Employee

← [[00-HOME]] | Files: `server/src/modules/employee/`

## ภาพรวม

จัดการข้อมูลพนักงาน + mapping Line UID

## Files

| File | สถานะ |
|------|-------|
| `employee.route.ts` | TODO |
| `employee.service.ts` | TODO |
| `employee.schema.ts` | TODO |

## API Routes

```
GET    /api/v1/admin/employees?branchId=&page=&limit=
POST   /api/v1/admin/employees
GET    /api/v1/admin/employees/:id
PATCH  /api/v1/admin/employees/:id
DELETE /api/v1/admin/employees/:id   (soft delete)

# Line Verify
POST   /api/v1/admin/employees/:id/send-verify-link
PATCH  /api/v1/employee/verify-line   (LIFF — ส่ง lineUserId)
```

## Service Methods (TODO)

```typescript
listEmployees(tenantId: string, branchId?: string, page, limit): Promise<Employee[]>
createEmployee(tenantId: string, data): Promise<Employee>
updateEmployee(tenantId: string, employeeId: string, data): Promise<Employee>
softDeleteEmployee(tenantId: string, employeeId: string): Promise<void>
sendVerifyLink(employeeId: string): Promise<void>
mapLineUserId(tenantId: string, employeeCode: string, lineUserId: string): Promise<void>
```

## DB Schema

```prisma
model Employee {
  tenant_id     String
  branch_id     String
  employee_code String
  line_user_id  String?   // null จนกว่าจะ verify
  @@unique([tenant_id, employee_code])
  @@unique([tenant_id, line_user_id])
}
```

→ [[02-Database#Employee]]

## Line Mapping Flow

```
1. Admin สร้าง Employee (line_user_id = null)
2. Admin กด "ส่งลิงก์ verify"
   → ระบบส่ง Line message ให้พนักงาน
3. พนักงานกดลิงก์ → เปิด LIFF verify page
4. LIFF เรียก liff.getProfile() → lineUserId
5. PATCH /api/v1/employee/verify-line
6. ระบบ map employee_id ↔ line_user_id
```

ถ้า `line_user_id` ยังไม่ map → LIFF แสดง "กรุณายืนยันตัวตน" (`EMPLOYEE_NOT_MAPPED`)

→ [[05-Line-Integration#Employee ↔ Line UID Mapping]]

## Related

- [[Module-Branch]] — Employee สังกัด Branch
- [[Module-Attendance]] — บันทึกเช็คชื่อของ Employee
- [[Module-Leave]] — วันลาของ Employee
- [[08-Frontend-LIFF]] — LIFF app ที่ Employee ใช้
