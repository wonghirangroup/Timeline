# Sprint Plan — TimeLine

เอกสารนี้สรุปแผนพัฒนาเป็น 3 สปรินต์ โดยแบ่งงานเป็นฟีเจอร์หลักตามแต่ละ Role และ backend ที่จำเป็น.

## Sprint 1 — Core MVP (Login + Attendance + Employee flow)

เป้าหมาย: ให้ `EMPLOYEE` ใช้งานได้จริง พร้อม backend เชื่อม

### Task ย่อยของ Sprint 1

1. Auth
   - `server`: สร้าง route login, token refresh, middleware JWT
   - `server`: สร้าง user model / seed ตัวอย่าง
   - `admin`, `superadmin`, `employee`: สร้าง login page หรือ form ถ้ามี
   - `shared`: สร้าง type สำหรับ auth response / user profile

2. Employee / LIFF
   - สร้าง `employee/src/pages/profile` แสดงข้อมูล user
   - สร้าง `employee/src/pages/checkin` เก็บเวลาพนักงาน
   - สร้าง `employee/src/pages/checkout` ปิดเวลางาน
   - สร้าง `employee/src/pages/history` แสดงประวัติ attendance
   - สร้าง `employee/src/lib/axios.ts` เชื่อม API
   - ถ้าใช้ LIFF: สร้าง `employee/src/lib/liff.ts`

3. Attendance
   - `server`: route check-in
   - `server`: route check-out
   - `server`: route history attendance
   - `admin`: สร้างหน้า attendance พื้นฐาน ดูเวลา check-in/out ได้
   - `employee`: คำนวณสถานะเช็คอิน/เช็คเอาท์ใน UI

4. Leave
   - `employee`: สร้าง `employee/src/pages/leave`
   - `server`: route create leave request
   - `server`: route list leave requests ของ user
   - `admin`: สร้างหน้า leave list เบื้องต้น
   - `admin`: แสดงสถานะ pending / approved / rejected

5. OT
   - `employee`: สร้าง `employee/src/pages/ot`
   - `server`: route create OT request
   - `server`: route list OT ของ user
   - `admin`: สร้างหน้า OT list เบื้องต้น
   - `admin`: แสดงสถานะ pending / approved / rejected

### Backlog — หน้า-ต่อ-หน้า (Sprint 1)

- `employee/src/pages/checkin`
  - หน้า input check-in
  - กดเช็คอินไปยัง API
  - แสดงสถานะสำเร็จ / ข้อผิดพลาด

- `employee/src/pages/checkout`
  - หน้า input check-out
  - กดเช็คเอาท์ไปยัง API
  - แจ้งเวลาเสร็จสิ้น

- `employee/src/pages/history`
  - ตารางหรือรายการประวัติ check-in/out
  - ฟิลเตอร์ตามวันที่

- `employee/src/pages/leave`
  - ฟอร์มขอลา
  - เลือกวันที่ / ชนิดการลา / เหตุผล
  - ดูสถานะคำร้องลาล่าสุด

- `employee/src/pages/ot`
  - ฟอร์มขอ OT
  - เลือกวันที่ / ชั่วโมง / เหตุผล
  - ดูสถานะคำร้อง OT ล่าสุด

- `employee/src/pages/profile`
  - แสดงข้อมูลชื่อ-รหัส-ตำแหน่ง
  - ปุ่ม logout หรือ refresh token

- `admin` (เบื้องต้น)
  - `admin/src/pages/dashboard` (summary ง่าย ๆ)
  - `admin/src/pages/attendance` (ดู attendance ของพนักงาน)
  - `admin/src/pages/leave` (ดูใบลา)
  - `admin/src/pages/ot` (ดูใบ OT)

### Checklist ตาม Role

#### EMPLOYEE
- [ ] Login / auth ทำงาน
- [ ] Check-in page พร้อม API
- [ ] Checkout page พร้อม API
- [ ] History page แสดงข้อมูลได้
- [ ] Leave request page พร้อม submit
- [ ] OT request page พร้อม submit
- [ ] Profile page แสดงข้อมูล
- [ ] LIFF init / token ถ้าใช้ LIFF

#### ADMIN / MANAGER
- [ ] Login / auth ทำงาน
- [ ] Dashboard พื้นฐาน
- [ ] Attendance view ดูเวลา employee
- [ ] Leave list ดูคำขอ
- [ ] OT list ดูคำขอ
- [ ] รองรับ status pending/approved/rejected

#### SUPERADMIN
- [ ] Login / auth ทำงาน
- [ ] Dashboard พื้นฐาน
- [ ] Tenant / users สามารถต่อยอด
- [ ] Line-config page ถ้ามี
- [ ] Billing page ถ้าจะทำ

---

## Sprint 2 — Admin / Manager management features

เป้าหมาย: ทำให้ Admin/Manager ใช้จัดการพนักงานและตารางการทำงานได้

1. Admin dashboard
   - `admin/src/pages/dashboard`
2. Employees
   - `admin/src/pages/employee`
   - Server: employee CRUD
3. Branch
   - `admin/src/pages/branch`
   - Server: branch CRUD
4. Shift
   - `admin/src/pages/shift`
   - Server: shift create/edit
5. Leave approval
   - `admin/src/pages/leave`
   - Approve / reject flow
6. OT approval
   - `admin/src/pages/ot`
   - Approve / reject flow
7. Announcement
   - `admin/src/pages/announcement`
   - Server: create announcement
8. Report
   - `admin/src/pages/report`
   - Basic attendance / leave / OT summaries

---

## Sprint 3 — Superadmin + polish + deployment readiness

เป้าหมาย: จัดการระบบทั้งหมด, เพิ่ม settings และเตรียมใช้งานจริง

1. Superadmin dashboard
   - `superadmin/src/pages/dashboard`
2. Tenant
   - `superadmin/src/pages/tenants`
   - Server: tenant CRUD
3. Users
   - `superadmin/src/pages/users`
   - Server: user / role management
4. Line-config
   - `superadmin/src/pages/line-config`
   - เซ็ต LIFF ID / LINE channel
5. Billing
   - `superadmin/src/pages/billing` (ถ้ามี)
6. Settings
   - Common settings, CORS, environment hints
7. Document / Expense
   - ถ้าจะใช้งานต่อในระบบ
8. Docker / Dev workflow
   - `docker-compose.dev.yml`
   - README / docs อัปเดต
9. QA / polish
   - UI consistency
   - error handling
   - validation
   - performance

---

## เคล็ดลับการจัดลำดับ

- เริ่มจาก `Auth` + `Employee` ก่อน เพราะเป็นเส้นเลือดหลัก
- ถัดไปทำ `Admin` flow สำหรับอนุมัติ `Leave`/`OT`
- ก่อนสุดท้าย ทำ `Superadmin` เพื่อบริหาร tenant/user
- สุดท้ายเก็บ `report`, `billing`, `document` และ UX polish

## หน้าที่ต้องทำตาม Role

- `employee`
  - Check-in / Checkout / Leave / OT / History / Profile / Feedback
- `admin`
  - Dashboard / Employee / Branch / Shift / Leave / OT / Report / Announcement / Settings
- `superadmin`
  - Dashboard / Tenants / Users / Line-config / Billing
