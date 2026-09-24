# Design

## Color

> Rebrand 2026-09-24: platform-wide brand palette is now navy `#0B2D6B` /
> light blue `#4DB2FE` / orange `#FF8A00` / white `#FFFFFF`. Orange stays
> Admin's primary accent (tenant-facing), light blue becomes Super Admin's
> primary accent (vendor-facing, replacing indigo), navy is the shared dark
> "anchoring" color for both apps' Sidebars (replacing the old warm-brown
> Admin sidebar and indigo Super Admin sidebar). This keeps the existing
> "never mix accents across a layout" separation rule while unifying both
> apps under one real brand identity via the shared navy + white base.

> Shell redesign 2026-09-25: user sent a reference screenshot ("เอาธีมสีแบบ
> นี้") of a dark-navy-sidebar + white-header + blue-active-nav layout.
> Topbar flipped from solid orange back to white (reversing the v151/152
> "Headerbar เป็นสีส้ม" decision); Sidebar's active-nav-item accent flipped
> from orange to light blue. Orange remains the primary accent for CTAs/
> buttons/KPI highlights — it's no longer the Sidebar's active-state color.

### Admin / Manager (tenant users)
Primary accent: `#FF8A00` (brand orange) — CTAs, buttons, KPI highlights  
Hover accent: `#E67A00`  
Light accent: `#FFE8CC` — backgrounds for pills, KPI cards  
Sidebar active-nav accent: `#4DB2FE` (brand light blue) — pill bg `rgba(77,178,254,0.18)`

### Super Admin (vendor-side only)
Primary accent: `#4DB2FE` (brand light blue) — all Super Admin CTAs, active states, key highlights  
Hover accent: `#2B93DB`  
Light accent: `#E3F4FF` — backgrounds for active pills, stat cards  
> Rationale: visual separation makes it immediately obvious which context (vendor vs. tenant) the user is operating in. Never mix orange and light-blue accents within the same layout.

Surface: `#F1F5F9` (slate-100) — page background  
Card: `#FFFFFF`  
Sidebar: `#0A0F1F` (darkened navy — near-black, same hue as brand navy `#0B2D6B` at much lower lightness per the reference screenshot) — dark, anchoring — shared by both Admin and Super Admin  
Topbar: `#FFFFFF` solid, `border-bottom: 1px solid #e5e7eb` — reversed from solid-orange (v151/152) back to white per the 2026-09-25 shell redesign; role badge pill on the right keeps `--accent-primary` orange as the one orange touch in the header

Text primary: `#0F172A` (slate-900)  
Text muted: `#64748B` (slate-500)  
Text inverse: `#F8FAFC` (slate-50) — on dark sidebar

Status:
- Success `#10B981` / bg `#ECFDF5`
- Warning `#F59E0B` / bg `#FEF3C7`
- Error `#EF4444` / bg `#FEF2F2`
- Info `#4DB2FE` (brand light blue) / bg `#E3F4FF`

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
--shadow-accent: 0 8px 16px -4px rgba(255,138,0,0.3)
```

Card default: `0 2px 12px rgba(0,0,0,0.04)` with `1px solid #f1f5f9`

## Components

**KPI Card** — pastel bg + 1.5px colored border + emoji icon (top-left) + large number (top-right) + label (bottom)  
**Filter Pills** — active: `#FF8A00` bg `#FFF3E5` border `#FFDFB8` / inactive: `#f1f5f9` bg  
**Table** — thead `bg #FFF3E5` / `color #E67A00` / `fontWeight 700` ; row hover `#FFF3E5`  
**Modal overlay** — `position:fixed; inset:0; z-index:200` (above sidebar 100, topbar 98)  
**Add button** — orange gradient `linear-gradient(135deg, #FF8A00, #E67A00)` + shadow  
**Sidebar nav item active** — light blue `#4DB2FE` bg subtle `rgba(77,178,254,0.18)`, text light blue — same accent for every nav section (not per-section colors), flipped from orange 2026-09-25 to match the white-header/navy-sidebar/blue-active shell redesign
**Stat/KPI card icon badge** — `linear-gradient(135deg, color-mix(in srgb, {color} 55%, white), {color})`, icon `#fff`, `box-shadow: 0 4px 10px {color}4D` — replaces the older flat-pastel-tint badge (`background: {bg}, color: {iconColor}`). Applied so far: Dashboard (KPI cards, RangeKpiCard, quick links). Roll out to other pages' stat cards over time — not done everywhere yet (feedback 2026-09-15, adapted from a colorful reference mockup's "feel" while keeping TimeLine's own orange-led palette, not the reference's literal purple/blue/pink)

## Motion

Page enter: `fade-in-up` 0.4s `cubic-bezier(0.16,1,0.3,1)` — opacity 0→1 + translateY 12px→none  
Note: final keyframe uses `transform: none` (not `translateY(0)`) to avoid stacking context on `<main>`

## Implementation Notes

- All styles: inline `React.CSSProperties` — no Tailwind utility classes in component JSX
- CSS variables defined in `admin/src/index.css` `:root`
- Responsive breakpoint: `768px` (via `useIsMobile` hook)
- Icon library: `lucide-react`
