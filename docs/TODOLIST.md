# Feature Todolist — TimeLine HR SaaS

> อัปเดตล่าสุด: 2026-05-18 (อัปเดตรอบ 2 — Employee LIFF UI Mock ครบทุกหน้า)  
> สแกนจากโค้ดจริงในโปรเจค

## สัญลักษณ์สถานะ

| สัญลักษณ์ | ความหมาย |
|---|---|
| ✅ | Done — มีโค้ดจริง ทำงานได้ |
| 🚧 | UI Only — มีหน้าจอแต่ยังไม่ต่อ API |
| 🔌 | Stub — มี endpoint แต่เป็น hardcode / mock |
| ❌ | Not Started — ยังไม่มีโค้ด |

---

## Dependency Legend

> ก่อนจะทำ Feature ไหน ดูที่ `🔗 ต้องการ` ก่อนเสมอ  
> ถ้า dependency ยัง ❌ ต้องทำ dependency ก่อน

---

## 1. SUPER ADMIN

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 1.1 | Login / Auth | ❌ | ❌ | ❌ | JWT สำหรับ Super Admin |
| 1.2 | Dashboard Overview | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 1.3 | Package Management | ❌ | ❌ | ❌ | สร้าง/แก้ Tier |
| 1.4 | Tenant List | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 1.5 | สร้าง Tenant ใหม่ | ❌ | ❌ | ❌ | — |
| 1.6 | Suspend / Activate Tenant | ❌ | ❌ | ❌ | — |
| 1.7 | Login as Admin (Impersonate) | ❌ | ❌ | ❌ | — |
| 1.8 | LINE OA Config per Tenant | ❌ | 🚧 | ❌ | หน้า line-config มีแต่ TODO |
| 1.9 | Billing / Subscription | ❌ | 🚧 | ❌ | หน้า billing มีแต่ TODO |
| 1.10 | Global Announcement | ❌ | ❌ | ❌ | ส่งข้อความหาทุก Tenant |

---

## 2. ADMIN

### 2.1 Authentication

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.1.1 | Login (email + password) | ❌ | ❌ | ❌ |
| 2.1.2 | JWT Refresh Token | ❌ | ❌ | ❌ |
| 2.1.3 | Logout | ❌ | ❌ | ❌ |

---

### 2.2 Dashboard

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch, 2.6 Shift, 2.7 Leave

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.2.1 | Summary Cards (8 สถานะ) | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 2.2.2 | Filter วันที่ (single/range) | ❌ | ❌ | ❌ | — |
| 2.2.3 | Filter สาขา | ❌ | ❌ | ❌ | — |
| 2.2.4 | Search Box พนักงาน | ❌ | ❌ | ❌ | — |
| 2.2.5 | Table Record + Pagination | ❌ | ❌ | ❌ | — |
| 2.2.6 | Manage Modal (แผนที่ + ประวัติ) | ❌ | ❌ | ❌ | — |
| 2.2.7 | Daily Summary (Cron job) | ❌ | — | ❌ | ประมวลผลตี 00:05 |

---

### 2.3 Employee Management

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.3.1 | List พนักงาน (+ search/filter) | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 2.3.2 | สร้างพนักงานรายคน | ❌ | ❌ | ❌ | — |
| 2.3.3 | Import Excel/CSV | ❌ | ❌ | ❌ | — |
| 2.3.4 | แก้ไขข้อมูลพนักงาน | ❌ | ❌ | ❌ | — |
| 2.3.5 | เปลี่ยนสถานะ + เหตุผล | ❌ | ❌ | ❌ | พักงาน/บวช/ทหาร/คลอด |
| 2.3.6 | ดู Status การผูก LINE | ❌ | ❌ | ❌ | PENDING / ACTIVE |
| 2.3.7 | Resend Invite Link | ❌ | ❌ | ❌ | ส่ง Link ยืนยันตัวตนซ้ำ |
| 2.3.8 | ตั้งค่า Salary / OT (HR only) | ❌ | ❌ | ❌ | Feature Toggle ตาม role |
| 2.3.9 | Export Excel | ❌ | ❌ | ❌ | — |

---

