# Design

## Color

Primary accent: `#EA580C` (orange-600) — used for CTAs, active states, key highlights  
Hover accent: `#C2410C` (orange-700)  
Light accent: `#FFEDD5` (orange-100) — backgrounds for active pills, KPI cards  

Surface: `#F1F5F9` (slate-100) — page background  
Card: `#FFFFFF`  
Sidebar: `#0F172A` (slate-900) — dark, anchoring

Text primary: `#0F172A` (slate-900)  
Text muted: `#64748B` (slate-500)  
Text inverse: `#F8FAFC` (slate-50) — on dark sidebar

Status:
- Success `#10B981` / bg `#ECFDF5`
- Warning `#F59E0B` / bg `#FEF3C7`
- Error `#EF4444` / bg `#FEF2F2`
- Info `#3B82F6` / bg `#EFF6FF`

## Typography

Font stack: `'Noto Sans Thai', 'Inter', system-ui, sans-serif`  
Source: Google Fonts (both weights 400–800)

Scale in use:
- Page title h1: `1.3rem / 800` `#111827`
- Section label: `0.75rem / 700` uppercase `#6b7280` letter-spacing 0.05em
- Body: `0.875rem / 400–600` `#374151`
- Small / meta: `0.72–0.75rem` `#9ca3af`
- KPI number: `1.8rem / 800` colored per category

## Spacing & Layout

Sidebar width: `260px` (desktop fixed)  
Topbar height: `64px` (desktop) / `56px` (mobile)  
Page padding: `24px 32px` (desktop) / `16px 16px 80px` (mobile)  
Content max-width: `1400px` centered

Card gap: `14–16px`  
Section gap: `20–24px`

## Radius

- Card / modal: `16px` (`--radius-lg`)
- Button / input: `8–10px`
- Pill / badge: `99px` (full round)
- KPI card: `14px`

## Shadows

```
--shadow-sm:    0 1px 2px 0 rgba(0,0,0,0.05)
--shadow-md:    0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)
--shadow-lg:    0 10px 25px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)
--shadow-float: 0 20px 40px -10px rgba(0,0,0,0.08)
--shadow-accent: 0 8px 16px -4px rgba(234,88,12,0.3)
```

Card default: `0 2px 12px rgba(0,0,0,0.04)` with `1px solid #f1f5f9`

## Components

**KPI Card** — pastel bg + 1.5px colored border + emoji icon (top-left) + large number (top-right) + label (bottom)  
**Filter Pills** — active: `#f97316` bg `#fff7ed` border `#fed7aa` / inactive: `#f1f5f9` bg  
**Table** — thead `bg #fff7ed` / `color #c2410c` / `fontWeight 700` ; row hover `#fff7ed`  
**Modal overlay** — `position:fixed; inset:0; z-index:200` (above sidebar 100, topbar 98)  
**Add button** — orange gradient `linear-gradient(135deg, #f97316, #ea580c)` + shadow  
**Sidebar nav item active** — orange `#f97316` bg subtle, text orange

## Motion

Page enter: `fade-in-up` 0.4s `cubic-bezier(0.16,1,0.3,1)` — opacity 0→1 + translateY 12px→none  
Note: final keyframe uses `transform: none` (not `translateY(0)`) to avoid stacking context on `<main>`

## Implementation Notes

- All styles: inline `React.CSSProperties` — no Tailwind utility classes in component JSX
- CSS variables defined in `admin/src/index.css` `:root`
- Responsive breakpoint: `768px` (via `useIsMobile` hook)
- Icon library: `lucide-react`
