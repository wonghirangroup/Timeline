# TimeLine HR SaaS — System Overview
> เอกสารอ้างอิงภาพรวมระบบ ครอบคลุม Role / Feature / Flow / Tech / Cost / Performance

---

## 1. สิทธิการใช้งาน (Role & Permission)

### โครงสร้าง Role ทั้งหมด

```
TALENT  (ทีมผู้พัฒนา/ขาย)
  └─ สร้าง Company (Tenant)
       └─ ADMIN  (ของบริษัทลูกค้า)
            ├─ เพิ่ม HR / หัวหน้าแผนก
            ├─ ตั้งค่า Feature visibility ต่อ Role
            └─ แผนก 1..N
                 ├─ HR  (ดูแลพนักงานทุกแผนก)
                 ├─ หัวหน้าแผนก  (ดูแลเฉพาะแผนกตัวเอง)
                 └─ พนักงาน  (ใช้งานผ่าน LINE LIFF)
```

---

### Permission Matrix

| Feature | TALENT | ADMIN | HR | หัวหน้าแผนก | พนักงาน |
|---|:---:|:---:|:---:|:---:|:---:|
| สร้าง/ระงับ Company | ✅ | ❌ | ❌ | ❌ | ❌ |
| Setup LINE OA per Company | ✅ | ❌ | ❌ | ❌ | ❌ |
| ดู Dashboard ทุก Company | ✅ | ❌ | ❌ | ❌ | ❌ |
| สร้าง Admin account | ✅ | ❌ | ❌ | ❌ | ❌ |
| สร้าง HR / หัวหน้าแผนก | ❌ | ✅ | ❌ | ❌ | ❌ |
| เปิด/ปิด Feature ต่อ Role | ❌ | ✅ | ❌ | ❌ | ❌ |
| จัดการ Branch / Shift | ❌ | ✅ | ✅ | ❌ | ❌ |
| เพิ่ม/แก้ไขพนักงาน | ❌ | ✅ | ✅ | ❌ | ❌ |
| ดูรายงานทุกแผนก | ❌ | ✅ | ✅ | ❌ | ❌ |
| ดูรายงานแผนกตัวเอง | ❌ | ✅ | ✅ | ✅ | ❌ |
| Approve วันลา | ❌ | ✅ | ✅ | ✅ | ❌ |
| ตั้งค่าวันจอง (Day-off Slot) | ❌ | ✅ | ✅ | ❌ | ❌ |
| เช็คอิน / เช็คเอาต์ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ขอวันลา | ❌ | ❌ | ❌ | ❌ | ✅ |
| จองวันหยุดประจำเดือน | ❌ | ❌ | ❌ | ❌ | ✅ |
| ดูประวัติตัวเอง | ❌ | ❌ | ❌ | ❌ | ✅ |

> **Feature Visibility Toggle** — Admin สามารถเปิด/ปิดการมองเห็น feature บางอย่างต่อ HR หรือหัวหน้าแผนกได้อิสระ
> เช่น บางบริษัทไม่ต้องการให้หัวหน้าแผนกเห็นข้อมูลเงินเดือน หรือยอด Leave Balance ของพนักงาน

---

## 2. ฟังก์ชันทั้งหมดของแต่ละ Role

### TALENT
- สร้าง / ระงับ / ลบ Company (Tenant)
- Setup LINE OA + LIFF per Company (Channel ID / Secret / LIFF ID)
- ดู Dashboard ภาพรวม: จำนวน Tenant / Active User / Revenue
- จัดการ Plan (Free / Starter / Pro / Enterprise)
- ออก Invoice / จัดการ Billing

