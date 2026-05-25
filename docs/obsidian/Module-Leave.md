---
tags: [module, leave, approval]
---

# Module: Leave

← [[00-HOME]] | Files: `server/src/modules/leave/`

## ภาพรวม

ยื่นใบลา + approval flow + balance management

## Files

| File | สถานะ |
|------|-------|
| `leave.route.ts` | TODO |
| `leave.service.ts` | TODO |
| `leave.schema.ts` | TODO |

## API Routes

### Employee (LIFF)
```
GET  /api/v1/employee/leave-requests?status=
POST /api/v1/employee/leave-requests
GET  /api/v1/employee/leave-balances
```

### Admin / Manager (Web App)
```
GET  /api/v1/admin/leave-requests?status=&branchId=
GET  /api/v1/admin/leave-requests/:id
POST /api/v1/admin/leave-requests/:id/approve
POST /api/v1/admin/leave-requests/:id/reject   { reject_note }

GET  /api/v1/manager/leave-requests?status=
POST /api/v1/manager/leave-requests/:id/approve
POST /api/v1/manager/leave-requests/:id/reject
```

## Leave Request Body

```typescript
{
  leave_type:     'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY'
  start_date:     string   // "YYYY-MM-DD"
  end_date:       string
  reason?:        string
  attachment_url?: string  // ใบรับรองแพทย์
}
```

## Service Methods (TODO)

```typescript
createLeaveRequest(tenantId, employeeId, data): Promise<LeaveRequest>
listLeaveRequests(tenantId, filters): Promise<LeaveRequest[]>
approveLeave(tenantId, requestId, reviewerId): Promise<LeaveRequest>
rejectLeave(tenantId, requestId, reviewerId, note): Promise<LeaveRequest>
getLeaveBalance(tenantId, employeeId, year): Promise<LeaveBalance[]>
checkOverlap(employeeId, startDate, endDate): Promise<boolean>
```

## Approval Flow

```
Employee ยื่นใบลา (LIFF)
  └→ สร้าง LeaveRequest status=PENDING
  └→ ส่ง Line notify ถึง Manager ของ Branch
       ↓
Manager / Admin กด Approve / Reject (Web App)
  └→ ตรวจ: Manager เฉพาะ Branch ตัวเอง
  └→ APPROVED → หัก leave_balance
  └→ REJECTED → ไม่ขัก balance
  └→ ส่ง Line notify ผลให้ Employee
```

## Business Rules

| Rule | Detail |
|------|--------|
| ประเภทลา | SICK, PERSONAL, VACATION, MATERNITY |
| ห้ามทับซ้อน | query check ก่อน create |
| ย้อนหลัง | ได้ไม่เกิน 3 วัน (configurable per tenant) |
| Balance | หัก `used_days` เมื่อ APPROVED |
| Manager scope | approve ได้เฉพาะ Branch ตัวเอง |

→ [[10-Business-Rules#Leave]]

## DB Models

→ [[02-Database#LeaveRequest]] | [[02-Database#LeaveBalance]]

## Error Codes

| Code | เมื่อ |
|------|-------|
| `LEAVE_OVERLAP` | วันลาทับซ้อนกัน |
| `LEAVE_BALANCE_INSUFFICIENT` | โควต้าไม่พอ |
| `LEAVE_BACKDATED` | ย้อนหลังเกินกำหนด |
| `FORBIDDEN` | Manager approve นอก Branch ตัวเอง |

## Related

- [[Module-Employee]] — Employee ที่ยื่นใบลา
- [[Module-Line]] — notify Manager + Employee
- [[04-Roles-Permissions]] — Manager approval scope
- [[08-Frontend-LIFF]] — UI ยื่นใบลา
