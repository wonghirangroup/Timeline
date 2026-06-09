# Flow: การใช้งานครั้งแรก (Onboarding)
> ครอบคลุม Talent → Company → Admin → HR → พนักงาน → เช็คอินครั้งแรก

---

## ภาพรวม Actor & ลำดับขั้นตอน

```
TALENT
  │
  ├─[1]─ สร้าง Company (Tenant)
  ├─[2]─ Setup LINE OA ให้ Company
  └─[3]─ สร้าง Admin account → ส่ง email

ADMIN (รับ email จาก Talent)
  │
  ├─[4]─ Login Web App ครั้งแรก + เปลี่ยนรหัสผ่าน
  ├─[5]─ สร้าง Branch (สาขา)
  ├─[6]─ สร้าง Shift (กะ)
  └─[7]─ สร้าง HR account → ส่ง email

HR (รับ email จาก Admin)
  │
  ├─[8]─ Login Web App ครั้งแรก + เปลี่ยนรหัสผ่าน
  └─[9]─ เพิ่มข้อมูลพนักงาน → ระบบส่ง LINE invite

พนักงาน (รับ LINE message)
  │
  ├─[10]─ กดลิงก์ใน LINE → เปิด LIFF App ครั้งแรก
  ├─[11]─ LINE Login → ได้ line_user_id
  ├─[12]─ เลือกชื่อตัวเองจากรายการ → ยืนยัน
  ├─[13]─ ระบบ Map employee ↔ LINE account
  └─[14]─ เข้าหน้าหลัก → เช็คอินครั้งแรก
```

---

## Step 1 — Talent สร้าง Company

**Actor:** TALENT (ทีมผู้พัฒนา/ฝ่ายขาย)
**ทำที่:** Web App (Super Admin Panel)

### ข้อมูลที่กรอก
| Field | ตัวอย่าง | Required |
|---|---|---|
| ชื่อบริษัท | บริษัท วงษ์หิรัญ จำกัด | ✅ |
| เบอร์โทรบริษัท | 02-xxx-xxxx | ✅ |
| อีเมลบริษัท | contact@wonghiran.co.th | ✅ |
| แพ็กเกจ | Starter / Pro / Enterprise | ✅ |
| จำนวนพนักงานสูงสุด | 50 / 200 / ไม่จำกัด | ✅ |

### สิ่งที่ระบบทำ
- สร้าง record ใน `tenants` table
- สร้าง `tenant_id` (UUID) เป็น key หลักของ Company นั้น
- Status: `ACTIVE`

### DB ที่เปลี่ยน
```
tenants
  id            = "ten-uuid-001"
  name          = "บริษัท วงษ์หิรัญ จำกัด"
  plan          = "STARTER"
  max_employees = 50
  status        = "ACTIVE"
  created_at    = now()
```

---

## Step 2 — Talent Setup LINE OA ให้ Company

**Actor:** TALENT
**ทำที่:** Web App → เมนู "ตั้งค่า LINE" ของ Company นั้น

### ข้อมูลที่ได้จาก LINE Developers Console
| Field | ได้จากไหน |
|---|---|
| LINE Channel ID | LINE Developers → Messaging API channel |
| LINE Channel Secret | LINE Developers → Messaging API channel |
| LIFF ID | LINE Developers → LIFF App |
| LINE OA ID | หน้า LINE Official Account Manager |

### สิ่งที่ระบบทำ
- เก็บ credential ใน `tenant_line_configs` (encrypted ด้วย AES-256)
- ตั้งค่า Webhook URL ให้ LINE OA ชี้มาที่ `/api/v1/line/webhook`
- ทดสอบ connection → แสดงผล ✅ หรือ ❌

### DB ที่เปลี่ยน
```
tenant_line_configs
  tenant_id          = "ten-uuid-001"
  line_channel_id    = "2xxxxxxxxx"          ← encrypted
  line_channel_secret= "abcdef..."           ← encrypted
  liff_id            = "2xxxxxxxxx-xxxxxxxx" ← encrypted
  webhook_verified   = true
```

---

## Step 3 — Talent สร้าง Admin Account

**Actor:** TALENT
**ทำที่:** Web App → Company detail → "สร้าง Admin"

### ข้อมูลที่กรอก
| Field | ตัวอย่าง |
|---|---|
| ชื่อ-นามสกุล | สมศักดิ์ วงษ์หิรัญ |
| อีเมล | admin@wonghiran.co.th |
| เบอร์โทร | 081-xxx-xxxx |

