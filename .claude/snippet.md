---
description: บันทึก code snippet ที่อาจกลับมาใช้ลง brain/snippets/
allowed-tools: Read, Write, Edit, Glob, Grep
---

บันทึก snippet ลง `brain/snippets/` พร้อม context ว่าใช้ทำอะไร

## ขั้นตอน

1. **ดึง snippet** จาก:
   - `$ARGUMENTS` ถ้าผู้ใช้พิมพ์ชื่อ/บอก topic มา
   - หรือจาก code block ล่าสุดในการสนทนา
   - ถ้าไม่ชัด → ถาม "จะบันทึก snippet ส่วนไหน?"
2. **เช็คก่อนว่ามี snippet คล้ายกันอยู่แล้วไหม** — Grep ใน `brain/snippets/`
   - ถ้ามี → ถามว่าจะ merge เข้าไฟล์เดิม หรือสร้างไฟล์ใหม่
3. **ตั้งชื่อไฟล์** รูปแบบ `<topic>-<lang>.md` เช่น:
   - `jwt-verify-typescript.md`
   - `prisma-soft-delete-pattern.md`
   - `docker-compose-healthcheck.md`
4. **เขียนตาม template**
5. **อัปเดต `brain/INDEX.md`** ใต้ Snippets → ภาษาที่ใช้

## Template

```markdown
---
type: snippet
lang: <typescript | python | sql | shell | ...>
tags: [snippet, stack/<lang>, topic/<xxx>]
created: <YYYY-MM-DD>
---

# <ชื่อ snippet>

## ใช้เมื่อ
อธิบายสั้นๆ ว่า snippet นี้แก้ปัญหาอะไร / ใช้ใน context ไหน

## Code

\`\`\`<lang>
<code>
\`\`\`

## หมายเหตุ
- dependency ที่ต้องการ (ถ้ามี)
- gotcha ที่ต้องระวัง
- เวอร์ชัน / platform ที่ test แล้ว

## Related
- [[...]]
```

## หลักการ

- snippet ที่ดีคือสิ่งที่จะค้นหาได้ตอนลืม — เขียน "ใช้เมื่อ" ให้ searchable
- ถ้า snippet ยาวเกิน 50 บรรทัด → พิจารณาแตกเป็นหลาย snippet
- sanitize ทุกครั้ง — ห้ามบันทึก key, token, หรือ URL internal
