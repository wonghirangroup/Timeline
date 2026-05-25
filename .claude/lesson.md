---
description: บันทึกบทเรียนจาก bug หรือทางตันที่เพิ่งเจอ
allowed-tools: Read, Write, Edit, Glob, Bash
---

สร้างไฟล์ lesson ใหม่ใน `brain/lessons/` จากบริบทปัจจุบัน

## ขั้นตอน

1. **ดึงวันที่** ด้วย `date +%Y-%m-%d`
2. **ระบุประเด็น** จากการสนทนาล่าสุด:
   - อาการ (symptom)
   - root cause (สาเหตุที่แท้จริง)
   - วิธีแก้
3. **เลือกชื่อไฟล์** kebab-case สรุปประเด็น เช่น `prisma-migration-deadlock.md`, `docker-volume-permissions-on-wsl.md`
4. **เขียนตาม template**
5. **อัปเดต `brain/INDEX.md`** ใต้ section Lessons
6. **อัปเดต daily log วันนี้** เพิ่ม backlink `[[lessons/<filename>]]`

## Template

```markdown
---
type: lesson
date: <YYYY-MM-DD>
tags: [lesson, stack/<...>]
severity: low | medium | high
---

# <สรุปบทเรียนใน 1 บรรทัด>

## อาการ
สิ่งที่เห็น/เกิดขึ้น (errors, logs, behavior)

## บริบท
ตอนนั้นทำอะไรอยู่ stack อะไร เวอร์ชันเท่าไหร่

## สาเหตุที่แท้จริง
หลังขุดจริงๆ คืออะไร — อย่าเขียนแค่ "fix แล้ว" ต้องอธิบาย **why**

## วิธีแก้
\`\`\`<lang>
<code หรือ command ที่แก้ได้>
\`\`\`

## เคล็ดป้องกันในอนาคต
- สัญญาณบอกเหตุที่ควรสังเกต
- คำสั่ง debug ที่ควรใช้ครั้งหน้า

## Sources
- (link issue, docs, stack overflow ถ้ามี)

## Related
- [[...]]
```

## หลักการ

- เขียนเหมือนอธิบายให้เพื่อนที่จะมาเจอปัญหาเดียวกัน
- root cause ต้องชัด — ถ้ายังไม่แน่ใจ ให้เขียนว่า "สมมติฐาน:" และมาร์ค `severity:` ที่ต่ำลง
- อย่าใส่ secret ลงไป — sanitize logs ก่อน
