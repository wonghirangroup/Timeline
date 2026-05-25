---
tags: [module, shift]
---

# Module: Shift

← [[00-HOME]] | Files: `server/src/modules/shift/`

## ภาพรวม

จัดการกะการทำงาน — ผูกกับ Branch และ Tenant เสมอ

## Files

| File | สถานะ |
|------|-------|
| `shift.route.ts` | TODO |
| `shift.service.ts` | TODO |
| `shift.schema.ts` | TODO |

## API Routes

```
GET    /api/v1/admin/shifts?branchId=
POST   /api/v1/admin/shifts
GET    /api/v1/admin/shifts/:id
PATCH  /api/v1/admin/shifts/:id
DELETE /api/v1/admin/shifts/:id   (soft delete)
```

## Service Methods (TODO)

```typescript
listShifts(tenantId: string, branchId?: string): Promise<Shift[]>
createShift(tenantId: string, data): Promise<Shift>
updateShift(tenantId: string, shiftId: string, data): Promise<Shift>
softDeleteShift(tenantId: string, shiftId: string): Promise<void>
```

## DB Schema

```prisma
model Shift {
  tenant_id       String
  branch_id       String
  name            String
  start_time      String   // "08:00"
  end_time        String   // "17:00"
  late_threshold  Int      @default(15)   // นาที
  allow_overlap   Boolean  @default(false) // Phase 2
  day_off_quota   Int      @default(1)     // Phase 2
}
```

→ [[02-Database#Shift]]

## Business Rules

- Shift ต้องผูกกับ Branch และ Tenant เสมอ
- `late_threshold` = นาทีที่ยังไม่ถือว่าสาย (default 15 นาที)
- พนักงาน 1 คนมีได้หลาย shift ต่อวัน (ต้องเป็นคนละ shift_id)
- `allow_overlap` (Phase 2): อนุญาต shift ที่เวลาซ้อนกัน
- `day_off_quota` (Phase 2): จำนวน slot วันหยุดต่อสัปดาห์

## Related

- [[Module-Attendance]] — AttendanceRecord อ้างถึง Shift
- [[Module-Branch]] — Shift สังกัด Branch
- [[10-Business-Rules#Attendance]]
