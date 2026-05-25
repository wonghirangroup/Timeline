# Run Commands — TimeLine

เอกสารนี้รวบรวมคำสั่งที่ใช้บ่อยสำหรับการพัฒนา, การ build และการรันด้วย Docker ในโครงการ TimeLine.

## 1. ติดตั้งครั้งแรก

```bash
npm install
```

## 2. เตรียมไฟล์ environment

```bash
cp server/.env.example     server/.env
cp admin/.env.example      admin/.env
cp superadmin/.env.example superadmin/.env
cp employee/.env.example   employee/.env
```

ใช้เมื่อ
- เพิ่ง clone โปรเจคมาใหม่
- ต้องการสร้างไฟล์ `.env` สำหรับแต่ละแอป

## 3. รันโหมดพัฒนา (Local Dev)

### รันทุก service พร้อมกัน

```bash
npm run dev:all
```

ใช้เมื่อ
- ต้องการพัฒนาและดูผลทุกแอปพร้อมกัน
- อยากให้ frontend + backend รีโหลดอัตโนมัติ

### รันแยกแต่ละ service

```bash
npm run dev:server
npm run dev:admin
npm run dev:superadmin
npm run dev:employee
```

ใช้เมื่อ
- ต้องการโฟกัสแค่ service เดียว
- ต้องการลด resource ในเครื่อง

### คำสั่ง workspace โดยตรง

```bash
npm run dev --workspace=server
npm run dev --workspace=admin
npm run dev --workspace=superadmin
npm run dev --workspace=employee
```

ใช้เมื่อ
- ต้องการเรียก command ตรงจาก workspace เดี่ยว
- ต้องการตรวจสอบว่าคำสั่งของ workspace นั้นทำงานได้

## 4. Build และ Preview

### Build ทั้งหมด

```bash
npm run build:all
```

ใช้เมื่อ
- ต้องการสร้างไฟล์ production-ready ทั้ง server และ frontend
- เตรียม deploy หรือทดสอบ build pipeline

### Build workspace เดี่ยว

```bash
npm run build --workspace=admin
npm run build --workspace=superadmin
npm run build --workspace=employee
npm run build --workspace=server
```

ใช้เมื่อ
- ต้องการ build เฉพาะแอปใดแอปหนึ่ง
- ต้องการตรวจสอบ build error ใน service เดียว

### Preview frontend หลัง build

```bash
npm run preview --workspace=admin
npm run preview --workspace=superadmin
npm run preview --workspace=employee
```

ใช้เมื่อ
- ต้องการดูเว็บบน production-like server หลัง build

## 5. Server / Prisma commands

```bash
cd server
npm run dev
npm run build
npm run start
npm run test
npm run db:migrate
npm run db:generate
npm run db:studio
npm run db:seed
```

ใช้เมื่อ
- ต้องการรัน backend โดยตรง
- ต้องการจัดการฐานข้อมูล Prisma
- ต้องการทดสอบหรือดู Prisma Studio

## 6. Docker commands

### Build และรันคอนเทนเนอร์

```bash
cp .env.example .env
docker-compose build
docker-compose up -d
```

ใช้เมื่อ
- ต้องการรันโปรเจคในสภาพแวดล้อม Docker
- ต้องการให้ทุก service ทำงานแบบแยกคอนเทนเนอร์

### ตรวจสอบ logs

```bash
docker-compose logs -f server
```

ใช้เมื่อ
- ต้องการดู log ของ container server
- ตรวจสอบปัญหา runtime

### รัน Prisma migrations ใน container

```bash
docker-compose exec server npx prisma migrate deploy
```

ใช้เมื่อ
- ต้องการ deploy migration กับฐานข้อมูลที่รันจาก Docker

### หยุดและล้าง container + volume

```bash
docker-compose down --volumes
```

ใช้เมื่อ
- ต้องการล้างสภาพแวดล้อม Docker ทั้งหมด
- ต้องการเริ่มต้นใหม่จาก zero state

