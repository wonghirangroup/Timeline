---
slug: admin-src-pages-shift-manage-tsx
file: admin/src/pages/shift/manage.tsx
date: 2026-06-15
score: 67
---

# Critique — shift/manage.tsx (Employee Manage Popup)

## Assessment A — Manual Design Review

### P1 — Brand color violation: tab active state uses indigo
Line 544: `borderBottom: '2px solid #4f46e5'` and `color: '#4f46e5'` for the active tab.
DESIGN.md mandates orange `#f97316` as the sole CTA/accent color. Indigo here is inconsistent
with the rest of the admin (branch filters, buttons, etc. all use orange).

### P1 — Scroll event leaks when modal is open
The list `<div style={{ overflowY: 'auto', flex: 1 }}>` is structurally correct BUT is missing
`overscrollBehavior: 'contain'`. When the user scrolls to the bottom of the list and keeps
scrolling, the scroll event can bubble out and cause the background page to jerk/jump. Also,
scrolling OUTSIDE the list area (e.g. on the header or search bar) passes scroll events to the
fixed backdrop — no visible effect but disorienting.

### P1 — "ย้ายออก" is destructive with zero confirmation
`removeEmp` fires immediately on button click (line 168: sets `empShiftAssign[empId] = null`).
No "ยืนยัน?" step, no undo, no toast with undo action. Removing the wrong person is a one-click
accident with no recovery.

### P2 — No scroll affordance when list overflows
On macOS/Chrome, `overflowY: 'auto'` hides the scrollbar until you hover. A list of 6+ employees
will overflow without any visual hint that more items exist. A bottom gradient fade on the list
container communicates "there's more below."

### P2 — Modal is slightly narrow at 460px
On 1280px+ screens, 460px feels compact for name + department + action button. Widening to 520px
adds breathing room without looking oversized.

### P3 — "เพิ่มพนักงาน" tab label has no counter
The "ในกะนี้" tab shows `(count)` but "เพิ่มพนักงาน" has no count. Showing how many
employees are available to add would help the user gauge the list length before switching tabs.

## Assessment B — Detector (detect.mjs)
Result: `[]` — no machine-detected issues.

## Nielsen Scores

| # | Heuristic | Score |
|---|-----------|-------|
| 1 | Visibility of system status | 7 |
| 3 | User control & freedom | 5 |
| 4 | Consistency & standards | 6 |
| 5 | Error prevention | 5 |
| 8 | Aesthetic & minimalist | 7 |

**Overall: 6/10**

## Actions Applied (2026-06-15)
- Tab active color: `#4f46e5` → `#f97316`
- Modal maxWidth: 460 → 520px
- List: added `overscrollBehavior: 'contain'` + bottom scroll gradient
- "ย้ายออก": added inline 2-step confirm (click → show "ยืนยัน?" / ยกเลิก)
- "เพิ่มพนักงาน" tab: added available-count badge
