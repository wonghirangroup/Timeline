---
tags: [home, index]
---

# TimeLine — HR Attendance & Leave Management

> Multi-tenant SaaS สำหรับ Vendor ขายระบบให้ลูกค้าหลายบริษัท

## Quick Navigation

| หมวด | Note |
|------|------|
| ภาพรวมระบบ | [[01-Architecture]] |
| Database Schema | [[02-Database]] |
| API Routes ทั้งหมด | [[03-API-Routes]] |
| Roles & Permissions | [[04-Roles-Permissions]] |
| Line Integration | [[05-Line-Integration]] |
| Middleware | [[06-Middleware]] |
| Frontend — Admin/Manager | [[07-Frontend-Admin]] |
| Frontend — LIFF (Employee) | [[08-Frontend-LIFF]] |
| Frontend — Super Admin | [[09-Frontend-Superadmin]] |
| Business Rules | [[10-Business-Rules]] |
| Shared Types | [[11-Shared-Types]] |
| Docker & Setup | [[12-Docker-Setup]] |

## Modules (Backend)

| Module | Note |
|--------|------|
| Tenant | [[Module-Tenant]] |
| Branch | [[Module-Branch]] |
| Shift | [[Module-Shift]] |
| Employee | [[Module-Employee]] |
| Attendance | [[Module-Attendance]] |
| Leave | [[Module-Leave]] |
| OT (Phase 2) | [[Module-OT]] |
| Announcement (Phase 2) | [[Module-Announcement]] |
| Line OA / Webhook | [[Module-Line]] |
| Auth | [[Module-Auth]] |

## Tech Stack

- **Backend**: Fastify v4 · TypeScript · Prisma (MySQL)
- **Frontend**: React + Vite · Tailwind CSS v4 · shadcn/ui · Zustand · React Query
- **Auth**: JWT (Web) + Line LIFF Token (Employee)
- **Date**: dayjs — timezone Asia/Bangkok
- **Validation**: Zod (shared frontend ↔ backend)

## 4 Roles

```
SUPER_ADMIN  → Vendor (ทีมเรา)
ADMIN        → ลูกค้าแต่ละ tenant
MANAGER      → ดูแล Branch (= permission เดียวกับ ADMIN ต่อ Branch)
EMPLOYEE     → ใช้ LIFF เท่านั้น — ไม่มี Web App
```

→ ดู [[04-Roles-Permissions]] สำหรับ Permission Matrix เต็ม

## สถานะโปรเจกต์

- [x] Prisma Schema ครบทุก model
- [x] Middleware: tenant, liff, rbac
- [x] Attendance stub route (check-in/check-out)
- [ ] Service layer ทุก module (TODO)
- [ ] Admin UI mockup
- [ ] LIFF UI mockup → เสร็จแล้ว (ดู [[08-Frontend-LIFF]])
