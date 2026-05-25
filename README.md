# TimeLine — HR Attendance & Leave Management (Monorepo)

## โครงสร้าง Monorepo

```
timeline/
├── server/          🖥️  Fastify API (Node.js + TypeScript + Prisma)
├── admin/           👔  Web App — Admin & Manager (React + Vite + Tailwind v4)
├── superadmin/      👑  Web App — Super Admin / Vendor (React + Vite + Tailwind v4)
├── employee/        📱  LIFF App — Employee (React + Vite + Line LIFF SDK)
├── shared/          📦  Types, Schemas, Utils ใช้ร่วมกันทุก project
└── CLAUDE.md        🤖  Context สำหรับ Claude Code
```

## Ports (Development)

| App         | Port  | URL                        |
|-------------|-------|----------------------------|
| server      | 3000  | http://localhost:3000       |
| admin       | 5173  | http://localhost:5173       |
| superadmin  | 5174  | http://localhost:5174       |
| employee    | 5175  | http://localhost:5175 (LIFF)|

## การติดตั้ง

```bash
# ติดตั้ง dependencies ทั้งหมดในครั้งเดียว
npm install

# รัน dev ทุก app พร้อมกัน
npm run dev:all

# หรือรันทีละ app
npm run dev:server
npm run dev:admin
npm run dev:superadmin
npm run dev:employee
```

ดูคำสั่งทั้งหมดได้ใน: `docs/RunCommands.md`

ดู sprint plan ได้ที่: `docs/SprintPlan.md`

## Environment Setup

```bash
cp server/.env.example     server/.env
cp admin/.env.example      admin/.env
cp superadmin/.env.example superadmin/.env
cp employee/.env.example   employee/.env
```

## Roles & Apps

| Role        | App         | วิธี Login          |
|-------------|-------------|---------------------|
| SUPER_ADMIN | superadmin/ | Email + Password    |
| ADMIN       | admin/      | Email + Password    |
| MANAGER     | admin/      | Email + Password    |
| EMPLOYEE    | employee/   | Line LIFF Login     |

## Docker

สาธิตการรันด้วย Docker + docker-compose มีไฟล์ตัวอย่างและคำอธิบายใน `docs/Docker.md`.

- Build & run (จาก root โปรเจค):

```bash
cp .env.example .env
docker-compose build
docker-compose up -d
```

- คำสั่งที่ใช้บ่อย:

```bash
# ตรวจสอบ logs
docker-compose logs -f server

# รัน migrations
docker-compose exec server npx prisma migrate deploy

# หยุดและล้าง
docker-compose down --volumes
```
### Docker development

ใช้ `docker-compose.dev.yml` เพื่อรันทุก service ในโหมด development ด้วย hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

บริการที่ระบุใน `docker-compose.dev.yml`:
- `server`  ใช้ `npm run dev`
- `admin`  ใช้ `npm run dev -- --host 0.0.0.0`
- `superadmin`  ใช้ `npm run dev -- --host 0.0.0.0`
- `employee`  ใช้ `npm run dev -- --host 0.0.0.0`
ดูรายละเอียดเพิ่มเติมและ smoke tests ใน: `docs/Docker.md`.
"# Timeline" 
