---
description: บันทึกสรุป session ลง daily log + อัปเดต _LOG_VIEW.txt พร้อมกัน
allowed-tools: Read, Write, Edit, Bash
---

สรุปงานใน session ปัจจุบัน แล้วเขียนลง **2 ที่พร้อมกัน**:
1. `brain/daily/<วันนี้>.txt` — session log แบบละเอียด (Obsidian อ่านได้)
2. `brain/_LOG_VIEW.txt` — log สรุปภาพรวม (VS Code เปิดดูได้)

สัญลักษณ์ที่ใช้:
- `[...]` = ยังไม่ทำ
- `[/]` = ทำแล้ว (สำเร็จ)
- `[x]` = ทำไม่สำเร็จ

---

## ขั้นตอน

### Step 1 — ดึงวันที่และเวลา
ใช้ PowerShell:
```powershell
Get-Date -Format "yyyy-MM-dd"
Get-Date -Format "HH:mm"
```

### Step 2 — เขียน brain/daily/<YYYY-MM-DD>.txt

- ถ้าไฟล์ยังไม่มี → สร้างใหม่จาก template
- ถ้ามีแล้ว → append session ใหม่ต่อท้าย (เว้น 2 บรรทัดก่อน)

รูปแบบ session block:
```
=== <HH:MM> session ===
Goal: <สิ่งที่ผู้ใช้ตั้งเป้าทำ session นี้>

Tasks:
[/] <งานที่ทำสำเร็จ>
[...] <งานที่ยังค้าง>
[x] <งานที่ลองแล้วไม่สำเร็จ — เหตุผล>

Files changed:
- path/to/file — <สิ่งที่แก้>

Notes:
- <decision หรือ lesson สำคัญ ถ้ามี>
```

Template ไฟล์ใหม่:
```
# <YYYY-MM-DD>
================

=== <HH:MM> session ===
Goal: ...

Tasks:
[...] 

Files changed:
-

Notes:
-
```

### Step 3 — อัปเดต brain/_LOG_VIEW.txt

อ่านไฟล์ `brain/_LOG_VIEW.txt` ก่อน แล้วทำตามนี้:

**3a. หา version block ล่าสุด** (รูปแบบ `v001`, `v002`, ...)
- ถ้า session นี้ต่อเนื่องจาก version ล่าสุด → append งานที่ทำลงใน block นั้น
- ถ้าเป็นงานใหม่คนละ goal → สร้าง version block ใหม่ต่อท้าย

**3b. รูปแบบ version block ใหม่:**
```
══════════════════════════════════════════════════════════════════
v<NNN>  │  <YYYY-MM-DD>  │  <ชื่อ goal session นี้>
══════════════════════════════════════════════════════════════════
  Goal: <อธิบาย goal สั้นๆ>

  [/] <งานที่ทำสำเร็จ>
  [/] <งานที่ทำสำเร็จ>
  [...] <งานที่ยังค้าง>
  [x] <งานที่ล้มเหลว — เหตุผล>

  Files:
    · path/to/file — <สิ่งที่แก้>

──────────────────────────────────────────────────────────────────
```

**3c. อัปเดต Progress bars** ถ้ามีความคืบหน้าที่ชัดเจน:
```
  Admin UI (Mock)          [////////////////////]  100%
  Super Admin UI (Mock)    [////////////////////]  100%
  Employee LIFF (Mock)     [////////////////    ]   80%
  Backend API              [                    ]    0%
  Database / Prisma        [                    ]    0%
  Line LIFF Integration    [                    ]    0%
  Tests                    [                    ]    0%
```
แต่ละ `/` = 5% (20 ช่องรวม = 100%)

**3d. อัปเดต footer:**
```
════════════════════════════════════════════════════════════════
  Total: <N> session(s) │ <วันที่ล่าสุด>
════════════════════════════════════════════════════════════════
```

---

## หลักการ

- เขียนให้ตัวเอง (Claude session ถัดไป) อ่านแล้วต่องานได้
- ระบุ path ของไฟล์เสมอ — ตัวเองในวันพรุ่งนี้จะไม่จำว่าไฟล์อยู่ไหน
- `[x]` ต้องมีเหตุผลสั้นๆ เพื่อไม่ลองผิดซ้ำ
- ถ้าทำหลาย session ในวันเดียว → append เพิ่ม ห้ามทับ
- `brain/daily/*.txt` = Obsidian เปิดได้, `_LOG_VIEW.txt` = VS Code เปิดได้
- **ทำ Step 2 และ Step 3 ทุกครั้ง — ห้ามข้าม**
