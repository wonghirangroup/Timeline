# UI Design — TimeLine Employee (LIFF App)

> LIFF App สำหรับพนักงาน เปิดใน LINE เท่านั้น  
> Max width: **430px** (mobile-first)  
> Font: **Noto Sans Thai** + **Inter**

---

## Check-in Page

### Objective
ให้พนักงานเช็คอินผ่าน LINE LIFF ได้รวดเร็ว ชัดเจน และรู้ผลทันที

---

### Full Layout

```
┌─────────────────────────────────┐  ← 430px max-width
│                                 │
│  ░░░░░  HEADER STRIP  ░░░░░░░  │  bg: gradient(#fff8f4 → #fef6ee)
│  ─────────────────────────────  │  border-bottom: rgba(255,107,53,0.10)
│                                 │
│  ┌─────────────────────────┐   │
│  │   PROFILE CARD          │   │  glass-card  (margin: 0 16px)
│  └─────────────────────────┘   │
│                                 │
│       ◉  CHECK-IN BUTTON       │  centered, 156×156px circular
│                                 │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │ STAT  │ │ STAT  │ │ STAT  │ │  3-column stats row
│  └───────┘ └───────┘ └───────┘ │
│                                 │
│  ┌─────────────────────────┐   │  feedback banner (conditional)
│  │ ✅ / ⚠️  MESSAGE        │   │
│  └─────────────────────────┘   │
│                                 │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← BOTTOM NAV fixed 68px
│  ⏰       🚪      📋      👤   │
│ เช็คอิน เช็คเอาท์ ประวัติ โปรไฟล์│
└─────────────────────────────────┘
```

---

### Component 1 — Header Strip `<ClockDisplay />`

```
┌─────────────────────────────────┐
│                                 │
│          ━━━━━━━━               │  accent bar: 40×4px, orange gradient, rounded
│                                 │
│       สวัสดีตอนเช้า 🌅           │  greeting + emoji
│  วันจันทร์ที่ 18 พฤษภาคม 2568    │  Thai date (พ.ศ.)
│                                 │
│           08:47:23              │  live clock, orange gradient text
│                                 │
└─────────────────────────────────┘
```

| Property | Value |
|---|---|
| Background | `linear-gradient(160deg, #fff8f4, #fff3ea, #fef6ee)` |
| Padding | `32px 20px 20px` |
| Accent bar | `40×4px`, `border-radius: 99px`, orange gradient, centered |
| Greeting | `1.7rem`, weight 700, `--text-primary`, letter-spacing -0.4px |
| Thai date | `0.82rem`, weight 500, `--text-secondary`, margin-top 6px |
| Clock | `2rem`, weight 700, letter-spacing 2px, orange gradient text, tabular-nums |
| Animation | `animate-fade-in` (0.5s ease-out) |

**Greeting Logic (Asia/Bangkok hour):**

| เวลา | ข้อความ | Emoji |
|---|---|---|
| 05:00–11:59 | สวัสดีตอนเช้า | 🌅 |
| 12:00–17:59 | สวัสดีตอนบ่าย | ☀️ |
| 18:00–04:59 | สวัสดีตอนเย็น | 🌙 |

---

### Component 2 — Profile Card `<ProfileCard />`

**Ready state** (LIFF โหลดสำเร็จ):
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │ [IMG]│  สมชาย มีสุข          🟢 พร้อม │
│  │      │  LINE ID: U1a2b3c4…   │
│  └──────┘                       │
└─────────────────────────────────┘
```

**Loading state** (กำลัง init LIFF):
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │  👤  │  กำลังโหลดโปรไฟล์…    │
│  └──────┘                       │
└─────────────────────────────────┘
```

**Error state** (LIFF init ล้มเหลว):
```
┌─────────────────────────────────┐
│  ┌──────┐                       │
│  │  👤  │  LIFF ไม่พร้อมใช้งาน  │  ← --error (red)
│  └──────┘  เปิดผ่าน LINE         │  ← --text-muted, 0.73rem
└─────────────────────────────────┘
```

