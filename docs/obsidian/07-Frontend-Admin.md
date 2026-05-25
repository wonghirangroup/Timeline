---
tags: [frontend, admin, manager, react, vite]
---

# Frontend — Admin / Manager Web App

← [[00-HOME]] | Path: `admin/` | Port: 8081

## ใช้สำหรับ

- **ADMIN**: จัดการ Branch, Shift, Employee, Leave, Attendance ทุก Branch ใน tenant
- **MANAGER**: ดูรายงาน + Approve/Reject leave เฉพาะ Branch ตัวเอง

> MANAGER กับ ADMIN มี permission เหมือนกัน — ดู [[04-Roles-Permissions]]

---

## Tech Stack

- React + Vite
- Tailwind CSS v4
- shadcn/ui components
- Zustand (global state)
- React Query (server state / caching)
- React Hook Form + Zod (forms)
- dayjs — Asia/Bangkok timezone
- Axios (with interceptors)

---

## Folder Structure

```
admin/src/
├── components/
│   ├── ui/          ← shadcn base components
│   └── shared/      ← reusable business components
├── features/
│   ├── attendance/  ← รายงานเช็คชื่อ
│   ├── leave/       ← จัดการวันลา + approve flow
│   ├── branch/      ← จัดการสาขา
│   ├── shift/       ← จัดการกะ
│   └── employee/    ← จัดการพนักงาน
├── hooks/
├── lib/
│   ├── axios.ts     ← instance + auth interceptor
│   └── utils.ts
├── pages/
├── stores/          ← Zustand stores
└── types/
```

---

## Axios Instance

**File**: `admin/src/lib/axios.ts`

```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

// Auto-attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
```

**หมายเหตุ**: ไม่ต้อง attach `tenant_id` header แยก — backend resolve จาก JWT payload

---

## Naming Conventions

| สิ่ง | Pattern | ตัวอย่าง |
|------|---------|---------|
| Component | PascalCase | `AttendanceTable.tsx` |
| Hook | `use` + camelCase | `useAttendanceQuery.ts` |
| Store | camelCase + `Store` | `attendanceStore.ts` |
| Type | PascalCase | `AttendanceRecord` |
| API function | camelCase verb+noun | `getAttendanceByShift` |

---

## Pages (วางแผน)

| Page | Path | Role |
|------|------|------|
| Login | `/login` | Public |
| Dashboard | `/` | All |
| Branches | `/branches` | Admin |
| Shifts | `/shifts` | Admin |
| Employees | `/employees` | Admin |
| Attendance Report | `/attendance` | All |
| Leave Requests | `/leave-requests` | All |
| Holidays | `/holidays` | Admin |
| Announcements | `/announcements` | Admin (Phase 2) |

---

## API Routes ที่ใช้

→ [[03-API-Routes#Admin]] | [[03-API-Routes#Manager]]

---

## Env Variables

```
VITE_API_URL=http://localhost:3000
```
