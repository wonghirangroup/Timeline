// employee/src/components/ui/tokens.ts
// ══════════════════════════════════════════════════════════════════
//  Employee App — Design Tokens
//  แนวทาง calm & minimal ให้ตรงกับแอป admin — เลิก gradient / glass / glow
//  แก้สีที่นี่แล้ว mirror ไปที่ src/index.css :root ด้วย
// ══════════════════════════════════════════════════════════════════

export const COLOR = {
  // Primary — Orange (เดียวกับ admin: orange-600 / 700)
  primary:       '#EA580C',
  primaryMid:    '#EA580C',   // (เดิมเป็น mid-stop ของ gradient) → สีเดียว
  primaryEnd:    '#EA580C',   // (เดิมเป็น end-stop ของ gradient) → สีเดียว
  primaryBg:     '#FFF7ED',
  primarySubtle: '#FFEDD5',
  primaryBorder: 'rgba(234,88,12,0.18)',

  // Text — ทุกระดับผ่าน WCAG AA 4.5:1
  textPrimary:   '#1A1A1A',
  textSecondary: '#4B5563',   // gray-600
  textMuted:     '#6B7280',   // gray-500 — จางสุดที่ยังใช้กับตัวหนังสือได้
  textOnAccent:  '#FFFFFF',

  // Surface
  white:         '#FFFFFF',
  pageBg:        '#F1F5F9',
  cardBg:        '#FFFFFF',

  // Status — text เข้มพอผ่าน AA, พื้น badge เป็น tint ทึบ
  success:       '#16A34A',
  successBg:     '#DCFCE7',
  successBorder: '#86EFAC',
  warning:       '#D97706',
  warningBg:     '#FEF3C7',
  warningBorder: '#FCD34D',
  error:         '#DC2626',
  errorBg:       '#FEE2E2',
  errorBorder:   '#FCA5A5',
  info:          '#2563EB',
  infoBg:        '#DBEAFE',

  // Nav
  navBg:         '#FFFFFF',
  navBorder:     '#E5E7EB',
} as const

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
} as const

export const SHADOW = {
  card:     '0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
  cardLg:   '0 8px 24px rgba(0,0,0,0.08)',
  btn:      '0 1px 2px rgba(0,0,0,0.06)',
  nav:      '0 -1px 0 rgba(0,0,0,0.06)',
  glassGlow:'none',
} as const

export const FONT = {
  xs:   '11px',
  sm:   '13px',
  base: '15px',
  md:   '16px',
  lg:   '20px',
  xl:   '24px',
  '2xl':'32px',
} as const

// Status badge config
export const STATUS = {
  PENDING:  { label: 'รอพิจารณา', color: COLOR.warning, bg: COLOR.warningBg },
  APPROVED: { label: 'อนุมัติแล้ว', color: COLOR.success, bg: COLOR.successBg },
  REJECTED: { label: 'ไม่อนุมัติ',  color: COLOR.error,   bg: COLOR.errorBg  },
} as const