### สิ่งที่ระบบทำ
- สร้าง `users` record (role: ADMIN, tenant_id ผูกกับ Company)
- Auto-generate รหัสผ่านชั่วคราว (random 12 ตัว)
- ส่ง Email: "ยินดีต้อนรับสู่ TimeLine — กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่าน"
  - URL: `https://app.timeline-hr.com/login`
  - Email: admin@wonghiran.co.th
  - รหัสผ่านชั่วคราว: `Tmp#Abc123!`

### DB ที่เปลี่ยน
```
users
  id          = "usr-uuid-admin-001"
  tenant_id   = "ten-uuid-001"
  email       = "admin@wonghiran.co.th"
  role        = "ADMIN"
  must_change_password = true
  created_at  = now()
```

---

## Step 4 — Admin Login ครั้งแรก

**Actor:** ADMIN
**ทำที่:** Web App `https://app.timeline-hr.com/login`

### ขั้นตอน
1. กรอก email + รหัสผ่านชั่วคราวจาก email
2. ระบบตรวจ `must_change_password = true` → redirect ไปหน้าเปลี่ยนรหัสผ่าน
3. กรอกรหัสผ่านใหม่ (ต้องมี 8+ ตัว, ตัวพิมพ์ใหญ่, ตัวเลข)
4. บันทึก → Login สำเร็จ → เข้า Dashboard

### สิ่งที่ระบบทำ
- ออก JWT Access Token (15 min) + Refresh Token (7 วัน)
- อัปเดต `must_change_password = false`
- บันทึก `last_login_at`

---

## Step 5 — Admin สร้าง Branch (สาขา)

**Actor:** ADMIN
**ทำที่:** Web App → เมนู "สาขา"

### ข้อมูลที่กรอก
| Field | ตัวอย่าง |
|---|---|
| ชื่อสาขา | วงษ์หิรัญ สาขาลาดพร้าว |
| ที่อยู่ | 123 ถ.ลาดพร้าว กรุงเทพ |
| GPS พิกัด | 13.8148° N, 100.5619° E |
| รัศมี Geofence | 200 เมตร |
| Geo Mode | WARN / BLOCK |

### DB ที่เปลี่ยน
```
branches
  id         = "br-uuid-001"
  tenant_id  = "ten-uuid-001"
  name       = "วงษ์หิรัญ สาขาลาดพร้าว"
  gps_lat    = 13.8148
  gps_lng    = 100.5619
  gps_radius = 200
  geo_mode   = "WARN"
```

---

## Step 6 — Admin สร้าง Shift (กะ)

**Actor:** ADMIN
**ทำที่:** Web App → เมนู "กะ"

### ข้อมูลที่กรอก
| Field | ตัวอย่าง |
|---|---|
| ชื่อกะ | กะเช้า |
| เวลาเริ่ม | 08:00 |
| เวลาสิ้นสุด | 17:00 |
| สาขา | วงษ์หิรัญ สาขาลาดพร้าว |
| วันทำงาน | จันทร์–ศุกร์ |
| Late threshold | 15 นาที |

### DB ที่เปลี่ยน
```
shifts
  id              = "shf-uuid-001"
  tenant_id       = "ten-uuid-001"
  branch_id       = "br-uuid-001"
  name            = "กะเช้า"
  start_time      = "08:00"
  end_time        = "17:00"
  late_threshold  = 15
  work_days       = [1,2,3,4,5]
```

---

## Step 7 — Admin สร้าง HR Account

**Actor:** ADMIN
**ทำที่:** Web App → เมนู "จัดการทีม"

### ข้อมูลที่กรอก
| Field | ตัวอย่าง |
|---|---|
| ชื่อ-นามสกุล | สมหญิง ใจดี |
| อีเมล | hr@wonghiran.co.th |
| Role | HR |
| สาขาที่ดูแล | ทุกสาขา |

### Feature Visibility ที่ Admin ตั้งให้ HR
| Feature | เปิด/ปิด |
|---|---|
| ดู Leave Balance พนักงาน | ✅ เปิด |
| ดูข้อมูลเงินเดือน | ❌ ปิด |
| Export รายงาน | ✅ เปิด |
| Approve OT | ✅ เปิด |

### สิ่งที่ระบบทำ
- สร้าง `users` record (role: HR)
- ส่ง Email เชิญเข้าระบบ (เหมือน Step 3)

---

## Step 8 — HR Login ครั้งแรก

> เหมือน Step 4 — เปลี่ยนรหัสผ่านชั่วคราว → เข้าสู่ระบบ

---

## Step 9 — HR เพิ่มพนักงาน

**Actor:** HR
**ทำที่:** Web App → เมนู "พนักงาน" → "+ เพิ่มพนักงาน"

