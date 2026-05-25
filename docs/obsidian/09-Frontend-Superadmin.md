---
tags: [frontend, superadmin, vendor, react]
---

# Frontend — Super Admin Web App

← [[00-HOME]] | Path: `superadmin/` | Port: 8083

## ใช้สำหรับ

Vendor (ทีมเรา) เท่านั้น — จัดการ tenant ทุกบริษัทลูกค้า

---

## Tech Stack

- React + Vite
- Tailwind CSS v4
- shadcn/ui
- Zustand + React Query
- Axios (JWT)

---

## Features

| Feature | Description |
|---------|-------------|
| Tenant List | ดู/สร้าง/ระงับ tenant ทั้งหมด |
| Tenant Detail | plan, max_employees, is_active |
| Line OA Setup | ตั้งค่า LINE_CHANNEL_ID, SECRET, LIFF ID per tenant |
| White-label | logo_url, primary_color per tenant |
| Dashboard | ภาพรวมทุก tenant (จำนวน employee, active check-ins) |

---

## API Routes ที่ใช้

→ [[03-API-Routes#Super Admin]]

```
GET  /api/v1/super-admin/tenants
POST /api/v1/super-admin/tenants
GET  /api/v1/super-admin/tenants/:id
PUT  /api/v1/super-admin/tenants/:id/line-config
```

---

## Env Variables

```
VITE_API_URL=http://localhost:3000
```

---

## Notes

- ไม่มี `tenant_id` header — Super Admin เข้าถึงข้อมูล cross-tenant ได้
- JWT payload มี `role: 'SUPER_ADMIN'` และ `tenant_id: null`

→ [[Module-Tenant]] | [[04-Roles-Permissions]]
