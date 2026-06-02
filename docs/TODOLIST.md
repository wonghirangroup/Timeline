# Feature Todolist — TimeLine HR SaaS

> อัปเดตล่าสุด: 2026-06-02 (sync จาก brain/_LOG_VIEW.txt + scan โค้ดจริง)
> สแกนจากโค้ดจริงในโปรเจค

## สัญลักษณ์สถานะ

| สัญลักษณ์ | ความหมาย |
|---|---|
| ✅ | Done — มีโค้ดจริง เชื่อม API จริง ทำงานได้ |
| 🚧 | UI Only — มีหน้าจอแต่ใช้ Mock data (ยังไม่ต่อ API จริง) |
| 🔌 | Stub — มี endpoint แต่ logic ไม่ครบ |
| ❌ | Not Started — ยังไม่มีโค้ด |

---

## Dependency Legend

> ก่อนจะทำ Feature ไหน ดูที่ `🔗 ต้องการ` ก่อนเสมอ
> ถ้า dependency ยัง ❌ ต้องทำ dependency ก่อน

---

## 1. SUPER ADMIN

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 1.1 | Login / Auth | ✅ | ✅ | ✅ | JWT login + refresh token พร้อมแล้ว |
| 1.2 | Dashboard Overview | ❌ | 🚧 | ❌ | หน้ามีแต่ TODO |
| 1.3 | Package Management | ❌ | 🚧 | ❌ | UI mock อยู่ |
| 1.4 | Tenant List | ✅ | ✅ | ✅ | list + detail เชื่อม API จริง |
| 1.5 | สร้าง Tenant ใหม่ | ✅ | ✅ | ✅ | onboarding page เชื่อม API |
| 1.6 | Suspend / Activate Tenant | ❌ | ❌ | ❌ | — |
| 1.7 | Login as Admin (Impersonate) | ❌ | ❌ | ❌ | — |
| 1.8 | LINE OA Config per Tenant | ✅ | ✅ | ✅ | tenant detail page มี LINE config |
| 1.9 | Billing / Subscription | ❌ | 🚧 | ❌ | UI mock อยู่ |
| 1.10 | Global Announcement | ❌ | ❌ | ❌ | ส่งข้อความหาทุก Tenant |

---

## 2. ADMIN

### 2.1 Authentication

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.1.1 | Login (email + password) | ✅ | ✅ | ✅ |
| 2.1.2 | JWT Refresh Token | ✅ | ✅ | ✅ |
| 2.1.3 | Logout | ✅ | ✅ | ✅ |

---

### 2.2 Dashboard

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch, 2.6 Shift, 2.7 Leave

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.2.1 | Summary Cards (เช็คชื่อ/สาย/ขาด) | ❌ | 🚧 | ❌ | UI mock อยู่ |
| 2.2.2 | Filter วันที่ (single/range) | ❌ | ❌ | ❌ | — |
| 2.2.3 | Filter สาขา | ❌ | ❌ | ❌ | — |
| 2.2.4 | Table Record + Pagination | ❌ | ❌ | ❌ | — |
| 2.2.5 | Daily Summary (Cron job) | ❌ | — | ❌ | ประมวลผลตี 00:05 |

---

### 2.3 Employee Management

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.3.1 | List พนักงาน (+ search/filter) | ✅ | ✅ | ✅ | เชื่อม API จริง |
| 2.3.2 | สร้างพนักงานรายคน | ✅ | ✅ | ✅ | — |
| 2.3.3 | Import Excel/CSV | ❌ | ❌ | ❌ | — |
| 2.3.4 | แก้ไขข้อมูลพนักงาน | ✅ | ✅ | ✅ | — |
| 2.3.5 | เปลี่ยนสถานะพนักงาน | ✅ | ✅ | ✅ | active/inactive |
| 2.3.6 | ดู Status การผูก LINE | ✅ | ✅ | ✅ | แสดงสถานะ LINE binding |
| 2.3.7 | Resend Invite Link | ❌ | ❌ | ❌ | — |
| 2.3.8 | ตั้งค่า Salary / OT (HR only) | ❌ | ❌ | ❌ | — |
| 2.3.9 | Export Excel | ❌ | ❌ | ❌ | — |

