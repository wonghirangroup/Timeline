---
tags: [architecture, multi-tenant, overview]
---

# Architecture — Multi-Tenant SaaS

← [[00-HOME]]

## หลักการ Multi-Tenant

```
Vendor (Super Admin)
  └── Tenant A (บริษัท A)
  │     ├── Branch A1, A2
  │     ├── Shift → ผูกกับ Branch
  │     ├── Employee → สังกัด Branch
  │     └── Line OA ของ Tenant A
  └── Tenant B (บริษัท B)
        ├── Branch B1
        └── Line OA ของ Tenant B
```

- ทุก table มี `tenant_id` — ห้าม query ข้าม tenant เด็ดขาด
- ทุก service method รับ `tenantId` เป็น param เสมอ

## Request Flow

```
HTTP Request
  → resolveTenant middleware  (attach req.tenantId จาก JWT หรือ LIFF)
  → rbac middleware           (ตรวจ role)
  → route handler
  → service                  (query ด้วย tenantId เสมอ)
  → Prisma (MySQL)
```

### Web App Flow (Admin/Manager/Super Admin)
```
POST /api/v1/auth/login
→ JWT access + refresh token
→ ทุก request แนบ Bearer token
→ tenantMiddleware decode JWT → req.tenantId, req.userRole
```

### LIFF Flow (Employee)
```
Employee เปิด Line OA
→ กด Check-in → เปิด LIFF App
→ liff.init() + liff.login()
→ ได้ line_user_id + liff_access_token
→ POST /api/v1/employee/attendance/check-in
   Headers: x-liff-token, x-line-user-id, x-line-channel-id
→ liffMiddleware: verify token → lookup employee → attach req.tenantId, req.employeeId
```

## Monorepo Structure

```
Timeline/
├── server/          ← Fastify API (port 3000)
├── admin/           ← React Web App — Admin/Manager (port 8081)
├── employee/        ← React LIFF App — Employee only (port 8082)
├── superadmin/      ← React Web App — Super Admin (port 8083)
├── shared/
│   └── types/       ← TypeScript types ใช้ร่วมกัน
└── docs/
    └── obsidian/    ← vault นี้
```

## Port Map

| Service | Port | สำหรับ |
|---------|------|--------|
| server (API) | 3000 | ทุก client |
| admin UI | 8081 | Admin, Manager |
| employee LIFF | 8082 | Employee (ฝัง Line) |
| superadmin UI | 8083 | Super Admin (Vendor) |

## Related Notes

- [[02-Database]] — DB schema ทุก model
- [[06-Middleware]] — tenant / liff / rbac middleware code
- [[04-Roles-Permissions]] — role permission matrix
- [[05-Line-Integration]] — LIFF + Line OA setup
- [[12-Docker-Setup]] — รัน local ด้วย Docker