### 2.4 Branch Management

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.4.1 | List สาขา | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 2.4.2 | สร้าง/แก้ไขสาขา | ❌ | ❌ | ❌ | — |
| 2.4.3 | Map Picker (ปักหมุด GPS) | ❌ | ❌ | ❌ | Google Maps / Leaflet |
| 2.4.4 | ตั้งค่า Radius + Accuracy Buffer | ❌ | ❌ | ❌ | — |
| 2.4.5 | Generate QR Code | ❌ | ❌ | ❌ | QR Key = UUID ของสาขา |
| 2.4.6 | Toggle เปิด/ปิดจุดสแกน | ❌ | ❌ | ❌ | — |
| 2.4.7 | กำหนด Manager ประจำสาขา | ❌ | ❌ | ❌ | — |

---

### 2.5 Calendar & Leave Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch, 2.9 Leave Policy Settings

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.5.1 | Calendar View รายเดือน | ❌ | ❌ | ❌ | FullCalendar / React Big Calendar |
| 2.5.2 | Filter สาขา / รายคน | ❌ | ❌ | ❌ | — |
| 2.5.3 | แสดงวันหยุดนักขัตฤกษ์ | ❌ | ❌ | ❌ | — |
| 2.5.4 | แสดง Leave Request ในปฏิทิน | ❌ | ❌ | ❌ | — |
| 2.5.5 | Admin ลงวันหยุดให้พนักงาน | ❌ | ❌ | ❌ | Override |
| 2.5.6 | Admin สลับวันหยุด | ❌ | ❌ | ❌ | เปลี่ยน status ย้อนหลัง |
| 2.5.7 | Approve / Reject Leave จาก Admin | ❌ | 🚧 | ❌ | หน้า leave มีแต่ TODO |
| 2.5.8 | ตั้งวันหยุดนักขัตฤกษ์ประจำปี | ❌ | ❌ | ❌ | — |
| 2.5.9 | Weekly Day-off Quota Config | ❌ | ❌ | ❌ | จำนวนคนที่หยุดได้ต่อวัน |

---

### 2.6 Shift Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.6.1 | List กะงาน | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 2.6.2 | สร้าง/แก้ไขกะ | ❌ | ❌ | ❌ | — |
| 2.6.3 | ผูกกะกับสาขา | ❌ | ❌ | ❌ | — |
| 2.6.4 | ผูกกะกับพนักงานรายคน (Override) | ❌ | ❌ | ❌ | Priority: บุคคล > สาขา > บริษัท |
| 2.6.5 | ตั้งค่า Late Threshold 1 & 2 | ❌ | ❌ | ❌ | — |
| 2.6.6 | ตั้งค่า Early Check-in Window | ❌ | ❌ | ❌ | เช็คอินล่วงหน้าได้กี่นาที |
| 2.6.7 | Approve Shift Swap | ❌ | ❌ | ❌ | — |

---

### 2.7 Manual Check-in

🔗 **ต้องการก่อน:** 2.3 Employee, 2.6 Shift

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.7.1 | ค้นหาพนักงาน | ❌ | ❌ | ❌ | — |
| 2.7.2 | เลือก วัน/เวลา ย้อนหลัง | ❌ | ❌ | ❌ | — |
| 2.7.3 | บันทึก Check-in / Check-out | ❌ | ❌ | ❌ | — |
| 2.7.4 | บังคับกรอกเหตุผล | ❌ | ❌ | ❌ | — |
| 2.7.5 | Audit Log (is_manual = true) | ❌ | ❌ | ❌ | บันทึกว่า Admin ไหนลง |

---

### 2.8 OT Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.6 Shift, 2.9.3 OT Rate Settings

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.8.1 | List OT Request | ❌ | 🚧 | ❌ |
| 2.8.2 | Approve / Reject OT | ❌ | ❌ | ❌ |
| 2.8.3 | คำนวณ OT จาก check_out_time | ❌ | ❌ | ❌ |

---

### 2.9 Settings (หัวใจของระบบ)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.9.1 | Late Deduction Rules | ❌ | 🚧 | ❌ | สาย X นาที หัก Y บาท |
| 2.9.2 | Payroll Base (÷30 หรือ ÷วันทำงาน) | ❌ | ❌ | ❌ | — |
| 2.9.3 | OT Multiplier (1.5x / 2x / 3x) | ❌ | ❌ | ❌ | — |
| 2.9.4 | Leave Policy per Type | ❌ | ❌ | ❌ | ลาป่วย/กิจ/พักร้อน/คลอด/บวช |
| 2.9.5 | Vacation Tenure Tiers | ❌ | ❌ | ❌ | 1ปี=6วัน, 5ปี=10วัน, 10ปี=15วัน |
| 2.9.6 | Feature Toggle (Salary visible) | ❌ | ❌ | ❌ | HR vs IT Admin |
| 2.9.7 | LINE OA Config (channel_id/secret) | ❌ | ❌ | ❌ | — |