### ADMIN
- สร้าง HR และหัวหน้าแผนก (กำหนด role + แผนกที่ดูแล)
- เปิด/ปิด Feature visibility ต่อ HR / หัวหน้าแผนก
- จัดการ Branch (สาขา): เพิ่ม/แก้ไข/ปิด
- จัดการ Shift (กะ): เวลาเริ่ม-สิ้นสุด, วันทำงาน
- ดู Attendance Report ทุกสาขา
- ดู Leave Report ทุกสาขา
- กำหนดวันหยุดประจำปี (National / Company Holiday)
- ดู OT Report
- ดู Dashboard ภาพรวมบริษัท

### HR
- เพิ่ม / แก้ไข / ปิดใช้งานพนักงาน (ทุกแผนก)
- กำหนดแผนก / Shift ให้พนักงาน
- ดู Attendance Report ทุกแผนก
- Approve / Reject วันลา (ทุกแผนก)
- ตั้งค่าวันจองหยุดประจำเดือน (Day-off Slot per Branch)
- จัดการ Leave Balance (โควต้าวันลา)
- ดู OT Report
- Export รายงาน (CSV / PDF)

### หัวหน้าแผนก
- ดู Attendance Report เฉพาะแผนกตัวเอง
- Approve / Reject วันลา เฉพาะแผนกตัวเอง
- รับ LINE notification เมื่อมีคำขอวันลาใหม่
- ดูตารางกะ และรายชื่อพนักงานในแผนก
- (ถ้า Admin เปิดให้) ดู Leave Balance พนักงาน

### พนักงาน (ผ่าน LINE LIFF เท่านั้น)
- เช็คอิน / เช็คเอาต์ (พร้อม GPS / QR Code)
- ขอวันลา (ลาป่วย / ลากิจ / ลาพักร้อน / ลาคลอด)
- จองวันหยุดประจำเดือน (1 วัน/สัปดาห์ ตาม quota ของ type)
  - พนักงานประจำ: 5 วัน/เดือน
  - รายวัน/Part-time: 4 วัน/เดือน
- ขอ OT
- ดูประวัติการเช็คชื่อตัวเอง
- ดูสถานะวันลา
- ขอเอกสาร (ใบรับรองเงินเดือน / e-Slip / หนังสือรับรองการทำงาน)

---

## 3. User Flow แต่ละฟังก์ชัน

### 3.1 การเพิ่มสมาชิกใหม่ (Onboarding)

```
TALENT สร้าง Company
  → กรอก: ชื่อบริษัท / เบอร์โทร / แพ็กเกจ
  → Setup LINE OA: ใส่ Channel ID + Channel Secret + LIFF ID
  → ระบบสร้าง Admin account + ส่ง email รหัสผ่านครั้งแรก

Admin Login ครั้งแรก
  → เปลี่ยนรหัสผ่าน
  → สร้างสาขา (Branch) + กะ (Shift)
  → สร้าง HR account → HR ได้รับ email เข้าสู่ระบบ

HR Login
  → เพิ่มพนักงาน (กรอกข้อมูล: ชื่อ / แผนก / ประเภท / Shift)
  → ระบบส่ง LINE message ไปยังพนักงานผ่าน LINE OA
    พร้อมลิงก์ผูกบัญชี: "กดที่นี่เพื่อเปิดใช้งาน TimeLine"

พนักงานกด Link ใน LINE
  → เปิด LIFF App ครั้งแรก
  → LINE Login → ได้ line_user_id
  → เลือกชื่อตัวเองจากรายการ (ค้นหาได้)
  → ยืนยัน → ระบบ map employee_id ↔ line_user_id
  → เข้าสู่หน้าหลัก (เช็คอิน)
```

### 3.2 เช็คอิน

```
พนักงานเปิด LINE OA
  → กด "เช็คอิน" ใน Rich Menu
  → LINE เปิด LIFF App
  → liff.init() → verify LINE Token
  → ดึงข้อมูล Shift ของวันนั้น
  → พนักงานกดปุ่มเช็คอิน (พร้อม GPS อัตโนมัติ)
  → Server ตรวจ:
      ✅ อยู่ใน Geofence → บันทึก ON_TIME / LATE
      ⚠️  นอก Geofence (WARN) → บันทึก + แจ้งเตือน
      ❌ นอก Geofence (BLOCK) → ไม่บันทึก แสดง error
  → ส่ง LINE message ยืนยันกลับให้พนักงาน
```

