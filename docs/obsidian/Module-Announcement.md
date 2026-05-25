---
tags: [module, announcement, phase2]
---

# Module: Announcement

← [[00-HOME]] | Files: `server/src/modules/announcement/` | **Phase 2**

## ภาพรวม

สร้างประกาศภายใน tenant + optional broadcast ผ่าน Line OA

## Files

| File | สถานะ |
|------|-------|
| `announcement.route.ts` | TODO (Phase 2) |
| `announcement.service.ts` | TODO (Phase 2) |
| `announcement.schema.ts` | TODO (Phase 2) |

## API Routes (วางแผน)

```
GET  /api/v1/admin/announcements?page=&limit=
POST /api/v1/admin/announcements
GET  /api/v1/admin/announcements/:id
```

## Create Announcement Body

```typescript
{
  title:     string
  content:   string
  send_line: boolean  // true = broadcast ผ่าน Line OA ของ tenant
}
```

## DB Schema

```prisma
model Announcement {
  tenant_id  String
  title      String
  content    String @db.Text
  send_line  Boolean   // broadcast ผ่าน Line
  created_by String    // user_id
}
```

→ [[02-Database#Announcement]]

## Line Broadcast

ถ้า `send_line: true` → ส่ง Line message ไปหาพนักงานทุกคนใน tenant  
ใช้ Line Messaging API multicast

→ [[Module-Line]] | [[05-Line-Integration]]

## Related

- [[Module-Tenant]] — announcement ผูกกับ tenant
- [[Module-Line]] — Line broadcast
