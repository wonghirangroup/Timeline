---
tags: [middleware, auth, tenant, liff, rbac]
---

# Middleware

← [[00-HOME]] | Files: `server/src/common/middleware/`

## ภาพรวม

```
Web Request  → tenantMiddleware → requireRole() → handler
LIFF Request → liffMiddleware              → handler
Line Webhook → lineSignatureVerify         → handler
```

---

## tenantMiddleware

**File**: `server/src/common/middleware/tenant.ts`

```typescript
export async function tenantMiddleware(req, reply) {
  const payload = await req.jwtVerify<{
    tenant_id:   string
    user_id?:    string
    role?:       string
    employee_id?: string
  }>()
  req.tenantId   = payload.tenant_id ?? ''
  req.userId     = payload.user_id
  req.userRole   = payload.role
  req.employeeId = payload.employee_id
}
```

**Fastify Request Extensions:**
- `req.tenantId` — ทุก handler ใช้สำหรับ query isolation
- `req.userId` — Web App user (Admin/Manager/Super Admin)
- `req.userRole` — สำหรับ requireRole check
- `req.employeeId` — LIFF employee

---

## liffMiddleware

**File**: `server/src/common/middleware/liff.ts`

ใช้กับ Employee routes ทุกตัว แทน tenantMiddleware

**Steps:**
1. ตรวจ headers: `x-liff-token`, `x-line-user-id`, `x-line-channel-id`
2. Lookup `TenantLineConfig` จาก `line_channel_id` → ได้ `tenant_id`
3. Verify LIFF token กับ Line API (`https://api.line.me/oauth2/v2.1/verify`)
4. Lookup `Employee` จาก `tenant_id + line_user_id`
5. Set `req.tenantId` และ `req.employeeId`

**Error Codes:**
| Code | เมื่อ |
|------|-------|
| `LIFF_MISSING_HEADERS` | header ขาด |
| `TENANT_NOT_FOUND` | ไม่พบ `line_channel_id` ใน DB |
| `LIFF_INVALID_TOKEN` | token verify fail |
| `EMPLOYEE_NOT_MAPPED` | `line_user_id` ยังไม่ถูก map |

→ ดู flow เต็มที่ [[05-Line-Integration]]

---

## RBAC — requireRole

**File**: `server/src/common/middleware/rbac.ts`

```typescript
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

**ใช้งาน:**
```typescript
app.get('/admin/employees', {
  preHandler: [tenantMiddleware, requireRole('ADMIN', 'SUPER_ADMIN')]
}, handler)
```

→ ดู [[04-Roles-Permissions]]

---

## auth Middleware (JWT)

ยังไม่ implement — จะใช้ `@fastify/jwt`

**Login Flow:**
```
POST /api/v1/auth/login
→ verify email + bcrypt password
→ issue JWT { tenant_id, user_id, role }
→ issue Refresh Token (separate table หรือ Redis)
```

→ [[Module-Auth]]

---

## Response Helpers

**File**: `server/src/common/utils/response.ts`

```typescript
ok(data, message?)          // { success: true, data, message }
paginated(data, total, p, l) // + pagination object
fail(code, message)          // { success: false, error: { code, message } }
```

ใช้ในทุก handler แทน manual JSON construction
