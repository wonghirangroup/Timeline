# Class Diagram

Backend เขียนด้วย Fastify + TypeScript แบบ **modular monolith** — ไม่ได้ออกแบบเป็น OOP class ทั่วทั้งระบบ แต่แต่ละโมดูลใน `server/src/modules/<name>/` ประกอบด้วย 3 ไฟล์ที่ทำหน้าที่คล้าย class ที่แยกความรับผิดชอบ:

- **`*.route.ts`** — ชั้นรับ HTTP request, ตรวจสิทธิ์ (RBAC), เรียก service
- **`*.service.ts`** — ตรรกะทางธุรกิจ (business logic) + เข้าถึงฐานข้อมูลผ่าน Prisma
- **`*.schema.ts`** (บางโมดูล) — Zod schema สำหรับ validate input

แผนภาพด้านล่างนำเสนอโมดูลหลักในรูปแบบ class diagram (แทน service module ด้วย class, เมธอดคือฟังก์ชันที่ export)

## 1. โมดูลหลักด้าน Attendance (เช็คชื่อ)

```mermaid
classDiagram
    class AttendanceService {
        +checkIn(employeeId, branchId, gps)
        +checkInAuto(employeeId, gps)
        +checkInQR(employeeId, qrPayload)
        +checkInScan(employeeId, shiftId)
        +checkOut(employeeId)
        +createManualAttendance(data)
        +getAttendanceReport(filters)
        +getTodayAttendance(tenantId)
        +getEmployeeHistory(employeeId)
    }
    class CheckinRules {
        <<pure functions>>
        +isAllowedBranch(employee, targetBranchId) bool
        +pickShiftForCheckIn(shifts, nowMins) ShiftPickResult
        +isOvernightShift(shift) bool
        +haversineMeters(lat1, lon1, lat2, lon2) number
        +resolveGeoCheckIn(distance, radius, mode) GeoCheckResult
    }
    class LateService {
        <<pure functions>>
        +computeLateStatus(shift, checkInMins, crossesMidnight) LateStatus
    }
    AttendanceService ..> CheckinRules : delegates matching/geo logic
    AttendanceService ..> LateService : delegates late/absent calc
```

> `CheckinRules` และ `LateService` ถูกแยกเป็น pure function ล้วน (ไม่พึ่ง Prisma) เพื่อให้ unit test ได้โดยไม่ต้อง mock database — ดู [Test_Cases.md](Test_Cases.md)

## 2. โมดูลด้านองค์กรและพนักงาน

```mermaid
classDiagram
    class EmployeeService {
        +listEmployees(tenantId, branchId?)
        +createEmployee(data)
        +updateEmployee(id, data)
        +setEmployeeAdminAccess(employeeId, role)
        +resolveEmpPolicy(employee) PolicyFlags
    }
    class BranchService {
        +listBranches(tenantId)
        +createBranch(data)
        +updateBranch(id, data)
        +getBranchQrUrl(branchId)
    }
    class OrgStructureService {
        +listGroups(tenantId)
        +listDivisions(groupId)
        +listDepartments(divisionId)
        +listPositions(departmentId)
    }
    class GroupPolicyService {
        <<pure functions>>
        +resolvePolicyFlag(chain) bool
    }
    EmployeeService ..> GroupPolicyService : resolve booking/leave policy
    EmployeeService --> BranchService : belongs to branch
    OrgStructureService --> EmployeeService : position assigned
```

## 3. โมดูลด้านวันลา/วันหยุด

```mermaid
classDiagram
    class LeaveService {
        +listLeaveRequests(filters)
        +createLeaveRequest(data)
        +reviewLeaveRequest(id, decision)
        +calcLeaveDays(start, end, period)
    }
    class WeeklyOffService {
        +listWeeklyOff(filters)
        +createWeeklyOff(data)
        +createMonthlyBatchOff(data)
        +approveWeeklyOff(id)
    }
    class WeeklyOffPeriodService {
        +openPeriod(branchId, month)
        +closePeriod(branchId, month)
        +notifyPeriodOpened(branchId, month)
    }
    class VacationPolicyService {
        +previewVacationBonus(tenantId)
        +runMonthlyBonus(tenantId)
        +runAnnualReset(tenantId)
        +getVacationReport(tenantId)
    }
    LeaveService --> VacationPolicyService : deducts vacation balance
    WeeklyOffService --> WeeklyOffPeriodService : bookings within open period
```

## 4. โมดูลด้านแจ้งเตือน

```mermaid
classDiagram
    class LinePushService {
        +notifyAdminsLine(tenantId, employeeId, notice)
        +notifyEmployeeLine(tenantId, employeeId, fromName, notice)
        -buildFlexMessage(name, notice, baseUrl, actionUrl)
    }
    class AnnouncementService {
        +lineMulticast(accessToken, toIds, message)
        +linePush(accessToken, toId, message)
        +createAnnouncement(data)
    }
    class LineLogService {
        +logLineSend(params)
        +listLineMessageLogs(tenantId, filters)
    }
    class AuthService {
        +createMagicLoginToken(userId, nextPath)
        +consumeMagicLoginToken(token)
        +peekMagicLoginNextPath(token)
    }
    LinePushService --> AnnouncementService : uses lineMulticast/linePush
    LinePushService --> AuthService : embeds magic-login link
    LinePushService ..> LineLogService : logs every send (best-effort)
    AnnouncementService ..> LineLogService : logs every send
```

## 5. Frontend — โครงสร้างหน้าเว็บแอดมิน (React)

```mermaid
classDiagram
    class Layout {
        +Sidebar
        +Topbar
    }
    class Sidebar {
        -NAV_SECTIONS : ภาพรวม, ข้อมูล, การกระทำ, รายงาน
    }
    class ReportPages {
        +ExecutiveReportPage
        +EmployeeReportPage
        +BranchReportPage
        +HolidayReportPage
        +LeaveReportPage
        +LineMessagesReportPage
    }
    class SharedUI {
        +Modal
        +ConfirmDialog
        +Toast
        +EmptyState
        +Button
        +AvatarUpload
    }
    Layout --> Sidebar
    Layout --> ReportPages : /report/*
    ReportPages --> SharedUI : เดือน nav, KPI card, table/card toggle pattern
```

## เอกสารที่เกี่ยวข้อง

[API_Documentation.md](API_Documentation.md) แสดง endpoint ที่แต่ละ service เปิดให้เรียกใช้ · [ER_Diagram.md](ER_Diagram.md) แสดงโครงสร้างข้อมูลที่แต่ละ service เข้าถึง