| Property | Value |
|---|---|
| Card | `.glass-card`, `margin: 0 16px`, `padding: 16px` |
| Avatar size | `54×54px` circular, `border: 2px solid rgba(255,107,53,0.25)` |
| Avatar fallback | orange gradient circle + initial letter (`1.4rem`, white) |
| Name | `0.95rem`, weight 700, `--text-primary`, ellipsis overflow |
| LINE ID | `0.75rem`, `--text-secondary`, truncated 12 chars + `…` |
| Status dot | `8×8px` green circle, `animate-dot-blink` (1.5s ease-in-out) |
| Status text | `0.7rem`, weight 600, `--success` (#16a34a) |
| Animation | `animate-slide-up` (0.4s ease-out) |

---

### Component 3 — Check-in Button `<CheckInButton />`

```
         ╭ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╮   ← pulse ring 2 (164px wrapper)
       ╭ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╮  ← pulse ring 1
     ┌───────────────────────────┐
     │                           │
     │           ⏰              │  icon: 2.6rem
     │                           │  button: 156×156px circular
     └───────────────────────────┘
          แตะเพื่อเช็คอิน            label: 1rem, weight 700, --accent-start
```

**Button spec:**

| Property | Value |
|---|---|
| Button size | `156×156px` circular (border-radius 50%) |
| Wrapper | `164×164px` (เว้นพื้นที่ให้ pulse rings) |
| Background (active) | `linear-gradient(145deg, #ff6b35, #f7931e, #ffab40)` |
| Background (disabled) | `rgba(0,0,0,0.08)` |
| Box shadow (active) | `0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)` |
| Press effect | scale 0.95 on touchstart/mousedown → scale 1 on release |
| Cursor | `pointer` (active) / `not-allowed` (disabled/loading) |
| Pulse ring 1 | `animate-pulse-ring`: scale 1→1.65, opacity 0.5→0, 2s infinite |
| Pulse ring 2 | `animate-pulse-ring-2`: scale 1→1.9, opacity 0.28→0, 2s +0.4s delay |

**State matrix:**

| State | Icon | Animation | Label | Pulse rings |
|---|---|---|---|---|
| `idle` + profile ready | ⏰ | — | แตะเพื่อเช็คอิน | ✅ แสดง |
| `idle` + no profile | ⏰ | — | แตะเพื่อเช็คอิน | ❌ ซ่อน |
| `loading` | ⏳ | `animate-spin` (0.8s) | กำลังบันทึก… | ❌ ซ่อน |
| `success` | ✅ | `animate-success-pop` (0.4s) | บันทึกแล้ว! | ❌ ซ่อน |
| `error` | ❌ | `animate-success-pop` (0.4s) | ลองอีกครั้ง | ❌ ซ่อน |

- `success` → reset เป็น `idle` หลัง **4000ms**
- `error` → reset เป็น `idle` หลัง **3000ms**

---

### Component 4 — Stats Row `<StatsRow />`

```
┌───────────┐  ┌───────────┐  ┌───────────┐
│     ⏱     │  │     🕐    │  │     ✅    │
│  วันนี้    │  │ เช็คอิน   │  │  สถานะ   │
│  ทำงาน    │  │ ล่าสุด    │  │           │
│  — ชม.   │  │   08:47  │  │  ปกติ    │
└───────────┘  └───────────┘  └───────────┘
```

| Property | Value |
|---|---|
| Layout | CSS Grid, `gridTemplateColumns: repeat(3, 1fr)`, gap 10px |
| Padding | `0 16px` |
| Card | `.glass-card`, `padding: 14px 10px`, `textAlign: center` |
| Icon | `1.35rem`, line-height 1 |
| Label | `0.68rem`, weight 500, `--text-secondary`, margin-top 6px |
| Value | `0.92rem`, weight 700, `--text-primary`, margin-top 4px |
| Animation | `.stagger` — delay 0ms / 80ms / 160ms ตาม child index |

**Stats data:**

| # | Icon | Label | ก่อนเช็คอิน | หลังเช็คอิน |
|---|---|---|---|---|
| 1 | ⏱ | วันนี้ทำงาน | — ชม. | คำนวณจาก check_in_time → now |
| 2 | 🕐 | เช็คอินล่าสุด | — | HH:MM format (th-TH, 24h) |
| 3 | ✅ | สถานะ | — | ปกติ |

---

### Component 5 — Feedback Banner `<FeedbackBanner />`

**Success:**
```
┌──────────────────────────────────────┐
│ ✅  เช็คอินเรียบร้อยแล้ว 🎉 เวลา 08:47 น. │
└──────────────────────────────────────┘
  bg: rgba(22,163,74,0.08)
  border: rgba(22,163,74,0.25)
  text: --success (#16a34a)
```

**Error:**
```
┌──────────────────────────────────────┐
│ ⚠️  เกิดข้อผิดพลาดระหว่างเช็คอิน         │
└──────────────────────────────────────┘
  bg: rgba(220,38,38,0.08)
  border: rgba(220,38,38,0.25)
  text: --error (#dc2626)
```

| Property | Value |
|---|---|
| Margin | `0 16px` |
| Padding | `14px 16px` |
| Border-radius | `16px` |
| Font | `0.88rem`, weight 600, line-height 1.55 |
| Icon | `1.1rem`, flex-shrink 0 |
| Animation | `animate-slide-down` (0.3s ease-out) |

---

### Component 6 — Bottom Navigation `<BottomNav />`

```
┌──────────────────────────────────────┐
│   ⏰        🚪       📋       👤     │
│ เช็คอิน  เช็คเอาท์  ประวัติ  โปรไฟล์   │
│   •                                  │  ← active dot (4×4px orange)
└──────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Height | `68px` (`--nav-height`) |
| Position | `fixed bottom-0`, z-index 50 |
| Background | `rgba(255,255,255,0.92)` + `backdrop-filter: blur(20px)` |
| Border top | `1px solid rgba(255,107,53,0.12)` |
| Box shadow | `0 -4px 20px rgba(255,107,53,0.06)` |
| Safe area | `padding-bottom: env(safe-area-inset-bottom, 0px)` |
| Active icon | opacity 1 (inactive: 0.35) |
| Active label | orange gradient text, weight 600 |
| Active dot | `4×4px` orange circle, แสดงใต้ label |
| Press | `scale(0.94)` on `:active` |

**Nav items:**

| Path | Icon | Label |
|---|---|---|
| `/checkin` | ⏰ | เช็คอิน |
| `/checkout` | 🚪 | เช็คเอาท์ |
| `/history` | 📋 | ประวัติ |
| `/profile` | 👤 | โปรไฟล์ |

---

### Interaction Flow

```
เปิด LIFF ใน LINE
      │
      ▼
liff.init() + liff.login()
      │
  ┌───┴────┐
  │ success│                      fail
  └───┬────┘ ─────────────────────────────────► ProfileCardSkeleton (error msg แดง)
      │                                         ปุ่ม disabled
      ▼
แสดง ProfileCard
(avatar + displayName)
      │
      ▼
ปุ่ม Check-in: ACTIVE
pulse rings แสดง
      │
 user กดปุ่ม
      │
      ▼
state → "loading"
POST /employee/attendance/check-in
      │
  ┌───┴──────────────────────────────────────┐
  │ 200 OK                                   │ 4xx/5xx
  ▼                                          ▼
state → "success"                   state → "error"
checkedInAt = check_in_time          errorMsg จาก response
successMsg = "เช็คอินแล้ว เวลา HH:MM"  FeedbackBanner ⚠️
FeedbackBanner ✅
StatsRow อัปเดต
  │                                          │
4000ms                                    3000ms
  │                                          │
  └─────────────► state → "idle" ◄───────────┘
```

---

### Design Tokens

```css
/* Orange Accent */
--accent-start:   #ff6b35;
--accent-mid:     #f7931e;
--accent-end:     #ffab40;

/* Background */
--bg-page:        #f5f5f0;
--bg-subtle:      #fef6ee;

/* Glass Card */
--glass-bg:       rgba(255, 255, 255, 0.85);
--glass-border:   rgba(255, 107, 53, 0.15);
--card-shadow:    0 2px 16px rgba(255,107,53,0.08), 0 1px 4px rgba(0,0,0,0.06);
--card-shadow-lg: 0 8px 32px rgba(255,107,53,0.15), 0 2px 8px rgba(0,0,0,0.08);

/* Text */
--text-primary:   #1a1a1a;
--text-secondary: #6b6b6b;
--text-muted:     #b0b0b0;

/* Status */
--success:        #16a34a;
--error:          #dc2626;
--warning:        #d97706;

/* Nav */
--nav-height:     68px;
--nav-bg:         rgba(255, 255, 255, 0.92);
```

---

### Animation Catalogue

| Class | Keyframe | Duration | ใช้ที่ |
|---|---|---|---|
| `animate-fade-in` | opacity 0→1 | 0.5s ease-out | Header strip |
| `animate-slide-up` | translateY(16px)→0 + opacity | 0.4s ease-out | Profile card, Stats |
| `animate-slide-down` | translateY(-12px)→0 + opacity | 0.3s ease-out | Feedback banner |
| `animate-pulse-ring` | scale 1→1.65, opacity 0.5→0 | 2s infinite | Button ring 1 |
| `animate-pulse-ring-2` | scale 1→1.9, opacity 0.28→0 | 2s +0.4s delay | Button ring 2 |
| `animate-spin` | rotate 360° | 0.8s linear infinite | Loading icon ⏳ |
| `animate-success-pop` | scale 0.8→1.12→1 | 0.4s cubic-bezier | ✅ / ❌ icon |
| `animate-dot-blink` | opacity 1→0.3→1 | 1.5s ease-in-out | Status dot |
| `.stagger` | children delay 0/80/160ms | — | Stats row |

---

### Responsive & Safe Area

- Max width `430px`, `margin: 0 auto`
- `min-height: 100dvh` (dynamic viewport — รองรับ browser bar ของ mobile)
- Bottom nav: `padding-bottom: env(safe-area-inset-bottom, 0px)` — รองรับ iPhone notch
- Page container: `padding-bottom: calc(68px + 8px)` — ไม่ให้ content ถูก nav บัง
- Scrollbar: width 4px, thumb สีส้มอ่อน

---

### Accessibility

| Element | รายละเอียด |
|---|---|
| `<nav>` | `role="navigation"`, `aria-label="bottom navigation"` |
| Nav links | แต่ละ item มี `id="nav-{path}"` |
| Check-in button | `type="button"`, `disabled` attribute ถูกต้อง |
| Avatar fallback | แสดง initial letter เมื่อไม่มีรูปโปรไฟล์ |
| Color contrast | `--text-primary` (#1a1a1a) บน glass bg ผ่าน WCAG AA |

---

### Scroll Order (top → bottom)

```
1. ClockDisplay      — greeting / Thai date / live clock
2. ProfileCard       — LINE avatar + name + status dot
3. CheckInButton     — big circular CTA + pulse rings
4. StatsRow          — 3 stat cards (staggered)
5. FeedbackBanner    — success/error message (conditional)
─────────────────────────────────────
6. [BottomNav]       — fixed, ไม่อยู่ใน scroll flow
```

---

### File References

| File | บทบาท |
|---|---|
| [employee/src/pages/checkin/index.tsx](../employee/src/pages/checkin/index.tsx) | Page + sub-components ทั้งหมด |
| [employee/src/index.css](../employee/src/index.css) | Design tokens + animations |
| [employee/src/App.tsx](../employee/src/App.tsx) | Router + BottomNav |
| [employee/src/lib/liff.ts](../employee/src/lib/liff.ts) | LIFF init + getProfile |
| [employee/src/lib/axios.ts](../employee/src/lib/axios.ts) | API client (ส่ง liff_token แทน JWT) |

---

## Next UI Pages (planned)

- **Checkout** — รูปแบบเดียวกับ Check-in, ปุ่มหลักเปลี่ยนเป็น "เช็คเอาท์", แสดงเวลา check-out
- **History** — ตารางรายการ attendance: วันที่ / เช็คอิน / เช็คเอาท์ / สถานะ / OT
- **Leave** — ฟอร์มลงวันลา: ประเภท / วันที่ / หมายเหตุ + สถานะ pending/approved/rejected
- **OT** — ฟอร์มขอ OT: วันที่ / จำนวนชั่วโมง + รายการ OT ของตัวเอง
- **Profile** — ข้อมูลพนักงาน: ชื่อ / ตำแหน่ง / สาขา / leave balance
