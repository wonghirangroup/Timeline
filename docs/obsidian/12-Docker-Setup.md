---
tags: [docker, setup, deployment, dev]
---

# Docker & Setup

← [[00-HOME]] | Docs: `docs/Docker.md`

## Quick Start

```bash
# จาก root: timeline/Timeline/
cp .env.example .env
# แก้ค่าใน .env (อย่าลืม JWT_SECRET, DATABASE_URL)

docker-compose build
docker-compose up -d
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| API Server | 3000 | http://localhost:3000 |
| Admin UI | 8081 | http://localhost:8081 |
| Employee LIFF | 8082 | http://localhost:8082 |
| Super Admin UI | 8083 | http://localhost:8083 |

## Migrations

```bash
# รัน Prisma migrate หลัง container up
docker-compose exec server npx prisma migrate deploy
```

> ⚠️ ต้อง confirm environment ก่อน migrate เสมอ — ดู [[10-Business-Rules#Migration Policy]]

## Smoke Tests

```bash
# API healthcheck
curl -fsS http://localhost:3000/health || echo "server failed"

# Frontend check
curl -fsS http://localhost:8081 | head -n 1
```

## Dev Mode (Hot Reload)

สำหรับ dev ไม่ต้องใช้ Docker — รัน local แทน:

```bash
# Server
cd server && npm run dev

# Admin UI
cd admin && npm run dev

# Employee LIFF
cd employee && npm run dev

# Super Admin
cd superadmin && npm run dev
```

## Environment Variables

**Root `.env.example`:**

```
DATABASE_URL=mysql://timeline_user:password@db:3306/timeline
JWT_SECRET=your_jwt_secret_here
JWT_ACCESS_SECRET=your_jwt_access_secret_here

# Dev fallback (prod: ใช้จาก DB)
LINE_CHANNEL_ID=LINE_CHANNEL_ID_PLACEHOLDER
LINE_CHANNEL_SECRET=LINE_CHANNEL_SECRET_PLACEHOLDER

NODE_ENV=development
PORT=3000
REDIS_URL=redis://redis:6379
```

**Per-app `.env` (ใน admin/, employee/, superadmin/):**

```
VITE_API_URL=http://localhost:3000
```

**Employee LIFF เพิ่ม:**
```
VITE_LIFF_ID=<liff_id>
VITE_LINE_CHANNEL_ID=<channel_id>
```

---

## Security Notes

- ❌ ห้าม commit `.env` ที่มี secret จริง
- ✅ ใช้ secret manager (Vault, AWS Secrets Manager) ใน production
- ✅ LINE credential ใน production เก็บ encrypted ใน DB — ไม่ใช่ `.env`

→ [[05-Line-Integration]] | [[10-Business-Rules#Safety Guardrails]]
