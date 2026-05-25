---
tags: [line, liff, oa, webhook, integration]
---

# Line Integration

← [[00-HOME]] | Related: [[Module-Line]] | [[08-Frontend-LIFF]]

## หลักการ

- **1 Tenant = 1 Line OA** = 1 `line_channel_id`
- Super Admin setup ตอน onboard tenant ใหม่
- Credential เก็บใน `tenant_line_configs` (encrypted at rest)
- Employee ใช้ LIFF เท่านั้น — ไม่มี Web login

---

## LIFF Check-in Flow

```
Employee เปิด Line OA
  └→ กด "เช็คอิน"
       └→ Line เปิด LIFF App (React embed ใน Line)
            └→ liff.init({ liffId })
            └→ liff.login() ถ้ายังไม่ login
            └→ liff.getProfile() → lineUserId, displayName
            └→ liff.getIDToken() → liff_access_token
                 └→ POST /api/v1/employee/attendance/check-in
                    Headers:
                      x-liff-token: <liff_access_token>
                      x-line-user-id: <lineUserId>
                      x-line-channel-id: <channelId>
                         └→ liffMiddleware: verify token
                         └→ lookup employee จาก line_user_id + tenant_id
                         └→ บันทึก AttendanceRecord
                         └→ ส่ง Line message ยืนยัน
```

---

## LIFF Token Verification (Backend)

```typescript
// server/src/common/middleware/liff.ts
async function verifyLiffToken(token, lineUserId, channelId) {
  const params = new URLSearchParams({ id_token: token, client_id: channelId })
  const res = await axios.post(
    'https://api.line.me/oauth2/v2.1/verify',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return res.data.sub === lineUserId
}
```

**Steps ของ liffMiddleware:**
1. ตรวจ headers: `x-liff-token`, `x-line-user-id`, `x-line-channel-id`
2. Lookup `TenantLineConfig` จาก `line_channel_id`
3. Call Line API verify token
4. Lookup `Employee` จาก `tenant_id + line_user_id`
5. attach `req.tenantId`, `req.employeeId`

---

## Employee ↔ Line UID Mapping

```
Admin เพิ่มพนักงาน (ยังไม่มี line_user_id)
  └→ ระบบส่งลิงก์ verify ผ่าน Line OA
       └→ พนักงานกดลิงก์ → เปิด LIFF verify page
            └→ liff.getProfile() → lineUserId
            └→ PATCH /api/v1/employee/verify-line
                 └→ บันทึก line_user_id ใน employees table
```

จนกว่า `line_user_id` จะถูก map → LIFF แสดง "กรุณายืนยันตัวตน" (`EMPLOYEE_NOT_MAPPED` error)

---

## Line Messaging API (Notify)

ใช้สำหรับ:
- แจ้ง Manager เมื่อมี leave request ใหม่
- ยืนยันการเช็คอิน/เช็คเอาต์ให้พนักงาน
- Announcement broadcast (Phase 2)

```typescript
// ตัวอย่าง push message
await lineClient.pushMessage(lineUserId, {
  type: 'text',
  text: `✅ เช็คอินสำเร็จ ${shiftName} เวลา ${checkInTime}`
})
```

---

## Line OA Setup (Super Admin)

```
PUT /api/v1/super-admin/tenants/:id/line-config
Body: {
  line_channel_id: "...",
  line_channel_secret: "...",  // เก็บ encrypted
  line_liff_id: "...",
  rich_menu_id: "...",         // optional
  logo_url: "...",             // white-label
  primary_color: "#RRGGBB"     // white-label
}
```

→ [[Module-Tenant]] | [[02-Database#TenantLineConfig]]

---

## LIFF Frontend (employee app)

```typescript
// employee/src/lib/liff.ts
export const initLiff = async () => {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
  if (!liff.isLoggedIn()) liff.login()
}

export const getLiffProfile = async () => ({
  lineUserId:  profile.userId,
  displayName: profile.displayName,
  pictureUrl:  profile.pictureUrl,
  idToken:     liff.getIDToken() ?? '',
})

export const getChannelId = () =>
  import.meta.env.VITE_LINE_CHANNEL_ID as string
```

→ [[08-Frontend-LIFF]]

---

## Env Variables ที่เกี่ยวข้อง

| Variable | ใช้ที่ | หมายเหตุ |
|----------|--------|----------|
| `LINE_CHANNEL_ID` | server `.env` | fallback dev only — prod ใช้จาก DB |
| `LINE_CHANNEL_SECRET` | server `.env` | fallback dev only |
| `VITE_LIFF_ID` | employee `.env` | per-tenant |
| `VITE_LINE_CHANNEL_ID` | employee `.env` | ส่งใน header |

> ห้าม hardcode credential — ดู [[12-Docker-Setup]]
