---
tags: [module, line, webhook, messaging]
---

# Module: Line OA / Webhook

← [[00-HOME]] | Files: `server/src/modules/line/` | Related: [[05-Line-Integration]]

## ภาพรวม

- รับ Line webhook events
- ส่ง Line messages (notify, confirm, broadcast)
- Setup/verify LIFF per tenant

## Files

| File | สถานะ |
|------|-------|
| `line.route.ts` | TODO |
| `line.service.ts` | TODO |
| `line.schema.ts` | TODO |

## API Routes

```
POST /api/v1/line/webhook   ← รับ event จาก Line OA (Public)
```

## Service Methods (TODO)

```typescript
// Notify manager เมื่อมี leave request ใหม่
notifyManager(tenantId, managerId, leaveRequest): Promise<void>

// ยืนยันเช็คอิน/เช็คเอาต์ให้ employee
confirmAttendance(lineUserId, tenantId, record): Promise<void>

// Broadcast announcement
broadcastAnnouncement(tenantId, title, content): Promise<void>

// ส่งลิงก์ verify ให้ employee ใหม่
sendVerifyLink(lineUserId, tenantId, verifyUrl): Promise<void>
```

## Webhook Event Handling (TODO)

```typescript
// webhook events ที่ต้อง handle:
// - follow: พนักงาน follow OA → ส่ง welcome + verify link
// - message: รับ text message → ตอบ menu
// - postback: Rich Menu action (check-in button)
```

## Line Signature Verification

```typescript
// ต้อง verify X-Line-Signature header ทุก webhook request
const signature = req.headers['x-line-signature']
const body = JSON.stringify(req.body)
const hash = crypto
  .createHmac('SHA256', lineChannelSecret)
  .update(body)
  .digest('base64')
if (signature !== hash) return reply.status(400).send(...)
```

## Related

- [[05-Line-Integration]] — LIFF flow + token verify
- [[Module-Leave]] — notify manager เมื่อมี leave request
- [[Module-Attendance]] — confirm เช็คอิน
- [[Module-Announcement]] — broadcast announcement
- [[Module-Tenant]] — Line config per tenant
