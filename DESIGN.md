# Design

## Color

> Official brand palette 2026-09-25: sourced from the "YooNai Owl" mascot
> 3D character style guide the user provided — this is now the canonical
> palette (supersedes the earlier hand-picked approximations from
> 2026-09-24/25). Seven roles: Primary Blue `#2DA6DD`, Navy `#131C45`,
> White `#FFFFFF`, Accent Orange `#EC6F44`, Secondary Blue `#244B83`,
> Light Gray `#E6ECF4`, Shoe/Glasses (near-black) `#222222`. Orange stays
> Admin's primary accent (tenant-facing), Primary Blue becomes Super
> Admin's primary accent (vendor-facing, replacing indigo), Navy is the
> shared dark Sidebar color for both apps, Secondary Blue serves as Super
> Admin's hover/darker blue and Admin's Sidebar active-nav accent. Light
> Gray replaces the old generic slate-100 page background app-wide.
> Hover/light-tint shades for orange (`#C85E3A` / `#FCE9E3`) and for
> Primary Blue's light tint (`#DFF1FA`) are computed, not from the style
> guide (which only gives 7 flat swatches, no shade ramps).

### Admin / Manager (tenant users)
Primary accent: `#EC6F44` (brand accent orange) — CTAs, buttons, KPI highlights  
Hover accent: `#C85E3A` (computed darken)  
Light accent: `#FCE9E3` (computed tint) — backgrounds for pills, KPI cards  
Sidebar active-nav accent: `#2DA6DD` (brand primary blue) — pill bg `rgba(45,166,221,0.18)`

### Super Admin (vendor-side only)
Primary accent: `#2DA6DD` (brand primary blue) — all Super Admin CTAs, active states, key highlights  
Hover accent: `#244B83` (brand secondary blue — used directly, not computed)  
Light accent: `#DFF1FA` (computed tint)  
> Rationale: visual separation makes it immediately obvious which context (vendor vs. tenant) the user is operating in. Never mix orange and blue accents within the same layout.

Surface: `#E6ECF4` (brand light gray) — page background  
Card: `#FFFFFF`  
Sidebar: `#131C45` (brand navy) — dark, anchoring — shared by both Admin and Super Admin  
Topbar: `#FFFFFF` solid, `border-bottom: 1px solid #e5e7eb` — reversed from solid-orange (v151/152) back to white per the 2026-09-25 shell redesign; role badge pill on the right keeps `--accent-primary` orange as the one orange touch in the header

Text primary: `#0F172A` (slate-900)  
Text muted: `#64748B` (slate-500)  
Text inverse: `#F8FAFC` (slate-50) — on dark sidebar

Status:
- Success `#10B981` / bg `#ECFDF5`
- Warning `#F59E0B` / bg `#FEF3C7`
- Error `#EF4444` / bg `#FEF2F2`
- Info `#2DA6DD` (brand primary blue) / bg `#DFF1FA`

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
--shadow-accent: 0 8px 16px -4px rgba(236,111,68,0.3)
```

Card default: `0 2px 12px rgba(0,0,0,0.04)` with `1px solid #E6ECF4`

## Components

**KPI Card** — pastel bg + 1.5px colored border + emoji icon (top-left) + large number (top-right) + label (bottom)  
**Filter Pills** — active: `#EC6F44` bg `#FEF8F6` border `#F8CCBE` / inactive: `#E6ECF4` bg  
**Table** — thead `bg #FEF8F6` / `color #C85E3A` / `fontWeight 700` ; row hover `#FEF8F6`  
**Modal overlay** — `position:fixed; inset:0; z-index:200` (above sidebar 100, topbar 98)  
**Add button** — orange gradient `linear-gradient(135deg, #EC6F44, #C85E3A)` + shadow  
**Sidebar nav item active** — brand primary blue `#2DA6DD` bg subtle `rgba(45,166,221,0.18)`, text primary blue — same accent for every nav section (not per-section colors)
**Stat/KPI card icon badge** — `linear-gradient(135deg, color-mix(in srgb, {color} 55%, white), {color})`, icon `#fff`, `box-shadow: 0 4px 10px {color}4D` — replaces the older flat-pastel-tint badge (`background: {bg}, color: {iconColor}`). Applied so far: Dashboard (KPI cards, RangeKpiCard, quick links). Roll out to other pages' stat cards over time — not done everywhere yet (feedback 2026-09-15, adapted from a colorful reference mockup's "feel" while keeping TimeLine's own orange-led palette, not the reference's literal purple/blue/pink)

## Motion

Page enter: `fade-in-up` 0.4s `cubic-bezier(0.16,1,0.3,1)` — opacity 0→1 + translateY 12px→none  
Note: final keyframe uses `transform: none` (not `translateY(0)`) to avoid stacking context on `<main>`

## Implementation Notes

- All styles: inline `React.CSSProperties` — no Tailwind utility classes in component JSX
- CSS variables defined in `admin/src/index.css` `:root`
- Responsive breakpoint: `768px` (via `useIsMobile` hook)
- Icon library: `lucide-react`
