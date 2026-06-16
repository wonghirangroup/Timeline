---
target: employee/index.tsx mobile
total_score: 52
p0_count: 2
p1_count: 3
timestamp: 2026-06-15T08-16-00Z
slug: admin-src-pages-employee-index-tsx
---
---
slug: admin-src-pages-employee-index-tsx
file: admin/src/pages/employee/index.tsx
date: 2026-06-15
score: 52
focus: mobile
---

# Critique — employee/index.tsx (Mobile View)

## Assessment A — Manual Design Review

### P0 — 5-step horizontal stepper overflows at 375px
Line ~320: The stepper renders 5 circles + connectors + labels in a single `display: flex` row.
At 375px viewport, each step needs ~68px minimum (circle 28px + label text "ข้อมูลส่วนตัว" ~40px).
5 × 68px = 340px — plus 4 connector bars = total easily 360–380px. On a 375px screen the
last 1–2 steps clip outside the visible area with no scroll hint. Users on small phones (SE,
older Android) cannot see that step 4/5 exist. This is a **blocking UX defect** for mobile.
Fix: on mobile, show step indicator as `"ขั้นตอนที่ 2/5"` text + progress bar, or compress
to icon-only dots without labels.

### P0 — All Add Modal grids use multi-column layout with no mobile breakpoint
- Step 1 (line ~370): `gridTemplateColumns: '130px 1fr 1fr'` — at 375px, columns are ~75px each.
  Thai field names like "ชื่อจริง*" don't fit in 130px label column.
- Step 1 email+phone (line ~420): `gridTemplateColumns: '1fr 1fr'` — 160px per field, input too narrow.
- Step 2 address (line ~470): 8 fields in `1fr 1fr` — city/province/postcode cramped side-by-side.
- Step 3 emergency (line ~580): `gridTemplateColumns: '1fr 100px 1fr auto'` — 4 columns in ~340px
  body = each ~80px, relationship select unreadable, delete button clips.
- Step 3 skills (line ~640): `gridTemplateColumns: '1fr 140px auto'` — 140px select takes 40% width.
- Step 4 employment (line ~745): `gridTemplateColumns: '1fr 1fr'` — "สถานะบัญชี" row with a
  `whiteSpace: 'nowrap'` "ดูประวัติ" button pushes the input field off-screen.
All grids need `isMobile ? '1fr' : '<original>'` pattern (same approach as shift/manage.tsx).

### P1 — pageSize fixed at 7, not mobile-adaptive
Line ~72 area: `const [pageSize] = useState(7)`. The shift page uses `isMobile ? 3 : 6`.
On a 390px screen, 7 mobile cards = very long list requiring scroll before reaching the filter/add
button. Reducing to 5 or 6 on mobile keeps the list paginatable within one viewport.

### P1 — Mobile card name click target is a `<div>`, not a `<button>`
Lines ~440-460: The employee name row uses `<div onClick={...}>` with no `cursor: 'pointer'`
or `:active` state. On mobile, there's no visual tap feedback — the user can't tell if their tap
registered. Screen readers won't find this as interactive. Fix: make it a `<button>` with
`background: none; border: none; text-align: left; width: 100%` or add `cursor: 'pointer'`
and an `:active` background flash.

### P1 — No swipe-to-dismiss on the Add Modal bottom sheet
The modal is a `position: fixed` overlay without touch gesture support. On mobile, users expect
to swipe down to close a bottom sheet. Currently the only close affordance is the small `×`
button at the top-right corner — easy to miss when the stepper header is cramped. Adding
`onTouchStart`/`onTouchEnd` drag-down detection (same pattern added to shift/manage.tsx) would
align with mobile conventions.

### P2 — Filter bar has 5 elements that wrap unpredictably on mobile
Lines ~200-250: Branch pills + search input + status select + role select + sort select all
in a `flexWrap: 'wrap'` row. On 375px, pills may push the search input to a second line, then
the two selects to a third. The layout is uncontrolled — could be 2 or 3 lines depending on
content length and branch names. Consider: collapse all filters into a single "กรอง" sheet/drawer
button on mobile, showing only the search bar inline.

### P2 — Step 5 profile upload area is finger-friendly but branch list rows are too short
Step 5 branch-access rows (lines ~832-843): `padding: '10px 14px'` — 36px effective touch target.
Apple HIG recommends 44px minimum. The `×` remove button has only `padding: 4` — ~22px touch
target, far too small for reliable finger tapping.

### P3 — "เพิ่มพนักงาน" FAB-style button not visible when card list requires scroll
On mobile, the "+ เพิ่มพนักงาน" button is in the page header (top area). After scrolling down
through 7 cards, the button is off-screen. The shift page solved a similar problem with a
paginated layout. Consider pinning the add button as a floating action button (FAB) at the
bottom-right on mobile.

## Assessment B — Detector (detect.mjs)
Result: `[]` — no machine-detected issues.

## Nielsen Scores (mobile context)

| # | Heuristic | Score |
|---|-----------|-------|
| 1 | Visibility of system status | 6 |
| 2 | Match between system and real world | 6 |
| 3 | User control & freedom | 5 |
| 4 | Consistency & standards | 5 |
| 5 | Error prevention | 6 |
| 6 | Recognition rather than recall | 7 |
| 7 | Flexibility & efficiency | 4 |
| 8 | Aesthetic & minimalist | 6 |
| 10 | Help & documentation | 7 |

**Overall: 52/100**

## Recommended Actions (Priority Order)

1. **[P0] Stepper**: Replace horizontal 5-step stepper with `"ขั้นตอนที่ N/5" + progress bar` on mobile
2. **[P0] All modal grids**: Wrap every `gridTemplateColumns` value with `isMobile ? '1fr' : '<original>'`
3. **[P1] pageSize**: Change to `isMobile ? 5 : 10` (or similar)
4. **[P1] Card tap target**: Convert `<div onClick>` to `<button>` with proper styling
5. **[P1] Swipe-to-dismiss**: Add `onTouchStart`/`onTouchEnd` drag-down gesture to modal
6. **[P2] Filter bar**: On mobile, show only search + "กรอง" button that opens a sheet
7. **[P2] Branch row touch targets**: Increase `×` button padding to at least `padding: 10`
8. **[P3] Add button**: Pin as FAB on mobile