### ข้อมูลที่กรอก
| Field | ตัวอย่าง | Required |
|---|---|---|
| ชื่อ | สมชาย | ✅ |
| นามสกุล | ใจดี | ✅ |
| ชื่อเล่น | ชาย | |
| รหัสพนักงาน | 2567-03-001 | ✅ |
| แผนก | ฝ่ายผลิต | ✅ |
| ประเภทพนักงาน | ประจำ / รายวัน | ✅ |
| Shift | กะเช้า | ✅ |
| สาขา | วงษ์หิรัญ สาขาลาดพร้าว | ✅ |
| เบอร์โทร | 081-xxx-xxxx | |
| วันเริ่มงาน | 2026-06-01 | ✅ |

### Leave Balance เริ่มต้น (ระบบสร้างอัตโนมัติ)
| ประเภท | โควต้า/ปี |
|---|---|
| ลาป่วย | 30 วัน |
| ลากิจ | 3 วัน |
| ลาพักร้อน | 10 วัน (ปรับตาม policy) |

### สิ่งที่ระบบทำ
1. สร้าง `employees` record
2. สร้าง `leave_balances` records (ทุกประเภท)
3. ส่ง LINE message ให้พนักงานผ่าน LINE OA ของ Company:

```
📋 ยินดีต้อนรับสู่ TimeLine!

สวัสดีครับ/ค่ะ คุณสมชาย ใจดี
บริษัท วงษ์หิรัญ จำกัด ได้เพิ่มคุณเข้าสู่ระบบ HR แล้ว

กรุณากดปุ่มด้านล่างเพื่อเปิดใช้งาน
และผูกบัญชี LINE ของคุณกับข้อมูลพนักงาน

[🔗 เปิดใช้งาน TimeLine]
```

### DB ที่เปลี่ยน
```
employees
  id              = "emp-uuid-001"
  tenant_id       = "ten-uuid-001"
  branch_id       = "br-uuid-001"
  first_name      = "สมชาย"
  last_name       = "ใจดี"
  employee_code   = "2567-03-001"
  employee_type   = "FULL_TIME"
  default_shift_id= "shf-uuid-001"
  line_user_id    = null   ← ยังไม่ผูก
  is_linked       = false
  status          = "ACTIVE"
```

---

## Step 10 — พนักงานรับ LINE Message + กดลิงก์

**Actor:** พนักงาน
**ทำที่:** LINE App บนมือถือ

### สิ่งที่เกิดขึ้น
1. พนักงานได้รับข้อความจาก LINE OA ของบริษัท
2. กดปุ่ม "เปิดใช้งาน TimeLine"
3. LINE เปิด LIFF App (ฝังอยู่ใน LINE)
4. URL: `https://liff.line.me/{LIFF_ID}?action=verify&tenant={tenant_id}`

---

## Step 11 — LINE Login ใน LIFF

**Actor:** พนักงาน
**ทำที่:** LIFF App (เปิดใน LINE)

### ขั้นตอนอัตโนมัติ
```
liff.init({ liffId: LIFF_ID })
  → liff.isLoggedIn() ?
      YES → ดำเนินการต่อ
      NO  → liff.login() → LINE consent screen
               → พนักงานกด "อนุญาต"
               → redirect กลับมา LIFF
               → ได้ line_user_id + liff_access_token
```

### ข้อมูลที่ได้จาก LINE
```typescript
{
  userId:      "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // line_user_id
  displayName: "สมชาย ใจดี",
  pictureUrl:  "https://profile.line-scdn.net/..."
}
```

---

## Step 12 — พนักงานเลือกชื่อตัวเองจากรายการ

**Actor:** พนักงาน
**ทำที่:** LIFF App (หน้า Verify)

### สิ่งที่ LIFF แสดง
1. หน้าต้อนรับ "ยินดีต้อนรับสู่ TimeLine 👋"
2. แสดง LINE profile ของพนักงาน (รูป + ชื่อ LINE)
3. แสดงรายชื่อพนักงานที่ยังไม่ผูก LINE จาก Company นั้น
4. มี search bar (ค้นหาชื่อ / ชื่อเล่น / รหัสพนักงาน)
5. พนักงานกดเลือกชื่อตัวเอง → หน้า Confirm

### หน้า Confirm แสดง
```
┌─────────────────────────────┐
│  👤 สมชาย ใจดี              │
│  รหัส: 2567-03-001          │
│  แผนก: ฝ่ายผลิต             │
│  สาขา: วงษ์หิรัญ ลาดพร้าว  │
│                             │
│  จะผูกกับ LINE:             │
│  🟢 สมชาย ใจดี (LINE)       │
│                             │
│  [✅ ใช่ นี่คือฉัน]         │
│  [← เลือกใหม่]              │
└─────────────────────────────┘
```

---

## Step 13 — ระบบ Map Employee ↔ LINE Account