---

### 2.10 Payroll

🔗 **ต้องการก่อน:** 2.9 Settings ทั้งหมด, 2.2 Dashboard (ข้อมูลเช็คชื่อ)

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.10.1 | สรุปรายเดือน (monthly_payroll_records) | ❌ | ❌ | ❌ |
| 2.10.2 | Auto Deduction (สาย/ขาด/ลาไม่ได้รับค่าจ้าง) | ❌ | ❌ | ❌ |
| 2.10.3 | หน้า Payroll Review | ❌ | ❌ | ❌ |
| 2.10.4 | Confirm & Lock ยอด | ❌ | ❌ | ❌ |
| 2.10.5 | Export Excel/CSV สำหรับธนาคาร | ❌ | ❌ | ❌ |

---

### 2.11 Communication

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.11.1 | Broadcast Announcement (ทุกคน) | ❌ | 🚧 | ❌ |
| 2.11.2 | Direct Message รายคน | ❌ | ❌ | ❌ |
| 2.11.3 | อ่าน Anonymous Feedback | ❌ | ❌ | ❌ |

---

### 2.12 Report

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.12.1 | Attendance Report รายเดือน | ❌ | 🚧 | ❌ |
| 2.12.2 | Leave Report | ❌ | ❌ | ❌ |
| 2.12.3 | Late/Absent Trend Chart | ❌ | ❌ | ❌ |
| 2.12.4 | KPI Score พนักงาน | ❌ | ❌ | ❌ |
| 2.12.5 | Export Excel | ❌ | ❌ | ❌ |

---

## 3. MANAGER

🔗 **ต้องการก่อน:** ทุกอย่างใน Admin ที่เกี่ยวกับ Branch, Shift, Employee ต้องสร้างไว้ก่อน

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 3.1 | Login / Auth | ❌ | ❌ | ❌ | JWT role: MANAGER |
| 3.2 | Dashboard (เฉพาะ Branch ตัวเอง) | ❌ | ❌ | ❌ | — |
| 3.3 | Approve / Reject Leave | ❌ | ❌ | ❌ | ผ่าน LINE หรือ Web |
| 3.4 | Approve Shift Swap | ❌ | ❌ | ❌ | — |
| 3.5 | Approve OT | ❌ | ❌ | ❌ | — |
| 3.6 | Direct Message พนักงาน | ❌ | ❌ | ❌ | — |

---

## 4. EMPLOYEE (LINE LIFF)

> ⚠️ ทุก Feature ของ Employee ต้องผ่าน LIFF ทั้งหมด ห้ามมี Web Login

---

### 4.1 ระบบยืนยันตัวตน (First-time Setup) ← จุดเริ่มต้นทุกอย่าง

🔗 **ต้องการก่อน:**
- `2.3.2` Admin สร้าง Employee ไว้ก่อน (มีชื่อ + รหัสพนักงาน)
- `1.8` LINE OA Config ของ Tenant นั้น

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.1.1 | LIFF init + LINE login | ✅ | ✅ | ✅ | liff.ts พร้อมแล้ว |
| 4.1.2 | ตรวจสอบว่า line_user_id ถูก map แล้วหรือยัง | ✅ | 🔌 | 🔌 | liff middleware ทำได้ แต่ UI ยังไม่มีหน้า redirect |
| 4.1.3 | **หน้าเลือกชื่อตัวเอง** (First-time) | ❌ | 🚧 | 🚧 | UI + Mock ครบ (search + avatar list) |
| 4.1.4 | ค้นหา/กรอกรหัสพนักงาน เพื่อยืนยัน | ❌ | 🚧 | 🚧 | UI + Mock ครบ (3-step flow: select→confirm→success) |
| 4.1.5 | บันทึก line_user_id ลง Employee | ❌ | ❌ | ❌ | PATCH employee + status = ACTIVE |

---

### 4.2 Check-in / Check-out