### 3.3 ขอวันลา

```
พนักงานเปิด LIFF → หน้า "วันลา" → Tab "ขอลา"
  → เลือกประเภทลา + วันที่ + เหตุผล
  → กด "ส่งคำขอ"
  → Server ตรวจ leave_balance ว่าเหลือพอไหม
  → บันทึก leave_request (status: PENDING)
  → ส่ง LINE notification ให้หัวหน้าแผนก:
      "สมชาย ขอลาป่วย 1 วัน (10 มิ.ย.) — [อนุมัติ] [ไม่อนุมัติ]"

หัวหน้าแผนก กด [อนุมัติ] ใน LINE
  → Server อัปเดต status: APPROVED
  → หัก leave_balance
  → ส่ง LINE notification แจ้งพนักงาน
```

### 3.4 จองวันหยุดประจำเดือน

```
Admin/HR เปิด Web App
  → หน้า "วันหยุด" → กด "ตั้งค่าวันจอง"
  → เลือก Branch + เดือน
  → เลือกวันที่ในปฏิทิน (เช่น 2, 9, 16, 23, 30 มิ.ย.)
  → กด "บันทึก"

พนักงานเปิด LIFF → หน้า "วันลา" → Tab "หยุดสัปดาห์"
  → เห็นปฏิทินที่วันเปิดให้จองเป็น highlight
  → กดเลือกวัน (quota: ประจำ 5 วัน / รายวัน 4 วัน)
  → กด "จองหยุด X วัน"
  → รอ Manager Approve ผ่าน LINE
```

---

## 4. Tech Stack สำหรับระบบ Production

### 4.1 Architecture ภาพรวม

```
                    ┌─────────────────┐
                    │   Cloudflare    │  DNS + WAF + DDoS Protection
                    └────────┬────────┘
                             │
           ┌─────────────────┼──────────────────┐
           │                 │                  │
    ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
    │  Admin Web  │  │  LIFF App    │  │  Superadmin  │
    │  (Vercel)   │  │  (Vercel)    │  │  (Vercel)    │
    └──────┬──────┘  └───────┬──────┘  └───────┬──────┘
           └─────────────────┼──────────────────┘
                             │ HTTPS API
                    ┌────────▼────────┐
                    │   API Gateway   │  (Nginx / Cloudflare Tunnel)
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Fastify API    │  Node.js 20 (Docker)
                    │  (Railway/DO)   │  Horizontal scale
                    └───┬───────┬─────┘
                        │       │
             ┌──────────▼─┐  ┌──▼──────────┐
             │  MySQL DB  │  │    Redis     │
             │ (PlanetSc/ │  │  (Cache /   │
             │  RDS)      │  │  Session)   │
             └────────────┘  └─────────────┘
                        │
             ┌──────────▼──────────┐
             │   Cloud Storage     │  S3 / R2 (รูปภาพ / เอกสาร)
             └─────────────────────┘
```

### 4.2 Technology ที่ต้องใช้

| Layer | Technology | เหตุผล |
|---|---|---|
| **Frontend** | React + Vite + Tailwind v4 | Fast build, small bundle |
| **Backend** | Fastify v4 + TypeScript | Fastest Node.js framework (~80k req/s) |
| **Database** | MySQL 8 (Prisma ORM) | Relational, ACID, รองรับ JSON |
| **Cache** | Redis (Upstash หรือ Railway) | Session, rate limit, real-time |
| **File Storage** | Cloudflare R2 หรือ AWS S3 | เอกสาร, รูปใบหน้า, e-Slip |
| **CDN** | Cloudflare | DDoS, WAF, SSL ฟรี |
| **Hosting FE** | Vercel | Auto-deploy จาก Git, Edge Network |
| **Hosting BE** | Railway หรือ DigitalOcean | Docker container, auto-scale |
| **Domain** | Cloudflare Registrar | ถูกสุด (~$10/ปี .com) |
| **LINE** | LINE Messaging API + LIFF | ฟรีสำหรับ 200 push/เดือน |
| **Monitoring** | Sentry + Grafana + Prometheus | Error tracking + metrics |
| **CI/CD** | GitHub Actions | Auto test + deploy |
| **Secrets** | Railway Env / Doppler | ไม่ hardcode ใน code |

