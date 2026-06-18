# Critique — Super Admin (Tenant Management) — 2026-06-17

**Slug:** `super-admin-tenant-management`
**Scope:** 7 pages — dashboard, tenants/index, tenants/detail, onboarding, packages, announcement, billing
**Score: 21 / 40**

---

## Score Breakdown (Nielsen Heuristics)

| # | Heuristic                      | Score | Notes |
|---|-------------------------------|-------|-------|
| 1 | Visibility of system status    | 3/5   | KPI cards + status badges clear, but MOCK data gives false readings for critical business views |
| 2 | Match between system & world   | 4/5   | Thai labels, BE/CE dates correct, tenant mental model maps well |
| 3 | User control & freedom         | 3/5   | ESC on all modals, but no undo for billing; no draft recovery for announcements |
| 4 | Consistency & standards        | 3/5   | Indigo accent in superadmin vs orange in admin — mixing mock + live APIs breaks trust |
| 5 | Error prevention               | 2/5   | No warning that Package save is memory-only; no duplicate invoice guard |
| 6 | Recognition over recall        | 3/5   | Feature toggle matrix is readable; LimitInput toggle semantics unclear |
| 7 | Flexibility & efficiency       | 3/5   | Good filter/search across pages; no bulk actions or keyboard shortcuts |
| 8 | Aesthetic & minimalist         | 4/5   | Clean card layouts, not overloaded |

**Subtotal: 25 / 40**

### Anti-pattern Deductions: −4

| Anti-pattern | Pages | Penalty |
|---|---|---|
| Mock data in primary business views (dashboard KPIs, billing MRR, activity feed) | dashboard, billing | −2 |
| Fake persistence — `setTimeout()` with no `api.*()` call presented as "save" | packages, billing, announcement | −2 |

**Final Score: 21 / 40**

---

## P1 — Blockers (fix before ship)

### P1-A · Package save silently discards data
**File:** `superadmin/packages/index.tsx:113–130`

`handleSave()` does `setTimeout(800ms)` with zero API call. Data goes to Zustand store (RAM only). On page refresh, all plan config changes — pricing, feature toggles, limits — are reset to the store's initial values. Success toast fires regardless.

**Impact:** Super admin changes Starter price, sees ✅ toast, closes browser. Next day price reverted. No way to know without a backend log. If tenants are being billed based on package config, this is a revenue calculation error waiting to happen.

**Fix:** Wire `api.put('/api/v1/super-admin/packages/:plan', draft)` inside `handleSave`. Gate the toast on success response.

---

### P1-B · Dashboard and Billing show MOCK data only
**Files:** `superadmin/dashboard/index.tsx` (uses `MOCK_TENANTS`), `superadmin/billing/index.tsx` (uses `MOCK_INVOICES`)

The two most business-critical superadmin views — the overview dashboard and financial billing — are hardcoded to mock fixtures. Any real tenant data from the live `tenants` API (already implemented in `tenants/index.tsx`) is invisible here. MRR, invoice status, plan breakdown chart, activity feed — all fictional.

**Impact:** Super admin cannot actually monitor their business from the main dashboard. Billing "mark paid" and "extend" only mutate local `useState` — restart the app, invoice reverts to PENDING.

**Fix:** Replace `MOCK_TENANTS`/`MOCK_INVOICES` with `useQuery(['tenants'], () => api.get('/api/v1/super-admin/tenants'))`. For billing add `/api/v1/super-admin/invoices` endpoint.

---

### P1-C · Announcement send has no API call
**File:** `superadmin/announcement/index.tsx`

"ส่งประกาศ" stores the announcement in component state only. No `api.post()` to any endpoint. Admins of tenant companies never receive the announcement. The history list shows it as "SENT" with a `sent_count` — both are lies.

**Impact:** A maintenance announcement composed and "sent" never reaches any tenant admin. Could result in unexplained downtime reports.

**Fix:** Add `POST /api/v1/super-admin/announcements` endpoint; fire on send. For scheduled announcements, persist with `scheduled_at` to a queue.

---

## P2 — Friction (fix in next iteration)