🔗 **ต้องการก่อน:**
- `4.1` ยืนยันตัวตนครบ (line_user_id ถูก map แล้ว)
- `2.4.5` Admin Generate QR Code ของสาขาไว้แล้ว
- `2.6.2` Admin สร้างกะงานไว้แล้ว

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.2.1 | UI หน้า Check-in (นาฬิกา/ปุ่ม) | — | ✅ | ✅ | สวยงามครบ |
| 4.2.2 | สแกน QR Code (liff.scanCodeV2) | ❌ | ❌ | ❌ | ยังไม่มีใน UI |
| 4.2.3 | ดึง GPS (navigator.geolocation) | ❌ | ❌ | ❌ | — |
| 4.2.4 | POST check-in (API จริง) | 🔌 | 🔌 | 🔌 | Stub endpoint ไม่มี logic จริง |
| 4.2.5 | GPS Verification (Haversine + buffer) | ❌ | — | ❌ | logic ฝั่ง Backend |
| 4.2.6 | คำนวณสถานะ (ปกติ/สาย 1/สาย 2) | ❌ | — | ❌ | เทียบกับ shift_start_time |
| 4.2.7 | LINE Push Message ยืนยันเช็คอิน | ❌ | — | ❌ | — |
| 4.2.8 | UI หน้า Check-out | — | 🚧 | 🚧 | UI ครบแล้ว (mock) — แสดงเวลาเช็คอิน→เอาท์ + ชม. ทำงาน |
| 4.2.9 | POST check-out (API จริง) | 🔌 | 🔌 | 🔌 | Stub เท่านั้น |
| 4.2.10 | คำนวณ OT อัตโนมัติ | ❌ | — | ❌ | — |
| 4.2.11 | Off-site Check-in | ❌ | ❌ | ❌ | Skip radius check |

---

### 4.3 Profile (ข้อมูลพนักงาน)

🔗 **ต้องการก่อน:**
- `4.1.3–4.1.5` ยืนยันตัวตนครบแล้ว (line_user_id map กับ employee แล้ว)
- `2.3.2` Admin สร้างข้อมูลพนักงานไว้แล้ว (ชื่อ/สาขา/ตำแหน่ง/วันเริ่มงาน)
- `2.5` Leave Balance ถูกคำนวณไว้แล้ว

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.3.1 | แสดง LINE Profile (รูป/ชื่อ LINE) | — | 🚧 | 🚧 | เปลี่ยนเป็น Mock Employee แทน liff.getProfile() |
| 4.3.2 | แสดงข้อมูล Employee จาก DB | ❌ | 🚧 | 🚧 | UI + Mock ครบ (ชื่อ/รหัส/สาขา/ตำแหน่ง) |
| 4.3.3 | แสดงวันเริ่มงาน + อายุงาน | ❌ | 🚧 | 🚧 | UI + Mock ครบ (calcTenure ครบ) |
| 4.3.4 | แสดง Leave Balance (คงเหลือแต่ละประเภท) | ❌ | 🚧 | 🚧 | UI + Mock ครบ (progress bar 3 ประเภท) |
| 4.3.5 | แสดง Shift ที่ถูกกำหนด | ❌ | 🚧 | 🚧 | UI + Mock ครบ (กะเช้า 08:00–17:00) |

**Dependency Chain ของ Employee Profile:**
```
Admin สร้าง Employee [2.3.2] ❌
    ↓
พนักงานเปิด LIFF ครั้งแรก
    ↓
ตรวจสอบ line_user_id [4.1.2] 🔌
    ↓ (ยังไม่ถูก map)
หน้าเลือกชื่อตัวเอง [4.1.3] ❌  ← ต้องทำก่อน
    ↓
กรอกรหัสพนักงานยืนยัน [4.1.4] ❌
    ↓
บันทึก line_user_id [4.1.5] ❌
    ↓
✅ profile page ดึงข้อมูล Employee ได้ [4.3.2] ❌
```

---

### 4.4 ประวัติการเช็คชื่อ (History)

