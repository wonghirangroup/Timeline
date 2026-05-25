---
tags: [roles, permissions, rbac, auth]
---

# Roles & Permissions

← [[00-HOME]] | Middleware: [[06-Middleware#RBAC]]

## 4 Roles

| Role | ใคร | App |
|------|-----|-----|
| `SUPER_ADMIN` | Vendor (ทีมเรา) | Web App |
| `ADMIN` | บริษัทลูกค้า (1 คนต่อ tenant) | Web App |
| `MANAGER` | หัวหน้า Branch | Web App |
| `EMPLOYEE` | พนักงาน | Line LIFF เท่านั้น |

> **หมายเหตุ**: MANAGER กับ ADMIN มี permission เหมือนกัน — ต่างกันแค่ scope (Branch vs ทุก Branch ใน tenant)

---

## Permission Matrix

| Action | SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE |
|--------|:-----------:|:-----:|:-------:|:--------:|
| จัดการ Tenant | ✅ | ❌ | ❌ | ❌ |
| Setup Line OA | ✅ | ❌ | ❌ | ❌ |
| จัดการ Branch/Shift | ✅ | ✅ | ❌ | ❌ |
| จัดการ Employee | ✅ | ✅ | ❌ | ❌ |
| ดูรายงานทุก Branch | ✅ | ✅ | ❌ | ❌ |
| ดูรายงาน Branch ตัวเอง | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject Leave | ✅ | ✅ | ✅ | ❌ |
| เช็คอิน / เช็คเอาต์ | ❌ | ❌ | ❌ | ✅ |
| ยื่นใบลา | ❌ | ❌ | ❌ | ✅ |
| ดูข้อมูลตัวเอง | ❌ | ❌ | ❌ | ✅ |

---

## Middleware Chain

### Web App (Admin / Manager / Super Admin)
```
Request
→ tenantMiddleware      ← verify JWT, attach req.tenantId, req.userRole
→ requireRole(...)      ← check role
→ handler
```

### LIFF (Employee)
```
Request
→ liffMiddleware        ← verify LIFF token, resolve employee
→ handler               (ไม่ต้องมี requireRole — employee เข้าได้ route เดียว)
```

---

## Route Prefix ↔ Role

| Prefix | Roles allowed |
|--------|--------------|
| `/api/v1/super-admin/` | SUPER_ADMIN |
| `/api/v1/admin/` | ADMIN, SUPER_ADMIN |
| `/api/v1/manager/` | MANAGER, ADMIN, SUPER_ADMIN |
| `/api/v1/employee/` | EMPLOYEE (via LIFF token) |
| `/api/v1/auth/` | Public |
| `/api/v1/line/webhook` | Public (verified by Line signature) |

---

## RBAC Implementation

```typescript
// server/src/common/middleware/rbac.ts
export function requireRole(...roles: string[]) {
  return async (req, reply) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์เข้าถึง' }
      })
    }
  }
}
```

---

## Manager Scope Rule

Manager `approve` leave ได้เฉพาะพนักงานใน Branch ที่ตัวเองดูแล:

```typescript
// ตรวจว่า manager มี branch_id นี้
const isManagedBranch = await prisma.branchManager.findFirst({
  where: { user_id: req.userId, branch_id: employee.branch_id }
})
if (!isManagedBranch) return reply.status(403).send(...)
```

→ [[Module-Leave]] | [[02-Database#BranchManager]]
