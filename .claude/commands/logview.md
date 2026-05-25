---
description: Generate และเปิด _LOG_VIEW.txt แสดง session ทั้งหมดพร้อม version
allowed-tools: Bash, Read
---

Generate log view จาก brain/daily/ ทั้งหมดแล้วแสดงผล

## ขั้นตอน

1. รัน `node scripts/log-view.js` เพื่อ generate `brain/_LOG_VIEW.txt`
2. อ่านไฟล์ที่ได้และแสดงให้ผู้ใช้เห็น
3. แจ้งว่าเปิดไฟล์ได้ที่ `brain/_LOG_VIEW.txt`

## หลังรัน

บอกผู้ใช้ว่า:
- เปิดไฟล์ใน VS Code: **Ctrl+Shift+P** → "📋 Log View" task
- หรือ `code brain/_LOG_VIEW.txt` ใน terminal
- ไฟล์จะ refresh ทุกครั้งที่รัน task

## ถ้าต้องการดู tasks ค้างทั้งหมด
ค้น `[...]` ใน `brain/daily/` ด้วย Grep แล้ว list รวมกัน