## 7. Docker development hot-reload

```bash
docker-compose -f docker-compose.dev.yml up --build
```

ใช้เมื่อ
- ต้องการรันแอปด้วย hot-reload ภายใน container
- ต้องการให้ทุก service อยู่ใน Docker แต่ยังพัฒนาแบบ live reload

## 8. ngrok — Expose Local Server สำหรับ LINE LIFF

LINE LIFF และ LINE Webhook ต้องการ HTTPS URL สาธารณะ ใช้ ngrok เพื่อ tunnel port จากเครื่อง local

### ติดตั้ง ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Windows (Chocolatey)
choco install ngrok

# หรือดาวน์โหลดจาก https://ngrok.com/download
```

### ตั้งค่า Auth Token (ทำครั้งเดียว)

```bash
ngrok config add-authtoken <YOUR_NGROK_AUTH_TOKEN>
```

### Tunnel แต่ละ service

```bash
# Backend server (port 3000)
ngrok http 3000

# Employee LIFF app (port 5174)
ngrok http 5174

# Admin web app (port 5173)
ngrok http 5173
```

### Tunnel พร้อม log เพิ่มเติม

```bash
# log ทุก request/response ออก stdout (แนะนำระหว่าง dev)
ngrok http 3000 --log=stdout

# เพิ่ม log level เป็น debug (เห็น header, latency, error detail)
ngrok http 3000 --log=stdout --log-level=debug

# log แบบ JSON (เหมาะสำหรับ pipe เข้า jq หรือ log aggregator)
ngrok http 3000 --log=stdout --log-format=json

# ดู request/response แบบ real-time ผ่าน Web Inspector (เปิดใน browser)
# รัน ngrok ปกติ แล้วเปิด http://localhost:4040
ngrok http 3000
```

> **Web Inspector** ที่ `http://localhost:4040` จะแสดง request body, header, response, และ replay request ได้ — มีประโยชน์มากตอนทดสอบ LINE Webhook

### Tunnel หลาย port พร้อมกัน (ต้องมี ngrok account)

```bash
ngrok start --all --config ngrok.yml
```

ตัวอย่าง `ngrok.yml`:

```yaml
version: "2"
authtoken: <YOUR_NGROK_AUTH_TOKEN>
tunnels:
  server:
    addr: 3000
    proto: http
  employee:
    addr: 5174
    proto: http
  admin:
    addr: 5173
    proto: http
```

### หลังได้ URL จาก ngrok

1. **Backend** — คัดลอก HTTPS URL (เช่น `https://xxxx.ngrok-free.app`) ไปใส่ใน:
   - `employee/.env` → `VITE_API_URL=https://xxxx.ngrok-free.app/api/v1`
   - `admin/.env` → `VITE_API_URL=https://xxxx.ngrok-free.app/api/v1`
   - LINE Developer Console → Webhook URL: `https://xxxx.ngrok-free.app/api/v1/line/webhook`

2. **Employee LIFF** — คัดลอก URL ไปใส่ใน LINE Developer Console → LIFF → Endpoint URL

ใช้เมื่อ
- ต้องการทดสอบ LINE LIFF บนมือถือจริง
- ต้องการรับ LINE Webhook event ใน local dev
- ต้องการ demo ให้ผู้อื่นเข้าถึง local server ชั่วคราว

> **หมายเหตุ:** URL ของ ngrok (free tier) จะเปลี่ยนทุกครั้งที่รันใหม่ ต้องอัปเดต `.env` และ LINE Console ด้วยทุกครั้ง

---

## 9. คำแนะนำเพิ่มเติม

- ถ้าต้องการพัฒนาเร็วสุด ให้ใช้ `npm run dev:*` บนเครื่อง local
- ถ้าต้องการทดสอบสภาพแวดล้อมแบบ container ให้ใช้ `docker-compose` หรือ `docker-compose.dev.yml`