### 4.3 Security

| ประเด็น | วิธีแก้ |
|---|---|
| SQL Injection | Prisma ORM (parameterized query อัตโนมัติ) |
| XSS | React escape by default + CSP header |
| JWT หลุด | Access Token อายุสั้น (15 min) + Refresh Token rotation |
| LINE Token ปลอม | Verify ทุก request กับ LINE API |
| Cross-tenant data leak | `tenant_id` filter ทุก query (enforce ใน middleware) |
| Brute force | Rate limit ด้วย Redis (100 req/min per IP) |
| Data at rest | Encrypt `LINE_CHANNEL_SECRET` ใน DB (AES-256) |
| Data in transit | TLS 1.3 ทุก connection |
| Backup | Daily snapshot MySQL → S3 (retain 30 วัน) |

### 4.4 Reliability & Performance

| เป้าหมาย | วิธีทำ |
|---|---|
| Uptime 99.9% | Health check + auto-restart (Railway) |
| Response < 200ms (p95) | Redis cache สำหรับ read-heavy data |
| รองรับ Spike | Horizontal scale API container |
| DB ไม่ล่ม | Connection pooling (Prisma + PgBouncer) |
| ไม่สูญเสียข้อมูล | MySQL binlog + S3 backup ทุก 6 ชม. |
| Zero-downtime deploy | Rolling deploy ผ่าน Railway |

### 4.5 Observability (ดูระบบ)

```
Logs     → Papertrail / Logtail (structured JSON log)
Errors   → Sentry (stack trace + user context)
Metrics  → Grafana + Prometheus (CPU, memory, req/s, DB latency)
Uptime   → Better Uptime หรือ UptimeRobot (แจ้ง LINE เมื่อล่ม)
Traces   → OpenTelemetry (ถ้าต้องการ trace แบบ distributed)
```

---

## 5. ค่าใช้จ่าย (Cost Estimation)

### Tier 1 — เริ่มต้น (0–5 Tenant, ~50 พนักงาน)

| Service | Provider | ราคา/เดือน |
|---|---|---|
| Backend API | Railway Starter | **$5** |
| MySQL DB | Railway MySQL | **$5** |
| Redis | Upstash (free tier) | **$0** |
| Frontend | Vercel (free) | **$0** |
| File Storage | Cloudflare R2 (10GB free) | **$0** |
| Domain | Cloudflare (~$10/ปี) | **~$1** |
| LINE OA | LINE (free 200 msg/เดือน) | **$0** |
| **รวม** | | **~$11/เดือน** |

---

### Tier 2 — Growing (6–30 Tenant, ~500 พนักงาน)

| Service | Provider | ราคา/เดือน |
|---|---|---|
| Backend API (2 instance) | Railway Pro | **$20** |
| MySQL | PlanetScale Scaler | **$29** |
| Redis | Upstash Pay-as-you-go | **$5** |
| Frontend | Vercel Pro | **$20** |
| File Storage | Cloudflare R2 | **$3** |
| Monitoring | Sentry Team | **$26** |
| Domain + Cloudflare Pro | | **$25** |
| LINE OA (push msg) | LINE ~$15/OA/เดือน × 10 OA | **$150** |
| **รวม** | | **~$278/เดือน** |

> 💡 LINE Message cost เป็นค่าใช้จ่ายหลักเมื่อขยายตัว — ออกแบบ notification ให้ส่งเฉพาะที่จำเป็น