🔗 **ต้องการก่อน:** `4.2.4–4.2.6` Check-in จริงทำงานได้

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.4.1 | API GET attendance history | ❌ | — | ❌ | — |
| 4.4.2 | UI รายการประวัติ | — | 🚧 | 🚧 | UI ครบ (mock) — แสดงวันที่/เวลา/status badge/OT |
| 4.4.3 | Filter รายเดือน | ❌ | 🚧 | 🚧 | UI + Mock ครบ (month selector pill buttons) |
| 4.4.4 | สรุปยอด (มา/สาย/ขาด/ลา) | ❌ | 🚧 | 🚧 | UI + Mock ครบ (4 stat cards: ทำงาน/ตรงเวลา/สาย/OT) |

---

### 4.5 Leave Request (ลางาน)

🔗 **ต้องการก่อน:**
- `4.1` ยืนยันตัวตน
- `2.9.4` Leave Policy ถูกตั้งค่าไว้แล้ว
- `3.3` Manager พร้อม Approve (หรือ 2.5.7 Admin)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.5.1 | UI ฟอร์มลางาน | — | 🚧 | 🚧 | UI ครบ (mock) — tab ประวัติ + ขอลา |
| 4.5.2 | เลือกประเภทลา | ❌ | 🚧 | 🚧 | UI ครบ (3 ประเภท: ป่วย/กิจ/พักร้อน + แสดงวันเหลือ) |
| 4.5.3 | เลือกวันที่ (date range) | ❌ | 🚧 | 🚧 | UI ครบ (start/end date input) |
| 4.5.4 | อัปโหลดรูปใบรับรองแพทย์ | ❌ | ❌ | ❌ | Cloud Storage |
| 4.5.5 | POST leave-request | ❌ | ❌ | ❌ | — |
| 4.5.6 | ส่ง LINE Flex Message ขออนุมัติหัวหน้า | ❌ | — | ❌ | มี approval_token |
| 4.5.7 | ดูสถานะ Leave Request | ❌ | 🚧 | 🚧 | UI ครบ (mock) — แสดงสถานะ badge + ผู้อนุมัติ |

---

### 4.6 OT Request

🔗 **ต้องการก่อน:** `4.1` ยืนยันตัวตน, `2.9.3` OT Rate ถูกตั้งค่า

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.6.1 | UI ฟอร์มขอ OT | — | 🚧 | 🚧 | UI ครบ (mock) — tab ประวัติ/ขอ OT, summary cards, form วัน/เวลา/หมายเหตุ |
| 4.6.2 | POST OT request | ❌ | ❌ | ❌ |
| 4.6.3 | ส่ง LINE แจ้งหัวหน้า | ❌ | — | ❌ |

---

### 4.7 Shift Swap (ขอแลกกะ)

🔗 **ต้องการก่อน:** `4.1`, `2.6.2` มีกะงาน

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.7.1 | ดูกะของตัวเอง | ❌ | ❌ | ❌ |
| 4.7.2 | เลือกพนักงานที่จะแลกด้วย | ❌ | ❌ | ❌ |
| 4.7.3 | POST shift-swap-request | ❌ | ❌ | ❌ |
| 4.7.4 | LINE แจ้งคู่แลก + หัวหน้า | ❌ | — | ❌ |

---

### 4.8 Weekly Day-off Booking

🔗 **ต้องการก่อน:** `4.1`, `2.5.9` Admin ตั้ง Quota

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.8.1 | ดูปฏิทินจองวันหยุดสัปดาห์ | ❌ | ❌ | ❌ |
| 4.8.2 | เช็ค Quota (วันไหนเต็ม/ว่าง) | ❌ | ❌ | ❌ |
| 4.8.3 | POST weekly-off | ❌ | ❌ | ❌ |

---

### 4.9 Personal Report (e-Slip)

🔗 **ต้องการก่อน:** `4.1`, `2.10` Payroll ทำงานได้

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.9.1 | สรุปการมาทำงานรายเดือน | ❌ | ❌ | ❌ |
| 4.9.2 | Preview ยอดหัก/เพิ่ม (e-Slip) | ❌ | ❌ | ❌ |
| 4.9.3 | Download PDF สลิปเงินเดือน | ❌ | ❌ | ❌ |

---

### 4.10 Document Request

🔗 **ต้องการก่อน:** `4.1`, `2.10` Payroll, ข้อมูล Employee ครบ

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.10.1 | ขอใบรับรองการทำงาน | ❌ | ❌ | ❌ |
| 4.10.2 | ขอใบรับรองเงินเดือน | ❌ | ❌ | ❌ |
| 4.10.3 | Generate PDF อัตโนมัติ | ❌ | ❌ | ❌ |

