---
description: สรุป retrospective รายสัปดาห์จาก brain/daily/
allowed-tools: Read, Write, Edit, Glob, Bash
---

สร้างสรุป weekly retrospective จาก daily logs 7 วันที่ผ่านมา และ (ทางเลือก) บันทึกลง brain

## ขั้นตอน

1. **ดึงวันที่ปัจจุบัน** ด้วย `date +%Y-%m-%d`
2. **อ่าน daily logs 7 วันย้อนหลัง** — ไฟล์ `brain/daily/<YYYY-MM-DD>.md`
   - ถ้าบางวันไม่มีไฟล์ ข้ามไป ไม่ต้องบอก
3. **อ่าน ADR ที่ถูกสร้างในสัปดาห์นี้** — Grep `brain/decisions/` หาไฟล์ที่มี `date:` ใน range
4. **อ่าน Lessons ที่ถูกสร้างในสัปดาห์นี้** — Grep `brain/lessons/`
5. **สร้าง retro output**:

```
🔄 Weekly Retro — <วันจันทร์> → <วันศุกร์>

✅ Went well
- <สิ่งที่ทำสำเร็จ — จาก log section "สิ่งที่ทำ">
- ...

🧠 Learned
- <บทเรียนจาก brain/lessons/ สัปดาห์นี้>
- <ความรู้ใหม่จาก log>

📐 Decisions made
- [[decisions/NNNN-...]] — <สรุป 1 บรรทัด>
- ...

🔧 Improve next week
- <สิ่งที่ติดจาก "ค้างไว้" ที่ยังไม่เสร็จ>
- <pattern ที่ซ้ำๆ จาก lessons>

📊 Stats
- Sessions: <นับจำนวน daily log ที่มีงาน>
- Decisions: <จำนวน ADR>
- Lessons: <จำนวน lesson>
```

6. **ถามผู้ใช้** ว่าจะบันทึกลง `brain/notes/retro-YYYY-WNN.md` หรือแค่ดูแล้วจบ

## หลักการ

- retro คือ mirror ไม่ใช่ report — เน้น pattern และ insight ไม่ใช่ checklist
- "Improve" ควรเป็น action ที่ทำได้จริง ไม่ใช่ vague เช่น "ทำให้ดีขึ้น"
- ถ้า brain ไม่มี log ครบ → บอกตรงๆ ว่า "ข้อมูลไม่ครบเพราะ log ขาด N วัน"