---

### 2.4 Branch Management

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.4.1 | List สาขา | ✅ | ✅ | ✅ | — |
| 2.4.2 | สร้าง/แก้ไขสาขา | ✅ | ✅ | ✅ | — |
| 2.4.3 | ตั้งค่า GPS Lat/Lng | ✅ | ✅ | ✅ | กด "ดึงตำแหน่งปัจจุบัน" |
| 2.4.4 | ตั้งค่า Radius + Geo Mode (WARN/BLOCK) | ✅ | ✅ | ✅ | Geofencing ครบ (2026-06-01) |
| 2.4.5 | Generate QR Code | ✅ | ✅ | ✅ | QR modal + copy + download |
| 2.4.6 | ลบสาขา (soft delete) | ✅ | ✅ | ✅ | — |
| 2.4.7 | กำหนด Manager ประจำสาขา | ❌ | ❌ | ❌ | — |

---

### 2.5 Calendar & Leave Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.5.1 | List Leave Request + filter | ✅ | ✅ | ✅ | เชื่อม API จริง |
| 2.5.2 | Approve / Reject Leave | ✅ | ✅ | ✅ | พร้อมกรอกเหตุผล reject |
| 2.5.3 | Leave Balance per Employee | ✅ | ✅ | ✅ | batch upsert + seniority rules |
| 2.5.4 | Default Leave Quota Config | ✅ | ✅ | ✅ | ตั้ง default แล้ว apply ทีเดียว |
| 2.5.5 | Seniority-based Leave Rules | ✅ | ✅ | ✅ | คำนวณจาก start_date |
| 2.5.6 | Holiday — นักขัตฤกษ์ + บริษัท | ✅ | ✅ | ✅ | import ราชการ + เพิ่ม/แก้/ลบ + ปฏิทิน |
| 2.5.7 | Monthly Day-off Quota Config | ❌ | ❌ | ❌ | จำนวนคนที่หยุดได้ต่อวัน |
| 2.5.8 | Calendar View รายเดือน | ❌ | ❌ | ❌ | — |

---

### 2.6 Shift Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.4 Branch

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.6.1 | List กะงาน | ✅ | ✅ | ✅ | — |
| 2.6.2 | สร้าง/แก้ไขกะ | ✅ | ✅ | ✅ | — |
| 2.6.3 | ผูกกะกับสาขา | ✅ | ✅ | ✅ | — |
| 2.6.4 | Default Shift + Override pattern | ✅ | ✅ | ✅ | Priority: บุคคล > สาขา > บริษัท (2026-05-27) |
| 2.6.5 | Late Threshold 1 & 2 + ค่าปรับ | ✅ | ✅ | ✅ | late_fine_1/2 พร้อม |
| 2.6.6 | ปิดรับเช็คอิน (late_threshold_2) | ✅ | ✅ | ✅ | หลังเวลานี้ = ขาด |
| 2.6.7 | Shift Schedule (Month View) | ✅ | ✅ | ✅ | shift-schedule page (2026-05-27) |
| 2.6.8 | Approve Shift Swap | ❌ | ❌ | ❌ | — |

---

### 2.7 Attendance Management (Admin Override)

