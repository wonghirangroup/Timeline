---
tags: [module, attendance, check-in, check-out]
---

# Module: Attendance

← [[00-HOME]] | Files: `server/src/modules/attendance/`

## ภาพรวม

บันทึกและรายงานการเช็คชื่อ — Employee เช็คผ่าน LIFF เท่านั้น

## Files

| File | สถานะ |
|------|-------|
| `attendance.route.ts` | ✅ Stub (check-in/check-out) |
| `attendance.service.ts` | TODO |
| `attendance.schema.ts` | TODO |

## API Routes

### Employee (LIFF only)
```
POST /api/v1/employee/attendance/check-in
POST /api/v1/employee/attendance/check-out
GET  /api/v1/employee/attendance/history?page=&limit=
```

### Admin / Manager (Web App)
```
GET /api/v1/admin/attendance?branchId=&date=&shiftId=
GET /api/v1/manager/attendance?branchId=&date=
```

## Check-in Request

```typescript
// Body (LIFF — ส่งผ่าน LIFF headers, ไม่ใช่ JWT)
{
  shift_id:  string
  branch_id: string
  note?:     string
}

// Response
{
  success:    true,
  data: {
    employee_id:   string
    shift_id:      string
    check_in_at:   string  // ISO datetime Asia/Bangkok
    is_late:       boolean
    late_minutes:  number
  }
}
```

## Service Methods (TODO)

```typescript
checkIn(tenantId: string, employeeId: string, data: CheckInDto): Promise<AttendanceRecord>
checkOut(tenantId: string, employeeId: string, shiftId: string): Promise<AttendanceRecord>
getHistory(tenantId: string, employeeId: string, page, limit): Promise<AttendanceRecord[]>
getReport(tenantId: string, branchId: string, date: string): Promise<AttendanceRecord[]>
```

## Business Rules

| Rule | Detail |
|------|--------|
| LIFF only | ห้ามมี check-in endpoint จาก Web App |
| ไม่ duplicate | `UNIQUE(employee_id, shift_id, date)` |
| Late check | `check_in_at > shift.start_time + shift.late_threshold` |
| Timezone | ทุก timestamp เก็บใน Asia/Bangkok |
| Multi-shift | พนักงาน 1 คน เช็คได้หลาย shift ต่อวัน |

→ [[10-Business-Rules#Attendance]]

## Stub Route (ปัจจุบัน)

```typescript
// attendance.route.ts — stub สำหรับ LIFF smoke test
app.post('/employee/attendance/check-in', async (req, reply) => {
  return {
    success: true,
    data: {
      employee_id: body.employeeId || 'emp-dev-1',
      check_in_time: new Date().toISOString(),
    },
    message: 'checked-in (stub)'
  }
})
```

## DB Schema

→ [[02-Database#AttendanceRecord]]

```
UNIQUE: employee_id + shift_id + date
INDEX: tenant_id, employee_id
```

## Related

- [[Module-Shift]] — Shift ที่ผูกกับ AttendanceRecord
- [[Module-Employee]] — Employee ที่เช็คชื่อ
- [[05-Line-Integration]] — LIFF flow
- [[08-Frontend-LIFF]] — UI เช็คอิน
