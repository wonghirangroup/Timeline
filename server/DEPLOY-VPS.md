# Deploy TimeLine backend ไปที่ VPS (178.128.119.174)

ย้ายจาก Render (free tier) มาอยู่ VPS เดียวกับ QA/TestGrow — เร็วขึ้นเพราะไม่มี cold start
ของ free tier และ (ถ้าเลือก) latency ไปหา DB ต่ำกว่าด้วยถ้า DB ย้ายมา VPS เดียวกันในอนาคต

## ขั้นตอน

```bash
# 1) SSH เข้า VPS แล้ว clone/pull repo (ตำแหน่งเดียวกับที่วาง QA/TestGrow)
git clone https://github.com/wonghirangroup/Timeline.git
cd Timeline/server

# 2) สร้าง .env จาก template — เอาค่าจริงมาจาก Render dashboard (Environment tab)
cp .env.vps.example .env
nano .env   # กรอกค่าจริงให้ครบ

# 3) เช็คว่า port 4002 ว่างจริงก่อน (ถ้าไม่ว่าง แก้เลขใน docker-compose.yml + คำสั่งเช็คนี้)
ss -tlnp | grep 4002

# 4) build + run
docker compose up -d --build

# 5) เช็คว่าขึ้นจริง
docker compose logs -f backend
curl http://localhost:4002/health
# ควรได้ {"status":"ok","timestamp":"..."}

# จากเครื่องอื่น (ทดสอบว่าเปิดไฟร์วอลล์ให้ port นี้แล้วหรือยัง)
curl http://178.128.119.174:4002/health
```

**ถ้า `curl` จากเครื่องอื่นไม่ผ่าน** — เช็ค firewall ของ VPS (`ufw status` หรือ cloud provider's firewall/security group) ว่าเปิด port 4002 ให้แล้วหรือยัง

## ⚠️ ก่อนจะสลับ production มาใช้ VPS นี้จริง — ต้องมี HTTPS

Admin panel อยู่บน Vercel (`https://timeline-admin.vercel.app`) ซึ่งเป็น HTTPS เสมอ — ถ้า API
ยังเป็น HTTP เปล่าๆ แบบ `http://178.128.119.174:4002` เบราว์เซอร์จะ**บล็อก request ทุกตัวเงียบๆ**
ด้วย "Mixed Content" policy (ต่างจาก QA app ที่ frontend เป็น HTTP เหมือนกัน เลยไม่ติดปัญหานี้)

ตอนนี้ทดสอบความเร็ว/เชื่อมต่อตรงด้วย `curl`/Postman ได้เลยไม่มีปัญหา แต่ก่อนจะเปลี่ยน
`VITE_API_URL` บน Vercel ให้ชี้มาที่นี่จริง ต้องทำอย่างใดอย่างหนึ่งก่อน:

1. **ตั้ง subdomain + certbot** (แนะนำ) — เช่น `timeline-api.wonghiran.com` ชี้ A record มาที่
   `178.128.119.174` แล้วตั้ง nginx reverse-proxy + `certbot --nginx` ขอ cert ฟรี (แบบเดียวกับที่
   `qa.wonghiran.com` น่าจะใช้ถ้ามันมี TLS อยู่แล้ว)
2. หรือใช้ **Caddy** แทน nginx — ตั้งค่าน้อยกว่า ออก HTTPS อัตโนมัติให้เองจาก domain เดียว

บอกได้เลยถ้าอยากให้เตรียม nginx server block + คำสั่ง certbot ให้ — ตอนนี้ยังไม่ทำเพราะ
ยังไม่รู้ว่าจะใช้ subdomain ชื่ออะไร

## Cutover แบบปลอดภัย (แนะนำ)

อย่าปิด Render ทันที — ให้รันคู่ขนานกันไปก่อน:
1. Deploy ขึ้น VPS ตามด้านบน ทดสอบผ่าน curl ให้มั่นใจก่อน
2. ตั้ง HTTPS (ข้อบนนี้) ให้เสร็จ
3. แก้ `VITE_API_URL` ใน Vercel (ทั้ง 3 project: admin, superadmin, employee) → redeploy
4. ทดสอบใช้งานจริงสัก 1-2 วัน
5. ค่อยปิด/ลบ Render service ทีหลัง เมื่อมั่นใจว่า VPS เสถียรแล้ว