---

### 4.11 Expense Claim

🔗 **ต้องการก่อน:** `4.1`, `3.3` Manager Approve

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.11.1 | ฟอร์ม + ถ่ายรูปใบเสร็จ | ❌ | ❌ | ❌ |
| 4.11.2 | POST expense-claim | ❌ | ❌ | ❌ |
| 4.11.3 | LINE แจ้งหัวหน้า | ❌ | — | ❌ |

---

### 4.12 Anonymous Feedback

🔗 **ต้องการก่อน:** `4.1`, `2.11.3` Admin มีหน้าอ่าน

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.12.1 | UI กล่องส่ง Feedback | — | 🚧 | 🚧 | UI ครบ (mock) — category 5 หัวข้อ, textarea 500 ตัว, anonymous badge |
| 4.12.2 | POST feedback (ซ่อน line_user_id) | ❌ | ❌ | ❌ |

---

## 5. LINE Integration (Webhook)

| # | Feature | Backend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|
| 5.1 | Webhook endpoint (receive LINE events) | ❌ | ❌ | — |
| 5.2 | Postback handler (กด Approve/Reject) | ❌ | ❌ | — |
| 5.3 | Push Message ยืนยันเช็คอิน | ❌ | ❌ | — |
| 5.4 | Flex Message ขออนุมัติลา | ❌ | ❌ | — |
| 5.5 | Flex Message ขออนุมัติ Shift Swap | ❌ | ❌ | — |
| 5.6 | Rich Menu setup | ❌ | ❌ | — |

---

## 6. Infrastructure / Shared

| # | Feature | สถานะ | หมายเหตุ |
|---|---|---|---|
| 6.1 | Prisma Schema (Database) | ❌ | ยังไม่มี schema.prisma จริง |
| 6.2 | JWT Auth middleware | ❌ | — |
| 6.3 | RBAC middleware | ❌ | — |
| 6.4 | Tenant resolver middleware | ✅ | liff.ts ทำแล้วส่วนหนึ่ง |
| 6.5 | Response format มาตรฐาน | ✅ | response.ts |
| 6.6 | Error handler | ❌ | — |
| 6.7 | Rate limiting | ❌ | — |
| 6.8 | Cloud Storage (รูปภาพ) | ❌ | ใบรับรองแพทย์ / ใบเสร็จ |
| 6.9 | Cron Jobs (daily summary / leave quota) | ❌ | — |

---

## แนะนำลำดับการทำ (Sprint Order)

```
Sprint 1 — Foundation (ทำก่อน ทุกอย่างพึ่งพา)
  [6.1] Prisma Schema ครบทุก table
  [6.2] JWT Auth middleware
  [6.3] RBAC middleware
  [2.1] Admin Login

Sprint 2 — Admin Core Data
  [2.3] Employee Management (CRUD)
  [2.4] Branch + QR Code
  [2.6] Shift Management

Sprint 3 — Employee First-time Flow  ← ทำก่อน ถึงจะ test อะไรได้
  [4.1.3] หน้าเลือกชื่อตัวเอง (First-time Verify)
  [4.1.4] กรอกรหัสยืนยัน
  [4.1.5] บันทึก line_user_id

Sprint 4 — Check-in/out จริง
  [4.2.2] QR Scan ใน LIFF
  [4.2.3] GPS
  [4.2.4–4.2.6] Backend check-in จริง + GPS verify + คำนวณสถานะ
  [5.3] LINE Push ยืนยัน

Sprint 5 — Admin Dashboard
  [2.2] Dashboard cards + table

Sprint 6 — Leave System
  [2.9.4] Leave Policy Config
  [4.5] Employee ลางาน
  [5.4] Flex Message อนุมัติ
  [2.5.7] Admin Approve

Sprint 7 — Payroll
  [2.9.1–2.9.3] Deduction Rules
  [2.10] Monthly Payroll Summary
  [4.9] Employee e-Slip

Sprint 8 — Super Admin
  [1.x] Package / Tenant management

Sprint 9 — Advanced Features
  [4.7] Shift Swap
  [4.8] Weekly Day-off
  [4.11] Expense Claim
  [2.12] Reports
```

---

*อัปเดตสถานะทุกครั้งที่ implement feature ใหม่เสร็จ*
