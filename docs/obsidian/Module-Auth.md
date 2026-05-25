---
tags: [module, auth, jwt, login]
---

# Module: Auth

← [[00-HOME]] | Files: `server/src/modules/auth/` (TODO — ยังไม่มีไฟล์)

## ภาพรวม

JWT authentication สำหรับ Web App (Admin/Manager/Super Admin)  
Employee ไม่ผ่าน Auth module — ใช้ LIFF token แทน

## API Routes (TODO)

```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

## Login Flow

```typescript
// POST /api/v1/auth/login
// Body: { email, password }

1. lookup User จาก email + tenant_id (Super Admin: tenant_id = null)
2. verify bcrypt password
3. issue Access Token (short-lived, 15m)
4. issue Refresh Token (long-lived, 7d)
5. return { access_token, refresh_token, user }
```

## JWT Payload

```typescript
{
  tenant_id:  string | null   // null สำหรับ SUPER_ADMIN
  user_id:    string
  role:       'SUPER_ADMIN' | 'ADMIN' | 'MANAGER'
  exp:        number
}
```

→ decode โดย [[06-Middleware#tenantMiddleware]]

## Refresh Token Flow

```
POST /api/v1/auth/refresh
Header: Authorization: Bearer <refresh_token>
→ verify refresh token
→ issue new access token
```

## Env Variables

```
JWT_ACCESS_SECRET=...    # sign access token
JWT_SECRET=...           # sign refresh token
```

→ [[12-Docker-Setup]]

## Related

- [[06-Middleware]] — tenantMiddleware decode JWT
- [[04-Roles-Permissions]] — roles ใน JWT
- [[07-Frontend-Admin]] — Admin app เก็บ token ใน localStorage