🔗 **ต้องการก่อน:** 2.3 Employee, 2.6 Shift

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.7.1 | ดู Attendance report + filter | ✅ | ✅ | ✅ | filter วัน/สาขา/พนักงาน |
| 2.7.2 | badge วิธีเช็คอิน (LIFF/QR/ADMIN) | ✅ | ✅ | ✅ | — |
| 2.7.3 | badge นอกพื้นที่ | ✅ | ✅ | ✅ | is_outside_area |
| 2.7.4 | ลงเวลาแทน (Manual Check-in) | ✅ | ✅ | ✅ | Admin ลงวันย้อนหลังได้ |
| 2.7.5 | แก้ไขเวลาเช็คอิน/เอาท์ | ✅ | ✅ | ✅ | — |
| 2.7.6 | Reset บันทึก (ลบแล้วเช็คอินใหม่) | ✅ | ✅ | ✅ | — |
| 2.7.7 | Audit Log (is_manual flag) | ✅ | ✅ | ✅ | method = ADMIN |

---

### 2.8 OT Management

🔗 **ต้องการก่อน:** 2.3 Employee, 2.6 Shift

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.8.1 | List OT Request + filter | ✅ | 🚧 | 🚧 | Backend ✅ แต่ Admin UI ยัง mock |
| 2.8.2 | Approve / Reject OT | ✅ | 🚧 | 🚧 | Backend ✅ แต่ Admin UI ยัง mock |
| 2.8.3 | คำนวณ OT + cap 36 ชม./สัปดาห์ | ✅ | — | ✅ | (2026-05-27) |

---

### 2.9 Monthly Day-off Management (Admin)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.9.1 | List Monthly Off + filter | ✅ | ✅ | ✅ | weekly-off page เชื่อม API |
| 2.9.2 | Approve / Reject Monthly Off | ✅ | ✅ | ✅ | รวม Approve All ในเดือน |
| 2.9.3 | ลบ Monthly Off | ✅ | ✅ | ✅ | — |

---

### 2.10 Communication

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.10.1 | Broadcast Announcement (ทุกคน / เฉพาะสาขา) | ✅ | 🚧 | 🚧 | Backend ✅ แต่ Admin UI ยัง mock |
| 2.10.2 | Direct Message รายคน | ❌ | ❌ | ❌ |
| 2.10.3 | อ่าน Anonymous Feedback | ❌ | 🚧 | 🚧 | UI mock อยู่ |

---

### 2.11 Settings

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 2.11.1 | Late Deduction Rules | ❌ | 🚧 | ❌ | UI mock อยู่ |
| 2.11.2 | Leave Policy per Type | ❌ | ❌ | ❌ | — |
| 2.11.3 | OT Multiplier | ❌ | ❌ | ❌ | — |
| 2.11.4 | LINE OA Config | ❌ | ❌ | ❌ | — |

---

### 2.12 Payroll

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.12.1 | สรุปรายเดือน | ❌ | ❌ | ❌ |
| 2.12.2 | Auto Deduction (สาย/ขาด/ลา) | ❌ | ❌ | ❌ |
| 2.12.3 | Confirm & Lock ยอด | ❌ | ❌ | ❌ |
| 2.12.4 | Export Excel/CSV | ❌ | ❌ | ❌ |

---

### 2.13 Report

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 2.13.1 | Attendance Report รายเดือน | ❌ | 🚧 | ❌ |
| 2.13.2 | Leave Report | ❌ | ❌ | ❌ |
| 2.13.3 | Late/Absent Trend Chart | ❌ | ❌ | ❌ |
| 2.13.4 | Export Excel | ❌ | ❌ | ❌ |

---

## 3. MANAGER

> หมายเหตุ: ปัจจุบัน MANAGER ใช้หน้าเดียวกับ ADMIN — permission แยกที่ backend RBAC

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 3.1 | Login / Auth | ✅ | ✅ | ✅ | ใช้ระบบเดียวกับ Admin |
| 3.2 | ดู Attendance เฉพาะ Branch ตัวเอง | ✅ | ✅ | ✅ | filter branchId ที่ backend |
| 3.3 | Approve / Reject Leave | ✅ | ✅ | ✅ | — |
| 3.4 | Approve / Reject OT | ✅ | 🚧 | 🚧 | Backend ✅ แต่ UI ยัง mock |
| 3.5 | Approve Monthly Day-off | ✅ | ✅ | ✅ | — |
| 3.6 | Direct Message พนักงาน | ❌ | ❌ | ❌ | — |

