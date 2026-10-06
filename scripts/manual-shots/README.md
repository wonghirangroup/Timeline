# ถ่ายภาพคู่มือการใช้งาน (หน้า /manual)

ภาพใน `admin/public/manual/*.webp` ถ่ายจากแอดมินจริงที่รันในเครื่อง แต่ **ดักทุก request `/api/`** แล้วตอบด้วยข้อมูลสมมติใน `fixtures.js`
→ ไม่แตะฐานข้อมูลจริง ไม่มีชื่อ/เบอร์พนักงานจริงในภาพ · วงเลขแดงวาดทับ element จริงด้วย `harness.js` (ตำแหน่งตรงเสมอ)

## ถ่ายใหม่เมื่อหน้าตาเปลี่ยน
```
cd admin && VITE_API_URL= npx vite --port 5199 --strictPort      # เทอร์มินัล 1
cd scripts/manual-shots && npm i puppeteer-core --no-save          # ครั้งแรกครั้งเดียว
node capture.js                  # ถ่ายทุกภาพ   (หรือ: node capture.js login dashboard เฉพาะบางภาพ)
```
- แก้รายการภาพ/จุดเลข: `shots_def.js` (id = ชื่อไฟล์ · marks = วงเลข)  ·  ข้อความอธิบายแต่ละเลข: `admin/src/pages/manual/content.ts` (n ต้องตรงกัน)
- ตัวแปร: `CHROME_PATH` (ถ้า Chrome ไม่ได้อยู่ที่เดิม) · `MANUAL_BASE`
- เพิ่ม API ใหม่ที่หน้านั้นเรียก: เติม route ใน `fixtures.js` (ถ้า endpoint ไหนไม่ตรง จะขึ้น `unmatched:` ตอนรัน)
