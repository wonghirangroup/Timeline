---
description: โหลด context ทั้งหมด — อ่าน CLAUDE.md + brain vault ก่อนเริ่มทำงาน
allowed-tools: Read, Glob, Grep, Bash
---

โหลด context ของ project TimeLine HR ให้ครบก่อนเริ่มทำงาน

## ขั้นตอน

### 1. อ่าน CLAUDE.md
อ่าน `CLAUDE.md` ทั้งหมด — เข้าใจ:
- Tech stack, architecture, naming conventions
- Business rules: attendance, leave, branch/tenant
- Safety guardrails (tenant isolation, soft delete, etc.)
- Slash commands ที่มีให้ใช้

### 2. อ่าน Brain INDEX
อ่าน `brain/INDEX.md` — รู้ว่ามีโน้ตอะไรบ้างใน vault

### 3. อ่าน Daily Log ล่าสุด
- หา daily logs ล่าสุด 3 ไฟล์ใน `brain/daily/` (เรียงตามชื่อไฟล์ = วันที่)
- อ่านทุกไฟล์ที่เจอ — โฟกัสที่:
  - **Tasks `[...]`** = งานที่ยังค้างอยู่
  - **Tasks `[x]`** = งานที่ลองแล้วไม่สำเร็จ (ระวังไม่ให้ทำซ้ำ)
  - **Notes** = decision หรือ lesson สำคัญ

### 4. ค้น Decisions ล่าสุด
- Glob `brain/decisions/*.md` ดูว่ามี ADR ไหนบ้าง
- อ่าน ADR ที่ status = `proposed` หรือ `accepted` ล่าสุด

### 5. สรุปให้ผู้ใช้

แสดงผลในรูปแบบนี้:

```
🧠 Context โหลดแล้ว — TimeLine HR

📌 Project: HR SaaS Multi-tenant | Fastify + Prisma + React + Line LIFF
📅 วันนี้: <วันที่>

🔄 งานที่ค้างจาก session ล่าสุด (<วันที่ log ล่าสุด>):
  [...] <งานที่ยังไม่ทำ>
  [x]  <งานที่ทำไม่สำเร็จ + เหตุผล>

📐 Decisions ที่มีผล:
  - ADR-XXXX: <ชื่อ> (accepted/proposed)

🗂️ Brain vault: <จำนวน> โน้ต | ดู brain/INDEX.md

⚠️  สิ่งที่ต้องระวัง (จาก log):
  - <ถ้ามี pattern หรือ gotcha ที่ควรรู้>

พร้อมทำงาน — บอกได้เลยว่าอยากทำอะไรต่อ
```

## ถ้า brain ยังว่าง (ไม่มี daily log)

```
🧠 Context โหลดแล้ว — TimeLine HR

📌 Project: HR SaaS Multi-tenant | Fastify + Prisma + React + Line LIFF
📅 วันนี้: <วันที่>

📂 Brain vault พร้อมใช้งาน (ยังไม่มี session log)
   → รัน /log ก่อน /clear เพื่อเก็บ session ไว้

พร้อมทำงาน — บอกได้เลยว่าอยากทำอะไร
```

## หลักการ
- อ่านจริง อย่า assume — ถ้าไฟล์ไม่มีให้บอกตรงๆ
- งาน `[...]` ค้างอยู่ → เสนอให้ทำต่อ ถ้าผู้ใช้ไม่ได้บอกทิศทางใหม่
- งาน `[x]` → อย่าลองวิธีเดิมซ้ำ ให้แจ้งและเสนอแนวทางใหม่