---

## 4. EMPLOYEE (LINE LIFF)

> ⚠️ ทุก Feature ของ Employee ต้องผ่าน LIFF เท่านั้น

---

### 4.1 ระบบยืนยันตัวตน (First-time Setup)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.1.1 | LIFF init + LINE login | ✅ | ✅ | ✅ | — |
| 4.1.2 | ตรวจสอบ line_user_id mapping | ✅ | ✅ | ✅ | redirect ไป /verify ถ้ายังไม่ผูก |
| 4.1.3 | หน้า Verify — ดึง LINE Profile อัตโนมัติ | ✅ | ✅ | ✅ | แสดงชื่อ+รูป LINE |
| 4.1.4 | ผูก line_user_id ↔ employee_id | ✅ | ✅ | ✅ | PATCH employee |

---

### 4.2 Check-in / Check-out

🔗 **ต้องการก่อน:** 4.1 ยืนยันตัวตน, Admin สร้าง Branch + Shift ไว้แล้ว

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.2.1 | UI หน้า Check-in | — | ✅ | ✅ | — |
| 4.2.2 | สแกน QR Code (liff.scanCodeV2) | ✅ | ✅ | ✅ | parse URL + auto check-in |
| 4.2.3 | ดึง GPS (LocationGate + retry) | — | ✅ | ✅ | บังคับอนุญาตก่อนเช็คอิน |
| 4.2.4 | POST check-in-qr (API จริง) | ✅ | ✅ | ✅ | — |
| 4.2.5 | GPS Verification (Haversine + radius) | ✅ | — | ✅ | WARN flag / BLOCK throw |
| 4.2.6 | Auto-detect กะจากเวลาปัจจุบัน | ✅ | — | ✅ | ไม่ต้องเลือกกะเอง |
| 4.2.7 | Popup ผล (เวลา/สาขา/กะ/สถานะ/ค่าปรับ) | — | ✅ | ✅ | — |
| 4.2.8 | คำนวณสถานะสาย (ปกติ/สาย1/สาย2) | ✅ | — | ✅ | เทียบ late_threshold |
| 4.2.9 | UI หน้า Check-out | — | ✅ | ✅ | — |
| 4.2.10 | POST check-out-auto (API จริง) | ✅ | ✅ | ✅ | แสดงระยะเวลาทำงาน |
| 4.2.11 | LINE Push Message ยืนยันเช็คอิน | ❌ | — | ❌ | Phase 2 |
| 4.2.12 | Off-site Check-in | ❌ | ❌ | ❌ | Phase 4 |

---

### 4.3 Profile

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.3.1 | ดึงข้อมูล Employee จาก API (/employee/me) | ✅ | ✅ | ✅ | — |
| 4.3.2 | แสดงชื่อ / รหัส / สาขา / ตำแหน่ง | ✅ | ✅ | ✅ | — |
| 4.3.3 | แสดง Leave Balance | ✅ | ✅ | ✅ | — |
| 4.3.4 | แสดง Shift ที่ถูกกำหนด | ✅ | ✅ | ✅ | — |

---

### 4.4 ประวัติการเช็คชื่อ (History)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.4.1 | GET attendance history (API จริง) | ✅ | ✅ | ✅ | — |
| 4.4.2 | Filter รายเดือน | ✅ | ✅ | ✅ | — |
| 4.4.3 | สรุปยอด (มา/สาย/ขาด) | ✅ | ✅ | ✅ | — |

---

