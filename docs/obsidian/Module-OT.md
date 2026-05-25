---
tags: [module, ot, overtime, phase2]
---

# Module: OT (Overtime)

← [[00-HOME]] | Files: `server/src/modules/ot/` | **Phase 2**

## ภาพรวม

Request OT + approval flow — คล้ายกับ Leave แต่เก็บ hours

## Files

| File | สถานะ |
|------|-------|
| `ot.route.ts` | TODO (Phase 2) |
| `ot.service.ts` | TODO (Phase 2) |
| `ot.schema.ts` | TODO (Phase 2) |

## API Routes (วางแผน)

```
POST /api/v1/employee/ot-requests
GET  /api/v1/employee/ot-requests

GET  /api/v1/manager/ot-requests?branchId=
POST /api/v1/manager/ot-requests/:id/approve
POST /api/v1/manager/ot-requests/:id/reject
```

## DB Schema

```prisma
model OtRequest {
  tenant_id   String
  employee_id String
  date        DateTime  @db.Date
  start_time  String    // "18:00"
  end_time    String    // "21:00"
  hours       Decimal   @db.Decimal(4, 2)
  reason      String?
  status      LeaveStatus @default(PENDING)
  reviewed_by String?
  reject_note String?
}
```

→ [[02-Database#OtRequest]]

## Approval Flow

เหมือน [[Module-Leave#Approval Flow]] — Manager approve เฉพาะ Branch ตัวเอง

## Related

- [[Module-Leave]] — pattern เดียวกัน
- [[Module-Employee]] — Employee ที่ request OT
- [[04-Roles-Permissions]]