### P2-A · Onboarding "Employee Line linking %" is a dead end
**File:** `superadmin/onboarding/index.tsx`

The employee Line linking progress bar is shown per tenant but has no action attached. If a tenant is at 30% linking, the super admin has no way to copy/resend the verification link from this view. They'd have to navigate to Tenant Detail → Branches → manually find the link.

**Fix:** Add a "คัดลอกลิงก์" (copy verification link) button next to the % bar, or a "ส่ง reminder" button that triggers a Line push to unlinked employees.

---

### P2-B · No cross-page contextual navigation
- Tenant Detail has no link → "ดู Invoice ของ tenant นี้" → Billing filtered by tenant
- Billing invoice row has no link → Tenant Detail
- Onboarding accordion has no link → Tenant Detail

Super admin must manually re-search in each page. For a portfolio of 10+ tenants this becomes a daily friction source.

**Fix:** Add a small icon-link (ExternalLink icon, 14px) in billing invoice rows, onboarding accordion headers, and tenant detail to cross-navigate.

---

### P2-C · Billing "Expiring Soon" banner has no action
**File:** `superadmin/billing/index.tsx:70–72`

The banner lists tenants expiring in ≤30 days but provides no direct action. No "สร้าง Invoice" shortcut, no link to tenant detail, no "ส่ง reminder" button.

**Fix:** Each expiring tenant row should have a "สร้าง Invoice ต่ออายุ" button that pre-fills the create modal with that tenant's data.

---

### P2-D · LimitInput toggle semantics are confusing
**File:** `superadmin/packages/index.tsx:24–58`

The "จำกัด / ∞ ไม่จำกัด" toggle button is a primary action that switches between numeric and unlimited modes. The label changes but there's no visual indication it's a button until hovered. First-time users click the number input expecting to type unlimited, then can't.

**Fix:** Use a checkbox labeled "ไม่จำกัด" beside the input, or a segmented control (จำกัด | ไม่จำกัด). Avoid action-on-a-non-button-looking element.

---

## P3 — Polish

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3-A | Dashboard activity feed has no "ดูทั้งหมด" / pagination | `dashboard/index.tsx` | Add link to full activity log |
| 3-B | Announcement DRAFT items have no "แก้ไข Draft" in list view | `announcement/index.tsx` | Add edit icon on DRAFT rows |
| 3-C | Accent color: superadmin = indigo `#4f46e5`, admin = orange — undocumented intent | all superadmin pages | Document in DESIGN.md or unify |
| 3-D | Package page has no "compare mode" explanation — toggle exists but no tooltip | `packages/index.tsx` | Add `title` attr or sublabel |

---

## Persona Red Flags

**Ben (Super Admin, ดูแลลูกค้า 8 ราย):**
- เปิด Billing เห็น MRR ฿45,000 — ไม่รู้ว่าเป็น mock ไม่ใช่ข้อมูลจริง
- กด "Mark Paid" invoice ของ tenant — refresh ปุ๊บ invoice กลับเป็น PENDING
- เสียความเชื่อใจในระบบ คิดว่า "ระบบมีบัก"

**น้องใหม่รับช่วง Super Admin:**
- เปิด Packages เปลี่ยนราคา Professional จาก ฿2,490 → ฿2,990
- กด Save เห็น toast สำเร็จ
- ปิดหน้าต่าง เปิดใหม่ ราคายังเป็น ฿2,490
- ไม่มี error ไม่มี warning — ไม่รู้ว่าต้องทำอะไรเพิ่ม

---

## Recommended Fix Order

```
P1-A (Package API)        → 1 วัน  — ป้องกัน data loss
P1-C (Announcement API)   → 1 วัน  — ป้องกัน silent failure  
P1-B (Dashboard/Billing)  → 2 วัน  — ต้องสร้าง invoice API ก่อน
P2-A (Onboarding action)  → 2 ชม.  — เพิ่ม copy link button
P2-B (Cross-page nav)     → 3 ชม.  — เพิ่ม icon-links
P2-C (Expiring banner)    → 2 ชม.  — pre-fill create modal
P2-D (LimitInput UX)      → 2 ชม.  — replace with checkbox
```