### 4.5 Leave Request (ลางาน)

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.5.1 | UI ฟอร์มขอลา (4 ประเภท) | — | ✅ | ✅ | — |
| 4.5.2 | POST leave-request (API จริง) | ✅ | ✅ | ✅ | validate โควต้า + ทับซ้อน |
| 4.5.3 | ดูสถานะ Leave Request | ✅ | ✅ | ✅ | badge PENDING/APPROVED/REJECTED |
| 4.5.4 | ส่ง LINE แจ้งหัวหน้า | ❌ | — | ❌ | Phase 2 |
| 4.5.5 | อัปโหลดใบรับรองแพทย์ | ❌ | ❌ | ❌ | Phase 2 |

---

### 4.6 Monthly Day-off Booking (หยุดประจำเดือน)

🔗 **ต้องการก่อน:** 4.1 ยืนยันตัวตน

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.6.1 | Calendar ปฏิทินเดือน | — | ✅ | ✅ | เลือก 1 วันต่อเดือน (2026-06-02) |
| 4.6.2 | POST monthly-off (1 ต่อเดือน) | ✅ | ✅ | ✅ | validate ซ้ำในเดือน |
| 4.6.3 | เห็นวันที่เพื่อนร่วมสาขาเลือก (dot) | ✅ | ✅ | ✅ | month-view endpoint |
| 4.6.4 | รายชื่อเพื่อนร่วมสาขา + สถานะ | ✅ | ✅ | ✅ | — |
| 4.6.5 | ยกเลิกคำขอ PENDING ของตัวเอง | ✅ | ✅ | ✅ | — |

---

### 4.7 OT Request

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.7.1 | UI ฟอร์มขอ OT | — | ✅ | ✅ | — |
| 4.7.2 | POST OT request (API จริง) | ✅ | ✅ | ✅ | (2026-05-27) |
| 4.7.3 | ดูสถานะ OT | ✅ | ✅ | ✅ | — |
| 4.7.4 | ส่ง LINE แจ้งหัวหน้า | ❌ | — | ❌ | Phase 2 |

---

### 4.8 Shift Swap (ขอแลกกะ)

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.8.1 | ดูกะของตัวเอง | ❌ | ❌ | ❌ |
| 4.8.2 | เลือกพนักงานที่จะแลกด้วย | ❌ | ❌ | ❌ |
| 4.8.3 | POST shift-swap-request | ❌ | ❌ | ❌ |
| 4.8.4 | LINE แจ้งคู่แลก + หัวหน้า | ❌ | — | ❌ |

---

### 4.9 Anonymous Feedback

| # | Feature | Backend | Frontend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|---|
| 4.9.1 | UI กล่องส่ง Feedback | — | 🚧 | 🚧 | UI mock อยู่ |
| 4.9.2 | POST feedback (ซ่อน line_user_id) | ✅ | 🚧 | 🚧 | Backend มี แต่ UI ยังไม่ต่อ |

---

### 4.10 Personal Report / e-Slip

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.10.1 | สรุปการมาทำงานรายเดือน | ❌ | ❌ | ❌ |
| 4.10.2 | Preview ยอดหัก/เพิ่ม (e-Slip) | ❌ | ❌ | ❌ |
| 4.10.3 | Download PDF สลิปเงินเดือน | ❌ | ❌ | ❌ |

---

### 4.11 Document Request

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.11.1 | ขอใบรับรองการทำงาน | ✅ | ❌ | ❌ | Backend module มีแต่ LIFF UI ยังไม่มี |
| 4.11.2 | ขอใบรับรองเงินเดือน | ✅ | ❌ | ❌ | — |
| 4.11.3 | Generate PDF อัตโนมัติ | ❌ | ❌ | ❌ | — |

---

### 4.12 Expense Claim

| # | Feature | Backend | Frontend | สถานะรวม |
|---|---|---|---|---|
| 4.12.1 | ฟอร์ม + ถ่ายรูปใบเสร็จ | ✅ | ❌ | ❌ | Backend module มีแต่ LIFF UI ยังไม่มี |
| 4.12.2 | POST expense-claim | ✅ | ❌ | ❌ | — |
| 4.12.3 | LINE แจ้งหัวหน้า | ❌ | — | ❌ | — |

