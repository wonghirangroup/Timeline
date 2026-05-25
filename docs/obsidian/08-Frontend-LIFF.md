---
tags: [frontend, liff, employee, line, react]
---

# Frontend — LIFF App (Employee)

← [[00-HOME]] | Path: `employee/` | Port: 8082

## ใช้สำหรับ

Employee เท่านั้น — ฝังใน Line OA (ไม่ใช่ browser ปกติ)

> EMPLOYEE ไม่มี Web App — ทุกอย่างผ่าน Line LIFF

---

## Tech Stack

- React + Vite
- @line/liff SDK
- Tailwind CSS v4
- Axios (ส่ง LIFF token แทน JWT)

---

## Folder Structure

```
employee/src/
├── components/
├── features/
│   ├── checkin/     ← เช็คอิน / เช็คเอาต์
│   ├── leave/       ← ยื่นใบลา
│   └── history/     ← ประวัติ attendance + leave ของตัวเอง
├── lib/
│   ├── liff.ts      ← init, login, getProfile, getIDToken
│   └── axios.ts     ← ส่ง x-liff-token header
└── pages/
```

---

## LIFF Library

**File**: `employee/src/lib/liff.ts`

```typescript
export const initLiff = async () => {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
  if (!liff.isLoggedIn()) liff.login()
}

export const getLiffProfile = async () => {
  const profile = await liff.getProfile()
  return {
    lineUserId:  profile.userId,
    displayName: profile.displayName,
    pictureUrl:  profile.pictureUrl,
    idToken:     liff.getIDToken() ?? '',
  }
}

export const getChannelId = () =>
  import.meta.env.VITE_LINE_CHANNEL_ID as string
```

---

## Axios — LIFF Headers

```typescript
// employee/src/lib/axios.ts (TODO: implement)
api.interceptors.request.use(async (config) => {
  const { idToken, lineUserId } = await getLiffProfile()
  config.headers['x-liff-token']      = idToken
  config.headers['x-line-user-id']    = lineUserId
  config.headers['x-line-channel-id'] = getChannelId()
  return config
})
```

**แตกต่างจาก Admin app**: ไม่ใช้ `Authorization: Bearer` แต่ใช้ custom headers 3 ตัว

---

## Check-in Flow (UI)

```
1. App load → initLiff()
2. ถ้า line_user_id ยังไม่ map → แสดงหน้า "กรุณายืนยันตัวตน"
3. ถ้า map แล้ว → แสดงหน้า check-in
4. Employee กดเช็คอิน → เลือก Shift
5. POST /api/v1/employee/attendance/check-in
6. แสดง success + เวลาเช็คอิน
```

---

## Verify Line Identity Flow

```
1. Admin ส่งลิงก์ verify ผ่าน Line OA
2. Employee กดลิงก์ → เปิด LIFF verify page
3. initLiff() → getProfile()
4. PATCH /api/v1/employee/verify-line { lineUserId }
5. ระบบ map employee ↔ line_user_id
6. redirect → หน้า check-in
```

---

## Pages

| Page | เมื่อ |
|------|-------|
| Verify Identity | `line_user_id` ยังไม่ถูก map |
| Check-in/out | หน้าหลัก |
| Leave Request Form | ยื่นใบลา |
| Leave History | ดูสถานะวันลา |
| Attendance History | ประวัติเช็คชื่อ |
| Leave Balance | โควต้าวันลาคงเหลือ |

---

## Env Variables

```
VITE_LIFF_ID=<liff_id_ของ_tenant>
VITE_LINE_CHANNEL_ID=<channel_id_ของ_tenant>
VITE_API_URL=http://localhost:3000
```

---

## สถานะ

- [x] LIFF UI mockup เสร็จแล้ว
- [ ] connect จริงกับ backend API
- [ ] verify-line flow

→ ดู backend ที่ [[05-Line-Integration]] | [[Module-Attendance]] | [[Module-Leave]]
