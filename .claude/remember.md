---
description: บันทึก concept หรือความรู้ลง brain/notes/
allowed-tools: Read, Write, Edit, Glob, Grep
---

ผู้ใช้อยากให้คุณบันทึก concept ลง `brain/notes/` ในรูปแบบ atomic note

## ขั้นตอน

1. **เข้าใจสิ่งที่ต้องจำ** — อ่านจากสิ่งที่ผู้ใช้พิมพ์ตามหลังคำสั่ง หรือจากบริบทล่าสุดของแชท
2. **เช็คก่อนว่ามีโน้ตนี้อยู่แล้วหรือไม่** — Grep ใน `brain/notes/` ด้วย keyword หลัก
   - ถ้ามี → ถามผู้ใช้ว่าต้อง update ของเดิม หรือสร้างใหม่
   - ถ้าไม่มี → สร้างใหม่
3. **เลือกชื่อไฟล์** kebab-case ภาษาอังกฤษ เช่น `event-driven-architecture.md`, `python-asyncio-pitfalls.md`
4. **เขียนตาม template ด้านล่าง**
5. **อัปเดต `brain/INDEX.md`** เพิ่มลิงก์ใต้หมวด Notes
6. **แจ้งผู้ใช้** ชื่อไฟล์ที่บันทึก + 1 บรรทัดสรุป

## Template

```markdown
---
type: note
tags: [topic/xxx]
created: <วันนี้ YYYY-MM-DD>
aliases: []
---

# <ชื่อ concept>

## TL;DR
หนึ่งบรรทัด

## Why it matters
ใช้แก้ปัญหาอะไร / ทำไมต้องรู้

## How it works
อธิบายให้ตัวเองอ่านในอีก 6 เดือนแล้วเข้าใจ

## Examples
- ...

## Related
- [[...]]

## Sources
- (ถ้ามี)
```

## หลักการเขียน

- ใช้ภาษาเดียวกับที่ผู้ใช้พิมพ์
- เนื้อหาควร "atomic" — 1 concept ต่อ 1 ไฟล์
- ถ้าหัวข้อใหญ่เกิน → ตัดเป็นหลายไฟล์ แล้วใส่ backlink เชื่อม
- เพิ่ม tag `#status/seedling` ถ้ายังไม่สมบูรณ์
