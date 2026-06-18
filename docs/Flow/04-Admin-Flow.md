# Flow การทำงาน — Admin

> **ผู้ใช้:** Admin ของ Tenant (บริษัทลูกค้า)  
> **ช่องทาง:** Web App เท่านั้น  
> **สิทธิ์:** จัดการทุก Branch ใน Tenant ของตัวเอง — ดูรายงาน, approve leave, ตั้งค่าระบบ  
> **Route prefix:** `/api/v1/admin/...`

---

## สารบัญ

1. [Dashboard — ภาพรวมวันนี้](#1-dashboard--ภาพรวมวันนี้)
2. [Branch — จัดการสาขา](#2-branch--จัดการสาขา)
3. [Employee — จัดการพนักงาน](#3-employee--จัดการพนักงาน)
4. [Shift Hub — กะการทำงาน](#4-shift-hub--กะการทำงาน)
5. [Attendance — บันทึกการเข้างาน](#5-attendance--บันทึกการเข้างาน)
6. [Leave Hub — วันลา](#6-leave-hub--วันลา)
7. [Holiday — วันหยุดประจำปี](#7-holiday--วันหยุดประจำปี)
8. [OT — ล่วงเวลา](#8-ot--ล่วงเวลา)
9. [Report — รายงาน](#9-report--รายงาน)
10. [Settings — การตั้งค่า](#10-settings--การตั้งค่า)
11. [Announcement — ประกาศภายใน](#11-announcement--ประกาศภายใน)

---

## 1. Dashboard — ภาพรวมวันนี้

**หน้าที่:** แสดงสถานะการเข้างานของวันปัจจุบัน และ shortcut ไปยังงานที่รอดำเนินการ

```
Admin เปิดหน้า Dashboard
  ├── ระบบดึง attendance ของวันปัจจุบัน (ทุก branch ใน tenant)
  ├── แสดง Stat Cards 4 ช่อง
  │     ├── มาปกติ (ON_TIME)
  │     ├── มาสาย (LATE_1 + LATE_2)
  │     ├── ขาดงาน (ABSENT)
  │     └── หยุด / ลา (WEEKLY_OFF / LEAVE / HOLIDAY / ...)
  │
  ├── Filter สาขา
  │     └── กรองรายชื่อพนักงานใน card ตาม branch ที่เลือก
  │
  ├── รายการพนักงาน (แสดง 6 คนแรก → กด "ดูทั้งหมด" เพื่อขยาย)
  │     แต่ละแถว: ชื่อ / สาขา / status badge / เวลาเช็คอิน
  │
  ├── Quick Action Cards
  │     ├── → Shift (จัดการกะ)
  │     ├── → Leave (อนุมัติวันลา)
  │     ├── → Attendance (บันทึกเข้างาน)
  │     └── → Report (ดูรายงาน)
  │
  └── Pending Badges
        ├── Leave: จำนวน request ที่ยังเป็น PENDING
        └── OT: จำนวน OT request ที่ยังรอ approve
```

---

## 2. Branch — จัดการสาขา

**หน้าที่:** สร้างและจัดการสาขา รวมถึงตั้งค่า GPS และ QR Code สำหรับเช็คอิน

```
Admin เปิดหน้า Branch
  ├── แสดงรายการสาขาทั้งหมดของ tenant
  │     แต่ละ card: ชื่อ / ที่อยู่ / จำนวนพนักงาน / จำนวนกะ / สถานะ
  │
  ├── [+ เพิ่มสาขา]
  │     ├── กรอก: ชื่อสาขา, ที่ตั้ง
  │     ├── ปักหมุด GPS (map UI หรือใส่ lat/lng ด้วยมือ)
  │     ├── กำหนด GPS Radius (หน่วย: เมตร)
  │     ├── เลือก GPS Mode
  │     │     ├── WARN  → เช็คอินได้ แต่แจ้งเตือนว่าอยู่นอกพื้นที่
  │     │     └── BLOCK → ห้ามเช็คอินถ้าอยู่นอกรัศมี
  │     └── บันทึก → สาขาใหม่ปรากฏใน list
  │
  ├── [แก้ไขสาขา]
  │     └── pre-fill ข้อมูลเดิมทุกฟิลด์ → แก้ไข → บันทึก
  │
  ├── [QR Code สาขา]
  │     ├── Admin เลือกสาขา + กะ
  │     ├── ระบบ generate QR (embed: branch_id + shift_id + signed secret)
  │     ├── Download / Print QR
  │     └── พนักงานสแกน QR ใน LIFF
  │           → check-in อัตโนมัติโดยไม่ต้องเลือก shift เอง
  │
  └── [ปิด / เปิดใช้งาน]
        └── soft toggle is_active (ไม่ลบข้อมูล)
```

**Business Rules**
- สาขาต้องผูกกับ tenant เสมอ (`tenant_id` บังคับ)
- พนักงาน 1 คน สังกัด 1 สาขาในช่วงเวลาหนึ่ง
- GPS radius ขั้นต่ำ 50 เมตร เพื่อรองรับ GPS drift ของมือถือ

---

## 3. Employee — จัดการพนักงาน

**หน้าที่:** สร้าง แก้ไข และจัดการพนักงานทั้งหมดของ tenant รวมถึงการผูก Line UID

```
Admin เปิดหน้า Employee
  ├── แสดงตารางพนักงานทั้งหมด
  │     Filter: สาขา / แผนก / สถานะ / search ชื่อ-รหัส
  │     แต่ละแถว: รหัส / ชื่อ / แผนก / สาขา / Line UID status / is_active
  │
  ├── [+ เพิ่มพนักงาน]
  │     ├── กรอก: ชื่อ, นามสกุล, ชื่อเล่น
  │     ├── รหัสพนักงาน (กรอกเอง หรือ auto-generate)
  │     ├── เลือก: สาขา, แผนก, เบอร์โทร, วันเริ่มงาน
  │     ├── บันทึก → ระบบสร้าง employee record
  │     └── ส่ง Verification Link ผ่าน Line OA
  │           └── พนักงานคลิกลิงก์ → login Line → ระบบ map
  │                 employee_id ↔ line_user_id (บันทึกใน DB)
  │
  ├── [แก้ไขพนักงาน]
  │     └── แก้ข้อมูลพื้นฐาน / ย้ายสาขา / เปลี่ยนแผนก
  │
  ├── [ดูรายละเอียด] → หน้า /employee/:id
  │     ├── ประวัติ attendance 30 วันล่าสุด
  │     ├── สรุปวันลา: ใช้ไป / คงเหลือ แต่ละประเภท
  │     └── Line UID status + ปุ่ม Re-send verification link
  │
  ├── [Import CSV]
  │     ├── Download template (.csv)
  │     ├── กรอกข้อมูลพนักงาน → Upload
  │     └── Preview → Confirm → bulk create
  │
  └── [ปิดใช้งาน / ลบ]
        └── soft delete (deleted_at) — ข้อมูลยังอยู่ใน DB
```

**Business Rules**
- `employee_code` ต้องไม่ซ้ำกันภายใน tenant เดียวกัน
- พนักงานที่ยัง `line_user_id = null` → LIFF จะแสดงหน้า "กรุณายืนยันตัวตน"
- การย้ายสาขาจะมีผลกับ attendance ที่สร้างหลังจากนั้น (ไม่ย้อนหลัง)

---

## 4. Shift Hub — กะการทำงาน

ประกอบด้วย 3 Tab: **จัดการกะ / ตารางกะ / เช็คอินวันนี้**

---

### Tab A: จัดการกะ (Manage Shift)

**หน้าที่:** สร้างและแก้ไขกะการทำงาน พร้อมกำหนดเวลาและเกณฑ์การมาสาย

```
Admin เปิด Tab จัดการกะ
  ├── แสดงรายการกะทั้งหมดของ tenant
  │     แต่ละ card: ชื่อกะ / เวลาเริ่ม-สิ้นสุด / late threshold / สาขาที่ผูก
  │
  ├── [+ เพิ่มกะใหม่]
  │     ├── ชื่อกะ (เช่น "กะเช้า", "กะบ่าย", "กะกลางคืน")
  │     ├── เวลาเริ่ม / สิ้นสุด (HH:MM)
  │     ├── Late Threshold 1 — สาย (เช่น +5 นาที)
  │     ├── Late Threshold 2 — สายมาก (เช่น +20 นาที)
  │     ├── ผูกกับสาขา (เลือกได้หลายสาขา)
  │     └── บันทึก
  │
  └── [แก้ไข / ลบกะ]
        └── ลบได้เฉพาะกะที่ไม่มี attendance record ผูกอยู่
```

---

### Tab B: ตารางกะ (Shift Schedule)

**หน้าที่:** กำหนดว่าพนักงานแต่ละคนทำกะอะไรในแต่ละวัน

```
Admin เปิด Tab ตารางกะ
  ├── เลือก: สาขา + เดือน / ปี
  ├── แสดง Grid
  │     แถว = พนักงาน, คอลัมน์ = วันที่ในเดือน
  │     แต่ละช่อง: ชื่อกะที่ถูก assign (หรือว่าง)
  │
  ├── [Assign กะ]
  │     ├── คลิกช่องว่าง → dropdown เลือกกะ → บันทึก
  │     └── คลิกช่องที่มีกะ → เปลี่ยนกะ หรือลบออก
  │
  └── [Copy จากเดือนก่อน]
        └── copy ตาราง schedule ทั้งหมดมาเดือนใหม่ในคลิกเดียว
```

---

### Tab C: เช็คอินวันนี้ (Attendance Today)

**หน้าที่:** ดูสถานะ real-time และบันทึกเช็คอินแทนพนักงาน

```
Admin เปิด Tab เช็คอินวันนี้
  ├── Filter: สาขา + กะ
  ├── แสดงรายชื่อพนักงานในกะนั้น + สถานะปัจจุบัน
  │     ON_TIME / LATE_1 / LATE_2 / ยังไม่เช็คอิน
  │
  └── [บันทึกเช็คอินแทน]
        ├── กรณี: พนักงานลืม / ไม่มีมือถือ / GPS มีปัญหา
        ├── Admin เลือกพนักงาน → ระบบบันทึก check_in_method = 'ADMIN'
        ├── timestamp = เวลาปัจจุบัน (แก้ไขได้)
        └── บันทึก note เหตุผล (บังคับ)
```

---

## 5. Attendance — บันทึกการเข้างาน

**หน้าที่:** ดูและแก้ไข attendance records รายวัน ทุก branch ใน tenant

```
Admin เปิดหน้า Attendance
  ├── Filter: วันที่ + สาขา + กะ + พนักงาน
  ├── แสดงตาราง attendance records
  │     แต่ละแถว: ชื่อ / กะ / check_in / check_out / สถานะ / late_minutes / method
  │
  ├── [แก้ไข Record]
  │     ├── Admin แก้ check_in_at / check_out_at ด้วยมือ
  │     ├── ระบบ recalculate is_late + late_minutes อัตโนมัติ
  │     └── บันทึก note เหตุผลที่แก้ไข (audit trail)
  │
  ├── [เพิ่ม Record ใหม่]
  │     ├── กรณี: พนักงานไม่ได้เช็คอินเลย
  │     └── เลือก employee + shift + วันที่ + เวลา → method = 'ADMIN'
  │
  └── [ลบ Record]
        └── soft delete + บันทึก audit log
```

**check_in_method ที่รองรับ**

| method | ความหมาย |
|---|---|
| `LIFF` | เช็คอินผ่าน Line LIFF (ปกติ) |
| `QR` | สแกน QR Code สาขา |
| `ADMIN` | Admin บันทึกแทน |
| `WEB_FALLBACK` | เช็คอินผ่าน Web (fallback) |
| `SELFIE` | ถ่ายรูปยืนยัน |
| `OFFSITE` | ทำงานนอกสถานที่ |

---

## 6. Leave Hub — วันลา

ประกอบด้วย 4 Tab: **วันลา / วันหยุด / โควต้า / ปฏิทินรวม**

---

### Tab A: วันลา (Leave Requests)

**หน้าที่:** ดูและ approve/reject คำขอวันลาของพนักงาน

```
Admin เปิด Tab วันลา
  ├── แสดงรายการ Leave Requests ทั้งหมดของ tenant
  │     Filter: สาขา / สถานะ / ช่วงวันที่ / พนักงาน / ประเภทลา
  │     แต่ละแถว: ชื่อ / ประเภทลา / วันที่ / จำนวนวัน / สถานะ / วันที่ยื่น
  │
  ├── [PENDING] → Admin กด Approve หรือ Reject
  │     │
  │     ├── Approve
  │     │     ├── ระบบหัก leave_balance ของพนักงานตามจำนวนวัน
  │     │     ├── status → APPROVED
  │     │     └── ส่ง Line push message แจ้งพนักงาน (ถ้า line_user_id ถูก map)
  │     │
  │     └── Reject
  │           ├── Admin กรอก reason (บังคับ)
  │           ├── status → REJECTED (balance ไม่ถูกหัก)
  │           └── ส่ง Line push message แจ้งพนักงาน
  │
  └── [APPROVED] → Revoke (ยกเลิกการอนุมัติ)
        ├── Admin ยกเลิก leave ที่ approve ไปแล้ว
        └── ระบบคืน leave_balance ให้พนักงาน
```

**ประเภทการลา**

| ประเภท | โควต้า default | หมายเหตุ |
|---|---|---|
| ลาป่วย | ตาม Settings | ใช้ใบรับรองแพทย์ถ้า > 3 วัน |
| ลากิจ | ตาม Settings | แจ้งล่วงหน้า |
| ลาพักร้อน | ตาม Settings | ต้องวางแผนล่วงหน้า |
| ลาคลอด | 90 วัน | ตามกฎหมายแรงงาน |

**Business Rules**
- ลาย้อนหลังได้ไม่เกิน N วัน (กำหนดได้ใน Settings)
- ห้ามลาทับซ้อนกันในช่วงวันเดียวกัน
- Admin approve ได้ทุก branch ใน tenant
- Manager approve ได้เฉพาะพนักงานใน branch ตัวเอง

---

### Tab B: วันหยุด (Weekly Off)

**หน้าที่:** กำหนดวันหยุดประจำสัปดาห์ให้แต่ละสาขาและพนักงาน

```
Admin เปิด Tab วันหยุด
  ├── ตั้งค่าวันหยุดประจำสัปดาห์ per branch
  │     ตัวอย่าง: สาขา A หยุดอาทิตย์ / สาขา B หยุดจันทร์
  ├── Override per employee
  │     ตัวอย่าง: พนักงาน X หยุดวันอื่นที่ต่างจาก default สาขา
  └── ค่าเหล่านี้ใช้คำนวณ status = WEEKLY_OFF ใน attendance records
```

---

### Tab C: โควต้า (Leave Balance)

**หน้าที่:** ดูและปรับโควต้าวันลาของพนักงานทุกคน

```
Admin เปิด Tab โควต้า
  ├── แสดงตาราง leave balance ทุกคนใน tenant
  │     คอลัมน์: ชื่อ / ลาป่วย / ลากิจ / ลาพักร้อน / ลาคลอด
  │     แต่ละประเภท: โควต้า (quota) / ใช้ไป (used) / คงเหลือ (remaining)
  │
  ├── [ตั้งโควต้าประจำปี] (bulk — ต้นปีใหม่)
  │     ├── ใช้ค่า default จาก Settings
  │     └── หรือกำหนดเองแต่ละคน
  │
  └── [ปรับโควต้ารายบุคคล]
        └── Admin แก้ balance ของพนักงานคนใดก็ได้ + บันทึกเหตุผล
```

---

### Tab D: ปฏิทินรวม (Team Calendar)

**หน้าที่:** มองเห็นภาพรวมการลาและวันหยุดของทีม

```
Admin เปิด Tab ปฏิทินรวม
  ├── Calendar view รายเดือน
  ├── แต่ละวันแสดงชื่อพนักงานที่ลา / หยุด (color-coded ตามประเภท)
  ├── Filter: สาขา
  └── คลิกวัน → popup รายชื่อ + ประเภทการลาทั้งหมดในวันนั้น
```

---

## 7. Holiday — วันหยุดประจำปี

**หน้าที่:** จัดการวันหยุดนักขัตฤกษ์และวันหยุดของบริษัท

```
Admin เปิดหน้า Holiday
  ├── ระบบโหลด Thai National Holidays ปีปัจจุบันอัตโนมัติ
  ├── แสดงควบคู่: Calendar view + List view
  │
  ├── [เพิ่มวันหยุดบริษัท]
  │     ├── เลือกวันที่ + ชื่อวันหยุด
  │     ├── ประเภท: NATIONAL / COMPANY / RELIGIOUS
  │     └── Recurring toggle (ทำซ้ำทุกปี)
  │
  ├── [แก้ไข / ลบวันหยุด]
  │     └── ลบ National Holiday ได้ (ถ้าบริษัทไม่ใช้)
  │
  ├── [Branch Override]
  │     └── กำหนดวันหยุดพิเศษเฉพาะสาขา ที่ต่างจากนโยบายหลัก
  │
  └── ผลลัพธ์
        → พนักงานที่เช็คอินในวันหยุด → status = HOLIDAY
        → วันหยุดปรากฏใน Team Calendar + Shift Schedule
```

**ประเภทวันหยุด**

| type | ความหมาย |
|---|---|
| `NATIONAL` | วันหยุดนักขัตฤกษ์ (ราชการ) |
| `COMPANY` | วันหยุดบริษัทกำหนดเอง |
| `RELIGIOUS` | วันสำคัญทางศาสนา |

---

## 8. OT — ล่วงเวลา

**หน้าที่:** อนุมัติ OT และติดตามชั่วโมงล่วงเวลาของพนักงาน

```
Admin เปิดหน้า OT
  ├── แสดงรายการ OT Requests
  │     Filter: สาขา / เดือน / สถานะ
  │     แต่ละแถว: ชื่อ / วันที่ / ชั่วโมง / เหตุผล / สถานะ / OT week total
  │
  ├── Status Flow
  │     PENDING → APPROVED / REJECTED → PAID
  │
  ├── [PENDING] → Approve หรือ Reject
  │     ├── Approve
  │     │     ├── ตรวจสอบ weekly OT cap (default 36 ชม./สัปดาห์)
  │     │     ├── ไม่เกิน cap → APPROVED ทันที
  │     │     ├── เกิน cap → แสดง warning (Admin force approve ได้)
  │     │     └── แจ้งพนักงานผ่าน Line
  │     └── Reject
  │           ├── กรอก reason
  │           └── แจ้งพนักงานผ่าน Line
  │
  ├── [APPROVED] → Mark as PAID
  │     └── บันทึกว่าจ่ายเงิน OT แล้ว → status = PAID
  │
  └── Summary Bar
        ├── รวมชั่วโมง OT ที่ approved ของเดือน
        └── จำนวน request ที่รออนุมัติ
```

**Business Rules**
- OT weekly cap = 36 ชม./สัปดาห์ (ปรับได้ใน Settings)
- Admin / Manager ตรวจสอบ cap ก่อน approve เสมอ
- PAID records เป็น immutable — ยกเลิกไม่ได้

---

## 9. Report — รายงาน

**หน้าที่:** สรุปข้อมูลการเข้างาน วันลา และ OT แบบรายเดือน พร้อม export

```
Admin เปิดหน้า Report
  ├── เลือก: สาขา + ช่วงวันที่ (start – end)
  ├── กด "คำนวณ" → ระบบ aggregate ข้อมูล
  │
  ├── แสดงตารางสรุปรายพนักงาน
  │     คอลัมน์:
  │     ├── ชื่อ / รหัส / สาขา
  │     ├── วันที่ทำงานปกติ
  │     ├── วันขาดงาน / วันสาย
  │     ├── OT (ชั่วโมงรวม)
  │     └── วันลาที่ใช้ไป (แต่ละประเภท)
  │
  ├── [ดูรายละเอียดรายคน] → Modal 2 Tab
  │     ├── Tab Log: attendance record รายวัน ตลอด period
  │     │     แต่ละวัน: กะ / check_in / check_out / status / late_min
  │     └── Tab Balance: โควต้าวันลาคงเหลือทุกประเภท
  │
  └── [Export]
        ├── CSV: ข้อมูลตารางทั้งหมด
        └── Print: browser print dialog
```

---

## 10. Settings — การตั้งค่า

ประกอบด้วย 2 Tab: **กฎค่าปรับ / ทั่วไป**

---

### Tab A: กฎค่าปรับ (Fine Rule)

**หน้าที่:** กำหนดกฎการคิดค่าปรับเมื่อพนักงานมาสาย

```
Admin เปิด Tab กฎค่าปรับ
  ├── เลือก Mode
  │     ├── Per Minute: ค่าปรับ = นาทีที่สาย × อัตรา (มี cap สูงสุด)
  │     └── Tier: กำหนด tier เช่น
  │               สาย 1–15 นาที  = 50 ฿
  │               สาย 16–30 นาที = 100 ฿
  │               สาย 31+ นาที   = นับเป็นขาดงาน
  │
  ├── [เพิ่ม / แก้ Tier] (เฉพาะ mode = Tier)
  │     ├── from_minute, to_minute, fine_amount
  │     └── option: countAsAbsent = true (นับเป็นขาดงาน)
  │
  └── Calculator Preview
        ← ใส่จำนวนนาที → ดูผลลัพธ์ค่าปรับทันที ก่อน save
```

---

### Tab B: ทั่วไป (General)

**หน้าที่:** กำหนดค่า default ระดับ tenant

```
Admin เปิด Tab ทั่วไป
  ├── โควต้าวันลา default ต่อปี
  │     ├── ลาป่วย (วัน)
  │     ├── ลากิจ (วัน)
  │     └── ลาพักร้อน (วัน)
  ├── leave_backdated_limit — ลาย้อนหลังได้สูงสุดกี่วัน
  ├── OT weekly cap (ชั่วโมง)
  └── บันทึก → ใช้เป็น default เมื่อ reset leave balance ต้นปี
```

---

## 11. Announcement — ประกาศภายใน

**หน้าที่:** ส่งประกาศไปยังพนักงานใน tenant ผ่าน Line Messaging API

```
Admin เปิดหน้า Announcement
  ├── แสดงรายการประกาศของ tenant ตัวเอง
  │     Filter: ประเภท / สถานะ / ช่วงวันที่
  │     แต่ละแถว: หัวข้อ / ประเภท / ผู้รับ / สถานะ / วันที่ส่ง
  │
  ├── [+ สร้างประกาศ]
  │     ├── ชื่อเรื่อง + เนื้อหา
  │     ├── ประเภท: INFO / WARNING / MAINTENANCE / URGENT
  │     ├── ผู้รับ: ทุกคนใน tenant / เฉพาะสาขา / เฉพาะแผนก
  │     ├── เวลาส่ง: ส่งทันที หรือ Schedule (กำหนดวัน-เวลา)
  │     └── DRAFT (บันทึกไว้ก่อน) / SEND (ส่งเลย)
  │
  ├── [DRAFT] → กด แก้ไข → กลับมา Compose → ส่งได้
  │
  ├── [ดูรายละเอียด]
  │     └── Modal: เนื้อหา + รายชื่อผู้รับ + สถานะการส่ง (delivered/failed)
  │
  └── ช่องทางการส่ง
        └── Line Messaging API → push message ไปยัง line_user_id
              ของพนักงานทุกคนที่ถูกเลือกเป็นผู้รับ
```

**ประเภทประกาศ**

| type | ใช้เมื่อ |
|---|---|
| `INFO` | ข่าวสารทั่วไป |
| `WARNING` | แจ้งเตือน เช่น กฎใหม่ / deadline |
| `MAINTENANCE` | แจ้งปิดระบบ / บำรุงรักษา |
| `URGENT` | เร่งด่วน ต้องการความสนใจทันที |

---

## สรุปภาพรวม

| หน้า | หน้าที่หลัก | Action สำคัญ |
|---|---|---|
| Dashboard | ภาพรวมวันนี้ | ดู status real-time / quick link |
| Branch | จัดการสาขา | CRUD + GPS radius + QR code |
| Employee | จัดการพนักงาน | CRUD + Line UID verify + CSV import |
| Shift | กะการทำงาน | สร้างกะ / ตารางกะ / เช็คอินวันนี้ |
| Attendance | บันทึกเข้างาน | ดู + แก้ไข record รายวัน |
| Leave | วันลา | Approve/Reject + Balance + Calendar |
| Holiday | วันหยุด | National + Company + Branch override |
| OT | ล่วงเวลา | Approve → Paid + weekly cap check |
| Report | รายงาน | สรุปรายเดือน + export CSV |
| Settings | ตั้งค่าระบบ | Fine rule + Leave quota default |
| Announcement | ประกาศ | ส่งผ่าน Line Messaging API |

---

*อัปเดตล่าสุด: 2026-06-17*  
*ดู flow อื่น: [01-Onboarding](./01-Onboarding-Flow.md) · [02-Shift-WorkPolicy](./02-Shift-WorkPolicy-Flow.md) · [03-LeaveBalance-Vacation](./03-LeaveBalance-Vacation-Flow.md)*
