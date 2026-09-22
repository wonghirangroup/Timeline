# Development Environment

## โครงสร้าง Repository (Monorepo)

```
timeline/
├── server/          Fastify API (Node.js + TypeScript + Prisma)
├── admin/            เว็บแอป Admin/Manager (React + Vite)
├── superadmin/        เว็บแอป Super Admin/Vendor (React + Vite)
├── employee/         แอป LINE LIFF พนักงาน (React + Vite)
├── shared/            Types/Schemas/Utils ที่ใช้ร่วมกันทุกแอป
├── docs/              เอกสารประกอบโครงการ (รวมโฟลเดอร์นี้)
├── brain/             บันทึกการทำงาน/ตัดสินใจของทีม (dev log)
├── CLAUDE.md          Context สำหรับ AI coding assistant
├── PRODUCT.md         นิยามผลิตภัณฑ์/ผู้ใช้/หลักการออกแบบ
└── DESIGN.md          ระบบดีไซน์ (สี/ตัวอักษร/คอมโพเนนต์)
```

## เทคโนโลยีและเวอร์ชัน

### Backend (`server/`)

| แพ็กเกจ | เวอร์ชัน | หน้าที่ |
|---|---|---|
| fastify | ^4.28.0 | HTTP framework |
| @prisma/client / prisma | ^5.0.0 | ORM + migration tool |
| typescript | ^5.0.0 | ภาษา |
| zod | ^3.23.0 | Validate input schema |
| bcryptjs | ^2.4.3 | Hash รหัสผ่าน |
| jsonwebtoken | ^9.0.0 | ออก/ตรวจ JWT |
| node-cron | ^3.0.3 | งานตามกำหนดเวลา (sync, โบนัสพักร้อน) |
| vitest | — | Unit testing |

ฐานข้อมูล: **MySQL**

### Frontend — Admin / Super Admin (`admin/`, `superadmin/`)

| แพ็กเกจ | เวอร์ชัน | หน้าที่ |
|---|---|---|
| react / react-dom | ^18.3.0 | UI library |
| react-router-dom | ^6.23.0 | Routing |
| @tanstack/react-query | ^5.40.0 | Data fetching/caching |
| zustand | ^4.5.0 | Global state (auth) |
| axios | ^1.7.0 | HTTP client |
| vite | ^5.3.0 | Build tool/dev server |
| typescript | ^5.4.0 | ภาษา |

ไม่มี component library ภายนอก — ทุกหน้า/คอมโพเนนต์เขียน inline `React.CSSProperties` เอง ตาม convention ของโปรเจกต์ (ดู `DESIGN.md`)

### Frontend — Employee (`employee/`)

React 18 + Vite + **LINE LIFF SDK** — รันภายในเว็บวิวของแอป LINE เท่านั้น

## Ports (Development)

| แอป | Port | URL |
|---|---|---|
| server | 3000 | http://localhost:3000 |
| admin | 5173 | http://localhost:5173 |
| superadmin | 5174 | http://localhost:5174 |
| employee | 5175 | http://localhost:5175 (ต้องเปิดผ่าน LIFF/ngrok เพื่อทดสอบจริงในแอป LINE) |

## สิ่งที่ต้องติดตั้งก่อน (Prerequisites)

- Node.js (LTS)
- npm
- MySQL server (local หรือเชื่อมต่อ instance ที่มีอยู่)
- Git

## การติดตั้งและรันโปรเจกต์ (Local Setup)

```bash
# 1. ติดตั้ง dependencies ทั้งหมดในครั้งเดียว (npm workspaces)
npm install

# 2. ตั้งค่าไฟล์ .env ของ server (ดูตัวแปรด้านล่าง)
cd server
cp .env.example .env   # แก้ค่าจริงตามสภาพแวดล้อม

# 3. สร้างฐานข้อมูล + รัน migration
npx prisma migrate deploy
npx prisma generate

# 4. รัน dev ทุกแอปพร้อมกัน (จาก root)
npm run dev
```

## ตัวแปรสภาพแวดล้อมหลัก (Environment Variables — server)

| ตัวแปร | หน้าที่ |
|---|---|
| `DATABASE_URL` | connection string MySQL |
| `JWT_ACCESS_SECRET` | secret สำหรับเซ็น JWT |
| `ADMIN_APP_URL` | base URL เว็บแอดมิน (ใช้ประกอบลิงก์ magic-login) |
| `EMPLOYEE_APP_URL` | base URL แอปพนักงาน (LIFF) |

## Workflow การพัฒนา

- **Migration**: แก้ `server/src/prisma/schema.prisma` → เขียนไฟล์ `migration.sql` เอง (ไม่ใช้ `prisma migrate dev` กับฐานข้อมูล production โดยตรง) → `npx prisma generate` → `npx prisma migrate deploy`
- **Testing**: `cd server && npx vitest run` — เน้น unit test ฟังก์ชัน pure logic (คำนวณสาย/ขาด, จับคู่กะ) ที่แยกออกจาก Prisma เพื่อไม่ต้อง mock database ดู [Test_Cases.md](Test_Cases.md)
- **Type checking**: `npx tsc --noEmit` ทุกแอปก่อน commit
- **Build**: `npm run build` (แต่ละแอปมี Vite build script ของตัวเอง)

## เอกสารที่เกี่ยวข้อง

[Setup_Deployment_Guide.md](Setup_Deployment_Guide.md) สำหรับขั้นตอน deploy ขึ้น production
