# Docker — TimeLine monorepo

This document describes how to build and run the project with Docker and docker-compose.

Prerequisites
- Docker Engine
- docker-compose (v2+ or the Compose CLI)

Quick start (build and run)

```bash
# from repository root (timeline/)
cp .env.example .env
docker-compose build
docker-compose up -d
```

Access
- Server API: http://localhost:3000
- Admin UI: http://localhost:8081
- Employee (LIFF static hosting): http://localhost:8082
- Superadmin UI: http://localhost:8083

Migrations
- Run Prisma migrations against the running `server` container:

```bash
docker-compose exec server npx prisma migrate deploy
```

Smoke tests

- API healthcheck (example):

```bash
curl -fsS http://localhost:3000/health || echo "server failed"
```

- Frontend check (index page):

```bash
curl -fsS http://localhost:8081 | head -n 1
```

Notes
- For development with hot-reload, prefer running `npm run dev:*` locally instead of containers.
- Keep secrets out of `.env` in production; use a secret manager and pass runtime secrets to containers instead.
