---
description: สร้างสรุป daily standup จาก brain/daily/ ย้อนหลัง 1-2 วัน
allowed-tools: Read, Glob, Bash
---

สร้างข้อความ standup (Yesterday / Today / Blockers) จาก brain

## ขั้นตอน

1. **ดึงวันที่ปัจจุบัน** ด้วย `date +%Y-%m-%d`
2. **อ่าน daily log ย้อนหลัง 2 วัน** — ไฟล์ `brain/daily/<YYYY-MM-DD>.md`
   - ถ้าวันก่อนไม่มีไฟล์ (weekend/ไม่ได้ทำงาน) ย้อนไปเรื่อยๆ จนเจอ
3. **สร้าง standup output** ตามรูปแบบ:

```
📋 Daily Standup — <วันที่วันนี้>

✅ Yesterday
- <สิ่งที่ทำจาก log ล่าสุด — bullet 2-4 อัน>
- ...

🎯 Today
- <งานที่ค้างไว้จาก log ("ค้างไว้: [ ]") + งานที่วางแผนใหม่ (ถ้ามีจาก context)>
- ...

🚧 Blockers
- <ปัญหาที่ติดอยู่ — ถ้าไม่มีให้เขียน "ไม่มี">
```

4. **ถามผู้ใช้** ว่าจะเพิ่มอะไรใน "Today" หรือ copy ไปใช้ได้เลย

## หลักการ

- Yesterday ดูจาก "สิ่งที่ทำ" ใน log — ไม่ใช่ tool call รายการ แต่คือ outcome จริง
- Today ดูจาก "ค้างไว้" ใน log + ถามถ้าไม่ชัด
- Blockers ดูจากคำว่า "ติดปัญหา", "รอ", "ยังไม่รู้" ใน log
- เขียนให้กระชับ — standup ไม่ใช่รายงาน