---

### Tier 3 — Scale (50+ Tenant, 5,000+ พนักงาน)

| Service | Provider | ราคา/เดือน |
|---|---|---|
| Backend API | AWS ECS / DigitalOcean K8s | **$80–150** |
| MySQL | AWS RDS Multi-AZ | **$100–200** |
| Redis | AWS ElastiCache | **$30–60** |
| File Storage | AWS S3 | **$10–30** |
| CDN | Cloudflare Business | **$200** |
| Monitoring | Datadog / Grafana Cloud | **$50–100** |
| LINE OA | ขึ้นอยู่กับ Tenant จำนวน | **$500+** |
| **รวม** | | **~$1,000–2,000/เดือน** |

> ที่ Tier 3 ควรคิด subscription fee ต่อ tenant อย่างน้อย **฿500–2,000/เดือน** เพื่อ cover cost และมีกำไร

---

### DB Storage Estimate

| ข้อมูล | ขนาดต่อ record | 100 พนักงาน / ปี |
|---|---|---|
| Attendance Record | ~200 bytes | ~14 MB |
| Leave Request | ~300 bytes | ~1 MB |
| Employee Profile | ~500 bytes | ~0.05 MB |
| **รวม 1 Tenant/ปี** | | **~15–20 MB** |

→ 50 Tenant = ~1 GB/ปี — ถูกมาก ไม่ใช่ปัญหา

---

## 6. โค้ดปัจจุบันส่งผลต่อ Performance ไหม?

### ✅ สิ่งที่ดีอยู่แล้ว

| ประเด็น | สถานะ |
|---|---|
| Fastify (backend) | เร็วกว่า Express 2–3x |
| React Query (frontend) | Cache + dedup request อัตโนมัติ |
| Prisma | Typed query, ป้องกัน SQL injection |
| Zustand | State lightweight ไม่ re-render ฟุ่มเฟือย |
| Vite | Bundle เล็ก, HMR เร็ว |

---

### ⚠️ จุดที่ต้องแก้ก่อน Production

#### 6.1 N+1 Query Problem (ร้ายแรงที่สุด)
```typescript
// ❌ แบบผิด — query พนักงาน 100 คน = 101 queries
const employees = await prisma.employee.findMany()
for (const emp of employees) {
  emp.branch = await prisma.branch.findUnique({ where: { id: emp.branch_id } })
}

// ✅ แบบถูก — 1 query
const employees = await prisma.employee.findMany({
  include: { branch: true }
})
```

#### 6.2 ขาด Pagination
```typescript
// ❌ ดึงทั้งหมด — ถ้ามี 10,000 record จะ OOM
const all = await prisma.attendanceRecord.findMany({ where: { tenant_id } })

// ✅ ต้องมี limit + cursor
const page = await prisma.attendanceRecord.findMany({
  where: { tenant_id },
  take: 20,
  skip: (pageNo - 1) * 20,
  orderBy: { created_at: 'desc' }
})
```

#### 6.3 ขาด Index ที่จำเป็น
```sql
-- ต้องเพิ่มใน schema.prisma
@@index([tenant_id, branch_id])
@@index([tenant_id, check_in_time])
@@index([employee_id, check_in_time])
```

#### 6.4 LIFF Token Verify ช้า (External HTTP call)
```typescript
// ทุก request ต้อง call LINE API → latency ~200-500ms
// แก้: cache ผลลัพธ์ใน Redis 5 นาที
const cached = await redis.get(`liff:${token}`)
if (cached) return JSON.parse(cached)
const result = await verifyWithLine(token)
await redis.setex(`liff:${token}`, 300, JSON.stringify(result))
```

#### 6.5 Missing Rate Limiting
```typescript
// ต้องเพิ่มก่อน deploy
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-tenant-id'] as string ?? req.ip
})
```

---

### ประเมิน Load Capacity (โค้ดปัจจุบัน)

