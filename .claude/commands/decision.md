---
description: สร้าง ADR (Architecture Decision Record) ใหม่
allowed-tools: Read, Write, Edit, Glob, Bash
---

สร้าง ADR ใหม่ใน `brain/decisions/`

## ขั้นตอน

1. **หาเลข ADR ถัดไป**
   - `ls brain/decisions/ | grep -E '^[0-9]{4}-' | sort | tail -1`
   - +1 เป็นเลขใหม่ (เริ่ม 0001)
2. **ตั้งชื่อไฟล์** `NNNN-decision-title.md` kebab-case
3. **ดึงวันที่** ด้วย `date +%Y-%m-%d`
4. **เก็บข้อมูลจากผู้ใช้** ถ้ายังไม่ครบ — ถาม clarifying:
   - ตัดสินใจอะไร
   - context/ปัญหาคืออะไร
   - alternatives ที่คิดมาแล้ว
5. **เขียนตาม template**
6. **อัปเดต `brain/INDEX.md`** ใต้ Decisions
7. **อัปเดต daily log** เพิ่ม backlink

## Template

```markdown
---
type: adr
id: NNNN
status: proposed
date: <YYYY-MM-DD>
deciders: []
tags: [adr]
---

# ADR-NNNN: <ชื่อการตัดสินใจ>

## Status
`proposed` — ยังไม่ได้ implement
<!-- อัปเดตเป็น accepted / rejected / superseded ภายหลัง -->

## Context
ปัญหา / constraints / forces ที่ผลักดันให้ต้องตัดสินใจ

## Decision
**เราจะ <กริยา>**

ตามด้วยรายละเอียดว่าจะทำยังไง

## Consequences
**Positive**
- ...

**Negative**
- ...

**Risks**
- ...

## Alternatives considered

### Alt 1: <ชื่อ>
- ข้อดี:
- ข้อเสีย:
- ทำไมไม่เลือก:

### Alt 2: <ชื่อ>
...

## Related
- [[...]]

## References
- (link ถ้ามี)
```

## หลักการ

- ADR คือ **บันทึก** — ห้ามแก้หลัง accept แล้ว (ถ้าจะเปลี่ยน → สร้าง ADR ใหม่ที่ supersede อันเก่า)
- เขียน decision เป็น "We will ..." ตามมาตรฐาน Michael Nygard
- Alternatives ควรมีอย่างน้อย 2 อัน ไม่งั้นไม่ได้ตัดสินใจจริง