---

## 5. LINE Integration (Webhook)

| # | Feature | Backend | สถานะรวม | หมายเหตุ |
|---|---|---|---|---|
| 5.1 | Webhook endpoint (receive LINE events) | ✅ | ✅ | line.route.ts พร้อม |
| 5.2 | Postback handler (กด Approve/Reject) | ❌ | ❌ | — |
| 5.3 | Push Message ยืนยันเช็คอิน | ❌ | ❌ | — |
| 5.4 | Flex Message ขออนุมัติลา | ❌ | ❌ | — |
| 5.5 | Flex Message ขออนุมัติ OT | ❌ | ❌ | — |
| 5.6 | Rich Menu setup | ❌ | ❌ | — |

---

## 6. Infrastructure / Shared

| # | Feature | สถานะ | หมายเหตุ |
|---|---|---|---|
| 6.1 | Prisma Schema (Database) | ✅ | schema.prisma ครบทุก core table |
| 6.2 | JWT Auth middleware | ✅ | — |
| 6.3 | RBAC middleware | ✅ | requireRole(...) |
| 6.4 | Tenant resolver middleware | ✅ | ทุก route ใช้ tenantMiddleware |
| 6.5 | Response format มาตรฐาน | ✅ | ok() / fail() utils |
| 6.6 | Error handler global | ✅ | Fastify error hook |
| 6.7 | Rate limiting | ❌ | — |
| 6.8 | Cloud Storage (รูปภาพ) | ❌ | ใบรับรองแพทย์ / ใบเสร็จ |
| 6.9 | Cron Jobs | ❌ | daily summary / leave quota |

---

## สรุปภาพรวม (2026-06-02)

| ส่วน | Done ✅ | In Progress 🚧 | Not Started ❌ |
|---|---|---|---|
| Infrastructure | 5/9 | 0 | 4 |
| Admin — Auth | 3/3 | 0 | 0 |
| Admin — Branch | 6/7 | 0 | 1 |
| Admin — Shift | 7/8 | 0 | 1 |
| Admin — Employee | 6/9 | 0 | 3 |
| Admin — Attendance | 7/7 | 0 | 0 |
| Admin — Leave | 6/8 | 0 | 2 |
| Admin — OT | 1/3 | 2 | 0 |
| Admin — Monthly Off | 3/3 | 0 | 0 |
| Employee — Verify | 4/4 | 0 | 0 |
| Employee — Check-in/out | 10/12 | 0 | 2 |
| Employee — Leave | 3/5 | 0 | 2 |
| Employee — Monthly Off | 5/5 | 0 | 0 |
| Employee — OT | 3/4 | 0 | 1 |
| LINE Integration | 1/6 | 0 | 5 |

---

## แนะนำลำดับงานถัดไป

```
งานด่วน (Blocker)
  [6.1b] Prisma Migrate dev — ยืนยัน environment ก่อนรัน
  [env]  ตั้งค่า LINE_LIFF_ID ใน server/.env

Sprint ถัดไป — LINE Integration
  [5.3] Push Message ยืนยันเช็คอิน
  [5.4] Flex Message ขออนุมัติลา (Postback approve/reject)
  [5.5] Flex Message ขออนุมัติ OT

Sprint — Admin UI ที่ยัง mock
  [2.8] OT Admin UI เชื่อม API จริง
  [2.10.1] Announcement Admin UI เชื่อม API จริง

Sprint — Phase 2 Features
  [2.2] Admin Dashboard (Summary cards + table)
  [4.9.2] Feedback LIFF เชื่อม API จริง
  [2.11.1] Late Deduction Settings
```

---

*อัปเดตสถานะทุกครั้งที่ implement feature ใหม่เสร็จ*