| สถานการณ์ | รองรับได้ (1 instance) |
|---|---|
| พนักงานเช็คอินพร้อมกัน | ~200–500 req/s |
| พนักงานเปิดดูประวัติ | ~1,000 req/s (ถ้ามี cache) |
| ดาวน์โหลด Report ใหญ่ | ช้า — ต้องทำ background job |
| Export CSV 10,000 แถว | ❌ จะ timeout — ต้องทำ async + polling |

---

## สรุป Priority ก่อน Production

```
Priority 1 — ต้องทำก่อน Launch
  [ ] เพิ่ม Pagination ทุก list endpoint
  [ ] เพิ่ม DB Index ใน schema.prisma
  [ ] เพิ่ม Rate Limiting
  [ ] ต่อ API จริง (ลบ MOCK MODE)
  [ ] Setup environment variables ผ่าน Railway/Doppler

Priority 2 — ทำภายใน 1 เดือนหลัง Launch
  [ ] Redis cache สำหรับ LIFF Token verify
  [ ] Redis cache สำหรับ tenant config
  [ ] Sentry error tracking
  [ ] Automated backup MySQL → S3

Priority 3 — Scale Phase
  [ ] Background job (BullMQ) สำหรับ Export / Report
  [ ] Horizontal scaling API
  [ ] Read replica สำหรับ heavy report query
```

---

## แผนการทำงาน (Decision Log — 2026-06-09)

### สิ่งที่ Claude ทำให้ได้เลย (แค่แก้โค้ด ไม่ต้องเตรียมอะไร)

| งาน | ไฟล์ที่แก้ | หมายเหตุ |
|---|---|---|
| เพิ่ม DB Index | `server/prisma/schema.prisma` | ป้องกัน full table scan |
| เพิ่ม Pagination helper | `server/src/common/utils/paginate.ts` | ใช้ซ้ำทุก endpoint |
| เพิ่ม Rate Limiting | `server/src/app.ts` | `@fastify/rate-limit` |
| แก้ N+1 Query | `server/src/modules/*/service.ts` | ใช้ Prisma `include` |
| Redis cache LIFF Token | `server/src/common/middleware/liff.ts` | cache 5 นาที |

### สิ่งที่ต้องเตรียมเอง (ต้องใช้ account / credential จริง)

| สิ่งที่ต้องเตรียม | ใช้ทำอะไร | ลิงก์ |
|---|---|---|
| **Railway account** | Host Backend + MySQL | railway.app |
| **Vercel account** | Deploy Frontend (ฟรี) | vercel.com |
| **Cloudflare account** | Domain + CDN + WAF | cloudflare.com |
| **Domain name** | เช่น `timeline-hr.com` (~$10/ปี) | ซื้อผ่าน Cloudflare |
| **LINE OA + LIFF** | Channel ID / Secret จริง | developers.line.biz |
| **MySQL รันอยู่** | ก่อนจะ `prisma migrate` ได้ | ผ่าน Railway หรือ phpMyAdmin |

### สถานะปัจจุบัน

> **โหมด: Clear Flow ก่อน** — ยังอยู่ในช่วง Mock Mode
> เมื่อ Flow ทุกหน้าครบและ confirm แล้ว จึงค่อยต่อ API จริงและทำ infra

```
[/] Employee LIFF App — UI ครบทุกหน้า (Mock Mode)
    ✅ Check-in / Check-out
    ✅ History
    ✅ Leave (ขอลา + จองหยุดรายเดือน + quota ตาม type)
    ✅ Profile

[/] Admin Web App — UI ครบ (Mock Mode)
    ✅ Branch / Shift / Employee
    ✅ Attendance Report
    ✅ Leave Management + Day-off Slot Config
    ✅ Holiday Management

[...] ต่อ API จริง — รอ Flow confirm ก่อน
[...] เตรียม infra (Railway / Vercel / Cloudflare / Domain)
[...] Priority 1 Code Fixes (Pagination / Index / Rate Limit)
```