**Actor:** ระบบ (Server)
**Trigger:** พนักงานกด "ใช่ นี่คือฉัน"

### API Call
```
POST /api/v1/employee/link
Body: {
  liff_token:      "eyJ...",          ← verify กับ LINE API
  line_user_id:    "Uxxxxxxxx",
  line_channel_id: "2xxxxxxxxx",      ← resolve tenant
  employee_id:     "emp-uuid-001"
}
```

### สิ่งที่ Server ทำ
1. Verify `liff_token` กับ LINE API (ยืนยันว่า token ไม่ถูกปลอม)
2. ตรวจว่า `employee_id` อยู่ใน tenant เดียวกับ `line_channel_id`
3. ตรวจว่า `line_user_id` นี้ยังไม่ถูกผูกกับพนักงานคนอื่น
4. อัปเดต `employees.line_user_id` + `is_linked = true`
5. ออก JWT token สำหรับพนักงานคนนี้
6. ส่ง LINE message ยืนยัน:

```
✅ ผูกบัญชีสำเร็จ!

สวัสดีครับ คุณสมชาย
ตอนนี้คุณสามารถใช้งาน TimeLine ได้แล้ว

เริ่มต้นด้วยการเช็คอินเข้างาน ☑️
```

### DB ที่เปลี่ยน
```
employees
  line_user_id = "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  is_linked    = true
  linked_at    = now()
```

### Error Cases
| กรณี | Error Code | ข้อความ |
|---|---|---|
| Token ปลอม | `INVALID_LIFF_TOKEN` | ไม่สามารถยืนยันตัวตนได้ |
| LINE นี้ผูกคนอื่นแล้ว | `LINE_ALREADY_LINKED` | บัญชี LINE นี้ถูกผูกไปแล้ว |
| พนักงานผูกแล้ว | `EMPLOYEE_ALREADY_LINKED` | กรุณาติดต่อ HR |
| ไม่พบพนักงาน | `EMPLOYEE_NOT_FOUND` | ไม่พบข้อมูลพนักงาน |

---

## Step 14 — เข้าหน้าหลัก + เช็คอินครั้งแรก

**Actor:** พนักงาน
**ทำที่:** LIFF App (หน้า Check-in)

### สิ่งที่เห็น
1. หน้า Check-in พร้อม greeting "สวัสดีตอนเช้า สมชาย!"
2. แสดงกะงานวันนี้ + สาขา
3. นาฬิกา real-time
4. ปุ่ม "เช็คอิน" ขนาดใหญ่

### พนักงานกดเช็คอิน
```
POST /api/v1/employee/attendance/check-in
Header: Authorization: Bearer {jwt}
Body: {
  shift_id:  "shf-uuid-001",
  branch_id: "br-uuid-001",
  gps_lat:   13.8148,
  gps_lng:   100.5619
}
```

→ ระบบบันทึก ✅
→ ส่ง LINE message ยืนยัน "เช็คอินสำเร็จ 08:02 น. — ตรงเวลา"

---

## สรุป Flow ทั้งหมด

```
TALENT                ADMIN                 HR               พนักงาน
  │                     │                    │                  │
  ├─ สร้าง Company      │                    │                  │
  ├─ Setup LINE OA      │                    │                  │
  ├─ สร้าง Admin ──────►│                    │                  │
  │                     ├─ Login + เปลี่ยน PW│                  │
  │                     ├─ สร้าง Branch      │                  │
  │                     ├─ สร้าง Shift       │                  │
  │                     ├─ สร้าง HR ─────────►│                  │
  │                     │                    ├─ Login + เปลี่ยน PW
  │                     │                    ├─ เพิ่มพนักงาน    │
  │                     │                    ├─ ส่ง LINE ────────►│
  │                     │                    │                  ├─ กดลิงก์
  │                     │                    │                  ├─ LINE Login
  │                     │                    │                  ├─ เลือกชื่อ
  │                     │                    │                  ├─ ยืนยัน → Map
  │                     │                    │                  └─ เช็คอินครั้งแรก ✅
```

---

## ข้อควรระวัง

| ประเด็น | รายละเอียด |
|---|---|
| LINE OA ต้องเปิด Webhook | ก่อน Step 9 จะส่ง message ให้พนักงานได้ |
| 1 LINE account = 1 พนักงาน | ผูกซ้ำไม่ได้ — ถ้าต้องการเปลี่ยนต้องให้ HR unlink ก่อน |
| พนักงานต้อง follow LINE OA | ถ้ายังไม่ follow จะไม่ได้รับ message |
| LIFF ต้องเปิดใน LINE เท่านั้น | เปิดใน browser ปกติจะ error |
| JWT หมดอายุ 15 นาที | LIFF จะ auto-refresh ผ่าน liff_token |
