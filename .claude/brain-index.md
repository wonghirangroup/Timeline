---
description: สร้าง/อัปเดต brain/INDEX.md ให้ครอบคลุมทุกโน้ตปัจจุบัน
allowed-tools: Read, Write, Edit, Glob, Bash
---

สร้างหรืออัปเดต `brain/INDEX.md` ให้เป็น MOC (Map of Content) ของทั้ง vault

## ขั้นตอน

1. **List ไฟล์ทั้งหมดใน brain/** ยกเว้น `INDEX.md`, `README.md`, และ `_template.md`
2. **อ่าน frontmatter** ของแต่ละไฟล์เพื่อรู้ `type` และ `tags`
3. **จัดกลุ่ม** ตาม type:
   - Daily logs (ล่าสุด 7 วัน — ที่เก่ากว่านั้นรวบเป็น "Archive")
   - Decisions (เรียงตามเลข, แสดง status)
   - Lessons (เรียงตามวันที่ ใหม่บนสุด)
   - Notes (เรียงตาม tag)
   - Snippets (เรียงตาม language)
   - People
4. **เขียนทับ `brain/INDEX.md`** ตาม template

## Template

```markdown
---
type: index
updated: <YYYY-MM-DD HH:MM>
---

# Brain Index

> Map of Content — auto-generated โดย /brain-index
> โน้ตทั้งหมด: <count>

## 📅 Daily logs (ล่าสุด)
- [[daily/YYYY-MM-DD]] — <topic ที่ทำหลักๆ>
- ...

## 🏛️ Decisions
- [[decisions/0001-...]] — ✅ accepted
- [[decisions/0002-...]] — 🟡 proposed
- ...

## 💡 Lessons (ใหม่ก่อน)
- [[lessons/...]] — <สรุป 1 บรรทัด> · <date>
- ...

## 📚 Notes
### topic/backend
- [[notes/...]]
### topic/ai
- [[notes/...]]
### topic/...
- ...

## 🧩 Snippets
### Python
- [[snippets/...]]
### TypeScript
- [[snippets/...]]

## 👥 People
- [[people/...]]
```

## หลักการ

- ใส่ 1-line summary ข้างชื่อไฟล์ — ดึงจาก H1 หรือ TL;DR ของแต่ละไฟล์
- โน้ตที่ไม่มี tag → ใส่ใต้ `### untagged`
- Status icon: ✅ accepted, 🟡 proposed, ❌ rejected, ⚪ superseded
