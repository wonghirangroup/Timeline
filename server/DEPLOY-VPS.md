# Deploy TimeLine backend ไปที่ VPS (178.128.119.174)

> **สถานะ:** deploy จริงแล้ว (18 ส.ค. 2569) — รันที่ `/opt/timeline` บน VPS, backend
> container port 4002 (internal), เข้าถึงจริงผ่าน **https://timeline-api.wonghiran.com**
> (nginx reverse proxy + Let's Encrypt cert)

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

## ✅ HTTPS — ตั้งเสร็จแล้ว (18 ส.ค. 2569)

`https://timeline-api.wonghiran.com` — nginx (host-level, ติดตั้งใหม่) ฟัง **เฉพาะ port 443**
แล้ว reverse-proxy ไปที่ `127.0.0.1:4002` (container)

**สำคัญ — ทำไมไม่ใช้ `certbot --nginx` แบบมาตรฐาน:** VPS ตัวนี้ port 80 ถูก
`grow-store-qa-frontend` container จองอยู่แล้ว (`docker-proxy` bind `0.0.0.0:80`) — ถ้าใช้วิธี
HTTP-01 challenge ปกติ (ต้องใช้ port 80) จะชนกับแอปนั้นทันที เลยใช้ **DNS-01 challenge** แทน
(`certbot certonly --manual --preferred-challenges dns`) ซึ่งพิสูจน์ความเป็นเจ้าของโดเมนผ่าน
DNS TXT record แทนการเปิด port 80 — ไม่แตะ QA/grow-store-qa เลย

**⚠️ ข้อจำกัดของวิธีนี้ — ต่ออายุอัตโนมัติไม่ได้:**
Cert หมดอายุ **16 พ.ย. 2569** (90 วันจากวันออก) เพราะ `--manual` ไม่มี hook ให้ certbot
เพิ่ม DNS record เองตอน renew ต้องทำมือซ้ำแบบนี้ทุกครั้ง (ตั้งเตือนปฏิทินไว้ล่วงหน้าสัก 1-2 สัปดาห์):
```bash
# บน VPS — รันคำสั่งเดิมซ้ำ จะได้ TXT record ใหม่มาเพิ่มใน DNS อีกรอบ
screen -dmS certbot-tl bash -c 'certbot certonly --manual --preferred-challenges dns \
  -d timeline-api.wonghiran.com --agree-tos --register-unsafely-without-email \
  --manual-public-ip-logging-ok 2>&1 | tee /root/certbot-tl.log'
cat /root/certbot-tl.log   # ดู TXT record ที่ต้องเพิ่ม
# เพิ่ม TXT record ใน wonghiran.com DNS แล้วรอ propagate เช็คด้วย:
#   nslookup -type=TXT _acme-challenge.timeline-api.wonghiran.com 8.8.8.8
screen -S certbot-tl -X stuff $'\n'   # กด Enter ให้ certbot ทำงานต่อ
systemctl reload nginx
```
**ถ้าอยากให้ต่ออายุอัตโนมัติได้จริง** ต้องย้าย `grow-store-qa-frontend` ออกจาก port 80 ก่อน (ให้
host nginx คุม port 80 เองแทน แล้วใช้ `certbot --nginx` ปกติที่ auto-renew ได้) — เป็นงานแยกที่ต้อง
คุยกับทีมที่ดูแล grow-store-qa ก่อน เพราะเป็นคนละแอปกัน

## Cutover แบบปลอดภัย (แนะนำ)

อย่าปิด Render ทันที — ให้รันคู่ขนานกันไปก่อน:
1. Deploy ขึ้น VPS ตามด้านบน ทดสอบผ่าน curl ให้มั่นใจก่อน
2. ตั้ง HTTPS (ข้อบนนี้) ให้เสร็จ
3. แก้ `VITE_API_URL` ใน Vercel (ทั้ง 3 project: admin, superadmin, employee) → redeploy
4. ทดสอบใช้งานจริงสัก 1-2 วัน
5. ค่อยปิด/ลบ Render service ทีหลัง เมื่อมั่นใจว่า VPS เสถียรแล้ว
